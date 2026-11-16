# paper-scraps

个人站点与内容索引。仓库名 `blog`，包名 `paper-scraps`。Astro 7 生成静态站，部署在 Cloudflare Pages。

## 技术

- Astro 7 + TypeScript，pnpm 10
- KaTeX 公式、Mermaid 图，构建时渲染
- RSS、Atom、JSON Feed、sitemap、OG 图生成
- 字体 Fraunces、Inter、IBM Plex Mono，用 fontsource 自托管
- Cloudflare Pages Functions 提供登录、收藏、阅读记录、点赞与订阅偏好

## 本地

需要 Node.js 22.23 以上。

```bash
pnpm install
pnpm dev      # 仅静态页面，/api/* 不可用
pnpm build    # 构建前先跑 scripts/sync-content.mjs 同步内容
pnpm deploy   # 构建并推到 Cloudflare Pages，项目名 tenyear-blog
```

要本地调试 Login / 收藏 / 点赞接口，用 Wrangler 起 Pages：

```bash
pnpm build
wrangler pages dev dist --kv LIKES --kv SESSIONS
```

## 内容与配置

- `src/content/posts/`：文章 Markdown，文章 id 就是文件名
- `src/content/projects/`：项目 Markdown
- `src/site.config.ts`：站点名、导航、订阅源、分发渠道、社交链接
- `src/pages/raw/[slug].md.ts`：每篇文章的纯 Markdown 端点 `/raw/<id>.md`
- `scripts/generate-og.mjs`：生成分享图
- `wrangler.toml`：部署目标与 KV 绑定

内容在构建前由脚本同步，不要手改 `dist/`。

## 登录与账号

只登录，不注册，不提供账号密码。全部使用第三方 OAuth、邮箱魔法链接或 Telegram，不使用微信 / QQ / Microsoft 这类需要实名或信用卡的平台。

### 数据库

登录会话、收藏、阅读记录、点赞列表、订阅偏好都在 KV `SESSIONS` 里。先创建：

```bash
wrangler kv namespace create SESSIONS
```

把返回的 id 填入 `wrangler.toml`（文件里已留注释位置），然后取消注释。

文章点赞总数仍在 KV `LIKES`。

### 回调地址

在平台后台填写的回调地址统一为：

```
https://blog.tenyearmc.top/api/auth/<provider>/callback
```

`<provider>` 可取：`github`、`modrinth`、`google`、`discord`、`gitlab`、`codeberg`、`reddit`、`spotify`、`huggingface`、`mastodon`。

### 环境变量

OAuth 变量统一带 `AUTH_` 前缀，完整清单见 `wrangler.toml` 底部注释。设置示例：

```bash
wrangler pages secret put AUTH_GITHUB_CLIENT_ID --project-name tenyear-blog
wrangler pages secret put AUTH_GITHUB_CLIENT_SECRET --project-name tenyear-blog
```

邮箱登录还需要 `RESEND_API_KEY` 与 `AUTH_EMAIL_FROM`；Telegram 需要 `AUTH_TELEGRAM_BOT_TOKEN` 与 `AUTH_TELEGRAM_BOT_USERNAME`。

未配置的登录方式会被 `/api/auth/providers` 标记为不可用，登录页自动禁用，不会出现死链。

### 平台说明

- GitHub：`read:user user:email`
- Modrinth：`USER_READ`，PKCE，不需要 client secret 也能工作
- Mastodon：需要额外设置 `AUTH_MASTODON_INSTANCE`，例如 `mastodon.social`
- Spotify / Reddit / Hugging Face / Discord / GitLab / Codeberg：标准 OAuth 2.0

## 订阅源

三个地址都是真实文件，点击直接打开：

- `/rss.xml`：RSS 2.0
- `/atom.xml`：Atom
- `/feed.json`：JSON Feed 1.1

`/subscribe/` 是订阅与分发页，提供复制按钮与各平台入口。

## 分享与发布

- 文章页「分享卡片」用 Canvas 生成 1200×630 或 1080×1440 的图片，内含真实二维码，可下载 PNG 或走系统分享。
- 转发渠道覆盖微博、即刻、小红书、豆瓣、QQ、微信、Telegram、WhatsApp、LINE、邮件、X、Bluesky、Mastodon、Threads、Facebook、LinkedIn、Reddit、Pinterest、Tumblr、Hacker News、V2EX、B 站动态。没有公开 Web intent 的渠道会复制文案或链接。
- 文章底部「分发」面板支持复制 Markdown、下载 `.md`、查看纯文本、在 GitHub 编辑。
