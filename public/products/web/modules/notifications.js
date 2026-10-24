/**
 * 0xshinky - Notification System Module (Hệ thống Thông báo)
 * Thiết kế độc lập theo chuẩn 0xoLemon (E:\007Launcher)
 */
(function () {
  'use strict';

  const STORAGE_KEY = '0xshinky_notifications';
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
      triggerToast(notif);
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
            build_id: String(g.build_id || '').trim()
          };
        }
      });
      try {
        localStorage.setItem(CATALOG_SNAPSHOT_KEY, JSON.stringify(initSnapshot));
      } catch (e) {}
      return;
    }

    const newGamesAdded = [];
    const updatedGames = [];
    const nextSnapshot = { ...snapshot };

    catalogList.forEach(g => {
      if (!g || !g.appid) return;
      const aid = String(g.appid);
      const currBuildId = String(g.build_id || '').trim();
      const currName = g.name || `App ${aid}`;

      if (!snapshot[aid]) {
        // Game mới được thêm vào catalog!
        newGamesAdded.push(g);
        nextSnapshot[aid] = { name: currName, build_id: currBuildId };
      } else {
        const prevBuildId = String(snapshot[aid].build_id || '').trim();
        if (currBuildId && prevBuildId && currBuildId !== prevBuildId) {
          // Game đã có nhưng vừa cập nhật BuildID mới!
          updatedGames.push({ game: g, oldBuildId: prevBuildId, newBuildId: currBuildId });
          nextSnapshot[aid] = { name: currName, build_id: currBuildId };
        } else if (currBuildId && !prevBuildId) {
          nextSnapshot[aid].build_id = currBuildId;
        }
      }
    });

    // Cập nhật lại snapshot mới nhất
    try {
      localStorage.setItem(CATALOG_SNAPSHOT_KEY, JSON.stringify(nextSnapshot));
    } catch (e) {}

    // 1. Thông báo game mới
    if (newGamesAdded.length > 0) {
      if (newGamesAdded.length <= 4) {
        newGamesAdded.forEach(g => {
          addNotification({
            title: `Game mới: ${g.name}`,
            message: `Trò chơi vừa được thêm vào kho dữ liệu (BuildID: ${g.build_id || 'Mới nhất'})`,
            category: 'update',
            data: { appid: g.appid }
          });
        });
      } else {
        const topNames = newGamesAdded.slice(0, 3).map(g => g.name).join(', ');
        addNotification({
          title: `Đã thêm ${newGamesAdded.length} trò chơi mới!`,
          message: `Các game mới: ${topNames} và ${newGamesAdded.length - 3} game khác.`,
          category: 'update'
        });
      }
    }

    // 2. Thông báo phiên bản BuildID mới
    if (updatedGames.length > 0) {
      if (updatedGames.length <= 4) {
        updatedGames.forEach(u => {
          addNotification({
            title: `Cập nhật: ${u.game.name}`,
            message: `Game có phiên bản BuildID mới: ${u.newBuildId} (bản cũ: ${u.oldBuildId})`,
            category: 'update',
            data: { appid: u.game.appid }
          });
        });
      } else {
        const topNames = updatedGames.slice(0, 3).map(u => u.game.name).join(', ');
        addNotification({
          title: `${updatedGames.length} game có bản cập nhật mới!`,
          message: `Các game cập nhật: ${topNames} và ${updatedGames.length - 3} game khác.`,
          category: 'update'
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
      snapshot[aid] = { name: game.name || '', build_id: String(game.build_id || '').trim() };
      localStorage.setItem(CATALOG_SNAPSHOT_KEY, JSON.stringify(snapshot));
    } catch (e) {}

    addNotification({
      title: `Đã thêm game: ${game.name || aid}`,
      message: `Game đã được nạp thành công vào kho (BuildID: ${game.build_id || 'Mới nhất'})`,
      category: 'download',
      data: { appid: game.appid }
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
    notifyGameAdded: notifyGameAdded
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
