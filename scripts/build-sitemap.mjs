// Собирает dist/sitemap.xml и dist/robots.txt из реально существующих страниц.
// Запускается после astro build (см. package.json).
// Домен и базовый путь берутся ОТТУДА ЖЕ, ОТКУДА ИХ БЕРЁТ ASTRO (astro.config.mjs),
// иначе карта сайта окажется на одном домене, а сам сайт — на другом,
// и поисковики отбросят её целиком.
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const SITE = (process.env.SITE_URL || 'https://romans7997.github.io').replace(/\/$/, '');
const BASE = (process.env.SITE_BASE || '/psychology-site').replace(/\/$/, '');
const ORIGIN = `${SITE}${BASE}`;
const DIST = 'dist';

// какие разделы важнее для поиска
const PRIORITY = [
  [/^$/, '1.0', 'weekly'],
  [/^(services|programs)\//, '0.9', 'monthly'],
  [/^blog$/, '0.8', 'weekly'],
  [/^blog\//, '0.7', 'monthly'],
  [/^(specialists|about|contact)$/, '0.8', 'monthly'],
  [/^test\//, '0.6', 'monthly'],
];

function findPages(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) findPages(full, acc);
    else if (entry === 'index.html') acc.push(relative(DIST, dir).split('\\').join('/'));
  }
  return acc;
}

const today = new Date().toISOString().slice(0, 10);
const pages = findPages(DIST)
  .filter((p) => p !== '404')
  .sort((a, b) => a.localeCompare(b));

const urls = pages.map((page) => {
  const rule = PRIORITY.find(([re]) => re.test(page));
  const priority = rule ? rule[1] : '0.5';
  const changefreq = rule ? rule[2] : 'monthly';
  const loc = page === '' ? `${ORIGIN}/` : `${ORIGIN}/${page}/`;
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
});

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;

writeFileSync(join(DIST, 'sitemap.xml'), xml, 'utf8');

// robots.txt пишем здесь же, чтобы ссылка на карту сайта не разъехалась с доменом.
// Важно: на GitHub Pages роботы читают только корень хоста, поэтому файл заработает
// после переезда на свой домен — там он окажется по адресу /robots.txt.
const robots = `User-agent: *
Allow: /

Sitemap: ${ORIGIN}/sitemap.xml

# Каталог _astro НЕ закрываем: там лежат стили и скрипты,
# без них поисковик не может отрисовать страницу и оценить вёрстку.
Disallow: ${BASE}/.well-known/

Crawl-delay: 1
`;

writeFileSync(join(DIST, 'robots.txt'), robots, 'utf8');
console.log(`sitemap.xml: ${pages.length} страниц, адрес ${ORIGIN}`);
console.log(`robots.txt: карта сайта ${ORIGIN}/sitemap.xml`);

// ---------------------------------------------------------------------------
// Переезд со старого сайта на julialyapina.ru.
// Старый сайт — статическая выгрузка WordPress, у него всего три внутренних
// адреса. GitHub Pages не умеет серверный 301, поэтому кладём на старые адреса
// страницы-перенаправления: мгновенный refresh для человека и rel=canonical,
// по которому поисковик склеивает старый адрес с новым.
const REDIRECTS = {
  'about/index-1.htm': '/about/',
  'contact/index-1.htm': '/contact/',
  'services/index-1.htm': '/services/adult/',
  // на старом сайте главная открывалась и так, и так
  'index.htm': '/',
};

for (const [from, to] of Object.entries(REDIRECTS)) {
  const target = `${ORIGIN}${to}`;
  const html = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <title>Страница переехала</title>
    <link rel="canonical" href="${target}" />
    <meta name="robots" content="noindex, follow" />
    <meta http-equiv="refresh" content="0; url=${target}" />
  </head>
  <body>
    <p>Страница переехала: <a href="${target}">${target}</a></p>
    <script>location.replace(${JSON.stringify(target)});</script>
  </body>
</html>
`;
  const out = join(DIST, from);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html, 'utf8');
}
console.log(`перенаправления со старого сайта: ${Object.keys(REDIRECTS).length}`);
