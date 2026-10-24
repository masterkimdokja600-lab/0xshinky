(() => {
  'use strict';

  const products = [
    {
      name: '0xshinky',
      platform: 'Windows',
      summary: 'Thư viện game và bản Việt hóa được cập nhật trực tiếp từ nguồn.',
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
      summary: 'Phiên bản Android riêng, với preview web và APK từ bản phát hành mới nhất.',
      icon: '/products/android/icon.png',
      page: '/android/',
      preview: '/products/android/index.html',
      release: '/api/android-update',
      download: '/api/android-update?download=1',
      downloadLabel: 'Tải APK Android'
    }
  ];

  const addAppDownloadLink = (id, parent, before, href, label) => {
    if (!parent || document.getElementById(id)) return;
    const link = document.createElement('a');
    link.id = id;
    link.className = 'btn-secondary-action';
    link.href = href;
    link.setAttribute('aria-label', label);
    link.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg><span>Tải ứng dụng</span>';
    if (before && before.parentElement === parent) before.after(link);
    else parent.append(link);
  };

  const installWebAppLinks = () => {
    const gameActions = document.querySelector('.game-modal-actions');
    const gameMarker = document.getElementById('gmSelectFilesBtn');
    if (gameActions && gameMarker) {
      addAppDownloadLink(
        'gmPreviewAppDownload',
        gameActions,
        gameMarker,
        '/api/desktop-update?download=1',
        'Tải ứng dụng 0xshinky cho Windows'
      );
    }

    const translationActions = document.querySelector('#viModal .vi-actions');
    addAppDownloadLink(
      'viPreviewAppDownload',
      translationActions,
      null,
      '/api/desktop-update?download=1',
      'Tải ứng dụng 0xshinky để cài bản Việt hóa'
    );
  };

  const makeBrandLink = () => {
    const brandButton = document.getElementById('brandRefresh');
    if (!brandButton || brandButton.tagName === 'A') return;
    const brandLink = brandButton.cloneNode(true);
    brandLink.removeAttribute('type');
    brandLink.setAttribute('href', '/');
    brandLink.setAttribute('aria-label', '0xshinky — trang sản phẩm');
    brandLink.setAttribute('title', 'Trang sản phẩm 0xshinky');
    brandButton.replaceWith(brandLink);
  };

  const makeProductRow = product => {
    const card = document.createElement('article');
    card.className = 'web-product-card';
    card.dataset.productSearch = `${product.name} ${product.platform}`.toLocaleLowerCase();

    const main = document.createElement('div');
    main.className = 'web-product-main';

    const artwork = document.createElement('div');
    artwork.className = 'web-product-artwork';
    const icon = document.createElement('img');
    icon.src = product.icon;
    icon.alt = '';
    icon.loading = 'lazy';
    artwork.append(icon);

    const info = document.createElement('div');
    info.className = 'web-product-info';

    const name = document.createElement('a');
    name.className = 'web-product-name';
    name.href = product.page;
    name.textContent = product.name;
    name.setAttribute('aria-label', `Mở trang sản phẩm ${product.name}`);

    const platform = document.createElement('span');
    platform.className = 'web-product-platform';
    platform.textContent = product.platform;

    const productLinkHint = document.createElement('span');
    productLinkHint.className = 'web-product-link-hint';
    productLinkHint.innerHTML = 'Chi tiết sản phẩm <span aria-hidden="true">↗</span>';
    info.append(platform, name, productLinkHint);

    const summary = document.createElement('p');
    summary.className = 'web-product-summary';
    summary.textContent = product.summary;

    const release = document.createElement('span');
    release.className = 'web-product-release';
    release.textContent = 'Đang lấy phiên bản mới nhất…';
    release.dataset.productRelease = product.release;

    const actions = document.createElement('div');
    actions.className = 'web-product-actions';
    const preview = document.createElement('a');
    preview.className = 'web-product-preview';
    preview.href = product.preview;
    preview.textContent = 'Preview';
    preview.setAttribute('aria-label', `Xem trước ${product.name} trên web`);
    const download = document.createElement('a');
    download.href = product.download;
    download.className = 'web-product-download';
    download.textContent = product.downloadLabel;
    download.setAttribute('aria-label', `${product.downloadLabel}: ${product.name}`);
    actions.append(preview, download);

    main.append(artwork, info);
    card.append(main, summary, release, actions);
    return card;
  };

  const installProductsTab = () => {
    const title = document.querySelector('.page-title');
    const translationsTab = document.getElementById('tabViethoaBtn');
    const translationsView = document.getElementById('translationsCatalogView');
    const gamesView = document.getElementById('gamesViewContainer');
    if (!title || !translationsTab || !translationsView || !gamesView) return;

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
      productsView.setAttribute('aria-label', 'Products');
      const list = document.createElement('div');
      list.className = 'web-products-list';
      products.forEach(product => list.append(makeProductRow(product)));
      productsView.append(list);
      document.querySelector('.sub-header').after(productsView);
    }

    const search = document.getElementById('searchInput');
    const installedToggle = document.getElementById('installedToggleWrap');
    const productRows = Array.from(productsView.querySelectorAll('.web-product-card'));
    const filterProducts = () => {
      if (window.currentViewMode !== 'products') return;
      const query = (search?.value || '').trim().toLocaleLowerCase();
      for (const row of productRows) {
        row.hidden = Boolean(query) && !row.dataset.productSearch.includes(query);
      }
    };

    const loadProductReleases = async () => {
      await Promise.all(products.map(async product => {
        const label = productsView.querySelector(`[data-product-release="${product.release}"]`);
        if (!label) return;
        try {
          const response = await fetch(product.release, { headers: { Accept: 'application/json' }, cache: 'no-store' });
          if (!response.ok) throw new Error('Release unavailable');
          const release = await response.json();
          if (typeof release.version !== 'string') throw new Error('Invalid release');
          label.textContent = `Phiên bản mới nhất · v${release.version}`;
        } catch (_) {
          label.textContent = 'Thông tin phiên bản tạm thời không khả dụng';
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
    void loadProductReleases();
  };

  const initializeWebPresentation = () => {
    makeBrandLink();
    installWebAppLinks();
    installProductsTab();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWebPresentation, { once: true });
  } else {
    initializeWebPresentation();
  }
})();
