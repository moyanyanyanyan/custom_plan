# 离谱发明所 · 开发说明

当前版本是 Windows 桌面原型：可拖动贴边的头像，以及带本地任务操作的控制面板。
任务支持添加、完成、取消完成、删除和按日期保存；卡牌生成、收藏及外观设置已接入统一数据层。
史莱姆已支持跨日生成、图鉴浏览和完成来源任务后的自动收容。

## 环境

- Node.js 22.22.2（由 `.nvmrc` 固定）与 pnpm 10.33.4。
- Rust stable，使用 Windows MSVC 工具链。
- Visual Studio 2022 Build Tools 的“使用 C++ 的桌面开发”组件及 Windows SDK。
- Microsoft Edge WebView2 Runtime。
- 安装 Rust 后重新打开终端，使 `cargo` 出现在 PATH 中。

## 启动与构建

```powershell
pnpm install
.\scripts\dev-desktop.ps1
```

`dev-desktop.ps1` 会自动切换 Node 版本、设置 Corepack 缓存并启动 Tauri 热更新。
如果正式版或另一个开发实例已在运行，脚本会停止并提示手动退出，不会强制关闭。
开发期间前端修改会自动刷新，Rust 修改会自动重新编译；在终端按 `Ctrl+C` 停止。

启动后头像出现在主屏右边缘。拖动头像后松手，会吸附当前显示器最近的左右边缘。
单击头像展开或收起面板。面板右上角减号收起，电源图标退出整个应用。
面板上的 Alt+F4 也只收起面板；头像获得焦点时 Alt+F4 退出应用。
拖动头像会收起面板；点击其他应用不会收起面板。
按住面板顶部产品名称或空白区域可自由拖动面板，右上角按钮不参与拖动。
松手后面板留在当前位置，不带动头像；收起再打开时重新定位到头像旁。

```powershell
corepack pnpm run check
corepack pnpm run desktop:build
```

`desktop:build` 会先重新构建前端，再生成 Windows NSIS 安装程序：
`src-tauri/target/release/bundle/nsis/离谱发明所_0.1.0_x64-setup.exe`。
如果只需要用于诊断的裸可执行文件，执行 `corepack pnpm run desktop:build:binary`，产物为
`src-tauri/target/release/absurd-invention-lab.exe`。

安装程序采用当前用户安装模式，不要求管理员权限，并创建开始菜单及卸载入口。
目标机器需要联网：缺少 Microsoft Edge WebView2 Runtime 时，安装程序会在线下载安装。
当前 `0.1.0` 安装包尚未进行代码签名，Windows 可能显示“未知发布者”或 SmartScreen 提示；
确认安装包来自项目的 Gitee Release 且 SHA-256 一致后，可在“更多信息”中选择“仍要运行”。

本次已生成并验收的原型程序为 `src-tauri/target/debug/absurd-invention-lab.exe`，可直接双击。
复现该构建使用 `corepack pnpm run tauri -- build --debug --no-bundle`，程序内已包含界面资源，
运行时不需要预览服务，也不会额外打开控制台窗口。

只看 UI 时执行 `corepack pnpm run dev`，访问 `http://127.0.0.1:1420/`。
浏览器里窗口操作按钮不可用；头像吸附必须在桌面应用中体验。
不要在已有预览服务占用 1420 端口时再次启动桌面开发模式。

## 结构与约束

- `src/components/`：按 shell、settings、cards 等业务域组织界面。
- `src/hooks/`：任务、卡牌、史莱姆、设置与生成流程的业务状态入口。
- `src/constants/`、`src/types/`：默认设置、业务常量和领域类型。
- `src/utils/appRepository.ts`：统一数据仓储边界；组件不得直接访问 localStorage。
- `src-tauri/src/data/`：版本化 JSON 文件存储及资产目录。
- `src-tauri/src/ai/`：供应商配置、提示词、响应模型和阶跃星辰实现。
- `src-tauri/src/commands/`：窗口、数据和 AI 命令入口。
- `index.html`：前端入口，加载 `src/index.tsx`。
- `public/lab-icon.svg`：本地占位图标源文件。
- 每个手写代码文件不超过 150 行，入口只做组装。

首次运行会写入五条种子任务；任务支持展开式添加、完成状态切换、聚焦浏览和删除。
发明机读取真实完成任务，生成结果进入本地卡牌收藏；未配置 AI 密钥时使用本地模板降级。
胶囊任务带支持滚轮、上下按钮、方向键和点击切换焦点。
完成五项今日任务后发明机解锁；成功领取后当天保持“今日发明已完成”状态。
悬浮头像外圈显示今日任务进度，并通过统一数据事件与主面板同步。
窄屏缩小面板；高度不足时允许整个面板纵向滚动，任务带本身不显示滚动条。

## 验证

`pnpm test` 运行前端单元和组件测试，`pnpm run test:e2e` 自动启动预览服务并运行浏览器检查。
`pnpm run test:native` 覆盖 AI 响应解析、左右贴边、上下边界、负坐标屏幕、任务栏偏移及 150% 缩放。
浏览器检查由项目内 Playwright 配置自动启动 Vite；运行 `pnpm run test:e2e` 即可。
截图类人工验收仍可运行 `node scripts/preview-check.cjs`，产物保存在 `.artifacts/`。
浏览器截图不替代 Windows 上真实拖动、跨屏和退出操作的验收。

### 本次验证记录（2026-09-10）

- TypeScript 检查、Vite 生产构建和 Tauri release 构建通过。
- 8 项 Rust 测试通过，覆盖窗口几何、AI 响应解析、数据修订冲突与每日卡牌原子领取。
- 新增任务、任务聚焦和发明机状态的前端测试已补充；当前本机未安装可执行的 Vitest，尚待恢复依赖后运行。
- `cargo fmt --check` 发现既有 Rust 文件尚未统一格式，本轮未改写这些无关文件。

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
