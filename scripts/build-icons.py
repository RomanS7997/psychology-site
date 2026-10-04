# -*- coding: utf-8 -*-
"""Собирает src/data/icons.json из набора Lucide.

    python scripts/build-icons.py

Словарь «смысл -> иконка Lucide» лежит в scripts/icon-vocabulary.json.
Чтобы поменять иконку, правится словарь, а не рисунок: рисунки мы больше
руками не рисуем — именно от этого прежние выглядели кустарно.

Версия Lucide закреплена: обновление набора меняет рисунки, и это должно
быть решением, а не случайностью при пересборке.

Lucide распространяется под лицензией ISC — свободное использование с
сохранением уведомления. Уведомление стоит в src/components/Icon.astro.
"""
import io
import json
import os
import re
import sys
import urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

LUCIDE_VERSION = "1.52.0"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOCAB = os.path.join(ROOT, "scripts", "icon-vocabulary.json")
OUT = os.path.join(ROOT, "src", "data", "icons.json")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120"}

vocab = json.load(io.open(VOCAB, encoding="utf-8"))
# формат словаря: [{"key": "anxiety", "lucide": "wind", "meaning": "..."}]

icons = {}
problems = []
for item in sorted(vocab, key=lambda v: v["key"]):
    key, name = item["key"], item["lucide"]
    url = "https://unpkg.com/lucide-static@%s/icons/%s.svg" % (LUCIDE_VERSION, name)
    try:
        svg = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read().decode("utf-8")
    except Exception as e:
        problems.append("%s -> %s: %s" % (key, name, str(e)[:60]))
        continue
    body = re.search(r"<svg[^>]*>(.*)</svg>", svg, re.S)
    if not body:
        problems.append("%s -> %s: не разобрать файл" % (key, name))
        continue
    # внутренности без переносов и лишних пробелов — в разметке их сотни штук
    inner = re.sub(r"\s*\n\s*", "", body.group(1)).strip()
    inner = re.sub(r"\s+/>", "/>", inner)
    if not re.search(r"<(path|circle|rect|line|polyline|polygon|ellipse)\b", inner):
        problems.append("%s -> %s: пустой рисунок" % (key, name))
        continue
    icons[key] = inner

if problems:
    print("НЕ СОБРАНО — исправьте словарь:")
    for p in problems:
        print("  ", p)
    sys.exit(1)

io.open(OUT, "w", encoding="utf-8").write(json.dumps(icons, ensure_ascii=False, indent=2) + "\n")
print("иконок: %d, Lucide %s -> %s" % (len(icons), LUCIDE_VERSION, os.path.relpath(OUT, ROOT)))
