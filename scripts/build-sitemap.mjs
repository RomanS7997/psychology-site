// Собирает public/sitemap.xml из реально существующих страниц сайта.
// Запускается после astro build (см. package.json).
// Адрес берётся из SITE_URL, по умолчанию — боевой домен.
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const SITE = (process.env.SITE_URL || 'https://julialyapina.ru').replace(/\/$/, '');
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
  const loc = page === '' ? `${SITE}/` : `${SITE}/${page}/`;
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
console.log(`sitemap.xml: ${pages.length} страниц, домен ${SITE}`);
