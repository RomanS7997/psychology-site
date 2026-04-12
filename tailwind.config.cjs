/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Новая единая палитра сайта
        primary: {
          DEFAULT: '#4894B2', // Основной цвет кнопок
          hover: '#18698F', // Hover для кнопок
          light: '#F2F7FD', // Светлый фон для hover в header
        },
        link: {
          hover: '#d9797d', // Hover для ссылок
        },
        // Оставляем старые значения для совместимости
        secondary: {
          500: '#764ba2',
          600: '#5e3a82',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
