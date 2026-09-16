# Cloudflare 浏览器部署

前端产物是静态文件。任务和设置保存在当前浏览器，图片资产保存在 IndexedDB，
不会自动跨设备同步。

## 当前架构

AI 卡牌代理入口是 `public/_worker.js`。Vite 将它复制到
`dist/_worker.js`，Cloudflare Pages 使用 Advanced Mode 处理请求，
静态资源由 `env.ASSETS` 转发。

前端使用同域相对路径 `/api/cards/copy` 和 `/api/cards/art`，
无需配置外部代理 URL。浏览器道具锻造当前使用本地降级内容。

## 构建与发布

1. 连接 GitHub 仓库 `moyanyanyanyan/custom_plan`。
2. 构建命令为 `corepack pnpm run build`，输出目录为 `dist`；
   使用 Node.js 22.22.2 和 pnpm 10.33.4。
3. 在 Pages 项目的变量和机密中添加 `STEPFUN_API_KEY`，类型选择机密。
   密钥只供服务端使用，不写入前端代码。
4. 如通过控制台上传 zip，根目录直接放置 `index.html` 与 `_worker.js`，
   不再套一层 `dist`。

## 额度与可选限流

默认卡牌文案每天 20 次、插画每天 5 次，按日期、接口、设备 ID 和 IP 计数。
可通过 `CARD_COPY_DAILY_LIMIT` 和 `CARD_ART_DAILY_LIMIT` 调整。

可选绑定名为 `USAGE_LIMITER` 的 Durable Object，实现跨实例计数。
未绑定时使用进程内计数，不跨实例，重启后清零。
配置该绑定还需要在 Cloudflare 侧准备相应资源。

## 上线检查

- `/health` 返回 `{ "ok": true }`。
- 页面刷新和静态资源正常，请求发送到同域 `/api/cards/*`。
- AI 文案和插画按配置可用，密钥不出现在浏览器或前端产物中。
- 本地数据在当前浏览器重新打开后保留。

本文描述部署步骤，不表示当前部署已完成。
