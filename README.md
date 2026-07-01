# 主神日志：午夜病院

React + TypeScript + Vite 前端原型，包含纯 TypeScript 规则引擎、内容包、图片 manifest、本地存档和 DeepSeek 服务端代理。

## 本地开发

```bash
npm install
cp .env.example .env.local
npm run dev -- --port 5176
```

`.env.local` 只放在本机，不能提交或复制到前端代码里：

```bash
DEEPSEEK_API_KEY=你的 DeepSeek key
DEEPSEEK_MODEL=deepseek-v4-flash
```

## 生产构建与启动

```bash
npm run build
npm run check:prod
npm start
```

生产启动脚本会：

- 服务 `dist/` 静态前端资源。
- 提供 `/api/story/status`、`/api/story`、`/api/story/assistant-stream`。
- 提供 `/healthz` 健康检查。
- 从真实环境变量或 `.env.local` / `.env.production.local` 读取 DeepSeek 配置，但不会向前端暴露密钥。

如果要允许 GitHub Pages 前端跨域调用这个服务端，需要在服务端设置：

```bash
STORY_API_ALLOWED_ORIGIN=https://<你的用户名>.github.io
```

默认端口是 `4173`，可通过环境变量覆盖：

```bash
PORT=8080 HOST=0.0.0.0 npm start
```

## GitHub Pages 部署

项目已内置 GitHub Actions 工作流：[.github/workflows/deploy-pages.yml](/Users/biantongchuangchuanmei/Desktop/游戏2/.github/workflows/deploy-pages.yml)。

推送到 GitHub 的 `main` 分支后，可以通过 GitHub Pages 发布静态网页：

```bash
npm run verify:pages
git remote add origin git@github.com:<你的用户名>/midnight-hospital-mvp.git
git push -u origin main
```

GitHub 仓库设置里需要把 `Pages -> Build and deployment -> Source` 设为 `GitHub Actions`。

注意：GitHub Pages 不能运行 Node 服务端，也不能安全保存 DeepSeek key，所以 Pages 版本会关闭真实 AI API，只保留离线剧情和可游玩的规则引擎。完整说明见 [docs/github-pages-deploy.md](/Users/biantongchuangchuanmei/Desktop/游戏2/docs/github-pages-deploy.md)。

## 上线前验证

```bash
npm run verify:prod
```

该命令会依次运行：

- `npm test`
- `npm run build`
- `npm run check:prod`
- `npm run sim:difficulty -- --runs=10000`

`check:prod` 会检查：

- `.env.example` 不含真实 API key。
- `public/assets/images/midnight_hospital` 下有 50 个 WebP 资源。
- `assetManifest` 的所有本地资源路径都存在。
- `dist/` 和 `dist-server/` 构建产物存在。

## 规则边界

AI 只生成剧情文本、助手建议和局势解释。生命、理智、污染、碎片、时间、判定和结局只能由 `src/engine` 下的规则引擎计算，UI、StoryProvider 和 AI 返回内容不得直接修改这些状态。
