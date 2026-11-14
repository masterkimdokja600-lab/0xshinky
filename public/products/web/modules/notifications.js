/**
 * 0xshinky - Notification System Module (Hệ thống Thông báo)
 * Thiết kế độc lập theo chuẩn 0xoLemon (E:\007Launcher)
 */
(function () {
  'use strict';

  const STORAGE_KEY = '0xshinky_notifications';
  const RECENT_BUILD_KEY = '0xshinky_recent_build_changes';
  const RECENT_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
  const RECENT_LIMIT = 24;
  let modalQueue = [];
  let modalIsOpen = false;
  let catalogNavigationPending = false;
  let modalRetry = null;

  function getRecentBuilds() {
    try {
      const list = JSON.parse(localStorage.getItem(RECENT_BUILD_KEY) || '[]');
      return Array.isArray(list) ? list.filter(x => x && x.appid && x.oldBuildId && x.newBuildId &&
        Number.isFinite(Number(x.timestamp)) && Date.now() - Number(x.timestamp) < RECENT_MAX_AGE)
        .slice(0, RECENT_LIMIT) : [];
    } catch (_) { return []; }
  }

  function addRecentBuilds(updatedGames) {
    if (!updatedGames.length) return;
    const existing = getRecentBuilds();
    const batch = updatedGames.map(u => ({
      appid: String(u.game.appid), name: String(u.game.name || u.game.appid),
      oldBuildId: String(u.oldBuildId), newBuildId: String(u.newBuildId),
      poster_url: u.game.poster_url || '', header_url: u.game.header_url || '',
      timestamp: Date.now()
    }));
    const ids = new Set(batch.map(x => x.appid));
    const merged = batch.concat(existing.filter(x => !ids.has(String(x.appid)))).slice(0, RECENT_LIMIT);
    try { localStorage.setItem(RECENT_BUILD_KEY, JSON.stringify(merged)); } catch (_) {}
    if (window.updateRecentBuildMarquee) window.updateRecentBuildMarquee();
  }

  function catalogGameImage(data, kind) {
    if (!data || !data.appid) return '';
    const candidate = kind === 'poster' ? data.poster_url : data.header_url;
    if (candidate && /^https?:\/\//i.test(candidate)) return candidate;
    if (!/^\d+$/.test(String(data.appid))) return '';
    return 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/' + encodeURIComponent(String(data.appid)) +
      (kind === 'poster' ? '/library_600x900.jpg' : '/header.jpg');
  }

  /* Catalog changes get one centered, non-destructive dialog at a time.
     All other notifications keep their lightweight corner toast. */
  function enqueueCatalogDialog(notif) {
    modalQueue.push(notif);
    showNextCatalogDialog();
  }

  function showNextCatalogDialog() {
    if (modalIsOpen || catalogNavigationPending || !modalQueue.length) return;
    // Do not overlay an important confirmation or a currently open game/settings modal.
    if (document.querySelector('.app-dialog-backdrop.active, #settingsModal.active, #gameModal.active')) {
      if (!modalRetry) modalRetry = setTimeout(() => { modalRetry = null; showNextCatalogDialog(); }, 500);
      return;
    }
    const notif = modalQueue.shift();
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop app-dialog-backdrop catalog-notice-backdrop';
    overlay.setAttribute('aria-hidden', 'false');
    const card = document.createElement('div');
    card.className = 'modal-card app-dialog-card catalog-notice-card';
    card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', notif.title || 'Thông báo game mới');
    card.tabIndex = -1;
    const title = document.createElement('h2');
    title.className = 'app-dialog-title'; title.textContent = notif.title || 'Thông báo';
    const content = document.createElement('div'); content.className = 'catalog-notice-content';
    const gameData = notif.data || {};
    const poster = catalogGameImage(gameData, 'poster');
    if (poster) {
      const imageWrap = document.createElement('div'); imageWrap.className = 'catalog-notice-poster';
      const img = document.createElement('img'); img.alt = ''; img.decoding = 'async';
      img.onload = () => imageWrap.classList.add('has-image');
      img.onerror = () => {
        if (!img.dataset.headerTried) {
          img.dataset.headerTried = '1';
          const header = catalogGameImage(gameData, 'header');
          if (header && header !== img.src) { img.src = header; return; }
        }
        imageWrap.remove();
      };
      img.src = poster; imageWrap.appendChild(img); content.appendChild(imageWrap);
    }
    const details = document.createElement('div'); details.className = 'catalog-notice-details';
    const desc = document.createElement('p'); desc.textContent = notif.message || '';
    details.appendChild(desc);
    if (gameData.oldBuildId && gameData.newBuildId) {
      const version = document.createElement('div'); version.className = 'catalog-build-change';
      const oldVersion = document.createElement('span'); oldVersion.textContent = String(gameData.oldBuildId);
      const arrow = document.createElement('span'); arrow.className = 'catalog-build-arrow'; arrow.textContent = '→';
      const newVersion = document.createElement('strong'); newVersion.textContent = String(gameData.newBuildId);
      version.append(oldVersion, arrow, newVersion); details.appendChild(version);
    } else if (gameData.newBuildId) {
      const version = document.createElement('div'); version.className = 'catalog-build-change';
      version.textContent = 'BuildID: ' + String(gameData.newBuildId); details.appendChild(version);
    }
    content.appendChild(details);
    const actions = document.createElement('div'); actions.className = 'app-dialog-actions';
    const close = document.createElement('button'); close.type = 'button';
    close.className = 'app-dialog-button app-dialog-cancel'; close.textContent = 'Đóng';
    const open = document.createElement('button'); open.type = 'button';
    open.className = 'app-dialog-button app-dialog-approve'; open.textContent = 'Xem game';
    if (!gameData.appid) open.hidden = true;
    actions.append(close, open); card.append(title, content, actions); overlay.appendChild(card);
    document.body.appendChild(overlay);
    modalIsOpen = true;
    const oldFocus = document.activeElement;
    let finished = false;
    function finish(openGame) {
      if (finished) return;
      finished = true;
      document.removeEventListener('keydown', keyListener, true);
      overlay.remove(); modalIsOpen = false;
      markAsRead(notif.id);
      if (oldFocus && oldFocus.isConnected && typeof oldFocus.focus === 'function') oldFocus.focus({ preventScroll: true });
      if (openGame && gameData.appid && typeof window.openGameModalByAppId === 'function') {
        // Do not show the next notice while Python is still selecting this game.
        // Once details open, showNextCatalogDialog waits until the game modal closes.
        catalogNavigationPending = true;
        Promise.resolve().then(() => window.openGameModalByAppId(gameData.appid))
          .catch(err => console.error('Catalog notice: could not open game', err))
          .finally(() => { catalogNavigationPending = false; showNextCatalogDialog(); });
      } else {
        showNextCatalogDialog();
      }
    }
    function keyListener(ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); finish(false); }
      else if (ev.key === 'Tab') {
        const first = close, last = open.hidden ? close : open;
        if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
        else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
      }
    }
    close.addEventListener('click', () => finish(false));
    open.addEventListener('click', () => finish(true));
    overlay.addEventListener('click', e => { if (e.target === overlay) finish(false); });
    document.addEventListener('keydown', keyListener, true);
    requestAnimationFrame(() => { overlay.classList.add('active'); card.focus({ preventScroll: true }); });
  }

  let notifications = [];
  let isPopoverOpen = false;

  // Icon SVG tương ứng từng loại thông báo
  const ICONS = {
    download: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    update: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>`,
    translation: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>`,
    fix: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
    alert: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  };

  function loadStored() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Lọc bỏ thông báo khởi tạo giả
        notifications = parsed.filter(n => n.id !== 'init-1');
      } else {
        notifications = [];
      }
    } catch (e) {
      notifications = [];
    }
  }

  function saveStored() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (e) {}
  }

  function formatTime(ts) {
    if (!ts) return '';
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    const d = new Date(ts);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }

  function updateBadge() {
    const badge = document.getElementById('notifBadge');
    const unread = notifications.filter(n => !n.read).length;
    if (badge) {
      if (unread > 0) {
        badge.textContent = unread > 99 ? '99+' : String(unread);
        badge.removeAttribute('hidden');
        badge.style.display = 'block';
      } else {
        badge.setAttribute('hidden', '');
        badge.style.display = 'none';
      }
    }

    const unreadPill = document.getElementById('notifUnreadPill');
    if (unreadPill) {
      if (unread > 0) {
        unreadPill.textContent = `${unread} chưa đọc`;
        unreadPill.removeAttribute('hidden');
        unreadPill.style.display = 'inline-block';
      } else {
        unreadPill.setAttribute('hidden', '');
        unreadPill.style.display = 'none';
      }
    }

    const markAllBtn = document.getElementById('notifMarkAllBtn');
    if (markAllBtn) markAllBtn.disabled = unread === 0;

    const clearBtn = document.getElementById('notifClearBtn');
    if (clearBtn) clearBtn.disabled = notifications.length === 0;
  }

  function renderList() {
    const container = document.getElementById('notifList');
    if (!container) return;

    if (notifications.length === 0) {
      container.innerHTML = `
        <div class="notification-empty">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <strong>Không có thông báo mới</strong>
          <span>Thông báo tải game, cập nhật ứng dụng, game mới và cài việt hóa sẽ xuất hiện tại đây.</span>
        </div>
      `;
      return;
    }

    container.innerHTML = notifications.slice(0, 40).map(n => {
      const iconSvg = ICONS[n.category] || ICONS.info;
      const unreadDot = !n.read ? `<span class="notif-unread-dot"></span>` : `<span></span>`;
      return `
        <button type="button" class="notification-item ${n.read ? '' : 'is-unread'}" data-id="${n.id}">
          <div class="notif-icon-box category-${n.category || 'info'}">
            ${iconSvg}
          </div>
          <div class="notification-item-copy">
            <strong>${escapeHtml(n.title)}</strong>
            <span>${escapeHtml(n.message)}</span>
            <small>${formatTime(n.timestamp)}</small>
          </div>
          ${unreadDot}
        </button>
      `;
    }).join('');

    // Gắn sự kiện click từng thông báo
    container.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-id');
        markAsRead(id);
        const notif = notifications.find(n => n.id === id);
        if (notif && notif.data && notif.data.appid && window.openGameModalByAppId) {
          window.openGameModalByAppId(notif.data.appid);
          closePopover();
        }
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function markAsRead(id) {
    const item = notifications.find(n => n.id === id);
    if (item && !item.read) {
      item.read = true;
      saveStored();
      updateBadge();
      renderList();
    }
  }

  function markAllRead() {
    notifications.forEach(n => n.read = true);
    saveStored();
    updateBadge();
    renderList();
  }

  function clearAll() {
    notifications = [];
    saveStored();
    updateBadge();
    renderList();
  }

  function addNotification({ title, message, category = 'info', data = null, showToast = true }) {
    const notif = {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      title: title || 'Thông báo',
      message: message || '',
      category: category,
      timestamp: Date.now(),
      read: false,
      data: data
    };
    notifications.unshift(notif);
    if (notifications.length > 80) notifications.pop();
    saveStored();
    updateBadge();
    if (isPopoverOpen) renderList();

    if (showToast) {
      if (data && (data.kind === 'catalog-new' || data.kind === 'catalog-build')) {
        enqueueCatalogDialog(notif);
      } else {
        triggerToast(notif);
      }
    }
    return notif;
  }

  function triggerToast(notif) {
    let stack = document.getElementById('notifToastStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'notifToastStack';
      stack.className = 'notification-toast-stack';
      document.body.appendChild(stack);
    }

    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.innerHTML = `
      <div class="notif-icon-box category-${notif.category || 'info'}">
        ${ICONS[notif.category] || ICONS.info}
      </div>
      <div class="notification-toast-main">
        <strong>${escapeHtml(notif.title)}</strong>
        <small>${escapeHtml(notif.message)}</small>
      </div>
      <button type="button" class="notification-toast-close" title="Đóng">✕</button>
    `;

    toast.querySelector('.notification-toast-main').addEventListener('click', () => {
      markAsRead(notif.id);
      openPopover();
      toast.remove();
      if (notif.data && notif.data.appid && window.openGameModalByAppId) {
        window.openGameModalByAppId(notif.data.appid);
      }
    });

    toast.querySelector('.notification-toast-close').addEventListener('click', (e) => {
      e.stopPropagation();
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 200);
    });

    stack.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 200);
      }
    }, 6000);
  }

  function openPopover() {
    const pop = document.getElementById('notificationPopover');
    if (!pop) return;
    isPopoverOpen = true;
    pop.removeAttribute('hidden');
    pop.classList.add('active');
    pop.style.display = 'flex';
    renderList();
    updateBadge();
  }

  function closePopover() {
    const pop = document.getElementById('notificationPopover');
    if (!pop) return;
    isPopoverOpen = false;
    pop.setAttribute('hidden', '');
    pop.classList.remove('active');
    pop.style.display = 'none';
  }

  function togglePopover() {
    if (isPopoverOpen) {
      closePopover();
    } else {
      openPopover();
    }
  }

  function init() {
    loadStored();

    const notifBtn = document.getElementById('btnNotifications');
    if (notifBtn) {
      notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        // Đóng help popover nếu đang mở
        if (window.HelpSystem && window.HelpSystem.closePopover) {
          window.HelpSystem.closePopover();
        }
        togglePopover();
      });
    }

    const closeBtn = document.getElementById('notifCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        closePopover();
      });
    }

    const markAllBtn = document.getElementById('notifMarkAllBtn');
    if (markAllBtn) markAllBtn.addEventListener('click', markAllRead);

    const clearBtn = document.getElementById('notifClearBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearAll);

    // Đóng khi click ngoài
    document.addEventListener('click', (e) => {
      const pop = document.getElementById('notificationPopover');
      const btn = document.getElementById('btnNotifications');
      const ftBtn = document.querySelector('[data-ft="notifications"]');
      if (isPopoverOpen && pop && !pop.contains(e.target) && btn && !btn.contains(e.target) && (!ftBtn || !ftBtn.contains(e.target))) {
        closePopover();
      }
    });

    // Phím Escape để đóng
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isPopoverOpen) {
        closePopover();
      }
    });

    // MẶC ĐỊNH LUÔN ĐÓNG KHI KHỞI ĐỘNG
    closePopover();
    updateBadge();
  }

  // Key lưu trữ bộ đệm danh mục game để so sánh phiên bản mới
  const CATALOG_SNAPSHOT_KEY = '0xshinky_catalog_snapshot';

  function buildInfo(game) {
    const ids = Array.isArray(game.versions) ? game.versions
      .filter(v => v && v.id != null && v.is_ready !== false && String(v.id).toLowerCase() !== 'latest')
      .map(v => String(v.id).trim()).filter(Boolean) : [];
    const newest = String(game.build_id || ids[0] || '').trim();
    return { newest, ids };
  }


  /**
   * Tự động phát hiện game mới hoặc game có phiên bản BuildID mới và phát thông báo
   */
  function checkCatalogUpdates(catalogList) {
    if (!catalogList || !Array.isArray(catalogList) || catalogList.length === 0) return;

    let snapshot = null;
    try {
      const raw = localStorage.getItem(CATALOG_SNAPSHOT_KEY);
      if (raw) snapshot = JSON.parse(raw);
    } catch (e) {
      snapshot = null;
    }

    // Nếu chưa có snapshot (lần chạy đầu tiên): lưu lại làm mốc ban đầu (không spam toàn bộ danh mục cũ)
    if (!snapshot || typeof snapshot !== 'object') {
      const initSnapshot = {};
      catalogList.forEach(g => {
        if (g && g.appid) {
          initSnapshot[String(g.appid)] = {
            name: g.name || '',
            build_id: buildInfo(g).newest,
            last_detected_build_id: buildInfo(g).newest,
            version_ids: buildInfo(g).ids
          };
        }
      });
      try {
        localStorage.setItem(CATALOG_SNAPSHOT_KEY, JSON.stringify(initSnapshot));
      } catch (e) {}
      if (window.updateRecentBuildMarquee) window.updateRecentBuildMarquee();
      return;
    }

    const newGamesAdded = [];
    const updatedGames = [];
    const nextSnapshot = { ...snapshot };

    catalogList.forEach(g => {
      if (!g || !g.appid) return;
      const aid = String(g.appid);
      const latest = buildInfo(g);
      const currBuildId = latest.newest;
      const currName = g.name || `App ${aid}`;

      if (!snapshot[aid]) {
        // Game mới được thêm vào catalog!
        newGamesAdded.push(g);
        nextSnapshot[aid] = { name: currName, build_id: currBuildId,
          last_detected_build_id: currBuildId, version_ids: latest.ids };
      } else {
        const previous = snapshot[aid];
        const prevBuildId = String(previous.build_id || '').trim();
        const prevSeenVersion = String(previous.last_detected_build_id || prevBuildId).trim();
        // Also detect added version entries when catalog.build_id itself did not change.
        const knownIds = Array.isArray(previous.version_ids) ? previous.version_ids.map(String) : null;
        const newReadyVersion = knownIds ? latest.ids.find(id => !knownIds.includes(id)) : null;
        const newBuildId = (currBuildId && prevBuildId && currBuildId !== prevBuildId) ? currBuildId : newReadyVersion;
        if (newBuildId && prevSeenVersion && String(newBuildId) !== prevSeenVersion) {
          updatedGames.push({ game: g, oldBuildId: prevSeenVersion, newBuildId: String(newBuildId) });
        }
        nextSnapshot[aid] = {
          name: currName, build_id: currBuildId || prevBuildId,
          last_detected_build_id: newBuildId || prevSeenVersion,
          version_ids: latest.ids
        };
      }
    });

    // Cập nhật lại snapshot mới nhất
    try {
      localStorage.setItem(CATALOG_SNAPSHOT_KEY, JSON.stringify(nextSnapshot));
    } catch (e) {}

    if (window.updateRecentBuildMarquee) window.updateRecentBuildMarquee();

    // 1. Thông báo game mới
    if (newGamesAdded.length > 0) {
      if (newGamesAdded.length <= 4) {
        newGamesAdded.forEach(g => {
          addNotification({
            title: `Game mới: ${g.name}`,
            message: `Trò chơi vừa được thêm vào kho dữ liệu (BuildID: ${g.build_id || 'Mới nhất'})`,
            category: 'update',
            data: { appid: g.appid, kind: 'catalog-new', newBuildId: buildInfo(g).newest,
              poster_url: g.poster_url || '', header_url: g.header_url || '' }
          });
        });
      } else {
        const topNames = newGamesAdded.slice(0, 3).map(g => g.name).join(', ');
        addNotification({
          title: `Đã thêm ${newGamesAdded.length} trò chơi mới!`,
          message: `Các game mới: ${topNames} và ${newGamesAdded.length - 3} game khác.`,
          category: 'update',
          data: { kind: 'catalog-new', poster_url: newGamesAdded[0].poster_url || '',
            header_url: newGamesAdded[0].header_url || '', appid: newGamesAdded[0].appid,
            newBuildId: buildInfo(newGamesAdded[0]).newest }
        });
      }
    }

    // 2. Thông báo phiên bản BuildID mới
    if (updatedGames.length > 0) {
      addRecentBuilds(updatedGames);
      if (updatedGames.length <= 4) {
        updatedGames.forEach(u => {
          addNotification({
            title: `Cập nhật: ${u.game.name}`,
            message: 'Đã bổ sung phiên bản mới vào kho dữ liệu.',
            category: 'update',
            data: { appid: u.game.appid, kind: 'catalog-build',
              oldBuildId: u.oldBuildId, newBuildId: u.newBuildId,
              poster_url: u.game.poster_url || '', header_url: u.game.header_url || '' }
          });
        });
      } else {
        const topNames = updatedGames.slice(0, 3).map(u => u.game.name).join(', ');
        addNotification({
          title: `${updatedGames.length} game có bản cập nhật mới!`,
          message: `Các game cập nhật: ${topNames} và ${updatedGames.length - 3} game khác.`,
          category: 'update',
          data: { kind: 'catalog-build', appid: updatedGames[0].game.appid,
            poster_url: updatedGames[0].game.poster_url || '',
            header_url: updatedGames[0].game.header_url || '',
            oldBuildId: updatedGames[0].oldBuildId, newBuildId: updatedGames[0].newBuildId }
        });
      }
    }
  }

  function notifyGameAdded(game) {
    if (!game || !game.appid) return;
    const aid = String(game.appid);
    try {
      const raw = localStorage.getItem(CATALOG_SNAPSHOT_KEY);
      const snapshot = raw ? JSON.parse(raw) : {};
      snapshot[aid] = { name: game.name || '', build_id: buildInfo(game).newest,
        last_detected_build_id: buildInfo(game).newest, version_ids: buildInfo(game).ids };
      localStorage.setItem(CATALOG_SNAPSHOT_KEY, JSON.stringify(snapshot));
    } catch (e) {}

    addNotification({
      title: `Đã thêm game: ${game.name || aid}`,
      message: `Game đã được nạp thành công vào kho (BuildID: ${game.build_id || 'Mới nhất'})`,
      category: 'download',
      data: { appid: game.appid, kind: 'catalog-new', newBuildId: buildInfo(game).newest,
        poster_url: game.poster_url || '', header_url: game.header_url || '' }
    });
  }

  // Xuất API toàn cục
  window.NotificationCenter = {
    init: init,
    add: addNotification,
    markAllRead: markAllRead,
    clear: clearAll,
    open: openPopover,
    close: closePopover,
    toggle: togglePopover,
    checkCatalogUpdates: checkCatalogUpdates,
    notifyGameAdded: notifyGameAdded,
    getRecentBuilds: getRecentBuilds
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
