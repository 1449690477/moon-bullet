# 月蚀弹幕 Demo —— 项目交接文档（给接手的 AI）

> 本文档面向**接手本项目的另一个 AI 助手**。请先完整读完再动手。
> 这是一个**个人、离线、非商业的同人弹幕射击（STG / danmaku）游戏**，玩家自用，
> 美术/音频均取自一个已解包的二次元手游素材库（仅本地使用）。用户全程授予完全自主权。

---

## 0. 一句话现状

游戏是一个**可玩、完整、单文件的 HTML5 Canvas 弹幕射击游戏**，包含：3 个可选角色、4 幕关卡 + 5 个 Boss
的**肉鸽无限循环**、规律化（东方风）敌人弹幕、3 种可拾取插件（连锁/追踪/幽灵暗刃）、
完整的音画反馈系统、用素材库原生 UI 美化过的界面。目前处于**反复打磨细节**阶段。

---

## 1. 运行方式与"三个副本"（重要）

游戏本体是**一个 `index.html`**（约 3700 行，纯前端，内联 JS/CSS，无构建步骤），直接用浏览器打开即可玩。

项目里存在 **3 份需要保持同步的拷贝**，每次改完 `index.html` 都要同步全部：

| 副本 | 路径 | 说明 |
|---|---|---|
| **主副本（网页版）** | `index.html` + `assets/` | 唯一需要编辑的源文件，所有改动都在这里做 |
| **桌面版（Electron）** | `桌面版/app/index.html` + `桌面版/app/assets/` | Electron 壳，需把主副本的 html 和改动过的资源 `cp` 过去 |
| **Windows 免安装包** | `月蚀弹幕_Windows免安装版_v3.7.zip` | 解压即玩的 zip，含 `index.html` + `assets/` + `▶ 双击开始游戏.bat` + `使用说明.txt` |

**当前最新/正式包 = `月蚀弹幕_Windows免安装版_v3.7.zip`（约 48MB）。**
⚠️ 目录里还有 `..._v3.8.zip` 和无版本号的旧 zip，都是**更旧的历史产物，请忽略**，只认 v3.7 那个最新时间戳的。
（命名有点乱，是迭代遗留；建议接手后统一命名。）

**打包注意**：挂载目录里的文件**无法删除/覆盖**（`Operation not permitted`），所以重新打包时
要先在临时目录构建 zip，再 `cp` 成新文件名（不能原地覆盖旧 zip）。打包时要排除
`assets/_backup_before_user_import` 以及 4 个已被 .ogg 取代的大体积 `bgm_*_loop.wav`（省 ~36MB）。

---

## 2. 技术架构

- **单文件**：`index.html`，全部逻辑在一个 IIFE `(function(){ ... })()` 里。**游戏内部状态全部是私有的**
  （不挂在 window 上），所以 headless 验证时若要读内部值，需临时往代码里注入 `window.__xxx = ...` 探针。
- **画布**：720×1280 竖屏（常量 `W=720, H=1280`）。逻辑分辨率固定，CSS 缩放适配。
- **主循环**：`loop(now)` → `update(dt)` + `draw()`，`requestAnimationFrame`。`loop` 外层包了 try/catch，
  单帧异常不会让游戏永久卡死（`loopErrCount`）。
- **资源加载**：图片用 `new Image(); img.src=...`（相对路径，支持 `file://`）。音频见第 6 节。
- **状态机** `state`：`'title' | 'mobs' | 'bossIntro' | 'boss' | 'bossOutro' | 'win' | 'lose'`
  （注：肉鸽循环后 `win` 实际不再触发，通关直接进入下一轮回）。
- **关卡段** `segment`：`'stage1' → 'stage2' → 'stage3' → 'stage4'`，每段打完出对应 Boss。

---

## 3. 代码结构与关键函数定位（按职责）

> 行号会随编辑漂移，**请用函数名搜索**定位。

**核心循环 / 状态**：`loop` `update` `draw` `startGame` `reset`(在 `resetGame` 附近的匿名 reset) `updateMobStage` `updateBossIntro` `updateBoss` `updateBossOutro`

**玩家**：`updatePlayer` `drawPlayer` `drawPlayerHitbox` `damagePlayer`
- 判定半径 `player.hitR`（=2.6，**远小于外观**，STG 惯例）；外观半径 `player.r`(=7)/`player.visualR`(=34)。
- 受击无敌：`player.inv`（受击 1.3s / 复活 2.6s），`drawPlayer` 里按 `inv` 做闪烁。

**玩家子弹**：`addPlayerShot` `updatePlayerShots` `drawPlayerShots`
- `kind` 种类：`moon/crescent/scythe/bird/feather/chainheart/homingspear/bladebig/bladesmall` 等。
- 渲染层级：玩家弹在下、敌弹在上（见 `draw()` 调用顺序：`drawPlayerShots()` 在前，`drawEnemyBullets()` 在后）。

**敌人**：`spawnEnemy` `updateEnemies` `drawEnemies` `dropFromEnemy` `STAGE_WAVES`(波次表) `STAGE_POOL`(增援敌人池) `spawnBonusEnemies`(等距横排编队增援)
- 敌人血量：小怪走 `smallHpMul()`（更陡），大怪走 `hpMul()`。

**规律化弹幕生成器（东方风，确定性，可躲）**：`enemyFire(e)` 按敌人类型派发，调用
`patFan`(瞄准奇数扇形) / `patRing`(均匀整圈) / `patSpiral`(固定步进旋转螺旋) / `patArcSweep`(正弦摆动扫弧)。
**关键：开火节奏无随机抖动**（`e.fireTimer += e.fireBase`），密度只由 `densBonus()`（确定性整数）加成。
敌人创建时 `vx:0, t:(x/W)*π, fireTimer` 按 x 错开 → 形成从左到右的规律齐射。

**Boss**：`spawnBoss` `BOSS_DEFS`(5 个 Boss 定义) `changeBossPhase` `hitBoss` `defeatBoss`，以及各 Boss 的弹幕脚本
（`seraphPatterns` 等，仍用 `spawnCircle/spawnFanAtPlayer` + `densMul()`，是确定性的）。

**肉鸽难度系统**（全局函数，随 `elapsed` 时间和 `loopCount` 轮回增长）：
`diffMul()`(总强度) `hpMul()`/`smallHpMul()`(血量) `densMul()`(雪量/弹密) `fireMul()`(敌射速)
`grindDmg()`(玩家击杀成长伤害，封顶 +55%) `extraWavesForStage()`(单关附加波次数)。
火力等级 `powerLevel()`(1..5，阈值 54，`MAX_POWER=270`)，靠拾取 + 击杀缓慢累积。
通关后在 `updateBossOutro` 的最后分支 `loopCount++` 回到 stage1，强度递增（无限循环）。

**插件系统**（3 种，随机掉落，见 `randPlugin()`）：
- 装备态 `player.plugin ∈ {null,'chain','homing','blade'}`，由 `firePlugin(dt,firing)` 驱动。
- **连锁(chain)**：射出"月核"弹头(`chainheart`)，命中后 `chainBounce()` 自动弹射到最近未命中敌人，
  敌人间拉出**紫色编织闪电链**（`drawChainLinks` + `drawLightningBolt`，贴图 `vfxChainBolt`/`bulletChainCore`/`vfxChainHit`）。
- **追踪(homing)**：`homingspear` 自动转向最近敌人；被锁定目标上画**锁定环**（`drawHomingLocks`，贴图 `uiLockRing`）。
- **幽灵暗刃(blade)**：**每 3 秒**（`player.pluginCd=3.0`）幽灵现身挥砍 → 射出巨刃 `bladebig` →
  命中敌人 `spawnBladeSplit()` 炸裂成多枚 `bladesmall` 在敌人间弹射（复用 `chainBounce`）。
  幽灵动画数组 `ghostSlashes` + `drawGhostSlashes`；刀光特效用 `vfxBladeArc/vfxBladeTrail/vfxBladeGlow`(刀光素材染紫)。
  音效借用安娜技能音（见第 6 节）。

**特效/粒子**：`addSpriteFx`/`drawSpriteFx`(贴图特效) `addParticle`/`burst`(粒子) `chainArcs`/`ghostSlashes`(瞬时动画数组，在 `updateSpriteFx` 里递减生命)。

**UI**：`drawUI`(顶栏：极简磨砂条，不挡视野) `drawSideHud` `drawTitle`(标题：银月/轮回纹章/华丽横幅) `drawResult`(结算：DEFEAT 贴图) `drawPluginToast`(拾取卡片提示)。

**音频**：`AudioEngine`(类) `audio`(实例) `playSfx` `unlockAudio` `SFX_PATHS` `startMusic` `syncBgmTrack`。详见第 6 节。

---

## 4. 美术资源管线（素材从哪来、怎么加工）

- **素材库根目录**：`素材/`（已解包的 Unity 资源）。最有用的是 `素材/sprites_png/`，按命名分类：
  - `source_uicomframework/`(UI 框/按钮) `source_common/`(大量 btn_/img_/bg) `source_uifight/`(战斗 UI)
  - `source_effect/`(**477 张粒子/特效贴图**，如 `DaoGuang01`刀光、`trail_004`拖尾、`z_guang*`光晕、`yanwu_*`烟雾)
  - `source_icon/`(2454 张图标/立绘) 等。
  - 还有 `素材/textures_png/`（原始贴图图集，如 `M2_Baiye_niao` 鸟图集）。
- **用户上传的专用素材**直接放在 `素材/` 根目录（如 `Firefly*.png` = 连锁/追踪两套弹幕图集；
  `幽灵暗刃*.png` = 幽灵暗刃的图标/弹幕图集/概念图）。
- **切图工作流**：图集是透明 PNG，用 `scipy.ndimage.label` 对 alpha 通道做连通域分析自动框出每个精灵，
  做成贴标号的 contact sheet 让 AI 肉眼辨认，再按 bbox `crop` + `getbbox()` 去边，存进 `assets/`。
  （本仓库里 `_make_plugins.py`、`_make_plugin_cards.py` 等是历史生成脚本，可参考但非必需。）
- **染色技巧（重要坑）**：`source_effect` 的特效贴图是**白色图形 + alpha 通道存形状**（RGB 几乎全白）。
  染色时**必须保留原始 alpha**，只把 RGB 按亮度插值染成目标色；
  **千万不要用亮度重算 alpha**——否则透明区会变成不透明白方块（曾踩过这个坑，导致"白色贴图残留"）。
- 成品资源目录：`assets/bullets`(34) `assets/vfx`(35) `assets/ui`(29) `assets/audio`(33)
  `assets/enemies`(12) `assets/bosses`(22) `assets/characters`(70) `assets/backgrounds`(10)。
- 资源在代码顶部的 `ASSET_PATHS` 注册（key→相对路径），用 `assetReady(key)` 判断是否加载完成，
  未加载时大多有程序化降级绘制。

---

## 5. 沙盒 / 运行环境注意事项（接手的 AI 必看）

1. **挂载目录无法删除文件**：`素材/` `assets/` 等用户挂载目录里删除会报 `Operation not permitted`，
   只能新增/覆盖写入（覆盖已存在文件 OK，但 zip 那种"先删再建"会失败 → 用新文件名）。临时目录(scratchpad)可正常删。
2. **headless 验证用 Playwright**：`node _verify2.js <html> <out.png>`（脚本在 scratchpad）。
   - 运行环境是 **aarch64**，Playwright 的 chromium 也是 arm64。
   - 曾出现缺 `libXdamage.so.1` 导致浏览器起不来；`ports.ubuntu.com` 被网络白名单挡(403)拿不到 arm64 deb。
     **解决办法**：用 gcc 编译了一个 4 符号的**桩 .so**（`XDamageCreate/Destroy/QueryExtension/Subtract` 空实现，
     headless 下根本不调用）放进 `_libs/all/`，再用 `patchelf --set-rpath` 打进 chromium 二进制 +
     launch 时传 `env:{LD_LIBRARY_PATH:...}`。`_verify2.js` 里已带 `LD_LIBRARY_PATH`。若环境重置导致浏览器又起不来，
     大概率是这个 .so 又没了，按上述重做即可。
   - 验证套路：复制 `index.html` 到 scratchpad，必要时注入 `window.__dbg=()=>({...})` 探针或强制
     `player.plugin='blade'` 之类，跑 60~120 帧，截图 + 裁剪放大 + 用 Read 工具肉眼看。
3. **音频自动播放策略**：浏览器要求首次播放在用户手势内触发。已实现 `unlockAudio()`（首个 keydown/pointerdown 调用，
   启动 AudioContext + 静音预热所有音效池元素）。音效用**元素池轮询**播放（**不要用 `cloneNode().play()`**——
   在 file:// 下会被静默拦截，曾导致"完全没声音"）。
4. **网络**：`archive.ubuntu.com` 可达，`ports.ubuntu.com` 不可达；`pip install --break-system-packages` 可用
   （scipy/patchelf 都是这么装的）。

---

## 6. 音频系统细节

- BGM：HTML `<audio id=bgmEl>`，`desiredBgmPath()`/`syncBgmTrack()` 按状态切轨；`M` 键 `toggleMusic()`。
- SFX：`SFX_PATHS`(key→文件) → 每个 key 一个 **5 个元素的池** `sfx[key]`，`playSfx(key,vol,minGap)` 轮询播放、
  支持重叠、`minGap` 节流。`unlockAudio()` 在首手势解锁。
- 程序化音色：`AudioEngine` 用 WebAudio 合成（`tone/noise/pad`），`master` 增益 0.5。
  打击反馈方法：`audio.enemyHit()`(样本+高频tick) `audio.enemyKill(heavy)`(样本+低频砰+噪爆)
  `audio.hit()`(玩家受击，响亮+冲击) `audio.bladeCast()/bladeSplit()`(幽灵暗刃，借 `se_skill_beam/se_skill_bomb`)。
- **可用音频仅 `assets/audio/se_*`（命中/死亡/受击/激光/技能/Boss/警告/胜负）**。素材库里**没有其它可直接用的独立音频**
  （CRI 引擎的语音/BGM 封装在未解包 bundle 里，取不出来）。用户若要更好音效，需自己提供 wav/ogg/mp3 丢进素材目录。

---

## 7. 用户偏好与协作要点（非常重要，照着做能少返工）

- **语言**：全程中文沟通。
- **授权**：用户给了完全自主权，但**非常在意细节质量**，会反复要求打磨：视觉特效、打击反馈、弹幕规律性、难度手感。
- **必须用用户的素材**：当用户提供贴图时，**严禁自己随便画/替代**——要从他给的 PNG 里切图加工。
  （他多次强调"必须用我的素材，不要自己随便制作"。）程序化特效代码可以自己写，但贴图要用他的。
- **审美取向**：暗黑哥特 + 月光/银白/冰蓝/淡紫；角色气质参考《爆裂魔女》的"亚努西亚"（银白长发、月光、羽毛、锁链、月轮、冰蓝圣纹）。
- **手感诉求**：要"爽游刷刷刷"的肉鸽成长感；敌人/弹幕要**有规律可预判**（学东方）；小怪不能被秒（要慢慢变肉）；
  玩家判定点要小好躲；敌我弹幕层级要分明；每次命中/击杀/受击都要有明显音画反馈。
- **交付习惯**：每轮改完都要 (1) headless 验证无报错 (2) 同步 3 副本 (3) 重新打 Windows zip (4) 用 present_files 给文件。

---

## 8. 已完成清单（截至本次交接）

- [x] 3 角色（witch 集火、yanuxiya 激光+飞鸟[4皮肤+鸟动画]、anna 集火[4皮肤]），标题页可选
- [x] 4 幕关卡 + 5 Boss（midboss/main/seraph/archon/final），**肉鸽无限循环 + 随时间/轮回增长强度**
- [x] 规律化（东方风）敌人弹幕 + 等距编队增援；密度/血量/射速随难度确定性增长
- [x] 玩家小判定点(hitR=2.6) + 受击无敌闪烁 + 弹幕层级（玩家弹在下/敌弹在上）
- [x] 3 插件：连锁(月核+闪电链弹射) / 追踪(锁定环) / 幽灵暗刃(幽灵挥砍→巨刃→分裂弹射)，随机掉落 + 拾取卡片提示
- [x] 幽灵暗刃刀光特效（用素材库 DaoGuang/trail/光晕 染紫 + 拖尾/残影/粒子），已修掉白方块残留
- [x] 素材库原生 UI 美化（标题银月/轮回纹章/华丽横幅、极简顶栏不挡视野、DEFEAT 结算贴图、锁定环等）
- [x] 完整音画反馈（命中/击杀/受击音效加强 + 程序化打击层 + 首手势解锁音频 + 元素池播放）

## 9. 可能的后续工作（用户尚未要求或可继续优化）

- 从素材库新增**全新敌人种类 / 新 Boss 立绘**（目前是 4 关 5 Boss 循环复用 + 增援）。
- 更多/可配置的 Boss 弹幕谱面（留缝弹幕墙、螺旋+激光组合等）。
- 把幽灵暗刃巨刃换成更"镰刀"的造型，或加旋转刀光环。
- 统一 zip 命名、清理历史备份文件（`assets_backup_*`、多个旧 zip、scratchpad 脚本）。
- 平衡性微调（触发间隔、伤害曲线、雪量上限 `MAX_ENEMY_BULLETS=900`）。
- 若用户提供真实音效文件，替换/扩充 SFX。

---

## 10. 快速上手清单（接手第一步）

1. 用浏览器打开 `index.html` 试玩一局，感受现状。
2. 通读 `index.html` 里第 3 节列出的关键函数（搜函数名）。
3. 看一眼 `素材/sprites_png/source_effect`、`素材/Firefly*.png`、`素材/幽灵暗刃*.png` 了解可用素材。
4. 改动 → headless 验证（`_verify2.js`，注意 libXdamage 桩）→ 同步桌面版 + 重打 v3.x zip → present_files 交付。
5. 记住用户偏好（第 7 节）：用他的素材、规律性、反馈感、暗黑月光美学、中文沟通。

祝接手顺利。
