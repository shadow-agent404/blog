import { json } from '../_lib/http.js';
import { getSession, readUserData } from '../_lib/session.js';

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  if (!session) {
    return json({ user: null });
  }

  const data = await readUserData(env, session.user.id);
  return json({
    user: session.user,
    bookmarks: data.bookmarks,
    history: data.history,
    likes: data.likes,
    prefs: data.prefs,
  });
}
