# 太阳系观测站 · Solar Orbitarium

一个用于天文教学的**交互式太阳系演示**，基于 React + Canvas 构建，并配置为可直接打包成**安卓 App**（PWA / Capacitor APK 双通道）。

## ✨ 功能特性

- 🪐 **真实比例的轨道运动**：八大行星按真实公转周期比例运行（水星 88 天 → 海王星 164.8 年）
- 🖱️ **点击天体查看档案**：名称、直径（含"≈ 几倍地球"换算）、与太阳距离（百万 km / AU）、公转周期（含地球日换算），以及自转、卫星数、温度与趣味知识
- ▶️ **播放 / 暂停 / 速度调节**：0.1×–200× 速度滑杆，空格键快捷播放暂停，模拟时钟显示"已运行 X 年 X 天"
- 🏷️ **图层开关**：轨道线 / 名称标签可独立显隐，另有左侧天体快速导航
- 📊 **数据对比区**：直径、距日距离、公转周期条形图随滚动逐行显现，附趣味数据带
- 📱 **可安装为安卓 App**：PWA 支持（全屏独立窗口 + 离线可用），并内置 Capacitor 打包配置与 GitHub Actions 自动构建 APK

## 🚀 本地运行

```bash
npm install
npm run dev      # 开发预览
npm run build    # 产出 dist/
```

## 📱 方式一：作为 PWA 安装到安卓手机（零构建）

1. 将 `dist/` 部署到任意 HTTPS 静态托管（GitHub Pages / Vercel / Netlify 均可）
2. 安卓手机用 **Chrome** 打开站点
3. 点右上角菜单 → **添加到主屏幕**（或点击应用右上角出现的「安装 App」按钮）
4. 从桌面图标启动：全屏独立窗口运行，无地址栏，**离线可用**（Service Worker 缓存）

## 🤖 方式二：本地构建真正的 APK（Capacitor）

前置条件：Node 20+、JDK 17、Android SDK（安装 [Android Studio](https://developer.android.com/studio) 即可自动配齐）。

```bash
# 1. 先把 capacitor.config.ts 里的 appId 改成你的反向域名
#    例如 com.yourname.solarorbitarium

npm install
npm run build

npx cap add android     # 首次执行，生成 android/ 平台目录
npx cap sync android    # 每次前端改动后同步

cd android
./gradlew assembleDebug # Windows: gradlew.bat assembleDebug
```

产物位置：`android/app/build/outputs/apk/debug/app-debug.apk`，传到手机即可安装。
也可以用 Android Studio 打开 `android/` 目录，可视化构建 / 签名 Release 版本。

**更换启动图标**（可选）：

```bash
mkdir assets
# 把一张 1024×1024 的 PNG 图标放到 assets/icon.png（可用项目里的 public/icons/icon.svg 导出）
npx @capacitor/assets generate --android
```

## ☁️ 方式三：推送到 GitHub，APK 全自动产出（推荐）

仓库已内置流水线 `.github/workflows/android.yml`，无需本地安装 Android SDK，**全自动发布**：

- 每次 **push 到 main**（或在 Actions 页面手动点 **Run workflow**）→ 云端自动编译 debug APK
- 编译完成后**自动创建 / 更新**名为「**最新构建**」的 GitHub Release，
  APK 以带时间戳的文件名（如 `solar-orbitarium-20260211-0930.apk`）永久挂在 Release 页面
- 无需打标签、无需任何额外命令

下载 APK：仓库页 → **Releases** → 「最新构建」 → Assets → 选时间最新的 `solar-orbitarium-*.apk`，
传到手机直接安装（首次安装需允许"未知来源应用"）。

### 📱 只有手机的新手方法（最简单，零命令行）

全程在**手机浏览器**完成，不装任何软件、不打任何命令：

1. **下载项目**：在本工具/平台里找到「下载 / 导出项目」按钮，把项目存成 zip 到手机
2. **建仓库**：手机浏览器打开 `github.com` → 登录 → 右上角 `+` → `New repository`
   - 名字填 `solar-orbitarium` → 选 `Public` → 点 `Create repository`
3. **传文件**：在新仓库页面点 `uploading an existing file`，把解压后的**全部文件**拖/选进去
   （注意要包含隐藏的 `.github` 文件夹，它负责自动编译；手机文件管理器需开启"显示隐藏文件"）
   → 拉到底点 `Commit changes`
4. **点按钮编译**：仓库页 → `Actions` 标签 → 左侧选 `android` → 点 `Run workflow` → 再点绿色 `Run workflow`
5. **等 5-8 分钟**（编译完成会**自动发布**到 Releases，无需任何额外操作），然后到仓库页 → `Releases` → 「最新构建」 → 下载时间最新的 `solar-orbitarium-*.apk`
6. **装到手机**：点 APK → 允许"未知来源应用" → 安装完成 🎉

> 小提示：手机上传文件夹容易漏掉隐藏的 `.github`。如果 Actions 页面是空的，
> 说明没传上去——用电脑或请朋友帮忙传一次即可，之后都能在手机上点按钮重新编译。

### 发布到 GitHub：三种方式任选

**方式 A：一键脚本（推荐，约 1 分钟）**

先安装 [GitHub CLI](https://cli.github.com)（`brew install gh` / `winget install GitHub.cli` / `sudo apt install gh`），然后在项目根目录运行：

- macOS / Linux：`bash publish.sh`
- Windows：双击 `publish.bat`（或在 cmd 中运行）

脚本会自动完成：**浏览器授权登录 → 创建公开仓库 → 提交并推送代码**。推送后 Actions 立即开始云端编译 APK，5-8 分钟后**自动发布**到 Releases「最新构建」页面（无需打标签）。

**方式 B：纯浏览器，不装任何工具**

1. 把项目文件夹整体压缩为 zip
2. github.com → **New repository** → 命名 `solar-orbitarium` → **Create**
3. 点 **uploading an existing file**，解压 zip 后将**全部文件**（含隐藏的 `.github` 文件夹）拖入 → Commit
4. Commit 后流水线**自动开始编译**（也可到 `Actions` 标签页查看进度，或手动点 `Run workflow`）
5. 约 5-8 分钟后，APK **自动发布**到 Releases 的「最新构建」页面

**方式 C：手动 git 命令**

```bash
git init
git add .
git commit -m "feat: 太阳系观测站 · 交互式轨道演示"

git branch -M main
git remote add origin https://github.com/你的用户名/solar-orbitarium.git
git push -u origin main      # 推送即自动编译，完成后 APK 自动发布到 Releases「最新构建」
```

（方式 C 需先在 GitHub 网页创建同名空仓库，不勾选自动生成 README。
正式发布前建议把 `capacitor.config.ts` 里的 `appId` 改成你的反向域名。）

若要同时托管网页版：仓库 Settings → Pages → 选择 GitHub Actions 或将 `dist/` 部署到 Vercel/Netlify 即可。

## 🗂️ 项目结构

```
├── public/
│   ├── manifest.webmanifest   # PWA 清单（应用名/图标/全屏模式）
│   ├── sw.js                  # Service Worker（离线缓存）
│   └── icons/icon.svg         # 应用图标
├── src/
│   ├── components/
│   │   ├── SolarCanvas.tsx    # Canvas 轨道模拟（星空/行星/彗星/交互）
│   │   ├── ControlBar.tsx     # 播放/暂停/速度/图层/重置
│   │   ├── InfoPanel.tsx      # 天体档案面板
│   │   ├── PlanetNav.tsx      # 天体导航
│   │   └── DataComparison.tsx # 数据对比区 + 趣味数据带
│   ├── data/planets.ts        # 天体数据（参考 NASA 行星事实表）
│   ├── hooks/useReveal.ts     # 滚动显现 Hook
│   └── App.tsx                # 组装与状态管理
├── capacitor.config.ts        # 安卓打包配置
└── .github/workflows/android.yml  # APK 自动构建工作流
```

## 📚 数据说明

行星数据参考 NASA Planetary Fact Sheet；为满足教学可视性，**轨道半径与行星尺寸经过非线性压缩**（非真实比例），界面中已标注。公转角速度严格按真实周期比例。

## License

MIT · 欢迎用于课堂教学。
