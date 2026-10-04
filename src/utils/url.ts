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

  // Якорь и параметры отделяем, чтобы черта встала в адрес, а не после решётки.
  // Раньше ссылка вида /specialists#specialist-1 возвращалась как есть, и
  // сервер отправлял человека сначала на /specialists/ — лишний переход на
  // каждом клике по карточке специалиста.
  const cut = withBase.search(/[#?]/);
  const pathPart = cut === -1 ? withBase : withBase.slice(0, cut);
  const tail = cut === -1 ? '' : withBase.slice(cut);

  if (pathPart.endsWith('/')) return withBase;

  // Файл с расширением — это файл, ему черта не нужна
  if (/\.[a-z0-9]{2,5}$/i.test(pathPart)) return withBase;

  return `${pathPart}/${tail}`;
}
