import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://yoursite.ru', // Поменяй на свой домен
  integrations: [tailwind()],
  output: 'static',
});
