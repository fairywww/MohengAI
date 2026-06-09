# 部署说明

## 推荐方案：Cloudflare Pages

适合当前版本，因为项目是纯静态站点，不需要暴露服务器、数据库或 SSH。

1. 把项目推送到 GitHub。
2. 打开 Cloudflare Dashboard，进入 `Workers & Pages`。
3. 选择 `Create application` -> `Pages` -> `Connect to Git`。
4. 选择这个仓库。
5. 构建设置：
   - Framework preset: `None`
   - Build command: 留空
   - Build output directory: `/`
6. 部署完成后，进入 `Custom domains` 绑定你的域名。
7. 如果只想给指定人员访问，开启 Cloudflare Access，用邮箱白名单保护站点。

项目根目录里的 `_headers` 会在 Cloudflare Pages 上自动生效，包含 CSP、禁止 iframe 嵌套、权限限制和基础缓存策略。

## 备选方案：Vercel

1. 把项目推送到 GitHub。
2. 在 Vercel 新建项目并选择这个仓库。
3. 构建设置：
   - Framework Preset: `Other`
   - Build Command: 留空
   - Output Directory: `.`
4. 部署完成后在 `Domains` 里绑定域名。

项目根目录里的 `vercel.json` 会自动应用安全响应头。

## 不推荐但可用：云服务器 + Nginx

只有在要接入真实 AI API、账号体系、云端题库或文件上传时才建议购买云服务器。

最低配置：

- Ubuntu 24.04 LTS
- 1 核 1G 起步，2G 更稳
- 只开放 `80`、`443`、必要时 `22`
- SSH 使用密钥登录，禁用 root 密码登录
- 用 Nginx 托管静态文件，不要把 Node 开发服务暴露到公网

示例 Nginx 配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/moheng;
    index index.html;

    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

然后用 Certbot 配 HTTPS。中国大陆服务器通常还需要 ICP 备案；不想备案可以选香港、新加坡、日本或美国节点。

## 当前安全边界

- 当前版本不上传用户输入，题库只保存在访问者自己的浏览器 `localStorage`。
- 不要把真实 API Key 写进 `app.js`。以后接 AI API 时必须加后端代理。
- 如果涉及学生作文、成绩或个人信息，建议先加访问控制，再上线。
