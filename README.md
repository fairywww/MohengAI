# 墨衡 · 语文原创命题助手

基于 Claude 设计稿还原并扩展的完整本地系统。它是一个无依赖 Web 应用，包含文本导入、命题要求配置、AI 分析、多模型协同、定稿编辑、导出和本地题库。

## 启动

```bash
node server.mjs
```

默认访问地址：

```text
http://localhost:4173
```

如需换端口：

```bash
PORT=5173 node server.mjs
```

## 部署

当前版本是纯静态站点，推荐部署到 Cloudflare Pages 或 Vercel。安全头和缓存策略已准备好：

- Cloudflare Pages: `_headers`
- Vercel: `vercel.json`

详细步骤见 [DEPLOY.md](./DEPLOY.md)。
