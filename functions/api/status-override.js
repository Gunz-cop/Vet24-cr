export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");

  if (!slug) {
    return new Response(JSON.stringify({ error: "Missing slug parameter" }), {
      status: 400,
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
    if (request.method === "GET") {
      // Fetch status override for this clinic
      const override = await db.prepare(
        "SELECT is_temporarily_closed, override_status_text, override_schedule_text, updated_at FROM clinic_overrides WHERE clinic_slug = ?"
      ).bind(slug).first();

      return new Response(JSON.stringify({ success: true, override: override || null }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=10" // Cache for 10 seconds to reduce DB load
        }
      });
    }

    if (request.method === "POST") {
      // Simple authorization check (for safety, can use env variable ADMIN_SECRET)
      const authHeader = request.headers.get("Authorization");
      const secret = env.ADMIN_SECRET || "vet24_admin_secret";
      if (!authHeader || authHeader !== `Bearer ${secret}`) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      const body = await request.json();
      const isClosed = body.is_temporarily_closed ? 1 : 0;
      const statusText = body.override_status_text || null;
      const scheduleText = body.override_schedule_text || null;

      // Upsert override
      await db.prepare(`
        INSERT INTO clinic_overrides (clinic_slug, is_temporarily_closed, override_status_text, override_schedule_text, updated_at)
        VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
        ON CONFLICT(clinic_slug) DO UPDATE SET
          is_temporarily_closed = excluded.is_temporarily_closed,
          override_status_text = excluded.override_status_text,
          override_schedule_text = excluded.override_schedule_text,
          updated_at = datetime('now', 'localtime')
      `).bind(slug, isClosed, statusText, scheduleText).run();

      return new Response(JSON.stringify({ success: true, message: "Status override saved successfully" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
