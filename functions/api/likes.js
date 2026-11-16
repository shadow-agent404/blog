/**
 * Cloudflare Pages Function：文章点赞计数。
 * 需要绑定 KV：LIKES 存全局计数，SESSIONS 存登录用户已赞列表（可选）。
 */

import { getSession, userKey } from '../_lib/session.js';
import { requireSameOrigin } from '../_lib/http.js';

const headers = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

const json = (payload, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers });

const validSlug = (slug) =>
  typeof slug === 'string' && /^[a-zA-Z0-9/_-]{1,120}$/.test(slug);

async function readLikes(env, userId) {
  if (!env.SESSIONS || !userId) return [];
  const raw = await env.SESSIONS.get(userKey(userId, 'likes'));
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function onRequestGet({ request, env }) {
  const slug = new URL(request.url).searchParams.get('slug');

  if (!validSlug(slug)) {
    return json({ error: 'invalid slug' }, 400);
  }

  if (!env.LIKES) {
    return json({ error: 'likes storage is not configured', count: 0, liked: false }, 503);
  }

  const count = Number(await env.LIKES.get(`likes:${slug}`)) || 0;
  const session = await getSession(request, env);
  const liked = session ? (await readLikes(env, session.user.id)).includes(slug) : false;

  return json({ count, liked });
}

export async function onRequestPost({ request, env }) {
  if (!env.LIKES) {
    return json({ error: 'likes storage is not configured' }, 503);
  }

  if (!requireSameOrigin(request)) {
    return json({ error: 'origin_not_allowed' }, 403);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const { slug, action } = payload ?? {};

  if (!validSlug(slug)) {
    return json({ error: 'invalid slug' }, 400);
  }

  const key = `likes:${slug}`;
  const session = await getSession(request, env);
  const current = Number(await env.LIKES.get(key)) || 0;

  if (session && env.SESSIONS) {
    const likes = await readLikes(env, session.user.id);
    const liked = likes.includes(slug);
    let nextLikes = likes;
    let delta = 0;

    if (action === 'unlike' && liked) {
      nextLikes = likes.filter((item) => item !== slug);
      delta = -1;
    } else if (action !== 'unlike' && !liked) {
      nextLikes = [...likes, slug];
      delta = 1;
    }

    if (delta !== 0) {
      await env.SESSIONS.put(userKey(session.user.id, 'likes'), JSON.stringify(nextLikes));
    }

    const next = Math.max(0, current + delta);
    if (delta !== 0) await env.LIKES.put(key, String(next));
    return json({ count: next, liked: action !== 'unlike' });
  }

  const next = Math.max(0, current + (action === 'unlike' ? -1 : 1));
  await env.LIKES.put(key, String(next));
  return json({ count: next, liked: action !== 'unlike' });
}
