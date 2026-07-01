# GitHub Pages 部署说明

这个项目可以直接部署到 GitHub Pages，让朋友通过网页游玩。

## 重要限制

GitHub Pages 只能托管静态文件，不能运行 Node 服务端，也不能安全保存 `DEEPSEEK_API_KEY`。因此 GitHub Pages 版本会：

- 保留完整前端、规则引擎、卡牌、图片、存档和离线剧情。
- 主神助手显示 `AI 未配置`，不会把本机 key 写进网页。
- 不提供 `/api/story`、`/api/story/status`、`/api/story/assistant-stream`。

如果要让朋友在线使用真实 AI，需要另部署一个服务端。当前项目已准备好 Render 后端配置，见 [Render 后端部署说明](./render-backend-deploy.md)。

## 首次推送到 GitHub

如果还没有 GitHub 仓库，先在 GitHub 网页创建一个新仓库，例如：

```text
midnight-hospital-mvp
```

然后在本项目目录执行：

```bash
git remote add origin git@github.com:<你的用户名>/midnight-hospital-mvp.git
git push -u origin main
```

如果你使用 HTTPS remote：

```bash
git remote add origin https://github.com/<你的用户名>/midnight-hospital-mvp.git
git push -u origin main
```

## 启用 GitHub Pages

1. 打开 GitHub 仓库页面。
2. 进入 `Settings`。
3. 进入 `Pages`。
4. `Build and deployment` 的 `Source` 选择 `GitHub Actions`。
5. 推送到 `main` 后，等待 `Actions` 里的 `Deploy GitHub Pages` 完成。

部署完成后，网页地址通常是：

```text
https://<你的用户名>.github.io/midnight-hospital-mvp/
```

如果仓库名是 `<你的用户名>.github.io`，地址是：

```text
https://<你的用户名>.github.io/
```

## 本地验证 Pages 构建

```bash
npm run verify:pages
```

也可以模拟 GitHub Pages 的子路径构建：

```bash
GITHUB_REPOSITORY=<你的用户名>/midnight-hospital-mvp VITE_DISABLE_STORY_API=true npm run build
```

然后检查 `dist/index.html` 中的静态资源路径是否带有仓库名前缀。

## 后续接入真实 AI

GitHub Pages 前端已经支持通过环境变量指定外部后端：

```bash
VITE_STORY_API_BASE=https://your-backend.example.com
```

外部后端需要提供：

- `GET /api/story/status`
- `POST /api/story`
- `POST /api/story/assistant-stream`

后端保存 `DEEPSEEK_API_KEY`，前端只保存公开后端地址。

如果直接使用本项目的生产服务器当外部 AI 后端，后端环境变量至少需要：

```bash
DEEPSEEK_API_KEY=你的 DeepSeek key
DEEPSEEK_MODEL=deepseek-v4-flash
STORY_API_ALLOWED_ORIGIN=https://<你的用户名>.github.io
```

然后 GitHub Pages 前端构建时设置：

```bash
VITE_STORY_API_BASE=https://your-backend.example.com
```
