# 东方STG设计分析与游戏重构计划

## 东方Project核心设计哲学

### 1. 弹幕的可读性（Readability）
- **对称美学**：大多数弹幕以Boss为中心呈对称分布
- **颜色编码**：不同颜色代表不同威胁等级
- **速度分层**：快弹（瞄准）、中速弹（填充）、慢弹（陷阱）
- **空隙明确**：弹幕再密集也有明确的安全区

### 2. 节奏设计（Rhythm）
- **呼吸感**：高强度弹幕→缓和→再次高潮
- **预判时间**：玩家有1-2秒反应时间
- **渐进难度**：从稀疏到密集逐步过渡

### 3. 敌人编队（Formation）
- **整齐入场**：敌人以编队形式入场（横排/纵列/V字/圆弧）
- **固定节奏**：敌人出现间隔固定，可预判
- **分批登场**：不是一次涌出，而是分3-5批
- **位置规律**：敌人站位有明确规律

### 4. 弹幕符卡设计（Spell Card）
- **主题明确**：每个符卡有独特视觉主题
- **分阶段**：符卡有开始、中期、高潮三段
- **避弹路线**：设计师预留了明确的避弹路径

## 当前问题诊断

### 问题1：弹幕混乱
- ❌ 多种敌人同时射击，弹幕重叠
- ❌ 没有颜色区分威胁等级
- ❌ 缺少明确的安全区

### 问题2：敌人出现无规律
- ❌ 随机位置刷怪
- ❌ 没有编队感
- ❌ 数量过多时屏幕拥挤

### 问题3：难度曲线不平滑
- ❌ 突然从简单变困难
- ❌ 缺少过渡波次

## 重构计划

### 阶段1：素材盘点与分类

#### 可用敌人素材（3种）
1. bat_familiar - 蝙蝠
2. orb_drone - 圆球机器人
3. nun_spirit - 幽灵修女

#### 可用弹幕素材（35种）
**基础形状：**
- bullet_blue_orb - 蓝色圆弹
- bullet_gold_orb - 金色圆弹
- bullet_white_needle - 白色针弹
- bullet_red_warning - 红色警告弹

**月牙/镰刀系列：**
- bullet_gold_crescent - 金月牙
- bullet_red_crescent - 红月牙
- bullet_white_crescent - 白月牙
- bullet_purple_moon - 紫月
- bullet_scythe_rose - 玫瑰镰
- bullet_scythe_violet - 紫镰
- bullet_scythe_white - 白镰

**特殊形状：**
- bullet_crystal - 水晶
- bullet_diamond - 钻石
- bullet_petal - 花瓣
- bullet_snow - 雪花
- bullet_soul - 灵魂球
- bullet_electric - 电球
- bullet_caged_orb - 笼中球
- bullet_aurora_a/b/c - 极光弹

**追踪/激光：**
- bullet_homing_spear - 追踪矛
- bullet_homing_spear_aurora - 极光矛
- bullet_laser_core - 激光核心
- bullet_laser_glow - 激光光晕

**连锁系列：**
- bullet_chain_heart - 心形连锁
- bullet_chain_heart_rose - 玫瑰心形
- chain_core - 连锁核心

#### Boss素材（3种）
- eclipse_boss（8状态）- 蚀月Boss
- seraph（5状态）- 炽天使
- finalboss（7状态）- 最终Boss

### 阶段2：弹幕颜色与威胁等级系统

#### 颜色编码规则
```
蓝色系（#6db4ff - #9fc6ff）：安全弹，慢速，可以挤
绿色系（#7ff0d8 - #a6ffe0）：中速弹，常规威胁
金色系（#ffd36d - #fff2a8）：快速弹，需避让
红色系（#ff5f89 - #ff365f）：危险弹，高伤害
紫色系（#c9b4ff - #d6a4ff）：混合威胁
白色系（#fff - #f0f0f0）：超高速/大招弹
```

### 阶段3：新敌人类型设计

基于3种素材创建9种敌人变体：

#### Bat家族（使用bat_familiar素材）
1. **bat_scout** - 侦察蝙蝠
   - HP: 低，速度快
   - 弹幕：单发瞄准（金色针弹）
   - 出现：5-8只编队

2. **bat_bomber** - 轰炸蝙蝠
   - HP: 中等
   - 弹幕：3方向扇形（红色警告弹）
   - 出现：2-3只散开

3. **bat_swarm** - 蜂群蝙蝠
   - HP: 很低，数量多
   - 弹幕：环形散射（蓝色小orb）
   - 出现：10-15只密集编队

#### Orb家族（使用orb_drone素材）
4. **orb_turret** - 炮台圆球
   - HP: 高，移动慢
   - 弹幕：旋转螺旋（电弹）
   - 出现：2-3只固定位置

5. **orb_laser** - 激光圆球
   - HP: 中等
   - 弹幕：直线激光（laser_core）
   - 出现：横排3-4只

6. **orb_crystal** - 水晶圆球
   - HP: 中高
   - 弹幕：减速水晶弹
   - 出现：V字形编队

#### Nun家族（使用nun_spirit素材）
7. **nun_priest** - 祭司修女
   - HP: 高
   - 弹幕：整圈金环 + 瞄准弹
   - 出现：单体或双体

8. **nun_acolyte** - 侍从修女
   - HP: 中等
   - 弹幕：花瓣形双层弹
   - 出现：3-4只编队

9. **nun_exorcist** - 驱魔修女
   - HP: 很高
   - 弹幕：米字爆射 + 追踪矛
   - 出现：单体精英

### 阶段4：新弹幕模式（东方风格）

#### 基础模式（低难度）
1. **单向集中射** - 朝玩家3-5发
2. **慢速圆环** - 12方向慢速散开
3. **交替扇形** - 左右摇摆扇形

#### 进阶模式（中难度）
4. **双层花瓣** - 内外两圈不同速度
5. **螺旋星阵** - 3臂螺旋
6. **波浪幕** - 正弦轨迹弹幕墙

#### 高级模式（高难度）
7. **减速陷阱弹** - 先快后慢
8. **追踪矛雨** - 延迟追踪
9. **激光十字** - 4方向激光
10. **混沌散布** - 随机角度密集弹

### 阶段5：关卡重新设计

#### Stage 1 - 月夜废墟（Tutorial）
**主题**：简单节奏，教学弹幕
**敌人池**：bat_scout, bat_bomber, orb_turret
**弹幕配色**：蓝色、金色为主
**波次设计**：
```
Wave 1: 5只bat_scout横排（单发瞄准）
Wave 2: 3只bat_bomber V字形（扇形弹）
Wave 3: 7只bat_scout + 2只orb_turret（混合）
Wave 4: 4只bat_bomber + 5只bat_scout（交替）
Wave 5: 大波：10只bat_scout环形 + 3只orb_turret中心
MidBoss: 蚀环守望者（简化版）
```

#### Stage 2 - 幽灵回廊
**主题**：增加速度和密度
**敌人池**：nun_acolyte, bat_swarm, orb_laser
**弹幕配色**：绿色、紫色、白色
**波次设计**：
```
Wave 1: 8只bat_swarm波浪编队
Wave 2: 4只nun_acolyte横排（花瓣弹）
Wave 3: 5只orb_laser + 10只bat_swarm
Wave 4: 2只nun_priest + 周围护卫
Wave 5: 混合大波
Boss: 堕月审判者
```

#### Stage 3 - 极光圣域
**主题**：高速弹幕和追踪
**敌人池**：orb_crystal, nun_exorcist, bat_bomber
**弹幕配色**：白色、金色、红色
**波次设计**：精英少量高威胁

#### Stage 4 - 终焉裁决
**主题**：终极挑战
**敌人池**：全敌人类型混合
**弹幕配色**：全谱系
**Boss**: Final Boss

### 阶段6：Boss符卡重设计

每个Boss 5个阶段，每个阶段有明确主题：

#### 蚀月审判者
- Phase 1: **月环散射** - 均匀圆环，慢速
- Phase 2: **金色回廊** - 两侧金色弹墙
- Phase 3: **白羽爆线** - 快速直线弹
- Phase 4: **血月蛇阵** - S形弹墙
- Phase 5: **审判之光** - 全屏激光 + 安全区

## 实施优先级

### P0 - 立即实施（核心重构）
1. ✅ 弹幕颜色系统重构
2. ✅ 创建9种敌人变体
3. ✅ 重新设计Stage 1和Stage 2
4. ✅ 敌人编队系统优化

### P1 - 第二阶段
1. ⬜ 接入未使用的弹幕素材
2. ⬜ Boss符卡重新设计
3. ⬜ Stage 3和Stage 4

### P2 - 润色阶段
1. ⬜ 音效匹配
2. ⬜ 视觉特效增强
3. ⬜ 平衡性调整

## 代码重构要点

### 1. 敌人数据结构扩展
```javascript
// 添加编队信息
formation: 'line' | 'v' | 'circle' | 'wave'
// 添加行为模式
behavior: 'hover' | 'dive' | 'weave'
// 添加弹幕主题
theme: 'basic' | 'spiral' | 'star' | 'laser'
```

### 2. 波次生成器重构
```javascript
// 不再是简单的循环spawn
// 而是带延迟的序列编排
spawnSequence([
  { delay: 0, formation: 'line', type: 'bat_scout', count: 5 },
  { delay: 1.5, formation: 'v', type: 'bat_bomber', count: 3 },
  { delay: 3.0, ... }
])
```

### 3. 弹幕发射器重构
```javascript
// 根据敌人类型和主题自动选择
// 不再硬编码在enemyFire中
const pattern = BULLET_PATTERNS[enemy.theme];
pattern.fire(enemy, patternData);
```

## 预期效果

### 视觉效果
- 🎨 弹幕颜色丰富多彩但有规律
- 💎 每个敌人类型有独特视觉特征
- ✨ Boss符卡华丽且可辨识

### 游戏性
- 📈 平滑的难度曲线
- 🎯 明确的避弹路径
- ⚡ 爽快的节奏感

### 可玩性
- 🌟 9种敌人 × 不同编队 = 丰富变化
- 🎭 每个关卡有独特主题
- 🏆 可学习可记忆的弹幕模式
