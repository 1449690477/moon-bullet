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
#   1. git add 所有改动
#   2. git commit 提交
#   3. git push 推送到 GitHub
#   4. GitHub Pages 自动重新构建（约1-2分钟）
#   5. 在线游玩页面 https://1449690477.github.io/moon-bullet/ 自动更新

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

# 1. 检查是否有改动
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    echo "[!] 没有任何改动，无需更新。"
    exit 0
fi

# 2. 显示改动概览
echo "[1/3] 本次改动概览："
echo "  修改的文件: $(git diff --name-only | wc -l | tr -d ' ') 个"
echo "  新增的文件: $(git ls-files --others --exclude-standard | wc -l | tr -d ' ') 个"
echo ""

# 3. 提交
echo "[2/3] 提交代码..."
git add -A
git commit -m "$MSG" --quiet
echo "  [✓] 已提交"

# 4. 推送
echo ""
echo "[3/3] 推送到 GitHub..."
git push origin main --quiet
echo "  [✓] 已推送"

# 5. 完成
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
