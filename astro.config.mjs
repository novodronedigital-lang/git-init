// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// Controla qué subdominio se está generando en este build:
// "marketing" (droneduca.es, por defecto), "formacion" (formacion.droneduca.es) o "admin" (admin.droneduca.es).
// En local (astro dev) no se define, así que todo se comporta como "marketing" con enlaces relativos.
const siteTarget = process.env.PUBLIC_SITE_TARGET || 'marketing';

const APP_PATH_PREFIXES = ['/cursos', '/campus', '/login', '/registro'];
const ADMIN_PATH_PREFIX = '/admin';

function isAppPage(path) {
  return APP_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function isAdminPage(path) {
  return path === ADMIN_PATH_PREFIX || path.startsWith(`${ADMIN_PATH_PREFIX}/`);
}

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || 'https://droneduca.es',
  integrations: [
    sitemap({
      filter: (page) => {
        const path = new URL(page).pathname;
        if (siteTarget === 'formacion') return isAppPage(path);
        if (siteTarget === 'admin') return isAdminPage(path);
        return !isAppPage(path) && !isAdminPage(path);
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
