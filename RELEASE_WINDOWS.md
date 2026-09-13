# Windows 发布说明

## 构建环境

- Windows 10/11 x64。
- Node.js 22.22.2、Corepack 与 pnpm 10.33.4。
- Rust stable 的 MSVC 工具链。
- Visual Studio 2022 Build Tools 的“使用 C++ 的桌面开发”组件及 Windows SDK。
- 构建机安装 Microsoft Edge WebView2 Runtime。

## 构建与校验

在 Git 工作区没有未提交修改时执行：

```powershell
corepack pnpm run check
corepack pnpm run test:desktop
corepack pnpm run desktop:build
```

安装包输出到：

```text
src-tauri/target/release/bundle/nsis/离谱发明所_0.1.0_x64-setup.exe
```

记录当前提交和安装包校验值：

```powershell
git rev-parse HEAD
Get-FileHash "src-tauri/target/release/bundle/nsis/离谱发明所_0.1.0_x64-setup.exe" -Algorithm SHA256
```

## 安装与卸载

双击安装包，按向导完成当前用户安装。应用会出现在开始菜单；可以从 Windows“设置 > 应用 >
已安装的应用”中卸载。目标机器缺少 WebView2 Runtime 时，安装程序需要联网下载安装。

当前版本未进行代码签名，Windows 可能显示“未知发布者”或 SmartScreen 提示。请先确认安装包来自
项目的 Gitee Release，并核对 SHA-256；确认一致后，在 SmartScreen 中选择“更多信息 > 仍要运行”。

卸载会移除应用程序文件。Tauri 的应用数据目录不由 NSIS 卸载程序主动删除，因此用户任务、设置等
本地数据默认保留，重新安装后可以继续使用。

## Gitee Release 清单

1. 在 Windows 10 和 Windows 11 干净环境验证首次安装、同版本覆盖安装、启动与卸载。
2. 验证头像、主面板、开始菜单入口、任务持久化、通知、单实例及 StepFun AI 配置流程。
3. 创建标签和 Release `v0.1.0`，上传安装包。
4. 发布说明包含系统要求、安装/卸载说明、SmartScreen 说明、已知问题、Git 提交及 SHA-256。
5. 从 Release 重新下载安装包，校验 SHA-256，并完成一次最终启动检查。

## v0.1.0 发布说明模板

离谱发明所首次公开测试版，支持悬浮头像、今日任务、荒诞发明卡牌、本地主题和 StepFun AI。

- 系统要求：Windows 10/11 x64，安装时需要联网以按需获取 WebView2 Runtime。
- 安装方式：下载并运行 `离谱发明所_0.1.0_x64-setup.exe`。
- 安全提示：本测试版未签名，可能出现“未知发布者”或 SmartScreen 提示，请核对 SHA-256。
- 卸载方式：Windows“设置 > 应用 > 已安装的应用”。卸载默认保留本地用户数据。
- 已知问题：未签名安装包会触发 Windows 安全提示；暂不支持自动更新。
- Git 提交：发布时填写。
- SHA-256：发布时填写。

## 本地构建记录（2026-09-11）

- 基准 Git 提交：`650650e738de9e2ea0846d16dfb5d08d256d4193`。
- 安装包大小：`3,055,366` 字节。
- SHA-256：`7D57577E74562BD5471FF66940DA16F9760920CED951A934D493843BEF0EC3A5`。
- 签名状态：未签名，与 `0.1.0` 测试版发布策略一致。
- 自动验证：生产构建、34 项前端测试、9 项 Rust 测试和桌面冒烟测试通过。
- 待人工验证：Windows 10/11 干净环境安装、覆盖安装、卸载、SmartScreen 与缺少 WebView2 场景。
