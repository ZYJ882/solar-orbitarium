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

仓库已内置流水线 `.github/workflows/android.yml`，无需本地安装 Android SDK：

- **每次 push 到 main**：自动编译 debug APK，上传为 Actions 构件
  （仓库页 → Actions → 运行记录 → Artifacts 下载，保留 90 天）
- **推送版本标签**：自动创建 **GitHub Release**，APK 作为附件永久挂在 Release 页面

```bash
git tag v1.0.0
git push origin v1.0.0     # 触发发布流水线
```

下载 APK：仓库页 → **Releases** → 选择版本 → Assets → `solar-orbitarium-v1.0.0.apk`，
传到手机直接安装（首次安装需允许"未知来源应用"）。

### 发布到 GitHub 的步骤

```bash
git init
git add .
git commit -m "feat: 太阳系观测站 · 交互式轨道演示"

git branch -M main
git remote add origin https://github.com/你的用户名/solar-orbitarium.git
git push -u origin main      # ① 推送代码，Actions 开始自动构建

git tag v1.0.0
git push origin v1.0.0       # ② 发布 1.0.0，APK 自动挂到 Releases 页面
```

（先在 GitHub 网页点 **New repository** 创建名为 `solar-orbitarium` 的空仓库，不要勾选自动生成 README。
发布前记得把 `capacitor.config.ts` 里的 `appId` 改成你的反向域名。）

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
