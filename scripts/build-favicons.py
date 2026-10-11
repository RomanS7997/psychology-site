# -*- coding: utf-8 -*-
"""Значки сайта из логотипа: вкладка браузера, выдача поисковиков, экран телефона.

    python scripts/build-favicons.py

Зачем отдельный скрипт. В logo.png знак занимает чуть больше половины
стороны — вокруг него поля, заложенные под шапку сайта. В значке 16×16 от
такого знака оставалось пятно 10×10, а в выдаче Яндекса и Google у сайта
долго висел чужой значок от прежнего сайта: подходящей картинки 120×120,
которой поисковик мог бы его заменить, на сайте просто не было.

Что делает:
  * обрезает логотип по самому знаку и оставляет небольшое поле;
  * собирает favicon.ico (16, 32, 48) и PNG 16, 32, 120, 192, 512;
  * собирает apple-touch-icon на НЕПРОЗРАЧНОМ белом фоне: прозрачный фон
    iPhone заливает чёрным, и светлый знак на нём выглядит грязно.

Логотипы для шапки (logo-44/88/132.png) скрипт не трогает: там поля — часть
вёрстки.
"""
import io
import os
import sys

from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")
SOURCE = os.path.join(ROOT, "images", "logo.png")

# Поле вокруг знака, доля стороны значка
PAD = 0.05
PAD_APPLE = 0.12


def mark():
    """Логотип, обрезанный по знаку (по непрозрачным точкам)."""
    logo = Image.open(SOURCE).convert("RGBA")
    box = logo.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    return logo.crop(box)


def on_square(image, size, pad, background=None):
    """Вписать знак в квадрат size×size с полем pad."""
    inner = round(size * (1 - 2 * pad))
    scale = inner / max(image.size)
    w, h = max(1, round(image.width * scale)), max(1, round(image.height * scale))
    small = image.resize((w, h), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), background or (0, 0, 0, 0))
    canvas.alpha_composite(small, ((size - w) // 2, (size - h) // 2))
    return canvas


def main():
    m = mark()
    made = []

    for name, size in [("favicon-16.png", 16), ("favicon-32.png", 32), ("favicon-120.png", 120),
                       ("icon-192.png", 192), ("icon-512.png", 512)]:
        on_square(m, size, PAD).save(os.path.join(ROOT, name), optimize=True)
        made.append(name)

    # .ico: три размера, каждый уменьшен отдельно из исходника — так мелкий
    # значок получается чётче, чем если ужимать готовый 48-пиксельный
    frames = [on_square(m, s, PAD) for s in (16, 32, 48)]
    frames[-1].save(os.path.join(ROOT, "favicon.ico"), format="ICO",
                    sizes=[(16, 16), (32, 32), (48, 48)], append_images=frames[:-1])
    made.append("favicon.ico")

    apple = on_square(m, 180, PAD_APPLE, background=(255, 255, 255, 255)).convert("RGB")
    apple.save(os.path.join(ROOT, "apple-touch-icon.png"), optimize=True)
    made.append("apple-touch-icon.png")

    for name in made:
        path = os.path.join(ROOT, name)
        print(f"  {name:<22} {os.path.getsize(path):>6} байт")


if __name__ == "__main__":
    main()
