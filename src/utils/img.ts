// Пути к облегчённым версиям фотографий.
//
// Рядом с каждым jpg/png в public/images лежит .webp (см. scripts/build-webp.mjs),
// а у картинок первого экрана — ещё и варианты -620/-1120.
//
// Помощники, а не компонент: <img> должен оставаться в разметке самой страницы,
// иначе он получает область видимости чужого компонента и scoped-стили
// страницы (.hero-portrait, .slide-img и прочие) до него не доходят.
import { url } from './url';

const CONVERTIBLE = /\.(jpe?g|png)$/i;
const RAW = /logo|favicon|apple-touch/i;

/** Адрес webp-версии. Вернёт null, если её нет (логотипы, иконки). */
export function webp(src: string): string | null {
  if (!CONVERTIBLE.test(src) || RAW.test(src)) return null;
  return url(src.replace(CONVERTIBLE, '.webp'));
}

/** Два размера для картинок первого экрана: 1x-экран не качает retina-файл. */
export function webpSet(src: string): string | null {
  if (!CONVERTIBLE.test(src) || RAW.test(src)) return null;
  const stem = src.replace(CONVERTIBLE, '');
  return `${url(stem + '-620.webp')} 620w, ${url(stem + '-1120.webp')} 1120w`;
}

/** Значение sizes по умолчанию для картинок первого экрана. */
export const HERO_SIZES = '(max-width: 860px) 92vw, 560px';
