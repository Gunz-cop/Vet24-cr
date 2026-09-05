/**
 * Servidor estático mínimo para comparar dos builds a la vez.
 *
 * Resuelve como Cloudflare Pages: /ruta -> /ruta/index.html, para que las URLs
 * del sitio funcionen igual que en producción.
 *
 * Uso: node servir.mjs <directorio> <puerto>
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [root, port] = [process.argv[2], Number(process.argv[3])];
if (!root || !port) {
  console.error('Uso: node servir.mjs <directorio> <puerto>');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.xml': 'application/xml', '.txt': 'text/plain;charset=utf-8',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon'
};

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(root, url);
  try {
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    else if (!fs.existsSync(f) && fs.existsSync(f + '/index.html')) f = f + '/index.html';
    else if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f = f + '.html';
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  } catch (e) {
    res.writeHead(500); res.end(String(e));
  }
}).listen(port, () => console.log(`sirviendo ${root} en :${port}`));
