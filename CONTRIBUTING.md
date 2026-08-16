# 贡献指南

感谢参与太阳系观测站的维护。项目是一个以 React、TypeScript、Vite 和 Canvas 为基础的前端演示，修改时请优先保持交互逻辑清晰、科普数据集中且构建流程可复现。

## 开始修改

请使用 Node.js 20 或更高版本，并通过锁文件安装依赖：

```bash
npm ci
npm run dev
```

不要手动修改 `package-lock.json`；调整依赖后使用 npm 命令重新生成锁文件，并在提交中同时包含 `package.json` 与锁文件的变化。

## 代码约定

页面状态和整体布局由 `src/App.tsx` 负责，具体交互尽量放在对应组件中。天体的类型、展示数据和格式化函数统一维护在 `src/data/planets.ts`，避免在多个组件内重复写同一份事实数据。新增字段时，需要同步检查 `InfoPanel`、数据对比区域和 TypeScript 类型定义。

Canvas 动画应在组件卸载时清理动画帧、事件监听器和观察器。涉及键盘或触摸交互时，应保留可见的鼠标操作入口，并为按钮提供明确的 `aria-label` 或可见文字。

## 提交前检查

提交前必须运行：

```bash
npm run check
```

该命令包含 TypeScript 类型检查和 Vite 生产构建。若修改了 PWA 缓存、Capacitor 配置或 GitHub Actions，还应检查对应文件中的版本号、路径和 Secret 名称是否一致。正式签名文件、密码、Token 和本地构建产物不得提交。

## 提交信息

提交信息建议使用简短的 Conventional Commits 前缀，例如 `feat:`、`fix:`、`docs:`、`refactor:` 或 `chore:`。一次提交尽量只解决一个主题，并在描述中说明验证命令和可能影响的发布流程。
