export type AuthProviderMeta = {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  kind: 'oauth' | 'email' | 'telegram';
};

/**
 * 登录方式的静态清单，用于首屏渲染。
 * 是否真正启用由 /api/auth/providers 根据 Cloudflare 环境变量返回。
 * 已排除需要实名认证或信用卡的平台（微信、QQ、Microsoft 等）。
 */
export const authProviders: AuthProviderMeta[] = [
  { id: 'github', name: 'GitHub', icon: 'github', blurb: '代码、Issue 与开源身份', kind: 'oauth' },
  { id: 'modrinth', name: 'Modrinth', icon: 'modrinth', blurb: 'Minecraft 插件与整合包', kind: 'oauth' },
  { id: 'discord', name: 'Discord', icon: 'discord', blurb: '社区、语音与服务器', kind: 'oauth' },
  { id: 'google', name: 'Google', icon: 'google', blurb: '通用身份，连接邮箱', kind: 'oauth' },
  { id: 'spotify', name: 'Spotify', icon: 'spotify', blurb: '音乐、歌单与收听记录', kind: 'oauth' },
  { id: 'mastodon', name: 'Mastodon', icon: 'mastodon', blurb: '去中心化社交，自选实例', kind: 'oauth' },
  { id: 'gitlab', name: 'GitLab', icon: 'gitlab', blurb: '代码托管与 CI', kind: 'oauth' },
  { id: 'codeberg', name: 'Codeberg', icon: 'codeberg', blurb: '非营利开源协作', kind: 'oauth' },
  { id: 'huggingface', name: 'Hugging Face', icon: 'link', blurb: '模型、数据集与 AI 身份', kind: 'oauth' },
  { id: 'reddit', name: 'Reddit', icon: 'reddit', blurb: '社区讨论与长帖', kind: 'oauth' },
  { id: 'telegram', name: 'Telegram', icon: 'telegram', blurb: '登录 Widget 与频道', kind: 'telegram' },
];
