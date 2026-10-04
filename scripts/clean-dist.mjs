// Готовит пустую папку dist перед сборкой: иначе там копятся файлы, удалённые
// из public (старые фото галерей, PDF, разовые служебные файлы), и уезжают
// на сервер.
//
// Проект лежит в OneDrive, а он сразу после сборки начинает заливать в облако
// все её файлы — 158 штук, 36 МБ — и держит их, пока заливает. Удалить их в
// это время нельзя. Прежний вариант чистил с force: true, который молча
// пропускает занятое, и сборка шла поверх старья: за один день так в неё
// дважды попал мусор — шрифт без кириллицы и уже удалённый служебный пробник.
//
// Удалить занятую папку нельзя, а переименовать — можно. Поэтому:
// 1. Пробуем очистить dist.
// 2. Не вышло — отодвигаем всю старую сборку в .dist-trash и собираем в
//    пустую папку. Ждать OneDrive не нужно, собирать поверх старья — тоже.
// 3. Отодвинутое прошлыми сборками удаляем заодно, если OneDrive его уже
//    отпустил. Не отпустил — оставляем до следующего раза, сборку не держим.
// 4. Если даже отодвинуть не удалось — сборка останавливается: сборка поверх
//    старых файлов хуже, чем никакой, потому что выглядит исправной.
//
// Пробовали вынести dist из OneDrive ссылкой (junction) — не годится: Astro
// во время сборки импортирует из dist временные модули, Node идёт по
// настоящему адресу ссылки и оттуда не находит node_modules проекта.
//
// В GitHub Actions dist до сборки не существует, и всё это не срабатывает.
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const TRASH = '.dist-trash';

function tryRemove(path) {
  try {
    rmSync(path, { recursive: true, force: false, maxRetries: 2, retryDelay: 100 });
    return true;
  } catch {
    return false;
  }
}

function emptyDir(dir) {
  for (const entry of readdirSync(dir)) tryRemove(join(dir, entry));
  return readdirSync(dir).length === 0;
}

// Сначала прибираем то, что отодвинули прошлые сборки
if (existsSync(TRASH)) {
  for (const old of readdirSync(TRASH)) tryRemove(join(TRASH, old));
  if (readdirSync(TRASH).length === 0) tryRemove(TRASH);
}

if (!existsSync(DIST)) process.exit(0);
if (emptyDir(DIST)) process.exit(0);

// Очистить не вышло — значит, файлы заняты. Отодвигаем всю папку целиком.
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
try {
  mkdirSync(TRASH, { recursive: true });
  renameSync(DIST, join(TRASH, stamp));
  console.log(`[clean-dist] старая сборка занята OneDrive — отодвинута в ${TRASH}/${stamp}, соберу в пустую`);
} catch (e) {
  const left = existsSync(DIST) ? readdirSync(DIST) : [];
  console.error('');
  console.error('[clean-dist] dist не удалось ни очистить, ни отодвинуть — сборка остановлена.');
  console.error(`[clean-dist] ${e.code || ''} ${e.message || ''}`.trim());
  console.error(`[clean-dist] Осталось записей: ${left.length}, например: ${left.slice(0, 5).join(', ')}`);
  console.error('[clean-dist] Подождите минуту, пока OneDrive отпустит файлы, и соберите снова.');
  process.exit(1);
}
