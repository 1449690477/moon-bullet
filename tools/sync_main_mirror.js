#!/usr/bin/env node
/**
 * 同步本地 moon-bullet-main/ 预览镜像。
 *
 * 线上发布以根目录 index.html -> docs/ 为准；很多本机预览仍会打开
 * moon-bullet-main/index.html，所以这里把真正会发布的运行时文件复制过去。
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MIRROR = path.join(ROOT, 'moon-bullet-main');

function requireFile(file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error(`缺少文件：${path.relative(ROOT, file)}`);
  }
}

function copyFile(from, to) {
  requireFile(from);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function rsyncDir(from, to) {
  if (!fs.existsSync(from) || !fs.statSync(from).isDirectory()) {
    throw new Error(`缺少目录：${path.relative(ROOT, from)}`);
  }
  fs.mkdirSync(to, { recursive: true });
  const result = spawnSync('rsync', [
    '-a',
    '--delete',
    '--exclude', '.DS_Store',
    `${from}${path.sep}`,
    `${to}${path.sep}`,
  ], { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`rsync 失败：${path.relative(ROOT, from)} -> ${path.relative(ROOT, to)}`);
  }
}

function main() {
  fs.mkdirSync(MIRROR, { recursive: true });

  copyFile(path.join(ROOT, 'index.html'), path.join(MIRROR, 'index.html'));
  copyFile(path.join(ROOT, 'docs', 'asset-mobile-manifest.js'), path.join(MIRROR, 'asset-mobile-manifest.js'));
  copyFile(path.join(ROOT, 'docs', 'sw.js'), path.join(MIRROR, 'sw.js'));
  copyFile(path.join(ROOT, 'docs', 'pages-asset-manifest.json'), path.join(MIRROR, 'pages-asset-manifest.json'));

  rsyncDir(path.join(ROOT, 'assets'), path.join(MIRROR, 'assets'));
  rsyncDir(path.join(ROOT, 'docs'), path.join(MIRROR, 'docs'));
  rsyncDir(path.join(ROOT, 'docs', 'assets_mobile'), path.join(MIRROR, 'assets_mobile'));

  console.log('moon-bullet-main 本地预览镜像已同步到当前发布版本');
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
