  // ============================================================
  // UTIL UI: format tanggal, modal konfirmasi, toast pesan
  // ============================================================
  function formatDayLabel(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    if (dateStr === todayStr()) return 'Hari ini';
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // Aman untuk teks maupun nilai atribut (tanda kutip ikut di-escape). Pakai penggantian string,
  // bukan membuat elemen <div> tiap panggilan (dipanggil ratusan kali per render).
  const _ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => _ESC_MAP[c]);
  }

  function showConfirm(message) {
    return new Promise((resolve) => {
      const overlay = $('modal-overlay');
      const msgEl = $('modal-msg');
      const okBtn = $('modal-confirm');
      const cancelBtn = $('modal-cancel');
      msgEl.textContent = message;
      overlay.classList.add('open');

      function cleanup(result) {
        overlay.classList.remove('open');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        overlay.removeEventListener('click', onOverlay);
        resolve(result);
      }
      function onOk() { cleanup(true); }
      function onCancel() { cleanup(false); }
      function onOverlay(e) { if (e.target === overlay) cleanup(false); }

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      overlay.addEventListener('click', onOverlay);
    });
  }

  // Pesan hasil aksi. Tampil di elemen target (bawaan #io-msg di tab Profil) kalau elemen itu sedang terlihat;
  // kalau tidak (mis. galat dari form di sheet, sementara #io-msg ada di tab lain), jatuh ke toast supaya pesan tidak hilang.
  function showIoMsg(text, kind, elId) {
    const el = $(elId || 'io-msg');
    const visible = !!(el && el.offsetParent !== null);
    if (!text) { if (el) { el.textContent = ''; el.className = 'io-msg'; } return; }
    if (visible) {
      el.textContent = text;
      el.className = 'io-msg' + (kind ? ' ' + kind : '');
      setTimeout(() => { if (el.textContent === text) el.textContent = ''; }, kind === 'error' ? 8000 : 4000);
    } else {
      showToast(text, kind);
    }
  }

  let toastTimer = null;
  function showToast(text, kind) {
    let t = document.getElementById('app-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'app-toast';
      t.setAttribute('aria-live', 'polite');
      document.body.appendChild(t);
    }
    t.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    t.className = 'app-toast show' + (kind ? ' ' + kind : '');
    t.textContent = text;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.classList.remove('show'); }, kind === 'error' ? 6000 : 3000);
  }

  // ============================================================
  // CUSTOM SELECT: dropdown ber-tampilan sendiri untuk field akun/kategori
  // di form transaksi (bukan <select> bawaan browser).
  // Pendekatan: <select> asli tetap ada tapi disembunyikan (class csel-native)
  // dan tetap dipakai sebagai satu-satunya "sumber kebenaran" — kode lain yang
  // baca/tulis .value, .innerHTML, .selectedIndex, atau pasang onchange="..."
  // pada select ini TIDAK perlu diubah sama sekali. Dropdown custom cuma
  // lapisan tampilan: dia baca opsi dari <select> asli tiap kali dibuka, dan
  // waktu opsi dipilih, dia isi .value <select> lalu trigger event 'change'
  // seperti select biasa. Supaya label tombolnya ikut ter-update walau
  // .value/.innerHTML/.selectedIndex di-set langsung dari file lain (bukan
  // lewat klik), setter ketiga properti itu "disadap" (masih jalan seperti
  // asli, cuma nambah refresh label sesudahnya).
  // ============================================================
  function enhanceSelect(id) {
    const native = $(id);
    if (!native || native.dataset.cselDone) return;
    native.dataset.cselDone = '1';

    const wrap = document.createElement('div');
    wrap.className = 'csel';
    native.parentNode.insertBefore(wrap, native);
    wrap.appendChild(native);
    native.classList.add('csel-native');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'csel-trigger';
    const label = document.createElement('span');
    label.className = 'csel-label';
    trigger.appendChild(label);
    wrap.appendChild(trigger);

    const panel = document.createElement('div');
    panel.className = 'csel-panel';
    panel.setAttribute('role', 'listbox');
    document.body.appendChild(panel);

    function refreshLabel() {
      const opt = native.options[native.selectedIndex];
      label.textContent = opt ? opt.textContent : '—';
    }

    function closePanel() {
      panel.classList.remove('open');
      wrap.classList.remove('open');
      document.removeEventListener('mousedown', onOutside, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', closePanel);
      document.removeEventListener('scroll', onScroll, true);
    }
    function onOutside(e) {
      if (!panel.contains(e.target) && !trigger.contains(e.target)) closePanel();
    }
    function onKey(e) {
      if (e.key === 'Escape') closePanel();
    }
    function onScroll(e) {
      if (panel.contains(e.target)) return; // scroll di dalam panel sendiri, jangan tutup
      closePanel();
    }

    function isOptionHidden(opt) {
      return opt.disabled || opt.hidden || opt.style.display === 'none';
    }

    function buildOption(opt) {
      const row = document.createElement('div');
      row.className = 'csel-option' + (opt.value === native.value ? ' active' : '');
      row.setAttribute('role', 'option');
      row.textContent = opt.textContent;
      row.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (native.value !== opt.value) {
          native.value = opt.value;
          native.dispatchEvent(new Event('change', { bubbles: true }));
        }
        closePanel();
      });
      return row;
    }

    function buildPanel() {
      panel.innerHTML = '';
      const nodes = Array.from(native.children);
      if (!nodes.length) {
        const empty = document.createElement('div');
        empty.className = 'csel-empty';
        empty.textContent = 'Tidak ada pilihan';
        panel.appendChild(empty);
        return;
      }
      nodes.forEach(node => {
        if (node.tagName === 'OPTGROUP') {
          const visibleOpts = Array.from(node.children).filter(opt => !isOptionHidden(opt));
          if (!visibleOpts.length) return;
          const gl = document.createElement('div');
          gl.className = 'csel-optgroup-label';
          gl.textContent = node.label;
          panel.appendChild(gl);
          visibleOpts.forEach(opt => panel.appendChild(buildOption(opt)));
        } else if (node.tagName === 'OPTION') {
          if (isOptionHidden(node)) return;
          panel.appendChild(buildOption(node));
        }
      });
    }

    function openPanel() {
      buildPanel();
      const rect = trigger.getBoundingClientRect();
      panel.style.left = rect.left + 'px';
      panel.style.width = rect.width + 'px';
      panel.style.top = (rect.bottom + 4) + 'px';
      panel.classList.add('open');
      const panelH = panel.offsetHeight;
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < panelH + 12 && rect.top > panelH + 12) {
        panel.style.top = (rect.top - panelH - 4) + 'px';
      }
      wrap.classList.add('open');
      document.addEventListener('mousedown', onOutside, true);
      document.addEventListener('keydown', onKey, true);
      window.addEventListener('resize', closePanel);
      document.addEventListener('scroll', onScroll, true);
    }

    trigger.addEventListener('click', () => {
      if (panel.classList.contains('open')) closePanel();
      else openPanel();
    });

    ['value', 'innerHTML', 'selectedIndex'].forEach(prop => {
      const desc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, prop) ||
                   Object.getOwnPropertyDescriptor(Element.prototype, prop) ||
                   Object.getOwnPropertyDescriptor(Node.prototype, prop);
      if (!desc || !desc.set) return;
      Object.defineProperty(native, prop, {
        configurable: true,
        get() { return desc.get.call(native); },
        set(v) { desc.set.call(native, v); refreshLabel(); }
      });
    });

    refreshLabel();
  }

  [
    'category-select', 'account-select', 'to-account-select',
    // Form akun (tambah/edit)
    'acc-type-input', 'acc-fee-type-input', 'acc-fee-period-input', 'acc-asset-kind-input',
    'acc-card-min-type-input', 'acc-loan-stage-input', 'acc-loan-type-input',
    'acc-loan-rate-unit-input', 'acc-loan-admin-mode-input', 'acc-loan-disburse-input',
    // Catat pembayaran pinjaman (detail akun)
    'loan-pay-mode-input', 'loan-pay-source-input',
    // Form Titipan
    'titipan-person-select', 'titipan-fund-select',
    // PayLater (form transaksi)
    'paylater-method',
    // Langganan berulang
    'sub-type-input', 'sub-category-input', 'sub-account-input', 'goal-account-input',
    // Filter bulan & urutkan (tab Transaksi)
    'txn-month-select', 'sort-select'
  ].forEach(enhanceSelect);

  // ============================================================
  // CUSTOM DATE PICKER: pengganti kalender bawaan browser untuk <input type="date">.
  // Input asli tetap jadi sumber kebenaran (disembunyikan, .value tetap "YYYY-MM-DD"), jadi kode lain yang baca/tulis
  // .value, .min, .max atau memasang data-change-act tidak perlu diubah. Memilih tanggal mengisi .value lalu
  // memicu event 'input' dan 'change'. Setter .value disadap supaya label tombol ikut berubah.
  // ============================================================
  const CDATE_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const CDATE_MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const CDATE_DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  function cdPad(n) { return (n < 10 ? '0' : '') + n; }
  function cdKey(y, m, d) { return y + '-' + cdPad(m + 1) + '-' + cdPad(d); }   // m = 0..11
  // Isi kalender sebuah bulan (minggu mulai Senin): array berisi null (kosong) atau string 'YYYY-MM-DD'.
  function calendarCells(year, month) {
    const first = new Date(Date.UTC(year, month, 1)).getUTCDay();   // 0 = Minggu
    const lead = (first + 6) % 7;
    const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(cdKey(year, month, d));
    while (cells.length % 7) cells.push(null);
    return cells;
  }
  function cdateText(v) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
    return m ? (+m[3]) + ' ' + CDATE_MON_SHORT[+m[2] - 1] + ' ' + m[1] : '';
  }
  function enhanceDate(id, opts) {
    const native = $(id);
    if (!native || native.dataset.cdateDone) return;
    native.dataset.cdateDone = '1';
    const clearable = !!(opts && opts.clearable);

    const wrap = document.createElement('div');
    wrap.className = 'csel cdate';
    native.parentNode.insertBefore(wrap, native);
    wrap.appendChild(native);
    native.classList.add('csel-native');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'csel-trigger cdate-trigger';
    trigger.setAttribute('aria-haspopup', 'dialog');
    if (native.getAttribute('aria-label')) trigger.setAttribute('aria-label', native.getAttribute('aria-label'));
    const label = document.createElement('span');
    label.className = 'csel-label';
    trigger.appendChild(label);
    wrap.appendChild(trigger);

    const panel = document.createElement('div');
    panel.className = 'cdate-panel';
    panel.setAttribute('role', 'dialog');
    document.body.appendChild(panel);

    let viewY = 0, viewM = 0;
    function refreshLabel() {
      const t = cdateText(native.value);
      label.textContent = t || 'Pilih tanggal';
      label.classList.toggle('cdate-empty', !t);
    }
    function closePanel() {
      panel.classList.remove('open');
      wrap.classList.remove('open');
      document.removeEventListener('mousedown', onOutside, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', closePanel);
      document.removeEventListener('scroll', onScroll, true);
    }
    function onOutside(e) { if (!panel.contains(e.target) && !trigger.contains(e.target)) closePanel(); }
    function onKey(e) { if (e.key === 'Escape') closePanel(); }
    function onScroll(e) { if (!panel.contains(e.target)) closePanel(); }
    function pick(v) {
      if (native.value !== v) {
        native.value = v;
        native.dispatchEvent(new Event('input', { bubbles: true }));
        native.dispatchEvent(new Event('change', { bubbles: true }));
      }
      closePanel();
    }
    function render() {
      const min = native.min || '', max = native.max || '', sel = native.value || '', today = todayStr();
      let h = '<div class="cdate-head"><button type="button" class="cdate-nav" data-nav="-1" aria-label="Bulan sebelumnya">‹</button>' +
        '<div class="cdate-title">' + CDATE_MONTHS[viewM] + ' ' + viewY + '</div>' +
        '<button type="button" class="cdate-nav" data-nav="1" aria-label="Bulan berikutnya">›</button></div><div class="cdate-grid">' +
        CDATE_DAYS.map(d => '<div class="cdate-dow">' + d + '</div>').join('');
      calendarCells(viewY, viewM).forEach(c => {
        if (!c) { h += '<div></div>'; return; }
        const off = (min && c < min) || (max && c > max);
        h += '<button type="button" class="cdate-day' + (c === sel ? ' sel' : '') + (c === today ? ' today' : '') + '" data-d="' + c + '"' + (off ? ' disabled' : '') + '>' + (+c.slice(8)) + '</button>';
      });
      h += '</div><div class="cdate-foot">' +
        '<button type="button" class="cdate-link" data-today="1"' + (((min && today < min) || (max && today > max)) ? ' disabled' : '') + '>Hari ini</button>' +
        (clearable && sel ? '<button type="button" class="cdate-link" data-clear="1">Hapus</button>' : '') + '</div>';
      panel.innerHTML = h;
    }
    panel.addEventListener('mousedown', (e) => {
      const b = e.target.closest ? e.target.closest('button') : null;
      if (!b || b.disabled) return;
      e.preventDefault();
      if (b.dataset.nav) { viewM += +b.dataset.nav; if (viewM < 0) { viewM = 11; viewY--; } else if (viewM > 11) { viewM = 0; viewY++; } render(); }
      else if (b.dataset.d) pick(b.dataset.d);
      else if (b.dataset.today) pick(todayStr());
      else if (b.dataset.clear) pick('');
    });
    function openPanel() {
      const m = /^(\d{4})-(\d{2})/.exec(native.value || todayStr());
      viewY = +m[1]; viewM = +m[2] - 1;
      render();
      const rect = trigger.getBoundingClientRect();
      const w = Math.min(300, window.innerWidth - 16);
      panel.style.width = w + 'px';
      panel.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - w - 8)) + 'px';
      panel.style.top = (rect.bottom + 4) + 'px';
      panel.classList.add('open');
      const ph = panel.offsetHeight;
      if (window.innerHeight - rect.bottom < ph + 12 && rect.top > ph + 12) panel.style.top = (rect.top - ph - 4) + 'px';
      wrap.classList.add('open');
      document.addEventListener('mousedown', onOutside, true);
      document.addEventListener('keydown', onKey, true);
      window.addEventListener('resize', closePanel);
      document.addEventListener('scroll', onScroll, true);
    }
    trigger.addEventListener('click', () => { if (panel.classList.contains('open')) closePanel(); else openPanel(); });
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    if (desc && desc.set) {
      Object.defineProperty(native, 'value', {
        configurable: true,
        get() { return desc.get.call(native); },
        set(v) { desc.set.call(native, v); refreshLabel(); }
      });
    }
    refreshLabel();
  }
  ['date-input', 'acc-loan-start-input', 'asset-val-date-input', 'loan-pay-date-input', 'titipan-date-input', 'goal-deadline-input'].forEach(id => enhanceDate(id));
  ['laporan-custom-start', 'laporan-custom-end'].forEach(id => enhanceDate(id, { clearable: true }));

  // ============================================================
  // INPUT NOMINAL: titik pemisah ribuan otomatis saat mengetik (1000000 jadi 1.000.000), koma untuk desimal.
  // Input asli (type="number") tetap menjadi sumber nilai ("1000000" / "1234.5") tapi disembunyikan; kolom teks di
  // sampingnya hanya tampilan. Kode lain tetap baca/tulis .value input asli (setter disadap untuk menyegarkan tampilan),
  // dan event 'input'/'change' diteruskan ke input asli. Aktif untuk elemen ber-atribut data-money
  // ("dec" = boleh desimal, "neg" = boleh minus); elemen yang dibuat belakangan (daftar anggaran, simulasi) ikut
  // lewat MutationObserver.
  // ============================================================
  function moneyGroup(intPart) { return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  // Teks yang diketik -> {display, value}. Titik dianggap pemisah ribuan (diabaikan), koma = desimal.
  function moneyFormat(text, opts) {
    opts = opts || {};
    const str = String(text == null ? '' : text);
    const sign = opts.neg && str.trim().charAt(0) === '-' ? '-' : '';
    let intPart = '', frac = '', comma = false;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charAt(i);
      if (ch >= '0' && ch <= '9') { if (comma) frac += ch; else intPart += ch; }
      else if (ch === ',' && opts.dec && !comma) comma = true;
    }
    intPart = intPart.replace(/^0+(?=\d)/, '');
    frac = frac.slice(0, opts.maxFrac || 4);
    const shownInt = intPart || (comma ? '0' : '');
    const display = sign + moneyGroup(shownInt) + (comma ? ',' + frac : '');
    const value = (intPart || frac) ? sign + (intPart || '0') + (frac ? '.' + frac : '') : '';
    return { display, value };
  }
  // Nilai input asli ("1234.5") -> teks tampilan ("1.234,5").
  function moneyFromValue(v) {
    const t = String(v == null ? '' : v);
    return moneyFormat(t.replace('.', ','), { dec: true, neg: true, maxFrac: 6 }).display;
  }
  function enhanceMoney(native) {
    if (!native || native.dataset.moneyDone) return;
    native.dataset.moneyDone = '1';
    const flags = (native.getAttribute('data-money') || '').split(/\s+/);
    const opts = { dec: flags.indexOf('dec') >= 0, neg: flags.indexOf('neg') >= 0 };

    const text = document.createElement('input');
    text.type = 'text';
    text.className = native.className + ' cmoney';
    text.setAttribute('autocomplete', 'off');
    ['placeholder', 'inputmode', 'aria-label', 'enterkeyhint', 'style', 'data-keydown-act'].forEach(a => {
      if (native.hasAttribute(a)) text.setAttribute(a, native.getAttribute(a));
    });
    if (native.disabled) text.disabled = true;
    // Pembungkus + tombol kalkulator yang selalu tampak di dalam kolom (v1.1.122)
    const wrap = document.createElement('span');
    wrap.className = 'cmoney-wrap';
    native.parentNode.insertBefore(wrap, native);
    wrap.appendChild(text);
    const calcBtn = document.createElement('button');
    calcBtn.type = 'button';
    calcBtn.className = 'cmoney-calc no-print';
    calcBtn.setAttribute('aria-label', 'Buka kalkulator');
    calcBtn.title = 'Kalkulator';
    calcBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/></svg>';
    calcBtn.addEventListener('click', () => { if (typeof calcOpenFor === 'function') calcOpenFor(text); });
    wrap.appendChild(calcBtn);
    native.classList.add('cmoney-native');
    native.setAttribute('tabindex', '-1');

    const valDesc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    function fire(type) { native.dispatchEvent(new Event(type, { bubbles: true })); }
    function setNative(v) { valDesc.set.call(native, v); }
    function sig(str) { return (str.match(/[0-9,]/g) || []).length; }

    // Rumus (mis. 25000+15000*2): nilai kolom asli mengikuti hasil sementara; tampilan dibiarkan sampai blur/Enter (06c-kalkulator.js)
    const isExpr = () => typeof calcLooksLikeExpr === 'function' && calcLooksLikeExpr(text.value);
    function commitExpr() {
      const v = calcResultFor(text.value, opts);
      if (v === null) { text.classList.add('cmoney-bad'); text.setAttribute('aria-invalid', 'true'); return false; }
      text.classList.remove('cmoney-bad'); text.removeAttribute('aria-invalid');
      setNative(String(v)); text.value = moneyFromValue(String(v)); fire('input'); fire('change');
      return true;
    }
    text._cm = { native, opts, commit(v) { setNative(String(v)); text.value = moneyFromValue(String(v)); text.classList.remove('cmoney-bad'); text.removeAttribute('aria-invalid'); fire('input'); fire('change'); } };
    text.addEventListener('keydown', (e) => { if (e.key === 'Enter' && isExpr()) commitExpr(); });
    text.addEventListener('input', () => {
      if (isExpr()) {
        const v = calcResultFor(text.value, opts);
        setNative(v === null ? '' : String(v)); text.classList.remove('cmoney-bad'); text.removeAttribute('aria-invalid');
        fire('input'); return;
      }
      const caret = text.selectionStart == null ? text.value.length : text.selectionStart;
      const before = sig(text.value.slice(0, caret));
      const r = moneyFormat(text.value, opts);
      if (text.value !== r.display) {
        text.value = r.display;
        let n = 0, pos = 0;
        while (pos < r.display.length && n < before) { if (/[0-9,]/.test(r.display.charAt(pos))) n++; pos++; }
        try { text.setSelectionRange(pos, pos); } catch (e) { /* abaikan */ }
      }
      setNative(r.value);
      fire('input');
    });
    text.addEventListener('change', () => fire('change'));
    text.addEventListener('blur', () => {
      if (isExpr()) { commitExpr(); return; }
      text.classList.remove('cmoney-bad'); text.removeAttribute('aria-invalid');
      const r = moneyFormat(text.value, opts);
      const clean = r.display.replace(/,$/, '');
      if (text.value !== clean) text.value = clean;
    });

    Object.defineProperty(native, 'value', {
      configurable: true,
      get() { return valDesc.get.call(native); },
      set(v) { valDesc.set.call(native, v); text.value = moneyFromValue(valDesc.get.call(native)); }
    });
    ['placeholder', 'disabled', 'readOnly'].forEach(p => {
      const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, p);
      if (!d || !d.set) return;
      Object.defineProperty(native, p, { configurable: true, get() { return d.get.call(native); }, set(v) { d.set.call(native, v); text[p] = v; } });
    });
    native.focus = () => text.focus();
    native.select = () => text.select();
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(() => { wrap.style.display = native.style.display; wrap.hidden = native.hidden; }).observe(native, { attributes: true, attributeFilter: ['style', 'hidden'] });
    }
    text.value = moneyFromValue(native.value);
  }
  // Roda mouse/trackpad tidak boleh mengubah nilai input angka yang sedang fokus (perilaku bawaan browser yang sering tak sengaja).
  document.addEventListener('wheel', (e) => {
    const t = e.target;
    if (t && t.tagName === 'INPUT' && t.type === 'number' && document.activeElement === t) t.blur();
  }, { passive: true });
  function enhanceMoneyAll(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('input[data-money]').forEach(enhanceMoney);
  }
  try {
    if (typeof document !== 'undefined' && document.body && typeof MutationObserver !== 'undefined') {
      enhanceMoneyAll(document);
      new MutationObserver(muts => {
        muts.forEach(m => m.addedNodes.forEach(n => {
          if (n.nodeType !== 1) return;
          if (n.matches && n.matches('input[data-money]')) enhanceMoney(n); else enhanceMoneyAll(n);
        }));
      }).observe(document.body, { childList: true, subtree: true });
    }
  } catch (e) { /* lingkungan tanpa DOM penuh (uji) */ }



  // ============================================================
  // EVENT DELEGATION: satu listener per jenis event di document, menggantikan
  // handler inline (onclick/oninput/onchange/onkeydown).
  //   data-act="namaFungsi"                  -> klik   (argumen: data-a0, data-a1 ... = teks; data-n0 ... = angka)
  //   data-input-act / data-change-act / data-keydown-act -> event input / change / keydown
  //     (argumen: data-input-a0, data-change-n0, data-keydown-a0, dst.)
  //   data-stop="1"                          -> setelah handler elemen ini jalan, jangan lanjut ke elemen di atasnya
  //   data-<event>-with-event="1"            -> event asli ikut jadi argumen terakhir (mis. input file)
  //   data-keydown-keys="Enter| "            -> keydown hanya jalan untuk tombol ini (dipisah |), dan preventDefault
  //   data-keydown-stop="1"                  -> elemen ini menahan keydown supaya tidak sampai ke handler di atasnya
  //   data-backdrop="namaFungsi"             -> dipanggil hanya kalau klik tepat di elemen itu sendiri (latar modal)
  // Fungsi dicari di scope global (semua fungsi handler adalah `function` global); `this` = elemen pemilik atribut.
  // Elemen bersarang: handler dipanggil dari yang terdalam ke luar, sama seperti bubbling inline.
  // ============================================================
  function dispatchDelegated(ev, e) {
    const actAttr = ev === 'click' ? 'data-act' : 'data-' + ev + '-act';
    const base = ev === 'click' ? 'data-' : 'data-' + ev + '-';
    const sel = ev === 'keydown' ? '[data-keydown-act],[data-keydown-stop]' : '[' + actAttr + ']';
    if (ev === 'click' && e.target instanceof Element && e.target.hasAttribute('data-backdrop')) {
      const bfn = window[e.target.getAttribute('data-backdrop')];
      if (typeof bfn === 'function') bfn.call(e.target);
    }
    for (let el = e.target instanceof Element ? e.target.closest(sel) : null; el; el = el.parentElement && el.parentElement.closest(sel)) {
      if (!el.hasAttribute(actAttr)) break; // data-keydown-stop: berhenti di sini
      if (ev === 'keydown' && el.hasAttribute('data-keydown-keys')) {
        if (el.getAttribute('data-keydown-keys').split('|').indexOf(e.key) < 0) continue;
        e.preventDefault();
      }
      const fn = window[el.getAttribute(actAttr)];
      if (typeof fn !== 'function') { console.warn('handler tidak ditemukan:', el.getAttribute(actAttr)); continue; }
      const args = [];
      for (let i = 0; ; i++) {
        if (el.hasAttribute(base + 'a' + i)) args.push(el.getAttribute(base + 'a' + i));
        else if (el.hasAttribute(base + 'n' + i)) args.push(Number(el.getAttribute(base + 'n' + i)));
        else break;
      }
      if (el.hasAttribute(base + 'with-event')) args.push(e);
      fn.apply(el, args);
      if (ev === 'click' && el.hasAttribute('data-stop')) break;
    }
  }
  ['click', 'input', 'change', 'keydown'].forEach(ev => document.addEventListener(ev, e => dispatchDelegated(ev, e)));

  // Pembungkus untuk handler yang dulu berupa beberapa perintah / butuh state atau `this`
  function quickAddTitipanFromDetail() { quickAddTitipanFor(state.detailTitipanId); }
  function lunasiTitipanFromDetail() { lunasiTitipan(state.detailTitipanId); }
  function clickById(id) { $(id).click(); }
  function onTransferTargetChange() { updateQuickPayButtons(); updateAssetHint(); }
  function onAmountInput() { state.pendingTransferLabel = null; updatePaylaterPreview(); }
  function payMonthAndClose(accId, groupIdx) { closePaylaterMonthDetail(); payMonthFromDetail(accId, groupIdx); }
  function openAccountFromTagihanBulan(accId) { closeTagihanBulanDetail(); openAccountDetail(accId); }
  function toggleRingkasanCardFromEl(id) { toggleRingkasanCard(id, this.checked); } // this = <input> (fn.apply(el, ...))
