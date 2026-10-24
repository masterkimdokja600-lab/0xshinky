const RELEASE_TIMEOUT_MS = 8000;
const SHA256_PATTERN = /sha-?256\s*[:=]\s*`?([a-f0-9]{64})`?/i;

function parseLatestRelease(release) {
  const tagName = String(release?.tag_name || '').trim();
  const version = tagName.replace(/^v/i, '');
  if (!/^\d+(?:\.\d+){1,3}(?:[-+][0-9a-z.-]+)?$/i.test(version)) {
    throw new Error('Latest Android release has an invalid version tag');
  }

  const apk = (Array.isArray(release?.assets?.links) ? release.assets.links : [])
    .find(link => /\.apk$/i.test(String(link?.name || '')));
  if (!apk) throw new Error('Latest Android release has no APK asset');

  const downloadUrl = String(apk.direct_asset_url || apk.url || '').trim();
  let parsedDownloadUrl;
  try {
    parsedDownloadUrl = new URL(downloadUrl);
  } catch (_) {
    throw new Error('Latest Android release has an invalid APK URL');
  }
  if (parsedDownloadUrl.protocol !== 'https:') {
    throw new Error('Latest Android APK must be hosted over HTTPS');
  }

  const description = String(release?.description || '');
  const sha256 = description.match(SHA256_PATTERN)?.[1]?.toLowerCase();
  if (!sha256) throw new Error('Latest Android release is missing its APK SHA-256');

  return {
    version,
    tagName,
    downloadUrl,
    sha256,
    publishedAt: release.released_at || release.created_at || null,
    releaseUrl: release._links?.self || null
  };
}

module.exports = async function androidUpdate(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const projectPath = String(process.env.GITLAB_ANDROID_PROJECT_PATH || '').trim();
  const apiBaseValue = String(process.env.GITLAB_API_V4_URL || '').trim();
  let apiBase;
  try {
    apiBase = new URL(apiBaseValue);
  } catch (_) {
    return res.status(503).json({ error: 'Android release source is not configured' });
  }
  if (apiBase.protocol !== 'https:' || !projectPath) {
    return res.status(503).json({ error: 'Android release source is not configured' });
  }

  try {
    const project = encodeURIComponent(projectPath);
    const endpoint = new URL(`projects/${project}/releases/permalink/latest`, `${apiBase.href.replace(/\/$/, '')}/`);
    const upstream = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(RELEASE_TIMEOUT_MS)
    });
    if (!upstream.ok) {
      return res.status(502).json({ error: 'Could not read the latest Android release' });
    }

    const update = parseLatestRelease(await upstream.json());
    if (new URL(update.downloadUrl).hostname !== apiBase.hostname) {
      throw new Error('Latest Android APK host does not match the configured release source');
    }
    const downloadRequested = String(req.query?.download || '') === '1';
    if (downloadRequested) {
      res.setHeader('Cache-Control', 'no-store');
      return res.redirect(update.downloadUrl);
    }

    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method === 'HEAD') return res.status(200).end();
    return res.status(200).json(update);
  } catch (error) {
    console.error('Android update lookup failed:', error?.message || error);
    return res.status(502).json({ error: 'Latest Android release metadata is unavailable' });
  }
};
