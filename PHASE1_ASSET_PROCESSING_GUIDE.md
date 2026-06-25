# 阶段1：素材处理操作指南
# Phase 1: Asset Processing Guide

**开始日期**: 2026-06-19  
**预计完成**: 第1-2周  
**目标**: 处理并导入第一批新素材（10敌人 + 5Boss + 5背景 + 50弹幕）

---

## 📋 任务清单

### Week 1: 素材选择与提取

- [ ] Task 1.1: 提取10个小怪素材
- [ ] Task 1.2: 提取5个Boss素材  
- [ ] Task 1.3: 提取5个背景素材
- [ ] Task 1.4: 提取50个弹幕素材
- [ ] Task 1.5: 创建素材处理脚本

### Week 2: 素材处理与集成

- [ ] Task 2.1: 批量处理小怪素材
- [ ] Task 2.2: 批量处理Boss素材
- [ ] Task 2.3: 批量处理背景素材
- [ ] Task 2.4: 批量处理弹幕素材
- [ ] Task 2.5: 更新asset_manifest.json

---

## 一、素材选择详表

### 1.1 小怪素材选择（10个）

| 类型 | 原始ID | 新名称 | 用途 | 文件路径 |
|------|--------|--------|------|----------|
| **基础敌人** ||||
| 1 | body_10100007 | phantom | 替代bat | `素材/sprites_png/source_avatar/enemy/body_10100007/` |
| 2 | body_10100009 | shade | 替代familiar | `素材/sprites_png/source_avatar/enemy/body_10100009/` |
| 3 | body_10101008 | specter | 新基础敌人 | `素材/sprites_png/source_avatar/enemy/body_10101008/` |
| **中级敌人** ||||
| 4 | body_10102002 | wraith | 替代nun | `素材/sprites_png/source_avatar/enemy/body_10102002/` |
| 5 | body_10102009 | revenant | 替代wisp | `素材/sprites_png/source_avatar/enemy/body_10102009/` |
| 6 | body_10103001 | banshee | 新中级敌人 | `素材/sprites_png/source_avatar/enemy/body_10103001/` |
| **精英敌人** ||||
| 7 | body_10104010 | shadowfiend | 替代cherub | `素材/sprites_png/source_avatar/enemy/body_10104010/` |
| 8 | body_10104020 | voidminion | 替代seraphguard | `素材/sprites_png/source_avatar/enemy/body_10104020/` |
| **Boss级小怪** ||||
| 9 | body_10105008 | abyssalcreature | 替代warden | `素材/sprites_png/source_avatar/enemy/body_10105008/` |
| 10 | body_10105020 | darklord | 新Boss级小怪 | `素材/sprites_png/source_avatar/enemy/body_10105020/` |

---

### 1.2 Boss素材选择（5个）

| 编号 | 原始ID | Boss名称 | 中文名 | 使用关卡 | 文件路径 |
|------|--------|---------|--------|----------|----------|
| 1 | body_10103008 | voidkeeper | 虚空守卫 · 格雷厄姆 | Stage 2-3 | `素材/sprites_png/source_avatar/enemy_big/body_10103008/` |
| 2 | body_10103030 | shadowlord | 暗影领主 · 莫洛克 | Stage 3-4 | `素材/sprites_png/source_avatar/enemy_big/body_10103030/` |
| 3 | body_10104010 | abyssalking | 深渊魔王 · 贝尔芬格 | Stage 4-5 | `素材/sprites_png/source_avatar/enemy_big/body_10104010/` |
| 4 | body_10105020 | voidgod | 虚无之神 · 纳亚拉托提普 | Stage 5-6 | `素材/sprites_png/source_avatar/enemy_big/body_10105020/` |
| 5 | body_11003001 | ancientevil | 古老邪神 · 阿撒托斯 | Stage 6终Boss | `素材/sprites_png/source_avatar/enemy_big/body_11003001/` |

**对应Boss名牌**:
- 10110788 → voidkeeper
- 10110789 → shadowlord
- 10110790 → abyssalking
- 10110791 → voidgod
- 10110792 → ancientevil

---

### 1.3 背景素材选择（5个）

| 编号 | 原始路径 | 新名称 | 使用场景 | 主题 |
|------|---------|--------|----------|------|
| 1 | background/1/ | bg_void_realm | Stage 1-2 | 虚空领域 |
| 2 | background/3/ | bg_shadow_depths | Stage 3-4 | 暗影深渊 |
| 3 | background/5/ | bg_abyss_core | Stage 5-6 | 深渊核心 |
| 4 | background/7_1/ | bg_chaos_rift | Stage 7-8 | 混沌裂隙 |
| 5 | img_yitiao_boss_1/ | bg_boss_arena | Boss战专用 | Boss战斗场 |

---

### 1.4 弹幕素材选择（50个）

#### 基础形状系列（10个）

| 编号 | 原始文件名 | 新名称 | 描述 |
|------|-----------|--------|------|
| 1 | 1001_N__Sprite.png | bullet_orb_basic | 基础圆形弹 |
| 2 | 1003_N__Sprite.png | bullet_needle_blue | 蓝色针弹 |
| 3 | 1006_N__Sprite.png | bullet_diamond_gold | 金色菱形弹 |
| 4 | 1008_N__Sprite.png | bullet_square_red | 红色方形弹 |
| 5 | 1011_N__Sprite.png | bullet_crescent_silver | 银色月牙弹 |
| 6 | 1013_N2__Sprite.png | bullet_star_purple | 紫色星形弹 |
| 7 | 1014_N__Sprite.png | bullet_triangle_green | 绿色三角弹 |
| 8 | 1020_N__Sprite.png | bullet_heart_pink | 粉色心形弹 |
| 9 | 1028_N__Sprite.png | bullet_pentagon_cyan | 青色五边形弹 |
| 10 | 1030_N__Sprite.png | bullet_hexagon_yellow | 黄色六边形弹 |

#### 自然元素系列（10个）

| 编号 | 原始文件名 | 新名称 | 描述 |
|------|-----------|--------|------|
| 11 | 1003_2_xuehua__Sprite.png | bullet_snowflake | 雪花弹 |
| 12 | 1021_2_taohua__Sprite.png | bullet_petal_pink | 粉色花瓣弹 |
| 13 | huaduo01__Sprite.png | bullet_flower_bloom | 盛开花朵弹 |
| 14 | z_bing03__Sprite.png | bullet_ice_shard | 冰晶碎片弹 |
| 15 | z_huoqiu01__Sprite.png | bullet_fireball | 火球弹 |
| 16 | z_dianqiu01__Sprite.png | bullet_lightning_orb | 雷电球弹 |
| 17 | shitou01_s__Sprite.png | bullet_rock_small | 小石块弹 |
| 18 | z_hua01__Sprite.png | bullet_flower_single | 单朵花弹 |
| 19 | yanjin01__Sprite.png | bullet_crystal_shard | 水晶碎片弹 |
| 20 | guangqiu07__Sprite.png | bullet_light_orb | 光球弹 |

#### 魔法元素系列（10个）

| 编号 | 原始文件名 | 新名称 | 描述 |
|------|-----------|--------|------|
| 21 | Boss28_ShuiJIng01_01__Sprite.png | bullet_magic_crystal_1 | 魔法水晶1 |
| 22 | Boss28_ShuiJIng01_02__Sprite.png | bullet_magic_crystal_2 | 魔法水晶2 |
| 23 | Boss29_ShuiJing02_01__Sprite.png | bullet_arcane_gem_1 | 奥术宝石1 |
| 24 | Boss30_ShuiJing02_02__Sprite.png | bullet_arcane_gem_2 | 奥术宝石2 |
| 25 | Boss12_GuangQiu01__Sprite.png | bullet_energy_sphere_1 | 能量球1 |
| 26 | Boss13_GuangQiu02__Sprite.png | bullet_energy_sphere_2 | 能量球2 |
| 27 | Boss14_GuangQiu03__Sprite.png | bullet_energy_sphere_3 | 能量球3 |
| 28 | Boss15_GuangQiu04_01__Sprite.png | bullet_plasma_orb_1 | 等离子球1 |
| 29 | Boss16_GuangQiu04_02__Sprite.png | bullet_plasma_orb_2 | 等离子球2 |
| 30 | Boss17_GuangQiu04_03__Sprite.png | bullet_plasma_orb_3 | 等离子球3 |

#### 特殊形状系列（10个）

| 编号 | 原始文件名 | 新名称 | 描述 |
|------|-----------|--------|------|
| 31 | tanguo01-b__Sprite.png | bullet_candy_blue | 蓝色糖果弹 |
| 32 | tanguo01-g__Sprite.png | bullet_candy_green | 绿色糖果弹 |
| 33 | tanguo01-p__Sprite.png | bullet_candy_pink | 粉色糖果弹 |
| 34 | tanguo01-y__Sprite.png | bullet_candy_yellow | 黄色糖果弹 |
| 35 | yinfu__Sprite.png | bullet_music_note | 音符弹 |
| 36 | cat_01__Sprite.png | bullet_cat | 小猫弹 |
| 37 | wuya__Sprite.png | bullet_crow | 乌鸦弹 |
| 38 | shou01__Sprite.png | bullet_beast_1 | 兽形弹1 |
| 39 | shou02__Sprite.png | bullet_beast_2 | 兽形弹2 |
| 40 | yan01__Sprite.png | bullet_flame | 火焰弹 |

#### Boss专用系列（10个）

| 编号 | 原始文件名 | 新名称 | 描述 |
|------|-----------|--------|------|
| 41 | Boss04_BOSSdaoguang_2__Sprite.png | bullet_boss_blade_2 | Boss刀光2 |
| 42 | Boss05_BOSSdaoguang_3__Sprite.png | bullet_boss_blade_3 | Boss刀光3 |
| 43 | Boss09_DaoGuang01__Sprite.png | bullet_boss_slash_1 | Boss斩击1 |
| 44 | Boss10_DaoGuang02__Sprite.png | bullet_boss_slash_2 | Boss斩击2 |
| 45 | Boss26_shetou01__Sprite.png | bullet_boss_serpent_1 | Boss蛇头1 |
| 46 | Boss27_shetou02__Sprite.png | bullet_boss_serpent_2 | Boss蛇头2 |
| 47 | Boss31_Zid_sanjiao__Sprite.png | bullet_boss_triangle | Boss三角 |
| 48 | Boss32_Zid_zfang__Sprite.png | bullet_boss_square | Boss方块 |
| 49 | Boss33_Zid_wj__Sprite.png | bullet_boss_pentagon | Boss五角 |
| 50 | Boss34_Zid_lj__Sprite.png | bullet_boss_hexagon | Boss六角 |

---

## 二、素材处理步骤

### 步骤1: 创建工作目录

```bash
# 在项目根目录执行
mkdir -p assets/_processing/enemies
mkdir -p assets/_processing/bosses
mkdir -p assets/_processing/backgrounds
mkdir -p assets/_processing/bullets
mkdir -p assets/_processing/bossnames
```

### 步骤2: 批量复制素材

创建脚本 `tools/copy_assets.sh`:

```bash
#!/bin/bash

# 复制小怪素材
cp "素材/sprites_png/source_avatar/enemy/body_10100007/body_10100007__Sprite.png" "assets/_processing/enemies/phantom_raw.png"
cp "素材/sprites_png/source_avatar/enemy/body_10100009/body_10100009__Sprite.png" "assets/_processing/enemies/shade_raw.png"
# ... 其他8个小怪 ...

# 复制Boss素材
cp "素材/sprites_png/source_avatar/enemy_big/body_10103008/body_10103008__Sprite.png" "assets/_processing/bosses/voidkeeper_raw.png"
# ... 其他4个Boss ...

# 复制背景素材
cp "素材/sprites_png/source_home/fight/background/1/1__Sprite.png" "assets/_processing/backgrounds/bg_void_realm_raw.png"
# ... 其他4个背景 ...

# 复制弹幕素材
cp "素材/sprites_png/source_barrage/bulletsource/texture/barragetex/barragetexinfo/1001_N__Sprite.png" "assets/_processing/bullets/bullet_orb_basic_raw.png"
# ... 其他49个弹幕 ...

echo "素材复制完成！"
```

### 步骤3: 图像处理

创建Python脚本 `tools/process_images.py`:

```python
#!/usr/bin/env python3
"""
素材批量处理脚本
功能：
1. 检查图像尺寸
2. 缩放到目标尺寸
3. 确保透明背景
4. 裁剪边缘
5. 优化文件大小
"""

from PIL import Image
import os
from pathlib import Path

def process_enemy_sprite(input_path, output_path, size=(192, 192)):
    """处理敌人精灵"""
    img = Image.open(input_path).convert("RGBA")
    
    # 如果尺寸不符，缩放
    if img.size != size:
        img = img.resize(size, Image.Resampling.LANCZOS)
    
    # 优化透明度
    # 移除伪透明（接近透明的像素变为完全透明）
    pixels = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = pixels[x, y]
            if a < 10:  # 几乎透明
                pixels[x, y] = (r, g, b, 0)
    
    # 保存
    img.save(output_path, "PNG", optimize=True)
    print(f"✓ 已处理: {os.path.basename(output_path)}")

def process_boss_sprite(input_path, output_path, size=(768, 768)):
    """处理Boss精灵（保持大尺寸）"""
    img = Image.open(input_path).convert("RGBA")
    
    if img.size != size:
        img = img.resize(size, Image.Resampling.LANCZOS)
    
    # 同样处理透明度
    pixels = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = pixels[x, y]
            if a < 10:
                pixels[x, y] = (r, g, b, 0)
    
    img.save(output_path, "PNG", optimize=True)
    print(f"✓ 已处理: {os.path.basename(output_path)}")

def process_background(input_path, output_path, size=(720, 1280)):
    """处理背景图"""
    img = Image.open(input_path).convert("RGB")  # 背景不需要透明
    
    if img.size != size:
        img = img.resize(size, Image.Resampling.LANCZOS)
    
    img.save(output_path, "PNG", optimize=True)
    print(f"✓ 已处理: {os.path.basename(output_path)}")

def process_bullet(input_path, output_path, size=(128, 128)):
    """处理弹幕贴图"""
    img = Image.open(input_path).convert("RGBA")
    
    # 弹幕可能需要缩小到64x64以节省性能
    if img.size != size:
        img = img.resize(size, Image.Resampling.LANCZOS)
    
    # 透明度处理
    pixels = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = pixels[x, y]
            if a < 10:
                pixels[x, y] = (r, g, b, 0)
    
    img.save(output_path, "PNG", optimize=True)
    print(f"✓ 已处理: {os.path.basename(output_path)}")

def main():
    base_dir = Path("assets/_processing")
    
    # 处理敌人
    print("\n处理敌人素材...")
    enemy_dir = base_dir / "enemies"
    for f in enemy_dir.glob("*_raw.png"):
        output = f.with_name(f.name.replace("_raw", "_idle"))
        process_enemy_sprite(str(f), str(output))
    
    # 处理Boss
    print("\n处理Boss素材...")
    boss_dir = base_dir / "bosses"
    for f in boss_dir.glob("*_raw.png"):
        output = f.with_name(f.name.replace("_raw", "_idle"))
        process_boss_sprite(str(f), str(output))
    
    # 处理背景
    print("\n处理背景素材...")
    bg_dir = base_dir / "backgrounds"
    for f in bg_dir.glob("*_raw.png"):
        output = f.with_name(f.name.replace("_raw", ""))
        process_background(str(f), str(output))
    
    # 处理弹幕
    print("\n处理弹幕素材...")
    bullet_dir = base_dir / "bullets"
    for f in bullet_dir.glob("*_raw.png"):
        output = f.with_name(f.name.replace("_raw", ""))
        process_bullet(str(f), str(output))
    
    print("\n所有素材处理完成！")

if __name__ == "__main__":
    main()
```

### 步骤4: 创建多状态变体

对于敌人和Boss，需要创建不同状态的变体：
- idle（待机）
- attack（攻击）
- hit（受击）
- death（死亡）

由于原始素材只有一个状态，我们可以：
1. **idle**: 使用原始图
2. **attack**: 稍微放大（1.1x）+ 增加亮度
3. **hit**: 增加红色叠加
4. **death**: 降低透明度 + 模糊效果

创建变体脚本 `tools/create_variants.py`:

```python
from PIL import Image, ImageEnhance, ImageFilter

def create_attack_variant(base_path, output_path):
    """创建攻击状态（放大+增亮）"""
    img = Image.open(base_path).convert("RGBA")
    
    # 放大10%
    new_size = (int(img.width * 1.1), int(img.height * 1.1))
    img = img.resize(new_size, Image.Resampling.LANCZOS)
    
    # 裁剪回原尺寸（居中）
    left = (img.width - 192) // 2
    top = (img.height - 192) // 2
    img = img.crop((left, top, left + 192, top + 192))
    
    # 增加亮度
    enhancer = ImageEnhance.Brightness(img)
    img = enhancer.enhance(1.2)
    
    img.save(output_path, "PNG", optimize=True)

def create_hit_variant(base_path, output_path):
    """创建受击状态（红色叠加）"""
    img = Image.open(base_path).convert("RGBA")
    
    # 创建红色叠加层
    red_overlay = Image.new("RGBA", img.size, (255, 100, 100, 100))
    img = Image.alpha_composite(img, red_overlay)
    
    img.save(output_path, "PNG", optimize=True)

def create_death_variant(base_path, output_path):
    """创建死亡状态（半透明+模糊）"""
    img = Image.open(base_path).convert("RGBA")
    
    # 降低透明度
    img.putalpha(Image.eval(img.split()[-1], lambda a: int(a * 0.6)))
    
    # 轻微模糊
    img = img.filter(ImageFilter.GaussianBlur(radius=1))
    
    img.save(output_path, "PNG", optimize=True)

# 批量创建变体
import glob
for idle_file in glob.glob("assets/_processing/enemies/*_idle.png"):
    base = idle_file.replace("_idle.png", "")
    create_attack_variant(idle_file, f"{base}_attack.png")
    create_hit_variant(idle_file, f"{base}_hit.png")
    create_death_variant(idle_file, f"{base}_death.png")
```

### 步骤5: 移动到最终位置

```bash
#!/bin/bash

# 移动敌人素材
mv assets/_processing/enemies/phantom_*.png assets/enemies/
mv assets/_processing/enemies/shade_*.png assets/enemies/
# ... 其他敌人 ...

# 移动Boss素材
mv assets/_processing/bosses/voidkeeper_*.png assets/bosses/
# ... 其他Boss ...

# 移动背景
mv assets/_processing/backgrounds/*.png assets/backgrounds/

# 移动弹幕
mv assets/_processing/bullets/*.png assets/bullets/

echo "素材已移动到最终位置！"
```

---

## 三、质量检查清单

### 检查项目

**图像质量**:
- [ ] 所有PNG都有透明背景（背景除外）
- [ ] 图像没有锯齿或失真
- [ ] 尺寸符合标准（敌人192x192, Boss768x768等）
- [ ] 文件大小合理（敌人<50KB, Boss<300KB, 背景<500KB, 弹幕<20KB）

**命名规范**:
- [ ] 文件名全部小写
- [ ] 使用下划线分隔
- [ ] 符合命名规范（type_state.png）

**完整性**:
- [ ] 10个敌人各有4个状态（idle/attack/hit/death）
- [ ] 5个Boss各有至少idle状态
- [ ] 5个背景图完整
- [ ] 50个弹幕完整

---

## 四、更新manifest

在 `assets/asset_manifest.json` 中添加新素材记录：

```json
{
  "enemies": {
    "phantom_idle.png": {
      "type": "enemy sprite",
      "size": "192x192",
      "transparent_background": true,
      "source": "processed from 素材库 body_10100007",
      "license": "project asset",
      "commercial_use": true
    },
    // ... 其他敌人 ...
  },
  "bosses": {
    "voidkeeper_idle.png": {
      "type": "boss sprite",
      "size": "768x768",
      "transparent_background": true,
      "source": "processed from 素材库 body_10103008",
      "license": "project asset",
      "commercial_use": true
    },
    // ... 其他Boss ...
  },
  // ... 背景和弹幕 ...
}
```

---

## 五、验证测试

创建测试HTML `tools/asset_preview.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>素材预览</title>
    <style>
        body { background: #222; color: #fff; font-family: sans-serif; }
        .section { margin: 20px; }
        .sprite { display: inline-block; margin: 10px; text-align: center; }
        .sprite img { background: #444; border: 1px solid #666; }
        .sprite p { margin: 5px 0; font-size: 12px; }
    </style>
</head>
<body>
    <h1>素材预览 - Phase 1</h1>
    
    <div class="section">
        <h2>小怪 (10个)</h2>
        <div class="sprite">
            <img src="../assets/enemies/phantom_idle.png">
            <p>phantom (幻影)</p>
        </div>
        <!-- 其他9个敌人 -->
    </div>
    
    <div class="section">
        <h2>Boss (5个)</h2>
        <div class="sprite">
            <img src="../assets/bosses/voidkeeper_idle.png" width="256">
            <p>voidkeeper (虚空守卫)</p>
        </div>
        <!-- 其他4个Boss -->
    </div>
    
    <div class="section">
        <h2>背景 (5个)</h2>
        <div class="sprite">
            <img src="../assets/backgrounds/bg_void_realm.png" width="360" height="640">
            <p>bg_void_realm (虚空领域)</p>
        </div>
        <!-- 其他4个背景 -->
    </div>
    
    <div class="section">
        <h2>弹幕 (50个 - 仅显示前10)</h2>
        <div class="sprite">
            <img src="../assets/bullets/bullet_orb_basic.png" width="64">
            <p>orb_basic</p>
        </div>
        <!-- 其他弹幕 -->
    </div>
</body>
</html>
```

---

## 六、完成标志

当以下条件全部满足时，阶段1完成：

✅ **素材处理完成**:
- 10个敌人 × 4状态 = 40个PNG
- 5个Boss × 1状态 = 5个PNG
- 5个背景 = 5个PNG
- 50个弹幕 = 50个PNG
- **总计: 100个PNG文件**

✅ **文件结构正确**:
- 所有文件在正确的位置
- 命名符合规范
- manifest已更新

✅ **质量检查通过**:
- 图像清晰无失真
- 透明背景正确
- 尺寸符合标准

✅ **预览测试通过**:
- 所有素材能正确显示
- 无加载错误

---

## 七、下一步

阶段1完成后，进入**阶段2: 代码集成** → 见 `PHASE2_CODE_INTEGRATION_GUIDE.md`

---

**文档版本**: V1.0  
**负责人**: 开发团队  
**预计完成日期**: Week 2结束
