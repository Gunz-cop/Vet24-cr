import { getCollection } from 'astro:content';

export async function GET() {
  const clinicas = await getCollection('clinicas');
  const manifest = clinicas.map(c => ({
    slug: c.data.slug,
    nombre: c.data.nombre,
    web: c.data.web || null,
    waze_url: c.data.waze_url || null,
    maps_url: c.data.maps_url || null
  }));

  return new Response(JSON.stringify(manifest), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
