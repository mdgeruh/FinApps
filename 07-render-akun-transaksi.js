  // ============================================================
  // RENDER: RINGKASAN AKUN & DAFTAR/FILTER TRANSAKSI
  // ============================================================
  // Pengingat jatuh tempo di Ringkasan: bisa toggle horizon (7/30/90/365 hari) + yang sudah lewat.
  let dueReminderPeriodDays = 7;
  function setDueReminderPeriod(days) {
    dueReminderPeriodDays = days;
    const data = loadData();
    renderDueReminders(data, computeAllBalances(data));
  }
  function renderDueReminders(data, balances) {
    const card = $('due-reminder-card');
    if (!card) return;
    const allSoon = computeUpcomingDues(data, balances, 365);
    const items = computeUpcomingDues(data, balances, dueReminderPeriodDays);
    if (!allSoon.length && !items.length) { card.style.display = 'none'; card.innerHTML = ''; return; }
    card.style.display = 'block';
    const periodBtns = [7, 30, 90, 365].map(d => {
      const lbl = d === 7 ? '7H' : (d === 30 ? '30H' : (d === 90 ? '90H' : '1Th'));
      return `<button type="button" class="type-btn${d === dueReminderPeriodDays ? ' active' : ''}" style="padding:6px 0; font-size:11px;" data-act="setDueReminderPeriod" data-n0="${d}">${lbl}</button>`;
    }).join('');
    const dueTotal = items.reduce((s, it) => s + it.amount, 0);
    const header = `<div class="section-title-row" style="margin-bottom:6px;"><div class="section-title">Jatuh tempo</div>${items.length ? `<span class="txn-amount keluar" style="font-size:14px;">${formatRp(dueTotal)}</span>` : ''}</div>
      <div class="type-toggle" style="display:grid; grid-template-columns:repeat(4, 1fr); gap:6px; margin-bottom:10px;">${periodBtns}</div>`;
    if (!items.length) {
      card.innerHTML = header + '<div class="empty" style="padding:14px;">Tidak ada tagihan jatuh tempo dalam ' + (dueReminderPeriodDays === 365 ? '1 tahun' : dueReminderPeriodDays + ' hari') + ' ke depan.</div>';
      return;
    }
    card.innerHTML = header + items.map(it => {
      const late = it.days < 0;
      const when = late ? 'Lewat ' + (-it.days) + ' hari' : (it.days === 0 ? 'Hari ini' : (it.days === 1 ? 'Besok' : it.days + ' hari lagi'));
      const color = late ? 'var(--red)' : (it.days <= 3 ? 'var(--amber)' : 'var(--ink-soft)');
      return `
        <div class="txn-row clickable" data-act="openAccountDetail" data-a0="${escapeHtml(it.id)}">
          <div class="txn-left">
            <span class="dot keluar"></span>
            <div class="txn-text">
              <div class="txn-desc">${escapeHtml(it.name)} · ${escapeHtml(it.label)}</div>
              <div class="txn-meta" style="color:${color}; font-weight:600;">${when} · ${escapeHtml(fmtTgl(it.due))}</div>
            </div>
          </div>
          <div class="txn-right"><span class="txn-amount keluar">${formatRp(it.amount)}</span>${it.payKind ? `<button type="button" class="io-btn" style="padding:6px 12px; font-size:12px;" data-act="payDueFromRingkasan" data-a0="${escapeHtml(it.id)}" data-stop="1">Bayar</button>` : ''}</div>
        </div>`;
    }).join('') + (() => {
      const liquid = computeLiquidFunds(data, balances || computeAllBalances(data));
      const gap = liquid - dueTotal;
      const per = dueReminderPeriodDays === 365 ? '1 tahun' : dueReminderPeriodDays + ' hari';
      return `<div class="acc-sub" style="margin-top:10px; padding-top:10px; border-top:1px solid var(--line);">Uang tersedia (kas, bank, e-wallet) ${formatRp(liquid)} · jatuh tempo ${per} ${formatRp(dueTotal)}<br><strong style="color:${gap >= 0 ? 'var(--green)' : 'var(--red)'};">${gap >= 0 ? 'Cukup, sisa ' + formatRp(gap) : 'Kurang ' + formatRp(-gap)}</strong></div>`;
    })();
  }

  // ---------- Tab Tagihan: kalender bulanan gabungan (semua akun berutang) ----------
  function renderTagihanCalendar(data, balances) {
    const wrap = $('tagihan-calendar-list');
    if (!wrap) return;
    const months = computeBillCalendar(data, balances, 12);
    if (!months.length) { wrap.innerHTML = '<div class="empty" style="padding:14px;">Tidak ada tagihan yang perlu dibayar ke depan.</div>'; return; }
    wrap.innerHTML = months.map((mo, idx) => {
      const accCount = new Set(mo.items.map(it => it.accId)).size;
      return `
        <div class="txn-row clickable" data-act="openTagihanBulanDetail" data-n0="${idx}">
          <div class="txn-left"><div class="txn-text">
            <div class="txn-desc">${escapeHtml(fmtBulanTahun(mo.items[0].due))}</div>
            <div class="txn-meta">${accCount} akun · ${mo.items.length} item</div>
          </div></div>
          <div class="txn-right"><span class="txn-amount keluar">${formatRp(mo.total)}</span></div>
        </div>`;
    }).join('');
  }

  function openTagihanBulanDetail(idx) {
    const data = loadData();
    const balances = computeAllBalances(data);
    const months = computeBillCalendar(data, balances, 12);
    const mo = months[idx];
    if (!mo) return;
    $('tagihan-bulan-detail-title').textContent = fmtBulanTahun(mo.items[0].due);
    $('tagihan-bulan-detail-total').textContent = formatRp(mo.total);
    const accCount = new Set(mo.items.map(it => it.accId)).size;
    $('tagihan-bulan-detail-meta').textContent = accCount + ' akun · ' + mo.items.length + ' item';
    $('tagihan-bulan-detail-items').innerHTML = mo.items.map(it => `
      <div class="txn-row clickable" data-act="openAccountFromTagihanBulan" data-a0="${escapeHtml(it.accId)}">
        <div class="txn-left"><div class="txn-text">
          <div class="txn-desc">${escapeHtml(it.accName)}</div>
          <div class="txn-meta">${escapeHtml(it.label)} · jatuh tempo ${escapeHtml(fmtTgl(it.due))}</div>
        </div></div>
        <div class="txn-right"><span class="txn-amount keluar">${formatRp(it.amount)}</span></div>
      </div>`).join('');
    $('tagihan-bulan-detail').classList.add('open');
  }

  function closeTagihanBulanDetail() {
    $('tagihan-bulan-detail').classList.remove('open');
  }

  function renderAccountsSummary(data, balances) {
    if (!balances) balances = computeAllBalances(data);
    const asetEl = $('akun-total-aset');
    const utangEl = $('akun-total-utang');
    if (!asetEl || !utangEl) return;
    const { aset: totalAset, utang: totalUtang } = computeAssetDebt(data, balances);
    const hid = !!state.balanceHidden, R = n => hid ? HIDDEN_RP : formatRp(n);
    asetEl.textContent = R(totalAset);
    utangEl.textContent = R(totalUtang);
    // A5: kekayaan bersih (aset − utang, definisi utang sama dengan A1) dan pemakaian limit kartu
    const nwEl = $('akun-net-worth');
    if (nwEl) { nwEl.textContent = R(totalAset - totalUtang); nwEl.classList.toggle('neg', totalAset - totalUtang < 0); }
    const lu = computeLimitUsage(data, balances);
    const luCard = $('akun-limit-card'), luEl = $('akun-limit-usage'), luSub = $('akun-limit-sub');
    if (luCard) luCard.style.display = lu ? '' : 'none';
    if (lu && luEl && luSub) {
      const tone = lu.pct >= 90 ? 'var(--red)' : (lu.pct >= 70 ? 'var(--amber)' : '');
      luEl.textContent = (lu.pct >= 90 ? '▲ ' : '') + lu.pct + '%';
      luEl.style.color = tone;
      luSub.textContent = hid ? HIDDEN_RP : formatRp(lu.used) + ' dari ' + formatRp(lu.limit);
    }
  }

  // Tab Akun: dikelompokkan per tipe (bisa dilipat), tiap akun berupa kartu. Tipe sederhana (kas, bank, e-wallet)
  // dua kolom; tipe dengan info banyak (kartu kredit, PayLater, pinjaman, titipan) satu kolom. Urut dari nilai terbesar.
  const ACC_GROUP_KEY = 'kp_acc_collapsed';
  let accCollapsed = {};
  try { accCollapsed = JSON.parse(localStorage.getItem(ACC_GROUP_KEY) || '{}') || {}; } catch (e) { accCollapsed = {}; }
  // A8: tata letak manual (sematan + urutan) per perangkat
  const ACC_LAYOUT_KEY = 'kp_acc_layout';
  function loadAccLayout(data) {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(ACC_LAYOUT_KEY) || 'null'); } catch (e) { raw = null; }
    return cleanAccountLayout(raw, data || loadData());
  }
  function saveAccLayout(layout) { try { localStorage.setItem(ACC_LAYOUT_KEY, JSON.stringify(layout)); } catch (e) { /* preferensi tampilan, tidak kritis */ } }
  function toggleAccOrderMode() {
    state.accOrderMode = !state.accOrderMode;
    if (state.accOrderMode) resetAccFilters(); else refreshAccounts();   // saat mengatur urutan, filter dimatikan supaya semua akun tampil
    const btn = $('acc-order-toggle'); if (btn) btn.textContent = state.accOrderMode ? 'Selesai' : 'Atur urutan';
  }
  function moveAccount(id, dir) {
    const data = loadData(); const acc = data.accounts.find(a => a.id === id); if (!acc) return;
    const ids = Array.from(document.querySelectorAll('.acc-group[data-type="' + acc.type + '"] [data-acc-id]')).map(el => el.getAttribute('data-acc-id'));
    saveAccLayout(moveAccountInGroup(loadAccLayout(data), acc.type, ids, id, dir));
    refreshAccounts();
    const again = document.querySelector('.acc-tile[data-acc-id="' + id.replace(/"/g, '') + '"] [data-act="moveAccount"][data-n1="' + dir + '"]');
    if (again && !again.disabled) again.focus();
  }
  function toggleAccPin(id) {
    const data = loadData();
    saveAccLayout(toggleAccountPin(loadAccLayout(data), id));
    refreshAccounts();
  }
  const ACC_WIDE_TYPES = { kartu_kredit: true, paylater: true, pinjaman: true, pinjaman_online: true, titipan: true };

  function toggleAccGroup(type) {
    if (type === '_arsip') accCollapsed[type] = (accCollapsed[type] === false);   // bagian arsip terlipat bawaan: false = dibuka
    else accCollapsed[type] = !accCollapsed[type];
    try { localStorage.setItem(ACC_GROUP_KEY, JSON.stringify(accCollapsed)); } catch (e) {}
    const g = document.querySelector('.acc-group[data-type="' + type + '"]');
    if (g) {
      const isCol = type === '_arsip' ? accCollapsed[type] !== false : !!accCollapsed[type];
      g.classList.toggle('collapsed', isCol);
      const head = g.querySelector('.acc-group-head');
      if (head) head.setAttribute('aria-expanded', isCol ? 'false' : 'true');
    }
  }

  function renderAccounts(data, balances) {
    if (!balances) balances = computeAllBalances(data);
    const container = $('accounts-scroll');
    if (!container) return;
    if (data.accounts.length === 0) {
      container.innerHTML = '<div class="empty">Belum ada akun. Tambahkan yang pertama dengan tombol + di bawah.</div>';
      return;
    }
    const txnStats = computeAccountTxnStats(data);

    // Hitung tampilan tiap akun
    const items = data.accounts.map(acc => {
      const bal = balances[acc.id];
      const colorVar = TYPE_COLOR_VAR[acc.type] || '--teal';
      const txnCount = txnStats[acc.id] ? txnStats[acc.id].count : 0;
      const di = accountDisplayInfo(data, acc, bal);
      const { valueText, color, metaExtra, sortVal, groupVal, canPay, payLabel, payAct } = di;
      const hidB = !!state.balanceHidden, mk = t => hidB ? maskRpText(t) : t;
      const lines = di.lines.map(l => ({ text: mk(l.text), tone: l.tone }));
      if (!di.isDebt) { if (lines.length) lines[0] = { text: lines[0].text + ' · ' + txnCount + ' transaksi', tone: '' }; else lines.push({ text: txnCount + ' transaksi', tone: '' }); }
      const barHtml = di.bar ? `<div class="acc-bar"><div class="acc-bar-fill" style="width:${di.bar.pct}%; background:var(${di.bar.color});"></div></div>` : '';
      return { acc, colorVar, valueText: mk(valueText), color, metaExtra: mk(metaExtra), lines, barHtml, txnCount, sortVal, groupVal, canPay, payLabel, payAct, isDebt: di.isDebt };
    });

    // A7: pencarian + chip filter
    const fq = state.accQuery, ff = state.accFilter, filtering = !!fq || ff !== 'all';
    renderAccountFilterBar(data, items, filtering);
    const visible = items.filter(it => accountFilterMatch(it.acc, it.groupVal, it.isDebt, ff, fq));
    if (filtering && visible.length === 0) {
      container.innerHTML = '<div class="empty">' + (ff === 'arsip' && !fq ? 'Belum ada akun yang diarsipkan.' : 'Tidak ada akun yang cocok dengan pencarian atau filter ini.') + '<br><button type="button" class="empty-reset-link" data-act="resetAccFilters">Reset filter</button></div>';
      return;
    }

    const makeCard = (it, colorVar) => {
      const toneCss = { late: 'color:var(--red); font-weight:600;', warn: 'color:var(--amber);' };
      const metaHtml = it.lines.map(l => `<div class="acc-tile-meta"${toneCss[l.tone] ? ' style="' + toneCss[l.tone] + '"' : ''}>${escapeHtml(l.text)}</div>`).join('');
      return `
        <div class="acc-card acc-tile" style="--accent-color: var(${colorVar});" role="button" tabindex="0" data-act="openAccountDetail" data-a0="${escapeHtml(it.acc.id)}" data-keydown-act="openAccountDetail" data-keydown-a0="${escapeHtml(it.acc.id)}" data-keydown-keys="Enter| " data-acc-id="${escapeHtml(it.acc.id)}">
          <div class="acc-name">${escapeHtml(it.acc.name)}${it.pinned ? ' <span class="acc-pin-tag">Disematkan</span>' : ''}</div>
          <div class="acc-tile-value" style="color:${it.color}">${it.valueText}</div>
          ${metaHtml}
          ${it.barHtml}
          ${it.orderHtml || ''}
          ${it.canPay && !it.orderHtml ? `<button type="button" class="io-btn" style="width:100%; margin-top:10px; padding:8px 10px; font-size:13px;" data-act="${it.payAct}" data-a0="${escapeHtml(it.acc.id)}"${it.payAct === 'payCardFromDetail' ? ' data-a1="tagihan"' : ''} data-stop="1" data-keydown-stop="1">${it.payLabel}</button>` : ''}
        </div>`;
    };

    // Kelompokkan per tipe (urutan mengikuti TYPE_LABELS), tipe kosong dilewati. Akun arsip (A4) dipisah ke bagian sendiri di bawah.
    const accLayout = loadAccLayout(data), pinSet = new Set(accLayout.pins);
    const archItems = visible.filter(it => it.acc.archived);
    const html = Object.keys(TYPE_LABELS).map(type => {
      const group = visible.filter(it => it.acc.type === type && !it.acc.archived);
      if (!group.length) return '';
      const sorted = sortAccountGroup(group, accLayout);
      group.length = 0; sorted.forEach(x => group.push(x));
      group.forEach((it, gi) => {
        it.pinned = pinSet.has(it.acc.id);
        if (state.accOrderMode && !filtering) {
          const samePrev = gi > 0 && pinSet.has(group[gi - 1].acc.id) === it.pinned, sameNext = gi < group.length - 1 && pinSet.has(group[gi + 1].acc.id) === it.pinned;
          it.orderHtml = `<div class="acc-order-row" data-stop="1" data-keydown-stop="1">
            <button type="button" class="io-btn" data-act="moveAccount" data-a0="${escapeHtml(it.acc.id)}" data-n1="-1" data-stop="1" ${samePrev ? '' : 'disabled'} aria-label="Naikkan ${escapeHtml(it.acc.name)}">▲</button>
            <button type="button" class="io-btn" data-act="moveAccount" data-a0="${escapeHtml(it.acc.id)}" data-n1="1" data-stop="1" ${sameNext ? '' : 'disabled'} aria-label="Turunkan ${escapeHtml(it.acc.name)}">▼</button>
            <button type="button" class="io-btn" data-act="toggleAccPin" data-a0="${escapeHtml(it.acc.id)}" data-stop="1" aria-pressed="${it.pinned}">${it.pinned ? 'Lepas' : 'Sematkan'}</button></div>`;
        }
      });
      const colorVar = TYPE_COLOR_VAR[type] || '--teal';
      const isDebtType = !!TYPE_DEBT[type];
      const total = group.reduce((sum, it) => sum + it.groupVal, 0);
      let totalText;
      const hidG = !!state.balanceHidden;
      if (isDebtType) totalText = total > 0 ? 'Utang ' + formatRp(total) : 'Lunas';
      else if (type === 'titipan') totalText = total > 0 ? 'Piutang ' + formatRp(total) : (total < 0 ? 'Utang ' + formatRp(-total) : 'Lunas');
      else totalText = formatRp(total);
      if (hidG) totalText = maskRpText(totalText);
      const totalColor = (isDebtType && total > 0) || (type === 'titipan' && total < 0) || (!isDebtType && type !== 'titipan' && total < 0) ? 'var(--red)' : 'var(--ink)';
      const collapsed = !filtering && !!accCollapsed[type];   // saat memfilter, semua kelompok dibuka
      const wide = !!ACC_WIDE_TYPES[type];
      const cards = group.map(it => makeCard(it, colorVar)).join('');
      return `
        <div class="acc-group${collapsed ? ' collapsed' : ''}" data-type="${type}">
          <button class="acc-group-head" data-act="toggleAccGroup" data-a0="${escapeHtml(type)}" aria-expanded="${collapsed ? 'false' : 'true'}">
            <span class="dot" style="background: var(${colorVar})"></span>
            <span class="acc-group-title">${TYPE_LABELS[type]}</span>
            <span class="acc-group-count">${group.length}</span>
            <span class="acc-group-total" style="color:${totalColor}">${totalText}</span>
            <svg class="chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="acc-grid${wide ? ' one' : ''}">${cards}</div>
        </div>`;
    }).join('');
    // A4: bagian "Diarsipkan", terlipat bawaan (accCollapsed._arsip === false berarti sengaja dibuka).
    let archHtml = '';
    if (archItems.length) {
      archItems.sort((x, y) => x.acc.name.localeCompare(y.acc.name));
      const open = filtering || accCollapsed._arsip === false;
      archHtml = `
        <div class="acc-group${open ? '' : ' collapsed'}" data-type="_arsip">
          <button class="acc-group-head" data-act="toggleAccGroup" data-a0="_arsip" aria-expanded="${open ? 'true' : 'false'}">
            <span class="dot" style="background: var(--ink-soft)"></span>
            <span class="acc-group-title">Diarsipkan</span>
            <span class="acc-group-count">${archItems.length}</span>
            <span class="acc-group-total" style="color:var(--ink-soft)">Riwayat tetap tersimpan</span>
            <svg class="chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="acc-grid">${archItems.map(it => makeCard({ ...it, lines: [{ text: TYPE_LABELS[it.acc.type] + ' · ' + it.txnCount + ' transaksi', tone: '' }], barHtml: '', canPay: false }, '--ink-soft')).join('')}</div>
        </div>`;
    }
    container.innerHTML = html + archHtml;
  }

  // A7: baris pencarian + chip filter di atas daftar akun. Tampil bila akun >= 5 atau sedang memfilter.
  function renderAccountFilterBar(data, items, filtering) {
    const bar = $('acc-filter-bar'), row = $('acc-chip-row');
    if (!bar || !row) return;
    bar.style.display = (!state.accOrderMode && (data.accounts.length >= 5 || filtering)) ? '' : 'none';
    const counts = accountFilterCounts(items);
    row.innerHTML = ACCOUNT_FILTERS.map(([f, label]) =>
      `<button type="button" class="chip${state.accFilter === f ? ' active' : ''}" aria-pressed="${state.accFilter === f}" data-act="setAccFilter" data-a0="${escapeHtml(f)}">${label}${f === 'all' ? '' : ' ' + counts[f]}</button>`).join('');
    const clr = $('acc-search-clear'); if (clr) clr.classList.toggle('show', !!state.accQuery);
  }

  function refreshAccounts() { renderAccounts(loadData()); }
  let accSearchTimer = null;
  function onAccSearchInput() {
    const raw = $('acc-search-input').value;
    clearTimeout(accSearchTimer);
    accSearchTimer = setTimeout(() => { state.accQuery = raw.trim().toLowerCase(); refreshAccounts(); }, 180);
    const clr = $('acc-search-clear'); if (clr) clr.classList.toggle('show', raw.length > 0);
  }
  function clearAccSearch() {
    const el = $('acc-search-input'); if (el) { el.value = ''; el.focus(); }
    clearTimeout(accSearchTimer);
    state.accQuery = '';
    refreshAccounts();
  }
  function setAccFilter(f) {
    if (!ACCOUNT_FILTERS.some(x => x[0] === f)) return;
    state.accFilter = f;
    refreshAccounts();
  }
  function resetAccFilters() {
    clearTimeout(accSearchTimer);
    state.accQuery = ''; state.accFilter = 'all';
    const el = $('acc-search-input'); if (el) el.value = '';
    refreshAccounts();
  }

  function renderFilters(data) {
    const row = $('filter-row');
    row.innerHTML = '';
    const allChip = document.createElement('button');
    allChip.className = 'chip' + (state.activeFilter === 'all' ? ' active' : '');
    allChip.textContent = 'Semua akun';
    allChip.onclick = () => { state.activeFilter = 'all'; refreshTxnList(); };
    row.appendChild(allChip);
    data.accounts.forEach(acc => {
      if (acc.archived && state.activeFilter !== acc.id) return;   // A4: chip akun arsip hanya muncul bila sedang dipilih
      const chip = document.createElement('button');
      chip.className = 'chip' + (state.activeFilter === acc.id ? ' active' : '');
      chip.textContent = acc.name;
      chip.onclick = () => { state.activeFilter = acc.id; refreshTxnList(); };
      row.appendChild(chip);
    });
  }

  function renderTypeFilters() {
    const row = $('type-filter-row');
    row.innerHTML = '';
    const options = [['all', 'Semua jenis'], ['masuk', 'Pemasukan'], ['keluar', 'Pengeluaran'], ['transfer', 'Transfer']];
    options.forEach(([val, label]) => {
      const chip = document.createElement('button');
      chip.className = 'chip' + (state.activeTypeFilter === val ? ' active' : '');
      chip.textContent = label;
      chip.onclick = () => { state.activeTypeFilter = val; refreshTxnList(); };
      row.appendChild(chip);
    });
  }

  function onSortChange() {
    state.sortMode = $('sort-select').value;
    refreshTxnList();
  }

  let txnSearchDebounceTimer = null;
  function onTxnSearchInput() {
    const raw = $('txn-search-input').value;
    const clearBtn = $('txn-search-clear');
    if (clearBtn) clearBtn.classList.toggle('show', raw.length > 0);
    clearTimeout(txnSearchDebounceTimer);
    txnSearchDebounceTimer = setTimeout(() => {
      state.txnSearchQuery = raw.trim().toLowerCase();
      refreshTxnList();
    }, 220);
  }

  function clearTxnSearch() {
    const searchEl = $('txn-search-input');
    if (searchEl) searchEl.value = '';
    const clearBtn = $('txn-search-clear');
    if (clearBtn) clearBtn.classList.remove('show');
    clearTimeout(txnSearchDebounceTimer);
    state.txnSearchQuery = '';
    refreshTxnList();
  }

  function resetFilters() {
    state.activeFilter = 'all';
    state.activeTypeFilter = 'all';
    state.sortMode = 'date-desc';
    state.txnSearchQuery = '';
    state.txnMonth = 'cur';
    clearTimeout(txnSearchDebounceTimer);
    $('sort-select').value = 'date-desc';
    const searchEl = $('txn-search-input');
    if (searchEl) searchEl.value = '';
    const clearBtn = $('txn-search-clear');
    if (clearBtn) clearBtn.classList.remove('show');
    refreshTxnList();
  }

  // Refresh ringan khusus tab Transaksi: dipakai saat ganti filter/urutan/cari
  // saja (data tidak berubah), jadi tidak perlu render ulang seluruh tab lain
  // (akun, grafik, titipan, laporan) yang berat dan bikin lag terutama saat mengetik di kolom cari.
  function refreshTxnList() {
    const data = loadData();
    state.txnRenderLimit = TXN_PAGE_SIZE; // filter/urutan/cari/bulan berubah -> mulai lagi dari halaman pertama
    renderTxnMonthRow(data);
    renderFilters(data);
    renderTypeFilters();
    renderTxnListSection(data);
  }

  // ---------- Pemilih bulan di tab Transaksi ----------
  // Default: hanya bulan berjalan. Pilihan bulan = bulan yang punya transaksi + bulan ini, plus "Semua waktu".
  // Sedang mencari (kolom cari terisi) => pencarian menyisir SEMUA bulan supaya transaksi lama tetap ketemu.
  function txnMonthKeys(data) {
    const cur = todayStr().slice(0, 7);
    const set = new Set([cur]);
    data.txns.forEach(t => { const k = monthKeyFromDate(t.date || ''); if (/^\d{4}-\d{2}$/.test(k)) set.add(k); });
    return Array.from(set).sort().reverse();
  }
  function resolveTxnMonth(keys) {
    const cur = todayStr().slice(0, 7);
    if (state.txnMonth === 'all') return 'all';
    const k = state.txnMonth === 'cur' ? cur : state.txnMonth;
    return keys.indexOf(k) >= 0 ? k : cur;
  }
  function txnMonthLabel(key) {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }
  function renderTxnMonthRow(data) {
    const sel = $('txn-month-select');
    if (!sel) return;
    const cur = todayStr().slice(0, 7);
    const keys = txnMonthKeys(data);
    const val = resolveTxnMonth(keys);
    sel.innerHTML = keys.map(k => `<option value="${k}">${txnMonthLabel(k)}${k === cur ? ' (bulan ini)' : ''}</option>`).join('') + '<option value="all">Semua waktu</option>';
    sel.value = val;
    const idx = keys.indexOf(val);
    const prev = $('txn-month-prev'), next = $('txn-month-next');
    if (prev) prev.disabled = idx < 0 || idx >= keys.length - 1; // makin ke bawah = makin lama
    if (next) next.disabled = idx <= 0;
  }
  function setTxnMonth(v) {
    state.txnMonth = v === todayStr().slice(0, 7) ? 'cur' : v;
    refreshTxnList();
  }
  function onTxnMonthChange() { setTxnMonth($('txn-month-select').value); }
  function shiftTxnMonth(step) { // step +1 = bulan lebih lama, -1 = lebih baru
    const keys = txnMonthKeys(loadData());
    const idx = keys.indexOf(resolveTxnMonth(keys));
    const ni = idx + step;
    if (idx < 0 || ni < 0 || ni >= keys.length) return;
    setTxnMonth(keys[ni]);
  }


