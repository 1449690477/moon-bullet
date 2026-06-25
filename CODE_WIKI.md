# 月蚀弹幕 Demo（Moon Bullet Demo V3.6）· Code Wiki

> 一款基于 HTML5 Canvas 的纯前端弹幕射击（STG / Bullet Hell）游戏。  
> 全部游戏逻辑集中在单个 `index.html` 中，配合 `assets/` 资源库与 `tools/` 资源处理脚本工作。

---

## 目录

1. [项目概述](#1-项目概述)
2. [整体架构](#2-整体架构)
3. [运行方式](#3-运行方式)
4. [目录结构与依赖关系](#4-目录结构与依赖关系)
5. [核心模块职责](#5-核心模块职责)
6. [关键数据结构](#6-关键数据结构)
7. [关键类与函数说明](#7-关键类与函数说明)
8. [游戏状态机与流程](#8-游戏状态机与流程)
9. [资源系统与工具脚本](#9-资源系统与工具脚本)
10. [扩展与维护指引](#10-扩展与维护指引)

---

## 1. 项目概述

| 项目 | 说明 |
|------|------|
| 名称 | 月蚀弹幕：苍夜契约 / Moon Bullet Demo |
| 版本 | V3.6（视觉重建与资源规范版，代码内含 V3.11–V3.14 增量） |
| 类型 | 纵版弹幕射击游戏（Touhou 风格 STG / Bullet Hell） |
| 技术栈 | 原生 HTML5 + CSS + JavaScript（无框架、无构建工具） |
| 渲染 | Canvas 2D（`720 × 1280` 逻辑分辨率，9:16 竖屏） |
| 音频 | Web Audio API 程序合成 + `<audio>`/`Audio` 元素播放采样 |
| 依赖 | **运行时零第三方依赖**；工具脚本依赖 Python（Pillow / OpenCV / numpy） |
| 美术风格 | dark gothic sci-fi anime bullet hell（暗黑哥特 + 科幻动漫） |

**核心玩法特征：**
- 三主角可切换（伊丽莎白 / 雅努西娅 / 安娜），每人多套皮肤与专属武器、必杀。
- 8 个关卡（stage1–stage8），每关「波次刷怪 → 随机 Boss」，通关后循环（Roguelike 轮回），强度随时间与轮回递增。
- 擦弹（graze）充能、火力等级成长、可拾取的弹幕升级插件（连锁 / 追踪 / 幽灵暗刃 / 七神武终极召唤）。
- 大量程序化弹幕 pattern、贴图特效（spriteFx）、粒子、屏震、hit-stop 打击感系统。

---

## 2. 整体架构

整个游戏是一个 **立即执行函数表达式（IIFE）**，封装在 `index.html` 的 `<script>` 中，采用经典的 **「单线程 game loop + 全局状态 + 数组实体池」** 架构，没有面向对象的实体继承体系（除 `AudioEngine` 外均为普通对象 + 函数）。

```
┌──────────────────────────────────────────────────────────────┐
│                       index.html (IIFE)                        │
│                                                                │
│  ┌────────────┐   requestAnimationFrame   ┌─────────────────┐  │
│  │  loop(now) │ ─────────────────────────▶│  update(dt)     │  │
│  │  (帧驱动)   │                            │  推进所有系统逻辑 │  │
│  └────────────┘ ◀─────────────────────────┤  draw()         │  │
│         │             每帧调用              │  绘制所有层      │  │
│         ▼                                   └─────────────────┘  │
│  全局状态: state / player / boss / 各实体数组                     │
│                                                                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐  │
│  │ 输入系统 │ │ 玩家系统 │ │ 敌人系统 │ │ 弹幕系统 │ │ 音频引擎 │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └──────────┘  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐  │
│  │ Boss系统 │ │ 道具/插件│ │ 特效粒子 │ │ 渲染/UI │ │ 资源加载 │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └──────────┘  │
└──────────────────────────────────────────────────────────────┘
                            │ 读取
                            ▼
        assets/ (PNG 贴图 / OGG·WAV 音频 / asset_manifest.json)
```

**设计要点：**
- **数据驱动**：敌人（`ENEMY_DEFS`）、Boss（`BOSS_DEFS`）、角色（`CHARACTERS`）、关卡波次（`STAGE_WAVES`）、弹幕形状（`BULLET_SHAPE`）等都用配置表声明，逻辑函数读取配置执行。
- **更新/渲染分离**：`update(dt)` 只改状态，`draw()` 只读状态画图，二者由 `loop` 串联。
- **容错优先**：`loop` 用 try/catch 包裹，单帧异常不会冻结游戏；贴图未加载时回退到程序化绘制。

---

## 3. 运行方式

游戏是纯静态前端，**无需构建、无需安装依赖**。

### 方式一：直接打开
用 Chrome / Edge 直接打开 `index.html`。点击画面或按 `Enter` 开始。

### 方式二：本地 HTTP 服务（推荐，避免 `file://` 音频限制）
```bash
cd moon_bullet_demo_v3_6
python3 -m http.server 8000
# 浏览器访问 http://localhost:8000/index.html
```

> 浏览器自动播放策略要求首次用户交互后才能播放音乐：点击画面、按 `Enter` 或任意键即会解锁音频（见 `unlockAudio()`）。

### 操作方式

| 按键 | 功能 |
|------|------|
| `WASD` / 方向键 | 移动 |
| `Shift` | 低速精确移动（擦弹用） |
| `Space` | 月光束（小技能，冷却 5s） |
| `X` | 必杀 / 月蚀大招（消耗满能量） |
| `1` / `2` / `3` | 切换主角（伊丽莎白 / 雅努西娅 / 安娜） |
| `C` | 切换当前主角皮肤 |
| `P` | 暂停 | 
| `R` | 重新开始 |
| `M` | 开关音乐 |
| 鼠标 / 触屏 | 按住拖动角色移动 |

---

## 4. 目录结构与依赖关系

```
moon_bullet_demo_v3_6/
├── index.html                  ← 游戏本体（5189 行，全部逻辑）
├── index_backup_*.html         ← 历史备份
├── README.txt                  ← 玩法与版本说明
├── _deskcheck.js               ← 桌面端检查小脚本
├── assets/                     ← 运行时资源库
│   ├── asset_manifest.json     ← 资源清单（尺寸/透明/来源/授权元数据）
│   ├── audio/                  ← BGM(*.ogg) 与 SFX(*.wav/*.ogg)
│   ├── backgrounds/            ← 关卡/Boss 背景分层 PNG
│   ├── bosses/                 ← Boss 各状态立绘（idle/phase/rage/hit/death）
│   ├── enemies/                ← 小怪 4 状态（idle/attack/hit/death）
│   ├── bullets/                ← 弹幕贴图
│   ├── characters/             ← 玩家立绘/头像/技能 cut-in
│   ├── items/                  ← 掉落道具图标
│   ├── ui/                     ← HUD / 面板 / 图标
│   └── vfx/                    ← 命中/爆炸/清弹/技能特效贴图
├── tools/                      ← Python 资源处理与 QA 脚本（开发期使用）
│   ├── qa_v36_assets.py        ← 资源 QA：缺文件/PNG/alpha/尺寸/manifest 校验
│   ├── import_*_assets.py      ← 从 AI 素材表/ZIP 批量裁切导入
│   ├── process_*.py            ← 背景/角色/UI/掉落/特效的批处理
│   └── analyze_*.py / scan_*.py← 资源与场景分析
├── 七神舞/                       ← 七神武插件设计文档（Markdown）
├── 存档版本/                     ← 资源存档
└── *.md                        ← 各版本设计/变更记录文档
```

### 依赖关系图

```
index.html ──(运行时读取)──▶ assets/*.png, assets/audio/*
        │
        └──(可选元数据)─────▶ assets/asset_manifest.json

tools/*.py ──(开发期写入/校验)──▶ assets/   ◀── 与 index.html 解耦，
                                              不参与游戏运行
```

- **运行时依赖**：仅 `index.html` → `assets/`（贴图与音频）。资源缺失时游戏仍可运行（程序化回退）。
- **开发期依赖**：`tools/` Python 脚本负责把外部 AI 素材裁切、去背景、规范化后写入 `assets/`，并由 `qa_v36_assets.py` 校验。这些脚本**不被游戏引用**，仅供素材流水线使用。

---

## 5. 核心模块职责

下表按 `index.html` 内的逻辑分区列出主要模块（同一文件内通过函数分组组织）。

| 模块 | 主要成员 | 职责 |
|------|----------|------|
| **资源加载** | `ASSET_PATHS`, `BGM_PATHS`, `SFX_PATHS`, `assets`, `sfx`, `drawSprite`, `assetReady` | 声明所有资源路径；用 `Image`/`Audio` 预加载；提供贴图绘制与就绪查询 |
| **音频引擎** | `class AudioEngine`, `audio`, `unlockAudio`, `playSfx`, `syncBgmTrack`, `startMusic` | Web Audio 程序合成节拍/音效 + 采样音效池播放 + BGM 轨道切换 |
| **全局状态** | `state`, `player`, `boss`, `score`, `elapsed`, `loopCount` 等 | 单一可变状态源，所有系统读写 |
| **难度系统** | `diffMul`, `hpMul`, `densMul`, `fireMul`, `grindDmg`, `extraWavesForStage` | Roguelike 强度倍率：随时间/轮回/击杀递增（多数封顶） |
| **角色系统** | `CHARACTERS`, `curChar`, `selectChar`, `cycleSkin`, `powerLevel`, `berserkDmg` | 三主角配置、皮肤、武器 `shoot()`、火力等级与暴走 |
| **玩家系统** | `updatePlayer`, `updatePlayerShots`, `updatePlayerLaser`, `firePlugin`, `useBeam`, `useBomb`, `damagePlayer` | 移动、射击、激光、插件弹幕、技能、必杀、受伤与复活 |
| **插件系统** | `randPlugin`, `firePlugin`, `chainBounce`, `spawnBladeSplit`, 七神武 `qsw*` | 连锁/追踪/幽灵暗刃/七神武终极召唤 |
| **敌人系统** | `ENEMY_DEFS`, `STAGE_WAVES`, `STAGE_PROFILE`, `spawnEnemy`, `spawnWave`, `updateEnemies`, `moveEnemy`, `enemyFire` | 敌人定义、编队、生成、移动 AI、开火调度 |
| **弹幕系统** | `addEnemyBullet`, `spawnCircle/Fan/Wall/...`, `pat*` 系列, `updateEnemyBullets` | 敌弹生成（环/扇/墙/螺旋/花/十字等）与运动、碰撞、擦弹 |
| **Boss 系统** | `BOSS_DEFS`, `BOSS_POOLS`, `selectRandomBoss`, `spawnBoss`, `changeBossPhase`, `updateBoss`, `seraphPatterns`, `finalbossPatterns`, `themeBossPatterns`, `hitBoss`, `defeatBoss` | Boss 随机选取、阶段切换、专属弹幕、DPS 上限、击破流程 |
| **道具系统** | `addItem`, `updateItems`, `collectItem`, `dropFromEnemy` | 掉落生成、吸附、拾取效果 |
| **特效系统** | `addParticle`, `burst`, `sparks`, `addSpriteFx`, `dmgText`, `triggerHitStop`, `setFlash` | 粒子、贴图特效队列、伤害飘字、屏震、闪白、hit-stop |
| **渲染系统** | `draw`, `drawBackground`, `drawPlayer`, `drawEnemies`, `drawBoss`, `drawEnemyBullets`, `drawUI`, `drawSideHud`, `drawOverlay`, `drawTitle` | 分层绘制全部画面元素与 HUD/标题/结算 |
| **主循环 & 输入** | `loop`, `update`, `pointerPos`, `setPointerTarget`, 键鼠/触屏事件监听 | 帧驱动、状态推进、输入采集 |

---

## 6. 关键数据结构

### 全局状态变量（节选）

```js
let state        = 'title';   // 状态机: title|mobs|bossIntro|boss|bossOutro|win|lose
let segment      = 'stage1';  // 当前关卡 stage1..stage8
let bossKind     = 'eclipseboss'; // 当前 Boss 类型
let bossPhase    = -1;        // Boss 阶段 0..4（按血量切换）
let selectedChar = 'witch';   // 当前主角
let elapsed      = 0;         // 本局有效时间（驱动难度）
let loopCount    = 0;         // 轮回次数（通关后 +1，强度大涨）
let killCount    = 0;         // 击杀数（驱动 grindDmg 输出成长）
```

### 实体池（数组）

| 数组 | 元素含义 |
|------|----------|
| `playerShots` | 玩家子弹/刀刃/飞鸟/镰刀 |
| `enemyBullets` | 敌方弹幕（上限 `MAX_ENEMY_BULLETS = 360`） |
| `enemies` | 在场敌人 |
| `items` | 掉落道具 |
| `particles` | 粒子（上限 ~340） |
| `spriteFx` | 贴图特效队列（命中/爆炸/清弹等） |
| `damageTexts` | 伤害飘字 |
| `warnings` / `lasers` | 预警线 / 激光 |
| `chainArcs` / `ghostSlashes` | 连锁锁链弧 / 幽灵暗刃挥砍 |
| `pLasers` / `pBeams` | 玩家激光束 / 暴走分裂光束 |
| `stars` / `fog` | 背景星点 / 雾层 |
| `qsw.swords` / `qsw.locks` | 七神武飞剑 / 锁定环 |

### `player` 对象（核心字段）

```js
const player = {
  x, y,            // 位置
  r: 7,            // 外观半径
  hitR: 2.6,       // 真实受伤判定半径（STG 惯例：远小于外观，便于擦弹）
  visualR: 34,
  hp, maxHp,       // 生命
  energy, maxEnergy, // 必杀能量（擦弹/拾取累积）
  inv,             // 无敌时间
  shootCd, beamCd, bombCd, grazeCd, // 各冷却
  combo,           // 擦弹连击
  power,           // 火力值 0..MAX_POWER(270)，决定 powerLevel() 1..5
  lives: 2,        // 复活次数
  plugin,          // 弹幕插件: null|'chain'|'homing'|'blade'|...
  berserk,         // 暴走计时（金色掉落触发，火力/射速爆发）
};
```

### 配置表结构示例

```js
// 敌人定义
ENEMY_DEFS.bat = { hp, r, score, color, fire, sprite, size, pattern, tier };

// Boss 定义
BOSS_DEFS.eclipseboss = { hp, r, scale, sprite, name, intro, y, theme? };

// 角色定义
CHARACTERS.witch = { name, title, weapon, ultKind, maxHp, speed, slowSpeed,
                     shootCd, auraColor, shoot(lv){...}, skins?[] };
```

---

## 7. 关键类与函数说明

### 7.1 `AudioEngine` 类
> 唯一的类。基于 Web Audio API 程序化合成音乐与音效，避免依赖外部音频文件即可发声。

| 方法 | 职责 |
|------|------|
| `start()` | 创建 `AudioContext`、master/music 增益节点 |
| `tone(freq, dur, type, gain, dest, when)` | 合成单个振荡器音符 |
| `noise(dur, gain, when)` | 合成白噪声脉冲（爆炸/受击） |
| `pad(root, dur, gain)` | 合成和弦铺底 |
| `update(dt, intense)` | 每帧推进节拍器，按 `state`/Boss 阶段切换音色与速度 |
| `shoot/graze/enemyHit/enemyKill/hit/skill/bomb/...` | 各事件音效（叠加采样 `playSfx` + 合成音） |
| `qswSummon/qswAoe/qswSwordFire/...` | 七神武终极演出专属音效 |

### 7.2 主循环与编排

- **`loop(now)`** — `requestAnimationFrame` 回调。计算 `dt`（封顶 0.033s）；若处于 `hitStop` 则只绘制不推进；`try/catch` 保证单帧异常不冻结。
- **`update(dt)`** — 总编排器。依次推进背景、音频、玩家、玩家子弹、道具、敌人、敌弹、预警、激光、粒子、特效、飘字、七神武；再按 `state` 调用对应阶段更新（`updateMobStage` / `updateBossIntro` / `updateBoss` / `updateBossOutro`）。
- **`draw()`** — 总渲染器。按 z 序绘制：背景 → 场景物件 → 敌人 → Boss → 玩家弹/光束/必杀特效 → spriteFx → 敌弹 → 预警/激光 → 粒子 → 道具 → 飘字 → 玩家 → 判定点 → 七神武 → UI → Overlay。

### 7.3 玩家相关

- **`updatePlayer(dt)`** — 处理移动（键盘归一化 / 指针直达）、低速、冷却递减、暴走拖尾；根据 `weapon` 调用 `updatePlayerLaser` 或 `cc.shoot()`；叠加 `firePlugin`；响应 `Space`/`X`。
- **`CHARACTERS[*].shoot(lv)`** — 各角色的射击实现，随火力等级 `lv` 增多弹道。例：伊丽莎白发射穿透血刃 + 侧翼散刃；安娜发射扇形月牙。
- **`useBeam()`** — 月光束小技能（5s CD），对前方窄列与 Boss 造成伤害。
- **`useBomb()`** — 必杀（需满能量）。按 `curChar().ultKind` 分支：`crimsonBeam`（血蚀全屏多列）/ `fallMoon`（坠月 AoE）/ 默认月蚀清弹。均清屏敌弹 + 重创 Boss + 播放 cut-in。
- **`damagePlayer(amount)`** — 受伤入口。无敌期跳过；扣血、掉火力、短无敌；HP≤0 时若有 `lives` 则复活清弹，否则进入 `lose`。

### 7.4 敌人与弹幕

- **`spawnEnemy(type,x,y,move)`** — 按 `ENEMY_DEFS` 实例化敌人，血量乘 `hpMul()/smallHpMul()`，错开首发时间。
- **`spawnWave(index)`** — 执行 `STAGE_WAVES[segment][index]` 波次函数。
- **`enemyFire(e)`** — 按敌人 `pattern` 字段分派到 `pat*` 弹幕函数（`patSnipe`/`patFan3`/`patRing8`/`patSpiral2`/`patFlower`/`patCross`/`patAccelAimed` 等）。
- **`pat*` 系列** — 原子弹幕生成器：瞄准、扇形、环、螺旋、弹墙、花瓣、十字、加速瞄准等。
- **`updateEnemyBullets(dt)`** — 推进敌弹（含刹车弹、波浪弹特殊运动）、出界回收、玩家碰撞（`hitR`）触发 `damagePlayer`、擦弹（`grazeR=34`）充能加分。

### 7.5 Boss 系统

- **`selectRandomBoss(stage)`** — 从 `BOSS_POOLS[stage]` 随机选 Boss，实现「每关 Boss 随机化」。
- **`spawnBoss()`** — 实例化 Boss，血量随 `grindDmg()/loopCount` 放大；设置 **DPS 上限**（`dpsCap`/`dmgCredit`）防止被秒杀。
- **`changeBossPhase(next)`** — 按血量阈值切阶段，给短无敌、清玩家周边弹、播放阶段名与特效。
- **`updateBoss(dt)`** — 移动、回充伤害信用、按血量算阶段、按 Boss 种类分派弹幕（`seraphPatterns`/`finalbossPatterns`/`themeBossPatterns` 或内置 eclipse/mid pattern）。
- **`hitBoss(amount,...)`** — 受击入口，经 `grindDmg()` 与 DPS 信用扣血。
- **`defeatBoss()` / `updateBossOutro(dt)`** — 击破演出、掉落（必掉插件 + 资源）、关卡推进（`stage1→...→stage8`，stage8 后 `loopCount++` 回到 stage1 提升强度）。

### 7.6 插件 / 七神武

- **`firePlugin(dt, firing)`** — 在基础武器之上叠加插件弹幕（对所有主角生效）。
- **`chainBounce(s, from)`** — 连锁弹/小暗刃命中后弹射至最近未命中敌人，记录锁链弧。
- **七神武 `qswActivate/qswAOE/qswSpawnSword/qswSwordHit/qswGiantImpact/updateQishenwu`** — 10 秒终极召唤演出：登场 → 全屏 AOE → 持续剑雨 → 中段爆发 → 终结齐射 → 消散，自成一套不占用普通弹幕。

---

## 8. 游戏状态机与流程

```
            ┌─────────┐  Enter/点击   ┌──────────┐
            │  title  │ ───────────▶ │   mobs   │ ◀──────┐
            └─────────┘  startGame()  └────┬─────┘        │
                 ▲                          │ 波次清空      │
                 │ R 重开                    ▼              │
                 │                    ┌──────────┐         │
                 │                    │bossIntro │         │ 非最终Boss击破
                 │                    └────┬─────┘         │ → 下一关
                 │                         ▼               │
            ┌─────────┐  HP≤0&无命   ┌──────────┐          │
            │  lose   │ ◀───────────│   boss   │          │
            └─────────┘             └────┬─────┘          │
                                         │ defeatBoss()    │
                                         ▼                 │
                                   ┌──────────┐            │
                                   │bossOutro │ ───────────┘
                                   └────┬─────┘
                          finalboss击破 │
                                         ▼
                              loopCount++ 回到 stage1（轮回，强度↑）
```

- **`mobs`**：`updateMobStage` 按 `spawnTimer` 刷 `STAGE_WAVES` 波次 + 肉鸽附加波（`extraWavesForStage`）+ bonus 编队；清空后进 `bossIntro`。
- **`bossIntro`**：Boss 入场缓动，约 5.2s 后转 `boss`。
- **`boss`**：按阶段释放弹幕，玩家输出受 DPS 上限约束。
- **`bossOutro`**：击破演出 + 掉落，按 `stageProgression` 推进关卡；最终 Boss 后进入轮回。
- **难度成长**：所有强度由 `elapsed`（时间）与 `loopCount`（轮回）共同驱动，多数倍率封顶以保证可玩性。

---

## 9. 资源系统与工具脚本

### 9.1 运行时资源加载
- `ASSET_PATHS`（贴图）、`BGM_PATHS`、`SFX_PATHS`（音频）声明所有路径。
- 启动时遍历创建 `Image`/`Audio`，异步加载并标记 `ready`/`failed`。
- **SFX 元素池**：每个音效预建 `SFX_POOL = 5` 个 `Audio` 轮询播放，规避部分浏览器/`file://` 下 `cloneNode` 静音问题。
- `unlockAudio()`：首个用户手势时 `resume()` 音频上下文并静音预播放一遍所有 SFX 以解锁。
- `drawSprite(key,...)`：贴图就绪才绘制，**未就绪则返回 false**，调用方据此回退到程序化绘制（Canvas 手绘）。

### 9.2 `asset_manifest.json`
资源清单，记录每个文件的 `type / size / transparent_background / source / license / commercial_use` 等元数据，供 QA 脚本与素材追溯使用（不被游戏运行逻辑直接读取）。

### 9.3 `tools/` Python 流水线（开发期）

| 脚本 | 职责 |
|------|------|
| `qa_v36_assets.py` | QA 校验：扫描 `index.html` 引用的资源是否存在、PNG 合法性、alpha 透明比例、尺寸、与 manifest 一致性 |
| `import_user_generated_sheets.py` / `import_user_generated_batch2.py` | 从用户 AI 素材表裁切、去背景、规范化后导入 `assets/` |
| `import_curated_zip_assets.py` / `import_next_batch_assets.py` | ZIP 批量素材筛选导入 |
| `process_backgrounds_v2.py` / `process_chars.py` / `process_ui.py` / `process_drops*.py` / `process_yanu_vfx.py` | 背景/角色/UI/掉落/特效批处理 |
| `analyze_assets.py` / `scan_scenes.py` / `scan_ui.py` / `make_contact_sheet.py` | 资源与场景分析、生成预览拼图 |

> 这些脚本依赖 Python 第三方库（`Pillow`、`opencv-python`、`numpy`）。它们与游戏运行**完全解耦**，只在制作/更新素材时使用。更新素材后建议运行 `python3 tools/qa_v36_assets.py` 校验。

---

## 10. 扩展与维护指引

| 需求 | 修改位置 |
|------|----------|
| 新增一种小怪 | 在 `ENEMY_DEFS` 加定义；在对应 `STAGE_WAVES` 波次里 `spawnEnemy('新类型', ...)`；如需新弹幕在 `pat*` 加函数并在 `enemyFire` 分派 |
| 新增 Boss | 在 `BOSS_DEFS` 加定义、`BOSS_POOLS` 加入对应关卡池；若用主题弹幕，配置 `theme` 并在 `BOSS_THEMES`/`themeBossPatterns` 实现 |
| 新增主角 / 皮肤 | 在 `CHARACTERS` 加条目（含 `shoot(lv)` 与 `skins[]`）；在 `selectChar` 键位映射；准备对应 `ASSET_PATHS` 贴图 |
| 新增弹幕升级插件 | 在 `randPlugin` 加入；在 `firePlugin` 实现发射；如需特殊命中行为参考 `chainBounce`/`spawnBladeSplit` |
| 新增弹幕形状 | 在 `BULLET_SHAPE` / `BULLET_KEY` 加映射；在 `buildBulletShape`/`drawEnemyBullets` 实现绘制 |
| 调整难度曲线 | 修改 `diffMul`/`hpMul`/`densMul`/`fireMul`/`grindDmg`/`extraWavesForStage` |
| 新增/替换美术或音频 | 放入 `assets/` 对应子目录，在 `ASSET_PATHS`/`BGM_PATHS`/`SFX_PATHS` 注册；跑 `qa_v36_assets.py` 校验 |

**注意事项：**
- 全部逻辑在单文件中，函数共享闭包内的全局状态；新增系统时遵循「`update*` 改状态、`draw*` 只读」的约定。
- 敌弹数量受 `MAX_ENEMY_BULLETS` 与多处 `densMul()` 上限约束，调密度时注意性能与可玩性。
- 贴图加载失败必须有 Canvas 程序化回退（项目核心鲁棒性设计），新增渲染时保持该模式。

---

*本文档基于对 `index.html`（V3.6，含 V3.11–V3.14 增量）源码的静态分析生成，覆盖架构、模块、关键类/函数、依赖与运行方式。*
