/**
 * 0xshinky - Help & Guide System Module (Hệ thống Hướng dẫn)
 * Thiết kế độc lập theo chuẩn 0xoLemon (E:\007Launcher)
 */
(function () {
  'use strict';

  // Cơ sở dữ liệu hướng dẫn và khái niệm
  const HELP_TOPICS = {
    store: {
      category: 'guide',
      title: 'Cửa hàng & Kho Game',
      summary: 'Duyệt và tìm kiếm hàng nghìn tựa game từ các kho dữ liệu máy chủ, xem cấu hình chi tiết và bắt đầu tải xuống.',
      canDo: [
        'Tìm kiếm nhanh theo tên game hoặc AppID Steam',
        'Xem chi tiết thông tin, dung lượng tải và ảnh chụp màn hình',
        'Chọn phiên bản (BuildID) phù hợp và bấm Tải game với DepotDownloader'
      ],
      tip: 'Bạn có thể lọc nhanh theo thể loại hoặc sắp xếp theo tên/dung lượng để dễ dàng tìm kiếm.'
    },
    library: {
      category: 'guide',
      title: 'Thư viện Game đã cài',
      summary: 'Quản lý toàn bộ game đã cài đặt trên máy của bạn. Khởi chạy game an toàn, áp dụng bản sửa lỗi và quản lý file.',
      canDo: [
        'Bấm "Chơi ngay" để khởi chạy trò chơi trực tiếp',
        'Áp dụng hoặc gỡ bỏ các bản Fix Online / Fix Offline cho game',
        'Mở trực tiếp thư mục lưu trữ game trên máy tính'
      ],
      tip: 'Nếu game yêu cầu quyền Quản trị viên, hệ thống sẽ tự động gửi yêu cầu cấp quyền UAC để game chạy mượt mà.'
    },
    translations: {
      category: 'guide',
      title: 'Kho Việt Hóa Game',
      summary: 'Khám phá và cài đặt hơn 1.300 bản dịch tiếng Việt cho game từ các nhóm dịch uy tín hàng đầu (TRT, CCT, GTV...).',
      canDo: [
        'Lọc bản dịch theo từng nhóm dịch hoặc tìm kiếm tên game',
        'Xem tác giả, ghi chú phiên bản và hướng dẫn cài đặt',
        'Tải và cài đặt tự động file việt hóa vào thư mục game chỉ với 1 cú click'
      ],
      tip: 'Hãy cài đặt game trước khi tải bản việt hóa để ứng dụng tự động nhận diện đúng thư mục cài game.'
    },
    downloads: {
      category: 'guide',
      title: 'Quản lý Tiến trình Tải',
      summary: 'Theo dõi hàng đợi tải game, tốc độ mạng thời gian thực, dung lượng đã tải và tiến trình giải nén depot.',
      canDo: [
        'Theo dõi tốc độ tải và ước tính thời gian hoàn tất',
        'Tự động ghi nhớ điểm ngắt quãng để tiếp tục tải khi gặp sự cố mạng',
        'Nhận thông báo tự động ngay khi game tải xong'
      ],
      tip: 'Tốc độ tải phụ thuộc vào đường truyền mạng và tốc độ ghi của ổ cứng (SSD sẽ giải nén nhanh hơn nhiều).'
    },
    settings: {
      category: 'guide',
      title: 'Cài đặt Ứng dụng',
      summary: 'Tùy chỉnh cấu hình hệ thống, thư mục tải game mặc định, giao diện chủ đề và các thiết lập nâng cao.',
      canDo: [
        'Chọn đường dẫn ổ đĩa lưu game mặc định',
        'Bật tắt giao diện chủ đề Sáng / Tối và hình nền tùy biến',
        'Kiểm tra phiên bản ứng dụng và quản lý cập nhật tự động'
      ],
      tip: 'Nên chọn ổ đĩa còn nhiều dung lượng trống để đảm bảo game có đủ chỗ giải nén sau khi tải.'
    },
    elevation: {
      category: 'concept',
      title: 'Lỗi WinError 740 & Quyền Admin',
      summary: 'Khắc phục sự cố khi Windows chặn khởi chạy game yêu cầu quyền Quản trị viên (Elevation Required).',
      canDo: [
        'Nhấp chuột phải vào 0xshinky.exe chọn "Run as administrator"',
        'Bấm "Yes" khi Windows hiển thị hộp thoại xác nhận UAC',
        'Kiểm tra thư mục cài game không bị phần mềm diệt virus khóa file .exe'
      ],
      tip: '0xshinky v4.0.1+ đã tích hợp sẵn cơ chế tự động yêu cầu cấp quyền UAC khi phát hiện game đòi quyền Admin.'
    },
    buildId: {
      category: 'concept',
      title: 'Steam BuildID là gì?',
      summary: 'Mã định danh cho một bản phát hành chính thức của game trên hệ thống máy chủ Steam.',
      canDo: [
        'Phân biệt các phiên bản game khác nhau (bản cũ và bản cập nhật mới)',
        'Đảm bảo chọn đúng bản game tương thích với bản Việt Hóa hoặc Fix',
        'Tránh việc game bị lỗi sau khi cập nhật không khớp depot'
      ],
      tip: 'Một tựa game có thể có nhiều bản cập nhật BuildID xuyên suốt quá trình phát triển.'
    },
    cache: {
      category: 'concept',
      title: 'Bộ nhớ đệm (AppCache .vdf)',
      summary: 'Lưu trữ danh mục game và thông tin việt hóa dưới dạng nhị phân mã hóa để mở app tức thì.',
      canDo: [
        'Mở app và xem danh mục game cực nhanh ngay cả khi mất kết nối mạng',
        'Bảo mật dữ liệu danh mục, chống chỉnh sửa sai lệch',
        'Bấm nút làm mới ở thanh tiêu đề để đồng bộ dữ liệu mới nhất từ máy chủ'
      ],
      tip: 'Cache được lưu tại %LOCALAPPDATA%\\0xshinky và hoàn toàn an toàn khi sử dụng.'
    }
  };

  let isPopoverOpen = false;
  let isModalOpen = false;
  let currentTopicId = 'store';

  function getCurrentTabTopic() {
    // Nhận diện tab hiện tại đang mở trong giao diện 0xshinky
    const activeTab = document.querySelector('.nav-tab.active, .sub-tab-btn.active');
    if (activeTab) {
      const text = activeTab.textContent.toLowerCase();
      if (text.includes('việt hóa') || text.includes('translation')) return 'translations';
      if (text.includes('đã cài') || text.includes('installed')) return 'library';
      if (text.includes('tải') || text.includes('download')) return 'downloads';
      if (text.includes('cài đặt') || text.includes('setting')) return 'settings';
    }
    return 'store';
  }

  function renderPopover(topicId) {
    const topic = HELP_TOPICS[topicId] || HELP_TOPICS.store;
    currentTopicId = topicId;

    const popover = document.getElementById('helpPopover');
    if (!popover) return;

    popover.innerHTML = `
      <div class="help-popover-head">
        <span class="help-popover-icon">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </span>
        <strong>${escapeHtml(topic.title)}</strong>
        <button type="button" class="btn-close-popover" id="helpPopoverCloseBtn" title="Đóng">✕</button>
      </div>
      <p>${escapeHtml(topic.summary)}</p>
      <ul>
        ${topic.canDo.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
      <button type="button" class="help-popover-action" id="openHelpCenterBtn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
        Mở Trung tâm trợ giúp
      </button>
    `;

    const closeBtn = popover.querySelector('#helpPopoverCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        closePopover();
      });
    }
    const centerBtn = popover.querySelector('#openHelpCenterBtn');
    if (centerBtn) {
      centerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        closePopover();
        openHelpCenter(currentTopicId);
      });
    }
  }

  function openPopover() {
    const pop = document.getElementById('helpPopover');
    if (!pop) return;
    const tabTopic = getCurrentTabTopic();
    renderPopover(tabTopic);
    isPopoverOpen = true;
    pop.removeAttribute('hidden');
    pop.classList.add('active');
    pop.style.display = 'block';
  }

  function closePopover() {
    const pop = document.getElementById('helpPopover');
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

  function renderHelpCenterContent(topicId) {
    const topic = HELP_TOPICS[topicId] || HELP_TOPICS.store;
    currentTopicId = topicId;

    const contentEl = document.getElementById('helpCenterContent');
    if (!contentEl) return;

    const isConcept = topic.category === 'concept';
    const kicker = isConcept ? 'Khái niệm & Kinh nghiệm' : 'Hướng dẫn chức năng';

    contentEl.innerHTML = `
      <div class="help-center-kicker">${kicker}</div>
      <h3>${escapeHtml(topic.title)}</h3>
      <p>${escapeHtml(topic.summary)}</p>

      <h4>Những thao tác chính bạn có thể làm:</h4>
      <ul>
        ${topic.canDo.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>

      ${topic.tip ? `
        <div class="help-center-tip">
          <strong>MẸO HỮU ÍCH:</strong>
          <span>${escapeHtml(topic.tip)}</span>
        </div>
      ` : ''}
    `;

    // Cập nhật trạng thái active ở nav bên trái
    const navButtons = document.querySelectorAll('.help-center-nav button');
    navButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-topic') === topicId);
    });
  }

  function openHelpCenter(initialTopic = 'store') {
    let backdrop = document.getElementById('helpCenterBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'helpCenterBackdrop';
      backdrop.className = 'help-center-backdrop';
      document.body.appendChild(backdrop);
    }

    backdrop.innerHTML = `
      <div class="help-center" role="dialog" aria-label="Trung tâm trợ giúp">
        <header class="help-center-header">
          <div>
            <span class="help-center-mark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </span>
            <div>
              <h2>Trung tâm Trợ giúp 0xshinky</h2>
              <p>Hướng dẫn chi tiết cách tải game, cài Việt Hóa và giải quyết sự cố</p>
            </div>
          </div>
          <button type="button" class="help-center-close" id="helpCenterCloseBtn" title="Đóng">✕</button>
        </header>

        <div class="help-center-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="helpCenterSearchInput" placeholder="Tìm kiếm hướng dẫn, mẹo tải game, lỗi Admin..." />
        </div>

        <div class="help-center-layout">
          <nav class="help-center-nav">
            <strong>HƯỚNG DẪN TỪNG MỤC</strong>
            <button type="button" data-topic="store">Kho Game & Tìm kiếm</button>
            <button type="button" data-topic="library">Thư viện Game đã cài</button>
            <button type="button" data-topic="translations">Cài đặt Việt Hóa</button>
            <button type="button" data-topic="downloads">Tiến trình Tải</button>
            <button type="button" data-topic="settings">Cài đặt Ứng dụng</button>

            <strong style="margin-top: 14px;">KHÁI NIỆM & KINH NGHIỆM</strong>
            <button type="button" data-topic="elevation">Lỗi WinError 740 & Admin</button>
            <button type="button" data-topic="buildId">BuildID & Phiên bản</button>
            <button type="button" data-topic="cache">Bộ nhớ đệm (AppCache)</button>
          </nav>

          <main class="help-center-content" id="helpCenterContent">
            <!-- Nội dung chi tiết được nạp qua JS -->
          </main>
        </div>

        <footer class="help-center-footer">
          <div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>Cần hỗ trợ thêm hoặc báo lỗi game?</span>
          </div>
          <button type="button" id="helpDiscordBtn">
            Tham gia cộng đồng Discord
          </button>
        </footer>
      </div>
    `;

    backdrop.removeAttribute('hidden');
    backdrop.classList.add('active');
    backdrop.style.display = 'grid';
    isModalOpen = true;

    // Gắn sự kiện chuyển mục
    backdrop.querySelectorAll('.help-center-nav button').forEach(btn => {
      btn.addEventListener('click', () => {
        const tId = btn.getAttribute('data-topic');
        renderHelpCenterContent(tId);
      });
    });

    // Sự kiện tìm kiếm thời gian thực
    const searchInput = backdrop.querySelector('#helpCenterSearchInput');
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) {
        backdrop.querySelectorAll('.help-center-nav button').forEach(b => b.hidden = false);
        return;
      }
      backdrop.querySelectorAll('.help-center-nav button').forEach(b => {
        const topic = HELP_TOPICS[b.getAttribute('data-topic')];
        const match = topic && (
          topic.title.toLowerCase().includes(q) ||
          topic.summary.toLowerCase().includes(q) ||
          topic.canDo.some(c => c.toLowerCase().includes(q))
        );
        b.hidden = !match;
      });
    });

    backdrop.querySelector('#helpCenterCloseBtn').addEventListener('click', closeHelpCenter);
    backdrop.querySelector('#helpDiscordBtn').addEventListener('click', () => {
      window.open('https://discord.gg/mA83pfN6RT', '_blank');
    });

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeHelpCenter();
    });

    renderHelpCenterContent(initialTopic || 'store');
  }

  function closeHelpCenter() {
    const backdrop = document.getElementById('helpCenterBackdrop');
    if (!backdrop) return;
    backdrop.setAttribute('hidden', '');
    backdrop.classList.remove('active');
    backdrop.style.display = 'none';
    isModalOpen = false;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function init() {
    // MẶC ĐỊNH LUÔN ĐÓNG KHI KHỞI ĐỘNG
    closePopover();
    closeHelpCenter();

    const helpBtn = document.getElementById('btnHelp');
    if (helpBtn) {
      helpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        // Đóng notification popover nếu đang mở
        if (window.NotificationCenter && window.NotificationCenter.close) {
          window.NotificationCenter.close();
        }
        togglePopover();
      });
    }

    document.addEventListener('click', (e) => {
      const pop = document.getElementById('helpPopover');
      const btn = document.getElementById('btnHelp');
      const ftBtn = document.querySelector('[data-ft="help"]');
      if (isPopoverOpen && pop && !pop.contains(e.target) && btn && !btn.contains(e.target) && (!ftBtn || !ftBtn.contains(e.target))) {
        closePopover();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (isModalOpen) closeHelpCenter();
        else if (isPopoverOpen) closePopover();
      }
    });
  }

  window.HelpSystem = {
    init: init,
    openPopover: openPopover,
    closePopover: closePopover,
    togglePopover: togglePopover,
    openCenter: openHelpCenter,
    closeCenter: closeHelpCenter
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
