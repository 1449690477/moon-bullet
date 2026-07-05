# 月蚀弹幕发布工作流

## 唯一有效版本

- 当前最新工程目录：`/Users/wanghan/Downloads/moon_bullet_demo_v3/moon_bullet_demo_v3_6`
- 唯一发布源码：`index.html`
- GitHub Pages 发布目录：`docs/`
- 本地预览镜像：`moon-bullet-main/`

以后不要把 `docs/index.html` 当成手写源码改，也不要只改 `moon-bullet-main/index.html` 后直接推送。线上页面只认根目录 `index.html` 构建出的 `docs/`。

## 正确发布命令

```bash
cd /Users/wanghan/Downloads/moon_bullet_demo_v3/moon_bullet_demo_v3_6
./update_github.sh "这里写本次更新公告"
```

脚本会自动执行：

1. `npm run build:pages`：从根目录 `index.html` 生成 `docs/`
2. `npm run sync:main`：把当前发布版本同步到 `moon-bullet-main/`
3. `npm run verify:publish`：检查三份 HTML、移动端 manifest、Service Worker 版本是否一致
4. `npm run smoke:pages`：本地启动 `docs/` 做基础打开测试
5. `git commit && git push`：推送到 GitHub Pages

## 平时本地预览

如果浏览器打开的是：

```text
file:///Users/wanghan/Downloads/moon_bullet_demo_v3/moon_bullet_demo_v3_6/moon-bullet-main/index.html
```

先同步一次：

```bash
npm run release:pages
```

这样本地预览和之后线上发布的版本就是同一份。

## 发布前手动检查

```bash
npm run release:pages
git status --short
```

`npm run verify:publish` 会拦截这些问题：

- `index.html` 和 `docs/index.html` 不一致
- `moon-bullet-main/index.html` 和根目录 `index.html` 不一致
- `asset-mobile-manifest.js` 被重复注入
- `docs/asset-mobile-manifest.js` / `docs/sw.js` 版本号不是当前源码
- 本地预览镜像的移动端资源 manifest 不是最新

## 线上验证

推送后等 GitHub Actions 完成，再用带时间戳的地址绕过缓存：

```text
https://1449690477.github.io/moon-bullet/?v=当前时间戳
```

如果线上和本地表现不一致，第一步先运行：

```bash
npm run release:pages
```

然后重新提交推送。
