@echo off
chcp 65001 >nul
setlocal
title 太阳系观测站 · 一键发布到 GitHub

echo.
echo   太阳系观测站 · 一键发布到 GitHub
echo   ---------------------------------

where git >nul 2>nul
if errorlevel 1 (
  echo ❌ 未找到 git。请先安装：https://git-scm.com/downloads
  pause & exit /b 1
)

where gh >nul 2>nul
if errorlevel 1 (
  echo ❌ 未找到 GitHub CLI。安装方式：
  echo    winget install GitHub.cli
  echo    或访问 https://cli.github.com
  pause & exit /b 1
)

gh auth status >nul 2>nul
if errorlevel 1 (
  echo 🔑 首次使用需登录 GitHub（将打开浏览器授权）...
  gh auth login --hostname github.com --git-protocol https --web
)

for /f "delims=" %%i in ('gh api user -q .login') do set "OWNER=%%i"
echo 👤 当前账号: @%OWNER%

set "REPO=solar-orbitarium"
set /p REPO="📦 公开仓库名 [solar-orbitarium]: "

if not exist .git git init -b main
git add -A
git commit -m "feat: 太阳系观测站 · 交互式太阳系教学演示" >nul 2>nul

gh repo view %OWNER%/%REPO% >nul 2>nul
if errorlevel 1 (
  echo 🚀 正在创建公开仓库并推送...
  gh repo create %REPO% --public --source=. --remote=origin --push --description "太阳系观测站 · 交互式太阳系教学演示（PWA + GitHub Actions 自动构建 APK）"
) else (
  echo ⚠️  仓库已存在，直接推送...
  git remote set-url origin https://github.com/%OWNER%/%REPO%.git 2>nul || git remote add origin https://github.com/%OWNER%/%REPO%.git
  git push -u origin main
)

set /p REL="🏷️  立即发布 v1.0.0（自动编译 APK 并挂到 Releases）？[Y/n]: "
if /i "%REL%"=="n" goto :skip

git tag v1.0.0 >nul 2>nul
git push origin v1.0.0
echo.
echo ✅ 完成！GitHub Actions 正在云端编译 APK（约 5-8 分钟）
echo    仓库     https://github.com/%OWNER%/%REPO%
echo    构建进度 https://github.com/%OWNER%/%REPO%/actions
echo    APK 下载 https://github.com/%OWNER%/%REPO%/releases
pause & exit /b 0

:skip
echo.
echo ✅ 代码已推送！之后想触发 APK 构建时运行：
echo    git tag v1.0.0 ^&^& git push origin v1.0.0
echo    仓库 https://github.com/%OWNER%/%REPO%
pause
