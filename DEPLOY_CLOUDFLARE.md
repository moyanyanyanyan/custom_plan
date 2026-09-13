# Cloudflare 浏览器部署

前端构建产物是静态文件；任务和设置保存在访客当前浏览器，图片资产保存在 IndexedDB，不会自动跨设备同步。

## Pages

1. 创建 Pages 项目并连接 Gitee 仓库，生产分支设为 `master`。
2. 构建命令：`corepack pnpm run build`；输出目录：`dist`；Node.js：22.22.2。
3. 在 Pages 生产环境设置 `VITE_AI_PROXY_URL` 为 Worker 地址（例如 `https://absurd-invention-ai.<account>.workers.dev`）。
4. Pages 会为每次提交创建预览，构建失败时保留上一版生产部署。

## Worker

```powershell
cd worker
npx wrangler login
npx wrangler deploy
npx wrangler secret put STEPFUN_API_KEY
```

部署后访问 `/health` 应返回 `{ "ok": true }`。将 `worker/wrangler.toml` 的 `ALLOWED_ORIGIN` 改为实际 Pages 域名后重新部署。

Worker 不记录 API Key、prompt、图片或响应正文。额度通过 Durable Object 按日期、接口、设备 ID 和 IP 持久计数；默认文案 20 次/日、插画 5 次/日，可在 Worker vars 调整。

## 上线检查

- 浏览器开发者工具中不得出现 `STEPFUN_API_KEY`。
- 生产域名刷新、AI 文案、AI 插画和 `/health` 均可用。
- `localStorage` 保存任务，IndexedDB 保存图片资产；数据仅属于当前浏览器。
