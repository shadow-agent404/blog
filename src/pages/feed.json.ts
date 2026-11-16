import type { APIRoute } from 'astro';
import { getPosts } from '../lib/posts';
import { site } from '../site.config';

export const GET: APIRoute = async ({ site: astroSite }) => {
  const posts = await getPosts();
  const base = (astroSite ?? new URL(site.url)).href.replace(/\/$/, '');

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: `${site.name} · ${site.tagline}`,
    home_page_url: `${base}/`,
    feed_url: `${base}/feed.json`,
    description: site.description,
    language: 'zh-CN',
    authors: [{ name: site.author, url: base }],
    items: posts.map((post) => ({
      id: `${base}/blog/${post.id}/`,
      url: `${base}/blog/${post.id}/`,
      title: post.data.title,
      summary: post.data.description,
      content_text: post.data.description,
      date_published: post.data.date.toISOString(),
      date_modified: (post.data.updated ?? post.data.date).toISOString(),
      language: post.data.lang === 'en' ? 'en' : 'zh-CN',
      tags: [post.data.category, ...post.data.tags],
    })),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: {
      'content-type': 'application/feed+json; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
};
