# 月蚀弹幕 · AI 接手开发指南

> 本文档专为接手本项目开发的 AI 助手编写。读完这一篇，你就能完整理解项目架构、开发规范和发布流程。

---

## 1. 项目本质

**月蚀弹幕** 是一款东方风纵版弹幕射击游戏（Bullet Hell STG）。

| 属性 | 值 |
|------|-----|
| 技术栈 | 纯前端 HTML5 Canvas 2D + Web Audio API，零框架零依赖 |
| 核心文件 | 单文件 `index.html`（约 14400 行），IIFE 闭包包含全部逻辑 |
| 逻辑分辨率 | 720×1280（9:16 竖屏） |
| 音效 | Web Audio 程序合成（无外部音频文件，BGM 用 OGG/WAV） |
| 桌面版 | Electron 打包（Windows 独立 exe） |
| 网页版 | GitHub Pages，点击即玩 |

**没有后端。** 所有游戏逻辑在浏览器里跑，"服务器"只是放静态文件的地方。

---

## 2. 仓库结构

```
moon-bullet/
├── index.html              # ★ 核心游戏代码（14433行，IIFE 单文件）
├── package.json            # npm scripts（build:pages / smoke:pages / test）
├── update_github.sh        # 一键提交+推送脚本
├── deploy_to_cos.py        # 腾讯云COS部署脚本（备用）
│
├── assets/                 # 运行时资源（573文件，PC用PNG+OGG/WAV）
│   ├── characters/         #   角色立绘/头像
│   ├── bosses/             #   Boss贴图
│   ├── enemies/            #   敌人贴图
│   ├── bullets/            #   弹幕贴图
│   ├── vfx/                #   特效贴图
│   ├── backgrounds/        #   背景图
│   ├── audio/              #   BGM(OGG) + 音效(WAV/OGG)
│   ├── ui/                 #   UI图标
│   ├── player/             #   可玩角色"母亲之命"专属资源
│   ├── saintcrown/         #   圣冕圣械僚机素材
│   ├── companions/         #   夜棺巡礼浮游炮僚机素材
│   └── items/              #   道具图标
│
├── docs/                   # ★ GitHub Pages 发布目录（905文件，含移动端WebP变体）
│   ├── index.html          #   构建生成的发布版
│   ├── assets/             #   PC资源（PNG）
│   ├── assets_mobile/      #   移动端资源（WebP，省60%体积）
│   ├── sw.js               #   Service Worker（离线缓存）
│   ├── asset-mobile-manifest.js  # 移动端资源清单
│   └── .nojekyll           #   禁用 Jekyll
│
├── tools/                  # 开发工具（48文件）
│   ├── build_pages.py      #   ★ GitHub Pages 构建脚本
│   ├── smoke_pages.js      #   ★ Puppeteer 烟测脚本
│   └── *.py                #   图像处理/裁切/去绿幕等 Python 脚本
│
├── tests/                  # 测试
│   └── saint-wing-berserk/ #   圣冕僚机单元测试
│
├── electron-build/         # Electron 桌面版打包
│   ├── main.js             #   ★ Electron 主进程（GPU优化开关集）
│   ├── package.json        #   打包配置
│   └── game/               #   打包用游戏副本（.gitignore 排除）
│
├── s生命之母素材/           # 母亲之命角色原始素材（绿幕，需加工）
├── 浮游炮僚机素材/          # 夜棺巡礼僚机原始素材（绿幕，需加工）
│
└── 各种 *.md 文档           # 开发笔记/设计文档/交接文档
```

### 被 .gitignore 排除的内容（不入库）

| 排除项 | 原因 |
|--------|------|
| `node_modules/` | npm install 恢复 |
| `electron-build/game/` | assets/ 的副本，打包前同步 |
| `electron-build/dist/` | 打包输出，每次重新生成 |
| `*.zip` | 大型打包产物，单独分发 |
| `assets_backup*/` | 旧版本备份 |
| `index.html.bak_*` | 代码备份 |
| `素材文件夹 一定优先使用！/` | 11G 的无关 Unity 解包资源 |
| `僚机素材和文档/` 等 | 旧素材源，新设备不需要 |
| `.workbuddy/` | WorkBuddy 工作区数据 |
| `_nccheck.js` / `_mlcheck.js` 等 | 临时检查脚本 |

---

## 3. 核心架构

### 3.1 单文件 IIFE 结构

```javascript
// index.html 结构
(function() {
  // ── 常量定义 ──
  const W = canvas.width;   // 720
  const H = canvas.height;  // 1280
  const MAX_ENEMY_BULLETS = 880;
  
  // ── 全局状态（闭包共享，无 OOP 继承）──
  let state = 'title';      // title|mobs|bossIntro|boss|win|lose
  let player = {...};
  let enemies = [];
  let boss = null;
  let perfLevel = 0;        // 0满特效 / 1精简 / 2极简
  
  // ── 资源系统 ──
  const assets = {};        // Image 对象缓存
  
  // ── 主循环 ──
  function loop(now) {
    try {
      update(dt);   // 改状态
      draw();       // 只读渲染
    } catch(err) { /* 单帧异常不冻结 */ }
    requestAnimationFrame(loop);
  }
  
  // ── update 函数族（改状态）──
  function update(dt) {...}        // L4638 总调度
  function updatePlayer(dt) {...}  // L8801
  function updateEnemies(dt) {...} // L10168
  function updateBoss(dt) {...}    // L10403
  
  // ── draw 函数族（只读渲染）──
  function draw() {...}            // L10884 总调度
  
  // ── 音频系统 ──
  class AudioEngine {...}          // Web Audio 程序合成
  
  // ── 启动 ──
  requestAnimationFrame(loop);
})();
```

### 3.2 关键约定（必须遵守）

| 约定 | 说明 |
|------|------|
| **update\* 改状态，draw\* 只读** | 二者由 loop 串联，draw 绝不修改游戏状态 |
| **贴图未加载 → Canvas 程序化手绘回退** | `assetReady(key)` 检查，未加载用代码画 |
| **单帧异常 try/catch 不冻结** | loop 外层 try/catch 包裹，rAF 永远重新调度 |
| **compositeOperation 泄漏防护** | draw() 开头强制 `setTransform(1,0,0,1,0,0)` + `globalCompositeOperation='source-over'` + `globalAlpha=1` |
| **draw 函数用 try/finally 保证 restore** | 防止异常导致 ctx.save() 无对应 ctx.restore() |
| **无面向对象继承** | 全部逻辑共享闭包全局状态，仅 AudioEngine 是类 |

### 3.3 五位可玩角色

| 角色 | key | 特色 | 大招 |
|------|-----|------|------|
| 雅努西娅 | `witch` | 血刃穿透 | crimsonBeam 猩红光束 |
| 雅努西娅B | `yanuxiya` | 激光+飞鸟 | fallMoon 坠月 |
| 安娜 | `anna` | 镰刀月牙 | 月蚀清弹 |
| 夜裁 | `reaver` | 瞄准射线+空间斩+浮游刀锋 | voidJudgement 终焉裁界（黑洞三段式） |
| 母亲之命 | `motherlife` | 生命共鸣+众生胎宫 | 胎宫展开（治疗+反击） |

```javascript
let selectedChar = 'witch'; // witch | yanuxiya | anna | reaver | motherlife
```

### 3.4 僚机系统

| 僚机 | 函数前缀 | 说明 |
|------|---------|------|
| 夜裁浮游刀锋 | `drawNrWingmen` / `drawNrBlades` | 夜裁专属，环绕机体 |
| 圣冕圣械 | `drawSaintWing` / `drawScFx` | 可装备僚机，审判光束 |
| 夜棺巡礼·八芒浮骸 | `drawNightCoffin` | 脱手浮游炮阵列，冲撞/激光双模式 |

### 3.5 性能自适应系统

```javascript
// 启动时硬件探测（L850 detectHardware IIFE）
// 通过 CPU核数 / 内存 / GPU型号 / 像素比 打分
// → 给出初始 perfLevel (0满特效/1精简/2极简)

// 运行时帧时自适应（loop 内）
// smoothFrameMs > 40 → 立即降到极简档
// 连续 0.8s 偏慢 → 降一级
// 连续 0.8s 流畅 → 升一级

// 移动端判断（L82-87）
IS_MOBILE_RUNTIME = IS_TOUCH_DEVICE || IS_VERY_NARROW
// IS_TOUCH_DEVICE: (pointer:coarse) / userAgentData.mobile / UA关键字
// IS_VERY_NARROW: window.innerWidth <= 500
// ⚠️ 不要用纯视口尺寸判断移动端（1280×720桌面会被误判）
```

### 3.6 移动端适配

```javascript
// 移动端自动：
// - 使用 WebP 资源（assets_mobile/）省60%体积
// - 默认 perfLevel=2（极简档）
// - 音效首次使用时重建（省内存）
// - preload='none'（不预加载音频）
// - 触屏技能按钮（drawSkill 内 registerTouchSkill）
```

---

## 4. 开发环境搭建

### 4.1 克隆并安装

```bash
git clone https://github.com/1449690477/moon-bullet.git
cd moon-bullet

# 恢复依赖
npm install

# Electron 打包依赖（如需打包 exe）
cd electron-build && npm install && cd ..
```

### 4.2 日常开发

```bash
# 直接用浏览器打开 index.html 开发
open index.html                    # Mac
# 或起本地服务（避免 file:// 跨域）
python3 -m http.server 8000
# 访问 http://localhost:8000
```

### 4.3 本地预览发布版

```bash
# 构建发布目录
npm run build:pages

# 烟测验证（需安装 Chrome）
npm run smoke:pages

# 本地预览 docs/
python3 -m http.server 8000 --directory docs
```

---

## 5. 发布流程

### 5.1 发布网页版（GitHub Pages）

```bash
# 1. 改完 index.html 后，重建发布目录
npm run build:pages

# 2. 烟测验证（可选但推荐）
npm run smoke:pages

# 3. 一键提交+推送
./update_github.sh "V1.0.3: 修复XXX"
```

推送后 GitHub Pages 自动从 `docs/` 目录部署，**1-2 分钟后** 在线页面更新：
- 在线游玩：https://1449690477.github.io/moon-bullet/
- 构建状态：https://github.com/1449690477/moon-bullet/actions
- Pages 设置：https://github.com/1449690477/moon-bullet/settings/pages

### 5.2 发布 Windows 独立 exe

```bash
# 1. 同步最新 index.html 和 assets/ 到打包目录
cp index.html electron-build/game/
rsync -av --exclude='_backup_before_user_import' assets/ electron-build/game/assets/

# 2. 打包
cd electron-build
npx electron-packager . 月蚀弹幕 --platform=win32 --arch=x64 --out=dist --overwrite --asar

# 3. 修正 exe 文件名（--executable-name 会双拼 .exe.exe）
mv dist/月蚀弹幕-win32-x64/月蚀弹幕.exe.exe dist/月蚀弹幕-win32-x64/月蚀弹幕.exe

# 4. 压缩
cd dist
zip -9 -r ../../月蚀弹幕_Windows独立exe版_vX.X.zip 月蚀弹幕-win32-x64 -x "*.DS_Store"
```

### 5.3 update_github.sh 用法

```bash
./update_github.sh "更新说明"
# 自动执行：git add -A → git commit → git push
# GitHub Pages 收到 push 后自动重新构建
```

⚠️ 首次推送需认证：
- Username: `1449690477`
- Password: GitHub Personal Access Token（https://github.com/settings/tokens 生成，勾选 repo）
- 认证一次后 macOS 钥匙串记住

---

## 6. Electron GPU 优化（main.js）

```javascript
// electron-build/main.js 已配置的 GPU 开关集：
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');    // Canvas 2D 走 GPU（最关键）
app.commandLine.appendSwitch('enable-2d-canvas-image-chromium');
app.commandLine.appendSwitch('disable-software-rasterizer');     // 防回退软渲染
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('renderer-process-limit', '4');
// Windows 显式 D3D11
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('use-angle', 'd3d11');
}
```

---

## 7. 资源系统

### 7.1 资源加载

```javascript
// 资源清单在 index.html 顶部
const ASSET_PATHS = {
  bgStage1: 'assets/backgrounds/bg_stage1.png',
  // ... 460 个资源
};

// 加载后缓存到 assets 对象
function assetReady(key) {
  return assets[key] && assets[key].complete && assets[key].naturalWidth > 0;
}

// 移动端自动替换为 WebP
function mobileAssetPath(key) {
  return (IS_MOBILE_RUNTIME && MOBILE_ASSET_PATHS[key]) 
    ? MOBILE_ASSET_PATHS[key]  // assets_mobile/xxx.webp
    : ASSET_PATHS[key];         // assets/xxx.png
}
```

### 7.2 资源处理工具

```bash
# tools/ 目录下的 Python 脚本（需要 Pillow/OpenCV/numpy）
# 裁切、去绿幕、规范化、QA
python3 tools/某脚本.py
```

### 7.3 新增资源流程

1. 把原始素材放到对应的素材源文件夹（如 `s生命之母素材/`）
2. 用 `tools/` 下的 Python 脚本处理（去绿幕、裁切、规范化）
3. 处理后的 PNG 放到 `assets/` 对应子目录
4. 在 `index.html` 的 ASSET_PATHS 里注册
5. `npm run build:pages` 重建 docs/（自动生成 WebP 变体）

---

## 8. 版本历史

| 版本 | 要点 |
|------|------|
| V3.6 | 基础版 |
| V3.11-V3.14 | 弹幕简化、Boss随机化、文档化 |
| V5.x | 新增第四角色"夜裁" |
| V6.x | 飞剑光效重做、幽灵暗刃、暴走态 |
| V7.x-V8.5 | 免安装版+独立exe版并行发布 |
| V0.8 | 版本号统一为 0.x 系列 |
| V0.9 | 硬件自适应 + GPU优化 + Canvas 2D加速 |
| V0.10 | 新增"母亲之命"可玩角色 |
| V1.0 | 移动端自适应 + Service Worker + WebP资源 + GitHub Pages |
| V1.0.1 | 修复 1280×720 桌面被误判为移动端 + Puppeteer 烟测 |
| V1.0.2 | 入库近期素材源便于跨设备开发 |

---

## 9. 常见问题

### Q: 白屏冻结？
A: 检查 `compositeOperation` 泄漏。draw() 开头必须有强制重置：
```javascript
ctx.setTransform(1, 0, 0, 1, 0, 0);
ctx.globalCompositeOperation = 'source-over';
ctx.globalAlpha = 1;
```

### Q: 桌面窗口被误判为移动端？
A: 不要用纯视口尺寸判断移动端。用 `(pointer: coarse)` + UA 关键字 + `userAgentData.mobile`。仅 ≤500px 才 fallback 到尺寸判断。

### Q: 推送失败 "Authentication failed"？
A: 去生成新 token，首次推送时输入。`git config --global credential.helper osxkeychain` 让钥匙串记住。

### Q: GitHub Pages 没更新？
A: 1) 确认 Pages Source 设为 `main` / `/docs`；2) 等 1-2 分钟；3) 浏览器硬刷新（Cmd+Shift+R）；4) 清除 Service Worker 缓存。

### Q: 打包 exe 后双拼 .exe.exe？
A: `--executable-name=月蚀弹幕.exe` 会变成 `月蚀弹幕.exe.exe`。打包后手动 rename，或不传该参数。

### Q: 11G 的"素材文件夹"是什么？
A: 是其他游戏的 Unity 解包资源，**跟月蚀弹幕无关**，没入库。如果需要用 U盘/网盘传。

---

## 10. 在线资源

| 资源 | 地址 |
|------|------|
| 代码仓库 | https://github.com/1449690477/moon-bullet |
| 在线游玩 | https://1449690477.github.io/moon-bullet/ |
| Pages 设置 | https://github.com/1449690477/moon-bullet/settings/pages |
| 构建状态 | https://github.com/1449690477/moon-bullet/actions |
| API Token | https://github.com/settings/tokens |
| GitHub 用户名 | `1449690477` |

---

## 11. 给接手 AI 的最后叮嘱

1. **先读 `index.html` 的 draw() 函数（L10884）**，它列出了所有渲染管线的顺序，是理解整个游戏的入口
2. **改 draw 函数时务必用 try/finally 包裹 ctx.restore()**，防止异常导致状态泄漏
3. **新增角色时**：参考 `motherLifeState` 的结构，在 update/draw 管线里加对应函数
4. **改完代码必须跑 `npm run build:pages`** 重建 docs/，否则网页版不会更新
5. **推送前跑 `npm run smoke:pages`** 烟测，14/14 通过再推
6. **用户不熟悉 git**，改完代码主动提示用 `./update_github.sh "说明"` 推送
7. **版本号**在 index.html 的 `<title>` 和 `<div id="badge">` 两处，改版本时同步更新

祝开发顺利。
