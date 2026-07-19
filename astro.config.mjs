// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://vet24cr.com', // Reemplazar con el dominio final una vez adquirido
  trailingSlash: 'always',
  adapter: cloudflare(),
  integrations: [sitemap()],
  server: {
    // Respect the PORT env var (e.g. from tooling) but keep 4321 as default
    port: process.env.PORT ? Number(process.env.PORT) : 4321
  },
  vite: {
    plugins: [tailwindcss()]
  }
});