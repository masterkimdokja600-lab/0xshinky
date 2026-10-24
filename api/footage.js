function trailerUrls(movies) {
  if (!Array.isArray(movies)) return [];

  const ordered = movies
    .filter(movie => movie && typeof movie === 'object')
    .sort((a, b) => Number(Boolean(b.highlight)) - Number(Boolean(a.highlight)));
  const urls = [];
  const add = url => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      const secureUrl = url.replace(/^http:\/\//i, 'https://');
      if (!urls.includes(secureUrl)) urls.push(secureUrl);
    }
  };

  for (const movie of ordered.slice(0, 5)) {
    const stream = movie.hls_h264 || movie.dash_h264;
    if (typeof stream === 'string' && stream.includes('/')) {
      const [clean, query] = stream.split('?', 2);
      const micro = `${clean.slice(0, clean.lastIndexOf('/') + 1)}microtrailer.mp4${query ? `?${query}` : ''}`;
      add(micro);
      if (micro.includes('video.akamai.steamstatic.com')) {
        add(micro.replace('video.akamai.steamstatic.com', 'video.fastly.steamstatic.com'));
      } else if (micro.includes('video.fastly.steamstatic.com')) {
        add(micro.replace('video.fastly.steamstatic.com', 'video.akamai.steamstatic.com'));
      }
    }

    for (const quality of ['480', 'max']) add(movie.mp4?.[quality]);
    for (const quality of ['480', 'max']) add(movie.webm?.[quality]);
  }

  return urls;
}

function storeDetails(data) {
  if (!data || typeof data !== 'object') return null;
  const strings = value => Array.isArray(value)
    ? value.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim())
    : [];
  const screenshots = Array.isArray(data.screenshots)
    ? data.screenshots
      .map(image => typeof image?.path_full === 'string' ? image.path_full.trim() : '')
      .filter(url => /^https:\/\//i.test(url))
      .filter((url, index, all) => all.indexOf(url) === index)
      .slice(0, 8)
    : [];

  return {
    name: typeof data.name === 'string' ? data.name.trim() : '',
    type: typeof data.type === 'string' ? data.type.trim() : '',
    shortDescription: typeof data.short_description === 'string' ? data.short_description.trim() : '',
    releaseDate: typeof data.release_date?.date === 'string' ? data.release_date.date.trim() : '',
    developers: strings(data.developers),
    publishers: strings(data.publishers),
    genres: Array.isArray(data.genres)
      ? data.genres
        .map(genre => typeof genre?.description === 'string' ? genre.description.trim() : '')
        .filter(Boolean)
      : [],
    platforms: data.platforms && typeof data.platforms === 'object'
      ? Object.fromEntries(Object.entries(data.platforms).filter(([, supported]) => supported === true))
      : {},
    screenshots
  };
}

async function fetchTrailer(appid) {
  const query = new URLSearchParams({ appids: appid, cc: 'us', l: 'en' });
  const url = `https://store.steampowered.com/api/appdetails?${query.toString()}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      Accept: 'application/json',
      Cookie: 'birthtime=283993201; mature_content=1; lastagecheckage=1-January-1990; wants_mature_content=1'
    },
    signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) throw new Error(`Steam returned ${response.status}`);

  const payload = await response.json();
  const node = payload && payload[appid];
  if (!node || !node.success || !node.data || typeof node.data !== 'object') {
    return { urls: [], details: null };
  }
  return {
    urls: trailerUrls(node.data.movies),
    details: storeDetails(node.data)
  };
}

module.exports = async function gameTrailer(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const appid = String(req.query.appids || '').trim();
  if (!/^\d+$/.test(appid)) return res.status(400).json({ error: 'Provide one numeric appid.' });
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=21600');

  try {
    const result = await fetchTrailer(appid);
    return res.status(200).json({ items: [{ appid, ...result }] });
  } catch (_) {
    return res.status(503).json({ error: 'Trailer lookup temporarily unavailable.' });
  }
};
