/**
 * 0xshinky — Tooltip kiểu Windows 11 (thay cho tooltip trắng mặc định của WebView2)
 *
 * Không cần sửa HTML/JS cũ: mọi thuộc tính `title="..."` (kể cả gán bằng JS: el.title = '...')
 * được tự chuyển sang `data-tip` rồi vẽ bằng tooltip tuỳ biến. Xoá title (el.title = '') là tắt tooltip.
 *
 *  - Hiện sau ~450ms; đang lướt giữa các nút gần nhau thì hiện gần như ngay (giống thanh tác vụ).
 *  - Mặc định nằm dưới phần tử, hết chỗ thì lật lên trên; phần tử to (thẻ game, hàng danh sách) bám theo con trỏ.
 *  - Ẩn khi bấm chuột, cuộn, gõ phím, đổi cửa sổ. Bấm xong không tự bật lại cho tới khi rời phần tử.
 *  - Nhiều dòng: dùng "\n" trong title. Phím tắt cuối dòng đầu, ví dụ "Toàn màn hình (F11)", được hiện mờ.
 *  - Chỉ dùng textContent → không bao giờ chèn HTML từ title.
 */
(function () {
  'use strict';
  if (window.__shinkyTooltip) return;
  window.__shinkyTooltip = true;

  const CFG = {
    delay: 450,        // ms trước khi hiện (lần đầu)
    quickDelay: 40,    // ms khi vừa có tooltip khác biến mất
    quickWindow: 350,  // trong khoảng này coi như đang "lướt" giữa các nút
    gap: 8,            // khoảng cách tới phần tử
    margin: 8,         // chừa mép cửa sổ
    bigW: 220,         // phần tử rộng/cao hơn mức này → bám theo con trỏ
    bigH: 60
  };
  const SHORTCUT = /^(.*?)\s*\(((?:(?:Ctrl|Alt|Shift|Win|Cmd)\+)+[\w.\-]+|F\d{1,2}|Esc|Enter|Del)\)\s*$/i;

  function init() {
    const tip = document.createElement('div');
    tip.className = 'sk-tip';
    tip.setAttribute('role', 'tooltip');
    const main = document.createElement('div');
    main.className = 'sk-tip-main';
    const sub = document.createElement('div');
    sub.className = 'sk-tip-sub';
    tip.append(main, sub);
    document.body.appendChild(tip);

    let host = null, dismissed = false, shown = false;
    let showT = 0, watch = 0, lastHide = 0, mx = 0, my = 0;

    // title → data-tip (giữ tên truy cập cho nút chỉ có biểu tượng)
    function adopt(el) {
      if (!el.hasAttribute('title')) return;
      const t = el.getAttribute('title');
      el.removeAttribute('title');
      if (t && t.trim()) {
        el.dataset.tip = t;
        if (el.dataset.tipAria === '1' || (!el.hasAttribute('aria-label') && !el.textContent.trim())) {
          el.setAttribute('aria-label', t.split('\n')[0]);
          el.dataset.tipAria = '1';
        }
      } else {
        delete el.dataset.tip;
        if (el.dataset.tipAria === '1') { el.removeAttribute('aria-label'); delete el.dataset.tipAria; }
      }
    }

    function findHost(node) {
      const sel = '[title],[data-tip]';
      for (let el = node.closest(sel); el; el = el.parentElement && el.parentElement.closest(sel)) {
        if (el.hasAttribute('title')) adopt(el);
        if (el.dataset.tip) return el;
      }
      return null;
    }

    function render(text) {
      const lines = String(text).split(/\r?\n/);
      const m = SHORTCUT.exec(lines[0]);
      main.textContent = m ? m[1] : lines[0];
      if (m) {
        const k = document.createElement('span');
        k.className = 'sk-tip-key';
        k.textContent = m[2];
        main.appendChild(k);
      }
      sub.textContent = lines.slice(1).join('\n');
      sub.hidden = lines.length < 2;
    }

    function place() {
      tip.style.left = '0px';
      tip.style.top = '0px';
      tip.classList.remove('top');
      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight;
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      const r = host.getBoundingClientRect();
      const big = r.width > CFG.bigW || r.height > CFG.bigH;
      const cx = big ? mx : r.left + r.width / 2;
      let y = big ? my + 22 : r.bottom + CFG.gap;
      let flip = false;
      if (y + th > vh - CFG.margin) {
        y = big ? my - th - 12 : r.top - CFG.gap - th;
        flip = true;
      }
      const x = Math.min(Math.max(cx - tw / 2, CFG.margin), Math.max(CFG.margin, vw - tw - CFG.margin));
      y = Math.max(CFG.margin, y);
      tip.style.left = Math.round(x) + 'px';
      tip.style.top = Math.round(y) + 'px';
      tip.classList.toggle('top', flip);
    }

    function show() {
      showT = 0;
      if (!host || dismissed || !host.isConnected || !host.dataset.tip) return;
      render(host.dataset.tip);
      place();
      shown = true;
      tip.classList.add('show');
      clearInterval(watch);
      // phần tử bị xoá/ẩn khi đang hover (render lại danh sách…) → tự tắt, không để tooltip mồ côi
      watch = setInterval(() => {
        if (!host || !host.isConnected || !host.matches(':hover')) { hide(); host = null; }
      }, 300);
    }

    function hide() {
      clearTimeout(showT);
      clearInterval(watch);
      showT = 0;
      if (shown) lastHide = Date.now();
      shown = false;
      tip.classList.remove('show');
    }

    function schedule() {
      clearTimeout(showT);
      const quick = Date.now() - lastHide < CFG.quickWindow;
      showT = setTimeout(show, quick ? CFG.quickDelay : CFG.delay);
    }

    document.addEventListener('mouseover', (e) => {
      mx = e.clientX; my = e.clientY;
      if (!(e.target instanceof Element)) return;
      const next = findHost(e.target);
      if (next === host) return;
      hide();
      dismissed = false;
      host = next;
      if (host) schedule();
    }, true);

    document.addEventListener('mouseout', (e) => {
      if (!host) return;
      if (e.relatedTarget && host.contains(e.relatedTarget)) return;
      hide();
      host = null;
      dismissed = false;
    }, true);

    document.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true, capture: true });

    // Bấm / cuộn / gõ phím / đổi cửa sổ → tắt, và không tự bật lại cho tới khi rời phần tử
    const dismiss = () => { if (host) { dismissed = true; hide(); } };
    ['mousedown', 'wheel', 'keydown', 'contextmenu', 'scroll'].forEach((t) =>
      document.addEventListener(t, dismiss, { capture: true, passive: true }));
    window.addEventListener('blur', dismiss);

    // title được gán/đổi bằng JS (el.title = ...) → chuyển ngay, tooltip đang mở thì cập nhật chữ
    new MutationObserver((muts) => {
      for (const m of muts) {
        const el = m.target;
        if (!el.hasAttribute || !el.hasAttribute('title')) continue;
        adopt(el);
        if (el === host && shown) {
          if (el.dataset.tip) { render(el.dataset.tip); place(); } else hide();
        }
      }
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['title'], subtree: true });

    document.querySelectorAll('[title]').forEach(adopt);

    window.shinkyTooltip = { hide: () => { hide(); host = null; } };
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
