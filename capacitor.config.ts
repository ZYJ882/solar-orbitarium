import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor 配置：将本 Web 应用打包为安卓 App。
 * 发布前请把 appId 改成你自己的反向域名（如 com.yourname.solarorbitarium）。
 *
 * 本地构建 APK：
 *   npm run build
 *   npx cap add android
 *   npx cap sync android
 *   cd android && ./gradlew assembleDebug
 *   → android/app/build/outputs/apk/debug/app-debug.apk
 *
 * 或直接推送到 GitHub，由 .github/workflows/android.yml 自动构建。
 */
const config: CapacitorConfig = {
  appId: "dev.solar.orbitarium",
  appName: "太阳系观测站",
  webDir: "dist",
  backgroundColor: "#05080f",
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
