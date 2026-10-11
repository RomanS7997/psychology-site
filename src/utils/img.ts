// Пути к облегчённым версиям фотографий.
//
// Рядом с каждым jpg/png в public/images лежит .webp (см. scripts/build-webp.mjs),
// а у картинок первого экрана — ещё и варианты -620/-1120.
//
// Помощники, а не компонент: <img> должен оставаться в разметке самой страницы,
// иначе он получает область видимости чужого компонента и scoped-стили
// страницы (.hero-portrait, .slide-img и прочие) до него не доходят.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { url } from './url';
import alts from '../data/alts.json';

// Путь без базового префикса: на превью адреса начинаются с /psychology-site,
// а файлы в public и ключи подписей — нет.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const bare = (src: string) => (BASE && src.startsWith(`${BASE}/`) ? src.slice(BASE.length) : src);

/**
 * Подпись к фотографии (alt) из src/data/alts.json — там описано, что на
 * каждом снимке на самом деле. Вариант нужен, когда один и тот же кадр стоит
 * на странице дважды (в первом экране и в галерее): подписи должны различаться.
 * Если снимка в списке нет, возвращается запасной текст.
 */
export function altOf(src: string, fallback = '', variant?: string): string {
  const table = alts as Record<string, string>;
  const key = bare(src);
  return (variant && table[`${key}#${variant}`]) || table[key] || fallback;
}

const CONVERTIBLE = /\.(jpe?g|png)$/i;
const RAW = /logo|favicon|apple-touch/i;

/** Адрес webp-версии. Вернёт null, если её нет (логотипы, иконки). */
export function webp(src: string): string | null {
  if (!CONVERTIBLE.test(src) || RAW.test(src)) return null;
  return url(src.replace(CONVERTIBLE, '.webp'));
}

/**
 * Набор размеров для картинок первого экрана: телефон не качает файл для
 * большого монитора. Варианты лежат рядом с фото как имя-ШИРИНА.webp
 * (их делает scripts/build-webp.mjs). Список читается с диска при сборке,
 * поэтому в srcset всегда стоят настоящие файлы и их настоящая ширина.
 */
export function webpSet(src: string): string | null {
  if (!CONVERTIBLE.test(src) || RAW.test(src)) return null;
  const variants = heroVariants(src);
  if (!variants.length) return null;
  return variants.map((v) => `${url(v.path)} ${v.width}w`).join(', ');
}

/** Самый крупный вариант — для подсказки preload и как запасной адрес. */
export function webpLargest(src: string): string | null {
  const variants = heroVariants(src);
  return variants.length ? url(variants[variants.length - 1].path) : null;
}

const variantCache = new Map<string, { path: string; width: number }[]>();

function heroVariants(src: string) {
  if (!variantCache.has(src)) {
    const stem = src.replace(CONVERTIBLE, '');
    const dir = stem.slice(0, stem.lastIndexOf('/'));
    const name = stem.slice(stem.lastIndexOf('/') + 1);
    let found: { path: string; width: number }[] = [];
    try {
      found = readdirSync(join(process.cwd(), 'public', dir))
        .map((file) => {
          const m = file.match(/^(.*)-(\d+)\.webp$/);
          return m && m[1] === name ? { path: `${dir}/${file}`, width: Number(m[2]) } : null;
        })
        .filter((v): v is { path: string; width: number } => v !== null)
        .sort((a, b) => a.width - b.width);
    } catch {
      found = [];
    }
    variantCache.set(src, found);
  }
  return variantCache.get(src) ?? [];
}

/** Значение sizes по умолчанию для картинок первого экрана. */
export const HERO_SIZES = '(max-width: 860px) 92vw, 560px';

// ---------------------------------------------------------------------------
// Размеры картинок для атрибутов width и height
// ---------------------------------------------------------------------------
// Браузеру размеры нужны до того, как картинка скачается: по ним он заранее
// оставляет место, и текст не прыгает. Место у нас и так держит CSS, но
// поисковики и проверки (Lighthouse) смотрят именно на атрибуты.
//
// Размеры читаются прямо из файла при сборке — ни отдельного скрипта, ни
// списка, который надо не забыть обновить, когда добавили фото.

const dimsCache = new Map<string, { width: number; height: number } | null>();

function readJpeg(buf: Buffer) {
  let orientation = 1;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    const size = buf.readUInt16BE(i + 2);
    // EXIF: телефон мог записать фото «лёжа» и пометить, что его надо
    // повернуть. Браузер поворачивает — значит, ширина и высота меняются местами.
    if (marker === 0xe1 && buf.toString('ascii', i + 4, i + 8) === 'Exif') {
      const tiff = i + 10;
      const little = buf.toString('ascii', tiff, tiff + 2) === 'II';
      const u16 = (o: number) => (little ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
      const u32 = (o: number) => (little ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
      const ifd = tiff + u32(tiff + 4);
      const count = u16(ifd);
      for (let n = 0; n < count; n++) {
        const entry = ifd + 2 + n * 12;
        if (entry + 12 > buf.length) break;
        if (u16(entry) === 0x0112) { orientation = u16(entry + 8); break; }
      }
    }
    // Кадр изображения: SOF0–SOF15, кроме таблиц (C4, C8, CC)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = buf.readUInt16BE(i + 5);
      const width = buf.readUInt16BE(i + 7);
      return orientation >= 5 ? { width: height, height: width } : { width, height };
    }
    i += 2 + size;
  }
  return null;
}

function readPng(buf: Buffer) {
  if (buf.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/**
 * Ширина и высота картинки из public/. Раскладывается прямо в тег:
 * <img src={url(src)} {...dims(src)} />
 * Если файл не прочитался, атрибутов просто не будет — страница не сломается.
 */
export function dims(src: string): { width?: number; height?: number } {
  if (!dimsCache.has(src)) {
    let found: { width: number; height: number } | null = null;
    try {
      const buf = readFileSync(join(process.cwd(), 'public', bare(src)));
      if (buf[0] === 0xff && buf[1] === 0xd8) found = readJpeg(buf);
      else if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') found = readPng(buf);
    } catch {
      found = null;
    }
    dimsCache.set(src, found);
  }
  return dimsCache.get(src) ?? {};
}
