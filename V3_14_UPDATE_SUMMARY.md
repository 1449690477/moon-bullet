# 月蚀弹幕 V3.14 更新总结

更新时间：2026-06-20

本次按你的四点要求全自动完成：联网研究爆裂魔女、修复地图背景、重写弹幕发射器、用素材库UI重构。

---

## 一、爆裂魔女研究
确认素材来源是 **爆裂魔女 (Burst Witch / com.giantglobal.blmn)** —— 一款竖版弹幕游戏，主打"華麗的彈幕"与多魔女角色。其战斗 UI 风格：暗色玻璃面板 + 金/绯红描边、底部角色头像与血/能量条、圆形技能按钮。本次 UI 重构据此进行。

---

## 二、地图背景修复（重点）
**问题**：之前误用了 `source_home/fight/background/` 里的图——那些是带"研究所""混沌爪牙增幅"等文字的**宣传图/活动 banner**，不是关卡地图。

**修复**：深挖素材库找到真正的场景资源，重新生成（覆盖同名文件，代码引用不变）：
- `source_home/img_bg_youanmijing` (1080×1920 完整竖版暗黑场景) → bg_void_realm / bg_dark_sanctum
- `prefab_scene/fightsceneprefab/scene1~3` (SKY+山丘+云 视差分层，脚本合成竖版场景) → bg_shadow_depths / bg_chaos_rift
- `source_common/bg/img_shenyuan_boss_bg` (深渊Boss背景) → bg_abyss_core

> 说明：`prefab_land/*` 全是 3D 场景的材质贴图（col/mos/nrm 法线贴图），不能直接当 2D 背景，已排除。
> 预览图：`tools/preview_backgrounds_v2.png`

---

## 三、弹幕发射器重写（核心）
**问题**：满屏弹幕、无法躲避。

**根因**：`MAX_ENEMY_BULLETS = 900` 太高 + 大量杂兵同时发射环形/螺旋弹。

**重写方案**：
1. **弹幕总上限 900 → 360**
2. **杂兵阶段软上限 150 发**（Boss 阶段 300）：超过即暂停杂兵开火，永不满屏
3. **人群自动降频**：屏上敌人 >5 时，整体开火间隔随数量拉长
4. **分层弹幕设计**（爆裂魔女/东方STG 原则）：
   - 杂兵 (tier1-2)：只发**瞄准弹**（玩家横向走位即可躲）
   - 精英 (tier3)：5方向扇形 / 慢速8方向环（旋转偏移形成走廊）
   - 重型 (tier4)：固定步进螺旋 / 慢速12环
5. 首发时间错开，避免齐射

---

## 四、新增内容（素材库提取）
### 10 个新敌人（数据驱动渲染）
wraith 怨灵、shade 暗影、specter 幽魂、reaper 死神、phantom 幻影、banshee 女妖、cultist 邪教徒、fiend 恶鬼、warlock 术士、archfiend 大恶魔
- 每个 4 状态（idle/attack/hit/death），各自专属弹幕模式

### 5 个新 Boss（主题化弹幕 + 随机出现）
voidlord 虚空领主、abysswalker 深渊行者、voidtitan 虚空泰坦、ancientone 古神、darkqueen 暗夜女王
- 每个 6 状态，5 套主题配色（void/abyss/titan/ancient/queen），弹幕骨架统一可躲避

### 关卡扩展
新增第 5~8 幕（幽冥深渊/终焉之境/虚空裂隙/混沌之核），Boss 按关卡池随机出现

### 弹幕贴图
新增 29 个弹幕贴图（雪花/花瓣/水晶/能量球/糖果/音符/刀光等）

---

## 五、UI 重构（爆裂魔女风格）
- **圆形技能按钮**：用素材库技能图标 + 圆形金框，就绪时金色脉冲发光，冷却扇形遮罩
- **底部状态面板**：暗金玻璃质感 + 顶部金色高光线 + 头像金色圆框
- 提取素材：`source_icon/skill` 技能图标、`frame_ui/jx` 圆框、`frame_line2` 分隔线

---

## 六、处理脚本（tools/）
- `process_new_assets.py` — 敌人/Boss/弹幕批处理
- `process_backgrounds_v2.py` — 真实场景背景生成
- `process_ui.py` — UI 元素提取
- `scan_scenes.py` / `scan_ui.py` — 素材扫描
- 预览图：`preview_*.png`

---

## 测试建议
浏览器打开 `http://localhost:8123/index.html`（或本地直接开 `桌面版/app/index.html`），重点验证：
1. 弹幕是否变稀疏、可躲避（杂兵瞄准弹、精英环/扇）
2. 第 4~8 幕背景是否为暗黑场景（不再有文字宣传图）
3. 新敌人/随机 Boss 是否正常显示
4. 圆形技能按钮与底部面板观感
