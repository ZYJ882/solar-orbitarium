#!/usr/bin/env bash
# ============================================================
# 太阳系观测站 · 一键发布到 GitHub（自动触发 APK 构建）
# 用法:  bash publish.sh
# 前置:  git + GitHub CLI (gh)，脚本会自动检测并给出安装指引
# 说明:  推送完成后 GitHub Actions 自动编译 APK，
#        并自动发布到仓库的 Releases「最新构建」页面，无需打标签。
# ============================================================
set -euo pipefail

REPO_DEFAULT="solar-orbitarium"

echo ""
echo "  🪐 太阳系观测站 · 一键发布到 GitHub"
echo "  ─────────────────────────────────────"

# ---- 1. 检查 git ----
if ! command -v git >/dev/null 2>&1; then
  echo "❌ 未找到 git。请先安装：https://git-scm.com/downloads"
  exit 1
fi

# ---- 2. 检查 gh ----
if ! command -v gh >/dev/null 2>&1; then
  echo "❌ 未找到 GitHub CLI (gh)。安装方式："
  echo "   macOS    brew install gh"
  echo "   Ubuntu   sudo apt install gh"
  echo "   Windows  winget install GitHub.cli（或改用 publish.bat）"
  echo "   其它     https://cli.github.com"
  exit 1
fi

# ---- 3. 登录（首次会在浏览器中完成一次授权）----
if ! gh auth status >/dev/null 2>&1; then
  echo "🔑 首次使用需登录 GitHub（将打开浏览器授权）..."
  gh auth login --hostname github.com --git-protocol https --web
fi

OWNER="$(gh api user -q .login)"
echo "👤 当前账号: @${OWNER}"

# ---- 4. 仓库名 ----
printf "📦 公开仓库名 [%s]: " "$REPO_DEFAULT"
read -r input
REPO="${input:-$REPO_DEFAULT}"

# ---- 5. 初始化并提交本地代码 ----
if [ ! -d .git ]; then
  git init -b main 2>/dev/null || { git init && git checkout -b main; }
fi
git add -A
git commit -m "feat: 太阳系观测站 · 交互式太阳系教学演示" >/dev/null 2>&1 \
  || echo "（无新改动，跳过提交）"

# ---- 6. 创建公开仓库并推送（推送后自动编译 APK 并发布到 Releases）----
if gh repo view "${OWNER}/${REPO}" >/dev/null 2>&1; then
  echo "⚠️  仓库 @${OWNER}/${REPO} 已存在，直接推送..."
  git remote set-url origin "https://github.com/${OWNER}/${REPO}.git" 2>/dev/null \
    || git remote add origin "https://github.com/${OWNER}/${REPO}.git"
  git push -u origin main
else
  echo "🚀 正在创建公开仓库并推送..."
  gh repo create "$REPO" --public --source=. --remote=origin --push \
    --description "太阳系观测站 · 交互式太阳系教学演示（PWA + GitHub Actions 自动构建 APK）"
fi

echo ""
echo "✅ 完成！GitHub Actions 正在云端编译 APK（约 5-8 分钟）"
echo "   编译完成后 APK 会自动发布到 Releases「最新构建」页面："
echo ""
echo "   仓库     https://github.com/${OWNER}/${REPO}"
echo "   构建进度 https://github.com/${OWNER}/${REPO}/actions"
echo "   APK 下载 https://github.com/${OWNER}/${REPO}/releases"
echo ""
echo "💡 以后改了代码，再跑一次 bash publish.sh 即可自动出新版 APK。"
