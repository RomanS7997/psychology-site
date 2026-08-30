// Полностью удаляет dist перед сборкой: иначе там копятся файлы,
// удалённые из public (старые фото галерей, PDF), и попадают в превью.
// На локальной машине папка лежит в OneDrive, который иногда «держит» файлы,
// поэтому после rmSync проверяем результат и подчищаем поштучно.
import { rmSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';

function wipe(dir) {
  rmSync(dir, { recursive: true, force: true });
  if (!existsSync(dir)) return true;
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
  rmSync(dir, { recursive: true, force: true });
  return !existsSync(dir);
}

if (existsSync(DIST) && !wipe(DIST)) {
  console.warn('[clean-dist] не удалось полностью удалить dist — возможно, папку держит OneDrive.');
  console.warn('[clean-dist] на сборке в GitHub Actions это не влияет: там папка всегда чистая.');
}
