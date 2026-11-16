import type { APIRoute } from 'astro';
import { getPosts } from '../lib/posts';
import { site } from '../site.config';

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export const GET: APIRoute = async ({ site: astroSite }) => {
  const posts = await getPosts();
  const base = (astroSite ?? new URL(site.url)).href.replace(/\/$/, '');
  const updated = posts[0]?.data.date ?? new Date();

  const entries = posts
    .map((post) => {
      const url = `${base}/blog/${post.id}/`;
      const published = post.data.date.toISOString();
      const modified = (post.data.updated ?? post.data.date).toISOString();
      const categories = [post.data.category, ...post.data.tags]
        .map((term) => `    <category term="${escapeXml(term)}"/>`)
        .join('\n');

      return `  <entry>
    <title type="text">${escapeXml(post.data.title)}</title>
    <link rel="alternate" type="text/html" href="${escapeXml(url)}"/>
    <id>${escapeXml(url)}</id>
    <published>${published}</published>
    <updated>${modified}</updated>
    <summary type="text">${escapeXml(post.data.description)}</summary>
    <content type="text">${escapeXml(post.data.description)}</content>
${categories}
  </entry>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="zh-CN">
  <title>${escapeXml(`${site.name} · ${site.tagline}`)}</title>
  <subtitle>${escapeXml(site.description)}</subtitle>
  <link href="${escapeXml(`${base}/atom.xml`)}" rel="self" type="application/atom+xml"/>
  <link href="${escapeXml(`${base}/`)}" rel="alternate" type="text/html"/>
  <updated>${updated.toISOString()}</updated>
  <id>${escapeXml(`${base}/`)}</id>
  <author>
    <name>${escapeXml(site.author)}</name>
    <uri>${escapeXml(base)}</uri>
    <email>${escapeXml(site.email)}</email>
  </author>
  <rights>© ${new Date().getFullYear()} ${escapeXml(site.author)}</rights>
  <generator uri="https://astro.build/">Astro</generator>
${entries}
</feed>
`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/atom+xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
};
