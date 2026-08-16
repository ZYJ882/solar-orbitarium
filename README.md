# 太阳系观测站 · Solar Orbitarium

太阳系观测站是一个面向教学与探索的交互式太阳系演示。它以太阳和八大行星为核心，提供按真实公转周期缩放的轨道动画、天体档案、运行速度控制、轨道与标签图层切换，以及行星数据对比视图。项目同时支持浏览器 PWA 和 Capacitor Android 打包。

## 功能概览

| 模块 | 说明 |
| --- | --- |
| 轨道模拟 | 太阳与八大行星按公转周期比例运行，支持播放、暂停和 0.1×–200× 速度调节。 |
| 观察视图 | 默认 2D 俯视图；可切换到支持拖拽旋转和滚轮缩放的 3D 视图。 |
| 天体档案 | 展示直径、距日距离、公转周期、自转周期、卫星数、温度和科普资料。 |
| 交互导航 | 支持左侧快速选择、键盘空格键播放/暂停，以及轨道线和名称标签开关。 |
| 数据对比 | 以压缩后的平方根比例展示行星直径和距日距离，并提供趣味数据卡片。 |
| 安装方式 | 可作为离线 PWA 安装，也可通过 Capacitor 构建 Android APK。 |

## 快速开始

项目需要 Node.js 20 或更高版本。安装依赖并运行开发服务器：

```bash
npm ci
npm run dev
```

常用命令如下：

```bash
npm run check       # TypeScript 类型检查 + 生产构建
npm run typecheck   # 仅类型检查
npm run build       # 仅生产构建
npm run preview     # 预览已构建的 dist/
```

## 项目结构

```text
src/
├── App.tsx                 # 页面状态与整体布局
├── components/
│   ├── SolarCanvas.tsx     # 2D 轨道动画与画布渲染
│   ├── SolarCanvas3D.tsx   # Three.js 3D 轨道视图
│   ├── ControlBar.tsx      # 播放控制与速度调节
│   ├── PlanetNav.tsx       # 天体快速导航
│   ├── InfoPanel.tsx       # 当前天体档案
│   └── DataComparison.tsx  # 行星数据对比
├── data/planets.ts         # 天体数据、格式化工具和查询函数
├── hooks/useReveal.ts      # 滚动显现动画 Hook
└── index.css               # 全局样式与视觉主题
public/
├── manifest.webmanifest    # PWA 清单
├── sw.js                   # 离线缓存 Service Worker
└── icons/icon.svg          # 应用图标
capacitor.config.ts         # Capacitor Android 配置
.github/workflows/android.yml # GitHub Actions Android 发布流程
```

## 2D 与 3D 视图

2D 视图适合快速比较轨道关系，3D 视图适合从不同角度观察空间层次。3D 视图使用 Three.js，生产构建后的 JavaScript 体积会明显增加；在低端移动设备上如遇到 WebGL 性能问题，可继续使用 2D 视图。

## PWA 使用

生产构建完成后，将 `dist/` 部署到支持 HTTPS 的静态托管服务，即可在移动浏览器中选择“添加到主屏幕”。Service Worker 会缓存应用的静态资源；若修改缓存策略或资源入口，请同步更新 `public/sw.js` 中的缓存版本号，避免旧缓存影响测试。

## Android 打包

本地调试 APK 的基本流程如下：

```bash
npm run build
npx cap add android       # 仅首次执行
npx cap sync android
cd android
./gradlew assembleDebug
```

生成的调试包位于 `android/app/build/outputs/apk/debug/app-debug.apk`。仓库默认通过 GitHub Actions 生成正式 Release APK；正式签名所需的 keystore 和密码只应配置在 GitHub Actions Secrets 中，不要提交到仓库。发布前请确认 `capacitor.config.ts` 中的 `appId` 已替换为你自己的反向域名标识。

## GitHub Actions 发布

向 `main` 分支推送会触发 `.github/workflows/android.yml`。流程会安装依赖、执行 Web 构建、同步 Capacitor Android 平台、构建 Release APK，并将产物上传到 GitHub Release。正式签名需要配置 `ANDROID_KEYSTORE_BASE64`、`KEYSTORE_PASSWORD`、`KEY_ALIAS` 和 `KEY_PASSWORD` 四个 Secrets；如果只需要验证 Web 构建，可直接在本地运行 `npm run check`。

## 数据说明

行星档案数据集中维护在 `src/data/planets.ts`。轨道动画使用归一化后的距离和周期，目的是让不同数量级的天体可以同时显示，并不代表视觉上的真实空间比例。数据和科普文字适合教学演示，涉及精密天文学的场景应以权威星历或天文数据库为准。

## 贡献约定

修改前端逻辑或数据后，请先运行 `npm run check`。组件应保持单一职责；新增天体字段时，应同时更新 `CelestialBody` 类型、数据对象和档案面板。详细的提交与验证约定见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## License

本项目当前未声明开源许可证。如需公开分发、二次开发或引入第三方贡献，请先补充明确的 License 文件。
