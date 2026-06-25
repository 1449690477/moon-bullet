# 月蚀弹幕游戏扩展总体规划
# Game Expansion Master Plan V3.13

**创建时间**: 2026-06-19  
**状态**: 规划阶段 → 即将施工

---

## 📋 目录
1. [素材库盘点](#素材库盘点)
2. [扩展目标](#扩展目标)
3. [实施计划](#实施计划)
4. [素材处理流程](#素材处理流程)
5. [分阶段实施](#分阶段实施)

---

## 一、素材库盘点

### 🎯 已发现的素材资源（素材文件夹）

#### 1. 敌人/小怪素材
**位置**: `素材/sprites_png/source_avatar/enemy/`  
**数量**: **130+ 个不同敌人**

**分类统计**:
- `body_101xxxxx` 系列: ~50个 (似乎是1系列敌人)
- `body_102xxxxx` 系列: ~20个 (2系列敌人)
- `body_103xxxxx` 系列: ~25个 (3系列敌人)
- `body_104xxxxx` 系列: ~15个 (4系列敌人)
- `body_105xxxxx` 系列: ~15个 (5系列敌人)
- `body_600xxxxx` 系列: ~10个 (特殊敌人)
- 其他特殊编号: ~15个

**示例ID**:
- body_10100004, body_10100007, body_10100008 (基础敌人)
- body_10102001, body_10102002 (中级敌人)
- body_10103008, body_10103009 (高级敌人)
- body_60054010, body_60055020 (特殊敌人)

---

#### 2. Boss级敌人素材
**位置**: `素材/sprites_png/source_avatar/enemy_big/`  
**数量**: **46 个大型Boss**

**分类统计**:
- `body_101xxxxx` 大型: ~15个
- `body_102xxxxx` 大型: ~8个
- `body_103xxxxx` 大型: ~12个
- `body_104xxxxx` 大型: ~5个
- `body_105xxxxx` 大型: ~6个

**Boss名牌素材**:
**位置**: `素材/sprites_png/source_common/bossname/`  
**数量**: **16 个Boss名牌** (10110788 ~ 10110803)

---

#### 3. 战斗背景/地图素材
**位置**: `素材/sprites_png/source_home/fight/background/`  
**数量**: **35+ 个战斗背景**

**背景分类**:
- **基础场景**: 1, 2, 3, 4, 5, 6, 7, 8 (8个基础场景)
- **特殊场景**: 7_1, 7_2, 7_3, 7_4 (变种场景)
- **记忆场景**: 9_1, 9_2, 9_3, 9_4 (记忆副本)
- **Memory场景**: banner_guanka_memory_1~6 (6个记忆场景)
- **Boss专用背景**: img_yitiao_boss_1~16 (16个Boss背景)

**其他背景素材**:
- `source_common/bg/`: 9个特殊背景 (白月、七音、深渊等)
- `source_home/fight/banner_story_X/`: 15个故事章节背景

---

#### 4. 弹幕贴图素材
**位置**: `素材/sprites_png/source_barrage/bulletsource/texture/barragetex/barragetexinfo/`  
**数量**: **200+ 个弹幕贴图**

**弹幕分类**:

**A. 基础形状弹幕** (1001~1045系列, ~40个)
- 圆形: 1001_N, 1002_N, 1003_N
- 针形: 1004_N, 1005_N
- 菱形: 1006_N, 1007_N
- 方形: 1008_N, 1009_N
- 月牙: 1011_N, 1012_N
- 星形: 1013_N, 1014_N
- 心形: 1015_N
- 雪花: 1003_2_xuehua
- 花瓣: 1021_N, 1021_2_taohua
- 水晶: Boss28~30 系列

**B. Boss专用弹幕** (Boss01~Boss37系列, ~80个)
- Boss01~10: 各种刀光、爆珠、气团
- Boss11~20: 光球、护盾、锁链
- Boss21~30: 玩家弹幕、水晶、蛇头
- Boss31~37: 三角、方块、五角、菱形组合

**C. 特殊主题弹幕** (~80个)
- 动物: cat_01, wuya (乌鸦), shou01/02 (兽)
- 植物: huaduo01 (花朵), taohua (桃花)
- 食物: tanguo01~03 (糖果), juzi_01 (橘子), baozi_01 (包子)
- 自然: shitou01 (石头), bing03/04 (冰), huoqiu (火球)
- 魔法: yinfu (音符), duan_g (魔法弹), guangqiu (光球)
- 武器: dao (刀), jian (剑), magu (魔菇)

---

### 📊 素材统计总览

| 素材类型 | 位置 | 数量 | 可用性 |
|---------|------|------|--------|
| 小怪 | source_avatar/enemy/ | 130+ | ✅ 高 |
| Boss | source_avatar/enemy_big/ | 46 | ✅ 高 |
| Boss名牌 | source_common/bossname/ | 16 | ✅ 高 |
| 战斗背景 | source_home/fight/background/ | 35+ | ✅ 高 |
| 弹幕贴图 | source_barrage/.../barragetexinfo/ | 200+ | ✅ 高 |
| **总计** | - | **410+** | - |

---

## 二、扩展目标

### 🎯 短期目标（V3.13 - V3.15）

1. **新增10种小怪** - 从130个素材中精选10个
2. **新增5个Boss** - 从46个Boss素材中精选5个
3. **新增3-5个关卡** - 使用新的背景和敌人组合
4. **整合50个新弹幕** - 丰富现有弹幕系统

### 🚀 中期目标（V3.16 - V3.20）

1. **新增20种小怪**
2. **新增10个Boss**
3. **新增10个关卡**
4. **完整弹幕库** - 整合全部200+弹幕素材
5. **关卡主题系统** - 不同关卡有不同视觉主题

### 🌟 长期目标（V3.21+）

1. **多章节系统** - 将关卡分为多个章节
2. **随机关卡生成** - 肉鸽元素
3. **敌人AI升级** - 不同敌人有独特行为模式
4. **Boss机制** - 每个Boss有独特的技能和阶段

---

## 三、实施计划

### 阶段0: 素材准备与处理 ⏳

**目标**: 将原始素材转换为游戏可用格式

#### 3.1 文件夹结构规划

```
assets/
├── enemies/           # 小怪素材（现有3个）
│   ├── bat_familiar_*
│   ├── nun_spirit_*
│   ├── orb_drone_*
│   └── [新增10个敌人]
├── bosses/           # Boss素材（现有3个）
│   ├── eclipse_boss_*
│   ├── seraph_*
│   ├── finalboss_*
│   └── [新增5个Boss]
├── backgrounds/      # 背景素材（现有10个）
│   └── [新增5-10个背景]
└── bullets/          # 弹幕素材（现有35个）
    └── [新增50个弹幕]
```

#### 3.2 素材命名规范

**小怪命名**: `{type}_idle.png`, `{type}_attack.png`, `{type}_hit.png`, `{type}_death.png`
- 示例: `phantom_idle.png`, `phantom_attack.png`

**Boss命名**: `{boss_name}_{state}.png`
- 状态: idle, phase1, phase2, phase3, rage, hit, death, portrait
- 示例: `void_keeper_idle.png`, `void_keeper_phase1.png`

**弹幕命名**: `bullet_{type}_{variant}.png`
- 示例: `bullet_star_blue.png`, `bullet_candy_red.png`

---

### 阶段1: 精选与转换（第1周）

#### 任务列表

**1.1 精选10个小怪** ✅ 待处理
从130个素材中选择：
- 3个基础敌人（替代现有bat/familiar）
- 3个中级敌人（替代nun/wisp）
- 2个精英敌人（替代cherub/seraphguard）
- 2个Boss级小怪（替代warden）

**优先选择ID**:
```
基础: body_10100007, body_10100009, body_10101008
中级: body_10102002, body_10102009, body_10103001
精英: body_10104010, body_10104020
Boss级: body_10105008, body_10105020
```

**1.2 精选5个Boss** ✅ 待处理
从46个Boss素材中选择：
```
Boss1: body_10103008  (Stage 2-3)
Boss2: body_10103030  (Stage 3-4)
Boss3: body_10104010  (Stage 4-5)
Boss4: body_10105020  (Stage 5-6)
Boss5: body_11003001  (Stage 6终Boss)
```

**1.3 精选5个背景** ✅ 待处理
```
BG1: background/1/     → Stage 1-2
BG2: background/3/     → Stage 3-4
BG3: background/5/     → Stage 5-6
BG4: background/7_1/   → Stage 7-8
BG5: img_yitiao_boss_1/ → Boss专用
```

**1.4 精选50个弹幕** ✅ 待处理
按主题分类：
- 基础形状: 10个 (圆、针、菱形、方形、星形)
- 自然元素: 10个 (雪花、花瓣、冰、火、雷)
- 魔法元素: 10个 (光球、水晶、魔法阵)
- 特殊形状: 10个 (糖果、音符、蝴蝶)
- Boss专用: 10个 (各种特殊弹幕)

---

### 阶段2: 素材处理与导入（第2周）

#### 2.1 素材处理脚本

创建 `tools/process_assets.py`:
```python
# 功能：
# 1. 从素材文件夹复制选中的文件
# 2. 重命名为标准格式
# 3. 裁剪/缩放到合适尺寸
# 4. 转换为透明背景PNG
# 5. 移动到assets/目标文件夹
```

#### 2.2 处理流程

1. **复制原始文件** → `assets/_processing/`
2. **重命名** → 按规范命名
3. **图像处理** → 裁剪、缩放、透明化
4. **质量检查** → 手动检查每个文件
5. **移动到目标位置** → `assets/enemies/`, `assets/bosses/`等

#### 2.3 尺寸标准

- 小怪: 192x192px (原始) → 保持或缩放到128x128
- Boss: 768x768px (原始) → 保持
- 背景: 720x1280px → 保持
- 弹幕: 128x128px → 保持或缩放到64x64

---

### 阶段3: 代码集成（第3周）

#### 3.1 敌人系统扩展

**文件**: `桌面版/app/index.html`

**修改点**:
1. **spawnEnemy函数** (~915行)
```javascript
function spawnEnemy(type, x, y) {
  const data = {
    // 现有敌人
    bat: { hp: 110, r: 18, score: 85, color: '#ffca6b', fire: 2.5 },
    // ...现有定义...
    
    // ===== 新增敌人 =====
    phantom: { hp: 150, r: 20, score: 95, color: '#9d7fff', fire: 2.3 },
    shade: { hp: 180, r: 22, score: 110, color: '#7fbfff', fire: 2.1 },
    specter: { hp: 140, r: 19, score: 100, color: '#ff9dff', fire: 2.4 },
    // ...其他新敌人...
  }[type] || { hp: 240, r: 20, score: 100, color: '#fff', fire: 2.0 };
  
  // ...后续代码不变...
}
```

2. **enemyFire函数** (~1750行) - 为每个新敌人设计独特弹幕模式

3. **素材加载** (~90-250行) - 添加新敌人的图片路径

#### 3.2 Boss系统扩展

**修改点**:
1. **BOSS_DEFS** (~1008行)
```javascript
const BOSS_DEFS = {
  // 现有Boss
  eclipseboss: { ... },
  seraph: { ... },
  finalboss: { ... },
  midboss: { ... },
  
  // ===== 新增Boss =====
  voidkeeper: { 
    hp: 8500, r: 68, scale: 0.95, 
    sprite: 'voidkeeper', 
    name: '虚空守卫 · 格雷厄姆', 
    intro: '虚空裂隙开启：虚空守卫降临', 
    y: 215 
  },
  // ...其他新Boss...
};
```

2. **BOSS_POOLS** - 更新每关的Boss池
```javascript
const BOSS_POOLS = {
  stage1: ['midboss'],
  stage2: ['eclipseboss', 'voidkeeper'],  // 新增
  stage3: ['eclipseboss', 'seraph', 'voidkeeper'],
  stage4: ['eclipseboss', 'seraph', 'shadowlord'],  // 新增
  stage5: ['seraph', 'finalboss', 'abyssal'],  // 新增
  stage6: ['seraph', 'finalboss', 'voidgod'],  // 新增
};
```

3. **Boss弹幕函数** - 为每个新Boss创建专属弹幕模式函数
```javascript
function voidkeeperPatterns(t, dt) {
  // Phase 0-4的弹幕模式
}
```

#### 3.3 关卡系统扩展

**修改点**:
1. **STAGE_WAVES** (~940行) - 添加stage7, stage8等
2. **STAGE_POOL** (~995行) - 添加新关卡的敌人池
3. **关卡进度映射** - 更新stageProgression对象

#### 3.4 弹幕系统扩展

**修改点**:
1. **BULLET_KEY** (~145行) - 添加50个新弹幕的映射
```javascript
const BULLET_KEY = {
  // ...现有映射...
  
  // ===== 新增弹幕 =====
  'star': 'bulletStar',
  'candy': 'bulletCandy',
  'note': 'bulletNote',
  'butterfly': 'bulletButterfly',
  // ...其他新弹幕...
};
```

2. **素材加载** - 添加新弹幕的图片路径

3. **drawEnemyBullets函数** (~2615行) - 支持新弹幕类型的渲染

---

### 阶段4: 关卡设计（第4周）

#### 4.1 新关卡设计原则

1. **渐进难度** - 每关比上一关更难
2. **主题一致** - 关卡背景、敌人、弹幕风格统一
3. **节奏把控** - 紧张与缓和交替
4. **可预测性** - 符合东方STG设计理念

#### 4.2 关卡模板

**Stage 7: 虚空裂隙**
- 背景: background/7_1/
- 主题: 虚空、黑暗
- 敌人: phantom, shade, voidminion
- Boss: voidkeeper
- 弹幕风格: 紫色、黑色为主

**Stage 8: 暗影深渊**
- 背景: background/8/
- 主题: 深渊、暗影
- 敌人: shadowfiend, abyssalcreature
- Boss: shadowlord
- 弹幕风格: 黑红色为主

#### 4.3 波次设计工具

创建波次设计表格：
```
| 波次 | 敌人类型 | 数量 | 编队 | 进场时间 | 特殊行为 |
|------|---------|------|------|---------|---------|
| 1    | phantom | 6    | 横排 | 0s      | 无      |
| 2    | shade   | 4    | V字  | 3s      | 交叉    |
| ...  | ...     | ...  | ...  | ...     | ...     |
```

---

### 阶段5: 测试与优化（第5周）

#### 5.1 测试清单

**功能测试**:
- [ ] 所有新敌人正常生成
- [ ] 新敌人弹幕模式正常工作
- [ ] 所有新Boss正常生成
- [ ] 新Boss弹幕模式正常工作
- [ ] 新关卡波次正确触发
- [ ] 背景正确加载和显示
- [ ] 新弹幕正确渲染

**性能测试**:
- [ ] 素材加载时间<3秒
- [ ] 游戏帧率稳定60FPS
- [ ] 内存占用<500MB

**平衡性测试**:
- [ ] 新敌人血量合理
- [ ] 新Boss难度合理
- [ ] 关卡难度曲线平滑
- [ ] 弹幕密度适中

#### 5.2 优化方向

1. **素材优化** - 压缩图片大小
2. **代码优化** - 减少重复代码
3. **性能优化** - 优化渲染逻辑
4. **平衡优化** - 根据测试调整数值

---

## 四、素材处理流程

### 流程图

```
素材文件夹 → 选择素材 → 复制到处理区 → 重命名
    ↓
图像处理（裁剪/缩放/透明化）
    ↓
质量检查 → 移动到assets/ → 更新asset_manifest.json
    ↓
代码集成 → 测试 → 发布
```

### 详细步骤

#### 步骤1: 选择素材
- 打开素材文件夹
- 根据优先选择列表找到对应ID
- 记录文件路径和ID

#### 步骤2: 批量复制
```bash
# 创建处理目录
mkdir -p assets/_processing/enemies
mkdir -p assets/_processing/bosses
mkdir -p assets/_processing/backgrounds
mkdir -p assets/_processing/bullets

# 复制素材（示例）
cp "素材/sprites_png/source_avatar/enemy/body_10100007/body_10100007__Sprite.png" \
   "assets/_processing/enemies/phantom.png"
```

#### 步骤3: 图像处理
使用图像处理工具（如Python PIL、ImageMagick）：
```python
from PIL import Image

def process_enemy_sprite(input_path, output_path, target_size=(192, 192)):
    img = Image.open(input_path).convert("RGBA")
    img = img.resize(target_size, Image.LANCZOS)
    # 增强透明度
    # 裁剪边缘
    img.save(output_path, "PNG")
```

#### 步骤4: 命名与整理
- 重命名为标准格式
- 移动到正确的子文件夹
- 更新manifest文件

---

## 五、分阶段实施

### 第1阶段：素材准备（第1-2周）

**工作内容**:
1. ✅ 盘点所有素材（已完成）
2. ⏳ 精选10个小怪素材
3. ⏳ 精选5个Boss素材
4. ⏳ 精选5个背景素材
5. ⏳ 精选50个弹幕素材
6. ⏳ 创建处理脚本
7. ⏳ 批量处理素材

**交付物**:
- 素材选择清单（本文档）
- 处理后的PNG文件
- 更新的asset_manifest.json

---

### 第2阶段：代码集成（第3周）

**工作内容**:
1. ⏳ 扩展敌人系统（10个新敌人）
2. ⏳ 扩展Boss系统（5个新Boss）
3. ⏳ 扩展弹幕系统（50个新弹幕）
4. ⏳ 添加素材加载代码
5. ⏳ 创建敌人弹幕模式函数
6. ⏳ 创建Boss弹幕模式函数

**交付物**:
- 更新的index.html
- 敌人/Boss定义表
- 弹幕模式文档

---

### 第3阶段：关卡设计（第4周）

**工作内容**:
1. ⏳ 设计Stage 7-10波次
2. ⏳ 配置关卡敌人池
3. ⏳ 设计关卡背景切换
4. ⏳ 创建关卡进度系统
5. ⏳ 设计Boss随机池更新

**交付物**:
- Stage 7-10波次配置
- 关卡设计文档
- 更新的STAGE_WAVES和STAGE_POOL

---

### 第4阶段：测试优化（第5周）

**工作内容**:
1. ⏳ 功能测试
2. ⏳ 性能测试
3. ⏳ 平衡性测试
4. ⏳ Bug修复
5. ⏳ 数值调优
6. ⏳ 最终优化

**交付物**:
- 测试报告
- Bug列表及修复记录
- 优化后的最终版本
- V3.13发布文档

---

## 六、技术规范

### 6.1 代码风格

- 遵循现有代码风格
- 注释使用中文
- 函数名使用驼峰命名
- 常量使用大写下划线

### 6.2 性能要求

- 单个关卡素材加载<2秒
- 游戏运行帧率>55FPS
- 内存占用<400MB
- 同屏最大弹幕数<500个

### 6.3 兼容性

- 支持Chrome/Edge/Firefox最新版本
- 分辨率720x1280（可缩放）
- 鼠标+键盘操作

---

## 七、风险与对策

### 风险1: 素材质量不符合要求
**对策**: 
- 预先检查素材质量
- 准备备选方案
- 必要时重新生成素材

### 风险2: 性能问题
**对策**:
- 渐进式加载素材
- 使用素材压缩
- 优化渲染逻辑

### 风险3: 平衡性问题
**对策**:
- 多次测试调整
- 参考现有数值
- 建立数值平衡表

### 风险4: 开发时间超期
**对策**:
- 分阶段实施
- 优先核心功能
- 降低非必要功能

---

## 八、后续规划

### V3.14 - V3.15 (中期)
- 新增20种小怪
- 新增10个Boss
- 新增10个关卡
- 完整弹幕库（200+弹幕）

### V3.16 - V3.20 (长期)
- 多章节系统
- 随机关卡生成
- 敌人AI系统
- Boss机制系统
- 成就系统
- 图鉴系统

---

## 九、附录

### 附录A: 素材优先级列表

**高优先级**（第1阶段）:
- 10个小怪
- 5个Boss
- 5个背景
- 50个弹幕

**中优先级**（第2阶段）:
- 20个小怪
- 10个Boss
- 10个背景
- 100个弹幕

**低优先级**（第3阶段）:
- 所有剩余素材

### 附录B: 参考资料

- 东方Project弹幕设计理念
- Sparen's Danmaku Design Studio
- 现有游戏代码注释

---

**文档版本**: V1.0  
**创建者**: Kiro AI Assistant  
**最后更新**: 2026-06-19

**下一步**: 开始素材处理 → 详见阶段1任务清单
