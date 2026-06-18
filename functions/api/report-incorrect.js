const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const isEmail = (value = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const clinic = body.clinic || "Sin clínica indicada";
    const reason = body.reason || "Sin motivo indicado";
    const description = body.description || "Sin descripción";
    const contact = body.contact || "";

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
          clinic,
          clinic,
          reason,
          description,
          contact,
          ipHash
        ).run();
      } catch (dbErr) {
        console.error("Error al guardar el reporte en Cloudflare D1:", dbErr.message);
      }
    }

    const emailBinding = env.EMAIL;
    const toEmail = env.REPORTS_TO_EMAIL || env.TO_EMAIL || "g1721m@gmail.com";
    const fromEmail = env.REPORTS_FROM_EMAIL || "reportes@vet24cr.com";
    const safeClinic = escapeHtml(clinic);
    const safeReason = escapeHtml(reason);
    const safeDescription = escapeHtml(description);
    const safeContact = contact ? escapeHtml(contact) : "<em>No proporcionado</em>";

    if (!emailBinding?.send) {
      console.warn("Cloudflare Email binding EMAIL is not configured. Logging report instead:", body);
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

    await emailBinding.send({
      to: toEmail,
      from: {
        email: fromEmail,
        name: "Vet24 Reportes"
      },
      ...(isEmail(contact) ? { replyTo: contact } : {}),
      subject: `[Vet24] Inconsistencia: ${clinic}`,
      text: [
        "Alerta de inconsistencia en clínica",
        "",
        `Clínica: ${clinic}`,
        `Motivo: ${reason}`,
        `Descripción: ${description}`,
        `Contacto: ${contact || "No proporcionado"}`
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #25312b;">
          <h2 style="color: #e71d54; border-bottom: 2px solid #f4b6c8; padding-bottom: 10px;">Alerta de inconsistencia en clínica</h2>
          <p style="font-size: 16px;">Un usuario reportó datos posiblemente incorrectos en Vet24.</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr style="background: #fff5f8;">
              <td style="padding: 10px; border: 1px solid #ead7dd; font-weight: bold; width: 120px;">Clínica:</td>
              <td style="padding: 10px; border: 1px solid #ead7dd;">${safeClinic}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ead7dd; font-weight: bold;">Motivo:</td>
              <td style="padding: 10px; border: 1px solid #ead7dd;">${safeReason}</td>
            </tr>
            <tr style="background: #fff5f8;">
              <td style="padding: 10px; border: 1px solid #ead7dd; font-weight: bold;">Descripción:</td>
              <td style="padding: 10px; border: 1px solid #ead7dd; white-space: pre-wrap;">${safeDescription}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ead7dd; font-weight: bold;">Contacto:</td>
              <td style="padding: 10px; border: 1px solid #ead7dd;">${safeContact}</td>
            </tr>
          </table>
        </div>
      `
    });

    return new Response(JSON.stringify({ success: true, db_saved: !!db, email_sent: true }), {
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
