export async function onRequest(context) {
  const { request, env } = context;

  // 1. Authorization check
  const authHeader = request.headers.get("Authorization");
  const secret = env.ADMIN_SECRET || "vet24_admin_secret";
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const db = env.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: "Database not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // 2. Fetch the clinics links manifest from our own site
    const urlObj = new URL(request.url);
    const manifestUrl = `${urlObj.origin}/api/clinics-links-manifest.json`;
    const response = await fetch(manifestUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch clinic manifest: ${response.statusText}`);
    }

    const clinics = await response.json();
    const results = [];

    // Helper function to check URL health
    async function checkUrl(url) {
      if (!url) return { ok: true, status: 'empty' };
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Vet24LinkChecker/1.0; +https://vet24cr.com)'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        return { ok: res.status < 400, status: res.status };
      } catch (err) {
        return { ok: false, status: 'error', error: err.message };
      }
    }

    // 3. Check clinics in parallel (limit concurrency to prevent hitting Cloudflare outbound limits too aggressively)
    // We will do batches of 5
    const batchSize = 5;
    for (let i = 0; i < clinics.length; i += batchSize) {
      const batch = clinics.slice(i, i + batchSize);
      await Promise.all(batch.map(async (clinic) => {
        const webCheck = await checkUrl(clinic.web);
        
        // If web check fails, flag it
        if (!webCheck.ok && clinic.web) {
          results.push({
            slug: clinic.slug,
            name: clinic.nombre,
            urlChecked: clinic.web,
            status: webCheck.status,
            error: webCheck.error || 'HTTP status >= 400'
          });

          // Insert or update an override warning for this clinic in D1
          const warningMessage = "Nota: Su sitio web oficial se encuentra temporalmente inaccesible. Por favor verificar vía telefónica.";
          
          await db.prepare(`
            INSERT INTO clinic_overrides (clinic_slug, is_temporarily_closed, override_status_text, updated_at)
            VALUES (?, 0, ?, datetime('now', 'localtime'))
            ON CONFLICT(clinic_slug) DO UPDATE SET
              override_status_text = excluded.override_status_text,
              updated_at = datetime('now', 'localtime')
          `).bind(clinic.slug, warningMessage).run()
          .catch(err => console.error(`Failed to update override for ${clinic.slug}:`, err.message));
        } else if (clinic.web) {
          // If it is now healthy, we can clean up the warning if it was set by the system
          const warningMessage = "Nota: Su sitio web oficial se encuentra temporalmente inaccesible. Por favor verificar vía telefónica.";
          const existingOverride = await db.prepare(
            "SELECT override_status_text FROM clinic_overrides WHERE clinic_slug = ?"
          ).bind(clinic.slug).first();

          if (existingOverride && existingOverride.override_status_text === warningMessage) {
            // Remove the warning override
            await db.prepare(
              "DELETE FROM clinic_overrides WHERE clinic_slug = ?"
            ).bind(clinic.slug).run()
            .catch(err => console.error(`Failed to delete override for ${clinic.slug}:`, err.message));
          }
        }
      }));
    }

    return new Response(JSON.stringify({
      success: true,
      checkedCount: clinics.length,
      failures: results
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
