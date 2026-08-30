// Собирает ссылку с учётом base-пути сайта (/psychology-site на GitHub Pages).
// В контент-файлах пути пишутся без префикса: "/services/adult".
//
// Функция намеренно идемпотентна: часть страниц собирает ссылки в массиве данных,
// а шаблон потом прогоняет их через url() ещё раз. Раньше от этого получалось
// /psychology-site/psychology-site/... и два десятка ссылок вели в «страница не найдена».
//
// Страницам дописывается косая черта на конце: без неё каждый переход по сайту
// получал переадресацию 301, а канонический адрес расходился с фактическим.
// Файлам (картинкам, xml), якорям и адресам с параметрами черта не нужна.
export function url(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;

  // Префикс уже на месте — второй раз не приклеиваем
  const withBase =
    !base || normalized === base || normalized.startsWith(`${base}/`)
      ? normalized
      : `${base}${normalized}`;

  if (withBase.endsWith('/')) return withBase;

  // Якорь, параметры или файл с расширением оставляем как есть
  if (/[#?]/.test(withBase)) return withBase;
  if (/\.[a-z0-9]{2,5}$/i.test(withBase)) return withBase;

  return `${withBase}/`;
}
