# Render 后端部署说明

GitHub Pages 负责托管前端网页，Render 负责托管 AI 后端。后端只提供 API，不需要朋友知道 DeepSeek key。

## 1. 推送当前代码

确认代码已经推送到 GitHub：

```bash
git push
```

本仓库已经包含 `render.yaml`，Render 可以直接读取它创建 Web Service。

## 2. 在 Render 创建 Blueprint

1. 打开 [Render Dashboard](https://dashboard.render.com/)。
2. 选择 `New`。
3. 选择 `Blueprint`。
4. 连接 GitHub 仓库 `13212557720/midnight-hospital-mvp`。
5. Render 会读取仓库根目录的 `render.yaml`。
6. 按提示填写 `DEEPSEEK_API_KEY`。
7. 创建服务并等待部署完成。

部署成功后，Render 会给你一个后端地址，通常类似：

```text
https://midnight-hospital-api.onrender.com
```

## 3. 验证后端

把下面 URL 里的域名换成你的 Render 地址：

```bash
curl https://midnight-hospital-api.onrender.com/healthz
curl https://midnight-hospital-api.onrender.com/api/story/status
```

正常应该看到：

```json
{"configured":true,"provider":"deepseek","model":"deepseek-v4-flash"}
```

## 4. 让 GitHub Pages 前端连接 Render 后端

打开 GitHub 仓库：

```text
https://github.com/13212557720/midnight-hospital-mvp
```

进入：

```text
Settings -> Secrets and variables -> Actions -> Variables -> New repository variable
```

新增变量：

```text
Name: VITE_STORY_API_BASE
Value: https://midnight-hospital-api.onrender.com
```

保存后，进入：

```text
Actions -> Deploy GitHub Pages -> Run workflow
```

重新部署完成后，GitHub Pages 前端会连接 Render 后端。

## 5. CORS 设置

`render.yaml` 已经设置：

```yaml
STORY_API_ALLOWED_ORIGIN=https://13212557720.github.io
```

这个值允许 GitHub Pages 网页跨域调用 Render 后端。不要设置成 `*`，否则别人也可以拿你的后端额度调用模型。

## 6. 注意事项

- DeepSeek key 只填在 Render 环境变量里，不要填到 GitHub Pages、前端代码或 `VITE_*` 变量。
- Render 免费服务可能会休眠，朋友第一次打开 AI 助手时可能会等几十秒。
- 如果 GitHub Pages 地址换成自定义域名，需要同步修改 Render 的 `STORY_API_ALLOWED_ORIGIN`。
