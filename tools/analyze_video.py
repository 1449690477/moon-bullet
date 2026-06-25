#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""用 OpenCV 分析视频帧：检测月球大招(大型红/暗圆团块)、蓝色弹幕密度、整体配色。"""
import os, cv2, numpy as np
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frames')
out = []
files = sorted(f for f in os.listdir(D) if f.endswith('.png'))
for fn in files:
    img = cv2.imread(os.path.join(D, fn))  # BGR
    if img is None: continue
    h, w = img.shape[:2]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    b, g, r = img[:,:,0].mean(), img[:,:,1].mean(), img[:,:,2].mean()
    # 红色月球：高R低G低B + 在上半部成大块
    red_mask = ((img[:,:,2] > 90) & (img[:,:,1] < 80) & (img[:,:,0] < 90)).astype(np.uint8)
    upper = red_mask[:h//2, :]
    red_ratio = upper.mean()
    # 检测最大红色轮廓面积（月球）
    cnts,_ = cv2.findContours(red_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    moon_area = max((cv2.contourArea(c) for c in cnts), default=0) / (w*h)
    # 蓝色弹幕：高B高G低R 的亮点
    blue_mask = ((img[:,:,0] > 150) & (img[:,:,1] > 120) & (img[:,:,2] < 160)).astype(np.uint8)
    blue_ratio = blue_mask.mean()
    # 亮度
    bright = img.mean()
    out.append((fn, b, g, r, red_ratio, moon_area, blue_ratio, bright))

# 找月球大招帧（moon_area 大）
out_sorted_moon = sorted(out, key=lambda x: -x[5])[:8]
print('=== 疑似月球大招帧（最大红色团块占比）===')
for o in out_sorted_moon:
    t = int(o[0].split('_')[1].split('.')[0]) * 5
    print(f'  {o[0]} (~{t}s)  moonArea={o[5]:.3f} redUpper={o[4]:.3f} bright={o[7]:.0f}')
# 蓝弹密集帧
out_sorted_blue = sorted(out, key=lambda x: -x[6])[:6]
print('=== 蓝色弹幕最密帧 ===')
for o in out_sorted_blue:
    t = int(o[0].split('_')[1].split('.')[0]) * 5
    print(f'  {o[0]} (~{t}s)  blue={o[6]:.3f}')
# 整体配色
arr = np.array([(o[1],o[2],o[3]) for o in out])
print(f'=== 全片平均色 BGR = {arr.mean(0).astype(int)}  (偏暗紫红/蓝绿背景) ===')
print(f'总帧 {len(out)}  时长~{len(out)*5}s')
