(() => {
  const root = document.querySelector('[data-release-api]');
  if (!root) return;

  const endpoint = root.dataset.releaseApi;
  const version = document.querySelector('[data-release-version]');
  const date = document.querySelector('[data-release-date]');
  const status = document.querySelector('[data-release-status]');
  const downloadLink = document.querySelector('[data-release-download]');
  const catalogCount = document.querySelector('[data-catalog-count]');
  const translationCount = document.querySelector('[data-translation-count]');

  const loadRelease = async () => {
    try {
      const response = await fetch(endpoint, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!response.ok) throw new Error('Release metadata unavailable');
      const release = await response.json();
      if (!release || typeof release.version !== 'string') throw new Error('Invalid release metadata');

      if (version) version.textContent = `v${release.version}`;
      if (date && release.publishedAt) {
        const published = new Date(release.publishedAt);
        if (!Number.isNaN(published.valueOf())) {
          date.textContent = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(published);
        }
      }
      if (status) status.textContent = 'Đã cập nhật';
      if (downloadLink) downloadLink.href = `${endpoint}?download=1`;
    } catch (_) {
      if (version) version.textContent = 'Không tải được thông tin';
      if (status) status.textContent = 'Nguồn phát hành tạm thời không khả dụng';
    }
  };

  const loadLiveCounts = async () => {
    if (catalogCount) {
      try {
        const response = await fetch('/api/catalog', { cache: 'no-store' });
        if (!response.ok) throw new Error('Game catalog unavailable');
        const games = await response.json();
        if (!Array.isArray(games)) throw new Error('Invalid game catalog');
        catalogCount.textContent = new Intl.NumberFormat('vi-VN').format(games.length);
      } catch (_) {
        catalogCount.textContent = '—';
      }
    }

    if (translationCount) {
      try {
        const response = await fetch('/api/translations', { cache: 'no-store' });
        if (!response.ok) throw new Error('Translation catalog unavailable');
        const entries = await response.json();
        if (!Array.isArray(entries)) throw new Error('Invalid translation catalog');
        translationCount.textContent = new Intl.NumberFormat('vi-VN').format(entries.length);
      } catch (_) {
        translationCount.textContent = '—';
      }
    }
  };

  void loadRelease();
  void loadLiveCounts();
})();
