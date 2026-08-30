import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// Адрес сайта задаётся здесь в одном месте.
// Сейчас сборка идёт на GitHub Pages, поэтому нужен префикс /psychology-site.
// Для переезда на свой домен: SITE_URL=https://julialyapina.ru SITE_BASE=/ npm run build
// (или просто поменять значения по умолчанию ниже).
const SITE = process.env.SITE_URL || 'https://romans7997.github.io';
const BASE = process.env.SITE_BASE || '/psychology-site';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  base: BASE,
  integrations: [tailwind()],
  output: 'static',
});
