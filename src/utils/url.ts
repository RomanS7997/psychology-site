// Собирает ссылку с учётом base-пути сайта (/psychology-site на GitHub Pages).
// В контент-файлах пути пишутся без префикса: "/services/adult".
export function url(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (!path.startsWith('/')) return `${base}/${path}`;
  return `${base}${path}`;
}
