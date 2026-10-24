function trailerItems(movies) {
  if (!Array.isArray(movies)) return [];

  const ordered = movies
    .filter(movie => movie && typeof movie === 'object')
    .sort((a, b) => Number(Boolean(b.highlight)) - Number(Boolean(a.highlight)));
  return ordered.map(movie => {
    const urls = [];
    const add = url => {
      if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
        const secureUrl = url.replace(/^http:\/\//i, 'https://');
        if (!urls.includes(secureUrl)) urls.push(secureUrl);
      }
    };
    for (const quality of ['max', '480']) add(movie.mp4?.[quality]);
    for (const quality of ['max', '480']) add(movie.webm?.[quality]);
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
    return {
      title: typeof movie.name === 'string' && movie.name.trim() ? movie.name.trim() : 'Trailer',
      thumbnailUrl: typeof movie.thumbnail === 'string' && /^https?:\/\//i.test(movie.thumbnail.trim())
        ? movie.thumbnail.trim().replace(/^http:\/\//i, 'https://')
        : '',
      urls
    };
  }).filter(movie => movie.urls.length > 0);
}

function trailerUrls(movies) {
  return [...new Set(trailerItems(movies).flatMap(movie => movie.urls))];
}

function storeDetails(data) {
  if (!data || typeof data !== 'object') return null;
  const strings = value => Array.isArray(value)
    ? value.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim())
    : [];
  const richText = value => typeof value === 'string' ? value.trim() : '';
  const requirements = value => {
    if (typeof value === 'string') return { minimum: value.trim(), recommended: '' };
    if (!value || typeof value !== 'object') return { minimum: '', recommended: '' };
    return {
      minimum: richText(value.minimum),
      recommended: richText(value.recommended)
    };
  };
  const screenshots = Array.isArray(data.screenshots)
    ? data.screenshots
      .map(image => ({
        fullUrl: typeof image?.path_full === 'string' ? image.path_full.trim() : '',
        thumbnailUrl: typeof image?.path_thumbnail === 'string' ? image.path_thumbnail.trim() : ''
      }))
      .filter(image => /^https:\/\//i.test(image.fullUrl))
      .map(image => ({ ...image, thumbnailUrl: /^https:\/\//i.test(image.thumbnailUrl) ? image.thumbnailUrl : image.fullUrl }))
      .filter((image, index, all) => all.findIndex(item => item.fullUrl === image.fullUrl) === index)
    : [];

  return {
    name: typeof data.name === 'string' ? data.name.trim() : '',
    type: typeof data.type === 'string' ? data.type.trim() : '',
    shortDescription: typeof data.short_description === 'string' ? data.short_description.trim() : '',
    aboutTheGame: richText(data.about_the_game),
    detailedDescription: richText(data.detailed_description),
    videos: trailerItems(data.movies),
    releaseDate: typeof data.release_date?.date === 'string' ? data.release_date.date.trim() : '',
    developers: strings(data.developers),
    publishers: strings(data.publishers),
    genres: Array.isArray(data.genres)
      ? data.genres
        .map(genre => typeof genre?.description === 'string' ? genre.description.trim() : '')
        .filter(Boolean)
      : [],
    categories: Array.isArray(data.categories)
      ? data.categories
        .map(category => typeof category?.description === 'string' ? category.description.trim() : '')
        .filter(Boolean)
      : [],
    platforms: data.platforms && typeof data.platforms === 'object'
      ? Object.fromEntries(Object.entries(data.platforms).filter(([, supported]) => supported === true))
      : {},
    supportedLanguages: richText(data.supported_languages),
    controllerSupport: typeof data.controller_support === 'string' ? data.controller_support.trim() : '',
    website: typeof data.website === 'string' ? data.website.trim() : '',
    contentNotes: richText(data.content_descriptors?.notes),
    pcRequirements: requirements(data.pc_requirements),
    macRequirements: requirements(data.mac_requirements),
    linuxRequirements: requirements(data.linux_requirements),
    achievements: data.achievements?.total != null && Number.isFinite(Number(data.achievements.total)) ? Number(data.achievements.total) : null,
    recommendations: data.recommendations?.total != null && Number.isFinite(Number(data.recommendations.total)) ? Number(data.recommendations.total) : null,
    metacritic: data.metacritic && typeof data.metacritic === 'object'
      ? {
        score: data.metacritic.score != null && Number.isFinite(Number(data.metacritic.score)) ? Number(data.metacritic.score) : null,
        url: typeof data.metacritic.url === 'string' ? data.metacritic.url.trim() : ''
      }
      : null,
    headerImage: typeof data.header_image === 'string' ? data.header_image.trim() : '',
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
