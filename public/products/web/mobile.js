(function () {
  'use strict';

  function initMobileUI() {
    if (document.getElementById('mobileBottomNav')) return;
    document.body.classList.add('android-app');
    initAndroidPreviewAction();

    // 1. Create Bottom Navigation Bar
    const nav = document.createElement('nav');
    nav.id = 'mobileBottomNav';
    nav.className = 'mobile-bottom-nav';
    nav.innerHTML = `
      <button type="button" class="mobile-nav-item active" id="mobNavGames">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="6" width="20" height="12" rx="3"></rect>
          <path d="M6 12h4m-2-2v4m7-2h.01m3 0h.01"></path>
        </svg>
        <span>Games</span>
      </button>

      <button type="button" class="mobile-nav-item" id="mobNavViethoa">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
        <span>Việt Hóa</span>
      </button>

      <button type="button" class="mobile-nav-item" id="mobNavSettings">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
        <span>Cài đặt</span>
      </button>
    `;
    document.body.appendChild(nav);

    // 2. Wire up Bottom Navigation Events
    const btnGames = document.getElementById('mobNavGames');
    const btnViethoa = document.getElementById('mobNavViethoa');
    const btnSettings = document.getElementById('mobNavSettings');

    function setActiveMobNav(activeBtn) {
      document.querySelectorAll('.mobile-nav-item').forEach(el => el.classList.remove('active'));
      if (activeBtn) activeBtn.classList.add('active');
    }

    if (btnGames) {
      btnGames.addEventListener('click', () => {
        setActiveMobNav(btnGames);
        document.body.classList.remove('view-translations');
        const tab = document.getElementById('tabGamesBtn');
        if (tab) tab.click();
        const mv = document.querySelector('.main-view');
        if (mv) mv.scrollTop = 0;
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal && settingsModal.classList.contains('active')) {
          const closeBtn = document.getElementById('closeModalX');
          if (closeBtn) closeBtn.click();
        }
      });
    }

    if (btnViethoa) {
      btnViethoa.addEventListener('click', () => {
        setActiveMobNav(btnViethoa);
        document.body.classList.add('view-translations');
        const tab = document.getElementById('tabViethoaBtn');
        if (tab) tab.click();
        const mv = document.querySelector('.main-view');
        if (mv) mv.scrollTop = 0;
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal && settingsModal.classList.contains('active')) {
          const closeBtn = document.getElementById('closeModalX');
          if (closeBtn) closeBtn.click();
        }
      });
    }

    if (btnSettings) {
      btnSettings.addEventListener('click', () => {
        setActiveMobNav(btnSettings);
        const openSettingsBtn = document.getElementById('openSettingsBtn');
        if (openSettingsBtn) openSettingsBtn.click();
      });
    }

    // Synchronize top tab changes with bottom nav
    const topTabGames = document.getElementById('tabGamesBtn');
    const topTabViethoa = document.getElementById('tabViethoaBtn');
    if (topTabGames) {
      topTabGames.addEventListener('click', () => {
        setActiveMobNav(btnGames);
        document.body.classList.remove('view-translations');
      });
    }
    if (topTabViethoa) {
      topTabViethoa.addEventListener('click', () => {
        setActiveMobNav(btnViethoa);
        document.body.classList.add('view-translations');
      });
    }

    // Dismiss keyboard on search enter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') searchInput.blur();
      });
    }
  }

  function initAndroidPreviewAction() {
    const downloadButton = document.getElementById('gmDownloadBtn');
    const actions = downloadButton && downloadButton.closest('.game-modal-actions');
    if (!downloadButton || !actions || document.getElementById('gmPreviewBtn')) return;

    const folderInput = document.getElementById('gmFolderInput');
    const folderGroup = folderInput && folderInput.closest('.form-group');
    if (folderGroup) folderGroup.classList.add('android-hidden-on-phone');

    const androidOnlyHiddenControls = [
      'gmProgressContainer',
      'gmLogLine',
      'gmPlayBtn',
      'gmLaunchOptionsBtn',
      'gmDownloadBtn',
      'gmSelectFilesBtn',
      'gmPauseDlBtn',
      'gmCancelDlBtn',
      'gmApplyFixGroup',
      'gmViethoaBtn',
      'gmUninstallFixBtn',
      'gmUninstallBtn'
    ];
    androidOnlyHiddenControls.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.classList.add('android-hidden-on-phone');
    });

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'gmPreviewBtn';
    button.className = 'btn-secondary-action';
    button.disabled = true;
    button.textContent = 'Đang kiểm tra trang preview…';
    button.title = 'Mở trang preview chung của 0xshinky trên web';
    actions.appendChild(button);

    let previewUrl = '';
    const api = window.pywebview && window.pywebview.api;
    const getPreviewUrl = api && api.get_preview_site_url;
    if (typeof getPreviewUrl !== 'function') {
      button.textContent = 'Website preview chưa được cấu hình';
      button.title = 'Cấu hình 0XSHINKY_PREVIEW_URL rồi build lại APK release';
      return;
    }

    Promise.resolve(getPreviewUrl()).then(value => {
      const candidate = typeof value === 'string' ? value.trim() : '';
      if (!candidate) {
        button.textContent = 'Website preview chưa được cấu hình';
        button.title = 'Cấu hình 0XSHINKY_PREVIEW_URL rồi build lại APK release';
        return;
      }
      try {
        const parsed = new URL(candidate);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return;
        previewUrl = parsed.toString();
      } catch (_) {
        return;
      }

      button.disabled = false;
      button.textContent = 'Xem preview trên web';
      button.title = 'Mở trang preview chung của ứng dụng web và Android';
    }).catch(() => {
      button.textContent = 'Website preview chưa được cấu hình';
      button.title = 'Không đọc được địa chỉ website preview';
    });

    button.addEventListener('click', async () => {
      if (!previewUrl) return;
      const target = new URL(previewUrl);
      target.searchParams.set('product', 'android');
      const gameId = document.getElementById('gmAppId');
      if (gameId && gameId.textContent.trim() && gameId.textContent.trim() !== '—') {
        target.searchParams.set('game', gameId.textContent.trim());
      }
      const currentApi = window.pywebview && window.pywebview.api;
      if (currentApi && currentApi.open_external_url) {
        await currentApi.open_external_url(target.toString());
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileUI);
  } else {
    setTimeout(initMobileUI, 100);
  }
})();
