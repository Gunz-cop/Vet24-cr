import type { APIContext } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const isEmail = (value = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const jsonResponse = (body: Record<string, unknown>, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
};

export async function POST({ request }: APIContext) {
  try {
    const body = await request.json() as Record<string, string>;
    const clinic = body.clinic || "Sin clínica indicada";
    const reason = body.reason || "Sin motivo indicado";
    const description = body.description || "Sin descripción";
    const contact = body.contact || "";

    const ip = request.headers.get("CF-Connecting-IP") || "127.0.0.1";
    const msgUint8 = new TextEncoder().encode(ip);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const ipHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const db = (env as any)?.DB;
    if (db) {
      try {
        const rateCheck = await db.prepare(
          "SELECT COUNT(*) as count FROM reports WHERE ip_hash = ? AND created_at > datetime('now', '-15 minutes')"
        ).bind(ipHash).first();

        if (rateCheck && rateCheck.count >= 3) {
          return jsonResponse({
            error: "Has enviado demasiados reportes. Por favor, inténtalo de nuevo en 15 minutos.",
          }, 429);
        }

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
      } catch (dbErr: any) {
        console.error("Error al guardar el reporte en Cloudflare D1:", dbErr.message);
      }
    }

    const emailBinding = (env as any)?.EMAIL;
    const toEmail = (env as any)?.REPORTS_TO_EMAIL || (env as any)?.TO_EMAIL || "g1721m@gmail.com";
    const fromEmail = (env as any)?.REPORTS_FROM_EMAIL || "reportes@vet24cr.com";

    if (!emailBinding?.send) {
      console.warn("Cloudflare Email binding EMAIL is not configured. Logging report instead:", body);
      return jsonResponse({
        success: true,
        mocked: true,
        db_saved: !!db,
        message: "Report received (Local fallback mode)",
      });
    }

    const sendResult = await emailBinding.send({
      to: toEmail,
      from: {
        email: fromEmail,
        name: "Vet24 Reportes",
      },
      ...(isEmail(contact) ? { replyTo: contact } : {}),
      subject: `[Vet24] Inconsistencia: ${clinic}`,
      text: [
        "Alerta de inconsistencia en clínica",
        "",
        `Clínica: ${clinic}`,
        `Motivo: ${reason}`,
        `Descripción: ${description}`,
        `Contacto: ${contact || "No proporcionado"}`,
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #25312b;">
          <h2 style="color: #e71d54; border-bottom: 2px solid #f4b6c8; padding-bottom: 10px;">Alerta de inconsistencia en clínica</h2>
          <p style="font-size: 16px;">Un usuario reportó datos posiblemente incorrectos en Vet24.</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr style="background: #fff5f8;">
              <td style="padding: 10px; border: 1px solid #ead7dd; font-weight: bold; width: 120px;">Clínica:</td>
              <td style="padding: 10px; border: 1px solid #ead7dd;">${escapeHtml(clinic)}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ead7dd; font-weight: bold;">Motivo:</td>
              <td style="padding: 10px; border: 1px solid #ead7dd;">${escapeHtml(reason)}</td>
            </tr>
            <tr style="background: #fff5f8;">
              <td style="padding: 10px; border: 1px solid #ead7dd; font-weight: bold;">Descripción:</td>
              <td style="padding: 10px; border: 1px solid #ead7dd; white-space: pre-wrap;">${escapeHtml(description)}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ead7dd; font-weight: bold;">Contacto:</td>
              <td style="padding: 10px; border: 1px solid #ead7dd;">${contact ? escapeHtml(contact) : "<em>No proporcionado</em>"}</td>
            </tr>
          </table>
        </div>
      `,
    });

    return jsonResponse({
      success: true,
      db_saved: !!db,
      email_sent: true,
      email_id: sendResult?.messageId || null,
    });
  } catch (err: any) {
    console.error("Error sending report:", err.code || "", err.message);
    return jsonResponse({
      error: err.message,
      code: err.code || null,
    }, 500);
  }
}
