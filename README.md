# paper-scraps

个人站点与内容索引。仓库名 `blog`，包名 `paper-scraps`。Astro 7 生成静态站，部署在 Cloudflare Pages。

## 技术

- Astro 7 + TypeScript，pnpm 10
- KaTeX 公式、Mermaid 图，构建时渲染
- RSS、sitemap、OG 图生成
- 字体 Fraunces、Inter、IBM Plex Mono，用 fontsource 自托管

## 本地

需要 Node.js 22.23 以上。

```bash
pnpm install
pnpm dev      # 本地预览
pnpm build    # 构建前先跑 scripts/sync-content.mjs 同步内容
pnpm deploy   # 构建并推到 Cloudflare Pages，项目名 tenyear-blog
```

## 内容与配置

- `content/`：文章源文件
- `site.config.ts`：站点名、导航、链接
- `scripts/generate-og.mjs`：生成分享图
- `wrangler.toml`：部署目标

内容在构建前由脚本同步，不要手改 `dist/`。
