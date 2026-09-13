# Cloudflare 浏览器部署

前端构建产物是静态文件；任务和设置保存在访客当前浏览器，图片资产保存在 IndexedDB，不会自动跨设备同步。

## 架构：AI 代理与站点同域，不再使用 workers.dev

AI 代理（文案 + 插画）由 Pages 自己承载，入口是仓库里的 `public/_worker.js`：
`vite build` 会把它原样复制到 `dist/_worker.js`，Pages 见到输出目录根部的 `_worker.js`
即以它作为唯一入口（Advanced Mode），静态资源由 `env.ASSETS` 转发。
前端以**相对路径** `/api/cards/copy`、`/api/cards/art` 调用，已不再读取 `VITE_AI_PROXY_URL`。

**为什么弃用 Worker**：`*.workers.dev` 在国内被 DNS 投毒 + SNI 阻断 —— 路由器 DNS 返回
`31.13.70.9`（Facebook 网段）、`1.1.1.1` 返回 `199.59.149.238`（Twitter 网段）、
`223.5.5.5` 返回 `108.160.162.31`（Dropbox 网段）；用 DoH（`doh.pub`）拿到真 IP
`172.67.172.75` / `104.21.88.41` 后带正确 SNI 直连仍然 `ECONNRESET`。
而 `*.pages.dev` 不受影响（解析到真 Cloudflare IP，HTTPS 200）。
因此「换 DNS」「改 hosts」都救不了，把代理搬到站点同域是唯一稳的做法。

`worker/` 目录（wrangler + Durable Object 版本）保留作参考，线上已不再使用。

## Pages

1. 创建 Pages 项目，连 Gitee 仓库或控制台直传 zip 均可：
   - **连仓库**：构建命令 `corepack pnpm run build`，输出目录 `dist`，Node.js 22.22.2。
   - **控制台直传**：把 `dist/` 打包成 zip 上传，**zip 根目录必须直接是 `index.html` 与 `_worker.js`**
     （不要再套一层 `dist/` 目录）。
2. **不需要**再设置 `VITE_AI_PROXY_URL`（即使还留着旧值也不影响，前端已不读取它）。
3. 在 Pages 项目 → Settings → 变量和机密 添加 `STEPFUN_API_KEY`（类型选「机密」）。
   这是唯一必需的配置项；密钥只存在服务端，不会进入前端产物。
4. 可选：绑定名为 `USAGE_LIMITER` 的 Durable Object 可获得跨实例精确限流；
   未绑定时自动退回进程内计数（软保护：不跨实例、重启清零）。

## 额度

默认文案 20 次/日、插画 5 次/日，按「日期 + 接口 + 设备 ID + IP」计数。
上限可通过 Pages 的变量 `CARD_COPY_DAILY_LIMIT` / `CARD_ART_DAILY_LIMIT` 调整。

## 上线检查

- 访问 `/health` 应返回 `{ "ok": true }`。
- 浏览器开发者工具中不得出现 `STEPFUN_API_KEY`。
- 生产域名刷新、AI 文案、AI 插画均可用；请求应打到同域 `/api/cards/*`，
  产物与网络面板中都不应再出现 `workers.dev`。
- `localStorage` 保存任务，IndexedDB 保存图片资产；数据仅属于当前浏览器。
