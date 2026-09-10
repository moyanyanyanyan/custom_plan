# 离谱发明所

> 把每天完成的小事，炼成毫无用处但值得收藏的荒诞发明。

## 项目简介

一款基于 Tauri、React 和 TypeScript 的 Windows 桌面任务工具，包含悬浮头像、
今日任务、荒诞发明卡牌和本地个性化主题。

## 技术栈

- 前端：React 19、TypeScript、Vite
- 桌面端：Tauri 2、Rust
- 测试：Vitest、Testing Library、Playwright、Cargo Test

## 快速开始

```bash
git clone https://gitee.com/moyanyanyanyan/hackson.git
cd hackson
pnpm install
```

Windows 开发调试时，先退出正在运行的正式版，再执行：

```powershell
.\scripts\dev-desktop.ps1
```

脚本会切换到 Node 22.22.2 并启动 Tauri 热更新；按 `Ctrl+C` 停止。
日常调试不需要删除或重新生成 `node_modules`、`dist` 和 `target`。

## 分支策略

- `master`：稳定版本
- `feat/xxx`：新功能开发
- `fix/xxx`：问题修复

## 贡献方式

1. 拉取最新代码
2. 创建功能分支
3. 提交代码并发起 Pull Request

## 许可证

[MulanPSL2](LICENSE)
