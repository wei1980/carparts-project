#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""KN 商品圖還原官方白底：D 槽早期 jpg（官方白底圖）→ 轉 webp 覆蓋 C 槽
規則：
  1. 只處理「同名對應」的檔案（jpg 檔名 = webp 檔名）
  2. 轉 webp 品質 90，尺寸維持原圖（最大邊 1000px 內不縮）
  3. 冪等：無 --force 時，C 槽 mtime 已晚於 D 槽來源則跳過
用法:
  python restore_kn_official.py --dry
  python restore_kn_official.py --apply [--only=關鍵字]
"""
import os, sys
from PIL import Image

SRC = r"D:\網站\media\parts\Intake\airfilter\KN"
DST = r"C:\carparts\carparts-api\media\parts\Intake\airfilter\KN"
DRY = '--dry' in sys.argv
ONLY = None
FORCE = '--force' in sys.argv
for a in sys.argv[1:]:
    if a.startswith('--only='):
        ONLY = a.split('=')[1]

MAX_SIDE = 1000

def main():
    jpgs = sorted(f for f in os.listdir(SRC) if f.lower().endswith(('.jpg', '.jpeg')))
    done = skipped = missing = 0
    for f in jpgs:
        base = os.path.splitext(f)[0]
        if ONLY and ONLY.lower() not in base.lower():
            continue
        dst_name = base + '.webp'
        dst = os.path.join(DST, dst_name)
        src = os.path.join(SRC, f)
        if not os.path.exists(dst):
            missing += 1
            continue
        # 冪等：C 槽比 D 槽新 → 已處理過
        if not FORCE and os.path.getmtime(dst) >= os.path.getmtime(src):
            skipped += 1
            continue
        if DRY:
            done += 1
            continue
        try:
            img = Image.open(src).convert('RGB')
            w, h = img.size
            if max(w, h) > MAX_SIDE:
                ratio = MAX_SIDE / max(w, h)
                img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
            img.save(dst, 'WEBP', quality=90)
            done += 1
            if done % 300 == 0:
                print(f"  …已處理 {done}")
        except Exception as e:
            print(f"ERR {f}: {e}")
    print(f"\n{'[dry] ' if DRY else ''}可轉換 {done}、已最新跳過 {skipped}、無對應 webp {missing}")

if __name__ == '__main__':
    main()
