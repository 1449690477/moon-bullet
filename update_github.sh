#!/bin/bash
# 月蚀弹幕 · 一键更新 GitHub Pages
# ============================
# 用法：
#   ./update_github.sh "本次更新说明"
#
# 例如：
#   ./update_github.sh "V0.10: 新增夜棺巡礼浮游炮僚机系统"
#
# 执行后会自动：
#   1. 构建 docs/ 发布目录
#   2. 同步 moon-bullet-main/ 本地预览镜像
#   3. 检查 index/docs/mainMirror 是否一致
#   4. smoke 测试 docs/
#   5. git add / commit / push 到 GitHub Pages

set -e

cd "$(dirname "$0")"

if [ -z "$1" ]; then
    echo "用法: ./update_github.sh \"本次更新说明\""
    echo "例如: ./update_github.sh \"V0.10: 新增浮游炮僚机\""
    exit 1
fi

MSG="$1"

echo "=========================================="
echo "  月蚀弹幕 · 一键更新 GitHub Pages"
echo "=========================================="
echo ""

# 1. 构建并验证真正会发布的版本
echo "[1/5] 构建、同步、验证 Pages 版本..."
npm run release:pages
echo "  [✓] 发布目录与本地预览镜像已确认一致"
echo ""

# 2. 检查是否有改动
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    echo "[!] 没有任何改动，无需更新。"
    exit 0
fi

# 3. 显示改动概览
echo "[2/5] 本次改动概览："
echo "  修改的文件: $(git diff --name-only | wc -l | tr -d ' ') 个"
echo "  新增的文件: $(git ls-files --others --exclude-standard | wc -l | tr -d ' ') 个"
echo ""

# 4. 提交
echo "[3/5] 提交代码..."
git add -A
git commit -m "$MSG" --quiet
echo "  [✓] 已提交"

# 5. 推送
echo ""
echo "[4/5] 推送到 GitHub..."
git push origin main --quiet
echo "  [✓] 已推送"

echo ""
echo "[5/5] 发布后请查看 GitHub Actions 状态："
echo "  https://github.com/1449690477/moon-bullet/actions"

echo ""
echo "=========================================="
echo "  更新完成！"
echo "=========================================="
echo ""
echo "  在线游玩页面（1-2分钟后自动更新）："
echo "  https://1449690477.github.io/moon-bullet/"
echo ""
echo "  代码仓库："
echo "  https://github.com/1449690477/moon-bullet"
echo ""
echo "  查看构建状态："
echo "  https://github.com/1449690477/moon-bullet/actions"
echo "=========================================="
