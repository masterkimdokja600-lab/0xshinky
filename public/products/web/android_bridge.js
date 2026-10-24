(function() {
  'use strict';
  if (window.__androidBridgeInitialized) return;
  window.__androidBridgeInitialized = true;

  console.log("[AndroidBridge] Initializing Android WebView Bridge for 0xshinky Mobile...");

  // Polyfill window.pywebview for seamless compatibility with 0xshinky desktop web UI
  window.pywebview = {
    api: new Proxy({}, {
      get: function(target, prop) {
        return function(...args) {
          return new Promise(function(resolve, reject) {
            try {
              if (window.AndroidBridge && typeof window.AndroidBridge.callApi === 'function') {
                const resultStr = window.AndroidBridge.callApi(prop, JSON.stringify(args));
                if (!resultStr || resultStr === "undefined") {
                  resolve(null);
                } else {
                  try {
                    resolve(JSON.parse(resultStr));
                  } catch (e) {
                    resolve(resultStr);
                  }
                }
              } else {
                console.warn("[AndroidBridge] Native interface not attached yet, method:", prop);
                resolve(null);
              }
            } catch (err) {
              console.error("[AndroidBridge] Error calling:", prop, err);
              reject(err);
            }
          });
        };
      }
    })
  };

  // Dispatch pywebviewready once DOM is ready
  function triggerReady() {
    try {
      window.dispatchEvent(new Event('pywebviewready'));
      console.log("[AndroidBridge] pywebviewready event fired successfully");
    } catch (e) {
      console.error("[AndroidBridge] Failed to dispatch pywebviewready:", e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', triggerReady);
  } else {
    setTimeout(triggerReady, 80);
  }

  // Intercept back key to close open overlays/modals cleanly
  window.handleAndroidBack = function() {
    // 1. Close active modal
    const modal = document.querySelector('.modal-backdrop:not([style*="display: none"]), .modal-overlay.active, .help-modal.active');
    if (modal) {
      const closeBtn = modal.querySelector('.close-btn, .modal-close, [data-action="close"]');
      if (closeBtn) {
        closeBtn.click();
        return true;
      }
    }
    // 2. Close active drawer
    const drawer = document.querySelector('.game-drawer.active, .drawer.open');
    if (drawer) {
      const closeBtn = drawer.querySelector('.drawer-close');
      if (closeBtn) {
        closeBtn.click();
        return true;
      }
    }
    // 3. Clear search if focused or filled
    const searchInput = document.getElementById('searchInput');
    if (searchInput && (document.activeElement === searchInput || searchInput.value)) {
      searchInput.value = '';
      searchInput.blur();
      if (window.applySearchFilter) window.applySearchFilter();
      return true;
    }
    return false;
  };
})();
