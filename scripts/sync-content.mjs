/**
 * 同步 Bilibili 视频与 GitHub 公开仓库。
 * 构建前自动运行；网络失败时保留已有快照，不阻断构建。
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dataDir = path.join(root, 'src/data');

const BILIBILI_MID = '3494363455818333';
const GITHUB_USER = 'shadow-agent404';
const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(path.join(dataDir, file), 'utf8'));
  } catch {
    return null;
  }
}

async function writeJson(file, value) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(path.join(dataDir, file), `${JSON.stringify(value, null, 2)}\n`);
}

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function fetchBilibili() {
  const headers = {
    'User-Agent': MOBILE_UA,
    Referer: `https://m.bilibili.com/space/${BILIBILI_MID}`,
    Accept: 'application/json',
  };

  const videos = [];
  for (let pn = 1; pn <= 3; pn += 1) {
    const url = `https://api.bilibili.com/x/space/arc/search?mid=${BILIBILI_MID}&pn=${pn}&ps=50&order=pubdate`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`Bilibili HTTP ${res.status}`);
    const json = await res.json();
    if (json.code !== 0) throw new Error(`Bilibili code ${json.code}: ${json.message}`);
    const list = json.data?.list?.vlist ?? [];
    for (const item of list) {
      videos.push({
        bvid: item.bvid,
        title: item.title,
        cover: String(item.pic || '').replace(/^http:/, 'https:'),
        url: `https://www.bilibili.com/video/${item.bvid}`,
        duration: item.length,
        views: item.play,
        publishedAt: new Date(item.created * 1000).toISOString(),
        summary: (item.description || '').replace(/\s+/g, ' ').trim(),
      });
    }
    if (list.length < 50) break;
  }

  return {
    source: `https://space.bilibili.com/${BILIBILI_MID}`,
    videos,
  };
}

function cleanDescription(name, text) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return String(text || '')
    .replace(new RegExp(`^${escaped}\\s*[:：]\\s*`, 'i'), '')
    .trim();
}

async function fetchGithub() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'sa-blog-content-sync',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const repos = [];
  for (let page = 1; page <= 2; page += 1) {
    const url = `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&page=${page}&sort=pushed&type=owner`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`GitHub HTTP ${res.status}`);
    const list = await res.json();
    if (!Array.isArray(list)) break;
    for (const repo of list) {
      if (repo.private) continue;
      repos.push({
        name: repo.name,
        url: repo.html_url,
        description: cleanDescription(repo.name, repo.description),
        homepage: repo.homepage || '',
        language: repo.language || '',
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        archived: repo.archived,
        isFork: repo.fork,
        pushedAt: repo.pushed_at,
        topics: repo.topics ?? [],
      });
    }
    if (list.length < 100) break;
  }

  repos.sort((a, b) => Number(a.isFork) - Number(b.isFork) || b.pushedAt.localeCompare(a.pushedAt));

  return {
    source: `https://github.com/${GITHUB_USER}?tab=repositories`,
    repos,
  };
}

async function fetchModrinth() {
  const headers = {
    Accept: 'application/json',
    'User-Agent': 'sa-blog-content-sync (https://blog.tenyearmc.top)',
  };
  const targets = [{ id: 'AQ3n1LCg', slug: 'bento' }];
  const projects = [];

  for (const target of targets) {
    const [projectRes, versionsRes] = await Promise.all([
      fetch(`https://api.modrinth.com/v2/project/${target.id}`, {
        headers,
        signal: AbortSignal.timeout(20000),
      }),
      fetch(`https://api.modrinth.com/v2/project/${target.id}/version`, {
        headers,
        signal: AbortSignal.timeout(20000),
      }),
    ]);

    if (!projectRes.ok || !versionsRes.ok) {
      throw new Error(`Modrinth HTTP ${projectRes.status}/${versionsRes.status}`);
    }

    const project = await projectRes.json();
    const versions = await versionsRes.json();
    if (!Array.isArray(versions) || versions.length === 0) {
      throw new Error(`Modrinth 项目 ${target.slug} 没有版本`);
    }

    const sorted = versions
      .slice()
      .sort((a, b) => String(b.date_published).localeCompare(String(a.date_published)));

    projects.push({
      id: project.id,
      slug: project.slug,
      title: project.title,
      description: project.description,
      icon: project.icon_url || '',
      downloads: project.downloads,
      followers: project.followers,
      updated: project.updated,
      url: `https://modrinth.com/project/${project.slug}`,
      versions: sorted.slice(0, 8).map((version) => ({
        id: version.id,
        name: version.name,
        versionNumber: version.version_number,
        versionType: version.version_type,
        publishedAt: version.date_published,
        gameVersions: version.game_versions ?? [],
        loaders: version.loaders ?? [],
        downloads: version.downloads,
        changelog: String(version.changelog || '').trim(),
        url: `https://modrinth.com/project/${project.slug}/version/${version.id}`,
      })),
    });
  }

  return {
    source: 'https://modrinth.com/user/shadow-agent404',
    projects,
  };
}

async function sync(name, file, fetcher, key) {
  const old = await readJson(file);
  try {
    const next = await fetcher();
    if (next[key].length === 0) throw new Error('empty result');
    if (old && same(old[key], next[key])) {
      console.log(`= ${name}: 无变化 (${next[key].length})`);
      return;
    }
    await writeJson(file, { fetchedAt: new Date().toISOString(), ...next });
    console.log(`✓ ${name}: ${next[key].length} 条`);
  } catch (error) {
    const count = old?.[key]?.length ?? 0;
    console.warn(`! ${name}: ${error.message}，保留快照 ${count} 条`);
  }
}

await sync('Bilibili 视频', 'videos.json', fetchBilibili, 'videos');
await sync('GitHub 仓库', 'repos.json', fetchGithub, 'repos');
await sync('Modrinth 插件', 'modrinth.json', fetchModrinth, 'projects');
