// Собирает dist/sitemap.xml и dist/robots.txt из реально существующих страниц.
// Запускается после astro build (см. package.json).
//
// Домен берётся ИЗ САМОГО astro.config.mjs, а не из копии его переменных.
// Раньше здесь лежали свои значения по умолчанию, и это один раз уже привело
// к беде: astro собрался под боевой домен, а этот скрипт запустили отдельно,
// без переменных окружения, — страницы вышли с одним адресом, а карта сайта
// и robots.txt с другим. Сломанная карта при переезде не чинится ничем.
// Теперь разойтись они не могут физически: значение одно на двоих.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import astroConfig from '../astro.config.mjs';

const SITE = String(astroConfig.site || '').replace(/\/$/, '');
const BASE = String(astroConfig.base || '').replace(/\/$/, '');
const ORIGIN = `${SITE}${BASE}`;
const DIST = 'dist';

if (!SITE) {
  console.error('В astro.config.mjs не задан site — карту сайта собирать не из чего.');
  process.exit(1);
}

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

// Дату правки берём из истории самой страницы. Раньше у всех семнадцати стояла
// дата сборки — поисковик видел, что «весь сайт изменился» при каждой выкладке,
// и переставал верить этому полю вообще.
function sourceOf(page) {
  const candidates = page === ''
    ? ['src/pages/index.astro']
    : [`src/pages/${page}.astro`, `src/pages/${page}/index.astro`];
  return candidates.find((f) => existsSync(f));
}

function lastModified(page) {
  const file = sourceOf(page);
  if (!file) return today;
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    // Пустой ответ — это мелкая история сборщика (checkout на одну ревизию):
    // тогда честнее поставить сегодняшнюю дату, чем выдумывать прошлое.
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : today;
  } catch {
    return today;
  }
}
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
    <lastmod>${lastModified(page)}</lastmod>
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
// Превью на github.io закрываем целиком: иначе копия сайта соревнуется
// с боевым доменом за те же запросы, и побеждает не обязательно боевой.
const isPreview = /github\.io$/.test(new URL(SITE).hostname);

const robots = isPreview
  ? `User-agent: *
Disallow: /

# Это превью-копия сайта для просмотра правок.
# Боевой адрес: https://julialyapina.ru/
`
  : `User-agent: *
Allow: /

Sitemap: ${ORIGIN}/sitemap.xml

# Каталог _astro НЕ закрываем: там лежат стили и скрипты,
# без них поисковик не может отрисовать страницу и оценить вёрстку.
Disallow: ${BASE}/.well-known/
Disallow: ${BASE}/_probe.php

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

// ---------------------------------------------------------------------------
// Последняя проверка: сходится ли адрес в страницах с адресом в карте сайта
// ---------------------------------------------------------------------------
// Сломанную сборку снаружи не видно: страницы открываются, вёрстка на месте,
// а карта сайта ведёт на чужой домен. Заметно это становится через неделю, по
// отсутствию страниц в поиске. Поэтому сверяем здесь и падаем сразу.
const home = join(DIST, 'index.html');
if (existsSync(home)) {
  const canonical = (readFileSync(home, 'utf8').match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  if (canonical && !canonical.startsWith(`${ORIGIN}/`) && canonical.replace(/\/$/, '') !== ORIGIN) {
    console.error('');
    console.error('СБОРКА РАЗЪЕХАЛАСЬ — ничего не выкладывайте.');
    console.error(`  страницы собраны под:  ${canonical}`);
    console.error(`  карта сайта собрана под: ${ORIGIN}/`);
    console.error('  Так бывает, когда astro и этот скрипт запускали по отдельности.');
    console.error('  Соберите заново одной командой: npm run build');
    process.exit(1);
  }
  console.log(`адрес в страницах и в карте сайта совпадает: ${ORIGIN}/`);
}
