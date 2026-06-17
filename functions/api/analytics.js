export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
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
    const body = await request.json();
    const query = body.query || null;
    const province = body.province || null;
    const canton = body.canton || null;
    const filterType = body.filter_type || null;

    const ip = request.headers.get("CF-Connecting-IP") || "127.0.0.1";
    
    // Hash IP asynchronously to preserve privacy
    const msgUint8 = new TextEncoder().encode(ip);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const ipHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Write to D1 database asynchronously using waitUntil, closing client connection immediately
    context.waitUntil(
      db.prepare(`
        INSERT INTO search_analytics (query, province, canton, filter_type, ip_hash, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
      `).bind(query, province, canton, filterType, ipHash).run()
      .catch(err => console.error("Failed to write search analytics to D1:", err.message))
    );

    return new Response(JSON.stringify({ success: true }), {
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
