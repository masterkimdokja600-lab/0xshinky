/**
 * 0xshinky - System Status Module (Wifi, Battery, Clock & Date)
 * Thiết kế chuẩn 0xoLemon (E:\007Launcher)
 */
(function () {
  'use strict';

  const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  let clockTimer = null;
  let batteryPollTimer = null;
  let currentBattery = null;
  let currentNetwork = 'good';

  /* -------------------------------------------------- Clock & Date */

  function updateClock() {
    const timeEl = document.getElementById('titlebarClockTime');
    const dateEl = document.getElementById('titlebarClockDate');
    const clockEl = document.getElementById('titlebarClock');
    if (!timeEl || !dateEl) return;

    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 thành 12
    const hourStr = String(hours).padStart(2, '0');

    timeEl.textContent = `${hourStr}:${minutes} ${ampm}`;
    dateEl.textContent = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;

    if (clockEl) {
      clockEl.setAttribute('data-hint', now.toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }));
    }
  }

  function startClock() {
    if (clockTimer) clearInterval(clockTimer);
    updateClock();
    clockTimer = setInterval(updateClock, 1000);
  }

  /* -------------------------------------------------- Network Status (Wifi) */

  function getNetworkQuality() {
    if (!navigator.onLine) return 'offline';
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return 'good';
    const type = conn.effectiveType || '';
    if (type === 'slow-2g' || type === '2g' || type === '3g') return 'weak';
    return 'good';
  }

  function renderWifi(quality) {
    const el = document.getElementById('titlebarWifi');
    if (!el) return;
    currentNetwork = quality;

    let strokeColor = '#facc15'; // Màu vàng chuẩn 0xoLemon trong ảnh
    let hint = 'Mạng: Đã kết nối';

    if (quality === 'offline') {
      strokeColor = '#ef4444';
      hint = 'Mạng: Ngoại tuyến (Mất kết nối)';
      el.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="1" y1="1" x2="23" y2="23"/>
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
          <circle cx="12" cy="20" r="1" fill="${strokeColor}"/>
        </svg>
      `;
    } else if (quality === 'weak') {
      hint = 'Mạng: Tín hiệu yếu';
      el.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12.55a10.94 10.94 0 0 1 14 0" stroke="${strokeColor}" stroke-width="2" opacity="0.3"/>
          <path d="M1.42 9a15.91 15.91 0 0 1 21.16 0" stroke="${strokeColor}" stroke-width="2" opacity="0.2"/>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" stroke="${strokeColor}" stroke-width="2"/>
          <circle cx="12" cy="20" r="1" fill="${strokeColor}"/>
        </svg>
      `;
    } else {
      el.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12.55a10.94 10.94 0 0 1 14 0"/>
          <path d="M1.42 9a15.91 15.91 0 0 1 21.16 0"/>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
          <circle cx="12" cy="20" r="1" fill="${strokeColor}"/>
        </svg>
      `;
    }
    el.setAttribute('data-hint', hint);
  }

  function initNetwork() {
    renderWifi(getNetworkQuality());
    window.addEventListener('online', () => renderWifi(getNetworkQuality()));
    window.addEventListener('offline', () => renderWifi('offline'));
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      conn.addEventListener('change', () => renderWifi(getNetworkQuality()));
    }
  }

  /* -------------------------------------------------- Battery Status */

  function renderBattery(state) {
    const el = document.getElementById('titlebarBattery');
    if (!el) return;
    if (!state) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'inline-flex';

    const level = Math.max(0, Math.min(100, Math.round(state.level || 0)));
    const charging = Boolean(state.charging);
    const hasBattery = state.has_battery !== false;

    let color = '#22c55e'; // Green
    if (level <= 20) color = '#ef4444'; // Red
    else if (level <= 50) color = '#facc15'; // Yellow

    const fillWidth = Math.max(0, Math.min(13, Math.round((level / 100) * 13)));
    let hint = `Pin: ${level}%${charging ? ' (Đang sạc)' : ''}`;
    if (!hasBattery) {
      hint = 'Nguồn điện: Trực tiếp (AC Power)';
    }

    el.setAttribute('data-hint', hint);
    el.innerHTML = `
      <svg width="20" height="11" viewBox="0 0 20 11" fill="none">
        <!-- Vỏ pin bo góc chuẩn 0xoLemon -->
        <rect x="0.75" y="0.75" width="16.5" height="9.5" rx="2.5" ry="2.5" stroke="${color}" stroke-width="1.3"/>
        <!-- Đầu cực dương pin -->
        <path d="M18 3.5 L18 7.5 Q20 7.5 20 5.5 Q20 3.5 18 3.5" fill="${color}"/>
        <!-- Mức pin bên trong -->
        <rect x="2.5" y="2.5" width="${fillWidth}" height="6" rx="1.5" fill="${color}"/>
        <!-- Tia sét khi sạc -->
        ${charging ? `
          <path d="M9.5 1.5 L6.8 5.8 H9.6 L7.5 9.5 L12.5 4.8 H9.8 Z" fill="#ffffff" opacity="0.95"/>
        ` : ''}
      </svg>
    `;
  }

  async function updateBattery() {
    // 1. Ưu tiên gọi Windows API qua Python (100% chuẩn xác phần cứng Windows)
    if (window.pywebview && window.pywebview.api && window.pywebview.api.get_system_status) {
      try {
        const sys = await window.pywebview.api.get_system_status();
        if (sys && typeof sys.level === 'number') {
          currentBattery = sys;
          renderBattery(sys);
          return;
        }
      } catch (e) {}
    }

    // 2. Fallback sang Web Battery API
    if (navigator.getBattery) {
      try {
        const bat = await navigator.getBattery();
        const sys = {
          has_battery: true,
          level: Math.round(bat.level * 100),
          charging: bat.charging
        };
        currentBattery = sys;
        renderBattery(sys);
        return;
      } catch (e) {}
    }

    // 3. Desktop không có pin -> Mặc định 100% cắm nguồn
    renderBattery({ has_battery: false, level: 100, charging: true });
  }

  function initBattery() {
    updateBattery();
    if (batteryPollTimer) clearInterval(batteryPollTimer);
    batteryPollTimer = setInterval(updateBattery, 15000); // Cập nhật mỗi 15s

    if (navigator.getBattery) {
      navigator.getBattery().then(bat => {
        bat.addEventListener('levelchange', updateBattery);
        bat.addEventListener('chargingchange', updateBattery);
      }).catch(() => {});
    }
  }

  /* -------------------------------------------------- Initialization */

  function init() {
    startClock();
    initNetwork();
    initBattery();
  }

  window.SystemStatus = {
    init: init,
    updateClock: updateClock,
    updateBattery: updateBattery
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
