# -*- coding: utf-8 -*-
"""Пересобирает шрифты в public/fonts из Inter.

    python scripts/build-font.py        (после npm run build)

Нужны fonttools и brotli:  pip install --user fonttools brotli

Зачем. Google отдаёт Inter кусками: отдельный файл на кириллицу, отдельный на
латиницу, и тянется это с чужого домена — два лишних DNS и TLS до первой буквы.
Здесь те же куски скачиваются один раз и обрезаются до знаков, которые на сайте
есть: кириллица 18 КБ -> ~9 КБ, латиница 47 КБ -> ~8 КБ.

Кусков по-прежнему два, и это намеренно: объединить их в один файл нельзя —
Inter переменный, а fontTools не умеет сливать переменные шрифты. Зато
unicode-range в Layout.astro остаётся честным: браузер берёт нужный кусок.

ВАЖНО: кириллицу режем ТОЛЬКО из кириллического куска, латиницу — из
латинского. Если перепутать, подмножество соберётся без ошибки, но глифов в нём
не окажется, и весь сайт молча уедет на системный шрифт.
"""
import io
import json
import os
import re
import sys
import urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

try:
    from fontTools import subset
    from fontTools.ttLib import TTFont
except ImportError:
    sys.exit("Нет fonttools. Установите: pip install --user fonttools brotli")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"}
CSS_URL = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&display=swap"

if not os.path.isdir("dist"):
    sys.exit("Сначала соберите сайт: npm run build — подмножество считается по готовым страницам.")

# 1. Какие знаки реально стоят на страницах
used = set()
for dirpath, _, files in os.walk("dist"):
    for name in files:
        if not name.endswith(".html"):
            continue
        html = io.open(os.path.join(dirpath, name), encoding="utf-8").read()
        html = re.sub(r"<(script|style)\b.*?</\1>", " ", html, flags=re.S)
        html = re.sub(r"<[^>]+>", " ", html)
        html = (html.replace("&nbsp;", " ").replace("&mdash;", "—")
                    .replace("&laquo;", "«").replace("&raquo;", "»"))
        used |= set(html)

# 2. Запас на будущие тексты
CYR = {chr(c) for c in range(0x0400, 0x0460)} | set("ЁёЙй№")
LAT = {chr(c) for c in range(0x20, 0x7F)} | set("—–…«»„“”‘’·•↑↓×÷±°§©®™€$£¥ ")
# Знак рубля Google держит отдельно, в latin-ext: без этого куска цены на сайте
# рисуются чужим шрифтом. Берём оттуда ровно его и ничего больше.
EXT = set("₽")

SUBSETS = {"cyrillic": CYR, "latin": LAT, "latin-ext": EXT}

css = urllib.request.urlopen(urllib.request.Request(CSS_URL, headers=UA), timeout=30).read().decode("utf-8")
blocks = re.findall(r"/\*\s*([a-z-]+)\s*\*/\s*(@font-face\s*\{.*?\})", css, re.S)

os.makedirs("public/fonts", exist_ok=True)
total_before = total_after = 0
RANGES = {}

for subset_name, base_chars in SUBSETS.items():
    block = next((b for name, b in blocks if name == subset_name), None)
    if block is None:
        sys.exit("В ответе Google нет куска «%s» — формат CSS изменился, проверьте скрипт." % subset_name)
    src_url = re.search(r"url\((https://[^)]+\.woff2)\)", block).group(1)
    raw = urllib.request.urlopen(urllib.request.Request(src_url, headers=UA), timeout=30).read()

    tmp = "public/fonts/_source-%s.woff2" % subset_name
    io.open(tmp, "wb").write(raw)

    # из этого куска берём только те знаки, которые в нём вообще есть
    have = set()
    src_font = TTFont(tmp)
    for table in src_font["cmap"].tables:
        have |= set(table.cmap.keys())
    src_font.close()

    wanted = base_chars if subset_name == "latin-ext" else (base_chars | used)
    chars = sorted(c for c in wanted if ord(c) in have and c.isprintable() and ord(c) > 0x1F)
    out = "public/fonts/inter-%s.woff2" % subset_name
    try:
        subset.main([
            tmp,
            "--text=" + "".join(chars),
            "--flavor=woff2",
            "--layout-features=kern,liga,calt,locl",
            "--output-file=" + out,
            "--no-hinting",
            "--desubroutinize",
        ])
    finally:
        os.remove(tmp)

    # проверяем, что глифы на месте: пустой файл собирается без единой жалобы
    check = TTFont(out)
    got = set()
    for table in check["cmap"].tables:
        got |= set(table.cmap.keys())
    check.close()
    if len(got) < len(chars) * 0.9:
        sys.exit("Подмножество «%s» вышло пустым: %d глифов вместо %d." % (subset_name, len(got), len(chars)))

    # unicode-range считаем по тому, что в файле оказалось на самом деле.
    # Брать готовые диапазоны Google нельзя: в их «латинице» нет ни знака рубля,
    # ни стрелки, а на сайте они есть — браузер молча подставил бы другой шрифт.
    codes = sorted(got)
    ranges, start, prev = [], codes[0], codes[0]
    for c in codes[1:]:
        if c != prev + 1:
            ranges.append((start, prev)); start = c
        prev = c
    ranges.append((start, prev))
    RANGES[subset_name] = ", ".join(
        "U+%04X" % a if a == b else "U+%04X-%04X" % (a, b) for a, b in ranges)

    total_before += len(raw)
    total_after += os.path.getsize(out)
    print("%-9s %3d КБ -> %3d КБ, глифов %d, диапазонов %d"
          % (subset_name, len(raw) // 1024, os.path.getsize(out) // 1024, len(got), len(ranges)))

io.open("src/data/font-ranges.json", "w", encoding="utf-8").write(
    json.dumps(RANGES, ensure_ascii=False, indent=2) + "\n")
print("итого: %d КБ -> %d КБ" % (total_before // 1024, total_after // 1024))
print("диапазоны записаны в src/data/font-ranges.json")
