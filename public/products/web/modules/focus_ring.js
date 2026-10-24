/**
 * 0xshinky — Chỉ hiện viền focus khi người dùng điều hướng bằng phím Tab.
 * Bấm chuột, chạm, hay cửa sổ mất/lấy lại focus (minimize, maximize, fullscreen, Alt+Tab) → không có viền.
 * Phím tắt khác (F11, Alt+Enter, mũi tên…) cũng không bật viền.
 */
(function () {
  'use strict';
  const root = document.documentElement;
  let on = false;
  const set = (v) => { if (v !== on) { on = v; root.classList.toggle('kbd-nav', v); } };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !e.altKey && !e.ctrlKey && !e.metaKey) set(true);
  }, true);
  ['mousedown', 'pointerdown', 'touchstart'].forEach((t) =>
    document.addEventListener(t, () => set(false), { capture: true, passive: true }));
  window.addEventListener('blur', () => set(false));
})();
