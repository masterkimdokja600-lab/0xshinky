const TRANSLATION_TIMEOUT_MS = 8000;

function requestOrigin(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim();
  const forwardedProtocol = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim();
  const protocol = forwardedProtocol || (host.startsWith('localhost:') || host.startsWith('127.0.0.1:') ? 'http' : 'https');

  if (!host || !/^[a-z0-9.-]+(?::\d+)?$/i.test(host)) {
    throw new Error('Invalid request host');
  }
  return `${protocol}://${host}`;
}

async function readDataSources(req) {
  const sourceUrl = new URL('/products/web/data_sources.json', requestOrigin(req));
  const response = await fetch(sourceUrl, {
    cache: 'no-store',
    signal: AbortSignal.timeout(TRANSLATION_TIMEOUT_MS)
  });
  if (!response.ok) throw new Error('Could not read the generated desktop data sources');
  return response.json();
}

async function fetchJson(url) {
  try {
    const sourceUrl = new URL(url);
    if (sourceUrl.protocol !== 'https:') return null;
    sourceUrl.searchParams.set('_cb', String(Date.now()));
    const response = await fetch(sourceUrl, {
      headers: { Accept: 'application/json', 'User-Agent': '007Launcher', 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(TRANSLATION_TIMEOUT_MS)
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (_) {
    return null;
  }
}

function firstValue(entry, names) {
  for (const name of names) {
    const value = entry?.[name];
    if (value !== undefined && value !== null) {
      const text = String(value).trim();
      if (text) return text;
    }
  }
  return '';
}

function normalizeTranslation(entry, packageBase) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;

  const id = firstValue(entry, ['gameId', 'id']);
  if (!id) return null;
  const team = firstValue(entry, ['originalTeam', 'team']);
  const teamUpper = team.toUpperCase();
  const name = firstValue(entry, ['gameTitle', 'name']);
  const sourceNames = {
    TRT: 'theredteam',
    CCT: 'canhcutteam',
    GTHV: 'gamethuanviet',
    GTV: 'gamethuanviet'
  };
  const rawSource = firstValue(entry, ['source']);
  const source = !rawSource || rawSource === 'revolt'
    ? (sourceNames[teamUpper] || 'others')
    : rawSource;
  const fileName = firstValue(entry, ['fileName', 'file_name']);
  const path = firstValue(entry, ['path']);
  const packageRoot = String(packageBase || '').replace(/\/+$/, '');
  const downloadUrl = firstValue(entry, ['downloadUrl', 'download_url', 'url'])
    || (team && packageRoot ? `${packageRoot}/${team}/${id}/pack.zip` : '');
  const coverUrl = firstValue(entry, ['coverUrl', 'cover_url', 'image'])
    || `https://cdn.cloudflare.steamstatic.com/steam/apps/${encodeURIComponent(id)}/header.jpg`;
  const bannerUrl = firstValue(entry, ['bannerUrl', 'banner_url']) || coverUrl;
  const launchOptions = firstValue(entry, ['launchOptions', 'launch_options']);
  const tags = Array.isArray(entry.tags) ? entry.tags.filter(tag => typeof tag === 'string' && tag.trim()) : [];
  const version = firstValue(entry, ['version']);
  const description = firstValue(entry, ['description', 'note']);
  const installGuide = firstValue(entry, ['installGuide', 'install_guide']);

  return {
    id,
    gameId: id,
    file_name: fileName,
    fileName,
    path,
    size: firstValue(entry, ['size']),
    download_url: downloadUrl || null,
    downloadUrl: downloadUrl || null,
    source,
    name,
    gameTitle: name,
    translationTitle: firstValue(entry, ['translationTitle']),
    author: firstValue(entry, ['author']),
    version,
    coverUrl,
    bannerUrl,
    description,
    installGuide,
    tags,
    originalTeam: team,
    launchOptions
  };
}

async function loadTranslations(req) {
  const dataSources = await readDataSources(req);
  const sourceUrls = Array.isArray(dataSources.translationUrls) ? dataSources.translationUrls : [];
  const packageBase = dataSources.translationPackageBase || '';

  for (const sourceUrl of sourceUrls) {
    const payload = await fetchJson(sourceUrl);
    const entries = Array.isArray(payload)
      ? payload
      : (Array.isArray(payload?.games) ? payload.games : payload?.items);
    if (!Array.isArray(entries) || !entries.length) continue;

    const normalized = entries.map(entry => normalizeTranslation(entry, packageBase)).filter(Boolean);
    if (normalized.length) return normalized;
  }
  throw new Error('All desktop translation sources are unavailable');
}

module.exports = async function translationCatalog(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
  try {
    return res.status(200).json(await loadTranslations(req));
  } catch (_) {
    return res.status(503).json({ error: 'Translation sources are temporarily unavailable.' });
  }
};
