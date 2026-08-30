// Собирает ссылку с учётом base-пути сайта (/psychology-site на GitHub Pages).
// В контент-файлах пути пишутся без префикса: "/services/adult".
//
// Функция намеренно идемпотентна: часть страниц собирает ссылки в массиве данных,
// а шаблон потом прогоняет их через url() ещё раз. Раньше от этого получалось
// /psychology-site/psychology-site/... и два десятка ссылок вели в «страница не найдена».
export function url(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;

  if (!base) return normalized;

  // Префикс уже на месте — второй раз не приклеиваем
  if (normalized === base || normalized.startsWith(`${base}/`)) return normalized;

  return `${base}${normalized}`;
}
