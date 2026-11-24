# 离谱发明所 · 开发说明

当前版本支持 Windows 桌面端和浏览器预览：可拖动贴边的头像，以及带本地任务操作的控制面板。
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
确认安装包来自项目的 GitHub 仓库 且 SHA-256 一致后，可在“更多信息”中选择“仍要运行”。

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

## 幻想卡牌链路

- `fantasyCards.ts`负责点数抽取、文案/证据校验、固定关系模板和堆叠身份；`cardGenerator.ts`先产生完整本地底稿。
- `useCardGeneration`先验证文案并选择普通牌或关系牌，再生成最终插画。同步提交锁阻止重复点击；领取仍由仓库检查每日限制。
- 卡牌文案响应为`{ordinary, relationship?}`，与史莱姆和道具响应独立。桌面`generate_card_copy`和浏览器`/api/cards/copy`均需传入程序抽取的rank。
- 桌面提示词源在`src-tauri/src/ai/card-copy.txt`，浏览器镜像在`public/_worker.js`；修改时须同步。卡牌插画走独立文生图入口，不附带角色参考图；其他入口保持原行为。
- 新卡version=2；旧卡没有version。sourceTasks保存生成时的完整快照，inspiration保存原文证据。description用于吐槽说明，category与原有type='daily'分开。
- CardFace、CardDialog在收藏和揭晓共用。牌背为SVG，详情在牌外；缩略图省略正文，完整阅读不截断效果。
- 浏览器用Web Locks串行化跨窗口领取，不支持该API时至少串行化同窗口请求；桌面继续使用原子存储。普通存储失败与重复领取分别反馈。
- 文字降级和图片降级都可正常领取，只有领取成功才揭晓。没有新增依赖、战斗执行或SP状态系统。

## 硅基流动

桌面设置新增AI服务商选择。硅基流动需显式选择`siliconflow`；旧版默认`auto`仍仅识别TokenDance与阶跃星辰。不同平台的sk-密钥不能靠前缀区分。选择明确平台后仅向该平台发送请求。

硅基流动接口为`https://api.siliconflow.cn/v1`，文案模型`Qwen/Qwen2.5-72B-Instruct`，插画模型`Qwen/Qwen-Image`。生图使用`image_size`，解析`images[].url`并立即下载到既有资产存储，不把临时链接当作永久资源。保留服务默认的AI水印。适配代码在`src-tauri/src/ai/siliconflow.rs`。

此选择用于桌面端；浏览器Pages代理仍使用部署端的阶跃星辰配置，不读取本机密钥。

## AI 认证与错误诊断

桌面端按本地设置、环境变量、开发机凭据的顺序读取密钥；不再注入内置共享密钥，也不修改已有用户配置。历史存档若保留了失效密钥，需要在研究所设置中更新。HTTP 401属于认证失败，等待不会修复密钥。

AI请求失败时保留首选与备用服务的名称和各自错误，后一次401不再覆盖前一次失败。文案、插画失败分别显示；本地降级成功不代表远端AI调用成功。

## 验证

`pnpm test` 运行前端单元和组件测试，`pnpm run test:e2e` 自动启动预览服务并运行浏览器检查。
`pnpm run test:native` 覆盖 AI 响应解析、左右贴边、上下边界、负坐标屏幕、任务栏偏移及 150% 缩放。
浏览器检查由项目内 Playwright 配置自动启动 Vite；运行 `pnpm run test:e2e` 即可。
截图类人工验收仍可运行 `node scripts/preview-check.cjs`，产物保存在 `.artifacts/`。
浏览器截图不替代 Windows 上真实拖动、跨屏和退出操作的验收。

本机 Corepack 若报跨设备缓存错误，可先设置开发脚本使用的缓存路径：
`$env:COREPACK_HOME = 'D:\app\nvm\corepack-cache'`。
测试并发过高时可执行 `corepack pnpm exec vitest run --maxWorkers=1 --no-file-parallelism`。

## 后续开发提示词

“先读取当前代码、REQUIREMENTS.md 和 DEVELOPMENT.md；PRODUCT_MEMORY.md 仅作产品方向参考。
不沿用历史验收结果，不把设想写成已实现。
只修改本轮要求的模块，入口只做组装，每个新增手写代码文件不超过 150 行。
删除前列出具体路径和依据，多个文件交由我手动删除，不删除 node_modules。”
