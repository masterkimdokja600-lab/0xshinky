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
  const authorNames = {
    TRT: 'The Red Team',
    CCT: 'Cánh Cụt Team',
    GTHV: 'Game Thuần Việt',
    GTV: 'Game Tiếng Việt',
    HB: 'Hiu ko Béo',
    AOWVN: 'AowVN Team',
    ACHAU: 'Hội Game Á Châu',
    C24: 'Charles24',
    VHG: 'Việt Hóa Game',
    REVOLTPRO: 'Revolt Pro',
    REVOLT: '0xoLemon',
    PUBLIC: 'Sưu Tầm'
  };
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
  const author = firstValue(entry, ['author']) || authorNames[teamUpper] || team || '0xoLemon';
  const fileName = firstValue(entry, ['fileName', 'file_name']) || `${id}_pack.zip`;
  const path = firstValue(entry, ['path']) || `${team || 'Revolt'}/${id}/pack.zip`;
  const packageRoot = String(packageBase || '').replace(/\/+$/, '');
  const downloadUrl = firstValue(entry, ['downloadUrl', 'download_url', 'url'])
    || (team && packageRoot ? `${packageRoot}/${team}/${id}/pack.zip` : '');
  const coverUrl = firstValue(entry, ['coverUrl', 'cover_url', 'image'])
    || `https://cdn.cloudflare.steamstatic.com/steam/apps/${encodeURIComponent(id)}/header.jpg`;
  const bannerUrl = firstValue(entry, ['bannerUrl', 'banner_url']) || coverUrl;
  const launchOptions = firstValue(entry, ['launchOptions', 'launch_options']);
  const tags = Array.isArray(entry.tags) ? entry.tags : [];
  const defaultTags = [teamUpper === 'REVOLT' || teamUpper === 'REVOLTPRO' ? '0xoLemon' : (team || '0xoLemon'), 'Việt Hóa'];
  const version = firstValue(entry, ['version']) || '1.0';
  const description = firstValue(entry, ['description', 'note'])
    || `Bản dịch Tiếng Việt cho ${name} cung cấp bởi ${author}.`;
  const installGuide = firstValue(entry, ['installGuide'])
    || (launchOptions
      ? `Tham số khởi chạy khuyến nghị: ${launchOptions}`
      : 'Cài đặt tự động hoặc giải nén thư mục bản dịch vào thư mục game.');

  return {
    id,
    gameId: id,
    file_name: fileName,
    fileName,
    path,
    size: firstValue(entry, ['size']) || 'Pack',
    download_url: downloadUrl || null,
    downloadUrl: downloadUrl || null,
    source,
    name,
    gameTitle: name,
    translationTitle: firstValue(entry, ['translationTitle']) || `Bản dịch Tiếng Việt - ${name}`,
    author,
    version,
    coverUrl,
    bannerUrl,
    description,
    installGuide,
    tags: tags.length ? tags : defaultTags,
    originalTeam: team || 'Revolt',
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
