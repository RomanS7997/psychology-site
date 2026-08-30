/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    // Контейнер по умолчанию у Tailwind ступенчатый: между 1180 и 1279 он
    // застревает на 1024, и колонка страницы схлопывалась с 1180 до 960.
    // Делаем его плавным с потолком 1280 — ступенька исчезает.
    container: {
      center: true,
      screens: {
        sm: '100%',
        md: '100%',
        lg: '100%',
        xl: '1280px',
        '2xl': '1280px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
