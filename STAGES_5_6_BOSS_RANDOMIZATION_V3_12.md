# 月蚀弹幕 V3.12 更新说明
# Stage 5-6 Addition & Boss Randomization System

## 更新时间
2026-06-19

## 概述
本次更新新增了第五、六关卡，并实现了Boss随机出现系统。玩家将体验到更长的游戏流程，每次游戏Boss的出现顺序都不同，增加了重复游玩的价值。

---

## 一、新增关卡

### Stage 5: 幽冥深渊
**敌人配置：**
- 主要敌人：Warden（狱卫）、Seraphguard（炽卫）、Cherub（天使）
- 敌人密度：高密度，10-13个敌人/波次
- 难度特点：高血量精英单位为主，开火频率快（1.3-1.6秒）

**波次设计：**
1. 8个Warden横排进场
2. 5个Cherub斜线编队 + 4个Wisp补充
3. 10个Warden/Seraphguard混合交错阵型
4. 3个Warden + 6个Cherub多层次进攻
5. 4个Seraphguard横排 + 5个Warden密集阵
6. 3个Warden + 4个Cherub + 4个Seraphguard三层立体进攻

**敌人池（用于额外增援）：** `['warden', 'seraphguard', 'cherub', 'warden']`

---

### Stage 6: 终焉之境
**敌人配置：**
- 主要敌人：Warden（主力）、Seraphguard（辅助）、Cherub（快速单位）
- 敌人密度：极高密度，10-15个敌人/波次
- 难度特点：最终关卡，混合大量精英单位，弹幕最密集

**波次设计：**
1. 10个Warden/Seraphguard混合横排
2. 4个Warden + 6个Cherub双层进攻
3. 12个单位密集混合阵型
4. 2个Warden + 8个Cherub螺旋进场
5. 5个Warden + 5个Seraphguard等距横排
6. 3个Warden + 5个Cherub + 5个Seraphguard终极三层阵型

**敌人池（用于额外增援）：** `['warden', 'warden', 'seraphguard', 'cherub']`

---

## 二、Boss随机系统

### 系统设计
每个关卡都有自己的Boss池，游戏会从池中随机选择一个Boss出现。玩家无法预知下一关会遇到哪个Boss，增加了策略性和重复可玩性。

### Boss池配置

```javascript
const BOSS_POOLS = {
  stage1: ['midboss'],                    // 第一关固定中Boss
  stage2: ['eclipseboss'],                // 第二关固定蚀环守望者
  stage3: ['eclipseboss', 'seraph'],      // 第三关开始随机
  stage4: ['eclipseboss', 'seraph'],      // 两种Boss随机
  stage5: ['seraph', 'finalboss'],        // 高级Boss随机
  stage6: ['seraph', 'finalboss'],        // 最终Boss随机
};
```

### Boss随机选择函数
```javascript
function selectRandomBoss(stageName) {
  const pool = BOSS_POOLS[stageName] || ['eclipseboss'];
  return pool[Math.floor(Math.random() * pool.length)];
}
```

---

## 三、Boss定义更新

### 重新设计的Boss系统
为了匹配实际的素材文件，更新了所有Boss的定义：

```javascript
const BOSS_DEFS = {
  // Eclipse Boss - 蚀环守望者（使用 eclipse_boss_* 素材）
  eclipseboss: { 
    hp: 9200,  
    r: 70, 
    scale: 1.0,  
    sprite: 'boss',   // 素材前缀
    name: '蚀环守望者 · 艾莉娅', 
    intro: 'Boss 现身：蚀环守望者', 
    y: 220 
  },
  
  // Seraph - 六翼炽天使（使用 seraph_* 素材）
  seraph: { 
    hp: 10800, 
    r: 76, 
    scale: 1.12, 
    sprite: 'seraph', 
    name: '六翼 · 堕辉炽天使', 
    intro: '禁断降临：六翼 · 堕辉炽天使', 
    y: 218 
  },
  
  // Final Boss - 雪月咏者（使用 finalboss_* 素材）
  finalboss: { 
    hp: 14000, 
    r: 72, 
    scale: 1.06, 
    sprite: 'final',  
    name: '雪月咏者 · 哑奴西亚', 
    intro: '终焉降临：雪月咏者 · 哑奴西亚', 
    y: 224 
  },
  
  // Mid-boss - 守卫（使用 eclipse_boss_* 素材，弱化版）
  midboss: { 
    hp: 5200,  
    r: 58, 
    scale: 0.78, 
    sprite: 'boss',   
    name: '蚀环守望者 · 加冕', 
    intro: '前方守卫降临：蚀环守望者', 
    y: 200 
  },
};
```

### 素材映射说明
- **Eclipse Boss**: 使用前缀 `boss`，对应 `assets/bosses/eclipse_boss_*.png`
- **Seraph**: 使用前缀 `seraph`，对应 `assets/bosses/seraph_*.png`
- **Final Boss**: 使用前缀 `final`，对应 `assets/bosses/finalboss_*.png`

---

## 四、Final Boss弹幕模式

为 **雪月咏者 · 哑奴西亚** 设计了全新的冰雪月亮主题弹幕：

### Phase 0: 雪花环 + 月牙扇形
- 10方向雪花环（1.4秒间隔）
- 5方向月牙瞄准扇形（2.6秒间隔）
- 使用子弹：`snow`、`whitecrescent`

### Phase 1: 三臂月刃螺旋 + 雪花散布
- 3臂白镰刀螺旋（0.28秒快速）
- 8方向雪花慢速环（2.0秒间隔）
- 使用子弹：`scythewhite`、`snow`

### Phase 2: 12方向雪花环 + 灵魂追踪
- 12方向雪花旋转环（1.5秒间隔）
- 3方向灵魂弹追踪（2.3秒间隔）
- 使用子弹：`snow`、`soul`

### Phase 3: 月牙激光 + 针雨
- 4方向旋转激光（2.8秒间隔）
- 10方向白针环（1.6秒间隔）
- 使用子弹：激光、`whiteneedle`

### Phase 4: 雪暴 + 月刃旋风 + 交叉激光（最终形态）
- 4臂月刃高速螺旋（0.22秒极快）
- 16方向雪花密集环（1.3秒间隔）
- 随机交叉激光（2.4秒间隔）
- 使用子弹：`scythewhite`、`snow`、激光

**设计理念：**
- 雪与月的主题贯穿所有阶段
- 螺旋与环形的规律组合
- 激光作为高威胁元素逐步增加
- 最终阶段达到极限密度但保持可读性

---

## 五、关卡流程重构

### 新的关卡进度系统
```javascript
const stageProgression = {
  'stage1': 'stage2',  // 第一幕 → 第二幕
  'stage2': 'stage3',  // 第二幕 → 第三幕
  'stage3': 'stage4',  // 第三幕 → 第四幕
  'stage4': 'stage5',  // 第四幕 → 第五幕
  'stage5': 'stage6',  // 第五幕 → 第六幕
  'stage6': null       // 第六幕 → 轮回
};

const stageMessages = {
  'stage2': '第二幕：月蚀回廊',
  'stage3': '第三幕：极光圣域',
  'stage4': '第四幕：银冠圣域',
  'stage5': '第五幕：幽冥深渊',
  'stage6': '第六幕：终焉之境',
};
```

### 通关逻辑
1. **击败普通Boss** → 进入下一关卡
2. **击败Final Boss（雪月咏者）** → 进入轮回，难度提升
3. **完成Stage 6但未遇到Final Boss** → 同样进入轮回

### 轮回系统
- 通关后从Stage 1重新开始
- 轮回次数 `loopCount` +1
- 所有敌人血量、Boss血量随轮回次数增加
- 玩家获得1条生命（最多6条）
- 玩家HP恢复至满
- 显示提示：`轮回 X · 月蚀更深，强度大幅提升！`

---

## 六、BGM与背景适配

### BGM逻辑更新
```javascript
// Stage 5-6 使用与 Stage 2-4 相同的BGM
return (segment === 'stage2' || segment === 'stage3' || 
        segment === 'stage4' || segment === 'stage5' || 
        segment === 'stage6') ? BGM_PATHS.stage2 : BGM_PATHS.stage1;
```

### 背景图片
Stage 5-6 使用 Stage 3 的背景（`bgStage3`），营造深渊、终焉的氛围。

---

## 七、技术细节

### 代码变更位置
| 功能 | 行号范围 | 说明 |
|------|---------|------|
| STAGE_WAVES 扩展 | ~960-990 | 添加 stage5、stage6 波次 |
| STAGE_POOL 扩展 | ~995-1002 | 添加 stage5、stage6 敌人池 |
| BOSS_DEFS 重构 | ~1008-1030 | 更新Boss定义，匹配素材 |
| BOSS_POOLS 新增 | ~1032-1040 | Boss随机池配置 |
| selectRandomBoss() | ~1043-1047 | 随机选择函数 |
| updateMobStage() | ~2110-2120 | Boss选择改为随机 |
| finalbossPatterns() | ~2367-2450 | Final Boss弹幕函数 |
| defeatBoss() | ~1260-1270 | 更新Boss击败消息 |
| updateBossOutro() | ~1285-1355 | 关卡进度与轮回逻辑 |

### 素材使用
**已使用素材：**
- `assets/bosses/eclipse_boss_*.png` (10个文件)
- `assets/bosses/seraph_*.png` (5个文件)
- `assets/bosses/finalboss_*.png` (7个文件)

**子弹素材：**
- `snow` - 雪花弹
- `whitecrescent` - 白色月牙
- `scythewhite` - 白色镰刀
- `soul` - 灵魂弹
- `whiteneedle` - 白色针弹

---

## 八、测试要点

### 关卡测试
- [ ] Stage 5 所有6个波次正常生成
- [ ] Stage 6 所有6个波次正常生成
- [ ] 敌人池增援正常工作
- [ ] 关卡间转场消息正确显示

### Boss随机测试
- [ ] Stage 1 固定 midboss
- [ ] Stage 2 固定 eclipseboss
- [ ] Stage 3-4 随机出现 eclipseboss 或 seraph
- [ ] Stage 5-6 随机出现 seraph 或 finalboss
- [ ] Boss切换时素材正确加载

### Final Boss测试
- [ ] 5个Phase的弹幕正确触发
- [ ] 雪花、月牙、镰刀、灵魂弹、针弹素材正确显示
- [ ] 激光正常生成
- [ ] 血量阈值正确切换Phase

### 轮回测试
- [ ] 击败 finalboss 后进入轮回
- [ ] Stage 6完成后进入轮回
- [ ] 轮回次数正确增加
- [ ] 生命值恢复、生命数+1
- [ ] 难度正确提升

---

## 九、已知问题
无

---

## 十、后续计划
1. 考虑为每个Boss设计独特的BGM
2. 添加更多Stage 5-6 专属背景图
3. 考虑增加Boss随机池的权重系统（某些Boss出现概率更高）
4. 添加Boss图鉴/收藏系统记录玩家遇到的Boss

---

**变更作者**: Kiro AI Assistant  
**变更日期**: 2026-06-19  
**版本**: V3.12
