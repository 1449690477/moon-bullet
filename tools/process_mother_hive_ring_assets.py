# -*- coding: utf-8 -*-
"""Extract and clean Mother Hive Ring companion assets.

The supplied source sheets are concept/runtime sheets with transparent alpha
and green-screen fringe. This script crops the reusable pieces, removes green
spill, trims empty pixels, constrains dimensions, validates residual key color,
and writes preview contact sheets.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageOps
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "生命之母僚机开发"
OUT = ROOT / "assets" / "companions" / "mother_hive_ring"


ASSETS: dict[str, tuple[str, tuple[int, int, int, int], int]] = {
    # Ship / decorative body parts
    "ship/body_normal.png": ("僚机本体贴图2.png", (12, 2, 467, 392), 360),
    "ship/body_berserk.png": ("僚机外形主体素材贴图.png", (18, 6, 573, 522), 420),
    "ship/core_cocoon.png": ("僚机外形主体素材贴图.png", (49, 498, 215, 795), 220),
    "ship/ring_upper.png": ("僚机本体贴图2.png", (1149, 29, 1446, 169), 340),
    "ship/ring_middle.png": ("僚机外形主体素材贴图.png", (242, 669, 582, 822), 360),
    "ship/wing_left.png": ("僚机本体贴图2.png", (58, 362, 170, 554), 220),
    "ship/wing_right.png": ("僚机本体贴图2.png", (209, 362, 320, 554), 220),
    "ship/pendant.png": ("僚机外形主体素材贴图.png", (919, 829, 980, 1018), 180),
    "ship/ribbon_deco.png": ("僚机本体贴图2.png", (346, 382, 538, 449), 240),
    "ship/icon_wingman.png": ("僚机本体贴图2.png", (864, 75, 1112, 293), 256),

    # Normal bullets
    "bullets_normal/crystal_seed.png": ("弹幕素材贴图.png", (63, 58, 116, 191), 112),
    "bullets_normal/crystal_seed_small.png": ("弹幕素材贴图.png", (174, 83, 218, 189), 96),
    "bullets_normal/petal.png": ("弹幕素材贴图.png", (642, 78, 690, 192), 112),
    "bullets_normal/petal_curve.png": ("弹幕素材贴图.png", (741, 92, 814, 190), 128),
    "bullets_normal/butterfly.png": ("弹幕素材贴图.png", (57, 243, 125, 319), 112),
    "bullets_normal/butterfly_small.png": ("弹幕素材贴图.png", (167, 261, 218, 318), 92),
    "bullets_normal/arc_ribbon.png": ("弹幕素材贴图.png", (50, 369, 206, 486), 192),
    "bullets_normal/hit_bloom.png": ("弹幕素材贴图.png", (32, 630, 166, 801), 180),

    # Berserk bullets / fields
    "bullets_berserk/butterfly_swarm.png": ("暴走特效 暴走弹幕贴图.png", (917, 308, 1005, 427), 128),
    "bullets_berserk/petal_ring.png": ("暴走特效 暴走弹幕贴图.png", (33, 291, 237, 432), 240),
    "bullets_berserk/crystal_wave.png": ("暴走特效 暴走弹幕贴图.png", (37, 470, 341, 622), 300),
    "bullets_berserk/arc_wave.png": ("暴走特效 暴走弹幕贴图.png", (376, 464, 702, 633), 320),
    "bullets_berserk/flower_star.png": ("暴走特效 暴走弹幕贴图.png", (963, 22, 1114, 106), 180),
    "bullets_berserk/field_ring.png": ("暴走特效 暴走弹幕贴图.png", (461, 272, 650, 448), 240),
    "bullets_berserk/burst.png": ("暴走特效 暴走弹幕贴图.png", (459, 865, 651, 1057), 240),

    # Purify skill pieces
    "skill_purify/ring_inner.png": ("大招需要用的贴图.png", (242, 255, 418, 358), 240),
    "skill_purify/ring_outer.png": ("大招需要用的贴图.png", (16, 253, 226, 367), 280),
    "skill_purify/life_egg.png": ("大招需要用的贴图.png", (178, 383, 262, 502), 120),
    "skill_purify/life_egg_open.png": ("大招需要用的贴图.png", (279, 383, 370, 503), 128),
    "skill_purify/hatch_butterfly.png": ("大招需要用的贴图.png", (933, 379, 1050, 506), 150),
    "skill_purify/absorb_orb.png": ("大招需要用的贴图.png", (413, 603, 574, 681), 180),
    "skill_purify/hatch_flash.png": ("大招需要用的贴图.png", (1184, 10, 1482, 233), 260),

    # Ultimate link pieces
    "ultimate_link/hive_ring.png": ("大招需要用的贴图.png", (707, 20, 950, 243), 300),
    "ultimate_link/domain_overlay.png": ("大招需要用的贴图.png", (607, 822, 1046, 1028), 420),
    "ultimate_link/butterfly_light.png": ("大招需要用的贴图.png", (1073, 381, 1221, 525), 160),
    "ultimate_link/final_butterfly_burst.png": ("大招需要用的贴图.png", (1043, 825, 1242, 1029), 260),
    "ultimate_link/final_ring_burst.png": ("大招需要用的贴图.png", (1247, 840, 1483, 1017), 260),
    "ultimate_link/front_flower_bud.png": ("蝴蝶弹幕 大招素材贴图3.png", (180, 185, 255, 292), 140),
    "ultimate_link/front_flower_open_01.png": ("蝴蝶弹幕 大招素材贴图3.png", (1040, 185, 1172, 296), 180),
    "ultimate_link/front_flower_open_02.png": ("蝴蝶弹幕 大招素材贴图3.png", (35, 315, 225, 445), 220),
    "ultimate_link/front_flower_open_03.png": ("蝴蝶弹幕 大招素材贴图3.png", (438, 315, 628, 455), 240),
    "ultimate_link/front_flower_overload.png": ("蝴蝶弹幕 大招素材贴图3.png", (250, 575, 450, 725), 260),
    "ultimate_link/front_flower_burst.png": ("蝴蝶弹幕 大招素材贴图3.png", (460, 575, 675, 735), 280),

    # Small particles
    "particles/petal_small.png": ("大招需要用的贴图.png", (25, 384, 91, 494), 90),
    "particles/crystal_dust.png": ("大招需要用的贴图.png", (514, 836, 605, 1016), 120),
    "particles/star_white.png": ("暴走特效 暴走弹幕贴图.png", (1333, 29, 1421, 165), 120),
    "particles/soft_glow.png": ("弹幕素材贴图.png", (543, 672, 669, 798), 160),
}


def clean_rgba(image: Image.Image) -> Image.Image:
    src = np.asarray(image.convert("RGBA")).astype(np.float32)
    out = src.copy()
    r, g, b, alpha = (src[..., i] for i in range(4))
    max_rb = np.maximum(r, b)
    min_rb = np.minimum(r, b)

    green_excess = g - max_rb
    hard_key = (
        (alpha > 0)
        & (g > 70)
        & (green_excess > 8)
        & (g > r * 1.03)
        & (g > b * 1.03)
        & (min_rb < 225)
    )
    expanded = ndimage.binary_dilation(hard_key, iterations=3)
    matte = ndimage.gaussian_filter(expanded.astype(np.float32), sigma=0.62)
    out[..., 3] = alpha * (1.0 - np.clip(matte, 0.0, 1.0))

    spill = np.clip((green_excess - 2.0) / 48.0, 0.0, 1.0)
    out[..., 0] = np.clip(r + spill * 32.0, 0, 255)
    out[..., 1] = np.minimum(g, max_rb + 5.0)
    out[..., 2] = np.clip(b + spill * 26.0, 0, 255)

    # Remove tiny floating key-colored dust specks.
    alive = out[..., 3] > 5
    labels, count = ndimage.label(alive)
    if count:
        sizes = np.bincount(labels.ravel())
        remove = sizes < 7
        remove[0] = False
        out[..., 3][remove[labels]] = 0
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


V3_ASSETS: dict[str, tuple[str, tuple[int, int, int, int], int]] = {
    # V3 ultimate link: front crystal flower body. Use these as central body only.
    "ultimate_link/v3_flower_bud.png": ("大招优化用花朵.png", (20, 34, 198, 474), 230),
    "ultimate_link/v3_flower_open_01.png": ("大招优化用花朵.png", (228, 18, 472, 486), 270),
    "ultimate_link/v3_flower_open_02.png": ("大招优化用花朵.png", (486, 18, 770, 486), 310),
    "ultimate_link/v3_flower_overload.png": ("大招优化用花朵.png", (792, 18, 1038, 486), 300),
    "ultimate_link/v3_flower_burst.png": ("大招优化用花朵.png", (1060, 18, 1390, 486), 340),

    # V3 final butterflies: clear body sprites, drawn source-over in game.
    "ultimate_link/v3_butterfly_fly_01.png": ("V3版本修改 大招的蝴蝶弹幕飞出和蝴蝶拖尾.png", (38, 44, 320, 340), 210),
    "ultimate_link/v3_butterfly_fly_02.png": ("V3版本修改 大招的蝴蝶弹幕飞出和蝴蝶拖尾.png", (336, 46, 604, 344), 210),
    "ultimate_link/v3_butterfly_fly_03.png": ("V3版本修改 大招的蝴蝶弹幕飞出和蝴蝶拖尾.png", (690, 34, 926, 342), 200),
    "ultimate_link/v3_butterfly_fly_04.png": ("V3版本修改 大招的蝴蝶弹幕飞出和蝴蝶拖尾.png", (944, 42, 1182, 338), 200),
    "ultimate_link/v3_butterfly_hit.png": ("V3版本修改 大招的蝴蝶弹幕飞出和蝴蝶拖尾.png", (760, 410, 1105, 668), 190),
    "ultimate_link/v3_butterfly_spawn.png": ("V3版本修改 大招的蝴蝶弹幕飞出和蝴蝶拖尾.png", (1150, 420, 1414, 660), 190),

    # V3 auxiliary material only. The absorb vortex itself is code-drawn.
    "ultimate_link/v3_butterfly_trail_01.png": ("V3版本修改 大招的蝴蝶弹幕飞出和蝴蝶拖尾.png", (28, 704, 682, 824), 320),
    "ultimate_link/v3_butterfly_trail_02.png": ("V3版本修改 大招的蝴蝶弹幕飞出和蝴蝶拖尾.png", (724, 702, 1410, 812), 320),
    "ultimate_link/v3_butterfly_trail_03.png": ("V3版本修改 大招的蝴蝶弹幕飞出和蝴蝶拖尾.png", (990, 888, 1440, 1064), 320),
    "ultimate_link/v3_ribbon_trail_long.png": ("V3版本修改 大招的蝴蝶弹幕飞出和蝴蝶拖尾.png", (24, 680, 666, 812), 520),
    "ultimate_link/v3_ribbon_trail_loop.png": ("V3版本修改 大招的蝴蝶弹幕飞出和蝴蝶拖尾.png", (724, 702, 1412, 824), 420),
    "ultimate_link/v3_vortex_ring_band.png": ("v3大招漩涡 蝴蝶拖尾 和 可以给大招状态下僚机用的更细节的皇冠贴图.png", (8, 26, 590, 354), 520),
    "ultimate_link/v3_vortex_curl_band.png": ("v3大招漩涡 蝴蝶拖尾 和 可以给大招状态下僚机用的更细节的皇冠贴图.png", (578, 38, 984, 366), 430),
    "ultimate_link/v3_head_crown.png": ("大招 大皇冠 贴图 链接飘带素材.png", (1180, 70, 1312, 260), 150),
    "ultimate_link/v3_vortex_shard.png": ("v3大招漩涡 蝴蝶拖尾 和 可以给大招状态下僚机用的更细节的皇冠贴图.png", (504, 410, 620, 548), 120),
    "ultimate_link/v3_energy_dot.png": ("大招优化用 漩涡 蝴蝶拖尾.png", (46, 886, 160, 1038), 110),
    "ultimate_link/v3_stream_spark.png": ("大招优化用 粒子特效等.png", (38, 72, 170, 210), 110),
    "ultimate_link/v3_crystal_shard.png": ("大招优化用 粒子特效等.png", (705, 56, 840, 210), 110),
}


BLACK_HOLE_VORTEX_ASSETS: dict[str, tuple[str, tuple[int, int, int, int], int]] = {
    # V5 black-hole runtime assets. These pieces are required runtime sprites,
    # not references: the absorb field uses them as the visible vortex body.
    "ultimate_link/mhr_bh_disk_01.png": ("黑洞优化专用贴图/黑洞漩涡素材.png", (0, 18, 606, 332), 540),
    "ultimate_link/mhr_bh_disk_02.png": ("黑洞优化专用贴图/黑洞漩涡素材.png", (620, 18, 1254, 326), 560),
    "ultimate_link/mhr_bh_disk_03.png": ("黑洞优化专用贴图/黑洞中心.png", (8, 48, 452, 438), 430),
    "ultimate_link/mhr_bh_arm_01.png": ("黑洞优化专用贴图/黑洞漩涡素材.png", (34, 38, 596, 156), 460),
    "ultimate_link/mhr_bh_arm_02.png": ("黑洞优化专用贴图/黑洞漩涡素材.png", (676, 44, 1254, 180), 480),
    "ultimate_link/mhr_bh_arm_03.png": ("黑洞优化专用贴图/黑洞漩涡素材.png", (0, 382, 648, 566), 480),
    "ultimate_link/mhr_bh_arm_04.png": ("黑洞优化专用贴图/黑洞漩涡素材.png", (704, 340, 1248, 504), 460),
    "ultimate_link/mhr_bh_swirl_fragment_01.png": ("黑洞优化专用贴图/黑洞漩涡素材.png", (38, 640, 612, 806), 440),
    "ultimate_link/mhr_bh_swirl_fragment_02.png": ("黑洞优化专用贴图/黑洞漩涡素材.png", (692, 676, 1248, 820), 440),
    "ultimate_link/mhr_bh_core_01.png": ("黑洞优化专用贴图/黑洞中心.png", (8, 48, 452, 438), 320),
    "ultimate_link/mhr_bh_core_02.png": ("黑洞优化专用贴图/黑洞中心.png", (24, 888, 446, 1220), 300),
    "ultimate_link/mhr_bh_inner_ring_01.png": ("黑洞优化专用贴图/黑洞中心.png", (18, 548, 454, 796), 360),
    "ultimate_link/mhr_bh_center_glow_01.png": ("黑洞优化专用贴图/黑洞中心.png", (744, 896, 1228, 1234), 330),
    "ultimate_link/mhr_bh_burst_01.png": ("黑洞优化专用贴图/蝴蝶拖尾 黑洞爆发素材.png", (6, 42, 558, 354), 420),
    "ultimate_link/mhr_bh_burst_02.png": ("黑洞优化专用贴图/蝴蝶拖尾 黑洞爆发素材.png", (650, 330, 1240, 656), 430),
    "ultimate_link/mhr_butterfly_trail_01.png": ("黑洞优化专用贴图/黑洞中心.png", (810, 44, 1238, 426), 360),
    "ultimate_link/mhr_butterfly_trail_02.png": ("黑洞优化专用贴图/蝴蝶拖尾 黑洞爆发素材.png", (654, 686, 1238, 954), 420),
    "ultimate_link/mhr_butterfly_trail_fragment_01.png": ("黑洞优化专用贴图/蝴蝶拖尾 黑洞爆发素材.png", (12, 1018, 704, 1242), 420),

}


NEW_FORM = "黑洞优化专用贴图/大招优化结束后 新的后续项目：僚机稍微改一下的新形态"
NEW_FORM_ASSETS: dict[str, tuple[str, tuple[int, int, int, int], int]] = {
    # V2 crystal emitter weapon layer. The source sheets keep green-screen
    # separation lines, so each runtime piece is cropped and cleaned here.
    "emitters/mhr_emitter_crystal_01.png": (f"{NEW_FORM}/新僚机新外形贴图和细节部分.png", (211, 523, 385, 778), 150),
    "emitters/mhr_emitter_crystal_02.png": (f"{NEW_FORM}/新僚机新外形贴图和细节部分.png", (559, 554, 737, 792), 150),
    "emitters/mhr_emitter_crystal_03.png": (f"{NEW_FORM}/新僚机新外形贴图和细节部分.png", (899, 544, 1085, 781), 150),
    "emitters/mhr_emitter_crystal_berserk_01.png": (f"{NEW_FORM}/粒子特效命中特效等素材.png", (274, 770, 429, 1042), 170),
    "emitters/mhr_emitter_crystal_berserk_02.png": (f"{NEW_FORM}/粒子特效命中特效等素材.png", (580, 832, 808, 1044), 190),
    "emitters/mhr_emitter_glow.png": (f"{NEW_FORM}/粒子特效命中特效等素材.png", (812, 844, 1077, 1052), 220),
    "emitters/mhr_emitter_charge.png": (f"{NEW_FORM}/粒子特效命中特效等素材.png", (686, 683, 1130, 832), 260),
    "emitters/mhr_emitter_muzzle_flash.png": (f"{NEW_FORM}/新僚机发射出去的 弹幕贴图 前段的发射台晶体 弹幕拖尾 命中特效.png", (246, 891, 369, 999), 120),

    "bullets/mhr_lace_spike_normal_01.png": (f"{NEW_FORM}/新僚机发射出去的 弹幕贴图 前段的发射台晶体 弹幕拖尾 命中特效.png", (60, 193, 122, 295), 86),
    "bullets/mhr_lace_spike_normal_02.png": (f"{NEW_FORM}/新僚机发射出去的 弹幕贴图 前段的发射台晶体 弹幕拖尾 命中特效.png", (209, 138, 307, 297), 110),
    "bullets/mhr_lace_spike_normal_03.png": (f"{NEW_FORM}/新僚机发射出去的 弹幕贴图 前段的发射台晶体 弹幕拖尾 命中特效.png", (411, 76, 558, 313), 140),
    "bullets/mhr_lace_spike_berserk_01.png": (f"{NEW_FORM}/新僚机发射出去的 弹幕贴图 前段的发射台晶体 弹幕拖尾 命中特效.png", (684, 18, 870, 335), 170),
    "bullets/mhr_lace_spike_berserk_02.png": (f"{NEW_FORM}/新僚机发射出去的 弹幕贴图 前段的发射台晶体 弹幕拖尾 命中特效.png", (960, 50, 1130, 324), 170),
    "bullets/mhr_lace_spike_berserk_03.png": (f"{NEW_FORM}/新僚机发射出去的 弹幕贴图 前段的发射台晶体 弹幕拖尾 命中特效.png", (1208, 51, 1383, 335), 170),
    "bullets/mhr_spike_core_glow.png": (f"{NEW_FORM}/命中特效 爆炸光点.png", (826, 93, 1017, 270), 150),
    "bullets/mhr_spike_edge_glow.png": (f"{NEW_FORM}/命中特效 爆炸光点.png", (1123, 61, 1357, 273), 180),

    "trails/mhr_ribbon_trail_soft.png": (f"{NEW_FORM}/新僚机发射出去的 弹幕贴图 前段的发射台晶体 弹幕拖尾 命中特效.png", (34, 557, 543, 611), 360),
    "trails/mhr_ribbon_trail_core.png": (f"{NEW_FORM}/新僚机发射出去的 弹幕贴图 前段的发射台晶体 弹幕拖尾 命中特效.png", (607, 554, 991, 623), 320),
    "trails/mhr_ribbon_trail_gold_dot.png": (f"{NEW_FORM}/新僚机发射出去的 弹幕贴图 前段的发射台晶体 弹幕拖尾 命中特效.png", (1079, 556, 1290, 589), 180),
    "trails/mhr_ribbon_flow_particle.png": (f"{NEW_FORM}/新僚机发射出去的 弹幕贴图 前段的发射台晶体 弹幕拖尾 命中特效.png", (1077, 618, 1274, 652), 180),

    "marks/mhr_life_mark_core.png": (f"{NEW_FORM}/命中特效 爆炸光点.png", (1117, 364, 1297, 532), 170),
    "marks/mhr_life_mark_glow.png": (f"{NEW_FORM}/命中特效 爆炸光点.png", (433, 371, 740, 532), 220),
    "marks/mhr_life_mark_stack_ring.png": (f"{NEW_FORM}/粒子特效命中特效等素材.png", (403, 724, 670, 816), 220),
    "marks/mhr_life_mark_explosion_core.png": (f"{NEW_FORM}/新僚机发射出去的 弹幕贴图 前段的发射台晶体 弹幕拖尾 命中特效.png", (690, 822, 965, 1039), 230),
    "marks/mhr_life_mark_explosion_ring.png": (f"{NEW_FORM}/新僚机发射出去的 弹幕贴图 前段的发射台晶体 弹幕拖尾 命中特效.png", (1028, 766, 1404, 1057), 260),
    "marks/mhr_life_mark_crystal_shards.png": (f"{NEW_FORM}/命中特效 爆炸光点.png", (1090, 678, 1418, 1038), 260),
    "marks/mhr_life_mark_petal_burst.png": (f"{NEW_FORM}/命中特效 爆炸光点.png", (583, 135, 723, 270), 150),

    "hit_effects/mhr_spike_hit_flash.png": (f"{NEW_FORM}/新僚机发射出去的 弹幕贴图 前段的发射台晶体 弹幕拖尾 命中特效.png", (64, 908, 159, 977), 100),
    "hit_effects/mhr_spike_hit_spark.png": (f"{NEW_FORM}/新僚机发射出去的 弹幕贴图 前段的发射台晶体 弹幕拖尾 命中特效.png", (246, 891, 369, 999), 120),
    "hit_effects/mhr_spike_hit_petal.png": (f"{NEW_FORM}/命中特效 爆炸光点.png", (56, 182, 298, 232), 170),
    "hit_effects/mhr_spike_hit_crystal.png": (f"{NEW_FORM}/命中特效 爆炸光点.png", (36, 421, 373, 503), 210),

    "particles/mhr_particle_petal_big.png": (f"{NEW_FORM}/命中特效 爆炸光点.png", (863, 443, 1006, 504), 120),
    "particles/mhr_particle_star_pink.png": (f"{NEW_FORM}/命中特效 爆炸光点.png", (384, 170, 489, 240), 100),
    "particles/mhr_particle_star_gold.png": (f"{NEW_FORM}/粒子特效命中特效等素材.png", (1172, 721, 1210, 759), 60),
    "particles/mhr_particle_soft_glow.png": (f"{NEW_FORM}/命中特效 爆炸光点.png", (384, 170, 489, 240), 120),
}


def trim(image: Image.Image, pad: int = 8) -> Image.Image:
    alpha = np.asarray(image.getchannel("A"))
    ys, xs = np.where(alpha > 8)
    if len(xs) == 0:
        return image
    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(image.width, int(xs.max()) + pad + 1)
    y1 = min(image.height, int(ys.max()) + pad + 1)
    return image.crop((x0, y0, x1, y1))


def polish(image: Image.Image, rel: str) -> Image.Image:
    alpha = image.getchannel("A")
    rgb = image.convert("RGB")
    if rel.startswith("ship/"):
        rgb = ImageEnhance.Contrast(rgb).enhance(1.08)
        rgb = ImageEnhance.Color(rgb).enhance(1.16)
        rgb = ImageEnhance.Sharpness(rgb).enhance(1.12)
    elif rel.startswith("bullets_berserk/"):
        rgb = ImageEnhance.Contrast(rgb).enhance(1.1)
        rgb = ImageEnhance.Color(rgb).enhance(1.22)
    else:
        rgb = ImageEnhance.Contrast(rgb).enhance(1.05)
    result = rgb.convert("RGBA")
    result.putalpha(alpha)
    return result


def save_asset(rel: str, sheet: str, box: tuple[int, int, int, int], max_dim: int) -> Image.Image:
    source = Image.open(SRC / sheet).convert("RGBA")
    image = clean_rgba(source.crop(box))
    image = trim(image)
    image = ImageOps.expand(image, border=6, fill=(0, 0, 0, 0))
    image = polish(image, rel)
    if max(image.size) > max_dim:
        scale = max_dim / max(image.size)
        image = image.resize(
            (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
            Image.Resampling.LANCZOS,
        )
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, optimize=True)
    print(f"{rel}: {image.width}x{image.height}")
    return image


def residual_green_ratio(image: Image.Image) -> float:
    data = np.asarray(image.convert("RGBA"))
    r, g, b, alpha = (data[..., i].astype(np.float32) for i in range(4))
    visible = alpha > 14
    green = visible & (g > 72) & (g > r * 1.13) & (g > b * 1.13)
    return float(green.sum() / max(1, int(visible.sum())))


def validate_asset(rel: str, image: Image.Image) -> None:
    ratio = residual_green_ratio(image)
    if ratio >= 0.001:
        raise RuntimeError(f"{rel}: residual green {ratio:.3%} exceeds 0.1%")
    alpha = np.asarray(image.getchannel("A"))
    border = np.concatenate((alpha[0], alpha[-1], alpha[:, 0], alpha[:, -1]))
    if np.mean(border > 8) > 0.02:
        raise RuntimeError(f"{rel}: non-transparent border suggests clipped crop")


def contact_sheets() -> None:
    files = sorted(path for path in OUT.rglob("*.png") if not path.name.startswith("asset_preview_"))
    tile = 160
    cols = 6
    rows = (len(files) + cols - 1) // cols
    backgrounds = {
        "black": (8, 7, 12),
        "white": (246, 244, 247),
        "checker": None,
    }
    for label, color in backgrounds.items():
        sheet = Image.new("RGB", (cols * tile, rows * (tile + 28)), color or (36, 36, 42))
        draw = ImageDraw.Draw(sheet)
        if color is None:
            cell = 16
            for y in range(0, sheet.height, cell):
                for x in range(0, sheet.width, cell):
                    shade = 66 if ((x // cell) + (y // cell)) % 2 else 38
                    draw.rectangle((x, y, x + cell, y + cell), fill=(shade, shade, shade))
        for i, path in enumerate(files):
            image = Image.open(path).convert("RGBA")
            preview = image.copy()
            preview.thumbnail((tile - 14, tile - 14), Image.Resampling.LANCZOS)
            x = i % cols * tile + (tile - preview.width) // 2
            y = i // cols * (tile + 28) + (tile - preview.height) // 2
            sheet.paste(preview, (x, y), preview)
            text = path.relative_to(OUT).as_posix()[-26:]
            draw.text(
                (i % cols * tile + 5, i // cols * (tile + 28) + tile + 2),
                text,
                fill=(225, 225, 225) if label != "white" else (35, 35, 35),
            )
        sheet.save(OUT / f"asset_preview_{label}.png", optimize=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    built = {}
    for rel, spec in {**ASSETS, **V3_ASSETS, **BLACK_HOLE_VORTEX_ASSETS, **NEW_FORM_ASSETS}.items():
        built[rel] = save_asset(rel, *spec)
        validate_asset(rel, built[rel])
    contact_sheets()
    print("\nDONE.")


if __name__ == "__main__":
    main()
