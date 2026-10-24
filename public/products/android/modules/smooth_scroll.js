/**
 * 0xshinky — Kinetic Inertia Smooth Scroll
 *
 * Mang lại trải nghiệm lướt mượt với lực quán tính vật lý chân thực (tương tự Adobe.com / macOS):
 *  - Lăn chậm / nhẹ: phản hồi tức thì, dừng êm ái tự nhiên (~112px mỗi nấc).
 *  - Kéo nhanh và mạnh (flick/hard scroll): lực quán tính compounding tích lũy gia tốc,
 *    giảm ma sát động (dynamic lerp) để trôi nhanh hơn, xa hơn và có đuôi giảm tốc mượt mà.
 *  - Tự động hạ ma sát khi bay xa và tăng dần ma sát khi hạ cánh để không trôi lố.
 *  - Công thức vi phân chuẩn: current += (target - current) * (1 - e^(-lerp * 60 * dt))
 *    hoạt động đồng nhất trên mọi tần số quét màn hình (60Hz / 120Hz / 144Hz / 240Hz).
 *  - Nhường cho vùng con đang cuộn được (modal, dropdown, textarea...) theo overflow thực tế.
 *  - Phát hiện thao tác kéo thanh cuộn / phím PageDown / Space -> dừng engine ngay, không giật ngược.
 *  - Tương thích CSS Scroll-Driven Animations (--pbz-start, --sm-col) cho banner và lưới thẻ.
 */
(function () {
  'use strict';

  const CONFIG = {
    baseLerp: 0.065,        // Hệ số ma sát cơ bản khi lăn chậm / nhẹ (dừng êm, chính xác)
    glideLerp: 0.048,       // Hệ số ma sát khi có quán tính lớn (trôi êm vừa phải, không bị quá trớn)
    wheelMultiplier: 0.92,  // Độ nhạy lăn chuột vừa vặn (~92px mỗi nấc, giảm nhẹ theo yêu cầu)
    lineHeightPx: 40,       // deltaMode = 1 (dòng)
    preventSelectors: [
      '.modal-body', '.modal-card', '.modal-backdrop', '.custom-select-dropdown',
      '.sf-file-list-container', '.help-modal', '.notif-panel', '.dropdown-menu',
      '[data-no-smooth]', '[data-lenis-prevent]'
    ].join(',')
  };

  function init() {
    const mv = document.querySelector('.main-view');
    if (!mv) { setTimeout(init, 50); return; }
    if (window.__shinkySmoothScroll) return;
    window.__shinkySmoothScroll = true;

    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    let current = 0, target = 0;
    let running = false, rafId = 0, lastT = 0, lastWritten = 0;
    let lastWheelTime = 0, wheelStreak = 0, lastWheelSign = 0;
    let idleTimer = 0;

    const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
    const maxScroll = () => Math.max(0, mv.scrollHeight - mv.clientHeight);

    function flagScrolling(on) {
      clearTimeout(idleTimer);
      if (on) root.classList.add('is-smooth-scrolling');
      else idleTimer = setTimeout(() => root.classList.remove('is-smooth-scrolling'), 160);
    }

    function write(y) {
      mv.scrollTop = y;
      lastWritten = mv.scrollTop;
    }

    function halt() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      running = false;
      wheelStreak = 0;
      flagScrolling(false);
    }

    function start() {
      if (running) return;
      running = true;
      lastT = performance.now() - 1000 / 60;
      flagScrolling(true);
      rafId = requestAnimationFrame(tick);
    }

    function tick(now) {
      rafId = 0;
      const dt = clamp((now - lastT) / 1000, 0, 0.05);
      lastT = now;

      const max = maxScroll();
      target = clamp(target, 0, max);
      current = clamp(current, 0, max);

      const dist = Math.abs(target - current);

      // Quán tính vật lý: khi khoảng cách trôi xa (do kéo mạnh/flick nhiều lần),
      // ma sát động giảm xuống (CONFIG.glideLerp ~0.048) giúp trang lướt xa và êm.
      // Khi gần tới đích (dist < 150px), ma sát tự tăng về baseLerp (~0.065) để đáp nhẹ nhàng, không trôi tuột.
      const lerp = dist > 450
        ? CONFIG.glideLerp
        : (dist > 150 ? 0.056 : CONFIG.baseLerp);

      current += (target - current) * (1 - Math.exp(-lerp * 60 * dt));

      if (dist < 0.5) {
        current = target;
        write(current);
        running = false;
        wheelStreak = 0;
        flagScrolling(false);
        return;
      }

      write(current);
      rafId = requestAnimationFrame(tick);
    }

    // Phần tử con đang tự cuộn được theo hướng wheel → để cuộn gốc xử lý
    function nestedScrollerWantsIt(node, dy) {
      for (let el = node; el && el !== mv && el.nodeType === 1; el = el.parentElement) {
        if (el.matches && el.matches(CONFIG.preventSelectors)) return true;
        const oy = getComputedStyle(el).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
          const atTop = el.scrollTop <= 0;
          const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
          if ((dy < 0 && !atTop) || (dy > 0 && !atBottom)) return true;
        }
      }
      return false;
    }

    function onWheel(e) {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || reduceMotion.matches) return;

      let dy = e.deltaY;
      if (dy === 0 || Math.abs(e.deltaX) > Math.abs(dy)) return;
      if (e.deltaMode === 1) dy *= CONFIG.lineHeightPx;
      else if (e.deltaMode === 2) dy *= mv.clientHeight;

      if (nestedScrollerWantsIt(e.target, dy)) return;

      const max = maxScroll();
      if (max <= 0) return;

      e.preventDefault();

      const now = performance.now();
      const dtWheel = now - lastWheelTime;
      lastWheelTime = now;

      // Tính toán chuỗi lăn liên tục (streak) và gia tốc vật lý
      const sign = Math.sign(dy);
      if (dtWheel < 240 && sign === lastWheelSign) {
        wheelStreak = Math.min(wheelStreak + 1, 5);
      } else {
        wheelStreak = 0;
      }
      lastWheelSign = sign;

      // Lực tác động vật lý:
      // - Lăn chậm: momentumFactor = 1.0 (mỗi nấc ~92px êm ái, kiểm soát tốt).
      // - Lăn nhanh/mạnh: gia tốc gia tăng vừa phải, tạo cảm giác có lực quán tính đầm chắc.
      const absDy = Math.abs(dy);
      const velocityBonus = Math.min(1.7, Math.pow(Math.max(1, absDy / 100), 1.1));
      const momentumFactor = 1.0 + (wheelStreak * 0.18) + (velocityBonus - 1.0) * 0.30;

      const impulse = dy * CONFIG.wheelMultiplier * momentumFactor;

      if (!running) {
        current = target = mv.scrollTop;
      }
      target = clamp(target + impulse, 0, max);

      start();
    }

    mv.addEventListener('wheel', onWheel, { passive: false });

    // Cuộn từ nguồn khác (kéo thanh cuộn, phím PageDown/Space, scrollIntoView…) → nhường, không kéo ngược
    mv.addEventListener('scroll', () => {
      if (running && Math.abs(mv.scrollTop - lastWritten) > 2) halt();
    }, { passive: true });

    // ── Iframe banner: wheel trên iframe cũng được đưa vào engine ──
    const frame = document.getElementById('pbzFrame');
    function hookFrame() {
      try {
        const w = frame && frame.contentWindow;
        if (!w || w.__shinkyWheel) return;
        w.addEventListener('wheel', onWheel, { passive: false });
        w.__shinkyWheel = true;
      } catch (err) {}
    }
    if (frame) { frame.addEventListener('load', hookFrame); hookFrame(); }

    // ── API ──
    function smoothScrollTo(dest, opts) {
      let y = 0;
      if (typeof dest === 'number') y = dest;
      else if (dest && dest.getBoundingClientRect) {
        y = mv.scrollTop + dest.getBoundingClientRect().top - mv.getBoundingClientRect().top;
      }
      y = clamp(y, 0, maxScroll());
      if (opts && opts.immediate) { halt(); write(y); return; }
      if (!running) current = mv.scrollTop;
      target = y;
      start();
    }
    window.smoothScrollTo = smoothScrollTo;
    window.shinkyScroll = { config: CONFIG, to: smoothScrollTo, stop: halt };

    // ── CSS Scroll-Driven Animations helpers ──
    const box = document.getElementById('gamesViewContainer');
    if (box && window.ResizeObserver) {
      const sync = () => mv.style.setProperty('--pbz-start', box.offsetTop + 'px');
      sync();
      const ro = new ResizeObserver(sync);
      ro.observe(mv); ro.observe(box);
      const sh = mv.querySelector('.sub-header');
      if (sh) ro.observe(sh);
    }

    const grid = document.getElementById('gameGrid');
    if (grid && window.ResizeObserver && window.MutationObserver) {
      let cols = 0, queued = false;
      const colCount = () => {
        const t = getComputedStyle(grid).gridTemplateColumns;
        return t && t !== 'none' ? t.trim().split(/\s+/).length : 1;
      };
      const index = () => {
        queued = false;
        cols = colCount();
        const kids = grid.children;
        for (let i = 0; i < kids.length; i++) {
          const c = String(i % cols);
          if (kids[i].dataset.smCol !== c) {
            kids[i].dataset.smCol = c;
            kids[i].style.setProperty('--sm-col', c);
          }
        }
      };
      const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(index); } };
      new MutationObserver(schedule).observe(grid, { childList: true });
      new ResizeObserver(() => { if (colCount() !== cols) schedule(); }).observe(grid);
      index();
    }

    console.log('[smooth_scroll] Kinetic Inertia engine active (baseLerp: ' + CONFIG.baseLerp + ', glideLerp: ' + CONFIG.glideLerp + ', wheelMultiplier: ' + CONFIG.wheelMultiplier + ')');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
