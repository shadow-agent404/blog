import { absoluteUrl, base64 } from './http.js';

/**
 * 只接入不需要实名认证、不需要信用卡的平台。
 * 每个 provider 的密钥都由 Cloudflare Pages 环境变量提供，代码里不出现任何 secret。
 */
export const providers = {
  github: {
    name: 'GitHub',
    kind: 'oauth',
    icon: 'github',
    blurb: '代码、Issue 与开源身份',
    authorizeUrl: () => 'https://github.com/login/oauth/authorize',
    tokenUrl: () => 'https://github.com/login/oauth/access_token',
    userUrl: () => 'https://api.github.com/user',
    scope: 'read:user user:email',
    tokenAuth: 'body',
    pkce: false,
    // OAuth App 的 Client ID 是公开信息，允许在环境变量缺失时回退到公开值。
    fallbackClientId: 'Ov23li2OeeuPqpuMF4Z5',
    env: { clientId: 'AUTH_GITHUB_CLIENT_ID', clientSecret: 'AUTH_GITHUB_CLIENT_SECRET' },
    userHeaders: { accept: 'application/vnd.github+json', 'user-agent': 'paper-scraps-auth' },
    async mapUser(data, { token }) {
      let email = data.email || '';
      if (!email) {
        const response = await fetch('https://api.github.com/user/emails', {
          headers: {
            authorization: `Bearer ${token}`,
            accept: 'application/vnd.github+json',
            'user-agent': 'paper-scraps-auth',
          },
        });
        if (response.ok) {
          const emails = await response.json();
          email = emails.find((item) => item.primary)?.email || emails[0]?.email || '';
        }
      }
      return {
        id: String(data.id),
        name: data.name || data.login,
        avatar: data.avatar_url || '',
        email,
        url: data.html_url || '',
      };
    },
  },

  modrinth: {
    name: 'Modrinth',
    kind: 'oauth',
    icon: 'modrinth',
    blurb: 'Minecraft 插件与整合包',
    authorizeUrl: () => 'https://modrinth.com/auth/authorize',
    tokenUrl: () => 'https://api.modrinth.com/v2/oauth/token',
    userUrl: () => 'https://api.modrinth.com/v2/user',
    scope: 'USER_READ',
    tokenAuth: 'json',
    pkce: true,
    confidential: false,
    env: { clientId: 'AUTH_MODRINTH_CLIENT_ID', clientSecret: 'AUTH_MODRINTH_CLIENT_SECRET' },
    mapUser(data) {
      return {
        id: String(data.id),
        name: data.username,
        avatar: data.avatar_url || '',
        email: data.email || '',
        url: data.username ? `https://modrinth.com/user/${data.username}` : '',
      };
    },
  },

  google: {
    name: 'Google',
    kind: 'oauth',
    icon: 'google',
    blurb: '通用身份，连接邮箱与日历',
    authorizeUrl: () => 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: () => 'https://oauth2.googleapis.com/token',
    userUrl: () => 'https://openidconnect.googleapis.com/v1/userinfo',
    scope: 'openid email profile',
    tokenAuth: 'body',
    pkce: true,
    env: { clientId: 'AUTH_GOOGLE_CLIENT_ID', clientSecret: 'AUTH_GOOGLE_CLIENT_SECRET' },
    mapUser(data) {
      return {
        id: String(data.sub),
        name: data.name || data.email || 'Google 用户',
        avatar: data.picture || '',
        email: data.email || '',
        url: '',
      };
    },
  },

  discord: {
    name: 'Discord',
    kind: 'oauth',
    icon: 'discord',
    blurb: '社区、语音与服务器',
    authorizeUrl: () => 'https://discord.com/oauth2/authorize',
    tokenUrl: () => 'https://discord.com/api/oauth2/token',
    userUrl: () => 'https://discord.com/api/users/@me',
    scope: 'identify email',
    tokenAuth: 'body',
    pkce: false,
    env: { clientId: 'AUTH_DISCORD_CLIENT_ID', clientSecret: 'AUTH_DISCORD_CLIENT_SECRET' },
    mapUser(data) {
      const avatar = data.avatar
        ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png?size=128`
        : '';
      return {
        id: String(data.id),
        name: data.global_name || data.username,
        avatar,
        email: data.email || '',
        url: '',
      };
    },
  },

  gitlab: {
    name: 'GitLab',
    kind: 'oauth',
    icon: 'gitlab',
    blurb: '代码托管与 CI',
    authorizeUrl: () => 'https://gitlab.com/oauth/authorize',
    tokenUrl: () => 'https://gitlab.com/oauth/token',
    userUrl: () => 'https://gitlab.com/api/v4/user',
    scope: 'read_user',
    tokenAuth: 'body',
    pkce: true,
    env: { clientId: 'AUTH_GITLAB_CLIENT_ID', clientSecret: 'AUTH_GITLAB_CLIENT_SECRET' },
    mapUser(data) {
      return {
        id: String(data.id),
        name: data.name || data.username,
        avatar: data.avatar_url || '',
        email: data.email || '',
        url: data.web_url || '',
      };
    },
  },

  codeberg: {
    name: 'Codeberg',
    kind: 'oauth',
    icon: 'codeberg',
    blurb: '非营利开源协作',
    authorizeUrl: () => 'https://codeberg.org/login/oauth/authorize',
    tokenUrl: () => 'https://codeberg.org/login/oauth/access_token',
    userUrl: () => 'https://codeberg.org/api/v1/user',
    scope: 'read',
    tokenAuth: 'body',
    pkce: true,
    env: { clientId: 'AUTH_CODEBERG_CLIENT_ID', clientSecret: 'AUTH_CODEBERG_CLIENT_SECRET' },
    mapUser(data) {
      return {
        id: String(data.id),
        name: data.full_name || data.login,
        avatar: data.avatar_url || '',
        email: data.email || '',
        url: data.html_url || '',
      };
    },
  },

  reddit: {
    name: 'Reddit',
    kind: 'oauth',
    icon: 'reddit',
    blurb: '社区讨论与长帖',
    authorizeUrl: () => 'https://www.reddit.com/api/v1/authorize',
    tokenUrl: () => 'https://www.reddit.com/api/v1/access_token',
    userUrl: () => 'https://oauth.reddit.com/api/v1/me',
    scope: 'identity',
    tokenAuth: 'basic',
    pkce: false,
    env: { clientId: 'AUTH_REDDIT_CLIENT_ID', clientSecret: 'AUTH_REDDIT_CLIENT_SECRET' },
    userHeaders: { 'user-agent': 'web:paper-scraps-auth:1.0' },
    mapUser(data) {
      return {
        id: String(data.id),
        name: data.name,
        avatar: (data.icon_img || '').split('?')[0],
        email: data.email || '',
        url: data.profile_url ? `https://www.reddit.com${data.profile_url}` : '',
      };
    },
  },

  spotify: {
    name: 'Spotify',
    kind: 'oauth',
    icon: 'spotify',
    blurb: '音乐、歌单与收听记录',
    authorizeUrl: () => 'https://accounts.spotify.com/authorize',
    tokenUrl: () => 'https://accounts.spotify.com/api/token',
    userUrl: () => 'https://api.spotify.com/v1/me',
    scope: 'user-read-email user-read-private',
    tokenAuth: 'basic',
    pkce: false,
    env: { clientId: 'AUTH_SPOTIFY_CLIENT_ID', clientSecret: 'AUTH_SPOTIFY_CLIENT_SECRET' },
    mapUser(data) {
      return {
        id: String(data.id),
        name: data.display_name || 'Spotify 用户',
        avatar: data.images?.[0]?.url || '',
        email: data.email || '',
        url: data.external_urls?.spotify || '',
      };
    },
  },

  mastodon: {
    name: 'Mastodon',
    kind: 'oauth',
    icon: 'mastodon',
    blurb: '去中心化社交，自选实例',
    authorizeUrl: (env) => `${String(env.AUTH_MASTODON_INSTANCE).replace(/\/$/, '')}/oauth/authorize`,
    tokenUrl: (env) => `${String(env.AUTH_MASTODON_INSTANCE).replace(/\/$/, '')}/oauth/token`,
    userUrl: (env) =>
      `${String(env.AUTH_MASTODON_INSTANCE).replace(/\/$/, '')}/api/v1/accounts/verify_credentials`,
    scope: 'read:accounts',
    tokenAuth: 'body',
    pkce: true,
    instanceEnv: 'AUTH_MASTODON_INSTANCE',
    env: { clientId: 'AUTH_MASTODON_CLIENT_ID', clientSecret: 'AUTH_MASTODON_CLIENT_SECRET' },
    mapUser(data) {
      return {
        id: String(data.id),
        name: data.display_name || data.username,
        avatar: data.avatar || '',
        email: '',
        url: data.url || '',
      };
    },
  },

  huggingface: {
    name: 'Hugging Face',
    kind: 'oauth',
    icon: 'link',
    blurb: '模型、数据集与 AI 身份',
    authorizeUrl: () => 'https://huggingface.co/oauth/authorize',
    tokenUrl: () => 'https://huggingface.co/oauth/token',
    userUrl: () => 'https://huggingface.co/api/whoami-v2',
    scope: 'openid profile email',
    tokenAuth: 'body',
    pkce: true,
    env: {
      clientId: 'AUTH_HUGGINGFACE_CLIENT_ID',
      clientSecret: 'AUTH_HUGGINGFACE_CLIENT_SECRET',
    },
    mapUser(data) {
      return {
        id: String(data.id),
        name: data.name || data.fullname || 'Hugging Face 用户',
        avatar: data.avatarUrl || '',
        email: data.email || '',
        url: data.name ? `https://huggingface.co/${data.name}` : '',
      };
    },
  },

  email: {
    name: '邮箱',
    kind: 'email',
    icon: 'mail',
    blurb: '魔法链接，不设密码',
    env: { apiKey: 'RESEND_API_KEY', from: 'AUTH_EMAIL_FROM' },
  },

  telegram: {
    name: 'Telegram',
    kind: 'telegram',
    icon: 'telegram',
    blurb: '登录 Widget，频道与即时消息',
    env: {
      botToken: 'AUTH_TELEGRAM_BOT_TOKEN',
      botUsername: 'AUTH_TELEGRAM_BOT_USERNAME',
    },
  },
};

export const providerOrder = [
  'github',
  'modrinth',
  'discord',
  'google',
  'spotify',
  'mastodon',
  'gitlab',
  'codeberg',
  'huggingface',
  'reddit',
  'telegram',
  'email',
];

function clientIdOf(provider, env) {
  return env[provider.env.clientId] || provider.fallbackClientId || '';
}

export function isConfigured(provider, env) {
  if (provider.kind === 'email') {
    return Boolean(env.RESEND_API_KEY && env.AUTH_EMAIL_FROM);
  }
  if (provider.kind === 'telegram') {
    return Boolean(env.AUTH_TELEGRAM_BOT_TOKEN && env.AUTH_TELEGRAM_BOT_USERNAME);
  }
  const clientId = clientIdOf(provider, env);
  const clientSecret = provider.confidential === false ? 'public' : env[provider.env.clientSecret];
  const instance = provider.instanceEnv ? env[provider.instanceEnv] : 'ok';
  return Boolean(clientId && clientSecret && instance);
}

export function listProviders(env) {
  return providerOrder.map((id) => {
    const provider = providers[id];
    return {
      id,
      name: provider.name,
      kind: provider.kind,
      icon: provider.icon,
      blurb: provider.blurb,
      configured: isConfigured(provider, env),
    };
  });
}

export function getProvider(id) {
  return providers[id] || null;
}

export function callbackUrl(request, providerId) {
  return absoluteUrl(request, `/api/auth/${providerId}/callback`);
}

export function authorizeUrl(provider, request, env, { state, codeChallenge, providerId }) {
  const url = new URL(provider.authorizeUrl(env));
  url.searchParams.set('client_id', clientIdOf(provider, env));
  url.searchParams.set('redirect_uri', callbackUrl(request, providerId));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', provider.scope);
  url.searchParams.set('state', state);
  if (provider.pkce && codeChallenge) {
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
  }
  return url.toString();
}

function parseTokenResponse(text, contentType) {
  if ((contentType || '').includes('json')) {
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  }
  try {
    return JSON.parse(text);
  } catch {
    return Object.fromEntries(new URLSearchParams(text));
  }
}

export async function exchangeCode(provider, request, env, { code, codeVerifier, providerId }) {
  const clientId = clientIdOf(provider, env);
  const clientSecret = provider.confidential === false ? '' : env[provider.env.clientSecret];
  const redirectUri = callbackUrl(request, providerId);
  const params = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  };

  if (provider.pkce) params.code_verifier = codeVerifier;

  const headers = { accept: 'application/json' };
  let body;

  if (provider.tokenAuth === 'basic') {
    headers.authorization = `Basic ${base64(`${clientId}:${clientSecret}`)}`;
    headers['content-type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(params).toString();
  } else if (provider.tokenAuth === 'json') {
    headers['content-type'] = 'application/json';
    body = JSON.stringify({
      ...params,
      client_id: clientId,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
    });
  } else {
    headers['content-type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams({
      ...params,
      client_id: clientId,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
    }).toString();
  }

  const response = await fetch(provider.tokenUrl(env), {
    method: 'POST',
    headers,
    body,
  });
  const text = await response.text();
  const data = parseTokenResponse(text, response.headers.get('content-type'));

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'token_exchange_failed');
  }
  return data.access_token;
}

export async function fetchUser(provider, env, token) {
  const response = await fetch(provider.userUrl(env), {
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/json',
      ...(provider.userHeaders || {}),
    },
  });
  if (!response.ok) throw new Error('userinfo_failed');
  const data = await response.json();
  return provider.mapUser(data, { token });
}
