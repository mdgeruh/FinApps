  // ============================================================
  // NAVIGASI, HEADER SALDO & AKSI CEPAT
  // ============================================================
  function updateQuickPayButtons(data) {
    const row = $('quick-pay-row');
    if (!row) return;
    state.pendingTransferLabel = null;
    if (state.currentType !== 'transfer') { row.style.display = 'none'; row.innerHTML = ''; return; }

    if (!data) data = loadData();
    const toSel = $('to-account-select');
    const toAcc = data.accounts.find(a => a.id === toSel.value);
    if (!toAcc || !TYPE_DEBT[toAcc.type]) { row.style.display = 'none'; row.innerHTML = ''; return; }

    const bal = accountBalance(data, toAcc.id);
    const used = bal < 0 ? Math.abs(bal) : 0;
    if (used <= 0) { row.style.display = 'none'; row.innerHTML = ''; return; }

    let buttons = '';
    if (toAcc.type === 'kartu_kredit') {
      const ci = cardStatementInfo(data, toAcc, todayStr());
      if (ci && ci.remaining > 0) {
        const remaining = Math.min(used, ci.remaining);
        const minPay = Math.min(remaining, ci.minRemaining);
        if (minPay > 0) buttons += `<button type="button" class="io-btn" style="flex:1;" data-act="fillTransferAmount" data-n0="${minPay}" data-a1="Bayar KK - Minimal">Minimal — ${formatRp(minPay)}</button>`;
        if (remaining < used) buttons += `<button type="button" class="io-btn" style="flex:1;" data-act="fillTransferAmount" data-n0="${remaining}" data-a1="Bayar KK - Tagihan cetak">Tagihan cetak — ${formatRp(remaining)}</button>`;
      } else if (!ci) {
        const minPay = cardMinPayOf(toAcc, used);
        buttons += `<button type="button" class="io-btn" style="flex:1;" data-act="fillTransferAmount" data-n0="${minPay}" data-a1="Bayar KK - Minimal">Minimal — ${formatRp(minPay)}</button>`;
      }
    }
    buttons += `<button type="button" class="io-btn" style="flex:1;" data-act="fillTransferAmount" data-n0="${used}" data-a1="Bayar ${TYPE_LABELS[toAcc.type] || toAcc.type} - Penuh">Bayar penuh — ${formatRp(used)}</button>`;
    row.innerHTML = buttons;
    row.style.display = 'flex';
  }

  function fillTransferAmount(amount, label) {
    $('amount-input').value = amount;
    state.pendingTransferLabel = label || null;
    const catSel = $('category-select');
    if (catSel && [...catSel.options].some(o => o.value === 'Bayar tagihan/utang')) {
      catSel.value = 'Bayar tagihan/utang';
      onCategoryChange();
    }
  }

  const TAB_TITLES = {
    ringkasan: 'Keuangan pribadi',
    transaksi: 'Transaksi',
    titipan: 'Titipan & piutang',
    laporan: 'Laporan',
    akun: 'Akun',
    tagihan: 'Tagihan',
    profil: 'Profil'
  };

  // Optimasi: chart/list tiap tab lumayan berat buat digambar ulang (chart SVG + ukur teks dsb),
  // jadi daripada gambar ulang KE-6 tab tiap kali ada perubahan data (padahal cuma satu yang
  // kelihatan), tab yang lagi tidak aktif cukup ditandai "dirty" - baru benar-benar digambar
  // saat tab itu dibuka (lihat renderTabContent() & pemanggilannya di setTab()/render()).
  const TAB_NAMES = ['ringkasan', 'akun', 'transaksi', 'titipan', 'tagihan', 'laporan', 'profil'];
  const dirtyTabs = new Set(TAB_NAMES);

  function currentTabName() {
    const panel = document.querySelector('.tab-panel.active');
    return (panel && panel.id.replace('tab-', '')) || 'ringkasan';
  }

  // Gambar ulang isi (chart/list) khusus satu tab. data & balances dioper dari pemanggil
  // supaya tidak dihitung ulang kalau sudah tersedia (lihat render()).
  function renderTabContent(name, data, balances) {
    dirtyTabs.delete(name);
    if (!data) data = loadData();
    if (!balances) balances = computeAllBalances(data);
    switch (name) {
      case 'ringkasan':
        // Visibilitas dihitung SEBELUM render: kartu yang disembunyikan/kosong dilewati (v1.1.069, R5),
        // dan dari kartu grafik hanya segmen aktif yang digambar (R2).
        { const vis = computeRingkasanVisibility(data);
          applyRingkasanOrder();
          renderBackupReminder(data);
          renderAttentionStrip(data, balances);
          renderAccountsSummary(data, balances);
          if (!vis.off('account-values-card')) renderAccountValues(data, balances);
          if (!vis.off('recent-txn-card')) renderRecentTxns(data);
          if (!vis.off('month-insight-card')) renderMonthInsights(data);
          if (!vis.off('budget-card')) renderBudgetCard(data);
          if (!vis.off('sub-card')) renderSubscriptionCard(data);
          if (!vis.off('emergency-card')) renderEmergencyCard(data, balances);
          if (!vis.off('goal-card')) renderGoalCard(data, balances);
          if (!vis.off('plan-cta-card')) renderPlanCta(data);
          const curSeg = applyChartSegments(data, vis);
          applyRingkasanVisibility(data, vis);
          if (curSeg) renderChartSegment(curSeg, data);
          if (!vis.off('category-chart-card')) renderCategoryChart(data);
          if (!vis.off('tag-chart-card')) renderTagChart(data); }
        break;
      case 'akun':
        renderAccounts(data, balances);
        break;
      case 'transaksi':
        renderTxnMonthRow(data);
        renderFilters(data);
        renderTypeFilters();
        renderTagFilters(data);
        renderTxnListSection(data);
        break;
      case 'titipan':
        renderTitipanList(data, balances);
        renderTitipanSummary(data, balances);
        renderTitipanFilters();
        break;
      case 'tagihan':
        renderDueReminders(data, balances);
        renderTagihanCalendar(data, balances);
        break;
      case 'laporan':
        renderLaporan(data, balances);
        break;
      case 'profil':
        renderProfilTab();
        renderRingkasanConfig();
        break;
    }
  }

  // ---------- Tab Profil (icon user di header): nama pemilik untuk sapaan di Ringkasan ----------
  function renderProfilTab() {
    const el = $('profil-name-input');
    if (el) el.value = getOwnerName();
    const ver = $('profil-version');
    if (ver) ver.textContent = APP_VERSION + ' · ' + APP_BUILD;

    const active = !!(typeof sync !== 'undefined' && sync.ready);
    const noneEl = $('profil-sync-none');
    const sectionEl = $('profil-sync-section');
    if (noneEl) noneEl.style.display = active ? 'none' : 'block';
    if (sectionEl) sectionEl.style.display = active ? 'block' : 'none';
    if (active) {
      const emailEl = $('profil-current-email');
      if (emailEl) emailEl.textContent = sync.email || '-';
      const emailInput = $('profil-email-input');
      if (emailInput) emailInput.value = '';
      const passInput = $('profil-pass-input');
      if (passInput) passInput.value = '';
    }
  }

  function updateGreeting() {
    const h = nowGmt8().getUTCHours();   // jam GMT+8, konsisten dengan semua tanggal lain di app
    const sapa = h >= 4 && h < 11 ? 'Selamat pagi' : (h >= 11 && h < 15 ? 'Selamat siang' : (h >= 15 && h < 18 ? 'Selamat sore' : 'Selamat malam'));
    const g = $('greeting');
    if (g) g.textContent = sapa;
  }

  // Nama pemilik cuma dipakai sebagai awalan nama file export/backup (lihat exportUserPrefix()).
  // Tersimpan lokal di browser ini, tidak dikirim ke akun sinkron dan tidak ada di sapaan.
  function saveOwnerNameFromInput() {
    const el = $('profil-name-input');
    const v = setOwnerName(el ? el.value : '');
    if (el) el.value = v;
    showIoMsg('Nama tersimpan.', 'ok', 'profil-msg');
  }

  function setTab(name) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + name));
    const balanceBlock = $('balance-block');
    if (balanceBlock) balanceBlock.classList.toggle('tab-hidden', name !== 'ringkasan');
    const titleEl = $('page-title');
    if (titleEl) titleEl.textContent = TAB_TITLES[name] || TAB_TITLES.ringkasan;
    updateNavFab(name);

    // Tab ini belum digambar ulang sejak data terakhir berubah -> gambar sekarang,
    // pas dibuka (bukan tiap kali render() dipanggil dari tab lain).
    if (dirtyTabs.has(name)) renderTabContent(name);
    routeOnTabChange(name);   // 02b-rute.js: alamat mengikuti tab
  }

  const THEME_KEY = 'kp_theme';
  const THEME_LABELS = { system: 'Tampilan: Sistem', light: 'Tampilan: Terang', dark: 'Tampilan: Gelap' };

  function applyTheme(mode) {
    if (mode === 'light' || mode === 'dark') {
      document.documentElement.setAttribute('data-theme', mode);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    // Tombol di header (sebelah ikon Profil): ikon mengikuti mode lewat data-mode (lihat CSS .theme-btn)
    const btn = $('theme-toggle-btn');
    if (btn) {
      const m = THEME_LABELS[mode] ? mode : 'system';
      btn.dataset.mode = m;
      btn.setAttribute('aria-label', THEME_LABELS[m]);
      btn.title = THEME_LABELS[m];
    }
  }

  function cycleTheme() {
    const order = ['system', 'light', 'dark'];
    let current = 'system';
    try { current = localStorage.getItem(THEME_KEY) || 'system'; } catch (e) {}
    const next = order[(order.indexOf(current) + 1) % order.length];
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    applyTheme(next);
  }

  // Menu samping desktop bisa diciutkan jadi deretan ikon; pilihan diingat per perangkat.
  const SIDEBAR_KEY = 'kp_sidebar';
  function applySidebar(collapsed) {
    document.documentElement.classList.toggle('sb-collapsed', collapsed);
    const b = $('sb-toggle');
    if (b) { const t = collapsed ? 'Buka menu samping' : 'Ciutkan menu samping'; b.setAttribute('aria-label', t); b.setAttribute('aria-expanded', String(!collapsed)); }
  }
  function toggleSidebar() {
    const next = !document.documentElement.classList.contains('sb-collapsed');
    applySidebar(next);
    try { localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0'); } catch (e) {}
    deskRelayout(260);   // tunggu animasi lebar sidebar selesai
  }
  (function initSidebar() {
    let c = false;
    try { c = localStorage.getItem(SIDEBAR_KEY) === '1'; } catch (e) {}
    applySidebar(c);
  })();

  (function initTheme() {
    let saved = 'system';
    try { saved = localStorage.getItem(THEME_KEY) || 'system'; } catch (e) {}
    applyTheme(saved);
  })();

  // Tombol + di navigasi mengikuti tab aktif: Akun -> tambah akun, Titipan -> catat titipan,
  // tab lain -> tambah transaksi.
  const NAV_FAB_LABELS = { akun: 'Tambah akun', titipan: 'Catat titipan' };
  function goToAdd() {
    const tab = currentTabName();
    if (tab === 'akun') openAccForm('add');
    else if (tab === 'titipan') openTitipanForm();
    else openAddTxnForm();
  }
  function updateNavFab(name) {
    const fab = $('nav-fab');
    if (!fab) return;
    const label = NAV_FAB_LABELS[name] || 'Tambah transaksi';
    fab.setAttribute('aria-label', label);
    fab.setAttribute('title', label);
  }

  const EYE_OPEN_SVG = '<circle cx="12" cy="12" r="3"/><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/>';
  const EYE_CLOSED_SVG = '<path d="M3 3l18 18"/><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-2.16 3.02M6.6 6.6C4.1 8.2 2 12 2 12s3.5 7 10 7a9.2 9.2 0 0 0 4.02-.91"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/>';

  function toggleBalanceVisibility() {
    state.balanceHidden = !state.balanceHidden;
    $('balance-eye-icon').innerHTML = state.balanceHidden ? EYE_CLOSED_SVG : EYE_OPEN_SVG;
    const deskEye = $('desk-eye-icon'); if (deskEye) deskEye.innerHTML = state.balanceHidden ? EYE_CLOSED_SVG : EYE_OPEN_SVG;
    const data = loadData();
    renderBalanceHeader(data);
    if (activeChartSegmentId() === 'kekayaan') renderNetWorthChart(data);
    if (typeof renderAccounts === 'function' && $('akun-total-aset')) { const bal = computeAllBalances(data); renderAccountsSummary(data, bal); renderAccounts(data, bal); }
  }

  // Dasbor desktop = layar >=1280 px. Di bawah itu kartu angka/panel Akun disembunyikan CSS dan tidak dihitung.
  function isDeskWide() { try { return !!(window.matchMedia && window.matchMedia('(min-width: 1280px)').matches); } catch (e) { return false; } }

  // Garis mini (tanpa sumbu) untuk kartu angka desktop; lebar penuh kartu, tinggi 30 px.
  function sparkSvg(points, color) {
    if (!points || points.length < 2) return '';
    const mn = Math.min(...points), mx = Math.max(...points), rg = (mx - mn) || 1;
    const xs = points.map((_, i) => 2 + i * (96 / (points.length - 1)));
    const ys = points.map(v => 27 - ((v - mn) / rg) * 24);
    return `<svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><path d="${smoothPathD(xs, ys)}" style="fill:none; stroke:${color}" stroke-width="1.8" stroke-linecap="round" vector-effect="non-scaling-stroke"></path></svg>`;
  }

  // D4: ikon kecil per jenis akun untuk panel Akun desktop (isi <svg viewBox="0 0 24 24">, garis saja; warna mengikuti teks).
  const DESK_TYPE_ICONS = {
    kas: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 14.5h2"/>',
    bank: '<path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
    ewallet: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    aset: '<path d="M4 19V9l8-5 8 5v10zM9 19v-5h6v5"/>',
    kartu_kredit: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
    paylater: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pinjaman: '<path d="M4 10l8-5 8 5M6 10v7M12 10v7M18 10v7M3 20h18"/><path d="M12 12.5v2"/>',
    pinjaman_online: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>'
  };
  function deskTypeIcon(type) {
    return '<svg viewBox="0 0 24 24" focusable="false">' + (DESK_TYPE_ICONS[type] || DESK_TYPE_ICONS.kas) + '</svg>';
  }

  // Dasbor desktop: tiga kartu angka (dengan perubahan 30 hari dan garis mini) + panel Akun di kanan.
  function renderDeskDash(data, balances, totalBalance, ad) {
    if (!isDeskWide()) return;
    const hid = state.balanceHidden, fmt = v => hid ? '•••••••' : formatRp(v);
    [['ds-net', totalBalance], ['ds-aset', ad.aset], ['ds-utang', ad.utang]].forEach(([id, v]) => { const el = $(id); if (el) el.textContent = fmt(v); });
    // Perubahan 30 hari: aset = kekayaan bersih + utang (utang = jumlah saldo negatif akun utang).
    const nw = netWorthSeries(data, 31), debt = computeDebtAtDates(data, nw.days);
    const aset = nw.points.map((v, i) => v + debt[i]);
    [['ds-net', nw.points, false, 'var(--teal)'], ['ds-aset', aset, false, 'var(--green)'], ['ds-utang', debt, true, 'var(--red)']].forEach(([id, pts, inverse, color]) => {
      const d = $(id + '-d'), sp = $(id + '-s');
      if (sp) sp.innerHTML = sparkSvg(pts, color);
      if (!d) return;
      const first = pts[0], last = pts[pts.length - 1], delta = last - first;
      const pct = first !== 0 ? (delta / Math.abs(first)) * 100 : (delta !== 0 ? 100 : 0);
      const good = inverse ? delta < 0 : delta > 0, bad = inverse ? delta > 0 : delta < 0;
      d.style.color = good ? 'var(--green-ink)' : (bad ? 'var(--red-ink)' : 'var(--ink-soft)');
      d.textContent = hid ? '' : (delta === 0 ? 'Tetap · 30 hari' : `${trendArrow(delta)}${delta > 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}% · 30 hari`);
    });
    const list = $('desk-accounts-list'); if (!list) return;
    const groups = deskAccountGroups(data, balances, 8);
    list.innerHTML = groups.length ? groups.map(g => {
      const head = `<div class="da-group"><span>${g.label}</span><span class="da-group-total${g.key === 'utang' ? ' neg' : ''}">${fmt(g.total)}</span></div>`;
      const rows = g.rows.map(r => {
        const bal = r.bal;
        const pct = r.usage ? Math.min(100, Math.max(0, r.usage.pct)) : 0;
        const lvl = r.usage ? (r.usage.pct >= 90 ? 'hi' : (r.usage.pct >= 70 ? 'mid' : 'lo')) : '';
        const bar = r.usage && !hid ? `<span class="da-bar" role="img" aria-label="Limit terpakai ${r.usage.pct}%"><span class="da-bar-fill ${lvl}" style="width:${pct}%"></span></span><span class="da-use ${lvl}">${r.usage.pct >= 90 ? '▲ ' : ''}${r.usage.pct}% dari ${formatRp(r.usage.limit)}</span>` : '';
        return `<div class="da-row${r.usage ? ' has-bar' : ''}" role="button" tabindex="0" data-act="openAccountDetail" data-a0="${escapeHtml(r.id)}" data-keydown-act="openAccountDetail" data-keydown-a0="${escapeHtml(r.id)}" data-keydown-keys="Enter| "><span class="da-ico" aria-hidden="true">${deskTypeIcon(r.type)}</span><span class="da-name">${escapeHtml(r.name)}</span><span class="da-type">${escapeHtml(TYPE_LABELS[r.type] || '')}</span><span class="da-bal${bal < 0 ? ' neg' : ''}">${fmt(bal)}</span>${bar}</div>`;
      }).join('');
      const more = g.lebih ? `<button type="button" class="da-more" data-act="setTab" data-a0="akun">+${g.lebih} akun lagi ›</button>` : '';
      return head + rows + more;
    }).join('') : '<div class="acc-sub">Belum ada akun.</div>';
  }

  // Lebar kolom isi berubah (jendela diubah atau sidebar dibuka/ciutkan): gambar ulang supaya grafik pas lebar kartu.
  let deskResizeTimer = null;
  function deskRelayout(delay) {
    clearTimeout(deskResizeTimer);
    deskResizeTimer = setTimeout(() => { if (isDeskWide() && typeof render === 'function') render(); }, delay || 220);
  }
  try { window.addEventListener('resize', () => deskRelayout(250)); } catch (e) { /* uji */ }

  // Kotak cari di bar atas desktop: lompat ke tab Transaksi dengan kata kunci terisi.
  function deskSearchSubmit() {
    const el = $('desk-search-input'); if (!el) return;
    const q = el.value.trim(); el.value = '';
    setTab('transaksi');
    const t = $('txn-search-input');
    if (t) { t.value = q; onTxnSearchInput(); }
  }

  // D7: pintasan keyboard di layar lebar (>=1280 px). "/" = fokus kotak cari, "N" = catat transaksi, "[" = buka/ciutkan menu samping.
  // Murni (bisa diuji): ctx = { wide, typing (sedang mengetik di kolom isian), mod (Ctrl/Alt/Meta), overlay (dialog/lembar terbuka) }.
  function deskShortcutAction(key, ctx) {
    if (!ctx || !ctx.wide || ctx.typing || ctx.mod || ctx.overlay) return '';
    if (key === '/') return 'cari';
    if (key === 'n' || key === 'N') return 'catat';
    if (key === '[') return 'sidebar';
    return '';
  }
  function onDeskShortcut(e) {
    if (e.defaultPrevented) return;
    const t = e.target, tag = t && t.tagName ? String(t.tagName).toLowerCase() : '';
    const ctx = {
      wide: isDeskWide(),
      typing: tag === 'input' || tag === 'textarea' || tag === 'select' || !!(t && t.isContentEditable),
      mod: !!(e.ctrlKey || e.altKey || e.metaKey),
      overlay: !!document.querySelector('.sheet-overlay.open, .modal-overlay.open, .lock-screen.open, .calc-panel.open, .sync-overlay.open')
    };
    const act = deskShortcutAction(e.key, ctx);
    if (!act) return;
    e.preventDefault();
    if (act === 'cari') { const el = $('desk-search-input'); if (el) el.focus(); }
    else if (act === 'catat') { if (typeof openAddTxnForm === 'function') openAddTxnForm(); }
    else if (act === 'sidebar') toggleSidebar();
  }
  try { document.addEventListener('keydown', onDeskShortcut); } catch (e) { /* uji */ }

  function renderBalanceHeader(data, balances) {
    if (!balances) balances = computeAllBalances(data);
    const now = todayGmt8();
    const totalBalance = data.accounts.reduce((s, a) => s + balances[a.id], 0);
    const ad = computeAssetDebt(data, balances);

    $('balance-amount').textContent = state.balanceHidden ? '•••••••' : formatRp(totalBalance);
    $('total-in').textContent = state.balanceHidden ? '•••••••' : formatRp(ad.aset);
    $('total-out').textContent = state.balanceHidden ? '•••••••' : formatRp(ad.utang);
    renderDeskDash(data, balances, totalBalance, ad);
    $('balance-scope').textContent = 'Saldo semua akun (aset − utang) saat ini';
    // Bunga kontrak pinjaman flat yang belum jatuh tempo tidak ada di saldo akun (saldo = sisa pokok);
    // ditampilkan sebagai catatan supaya kekayaan bersih tidak terkesan lebih tinggi dari kenyataan.
    let sisaBungaTotal = 0;
    data.accounts.forEach(a => { if (TYPE_LOAN[a.type]) sisaBungaTotal += computeLoanRemaining(data, a, balances[a.id]).sisaBunga; });
    const noteEl = $('balance-note');
    if (noteEl) {
      noteEl.style.display = sisaBungaTotal > 0 ? 'block' : 'none';
      noteEl.textContent = sisaBungaTotal > 0 ? (state.balanceHidden ? 'Belum termasuk sisa bunga kontrak pinjaman' : 'Belum termasuk sisa bunga kontrak pinjaman ' + formatRp(sisaBungaTotal)) : '';
    }
  }


