export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();

    // Obtener la IP y generar un hash SHA-256 para preservar privacidad
    const ip = request.headers.get("CF-Connecting-IP") || "127.0.0.1";
    const msgUint8 = new TextEncoder().encode(ip);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const ipHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const db = env.DB;
    if (db) {
      try {
        // Limitar a máximo 3 reportes cada 15 minutos por IP
        const rateCheck = await db.prepare(
          "SELECT COUNT(*) as count FROM reports WHERE ip_hash = ? AND created_at > datetime('now', '-15 minutes')"
        ).bind(ipHash).first();

        if (rateCheck && rateCheck.count >= 3) {
          return new Response(JSON.stringify({ 
            error: "Has enviado demasiados reportes. Por favor, inténtalo de nuevo en 15 minutos." 
          }), {
            status: 429,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Guardar reporte en base de datos D1
        await db.prepare(
          "INSERT INTO reports (clinic_slug, clinic_name, reason, description, contact, ip_hash) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(
          body.clinic || "",
          body.clinic || "", // Guardamos el slug como nombre provisional
          body.reason || "",
          body.description || "",
          body.contact || "",
          ipHash
        ).run();
      } catch (dbErr) {
        console.error("Error al guardar el reporte en Cloudflare D1:", dbErr.message);
      }
    }

    const resendApiKey = env.RESEND_API_KEY;
    const toEmail = env.TO_EMAIL || "grcx1@live.com"; // Default target email

    if (!resendApiKey) {
      // If no API key is configured yet, mock a successful response and log the report details
      console.warn("RESEND_API_KEY is not configured in Cloudflare Pages env. Logging report instead:", body);
      return new Response(JSON.stringify({ 
        success: true, 
        mocked: true,
        db_saved: !!db,
        message: "Report received (Local fallback mode)" 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Vet24 Reports <onboarding@resend.dev>", // Resend sandbox domain, replace with verified domain when ready
        to: [toEmail],
        subject: `[Vet24] Inconsistencia: ${body.clinic}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #45634f; border-bottom: 2px solid #adcfb6; padding-bottom: 10px;">🐾 Alerta de Inconsistencia en Clínica</h2>
            <p style="font-size: 16px;">Se ha enviado una notificación de datos incorrectos para la siguiente clínica:</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <tr style="background: #faf9f4;">
                <td style="padding: 10px; border: 1px solid #dbdad5; font-weight: bold; width: 120px;">Clínica:</td>
                <td style="padding: 10px; border: 1px solid #dbdad5;">${body.clinic}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #dbdad5; font-weight: bold;">Motivo:</td>
                <td style="padding: 10px; border: 1px solid #dbdad5; text-transform: capitalize;">${body.reason}</td>
              </tr>
              <tr style="background: #faf9f4;">
                <td style="padding: 10px; border: 1px solid #dbdad5; font-weight: bold;">Descripción:</td>
                <td style="padding: 10px; border: 1px solid #dbdad5; white-space: pre-wrap;">${body.description}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #dbdad5; font-weight: bold;">Contacto:</td>
                <td style="padding: 10px; border: 1px solid #dbdad5;">${body.contact || "<em>No proporcionado</em>"}</td>
              </tr>
            </table>
          </div>
        `
      })
    });

    if (response.ok) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } else {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: errText }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
