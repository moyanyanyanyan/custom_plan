# Pixel System：产品想法、实现策略与协作说明

> 本文用于把 Pixel System 的产品想法、实现方案、代码入口、验证结果和已知问题同步给团队成员。队友可以直接在本分支继续修改；提交前请先阅读“协作边界”和“已知问题”。

## 1. 产品想法

把日常任务完成后的奖励做成一个轻量的像素道具系统，让用户不仅能看到任务统计，还能持续收集与当天行动相关的“物品”。核心体验是：

1. 用户完成任务后进入图鉴。
2. 每个自然日最多锻造一个道具，避免无限刷取。
3. 点击锻造后先播放短暂的锻造过程，再揭示道具结果。
4. 道具可能带有附魔；附魔文案轻松、略带随机性，同时保留产生它的任务来源。
5. 图鉴同时承载卡牌和道具，用户可以在两个标签页之间切换。
6. 道具数据应在浏览器版和 Tauri 桌面版之间保持一致，并兼容旧存档。

### 体验目标

- **即时反馈**：锻造动画和揭示弹窗让完成任务有奖励感。
- **每日节奏**：按 `dailyKey` 限制每日生成次数。
- **收藏感**：道具按获得时间倒序展示，附魔道具使用明显的稀有视觉效果。
- **可解释性**：每个道具记录 `sourceTask`，用户能知道它来自哪项行动。
- **可扩展性**：稀有度概率、道具池和附魔池独立配置，后续可加入更多等级、合成和筛选功能。

## 2. 当前实现范围

### 已实现

- 道具类型 `PixelItem` 与附魔类型定义。
- 15 个演示道具数据，覆盖无附魔、升级、诅咒、特殊和称号类附魔。
- 每日唯一锻造限制。
- 按稀有度选择附魔概率：
  - copper：2%
  - silver：5%
  - gold：10%
  - diamond：20%
- 2.7 秒锻造/揭示交互流程。
- 图鉴“卡牌 / 道具”双标签。
- 道具卡片排序、空状态、数量统计和响应式像素样式。
- 道具写入 `AppData.items`，浏览器端使用现有 AppData/localStorage 链路，Tauri 端使用现有 Rust 存储链路。
- 旧存档兼容：缺少 `items` 时使用空数组；无效道具记录逐项过滤。
- Tauri AI 命令的 StepFun 图片生成调用和 API Key 保存逻辑修复。

### 暂未实现

- 真实后端同步或多人共享图鉴。
- 道具合成、分解、交易和重复道具堆叠规则。
- 由软件内 AI 自动生成道具名称/描述的完整链路；当前采用前端道具池和规则生成。
- 真实图片资源或专门的像素精灵图；当前界面使用现有图标/样式表现。
- 以单独的道具单元测试覆盖锻造随机性和每日边界。

## 3. 实现策略

### 3.1 数据模型

`PixelItem` 当前字段：

```ts
type PixelItem = {
  id: string;
  name: string;
  description: string;
  sourceTask: string;
  earnedAt: string;
  dailyKey: string;
  enchantment: Enchantment | null;
};
```

`dailyKey` 使用本地日期 `YYYY-MM-DD`，用于判断当天是否已生成道具；`earnedAt` 使用 ISO 时间，用于展示和排序；`sourceTask` 保存任务来源。

附魔字段包含 `name`、`type`、`effect` 和 `sourceTask`。目前 `type` 支持 `title`、`upgrade`、`cursed`、`special`。

### 3.2 生成与持久化

入口是 `src/hooks/useItems.ts`：

- 从 `useAppData()` 读取 `data.items` 和 `update`。
- 从 `useCurrentDate()` 获取当前 `dateKey`。
- `canGenerate` 检查当前日期是否已有道具。
- `forge()` 防止重复点击；生成对象后通过 `update()` 追加到 `current.items`。
- 保存成功后把结果放入 `revealedItem`，供弹窗展示。
- 当前任务来源优先取已完成任务，否则取第一项任务，全部为空时使用“认真生活”。

该实现复用现有 AppData 持久化，不新增第二套浏览器/桌面存储，避免两端数据格式分叉。

### 3.3 UI 结构

- `src/components/cards/ArchiveModal.tsx`：图鉴容器和卡牌/道具标签切换。
- `src/components/ItemCollection.tsx`：道具列表、统计、锻造入口和空状态。
- `src/components/ItemForgeModal.tsx`：锻造动画和揭示结果弹窗。
- `src/components/items.css`：道具图鉴、稀有度/附魔动效、响应式布局。
- `src/components/ControlPanel.tsx`：把当前 `tasks` 传给图鉴，确保道具能记录任务来源。

弹窗支持点击遮罩关闭，点击面板内容不会冒泡关闭；锻造过程中禁止重复触发。

### 3.4 存档兼容与防御式校验

- `src/types/storage.ts` 的 `AppData` 增加 `items: PixelItem[]`。
- `src/constants/defaults.ts` 提供默认空数组。
- `src/utils/validation.ts` 增加 `isPixelItem()`，并在 `normalizeData()` 中使用 `safeArray()` 过滤坏记录。
- `src-tauri/src/data/models.rs` 增加 `items: Vec<serde_json::Value>`，配合 `serde(default)` 兼容已有桌面存档。

## 4. 代码地图

| 文件 | 职责 |
| --- | --- |
| `src/hooks/useItems.ts` | 道具生成、每日限制、附魔判定、持久化 |
| `src/types/item.ts` | `PixelItem` 与 `Enchantment` 类型 |
| `src/constants/pixelItems.ts` | 演示道具池、附魔概率配置 |
| `src/components/ItemCollection.tsx` | 道具图鉴列表和锻造入口 |
| `src/components/ItemForgeModal.tsx` | 锻造/揭示弹窗 |
| `src/components/items.css` | 像素风样式与动画 |
| `src/components/cards/ArchiveModal.tsx` | 图鉴双标签入口 |
| `src/components/ControlPanel.tsx` | 图鉴所需任务上下文传递 |
| `src/types/storage.ts` | AppData 类型扩展 |
| `src/constants/defaults.ts` | 默认存档扩展 |
| `src/utils/validation.ts` | 存档校验和旧数据兼容 |
| `src-tauri/src/data/models.rs` | Tauri 存档模型扩展 |
| `src-tauri/src/commands/ai.rs` | Tauri AI 命令修复 |

## 5. 协作修改建议

### 推荐修改顺序

1. 先阅读 `useItems.ts`、`item.ts`、`validation.ts`，确认数据字段和每日限制。
2. 修改 UI 时优先在 `ItemCollection.tsx` / `ItemForgeModal.tsx` 中完成结构，再在 `items.css` 中调整视觉。
3. 增加字段时必须同步：类型、默认值、校验、浏览器存储和 Rust 模型。
4. 增加稀有度或附魔时同步更新配置、展示样式和测试。
5. 修改 Tauri 数据模型后同时验证旧存档加载，不要直接假设已有用户存档包含 `items`。

### 注意事项

- 不要把道具再写入另一套独立 localStorage key；统一走 `AppData`。
- `dailyKey` 是本地日期，不要直接用 UTC 日期替代，否则深夜时段可能出现跨日误判。
- `forge()` 已有进行中保护和当日保护；任何新入口都应复用该 hook，不能绕过限制。
- 随机内容要保持可测试性；若后续需要稳定测试，可为生成器注入随机函数，而不是在组件中硬编码更多随机逻辑。
- `src-tauri/target/`、`src-tauri/gen/` 和临时 `.tmp-*` 文件是本地构建/排障产物，不应提交到仓库。
- 当前仓库顶层的 `hackson` 子模块指针存在工作区变化；若不是有意同步子模块，不要把它混入 Pixel System 提交。

## 6. 验证结果

已执行：

```text
npm run build
```

通过：TypeScript 检查和 Vite 生产构建成功。

```text
npm run test:native
```

通过：8 个 Rust/Tauri 测试全部通过。

```text
npx vitest run tests/unit/validation.test.ts tests/unit/date.test.ts tests/unit/colorExtraction.test.ts
```

通过：3 个测试文件、8 个测试全部通过。

```text
git diff --check
```

通过：未发现空白错误。

## 7. 已知问题与后续建议

### 既有完整测试问题

`npm test` 仍有 3 组已有测试失败：

1. `cardGenerator.test.ts` 对 `earnedAt` 的既有断言与当前生成结果不一致。
2. `ExperimentList.test.tsx` 的 jsdom 环境缺少 `scrollIntoView`。
3. `AddTaskControl.test.tsx` 出现重复挂载 DOM，疑似测试清理问题。

这些问题不是本次 Pixel System 代码引入的，但后续可以单独修复，避免团队误以为完整测试全绿。

### Pixel System 后续优先级

1. 为 `createItem` 增加纯函数测试：日期限制、任务来源、附魔概率边界。
2. 为 `isPixelItem` 增加严格的附魔字段校验，避免任意对象被当作有效附魔。
3. 将随机生成逻辑抽到独立模块，并支持注入随机源。
4. 明确重复道具的展示策略：叠加计数、逐条展示或合并收藏。
5. 为不同 rarity 增加明确的 UI 传递和视觉标识；当前 hook 支持 rarity 参数，但调用入口仍以 gold 为默认主流程。
6. 如果加入 AI 文案，必须保留前端降级内容，避免 API 不可用时锻造流程失效。
7. 后续如加入真实像素图片，保持插画纯图，不在图片内嵌文字；标题继续由 CSS 独立展示。

## 8. 提交与分支说明

本次功能建议以独立提交放在 `pixel-system-v1` 分支，方便队友查看、拉取和继续修改。提交信息建议：

```text
feat: add Pixel System item forge and archive
```

队友可执行：

```bash
git fetch origin
git checkout pixel-system-v1
git pull origin pixel-system-v1
npm install
npm run build
npm run test:native
```

如果后续要合并到主分支，请先检查完整测试中的既有失败，并确认是否需要同步 `hackson` 子模块指针。
