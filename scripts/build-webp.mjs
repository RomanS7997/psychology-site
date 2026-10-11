// Готовит WebP-версии фотографий и уменьшенные варианты для первого экрана.
// Запускать вручную после добавления новых фото:  node scripts/build-webp.mjs
// (в обычную сборку не входит — картинки меняются редко, а обработка не быстрая)
//
// Реализация живёт в Python, потому что в проекте уже есть Pillow,
// а тянуть sharp ради шести файлов незачем.
import { execFileSync } from 'node:child_process';

const PY = `
import os
from PIL import Image

ROOT = "public/images"
HEROES = [
    "public/images/hero-psychologist.jpg",
    "public/images/services/adult-consulting.jpg",
    "public/images/services/child-therapy.jpg",
    "public/images/services/school-prep.jpg",
    "public/images/gallery/umniky/2.jpg",
    "public/images/gallery/azbuka/5.jpg",
]

made = 0
for dirpath, _, files in os.walk(ROOT):
    for name in sorted(files):
        if not name.lower().endswith((".jpg", ".jpeg", ".png")):
            continue
        if name.startswith("logo") or "favicon" in name or "apple-touch" in name:
            continue
        # Картинка для соцсетей нужна только в jpg: webp мессенджеры не берут
        if name.startswith("og-image"):
            continue
        src = os.path.join(dirpath, name)
        dst = os.path.splitext(src)[0] + ".webp"
        gallery = "gallery" in dirpath.replace("\\\\", "/")
        side, q = (1100, 74) if gallery else (1400, 80)
        im = Image.open(src)
        if max(im.size) > side:
            k = side / max(im.size)
            im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        if im.mode in ("RGBA", "LA", "P"):
            im.save(dst, "WEBP", quality=q + 6, method=6)
        else:
            im.convert("RGB").save(dst, "WEBP", quality=q, method=6)
        made += 1

# Варианты для первого экрана. Телефону нужна картинка шириной 650–1000
# точек, а раньше между 620 и 1120 ничего не было — он брал 1120.
# И главное: исходники у пяти фото шириной 960, а «1120» получался
# РАСТЯГИВАНИЕМ: файл тяжелел на треть, резкости не прибавлялось.
# Теперь больше исходника вариант не делается, а имя файла — его настоящая ширина.
import glob, re
WIDTHS = (480, 620, 800, 1120)
for src in HEROES:
    if not os.path.exists(src):
        continue
    im = Image.open(src).convert("RGB")
    base = os.path.splitext(src)[0]
    for old in glob.glob(glob.escape(base) + "-*.webp"):
        if re.search(r"-\\d+\\.webp$", old):
            os.remove(old)
    widths = sorted({min(w, im.width) for w in WIDTHS})
    for w in widths:
        k = w / im.width
        im.resize((w, round(im.height * k)), Image.LANCZOS).save(
            "%s-%d.webp" % (base, w), "WEBP", quality=72 if w >= 800 else 76, method=6)
    print("  %s: %s" % (os.path.basename(src), ", ".join(str(w) for w in widths)))

print("webp готовы: %d файлов" % made)
`;

execFileSync('python', ['-c', PY], { stdio: 'inherit' });
