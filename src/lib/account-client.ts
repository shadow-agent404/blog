export type AccountUser = {
  id: string;
  name: string;
  avatar: string;
  email: string;
  provider: string;
  providerName: string;
  url: string;
};

export type HistoryEntry = {
  slug: string;
  at: number;
};

export type AccountPrefs = {
  email: boolean;
  telegram: boolean;
  rss: boolean;
  digest: 'weekly' | 'instant' | 'off';
};

export type AccountData = {
  user: AccountUser | null;
  bookmarks: string[];
  history: HistoryEntry[];
  likes: string[];
  prefs: AccountPrefs;
  source: 'server' | 'guest';
};

type Store = {
  state: AccountData;
  listeners: Set<(state: AccountData) => void>;
  booted: boolean;
  bootPromise: Promise<AccountData> | null;
};

const STORE_KEY = '__saAccountStore';
const GUEST_BOOKMARKS = 'sa:guest:bookmarks';
const GUEST_HISTORY = 'sa:guest:history';
const GUEST_PREFS = 'sa:guest:prefs';
const GUEST_LIKES = 'sa:guest:likes';

const defaultPrefs: AccountPrefs = {
  email: false,
  telegram: false,
  rss: true,
  digest: 'weekly',
};

const emptyState = (): AccountData => ({
  user: null,
  bookmarks: [],
  history: [],
  likes: [],
  prefs: { ...defaultPrefs },
  source: 'guest',
});

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function guestBookmarks(): string[] {
  return safeParse<string[]>(localStorage.getItem(GUEST_BOOKMARKS), []);
}

function guestHistory(): HistoryEntry[] {
  return safeParse<HistoryEntry[]>(localStorage.getItem(GUEST_HISTORY), []);
}

function guestPrefs(): AccountPrefs {
  return { ...defaultPrefs, ...safeParse<Partial<AccountPrefs>>(localStorage.getItem(GUEST_PREFS), {}) };
}

function getStore(): Store {
  const scope = window as unknown as Record<string, Store | undefined>;
  if (!scope[STORE_KEY]) {
    scope[STORE_KEY] = {
      state: emptyState(),
      listeners: new Set(),
      booted: false,
      bootPromise: null,
    };
  }
  return scope[STORE_KEY]!;
}

function emit(state: AccountData) {
  const store = getStore();
  store.state = state;
  store.listeners.forEach((listener) => listener(state));
  window.dispatchEvent(new CustomEvent('sa:account', { detail: state }));
}

function mergeUnique<T>(first: T[], second: T[]): T[] {
  return Array.from(new Set([...first, ...second]));
}

function mergeHistory(first: HistoryEntry[], second: HistoryEntry[]): HistoryEntry[] {
  const map = new Map<string, HistoryEntry>();
  [...first, ...second].forEach((entry) => {
    const existing = map.get(entry.slug);
    if (!existing || existing.at < entry.at) map.set(entry.slug, entry);
  });
  return Array.from(map.values())
    .sort((a, b) => b.at - a.at)
    .slice(0, 60);
}

async function readJson(response: Response) {
  const type = response.headers.get('content-type') || '';
  if (!type.includes('application/json')) return null;
  return response.json().catch(() => null);
}

export function getAccount(): AccountData {
  return getStore().state;
}

export function subscribeAccount(listener: (state: AccountData) => void): () => void {
  const store = getStore();
  store.listeners.add(listener);
  listener(store.state);
  return () => store.listeners.delete(listener);
}

export function isLoggedIn(): boolean {
  return Boolean(getStore().state.user);
}

export async function refreshAccount(): Promise<AccountData> {
  const store = getStore();
  const guest = {
    bookmarks: guestBookmarks(),
    history: guestHistory(),
    prefs: guestPrefs(),
  };

  try {
    const response = await fetch('/api/me', {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    });
    const data = await readJson(response);

    if (response.ok && data?.user) {
      const mergedBookmarks = mergeUnique(data.bookmarks || [], guest.bookmarks);
      const mergedHistory = mergeHistory(data.history || [], guest.history);
      const hasGuestData = guest.bookmarks.length > 0 || guest.history.length > 0;

      if (hasGuestData) {
        await fetch('/api/bookmarks', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ merge: guest.bookmarks }),
        }).catch(() => null);
        await fetch('/api/history', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ merge: guest.history }),
        }).catch(() => null);
        localStorage.removeItem(GUEST_BOOKMARKS);
        localStorage.removeItem(GUEST_HISTORY);
      }

      const state: AccountData = {
        user: data.user,
        bookmarks: mergedBookmarks,
        history: mergedHistory,
        likes: data.likes || [],
        prefs: { ...defaultPrefs, ...(data.prefs || {}) },
        source: 'server',
      };
      emit(state);
      return state;
    }
  } catch {
    // 未部署 Pages Functions 时静默回退到本机会话。
  }

  const state: AccountData = {
    user: null,
    bookmarks: guest.bookmarks,
    history: guest.history,
    likes: safeParse<string[]>(localStorage.getItem(GUEST_LIKES), []),
    prefs: guest.prefs,
    source: 'guest',
  };
  emit(state);
  return state;
}

export function bootAccount(): Promise<AccountData> {
  const store = getStore();
  if (store.bootPromise) return store.bootPromise;
  store.booted = true;
  store.bootPromise = refreshAccount();
  return store.bootPromise;
}

export function hasBookmark(slug: string): boolean {
  return getStore().state.bookmarks.includes(slug);
}

export async function toggleBookmark(slug: string): Promise<boolean> {
  const store = getStore();
  const state = store.state;
  const active = state.bookmarks.includes(slug);
  const nextBookmarks = active
    ? state.bookmarks.filter((item) => item !== slug)
    : [slug, ...state.bookmarks];

  emit({ ...state, bookmarks: nextBookmarks });

  if (state.user) {
    await fetch('/api/bookmarks', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug, action: active ? 'remove' : 'add' }),
    }).catch(() => null);
  } else {
    localStorage.setItem(GUEST_BOOKMARKS, JSON.stringify(nextBookmarks));
  }

  return !active;
}

export function applyLike(slug: string, liked: boolean): void {
  const store = getStore();
  const state = store.state;
  const nextLikes = liked
    ? Array.from(new Set([slug, ...state.likes]))
    : state.likes.filter((item) => item !== slug);

  emit({ ...state, likes: nextLikes });

  if (!state.user) {
    localStorage.setItem(GUEST_LIKES, JSON.stringify(nextLikes));
  }
}

export async function recordView(slug: string): Promise<void> {
  const store = getStore();
  const state = store.state;
  if (state.history[0]?.slug === slug) return;

  const nextHistory = [
    { slug, at: Date.now() },
    ...state.history.filter((entry) => entry.slug !== slug),
  ].slice(0, 60);

  emit({ ...state, history: nextHistory });

  if (state.user) {
    await fetch('/api/history', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug }),
    }).catch(() => null);
  } else {
    localStorage.setItem(GUEST_HISTORY, JSON.stringify(nextHistory));
  }
}

export async function savePrefs(prefs: Partial<AccountPrefs>): Promise<AccountPrefs> {
  const store = getStore();
  const state = store.state;
  const next = { ...state.prefs, ...prefs };
  emit({ ...state, prefs: next });

  if (state.user) {
    await fetch('/api/prefs', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(next),
    }).catch(() => null);
  } else {
    localStorage.setItem(GUEST_PREFS, JSON.stringify(next));
  }

  return next;
}

export async function logout(): Promise<void> {
  await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => null);
  const store = getStore();
  store.bootPromise = null;
  emit({
    user: null,
    bookmarks: guestBookmarks(),
    history: guestHistory(),
    likes: safeParse<string[]>(localStorage.getItem(GUEST_LIKES), []),
    prefs: guestPrefs(),
    source: 'guest',
  });
}

export function loginHref(next?: string): string {
  const target = next ?? `${window.location.pathname}${window.location.search}`;
  return `/login/?next=${encodeURIComponent(target)}`;
}
