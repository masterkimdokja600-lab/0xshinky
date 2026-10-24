(function () {
  'use strict';

  let translationCache = null;
  let translationRequest = null;
  let translationRequestVersion = 0;
  const trailerCache = new Map();
  const trailerRequests = new Map();

  const readJson = async (name, fallback) => {
    try {
      const response = await fetch(new URL(name, document.baseURI || window.location.href), { cache: 'no-store' });
      if (!response.ok) return fallback;
      return await response.json();
    } catch (_) {
      return fallback;
    }
  };

  const notifyPreviewOnly = () => {
    const message = 'Đây là bản preview. Thao tác cài đặt hoặc tải game chỉ có trong ứng dụng PC.';
    if (window.showToast) window.showToast(message, 'info');
  };

  const api = {
    async get_games() {
      const response = await fetch('/api/catalog', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Game catalog request failed (${response.status})`);
      const games = await response.json();
      if (!Array.isArray(games)) throw new Error('Game catalog response is not a list');
      return games.map(game => {
        const copy = Object.assign({}, game);
        delete copy.install_dir;
        copy.is_installed = false;
        return copy;
      });
    },
    async get_all_translations() {
      if (translationCache !== null) return translationCache;
      if (translationRequest) return translationRequest;
      const requestVersion = ++translationRequestVersion;
      translationRequest = (async () => {
        const response = await fetch('/api/translations', { cache: 'no-store' });
        if (!response.ok) throw new Error(`Translation catalog request failed (${response.status})`);
        const translations = await response.json();
        if (!Array.isArray(translations)) throw new Error('Translation catalog response is not a list');
        if (requestVersion === translationRequestVersion) translationCache = translations;
        return translations;
      })().finally(() => {
        if (requestVersion === translationRequestVersion) translationRequest = null;
      });
      return translationRequest;
    },
    async refresh_translations() {
      translationCache = null;
      translationRequest = null;
      translationRequestVersion += 1;
      return this.get_all_translations();
    },
    async find_translations(appid) {
      const id = String(appid ?? '').trim();
      if (!/^\d+$/.test(id)) return [];
      const translations = translationCache || await this.get_all_translations();
      return translations.filter(item => String(item.gameId ?? item.id ?? '') === id);
    },
    async get_settings() {
      const defaults = await readJson('./default_settings.json', {});
      try {
        return Object.assign({}, defaults, JSON.parse(localStorage.getItem('0xshinky-preview-settings') || '{}'));
      } catch (_) {
        return defaults;
      }
    },
    async set_setting(key, value) {
      try {
        const saved = JSON.parse(localStorage.getItem('0xshinky-preview-settings') || '{}');
        saved[key] = value;
        localStorage.setItem('0xshinky-preview-settings', JSON.stringify(saved));
      } catch (_) {}
      return true;
    },
    async get_preview_site_url() {
      return new URL('/products/web/index.html', window.location.origin).toString();
    },
    async get_crack_status() {
      return {};
    },
    async get_countdown_html() {
      try {
        const response = await fetch(new URL('./phantom_blade_zero_countdown.html', document.baseURI || window.location.href));
        return response.ok ? await response.text() : '';
      } catch (_) {
        return '';
      }
    },
    async get_game_trailer(appid) {
      const id = String(appid ?? '').trim();
      if (!/^\d+$/.test(id)) return { ok: true, urls: [] };
      if (trailerCache.has(id)) return trailerCache.get(id);
      if (trailerRequests.has(id)) return trailerRequests.get(id);
      const request = (async () => {
        try {
          const response = await fetch(`/api/footage?appids=${encodeURIComponent(id)}`, { cache: 'force-cache' });
          if (!response.ok) return { ok: false, urls: [], details: null };
          const payload = await response.json();
          const item = Array.isArray(payload?.items)
            ? payload.items.find(entry => String(entry.appid) === id)
            : null;
          const urls = Array.isArray(item?.urls)
            ? item.urls.filter(url => typeof url === 'string' && /^https:\/\//i.test(url))
            : [];
          const result = { ok: true, urls, details: item?.details && typeof item.details === 'object' ? item.details : null };
          trailerCache.set(id, result);
          return result;
        } catch (_) {
          return { ok: false, urls: [], details: null };
        }
      })();
      trailerRequests.set(id, request);
      try {
        return await request;
      } finally {
        if (trailerRequests.get(id) === request) trailerRequests.delete(id);
      }
    },
    async sync_games() {
      return { status: 'preview_only' };
    },
    async start_download() {
      notifyPreviewOnly();
      return { status: 'preview_only' };
    },
    async launch_game() {
      notifyPreviewOnly();
      return { status: 'preview_only' };
    },
    async open_external_url(url) {
      if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      return true;
    },
    async check_disk_space() {
      return { free: 0, total: 0 };
    },
    async is_fullscreen() {
      return Boolean(document.fullscreenElement);
    },
    async toggle_fullscreen() {
      return false;
    },
    async get_active_download() {
      return null;
    },
    async cancel_download() {
      return false;
    },
    async auto_resume_pending() {
      return false;
    }
  };

  const previewApi = new Proxy(api, {
    get(target, key) {
      if (key in target) return target[key];
      return async function () {
        return null;
      };
    }
  });

  window.__0XSHINKY_PREVIEW_MODE__ = true;
  window.__0XSHINKY_PREVIEW_CATALOG_ERROR__ = false;
  window.__0XSHINKY_PREVIEW_TRANSLATIONS_ERROR__ = false;
  window.pywebview = window.pywebview || {};
  window.pywebview.api = previewApi;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.dispatchEvent(new Event('pywebviewready'));
    }, { once: true });
  } else {
    window.setTimeout(() => window.dispatchEvent(new Event('pywebviewready')), 0);
  }
})();
