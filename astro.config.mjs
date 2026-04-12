import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://romans7997.github.io',
  base: '/psychology-site',
  integrations: [tailwind()],
  output: 'static',
});
