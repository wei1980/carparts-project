#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""v2：改善黑底轉白底 — 保留包裝盒上的暗色設計元素
策略：只填「與邊緣相連且連通區域夠大」的暗色背景；邊界改用漸層羽化（暗→亮混合）避免鋸齒。
"""
import sys, os
from collections import deque
from PIL import Image

DIR = r"C:\carparts\carparts-api\media\parts\Intake\airfilter\KN"
THRESH = 40
DRY = '--dry' in sys.argv
ONLY = None
for a in sys.argv[1:]:
    if a.startswith('--only='):
        ONLY = a.split('=')[1]

def flood_mask(img):
    """回傳背景遮罩：與邊緣相連的暗色連通區域"""
    img = img.convert('RGB')
    w, h = img.size
    px = img.load()
    visited = [[False] * w for _ in range(h)]
    q = deque()

    def is_dark(x, y):
        r, g, b = px[x, y]
        return r <= THRESH and g <= THRESH and b <= THRESH

    for x in range(w):
        for y in (0, h - 1):
            if is_dark(x, y) and not visited[y][x]:
                visited[y][x] = True; q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_dark(x, y) and not visited[y][x]:
                visited[y][x] = True; q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx] and is_dark(nx, ny):
                visited[ny][nx] = True; q.append((nx, ny))
    return visited

def smooth_blend(img, mask):
    """邊緣羽化：遮罩邊界 2px 內做暗→白漸層混合，避免硬鋸齒"""
    px = img.load()
    w, h = img.size
    # 找遮罩邊界像素（mask=True 但鄰居有 False）
    border = []
    for y in range(h):
        for x in range(w):
            if not mask[y][x]:
                continue
            for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and not mask[ny][nx]:
                    border.append((x, y))
                    break
    # 邊界像素不填純白，改混 60% 白（保留一點原色過渡）
    for (x, y) in border:
        r, g, b = px[x, y]
        px[x, y] = (int(r * 0.4 + 255 * 0.6), int(g * 0.4 + 255 * 0.6), int(b * 0.4 + 255 * 0.6))
    # 非邊界的遮罩像素填純白
    for y in range(h):
        row = mask[y]
        for x in range(w):
            if row[x] and (x, y) not in set(border):
                px[x, y] = (255, 255, 255)
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
        corners = [px[0,0], px[w-1,0], px[0,h-1], px[w-1,h-1]]
        dark_corners = sum(1 for c in corners if all(v <= 60 for v in c))
        if dark_corners < 3:
            continue  # 已是白底或非黑底
        print(f"{'[dry] ' if DRY else ''}{fn} (暗角 {dark_corners}/4)", end='')
        if DRY:
            print(" → 需重處理")
            changed += 1
            continue
        mask = flood_mask(rgb)
        out = smooth_blend(rgb, mask)
        if fn.lower().endswith('.webp'):
            out.save(path, 'WEBP', quality=92)
        elif fn.lower().endswith('.png'):
            out.save(path, 'PNG')
        else:
            out.save(path, 'JPEG', quality=92)
        print(" → 完成")
        changed += 1
    print(f"\n共 {changed} 張{'需處理' if DRY else '已處理'}")

if __name__ == '__main__':
    main()
