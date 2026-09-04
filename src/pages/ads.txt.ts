import type { APIRoute } from 'astro';

/**
 * ads.txt delegado al Ads.txt Manager de Ezoic.
 *
 * Ezoic añade y rota las entradas de sus socios de demanda, así que mantener
 * el archivo a mano se desincronizaría enseguida. La especificación del IAB
 * admite una redirección, y los rastreadores la siguen.
 *
 * Los métodos que documenta Ezoic (.htaccess, Nginx, PHP, WordPress) no
 * aplican con el adaptador de Cloudflare; de ahí este endpoint.
 */
const DESTINO = 'https://srv.adstxtmanager.com/19390/vet24cr.com';

// Debe resolverse en el Worker: un prerender generaría un archivo, y un
// archivo no puede redirigir.
export const prerender = false;

export const GET: APIRoute = () =>
  new Response(null, {
    status: 301,
    headers: {
      Location: DESTINO,
      'Cache-Control': 'public, max-age=86400',
    },
  });
