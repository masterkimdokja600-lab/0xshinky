const RELEASE_ENDPOINT = 'https://gitlab.com/api/v4/projects/87784940/releases/permalink/latest';

module.exports = async function luatoolUpdate(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const upstream = await fetch(RELEASE_ENDPOINT, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
    if (!upstream.ok) throw new Error('GitLab release unavailable');

    const release = await upstream.json();
    const version = String(release?.tag_name || '').trim().replace(/^v/i, '');
    if (!/^\d+(?:\.\d+){1,3}(?:[-+][0-9a-z.-]+)?$/i.test(version)) {
      throw new Error('Invalid 0xoLuatool version');
    }
    const executable = release.assets?.links?.find(link =>
      String(link?.name || '').toLowerCase() === '0xoluatool.exe'
    );
    const downloadUrl = new URL(executable?.direct_asset_url || executable?.url || '');
    if (downloadUrl.origin !== 'https://gitlab.com' || downloadUrl.username || downloadUrl.password) {
      throw new Error('Invalid 0xoLuatool asset URL');
    }

    if (String(req.query?.download || '') === '1') {
      res.setHeader('Cache-Control', 'no-store');
      return res.redirect(downloadUrl.href);
    }

    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method === 'HEAD') return res.status(200).end();
    return res.status(200).json({ version, publishedAt: release.released_at || release.created_at || null });
  } catch (error) {
    console.error('0xoLuatool release lookup failed:', error.message);
    return res.status(502).json({ error: 'Latest 0xoLuatool release unavailable' });
  }
};
