# 离谱发明所 · 开发说明

当前版本是 Windows 桌面原型：可拖动贴边的头像，以及静态控制面板。
任务、收藏、史莱姆和发明机均为预览内容，没有业务事件、API 请求或任务存储。

## 环境

- Node.js 20.19+ 与 npm。
- Rust stable，使用 Windows MSVC 工具链。
- Visual Studio 2022 Build Tools 的“使用 C++ 的桌面开发”组件及 Windows SDK。
- Microsoft Edge WebView2 Runtime。
- 安装 Rust 后重新打开终端，使 `cargo` 出现在 PATH 中。

## 启动与构建

```powershell
npm install
npm run desktop
```

启动后头像出现在主屏右边缘。拖动头像后松手，会吸附当前显示器最近的左右边缘。
单击头像展开或收起面板。面板右上角减号收起，电源图标退出整个应用。
面板上的 Alt+F4 也只收起面板；头像获得焦点时 Alt+F4 退出应用。
拖动头像会收起面板；点击其他应用不会收起面板。
按住面板顶部产品名称或空白区域可自由拖动面板，右上角按钮不参与拖动。
松手后面板留在当前位置，不带动头像；收起再打开时重新定位到头像旁。

```powershell
npm run build
npm run test:native
npm run desktop:build
```

桌面构建只生成可执行文件，不生成安装包：
`src-tauri/target/release/absurd-invention-lab.exe`。

本次已生成并验收的原型程序为 `src-tauri/target/debug/absurd-invention-lab.exe`，可直接双击。
复现该构建使用 `npm run tauri -- build --debug --no-bundle`，程序内已包含界面资源，
运行时不需要预览服务，也不会额外打开控制台窗口。

只看 UI 时执行 `npm run dev`，访问 `http://127.0.0.1:1420/`。
浏览器里窗口操作按钮不可用；头像吸附必须在桌面应用中体验。
不要在已有预览服务占用 1420 端口时再次启动 `npm run desktop`。

## 结构与约束

- `src/components/`：头像、控制面板、任务带和对应样式。
- `src/hooks/`：头像点击与拖动阈值判断。
- `src/constants/`、`src/types/`、`src/utils/`：预览数据、类型、桌面通信封装。
- `src-tauri/src/`：窗口命令、显示器定位与几何测试。
- `public/lab-icon.svg`：本地占位图标源文件。
- 每个手写代码文件不超过 150 行，入口只做组装。

示例任务共五条，完成两条，因此进度为 2/5、稳定余波为 2、停滞能量为 3。
卡牌数量 12 为独立历史示例。胶囊中心固定，不绑定滚动、完成或切换事件。
窄屏缩小面板；高度不足时允许整个面板纵向滚动，任务带本身不显示滚动条。

## 验证

`npm run test:native` 覆盖左右贴边、上下边界、负坐标屏幕、任务栏偏移及 150% 缩放。
可选浏览器检查需要 Playwright 和 Edge：设置 `PLAYWRIGHT_PATH` 指向本机 Playwright 包后，
运行 `node scripts/preview-check.cjs`，截图保存在 `.artifacts/`。
浏览器截图不替代 Windows 上真实拖动、跨屏和退出操作的验收。

### 本次验证记录（2026-09-07）

- TypeScript 检查、前端构建、Rust 编译和格式检查通过。
- 4 项原生几何测试通过；760×800、520×680、360×600 的预览检查通过。
- Windows 单屏 150% 缩放实测：启动仅显示头像、无边框置顶、左右吸附、向内展开、
  收起、系统关闭后重新展开、失焦保持显示、拖动不误触展开、退出应用均通过。
- 面板拖动实测：标题和顶部空白可拖动，松手停留，任务区不拖动，头像不跟随；
  收起再打开回到头像旁，头像调用面板专用拖动命令会被拒绝。
- 多屏负坐标和小工作区由几何测试覆盖，未在多显示器硬件上实测。
- 原生窗口截图保存在 `.artifacts/native-panel.png` 和 `.artifacts/native-avatar.png`。
- `scripts/native-check.cjs` 用于专门的桌面验收实例，要求设置 `NATIVE_APP_PID` 为目标进程，
  并仅为该实例临时启用本机 WebView2 调试端口 9222；正常启动不启用该端口。

推荐后续开发提示词：
“先读取 PRODUCT_MEMORY.md 和 DEVELOPMENT.md；只修改本轮要求的模块，
保持业务按钮静态，每个手写文件不超过 150 行，不批量删除、不删除 node_modules。”
