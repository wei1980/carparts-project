#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""KN 空濾黑底圖 → 白底轉換（洪水填充：只換與邊緣相連的暗色背景，保留商品本體）"""
import sys, os
from collections import deque
from PIL import Image

DIR = r"C:\carparts\carparts-api\media\parts\Intake\airfilter\KN"
THRESH = 40          # RGB 全部 <= 40 視為背景暗色
TOLERANCE = 12       # 洪水填充相鄰像素容差
DRY = '--dry' in sys.argv
ONLY = None
for a in sys.argv[1:]:
    if a.startswith('--only='):
        ONLY = a.split('=')[1]

def flood_to_white(img):
    """從四邊緣所有暗色像素起點做 BFS，把連通暗區改為白色"""
    img = img.convert('RGB')
    w, h = img.size
    px = img.load()
    visited = [[False] * w for _ in range(h)]
    q = deque()

    def is_dark(x, y):
        r, g, b = px[x, y]
        return r <= THRESH and g <= THRESH and b <= THRESH

    # 邊緣起點
    for x in range(w):
        for y in (0, h - 1):
            if is_dark(x, y) and not visited[y][x]:
                visited[y][x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_dark(x, y) and not visited[y][x]:
                visited[y][x] = True
                q.append((x, y))

    # BFS：容差內的相鄰暗色都算背景
    while q:
        x, y = q.popleft()
        px[x, y] = (255, 255, 255)
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                r, g, b = px[nx, ny]
                pr, pg, pb = px[x, y]
                # 與已填白前的原暗色比較（用容差判斷連續性）：直接檢查是否暗色
                if is_dark(nx, ny):
                    visited[ny][nx] = True
                    q.append((nx, ny))

    return img

def main():
    files = sorted(f for f in os.listdir(DIR) if f.lower().endswith(('.png', '.webp', '.jpg', '.jpeg')))
    if ONLY:
        files = [f for f in files if ONLY.lower() in f.lower()]
    changed = 0
    for fn in files:
        path = os.path.join(DIR, fn)
        try:
            img = Image.open(path)
        except Exception as e:
            print(f"SKIP {fn}: {e}")
            continue
        rgb = img.convert('RGB')
        w, h = rgb.size
        px = rgb.load()
        # 偵測：四角 + 邊緣中點是否為暗色
        corners = [px[0,0], px[w-1,0], px[0,h-1], px[w-1,h-1]]
        dark_corners = sum(1 for c in corners if all(v <= THRESH for v in c))
        if dark_corners < 3:
            continue  # 背景不是黑底，跳過
        print(f"{'[dry] ' if DRY else ''}黑底偵測: {fn} (暗角 {dark_corners}/4, {w}x{h})", end='')
        if DRY:
            print(" → 需轉白底")
            changed += 1
            continue
        out = flood_to_white(rgb)
        # 存回（webp 品質 90）
        if fn.lower().endswith('.webp'):
            out.save(path, 'WEBP', quality=90)
        elif fn.lower().endswith('.png'):
            out.save(path, 'PNG')
        else:
            out.save(path, 'JPEG', quality=90)
        print(" → 已轉白底")
        changed += 1
    print(f"\n共 {changed} 張{'需轉換' if DRY else '已轉換'}")

if __name__ == '__main__':
    main()
