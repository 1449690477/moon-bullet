# 素材库未用资源盘点与 V3.17 接入说明

来源：`素材文件夹 一定优先使用！`  
对照：`assets/` + `index.html` 已加载路径

## 分类结论（严格区分）

| 类别 | 素材位置 | 未用规模 | 本次接入 | 暂缓 |
|------|----------|----------|----------|------|
| **弹幕** | `sprites_png/.../barragetexinfo/` | ~200/241 | **65** 张 → `assets/bullets_v3/` | 其余近色变体可继续扩 |
| **小怪** | `prefab_enemeymodel/texturemodel/` | 12 种非 big 变体 | **12** → `enemies_v2/` | `*_big` 与 `m2_*` 3D PBR |
| **Boss** | `source_avatar/enemy_big/` | ~42 立绘 | **5** 套 → `bosses/` | 其余可按关卡再扩 |
| **地图场景** | 见下方「场景更正」 | — | **15** 张已核对竖版真场景 | `fight/background` 横幅/UI **已撤销** |
| **云层** | `textures_png/cloud_map/` | 14 张全未用 | **9** 层视差 | 超大 11/12 可后补 |
| **技能/VFX** | `source_effect/tx_tex{,2,3}/` | ~477 | **12** 命中/刃光/水纹 | 粒子碎屑批量可后补 |
| **BGM** | 仅 FMOD `.fev` | — | **0** | 需解码后才能用 |

## 游戏内调用安排

1. **弹幕**：挂入 `BULLET_KEY` / `SPRITE_BULLETS_V2`，小怪与 Boss 的 `pickKind` 轮换使用新外形（刃/星/冰/糖果/月刃等）。
2. **小怪**：12 种新海洋怪写入 `ENEMY_DEFS`，并混入现有波次（不改 suiyi/migua 专属 pattern）。
3. **背景**：仅使用已核对竖版真场景（见下）；云层视差保留。
4. **Boss**：夜谕使 / 风暴收割者 / 晶母 / 深渊亲王 / 虚空海妖 → 主题弹幕 + Boss 池。
5. **VFX**：导入 `assets/vfx/extra/`，供后续命中/技能叠加（资源已就绪）。

## 场景更正（V3.17.1）

**错误来源（已删除）**：`sprites_png/source_home/fight/background/`  
该目录是关卡横幅 / 掉落 UI / Boss 头像（如「修斯之狱」「复仇者」），**不是**竖版战斗场景。强行 cover 到 720×1280 会糊糊成一团。

**正确来源（已目视确认）**：

| 输出文件 | 来源 |
|----------|------|
| `bg_scene_dark_hall.png` | `source_home/img_bg_youanmijing`（竖版 1080×1920） |
| `bg_scene_ember_cavern.png` 等 | `source_common/bg/*` 竖版插画 |
| `bg_scene_gothic_castle.png` 等 | `treasurelottery/bg_zhanxing*`、`activitylevel/img_myj_*` |
| `bg_scene_sky_*.png` | `prefab_scene/fightsceneprefab/scene1~3` 分层合成 |
| `bg_scene_abyss_core.png` | `source_common/bg/Img_shenyuan_boss_bg` |

**仍排除**：带大字标题的 CG（如 `midnightmap/1021`）、角色立绘底、UI banner、3D `*_col/*_nrm`。

## 复现导入

```bash
python3 tools/import_unused_assets_v3.py   # 弹幕/小怪/Boss/VFX（不再导入 fight/background）
python3 tools/import_verified_scenes.py    # 仅导入已核对场景
```
