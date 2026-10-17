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
  [/^services$/, '0.8', 'monthly'],
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

const xmlEscape = (v) => String(v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function readPage(page) {
  return readFileSync(join(DIST, page, 'index.html'), 'utf8');
}

// Фотографии страницы — в карту сайта: так поиск по картинкам узнаёт о них
// сразу и знает, какой странице они принадлежат. Берём только содержательные
// снимки из основной части страницы: без логотипа и без размытых подложек
// галереи (у них пустой alt — это тот же файл, что и сам снимок).
function pageImages(html) {
  const main = (html.match(/<main[\s\S]*?<\/main>/) || [''])[0];
  const seen = new Set();
  const out = [];
  for (const tag of main.match(/<img\b[^>]*>/g) || []) {
    const src = (tag.match(/\ssrc="([^"]+)"/) || [])[1];
    const alt = (tag.match(/\salt="([^"]*)"/) || [])[1];
    if (!src || !alt || /logo/i.test(src) || seen.has(src)) continue;
    seen.add(src);
    out.push(new URL(src, `${SITE}/`).href);
  }
  return out;
}

const urls = pages.map((page) => {
  const rule = PRIORITY.find(([re]) => re.test(page));
  const priority = rule ? rule[1] : '0.5';
  const changefreq = rule ? rule[2] : 'monthly';
  const loc = page === '' ? `${ORIGIN}/` : `${ORIGIN}/${page}/`;
  const images = pageImages(readPage(page))
    .map((src) => `    <image:image><image:loc>${xmlEscape(src)}</image:loc></image:image>`)
    .join('\n');
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastModified(page)}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${images ? '\n' + images : ''}
  </url>`;
});

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
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
  // Пояснения — здесь, а не в самом файле: внутри группы правил не должно быть
  // ни пустых строк, ни посторонних символов, иначе часть роботов обрывает
  // группу на первой же пустой строке.
  //
  // Disallow — хвосты старого WordPress: на /wp-admin/ и /wp-login.php хостинг
  // сам отвечает пустой страницей-проверкой с кодом 200, роботу там делать нечего.
  //
  // Clean-param — метки рекламы и переходов. Это не отдельные страницы, и
  // Яндексу об этом говорим прямо: иначе адрес с ?utm_source=... он считает
  // дублем. Google строку не понимает и пропускает; у него ту же работу
  // делает canonical.
  //
  // Каталог _astro НЕ закрыт намеренно: там стили и скрипты, без них
  // поисковик не может отрисовать страницу.
  : `User-agent: *
Disallow: ${BASE}/wp-admin/
Disallow: ${BASE}/wp-login.php
Clean-param: utm_source&utm_medium&utm_campaign&utm_content&utm_term&utm_referrer&yclid&ysclid&gclid&fbclid&_openstat&etext&erid

Sitemap: ${ORIGIN}/sitemap.xml
`;

writeFileSync(join(DIST, 'robots.txt'), robots, 'utf8');
console.log(`sitemap.xml: ${pages.length} страниц, адрес ${ORIGIN}`);
console.log(`robots.txt: карта сайта ${ORIGIN}/sitemap.xml`);

// ---------------------------------------------------------------------------
// Лента статей (RSS). Нужна читалкам и агрегаторам; заодно это ещё один
// способ для поисковика узнать о новой статье в день выхода.
// Данные берём из самих страниц: заголовок, описание и дату из разметки
// статьи — то, что уже проверено и совпадает с видимым текстом.
function jsonLd(html) {
  const found = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(m[1]);
      for (const node of data['@graph'] || [data]) found.push(node);
    } catch {
      // битую разметку ловит отдельная проверка, здесь просто пропускаем
    }
  }
  return found;
}

const posts = pages
  .filter((p) => /^blog\/.+/.test(p))
  .map((p) => {
    const html = readPage(p);
    const article = jsonLd(html).find((d) => /^(Article|BlogPosting)$/.test(String(d['@type'])));
    const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '';
    return {
      link: `${ORIGIN}/${p}/`,
      title: h1.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || (article && article.headline) || p,
      description: (article && article.description) || '',
      date: String((article && article.datePublished) || lastModified(p)).slice(0, 10),
    };
  })
  .sort((x, y) => y.date.localeCompare(x.date));

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Блог психолога Юлии Ляпиной</title>
    <link>${ORIGIN}/blog/</link>
    <description>Статьи о тревоге, отношениях и воспитании детей от практикующего психолога.</description>
    <language>ru</language>
    <atom:link href="${ORIGIN}/rss.xml" rel="self" type="application/rss+xml" />
${posts.map((post) => `    <item>
      <title>${xmlEscape(post.title)}</title>
      <link>${post.link}</link>
      <guid isPermaLink="true">${post.link}</guid>
      <pubDate>${new Date(`${post.date}T09:00:00+03:00`).toUTCString()}</pubDate>
      <description>${xmlEscape(post.description)}</description>
    </item>`).join('\n')}
  </channel>
</rss>
`;
writeFileSync(join(DIST, 'rss.xml'), rss, 'utf8');
console.log(`rss.xml: статей ${posts.length}`);

// llms.txt — короткая справка о кабинете для нейросетей (ChatGPT, Perplexity,
// Алиса и прочих), которые отвечают людям на вопросы вроде «где в Лесном
// городке детский психолог». Формат — llmstxt.org: заголовок, суть одной
// строкой, ссылки на страницы с описаниями.
//
// Собирается из уже готовых страниц: факты о кабинете — из разметки главной,
// названия и описания страниц — из их собственных заголовков. Отдельного
// текста, который надо не забыть поправить, у этого файла нет.
if (!isPreview) {
  const homeNodes = jsonLd(readPage(''));
  const biz = homeNodes.find((n) => n['@type'] === 'ProfessionalService') || {};
  const person = homeNodes.find((n) => n['@type'] === 'Person') || {};
  const addr = biz.address || {};
  const place = [addr.addressRegion, addr.addressLocality, addr.streetAddress].filter(Boolean).join(', ');

  const pageInfo = (p) => {
    const html = readPage(p);
    const h1 = ((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
    const unescape = (v) => v.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    return `- [${unescape(h1)}](${ORIGIN}/${p}${p ? '/' : ''}): ${unescape(desc)}`;
  };
  const group = (re) => pages.filter((p) => re.test(p)).map(pageInfo).join('\n');

  const llms = `# ${biz.name || 'Кабинет психолога'}

> Кабинет психолога Юлии Ляпиной в посёлке Лесной городок (Одинцовский округ, Московская область): консультации взрослых в кабинете и онлайн, занятия с детьми и подростками, подготовка к школе, развивающие программы, логопед, репетитор, монтессори-занятия.

- Адрес: ${place}
- Телефон: ${biz.telephone || ''}
- Почта: ${biz.email || ''}
- Часы работы: ежедневно с 9:00 до 21:00
- Психолог: ${person.name || ''} — ${person.description || person.jobTitle || ''}
- Методы: ${(person.knowsAbout || []).join(', ')}
- Карточка на Яндекс Картах: ${biz.hasMap || ''}
- Цены на сайте не публикуются, их называют при записи.

## Услуги и программы

${group(/^(services|programs)(\/|$)/)}

## О кабинете

${group(/^(about|specialists|contact)$/)}

## Статьи

${group(/^blog(\/|$)/)}

## Тесты

${group(/^test\//)}
`;
  writeFileSync(join(DIST, 'llms.txt'), llms, 'utf8');
  console.log(`llms.txt: ${llms.split('\n').filter((l) => l.startsWith('- [')).length} страниц`);
}

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
