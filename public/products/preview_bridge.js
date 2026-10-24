(function () {
  'use strict';

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
      return await readJson('./translations.json', []);
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
      return window.location.origin;
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
      try {
        const response = await fetch(`/api/footage?appids=${encodeURIComponent(id)}`, { cache: 'force-cache' });
        if (!response.ok) return { ok: false, urls: [] };
        const payload = await response.json();
        const item = Array.isArray(payload?.items)
          ? payload.items.find(entry => String(entry.appid) === id)
          : null;
        const urls = Array.isArray(item?.urls)
          ? item.urls.filter(url => typeof url === 'string' && /^https:\/\//i.test(url))
          : [];
        return { ok: true, urls };
      } catch (_) {
        return { ok: false, urls: [] };
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
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      else await document.documentElement.requestFullscreen?.().catch(() => {});
      return Boolean(document.fullscreenElement);
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
