# 月蚀弹幕项目迁移说明

这个迁移包保留当前可继续开发和运行所需的主要文件: `index.html`、`assets/`、工具脚本、Kiro 任务文档、当前测试、设计/交接文档以及已整理的僚机素材目录。

未打包内容:
- `素材文件夹 一定优先使用！/`: 原始大素材库,按用户要求排除。
- `node_modules/`、`dist/`: 可通过 `npm install` 或重新打包生成。
- 历史 Windows 发布 zip/exe、旧备份目录、临时无扩展大文件。
- `桌面版/app/`、`electron-build/game/`: 它们是桌面打包用的游戏副本,可能不是当前最新根目录内容。需要桌面包时请用当前根目录重新同步/构建。

运行网页版本:
```bash
cd moon_bullet_demo_v3_6
python3 -m http.server 8765
```
浏览器打开 `http://localhost:8765/index.html`。

运行圣冕暴走光炮测试:
```bash
cd moon_bullet_demo_v3_6/tests/saint-wing-berserk
npm install
npm run syntax
npm run regression
npm test
```
