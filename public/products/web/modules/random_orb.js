/**
 * 0xshinky - Random Game Orb & Voice Command Module
 * Thiết kế chuẩn 0xoLemon (E:\007Launcher)
 */
(function () {
  'use strict';

  const ROLL_MS = 660;
  const HOLD_TO_TALK_MS = 340;
  const LANDED_MS = 500;

  let isRolling = false;
  let isLanded = false;
  let isListening = false;
  let pressStarted = false;
  let voiceStarted = false;
  let holdTimeout = null;
  let rollTimeout = null;
  let landTimeout = null;
  let recognitionInstance = null;
  let voiceOverlayEl = null;

  /* -------------------------------------------------- Normalization & Matching */

  const NUM_WORDS = {
    one: '1', two: '2', three: '3', four: '4', five: '5', six: '6',
    seven: '7', eight: '8', nine: '9', ten: '10',
    mot: '1', hai: '2', ba: '3', bon: '4', nam: '5', sau: '6',
    bay: '7', tam: '8', chin: '9', muoi: '10'
  };

  const ROMAN = {
    i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7',
    viii: '8', ix: '9', x: '10', xi: '11', xii: '12', xiii: '13',
    xiv: '14', xv: '15', xvi: '16', xvii: '17', xviii: '18', xix: '19', xx: '20'
  };

  const COMMAND_PREFIX = /^(?:ok|oke|hey|nay)?\s*(?:play|open|launch|start|run|load|mo|choi|bat|chay|vao|khoi dong|toi muon choi|cho toi choi)\s+/i;
  const EDITION_NOISE = /\b(?:remastered|remake|reloaded|definitive|deluxe|ultimate|complete|enhanced|anniversary|goty|game of the year|directors cut|edition|repack|full|crack|viet hoa|tieng viet)\b/gi;

  function normalize(str) {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/['’`]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function canonical(str) {
    const raw = normalize(str).replace(COMMAND_PREFIX, '').replace(EDITION_NOISE, ' ').trim().replace(/\s+/g, ' ');
    return raw.split(' ').map(tok => NUM_WORDS[tok] || ROMAN[tok] || tok).join(' ');
  }

  function bigrams(s) {
    const out = [];
    for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
    return out;
  }

  function dice(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
    const ba = bigrams(a);
    const bb = bigrams(b);
    const pool = new Map();
    for (const g of ba) pool.set(g, (pool.get(g) || 0) + 1);
    let hits = 0;
    for (const g of bb) {
      const n = pool.get(g) || 0;
      if (n > 0) {
        pool.set(g, n - 1);
        hits++;
      }
    }
    return (2 * hits) / (ba.length + bb.length);
  }

  function phonetic(input) {
    let t = (input || '').replace(/\s+/g, '');
    if (!t) return '';
    t = t
      .replace(/^(kn|gn|pn|wr|ps)/, m => m[1])
      .replace(/^x/, 's')
      .replace(/ough/g, 'f')
      .replace(/ph/g, 'f')
      .replace(/sch/g, 'sk')
      .replace(/tch/g, 'x')
      .replace(/sh/g, 'x')
      .replace(/ch/g, 'x')
      .replace(/ck/g, 'k')
      .replace(/th/g, '0')
      .replace(/qu/g, 'kw')
      .replace(/gh/g, 'g')
      .replace(/c(?=[iey])/g, 's')
      .replace(/c/g, 'k')
      .replace(/g(?=[iey])/g, 'j')
      .replace(/z/g, 's')
      .replace(/([aeiou])h/g, '$1')
      .replace(/(.)\1+/g, '$1');
    const head = t[0] || '';
    return head + t.slice(1).replace(/[aeiouyw]/g, '');
  }

  function similarity(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    const na = a.replace(/ /g, '');
    const nb = b.replace(/ /g, '');
    if (na === nb) return 0.985;
    if (nb.startsWith(na) && na.length >= 4) return 0.9 + 0.07 * (na.length / nb.length);
    if (na.startsWith(nb) && nb.length >= 4) return 0.88 + 0.07 * (nb.length / na.length);
    if (nb.includes(na) && na.length >= 5) return 0.85;
    if (na.includes(nb) && nb.length >= 5) return 0.83;
    const d = dice(na, nb);
    const ph = dice(phonetic(a), phonetic(b));
    return Math.max(d * 0.96, ph * 0.88);
  }

  function resolveGame(transcript, gamesList) {
    if (!transcript || !gamesList || !gamesList.length) return null;
    const q = canonical(transcript);
    if (!q) return null;

    let bestGame = null;
    let bestScore = 0;

    for (const g of gamesList) {
      const gName = g.name || '';
      const c = canonical(gName);
      if (!c) continue;

      let score = similarity(q, c);
      // Kiểm tra cả phần trước dấu hai chấm
      const colonIdx = gName.indexOf(':');
      if (colonIdx > 0) {
        const head = canonical(gName.slice(0, colonIdx));
        if (head) {
          const sHead = similarity(q, head);
          if (sHead > score) score = sHead;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestGame = g;
      }
    }

    return bestScore >= 0.58 ? bestGame : null;
  }

  /* -------------------------------------------------- Random Roll Logic */

  function getAvailableGames() {
    let list = window.games;
    if ((!list || !list.length) && typeof games !== 'undefined' && Array.isArray(games)) {
      list = games;
      window.games = games;
    }
    if (!Array.isArray(list) || list.length === 0) return [];
    // Nếu đang ở bộ lọc Đã cài, ưu tiên chọn từ game đã cài
    const installedOnly = (document.getElementById('installedOnlyToggle') || document.getElementById('filterInstalledToggle'))?.checked;
    if (installedOnly) {
      const installed = list.filter(g => Boolean(g.is_installed));
      if (installed.length > 0) return installed;
    }
    return list;
  }

  function pickRandomGame() {
    if (isRolling) return;
    const pool = getAvailableGames();
    if (pool.length === 0) {
      if (typeof showToast === 'function') {
        showToast('Chưa có danh mục trò chơi để khám phá!', 'warn');
      }
      return;
    }

    const btn = document.getElementById('randomOrbBtn');
    if (!btn) return;

    if (rollTimeout) clearTimeout(rollTimeout);
    if (landTimeout) clearTimeout(landTimeout);

    isLanded = false;
    isRolling = true;
    btn.classList.remove('is-landed');
    btn.classList.add('is-rolling');

    rollTimeout = setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * pool.length);
      const chosen = pool[randomIndex];

      isRolling = false;
      isLanded = true;
      btn.classList.remove('is-rolling');
      btn.classList.add('is-landed');

      // Phát âm thanh khám phá game (âm thanh YouTube voice thay vì âm thanh tải game)
      if (typeof window.playSound === 'function') {
        window.playSound('voice_success');
      }

      // Mở modal chi tiết game
      if (chosen && chosen.appid && typeof window.openGameModalByAppId === 'function') {
        window.openGameModalByAppId(chosen.appid);
      }

      if (typeof showToast === 'function') {
        showToast(`✨ Khám phá trò chơi: ${chosen.name || chosen.appid}`, 'success');
      }

      landTimeout = setTimeout(() => {
        isLanded = false;
        btn.classList.remove('is-landed');
      }, LANDED_MS);
    }, ROLL_MS);
  }

  /* -------------------------------------------------- Voice Recognition (Web Speech API) */

  function showVoiceOverlay(initialText = '') {
    if (!voiceOverlayEl) {
      voiceOverlayEl = document.createElement('div');
      voiceOverlayEl.className = 'random-orb-voice-overlay';
      voiceOverlayEl.innerHTML = `
        <div class="random-orb-voice-panel">
          <span class="random-orb-voice-kicker">Tìm Game Bằng Giọng Nói</span>
          <div class="random-orb-voice-core" aria-hidden="true">
            <span class="random-orb-voice-ring random-orb-voice-ring--outer"></span>
            <span class="random-orb-voice-ring random-orb-voice-ring--inner"></span>
            <span class="random-orb-voice-bars">
              <i></i><i></i><i></i><i></i><i></i><i></i><i></i>
            </span>
          </div>
          <span class="random-orb-voice-transcript is-placeholder" id="randomOrbTranscript">Đang lắng nghe... Nói tên game</span>
          <span class="random-orb-voice-hint">Thả chuột hoặc nhả phím để tìm kiếm</span>
        </div>
      `;
      document.body.appendChild(voiceOverlayEl);
    }
    voiceOverlayEl.style.display = 'grid';
    const transcriptEl = document.getElementById('randomOrbTranscript');
    if (transcriptEl) {
      transcriptEl.textContent = initialText || 'Đang lắng nghe... Nói tên game';
      transcriptEl.className = initialText ? 'random-orb-voice-transcript' : 'random-orb-voice-transcript is-placeholder';
    }
  }

  function hideVoiceOverlay() {
    if (voiceOverlayEl) {
      voiceOverlayEl.style.display = 'none';
    }
  }

  function startVoice() {
    if (isRolling) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Trình duyệt không hỗ trợ Web Speech API
      return;
    }

    voiceStarted = true;
    isListening = true;
    const btn = document.getElementById('randomOrbBtn');
    if (btn) btn.classList.add('is-listening');

    // Âm thanh bắt đầu lắng nghe chuẩn YouTube / Google Voice Search
    if (typeof window.playSound === 'function') {
      window.playSound('voice_start');
    }

    showVoiceOverlay('Đang lắng nghe... Nói tên game');

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'vi-VN'; // Nhận diện tiếng Việt & tiếng Anh

      let lastTranscript = '';

      rec.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        lastTranscript = transcript;
        const transcriptEl = document.getElementById('randomOrbTranscript');
        if (transcriptEl && transcript) {
          transcriptEl.textContent = `"${transcript}"`;
          transcriptEl.classList.remove('is-placeholder');
        }
      };

      rec.onerror = (err) => {
        const transcriptEl = document.getElementById('randomOrbTranscript');
        if (transcriptEl) {
          transcriptEl.textContent = 'Không nghe rõ, thử lại...';
          transcriptEl.classList.add('is-placeholder');
        }
      };

      rec.onend = () => {
        isListening = false;
        if (btn) btn.classList.remove('is-listening');
      };

      rec.start();
      recognitionInstance = {
        stop: () => {
          try { rec.stop(); } catch (e) {}
          return lastTranscript;
        },
        abort: () => {
          try { rec.abort(); } catch (e) {}
        }
      };
    } catch (e) {
      voiceStarted = false;
      isListening = false;
      if (btn) btn.classList.remove('is-listening');
      hideVoiceOverlay();
    }
  }

  function stopVoiceAndResolve() {
    let transcript = '';
    if (recognitionInstance) {
      transcript = recognitionInstance.stop();
      recognitionInstance = null;
    }
    isListening = false;
    const btn = document.getElementById('randomOrbBtn');
    if (btn) btn.classList.remove('is-listening');

    setTimeout(() => {
      hideVoiceOverlay();
      if (!transcript) return;

      const matched = resolveGame(transcript, window.games || []);
      if (matched && matched.appid) {
        if (btn) {
          btn.classList.add('is-landed');
          setTimeout(() => btn.classList.remove('is-landed'), LANDED_MS);
        }
        // Âm thanh xác nhận tìm thấy thành công chuẩn YouTube Voice
        if (typeof window.playSound === 'function') {
          window.playSound('voice_success');
        }
        if (typeof window.openGameModalByAppId === 'function') {
          window.openGameModalByAppId(matched.appid);
        }
        if (typeof showToast === 'function') {
          showToast(`🎯 Giọng nói: Đã tìm thấy "${matched.name}"`, 'success');
        }
      } else {
        if (typeof window.playSound === 'function') {
          window.playSound('voice_error');
        }
        if (typeof showToast === 'function') {
          showToast(`Không tìm thấy game khớp với "${transcript}"`, 'warn');
        }
      }
    }, 250);
  }

  /* -------------------------------------------------- Pointer & Click Handlers */

  function clearHoldTimeout() {
    if (holdTimeout) clearTimeout(holdTimeout);
    holdTimeout = null;
  }

  function handlePointerDown(e) {
    e.stopPropagation();
    if (isRolling) return;
    pressStarted = true;
    voiceStarted = false;
    clearHoldTimeout();
    holdTimeout = setTimeout(startVoice, HOLD_TO_TALK_MS);
  }

  function handlePointerUp(e) {
    e.stopPropagation();
    clearHoldTimeout();
    if (!pressStarted) return;
    pressStarted = false;

    if (voiceStarted) {
      voiceStarted = false;
      stopVoiceAndResolve();
      return;
    }

    pickRandomGame();
  }

  function handlePointerCancel(e) {
    e.stopPropagation();
    clearHoldTimeout();
    pressStarted = false;
    if (voiceStarted) {
      voiceStarted = false;
      if (recognitionInstance) {
        recognitionInstance.abort();
        recognitionInstance = null;
      }
      isListening = false;
      hideVoiceOverlay();
      const btn = document.getElementById('randomOrbBtn');
      if (btn) btn.classList.remove('is-listening');
    }
  }

  /* -------------------------------------------------- Initialization */

  function renderOrb() {
    const anchor = document.getElementById('titlebarOrbAnchor');
    if (!anchor) return;

    anchor.innerHTML = `
      <button
        type="button"
        class="random-orb-btn"
        id="randomOrbBtn"
        data-hint="Khám phá game"
        aria-label="Chọn game ngẫu nhiên"
      >
        <span class="random-orb-sphere">
          <span class="random-orb-plasma" aria-hidden="true">
            <span class="random-orb-ribbon random-orb-ribbon--cyan"></span>
            <span class="random-orb-ribbon random-orb-ribbon--violet"></span>
            <span class="random-orb-ribbon random-orb-ribbon--pink"></span>
            <span class="random-orb-speckles"></span>
          </span>
        </span>
        <span class="random-orb-flash" aria-hidden="true"></span>
        <span class="random-orb-wave" aria-hidden="true"></span>
        <span class="random-orb-status" aria-live="polite"></span>
      </button>
    `;

    const btn = document.getElementById('randomOrbBtn');
    if (btn) {
      btn.addEventListener('pointerdown', handlePointerDown);
      btn.addEventListener('pointerup', handlePointerUp);
      btn.addEventListener('pointercancel', handlePointerCancel);
      btn.addEventListener('mouseleave', handlePointerCancel);

      btn.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handlePointerDown(e);
        }
      });
      btn.addEventListener('keyup', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handlePointerUp(e);
        }
      });
    }
  }

  function init() {
    renderOrb();
  }

  window.RandomGameOrb = {
    init: init,
    roll: pickRandomGame
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
