import type { APIRoute, GetStaticPaths } from 'astro';
import { getPosts, type Post } from '../../lib/posts';
import { site } from '../../site.config';

interface Props {
  post: Post;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getPosts();
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
};

const frontmatter = (post: Post) => {
  const data = post.data;
  const lines = [
    '---',
    `title: ${JSON.stringify(data.title)}`,
    `description: ${JSON.stringify(data.description)}`,
    `date: ${JSON.stringify(data.date.toISOString())}`,
  ];

  if (data.updated) lines.push(`updated: ${JSON.stringify(data.updated.toISOString())}`);
  lines.push(`lang: ${data.lang}`);
  lines.push(`category: ${data.category}`);
  lines.push(`tags: ${JSON.stringify(data.tags)}`);
  if (data.featured) lines.push('featured: true');
  if (data.cover) lines.push(`cover: ${JSON.stringify(data.cover)}`);
  if (data.series) lines.push(`series: ${JSON.stringify(data.series)}`);
  if (data.seriesOrder) lines.push(`seriesOrder: ${data.seriesOrder}`);
  lines.push('---');

  return lines.join('\n');
};

export const GET: APIRoute = async ({ props, url }) => {
  const { post } = props as Props;
  const origin = new URL(postUrl(post.id), site.url).href;
  const source = new URL(url.pathname, url.origin).origin;

  const markdown = `${frontmatter(post)}

${(post.body ?? '').trim()}

---

原文链接：${origin}
订阅更新：${source}/rss.xml
`;

  return new Response(markdown, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': `inline; filename="${post.id}.md"`,
      'cache-control': 'public, max-age=3600',
    },
  });
};

function postUrl(id: string) {
  return `/blog/${id}/`;
}
