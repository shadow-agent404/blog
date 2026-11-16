import { json, readJson, requireSameOrigin } from '../_lib/http.js';
import { getSession, readUserData, userKey } from '../_lib/session.js';

const cleanSlug = (value) =>
  typeof value === 'string' ? value.trim().slice(0, 200) : '';

const cleanList = (value) =>
  Array.isArray(value) ? value.map(cleanSlug).filter(Boolean).slice(0, 200) : [];

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ bookmarks: [] });

  const data = await readUserData(env, session.user.id);
  return json({ bookmarks: data.bookmarks });
}

export async function onRequestPost({ request, env }) {
  if (!requireSameOrigin(request)) {
    return json({ error: 'origin_not_allowed' }, { status: 403 });
  }

  const session = await getSession(request, env);
  if (!session || !env.SESSIONS) {
    return json({ error: 'login_required' }, { status: 401 });
  }

  const payload = await readJson(request);
  if (!payload) return json({ error: 'invalid_json' }, { status: 400 });

  const data = await readUserData(env, session.user.id);
  let bookmarks = data.bookmarks;
  const slug = cleanSlug(payload.slug);

  if (payload.merge) {
    bookmarks = Array.from(new Set([...bookmarks, ...cleanList(payload.merge)]));
  } else if (slug) {
    bookmarks =
      payload.action === 'remove'
        ? bookmarks.filter((item) => item !== slug)
        : Array.from(new Set([slug, ...bookmarks]));
  } else {
    return json({ error: 'invalid_slug' }, { status: 400 });
  }

  bookmarks = bookmarks.slice(0, 200);
  await env.SESSIONS.put(userKey(session.user.id, 'bookmarks'), JSON.stringify(bookmarks));
  return json({ bookmarks });
}
