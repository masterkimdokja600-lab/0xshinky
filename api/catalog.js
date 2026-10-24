const CATALOG_HOSTS = new Set(['raw.githubusercontent.com', 'cdn.jsdelivr.net']);
const CATALOG_TIMEOUT_MS = 8000;

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

function validCatalogUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && CATALOG_HOSTS.has(url.hostname)
      && url.pathname.endsWith('/catalog.json');
  } catch (_) {
    return false;
  }
}

function repositoryMirrors(dataSources) {
  if (Array.isArray(dataSources.catalogRepositories)) {
    return dataSources.catalogRepositories
      .map(repository => Array.isArray(repository.mirrors) ? repository.mirrors.filter(validCatalogUrl) : [])
      .filter(mirrors => mirrors.length);
  }

  // sync_desktop_sources.py emits raw GitHub then jsDelivr for every upstream repository.
  const urls = Array.isArray(dataSources.catalogUrls) ? dataSources.catalogUrls : [];
  const repositories = [];
  for (let index = 0; index < urls.length; index += 2) {
    const mirrors = urls.slice(index, index + 2).filter(validCatalogUrl);
    if (mirrors.length) repositories.push(mirrors);
  }
  return repositories;
}

async function fetchRepositoryCatalog(mirrors) {
  for (const mirror of mirrors) {
    try {
      const url = new URL(mirror);
      url.searchParams.set('_cb', String(Date.now()));
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
        signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS)
      });
      if (!response.ok) continue;
      const catalog = await response.json();
      if (Array.isArray(catalog) && catalog.length) return catalog;
    } catch (_) {
      // Try the next mirror for this repository.
    }
  }
  return null;
}

function applyNewFlags(games, windowDays, maxCount) {
  const now = Date.now() / 1000;
  const windowSeconds = windowDays * 86400;
  let recentStamps = games
    .map(game => Number.parseInt(game.added_ts || 0, 10))
    .filter(timestamp => timestamp && timestamp >= now - windowSeconds && timestamp <= now + 86400)
    .sort((left, right) => right - left);
  if (maxCount > 0) recentStamps = recentStamps.slice(0, maxCount);
  const cutoff = recentStamps.length ? recentStamps[recentStamps.length - 1] : null;

  for (const game of games) {
    const timestamp = Number.parseInt(game.added_ts || 0, 10);
    const recent = timestamp && timestamp >= now - windowSeconds && timestamp <= now + 86400;
    game.is_new = game.pin_new === true || (cutoff !== null && recent && timestamp >= cutoff);
    game.is_installed = false;
    delete game.install_dir;
  }
}

async function loadGames(req) {
  const origin = requestOrigin(req);
  const sourcesUrl = new URL('/products/web/data_sources.json', origin);
  const sourcesResponse = await fetch(sourcesUrl, {
    cache: 'no-store',
    signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS)
  });
  if (!sourcesResponse.ok) throw new Error('Could not read the generated desktop data sources');

  const dataSources = await sourcesResponse.json();
  const repositories = repositoryMirrors(dataSources);
  if (!repositories.length) throw new Error('No valid desktop game catalog sources were generated');
  const newWindowDays = Number(dataSources.newWindowDays);
  const newMaxCount = Number(dataSources.newMaxCount);
  if (!Number.isInteger(newWindowDays) || newWindowDays < 0 || !Number.isInteger(newMaxCount) || newMaxCount < 0) {
    throw new Error('Desktop game catalog rules were not generated');
  }

  const catalogs = await Promise.all(repositories.map(fetchRepositoryCatalog));
  const gamesById = new Map();

  for (const catalog of catalogs) {
    if (!Array.isArray(catalog)) continue;
    for (const remote of catalog) {
      if (!remote || typeof remote !== 'object') continue;
      const appid = String(remote.appid || '').trim();
      if (!/^\d+$/.test(appid)) continue;

      const game = { ...remote, appid, is_new: false, is_installed: false };
      if (remote.pin_new === true || remote.is_new === true) game.pin_new = true;
      else delete game.pin_new;
      delete game.install_dir;
      gamesById.set(appid, game);
    }
  }

  if (!catalogs.some(Array.isArray)) throw new Error('All desktop game catalog sources are unavailable');

  const games = Array.from(gamesById.values());
  applyNewFlags(games, newWindowDays, newMaxCount);
  games.sort((left, right) => {
    const newOrder = Number(Boolean(right.is_new)) - Number(Boolean(left.is_new));
    if (newOrder) return newOrder;
    const leftName = String(left.name || '').toLowerCase();
    const rightName = String(right.name || '').toLowerCase();
    return leftName < rightName ? -1 : leftName > rightName ? 1 : 0;
  });
  return games;
}

module.exports = async function gameCatalog(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
  try {
    const games = await loadGames(req);
    return res.status(200).json(games);
  } catch (_) {
    return res.status(503).json({ error: 'Game catalog sources are temporarily unavailable.' });
  }
};
