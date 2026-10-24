(() => {
  const installWebAppLink = () => {
    const actions = document.querySelector('.game-modal-actions');
    const marker = document.getElementById('gmSelectFilesBtn');
    if (!actions || !marker || document.getElementById('gmPreviewAppDownload')) return;

    const link = document.createElement('a');
    link.id = 'gmPreviewAppDownload';
    link.className = 'btn-secondary-action';
    link.href = '/api/desktop-update?download=1';
    link.setAttribute('aria-label', 'Tải ứng dụng 0xshinky cho Windows');
    link.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg><span>Tải ứng dụng</span>';
    marker.after(link);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installWebAppLink, { once: true });
  } else {
    installWebAppLink();
  }
})();
