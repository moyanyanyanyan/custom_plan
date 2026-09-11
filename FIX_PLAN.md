# 审核(Request Changes)修复计划

> 分支：feat/invention-card  
> 审核结论：Request Changes（5 × P1）  
> 本计划不修改任何代码，仅列出可执行的修复方案、文件清单、验证命令与风险说明。  
> 产生日期：2026-09-08

---

## 1. 现状核查结论（针对 P1-4 的 gitee 调查）

**结论：仓库内不存在“真实任务状态来源”。**

- 当前分支 `feat/invention-card`、`master`、`feat/initial-scaffold` 三个分支均无任务持久化模块。
- `master` 上的任务相关文件只有：`src/components/ExperimentList.tsx`、`src/components/experiments.css`、`src/types/experiment.ts` —— 与当前分支一致，全部读自 `src/constants/preview.ts` 的硬编码常量。
- `ExperimentList.tsx` 首行注释明确写“首版仅展示任务带的视觉层次，不模拟可用的任务操作”，底部标注“静态预览”。
- Tauri 后端 `src-tauri/src/commands.rs` 只做窗口操作（toggle/hide/drag/exit），无任务/AI 相关 command；`Cargo.toml` 只有 `tauri` + `windows-sys`，无 reqwest 或其他 HTTP 客户端。
- `REQUIREMENTS.md` 第 3 节确实描述了“任务管理：添加、完成、取消和删除，本地持久化”，但该模块**尚未实现**。

因此 P1-4 的修法不是“把现有数据源切过去”，而是**为正常模式补一个最小真实任务存储**（按 REQUIREMENTS 的本地持久化方向），同时禁止正常模式继续吃预览常量。

---

## 2. 五条 P1 的逐项修复方案

### P1-1 构建失败：`ControlPanel.tsx` 缺 `InventionCard` import

| 项 | 内容 |
|---|---|
| 现象 | `src/components/ControlPanel.tsx:24`、`46` 使用了 `InventionCard` 类型名，但文件内没有对应 import。`tsc --noEmit` 必挂（TS2304）。 |
| 根因 | 上次添加 `CardRevealModal` 时遗漏了类型 import。 |
| 修法 | 在 `ControlPanel.tsx` 顶部补充 `import type { InventionCard } from '../types/card';` |
| 影响文件 | `src/components/ControlPanel.tsx`（+1 行） |
| 验证 | `pnpm run build` 或 `npx tsc --noEmit` 通过 |

---

### P1-2 密钥暴露：`VITE_STEPFUN_API_KEY` 打进前端包

| 项 | 内容 |
|---|---|
| 现象 | `src/utils/stepfun.ts:9-12` 通过 `import.meta.env.VITE_STEPFUN_API_KEY` 读取 key，Vite 会把 `VITE_*` 注入客户端 bundle。任何人打开 devtools/解包即可拿到 key。 |
| 根因 | AI 调用完全在前端完成，无服务端代理。 |
| 修法（推荐） | **将 AI 文案 + 生图下沉到 Tauri Rust command**：前端通过 `invoke('generate_ai_copy', {...})` / `invoke('generate_artwork', {...})` 调 Rust；Rust 侧从环境变量 `STEPFUN_API_KEY` 读取，不进前端包。 |
| 修法（降级） | 若 Rust 迁移延期，先做**最小止血**：删除 `VITE_STEPFUN_API_KEY` 的使用，前端改为 `invoke('proxy_ai', ...)` → Rust 返回 null → 浏览器走模板降级；确保 key 不出现在任何前端 bundle 中。 |
| 影响文件 | `src/utils/stepfun.ts`（重写/删除）、`src/utils/cardImage.ts`（调用方改为 Rust）、`src/utils/cardGenerator.ts`（不变）、`src/components/ControlPanel.tsx`（加 invoke fallback）、`src-tauri/src/commands.rs`（新增 command）、`src-tauri/src/main.rs`（注册 handler）、`src-tauri/Cargo.toml`（加 reqwest/serde/base64）、`.env` / `.env.example`（key 改放运行环境，不再需要 VITE_ 前缀） |
| 验证 | 构建产物里 `grep -a` 确认无 `STEPFUN_API_KEY` 字符串；桌面端成功生成卡牌；浏览器/demo 模式仍可用模板卡。 |

---

### P1-3 CSP 拦截 AI 请求

| 项 | 内容 |
|---|---|
| 现象 | `src-tauri/tauri.conf.json:43` 的 `connect-src` 只放行了 `ipc:` / `http://ipc.localhost`，前端直连 `api.stepfun.com` 会被 Tauri CSP 拦截，静默失败后走模板降级。 |
| 根因 | 与 P1-2 同源：设计上就不该从前端直连 StepFun。 |
| 修法（与 P1-2 联动） | **CSP 收紧为 `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; connect-src ipc: http://ipc.localhost`**（当前已有 `devCsp` 放行 1420，保持不变）。Rust 侧用 `reqwest` 调外网，不受前端 CSP 限制。 |
| 影响文件 | `src-tauri/tauri.conf.json`（`csp` 行，确认不包含 `api.stepfun.com`） |
| 验证 | 桌面端正常生成；浏览器 devtools Network 面板无 StepFun 请求；`tauri dev` 不报 CSP violation。 |

---

### P1-4 正常模式使用固定预览任务生成

| 项 | 内容 |
|---|---|
| 现象 | `src/constants/preview.ts` 的 5 条任务全 `completed: true`；`ControlPanel.tsx` 与 `cardGenerator.ts` 都从这个常量读任务状态。无论 demo/正常，门槛永远满足。 |
| 根因 | 真实任务模块未实现，所有逻辑依赖硬编码预览数据。 |
| 修法 | **新增 `src/utils/taskStore.ts`**（最小实现，对齐 REQUIREMENTS §3 的“本地持久化”方向）： |
| | - 按日键 `YYYY-MM-DD` 存取任务列表（localStorage） |
| | - 提供 `todayTasks()` / `addTask(name, minutes)` / `toggleTask(id)` / `removeTask(id)` |
| | - `ExperimentList.tsx` 与 `ControlPanel.tsx` 都从 `taskStore` 读任务 |
| | - `src/constants/preview.ts` 保留但仅由 `?demo=1` 路径使用（demoMode 下直接 return preview 数据） |
| | - 正常模式若无真实任务（首次打开）→ 显示“暂无任务，请添加” + 禁用生成按钮（或空列表） |
| 影响文件 | `src/utils/taskStore.ts`（新建）、`src/components/ExperimentList.tsx`（改数据源）、`src/components/ControlPanel.tsx`（改数据源 + 无任务时禁用/提示）、`src/utils/cardGenerator.ts`（接口不变）、`src/constants/preview.ts`（不动） |
| 验证 | 正常模式首次打开：任务列表空/显示占位；添加 5 条并完成 5 条 → 生成按钮亮起；跨天未完成任务不自动带入新一天。 |

---

### P1-5 每日判断使用 UTC 日期

| 项 | 内容 |
|---|---|
| 现象 | `src/utils/cardStorage.ts:45` 用 `new Date().toISOString().slice(0, 10)` 取 UTC 日期。北京时间 0:00–8:00 会误判为“前一天”，导致同一自然日可重复生成或正当生成被锁。 |
| 根因 | `toISOString()` 返回的是 UTC 时间，不是本地日期。 |
| 修法 | 引入 `localDateKey(date?: Date): string` 工具，用 `getFullYear/getMonth/getDate` 取本地时区；`canGenerateToday()` 和 `addCard()` / `saveCollection()` 的 `updatedAt` 全部改用同一套本地日期键。 |
| 影响文件 | `src/utils/cardStorage.ts`（+工具函数，替换两处 `slice(0,10)`） |
| 验证 | 系统时间调至 2026-01-02 07:00（UTC+8 = 2026-01-01 23:00 UTC），仍允许生成；次日 00:00 之后立刻锁死。 |

---

## 3. 实现顺序建议

按“先止血、再架构、最后数据层”的顺序：

1. **P1-1**（5 min）—— 立刻恢复构建，避免后续 diff 无法 review。
2. **P1-5**（10 min）—— 日期函数改动极小、零依赖，顺手消除跨天边界 bug。
3. **P1-4**（1–2 h）—— 补 `taskStore.ts` 并接入 `ExperimentList` + `ControlPanel`；这是产品可用性的前提。
4. **P1-2 + P1-3**（2–3 h）—— 完整 Rust command 迁移。改动最大但风险可控（前端保留模板降级）。步骤如下：
   - `Cargo.toml` 加 `reqwest` + `serde` + `base64`
   - `commands.rs` 新增 `generate_ai_copy` / `generate_artwork`
   - `main.rs` 注册 handler
   - `stepfun.ts` 改为只做 `invoke` 分发（或删掉）
   - `cardImage.ts` / `ControlPanel.tsx` 调用 Rust，失败走 fallback

**不建议的折中方案**：前端保留 `fetch('https://api.stepfun.com/...')` 但 key 放 Rust → 仍被 CSP 拦；或前端换域名代理 → 单机版不该依赖额外服务。要么完整走 Rust，要么前端彻底放弃网络请求。

---

## 4. 验证命令清单

```bash
# 1) TypeScript 编译
pnpm run build
# 期望：tsc --noEmit && vite build 通过，产物里无 VITE_STEPFUN_API_KEY

# 2) 浏览器预览（demo 模式）
pnpm run dev
# 打开 http://127.0.0.1:1420/?demo=1
# 期望：预览任务全完成 → 可生成 → 模板卡降级（无 key 时）→ reveal modal 正常

# 3) 浏览器预览（正常模式）
pnpm run dev
# 打开 http://127.0.0.1:1420
# 期望：无真实任务时列表空/禁用生成；添加 5 条并完成 → 可生成；跨天锁死

# 4) 桌面端（Tauri）
pnpm run tauri dev
# 期望：生成按钮正常 → Rust 调用 StepFun → 卡牌成功；CSP 无 violation

# 5) Rust 单元测试（如新增 taskStore Rust 端则跑）
pnpm run test:native
```

---

## 5. 边界情况与风险

| 风险 | 缓解 |
|---|---|
| Rust `reqwest` 编译依赖 OpenSSL / SLL 后端 | Windows + Tauri 默认用 `native-tls`，无需额外系统库；如遇链接问题改 `reqwest = { version = "0.12", default-features = false, features = ["json", "rustls-tls"] }` |
| `base64` 解码大图（~1.2MB）在 Rust 侧内存开销 | 单张图约 1.2MB，Tauri command 传 `String` 可行；Rust 侧用 `base64` crate 解码后转 PNG 字节回传，或前端继续做 canvas 合成（Rust 只返回 b64） |
| 真实任务模块与后续“添加任务”UI 的接口对齐 | `taskStore.ts` 保留极简 CRUD，UI 后续直接换调用方；与 REQUIREMENTS 的“任务管理：添加、完成、取消和删除，本地持久化”对齐 |
| 日期本地化在不同 OS 上的表现 | `getFullYear/getMonth/getDate` 在 Windows / macOS / Linux 均返回本地时区，跨平台一致 |

---

## 6. 文件改动总览（预估）

```
修改:
  src/components/ControlPanel.tsx          (+import type InventionCard; 改数据源为 taskStore; 加 invoke 调用)
  src/utils/cardStorage.ts                 (+localDateKey 工具; 替换 UTC 切片)
  src/utils/cardImage.ts                   (调用方从 stepfun 改为 invoke / fallback)
  src/components/ExperimentList.tsx        (数据源从 preview 改为 taskStore)
  src-tauri/src/commands.rs                (+generate_ai_copy / generate_artwork)
  src-tauri/src/main.rs                    (注册新 handler)
  src-tauri/Cargo.toml                     (+reqwest/serde/base64)
  src-tauri/tauri.conf.json                (csp 去掉 api.stepfun.com，如果之前加过的话)

新建:
  src/utils/taskStore.ts                   (今日任务本地持久化)

删除/降级:
  src/utils/stepfun.ts                     (前端不再直连，key 不再进入 bundle)
  .env.example                             (移除 VITE_STEPFUN_API_KEY)

保留不动:
  src/constants/preview.ts                 (仅 demo 模式使用)
  src/types/card.ts
  src/types/experiment.ts
  src-tauri/src/geometry.rs / placement.rs (窗口逻辑不受影响)
```

---

## 7. 决策待确认

1. **P1-2/3 是否立即做完整 Rust 迁移？** 或先做“前端删 key + Rust 返回 null 的止血版”，再下一轮补全？
2. **真实任务模块的首次打开行为**：正常模式首次打开列表为空 + 禁用生成按钮，还是显示“演示任务（仅本次）”作为引导？
3. **卡牌图片是否保留 AI 生图？** `REQUIREMENTS.md` §3 写明“卡牌图片由 AI 生成（调用阶跃星辰 Image API）”，但 `PRODUCT_MEMORY.md`（2026-09-07）写“首版文字加统一模板，不生成图片”。当前代码已实现生图。按 `REQUIREMENTS.md` 保留还是按 `PRODUCT_MEMORY.md` 砍掉？
