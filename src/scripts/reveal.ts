/**
 * 滚动入场：项目卡片、Modrinth 插件、仓库行共用。
 * 逐条上浮，手机与桌面一致；系统开启减少动态效果时跳过。
 */
const targets = Array.from(
  document.querySelectorAll<HTMLElement>('[data-reveal], .mr-project, .repo-row'),
);

if (targets.length > 0 && 'IntersectionObserver' in window) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduceMotion) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -5% 0px' },
    );

    targets.forEach((el, index) => {
      el.classList.add('is-reveal');
      el.style.transitionDelay = `${Math.min(index, 6) * 70}ms`;
      observer.observe(el);
    });
  }
}
