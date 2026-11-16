import { json, readJson, requireSameOrigin } from '../_lib/http.js';
import { getSession, readUserData, userKey } from '../_lib/session.js';

const cleanSlug = (value) =>
  typeof value === 'string' ? value.trim().slice(0, 200) : '';

function normalize(entries) {
  if (!Array.isArray(entries)) return [];
  const map = new Map();
  entries.forEach((entry) => {
    const slug = cleanSlug(entry?.slug);
    if (!slug) return;
    const at = Number(entry?.at) || Date.now();
    const existing = map.get(slug);
    if (!existing || existing.at < at) map.set(slug, { slug, at });
  });
  return Array.from(map.values())
    .sort((a, b) => b.at - a.at)
    .slice(0, 60);
}

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ history: [] });

  const data = await readUserData(env, session.user.id);
  return json({ history: data.history });
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
  let history = data.history;
  const slug = cleanSlug(payload.slug);

  if (payload.merge) {
    history = normalize([...history, ...normalize(payload.merge)]);
  } else if (slug) {
    history = normalize([{ slug, at: Date.now() }, ...history]);
  } else {
    return json({ error: 'invalid_slug' }, { status: 400 });
  }

  await env.SESSIONS.put(userKey(session.user.id, 'history'), JSON.stringify(history));
  return json({ history });
}
