(() => {
  'use strict';

  const products = [
    {
      name: '0xshinky',
      platform: 'Windows',
      summary: 'Khám phá thư viện game và bản Việt hóa; cài đặt game trong ứng dụng Windows.',
      icon: '/products/web/icon.png',
      page: '/desktop/',
      preview: '/products/web/index.html',
      release: '/api/desktop-update',
      download: '/api/desktop-update?download=1',
      downloadLabel: 'Tải cho Windows'
    },
    {
      name: '0xshinky Android',
      platform: 'Android',
      summary: 'Ứng dụng Android riêng, có bản preview web và APK từ release mới nhất.',
      icon: '/products/android/icon.png',
      page: '/android/',
      preview: '/products/android/index.html',
      release: '/api/android-update',
      download: '/api/android-update?download=1',
      downloadLabel: 'Tải APK Android'
    }
  ];

  const normalizeText = value => String(value || '')
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

  const safeHttpsUrl = value => {
    try {
      const raw = String(value || '').trim();
      if (!raw) return '';
      const url = new URL(raw, window.location.origin);
      return url.protocol === 'https:' || url.origin === window.location.origin ? url.href : '';
    } catch (_) {
      return '';
    }
  };

  const formatDate = value => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return '';
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(date);
  };

  let catalogPromise = null;
  let desktopReleasePromise = null;
  const getCatalog = () => {
    if (!catalogPromise) {
      const api = window.pywebview && window.pywebview.api;
      catalogPromise = api && typeof api.get_games === 'function'
        ? Promise.resolve(api.get_games()).then(list => Array.isArray(list) ? list : []).catch(() => [])
        : Promise.resolve([]);
    }
    return catalogPromise;
  };

  const getDesktopRelease = () => {
    if (!desktopReleasePromise) {
      desktopReleasePromise = fetch('/api/desktop-update', { headers: { Accept: 'application/json' }, cache: 'no-store' })
        .then(response => {
          if (!response.ok) throw new Error('Windows release unavailable');
          return response.json();
        })
        .then(release => {
          if (typeof release?.version !== 'string' || !release.version.trim()) throw new Error('Invalid Windows release');
          return release;
        });
    }
    return desktopReleasePromise;
  };

  const enableDesktopDownload = (link, status) => {
    if (!link) return;
    link.removeAttribute('href');
    link.setAttribute('aria-disabled', 'true');
    link.classList.add('is-disabled');
    link.tabIndex = -1;
    if (status) status.textContent = 'Đang kiểm tra bản phát hành Windows…';

    getDesktopRelease().then(release => {
      if (!link.isConnected) return;
      link.href = '/api/desktop-update?download=1';
      link.removeAttribute('aria-disabled');
      link.removeAttribute('tabindex');
      link.classList.remove('is-disabled');
      if (status) status.textContent = `Bản Windows mới nhất · v${release.version}${formatDate(release.publishedAt) ? ` · ${formatDate(release.publishedAt)}` : ''}`;
    }).catch(() => {
      if (!link.isConnected) return;
      if (status) status.textContent = 'Nguồn tải Windows hiện không khả dụng.';
    });
  };

  const addAppDownloadLink = (id, parent, before, label, status) => {
    if (!parent || document.getElementById(id)) return document.getElementById(id);
    const link = document.createElement('a');
    link.id = id;
    link.className = 'web-app-download';
    link.setAttribute('aria-label', label);
    link.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg><span></span>';
    link.querySelector('span').textContent = label;
    if (before && before.parentElement === parent) before.after(link);
    else parent.append(link);
    enableDesktopDownload(link, status);
    return link;
  };

  const makeBrandLink = () => {
    const brandButton = document.getElementById('brandRefresh');
    if (!brandButton || brandButton.tagName === 'A') return;
    const brandLink = brandButton.cloneNode(true);
    brandLink.removeAttribute('type');
    brandLink.setAttribute('href', '/products/web/index.html?view=products');
    brandLink.setAttribute('aria-label', '0xshinky — trang sản phẩm');
    brandLink.setAttribute('title', 'Trang sản phẩm 0xshinky');
    brandButton.replaceWith(brandLink);
  };

  const installGameModalWebContent = () => {
    const modal = document.getElementById('gameModal');
    const summary = modal && modal.querySelector('.game-summary-box');
    if (!modal || !summary || document.getElementById('webGameProductInfo')) return;

    const content = document.createElement('section');
    content.id = 'webGameProductInfo';
    content.className = 'web-game-product-info';
    content.innerHTML = `
      <div class="web-game-facts-wrap">
        <img class="web-game-cover" id="webGameCover" alt="" />
        <dl class="web-game-facts" id="webGameFacts"></dl>
      </div>
      <p class="web-game-info-status" id="webGameInfoStatus" role="status" hidden></p>
      <p class="web-game-guidance">Đây là bản preview trên web. Muốn cài hoặc chơi game, hãy mở trang sản phẩm 0xshinky cho Windows.</p>
      <p class="web-game-release-status" id="webGameReleaseStatus" role="status">Đang kiểm tra bản phát hành Windows…</p>
      <div class="web-game-actions">
        <a id="webGameStoreLink" class="web-game-store-link" target="_blank" rel="noopener noreferrer">Xem trang game trên Steam <span aria-hidden="true">↗</span></a>
        <a id="gmPreviewAppDownload" class="web-app-download" href="/desktop/" aria-label="Xem sản phẩm 0xshinky cho Windows">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3h7v7"></path><path d="M10 14 21 3"></path><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"></path></svg>
          <span>Xem 0xshinky cho Windows</span>
        </a>
      </div>
    `;
    const mediaGallery = modal.querySelector('#gmMediaGallery');
    const storeDescription = modal.querySelector('#gmStoreDescription');
    (mediaGallery || storeDescription || summary).after(content);
    const releaseStatus = content.querySelector('#webGameReleaseStatus');
    getDesktopRelease().then(release => {
      const published = formatDate(release.publishedAt);
      releaseStatus.textContent = `Bản Windows mới nhất · v${release.version}${published ? ` · ${published}` : ''}`;
    }).catch(() => {
      releaseStatus.textContent = 'Thông tin phát hành Windows hiện không khả dụng.';
    });

    let activeToken = 0;

    const update = async () => {
      if (!modal.classList.contains('active')) {
        activeToken += 1;
        return;
      }

      const token = ++activeToken;
      const appid = (document.getElementById('gmAppId')?.textContent || '').trim();
      const title = (document.getElementById('gmTitle')?.textContent || '').trim();
      const currentGame = (await getCatalog()).find(game => String(game.appid || game.id || '') === appid);
      if (token !== activeToken) return;

      const cover = content.querySelector('#webGameCover');
      const poster = safeHttpsUrl(currentGame?.poster_url || document.getElementById('gmPoster')?.getAttribute('src'));
      if (poster) {
        cover.src = poster;
        cover.alt = title ? `${title} cover` : '';
        cover.hidden = false;
      } else {
        cover.removeAttribute('src');
        cover.hidden = true;
      }

      const renderStoreDetails = details => {
        const facts = content.querySelector('#webGameFacts');
        facts.replaceChildren();
        const clean = value => typeof value === 'string' && !['undefined', '—'].includes(value.trim()) ? value.trim() : '';
        const platformLabels = details?.platforms && typeof details.platforms === 'object'
          ? Object.entries(details.platforms).filter(([, supported]) => supported === true).map(([name]) => ({ windows: 'Windows', mac: 'macOS', linux: 'Linux' }[name] || name))
          : [];
        const rows = [
          ['Nhà phát triển', clean(currentGame?.developer) || (Array.isArray(details?.developers) ? details.developers.map(clean).filter(Boolean).join(', ') : clean(document.getElementById('gmDev')?.textContent))],
          ['Nhà phát hành', clean(currentGame?.publisher) || (Array.isArray(details?.publishers) ? details.publishers.map(clean).filter(Boolean).join(', ') : '')],
          ['Nền tảng', Array.isArray(currentGame?.platforms) && currentGame.platforms.length
            ? currentGame.platforms.map(clean).filter(Boolean).join(', ')
            : platformLabels.join(', ')],
          ['Phát hành', clean(details?.releaseDate)],
          ['Thể loại', Array.isArray(details?.genres) ? details.genres.map(clean).filter(Boolean).join(', ') : '']
        ].filter(([, value]) => typeof value === 'string' && value.trim());

        for (const [label, value] of rows) {
          const row = document.createElement('div');
          row.className = 'web-game-fact';
          const term = document.createElement('dt');
          term.textContent = label;
          const detail = document.createElement('dd');
          detail.textContent = value;
          row.append(term, detail);
          facts.append(row);
        }
        if (!rows.length) {
          const note = document.createElement('p');
          note.className = 'web-game-no-facts';
          note.textContent = 'Nguồn hiện tại chưa cung cấp thông tin cho game này.';
          facts.append(note);
        }

      };
      renderStoreDetails(null);
      const infoStatus = content.querySelector('#webGameInfoStatus');
      infoStatus.hidden = false;
      infoStatus.textContent = 'Đang lấy thông tin game…';

      const storeLink = content.querySelector('#webGameStoreLink');
      if (/^\d+$/.test(appid)) {
        storeLink.href = `https://store.steampowered.com/app/${encodeURIComponent(appid)}/`;
        storeLink.hidden = false;
      } else {
        storeLink.removeAttribute('href');
        storeLink.hidden = true;
      }

      const api = window.pywebview && window.pywebview.api;
      let trailerLookupFailed = false;
      let details = null;
      try {
        const result = api && typeof api.get_game_trailer === 'function'
          ? await api.get_game_trailer(appid)
          : null;
        if (token !== activeToken) return;
        trailerLookupFailed = Boolean(result && result.ok === false);
        details = result?.details || null;
        renderStoreDetails(details);
      } catch (_) {
        trailerLookupFailed = true;
      }
      if (token !== activeToken) return;
      const hasStoreInfo = Boolean(details?.shortDescription)
        || (Array.isArray(details?.screenshots) && details.screenshots.length > 0)
        || content.querySelector('#webGameFacts')?.querySelectorAll('.web-game-fact').length > 3;
      infoStatus.textContent = hasStoreInfo
        ? ''
        : (trailerLookupFailed ? 'Không thể tải thêm thông tin từ trang game lúc này.' : 'Trang game hiện chưa cung cấp thêm thông tin.');
      infoStatus.hidden = hasStoreInfo;
    };

    const classObserver = new MutationObserver(update);
    classObserver.observe(modal, { attributes: true, attributeFilter: ['class'] });
    for (const id of ['gmAppId', 'gmTitle']) {
      const node = document.getElementById(id);
      if (node) new MutationObserver(update).observe(node, { childList: true, characterData: true, subtree: true });
    }
  };

  const installTranslationWebContent = () => {
    const modal = document.getElementById('viModal');
    const body = modal && modal.querySelector('.vi-body');
    const actions = modal && modal.querySelector('.vi-actions');
    if (!modal || !body || !actions || document.getElementById('webTranslationInfo')) return;

    const content = document.createElement('section');
    content.id = 'webTranslationInfo';
    content.className = 'web-translation-info';
    content.innerHTML = `
      <p class="web-translation-guidance">Website chỉ để xem thông tin. Muốn cài bản Việt hóa vào game, hãy tải ứng dụng 0xshinky cho Windows.</p>
      <p class="web-game-release-status" id="webTranslationReleaseStatus" role="status">Đang kiểm tra bản phát hành Windows…</p>
      <dl class="web-translation-facts" id="webTranslationFacts"></dl>
    `;
    actions.before(content);
    addAppDownloadLink(
      'viPreviewAppDownload',
      actions,
      null,
      'Tải 0xshinky cho Windows để cài bản Việt hóa',
      content.querySelector('#webTranslationReleaseStatus')
    );

    let token = 0;
    const update = async () => {
      if (!modal.classList.contains('active')) return;
      const currentToken = ++token;
      const api = window.pywebview && window.pywebview.api;
      const appid = (document.getElementById('gmAppId')?.textContent || '').trim();
      const gameTitle = (document.getElementById('viTitle')?.textContent || '').trim();
      const translationTitle = (document.getElementById('viSub')?.textContent || '').trim();
      const fileName = (document.getElementById('viFile')?.textContent || '').trim();
      let items = [];
      let loadFailed = false;
      try {
        items = api && typeof api.get_all_translations === 'function'
          ? await api.get_all_translations()
          : [];
        if (!Array.isArray(items)) loadFailed = true;
      } catch (_) { loadFailed = true; }
      if (currentToken !== token) return;

      const matches = Array.isArray(items) ? items.filter(item => {
        const idMatches = !/^\d+$/.test(appid) || String(item.gameId || item.id || '') === appid;
        const titleMatches = normalizeText(item.gameTitle || item.name) === normalizeText(gameTitle);
        return idMatches && titleMatches;
      }) : [];
      const selected = matches.find(item => {
        const sourceFile = String(item.fileName || item.file_name || '');
        const sourceTitle = String(item.translationTitle || '');
        return (!fileName || sourceFile === fileName) && (!translationTitle || sourceTitle === translationTitle);
      }) || matches[0];

      const facts = content.querySelector('#webTranslationFacts');
      facts.replaceChildren();
      const rows = selected ? [
        ['Phiên bản', selected.version],
        ['Mô tả', selected.description],
        ['Hướng dẫn cài đặt', selected.installGuide],
        ['Thẻ', Array.isArray(selected.tags) ? selected.tags.filter(Boolean).join(', ') : '']
      ].filter(([, value]) => typeof value === 'string' && value.trim()) : [];

      for (const [label, value] of rows) {
        const row = document.createElement('div');
        row.className = 'web-translation-fact';
        const term = document.createElement('dt');
        term.textContent = label;
        const detail = document.createElement('dd');
        detail.textContent = value;
        row.append(term, detail);
        facts.append(row);
      }
      if (!rows.length) {
        const note = document.createElement('p');
        note.className = 'web-translation-no-facts';
        note.textContent = loadFailed
          ? 'Không thể tải thông tin bổ sung từ nguồn Việt hóa lúc này.'
          : 'Nguồn Việt hóa hiện chưa cung cấp thêm thông tin cho mục này.';
        facts.append(note);
      }
    };

    const observer = new MutationObserver(update);
    observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
    for (const id of ['viTitle', 'viSub', 'viFile']) {
      const node = document.getElementById(id);
      if (node) new MutationObserver(update).observe(node, { childList: true, characterData: true, subtree: true });
    }
  };

  const makeProductCard = product => {
    const card = document.createElement('article');
    card.className = 'web-product-card';
    card.dataset.productSearch = normalizeText(`${product.name} ${product.platform} ${product.summary}`);

    const head = document.createElement('div');
    head.className = 'web-product-head';
    const artwork = document.createElement('div');
    artwork.className = 'web-product-artwork';
    const icon = document.createElement('img');
    icon.src = product.icon;
    icon.alt = '';
    icon.width = 64;
    icon.height = 64;
    icon.loading = 'lazy';
    icon.decoding = 'async';
    artwork.append(icon);

    const info = document.createElement('div');
    info.className = 'web-product-info';
    const platform = document.createElement('span');
    platform.className = 'web-product-platform';
    platform.textContent = product.platform;
    const name = document.createElement('a');
    name.className = 'web-product-name';
    name.href = product.page;
    name.textContent = product.name;
    name.setAttribute('aria-label', `Mở trang sản phẩm ${product.name}`);
    const hint = document.createElement('span');
    hint.className = 'web-product-link-hint';
    hint.textContent = 'Chi tiết sản phẩm ↗';
    info.append(platform, name, hint);
    head.append(artwork, info);

    const summary = document.createElement('p');
    summary.className = 'web-product-summary';
    summary.textContent = product.summary;

    const release = document.createElement('p');
    release.className = 'web-product-release';
    release.textContent = 'Đang tải thông tin release…';
    release.dataset.productRelease = product.release;

    const actions = document.createElement('div');
    actions.className = 'web-product-actions';
    const details = document.createElement('a');
    details.href = product.page;
    details.textContent = 'Chi tiết';
    const preview = document.createElement('a');
    preview.href = product.preview;
    preview.textContent = 'Mở preview';
    const download = document.createElement('a');
    download.href = product.download;
    download.className = 'web-product-download is-disabled';
    download.textContent = product.downloadLabel;
    download.setAttribute('aria-disabled', 'true');
    download.tabIndex = -1;
    actions.append(details, preview, download);

    card.append(head, summary, release, actions);
    return card;
  };

  const installProductsTab = () => {
    const translationsTab = document.getElementById('tabViethoaBtn');
    const translationsView = document.getElementById('translationsCatalogView');
    const gamesView = document.getElementById('gamesViewContainer');
    const subHeader = document.querySelector('.sub-header');
    if (!translationsTab || !translationsView || !gamesView || !subHeader) return;

    let productsTab = document.getElementById('tabProductsBtn');
    let productsView = document.getElementById('webProductsView');
    if (!productsTab) {
      const separator = document.createElement('span');
      separator.className = 'page-title-sep';
      separator.setAttribute('aria-hidden', 'true');
      separator.textContent = '/';
      productsTab = document.createElement('button');
      productsTab.type = 'button';
      productsTab.className = 'page-title-tab';
      productsTab.id = 'tabProductsBtn';
      productsTab.innerHTML = '<span class="hw-label">Products</span>';
      translationsTab.after(separator, productsTab);
    }

    if (!productsView) {
      productsView = document.createElement('section');
      productsView.id = 'webProductsView';
      productsView.className = 'web-products-view';
      productsView.setAttribute('aria-label', 'Sản phẩm 0xshinky');
      const list = document.createElement('div');
      list.className = 'web-products-list';
      products.forEach(product => list.append(makeProductCard(product)));
      const empty = document.createElement('p');
      empty.id = 'webProductsEmpty';
      empty.className = 'web-products-empty';
      empty.hidden = true;
      empty.textContent = 'Không tìm thấy sản phẩm phù hợp.';
      productsView.append(list, empty);
      subHeader.after(productsView);
    }

    const search = document.getElementById('searchInput');
    const clear = document.getElementById('searchClear');
    const installedToggle = document.getElementById('installedToggleWrap');
    const productRows = Array.from(productsView.querySelectorAll('.web-product-card'));
    const filterProducts = () => {
      if (window.currentViewMode !== 'products') return;
      const query = normalizeText(search?.value.trim());
      let visible = 0;
      for (const row of productRows) {
        const matches = !query || row.dataset.productSearch.includes(query);
        row.hidden = !matches;
        if (matches) visible += 1;
      }
      const empty = productsView.querySelector('#webProductsEmpty');
      if (empty) empty.hidden = visible > 0;
    };

    const loadProductReleases = async () => {
      const cards = Array.from(productsView.querySelectorAll('.web-product-card'));
      await Promise.all(products.map(async (product, index) => {
        const card = cards[index];
        const label = card?.querySelector('[data-product-release]');
        const download = card?.querySelector('.web-product-download');
        if (!label || !download) return;
        try {
          const response = await fetch(product.release, { headers: { Accept: 'application/json' }, cache: 'no-store' });
          if (!response.ok) throw new Error('Release unavailable');
          const release = await response.json();
          if (typeof release.version !== 'string' || !release.version.trim()) throw new Error('Invalid release');
          const published = formatDate(release.publishedAt);
          label.textContent = `Phiên bản mới nhất · v${release.version}${published ? ` · ${published}` : ''}`;
          download.href = product.download;
          download.removeAttribute('aria-disabled');
          download.removeAttribute('tabindex');
          download.classList.remove('is-disabled');
        } catch (_) {
          label.textContent = 'Thông tin phát hành hiện không khả dụng';
          download.removeAttribute('href');
          download.setAttribute('aria-disabled', 'true');
          download.tabIndex = -1;
          download.classList.add('is-disabled');
        }
      }));
    };

    const hideProducts = () => {
      if (productsView.style.display === 'none') return;
      productsView.style.display = 'none';
      productsTab.classList.remove('active');
    };

    productsTab.addEventListener('click', () => {
      window.currentViewMode = 'products';
      productsTab.classList.add('active');
      document.getElementById('tabGamesBtn')?.classList.remove('active');
      translationsTab.classList.remove('active');
      gamesView.style.display = 'none';
      translationsView.style.display = 'none';
      productsView.style.display = 'block';
      if (installedToggle) installedToggle.style.display = 'none';
      filterProducts();
      productsView.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });

    document.getElementById('tabGamesBtn')?.addEventListener('click', hideProducts);
    translationsTab.addEventListener('click', hideProducts);
    search?.addEventListener('input', filterProducts);
    clear?.addEventListener('click', () => requestAnimationFrame(filterProducts));
    document.addEventListener('keydown', event => {
      if (event.key === 'Enter' && event.target?.id === 'searchInput' && window.currentViewMode !== 'games') {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
    void loadProductReleases();

    if (new URLSearchParams(window.location.search).get('view') === 'products') {
      productsTab.click();
    }
  };

  const openGameFromQuery = () => {
    const appid = new URLSearchParams(window.location.search).get('game');
    if (!/^\d+$/.test(appid || '')) return;
    let attempts = 0;
    const open = () => {
      const gameLoaded = Array.isArray(window.games)
        && window.games.some(game => String(game.appid) === appid);
      if (gameLoaded && typeof window.openGameModalByAppId === 'function') {
        window.openGameModalByAppId(appid);
        return;
      }
      if (attempts++ < 30) window.setTimeout(open, 300);
    };
    open();
  };

  const initializeWebPresentation = () => {
    makeBrandLink();
    installGameModalWebContent();
    installTranslationWebContent();
    installProductsTab();
    openGameFromQuery();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWebPresentation, { once: true });
  } else {
    initializeWebPresentation();
  }
})();
