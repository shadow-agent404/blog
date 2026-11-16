export type ShareTarget = {
  id: string;
  label: string;
  icon: string;
  href: string;
  group: '中文' | '国际' | '开发者' | '私域';
  copyOnly?: boolean;
  hint?: string;
};

export function buildShareTargets({
  title,
  url,
  tags = [],
}: {
  title: string;
  url: string;
  tags?: string[];
}): ShareTarget[] {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const text = `${title} ${url}`;
  const encodedText = encodeURIComponent(text);
  const hashtags = tags.slice(0, 4).map((tag) => `#${tag.replace(/\s+/g, '')}`).join(' ');
  const encodedHashtags = encodeURIComponent(hashtags);

  return [
    {
      id: 'weibo',
      label: '微博',
      icon: 'weibo',
      group: '中文',
      href: `https://service.weibo.com/share/share.php?url=${encodedUrl}&title=${encodedTitle}`,
    },
    {
      id: 'jike',
      label: '即刻',
      icon: 'jike',
      group: '中文',
      href: '',
      copyOnly: true,
      hint: '复制文字后去即刻粘贴',
    },
    {
      id: 'xiaohongshu',
      label: '小红书',
      icon: 'image',
      group: '中文',
      href: '',
      copyOnly: true,
      hint: '下载分享卡片后发布',
    },
    {
      id: 'douban',
      label: '豆瓣',
      icon: 'douban',
      group: '中文',
      href: `https://www.douban.com/share/service?href=${encodedUrl}&name=${encodedTitle}`,
    },
    {
      id: 'qq',
      label: 'QQ',
      icon: 'qq',
      group: '中文',
      href: `https://connect.qq.com/widget/shareqq/index.html?url=${encodedUrl}&title=${encodedTitle}`,
    },
    {
      id: 'wechat',
      label: '微信',
      icon: 'link',
      group: '私域',
      href: '',
      copyOnly: true,
      hint: '复制链接后去微信粘贴',
    },
    {
      id: 'telegram',
      label: 'Telegram',
      icon: 'telegram',
      group: '私域',
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedHashtags}`,
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: 'whatsapp',
      group: '私域',
      href: `https://wa.me/?text=${encodedText}`,
    },
    {
      id: 'line',
      label: 'LINE',
      icon: 'line',
      group: '私域',
      href: `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`,
    },
    {
      id: 'email',
      label: '邮件',
      icon: 'mail',
      group: '私域',
      href: `mailto:?subject=${encodedTitle}&body=${encodedText}`,
    },
    {
      id: 'x',
      label: 'X',
      icon: 'x',
      group: '国际',
      href: `https://twitter.com/intent/tweet?text=${encodedHashtags}&url=${encodedUrl}`,
    },
    {
      id: 'bluesky',
      label: 'Bluesky',
      icon: 'bluesky',
      group: '国际',
      href: `https://bsky.app/intent/compose?text=${encodedText}${encodedHashtags}`,
    },
    {
      id: 'mastodon',
      label: 'Mastodon',
      icon: 'mastodon',
      group: '国际',
      href: `https://mastodon.social/share?text=${encodedText}`,
    },
    {
      id: 'threads',
      label: 'Threads',
      icon: 'threads',
      group: '国际',
      href: `https://www.threads.net/intent/post?text=${encodedText}`,
    },
    {
      id: 'facebook',
      label: 'Facebook',
      icon: 'facebook',
      group: '国际',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      icon: 'linkedin',
      group: '国际',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      id: 'reddit',
      label: 'Reddit',
      icon: 'reddit',
      group: '国际',
      href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    },
    {
      id: 'pinterest',
      label: 'Pinterest',
      icon: 'pinterest',
      group: '国际',
      href: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`,
    },
    {
      id: 'tumblr',
      label: 'Tumblr',
      icon: 'tumblr',
      group: '国际',
      href: `https://www.tumblr.com/widgets/share/tool?canonicalUrl=${encodedUrl}&caption=${encodedTitle}`,
    },
    {
      id: 'hackernews',
      label: 'Hacker News',
      icon: 'hackernews',
      group: '开发者',
      href: `https://news.ycombinator.com/submitlink?u=${encodedUrl}&t=${encodedTitle}`,
    },
    {
      id: 'v2ex',
      label: 'V2EX',
      icon: 'link',
      group: '开发者',
      href: '',
      copyOnly: true,
      hint: '复制文字后去 V2EX 发帖',
    },
    {
      id: 'bilibili',
      label: 'B 站动态',
      icon: 'bilibili',
      group: '开发者',
      href: '',
      copyOnly: true,
      hint: '复制文字后去 B 站发动态',
    },
  ];
}
