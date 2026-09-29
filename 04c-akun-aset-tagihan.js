  // ============================================================
  // AKUN: NILAI ASET, BAYAR TAGIHAN KARTU/PAYLATER, PEMBAYARAN PINJAMAN, addTxn
  // Lanjutan 04b-akun-detail.js: dimuat sesudahnya, berbagi lingkup global yang sama.
  // ============================================================

  // ---------- PANEL NILAI ASET (detail akun) ----------
  // Daftar assetKind baku (harus sinkron dengan opsi <select id="acc-asset-kind-input">) dan alias
  // satuan mata uang/kripto yang umum, supaya variasi penulisan dari file import atau input manual
  // (beda huruf besar-kecil) disamakan ke bentuk baku sebelum disimpan.
  const ASSET_KIND_OPTIONS = ['Emas', 'Kendaraan', 'Properti', 'Investasi', 'Forex', 'Kripto', 'Lainnya'];
  const ASSET_UNIT_ALIASES = { usd: 'USD', usdt: 'USDT', idr: 'IDR', eur: 'EUR', gbp: 'GBP', sgd: 'SGD', jpy: 'JPY', btc: 'BTC', eth: 'ETH' };
  function normalizeAssetKind(raw) {
    if (typeof raw !== 'string') return '';
    const trimmed = raw.trim();
    if (!trimmed) return '';
    const match = ASSET_KIND_OPTIONS.find(k => k.toLowerCase() === trimmed.toLowerCase());
    return (match || trimmed).slice(0, 40);
  }
  function normalizeAssetUnit(raw) {
    if (typeof raw !== 'string') return '';
    const trimmed = raw.trim();
    if (!trimmed) return '';
    const alias = ASSET_UNIT_ALIASES[trimmed.toLowerCase()];
    return (alias || trimmed).slice(0, 12);
  }
  function sanitizeValuations(arr) {
    if (!Array.isArray(arr)) return [];
    const out = [];
    const seen = new Set();
    arr.forEach(v => {
      if (!v || typeof v.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v.date) || typeof v.value !== 'number' || !isFinite(v.value) || seen.has(v.date)) return;
      seen.add(v.date);
      const e = { date: v.date, value: v.value };
      if (typeof v.price === 'number' && isFinite(v.price) && v.price >= 0) e.price = v.price;
      out.push(e);
    });
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }
  function copyAssetFields(src, dst) {
    if (dst.type !== 'aset') return;
    if (typeof src.assetKind === 'string') { const k = normalizeAssetKind(src.assetKind); if (k) dst.assetKind = k; }
    if (typeof src.assetQty === 'number' && src.assetQty > 0) dst.assetQty = src.assetQty;
    if (typeof src.assetUnit === 'string') { const u = normalizeAssetUnit(src.assetUnit); if (u) dst.assetUnit = u; }
    const vals = sanitizeValuations(src.valuations);
    if (vals.length) dst.valuations = vals;
  }

  function renderAssetPanel(data, acc, bal) {
    const wrap = $('acc-detail-asset');
    if (!wrap) return;
    if (acc.type !== 'aset') { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    let tin = 0, tout = 0;
    data.txns.forEach(t => {
      if (t.type !== 'transfer') return;
      if (t.toAccountId === acc.id) tin += t.amount;
      if (t.accountId === acc.id) tout += t.amount;
    });
    const modal = (acc.initialBalance || 0) + tin - tout;
    const pl = bal - modal;
    const qty = acc.assetQty > 0 ? acc.assetQty : 0;
    const unit = acc.assetUnit || 'satuan';
    const rows = [['Nilai sekarang', formatRp(bal), 'var(--ink)'], ['Modal (nilai awal + beli − jual)', formatRp(modal), 'var(--ink-soft)'],
      ['Selisih nilai vs modal', (pl >= 0 ? '+' : '−') + formatRp(Math.abs(pl)), pl >= 0 ? 'var(--green)' : 'var(--red)']];
    if (qty > 0) rows.push(['Harga per ' + unit + ' sekarang', formatRp(Math.round(bal / qty)), 'var(--ink-soft)']);
    $('asset-val-summary').innerHTML = rows.map(r => `
      <div class="txn-row">
        <div class="txn-left"><div class="txn-text"><div class="txn-desc txn-desc-wrap">${escapeHtml(r[0])}</div></div></div>
        <div class="txn-right"><span class="txn-amount" style="color:${r[2]};">${r[1]}</span></div>
      </div>`).join('') + (hasValuations(acc) ? '' : '<div class="acc-sub u-mt6">Belum pernah diperbarui: nilai = nilai awal + transaksi.</div>');
    const dateEl = $('asset-val-date-input');
    dateEl.value = todayStr(); dateEl.max = todayStr();
    $('asset-val-price-row').style.display = qty > 0 ? 'flex' : 'none';
    $('asset-val-price-input').placeholder = 'Harga per ' + unit + ' (Rp), jumlah ' + (Math.round(qty * 1000) / 1000).toLocaleString('id-ID');
    $('asset-val-price-input').value = '';
    $('asset-val-total-input').value = '';
    const vals = (acc.valuations || []).slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
    $('asset-val-history').innerHTML = vals.length ? vals.map(v => `
      <div class="txn-row">
        <div class="txn-left"><div class="txn-text"><div class="txn-desc">${escapeHtml(fmtTgl(v.date))}</div>${v.price > 0 ? `<div class="txn-meta">${formatRp(v.price)} per ${escapeHtml(unit)}</div>` : ''}</div></div>
        <div class="txn-right"><span class="txn-amount">${formatRp(v.value)}</span><button type="button" class="io-btn" style="padding:4px 10px;" data-act="deleteAssetValuation" data-a0="${v.date}" aria-label="Hapus penilaian ${escapeHtml(v.date)}">×</button></div>
      </div>`).join('') : '<div class="acc-sub">Belum ada riwayat.</div>';
  }
  function onAssetPriceInput() {
    const data = loadData();
    const acc = data.accounts.find(a => a.id === detailAccountId);
    const price = parseFloat($('asset-val-price-input').value);
    if (acc && acc.assetQty > 0 && price >= 0) $('asset-val-total-input').value = Math.round(price * acc.assetQty * 100) / 100;
  }
  function saveAssetValuation() {
    const id = detailAccountId;
    const data = loadData();
    const acc = id && data.accounts.find(a => a.id === id);
    if (!acc || acc.type !== 'aset') return;
    const date = $('asset-val-date-input').value || todayStr();
    if (date > todayStr()) { showIoMsg('Tanggal penilaian tidak boleh di masa depan.', 'error', 'asset-val-msg'); return; }
    const totalStr = String($('asset-val-total-input').value).trim();
    const price = parseFloat($('asset-val-price-input').value);
    let total = totalStr !== '' ? parseFloat(totalStr) : (acc.assetQty > 0 && price >= 0 ? price * acc.assetQty : NaN);
    if (!isFinite(total)) { $('asset-val-total-input').focus(); showIoMsg('Isi nilai total (atau harga per satuan).', 'error', 'asset-val-msg'); return; }
    total = Math.round(total * 100) / 100;
    const entry = { date, value: total };
    if (acc.assetQty > 0) entry.price = price >= 0 && totalStr === '' ? price : Math.round((total / acc.assetQty) * 100) / 100;
    acc.valuations = (acc.valuations || []).filter(v => v.date !== date);
    acc.valuations.push(entry);
    acc.valuations.sort((a, b) => a.date.localeCompare(b.date));
    saveData(data);
    render();
    openAccountDetail(id);
    showIoMsg('Nilai ' + acc.name + ' diperbarui: ' + formatRp(total) + '.', 'ok', 'asset-val-msg');
  }
  async function deleteAssetValuation(date) {
    const id = detailAccountId;
    const data = loadData();
    const acc = id && data.accounts.find(a => a.id === id);
    if (!acc || !Array.isArray(acc.valuations)) return;
    const v = acc.valuations.find(x => x.date === date);
    if (!v) return;
    const ok = await showConfirm(`Hapus penilaian ${fmtTgl(date)} sebesar ${formatRp(v.value)}? Nilai aset kembali mengikuti penilaian sebelumnya.`);
    if (!ok) return;
    acc.valuations = acc.valuations.filter(x => x.date !== date);
    if (!acc.valuations.length) delete acc.valuations;
    saveData(data);
    render();
    openAccountDetail(id);
  }

  // ---------- BAYAR TAGIHAN KARTU KREDIT ----------
  // Pilihan pembayaran untuk satu kartu: tagihan cetak (sisa), minimum, atau seluruh hutang.
  // Return null kalau tidak ada hutang yang perlu dibayar.
  function cardPayOptions(data, acc, bal) {
    const used = bal < 0 ? Math.abs(bal) : 0;
    if (used <= 0) return null;
    const ci = cardStatementInfo(data, acc, todayStr());
    const full = { kind: 'full', text: 'Bayar penuh (seluruh hutang)', amount: used };
    if (ci && ci.remaining > 0) {
      const remaining = Math.min(used, ci.remaining);
      const others = [];
      const minPay = Math.min(remaining, ci.minRemaining);
      if (minPay > 0 && minPay < remaining) others.push({ kind: 'min', text: 'Minimal', amount: minPay });
      if (remaining < used) others.push(full);
      const late = ci.dueDate < todayStr();
      return { note: 'Jatuh tempo ' + fmtTgl(ci.dueDate) + (late ? ' (sudah lewat)' : '') + ' · tagihan cetak ' + fmtTgl(ci.statementDate), primary: { kind: 'tagihan', text: 'Bayar tagihan cetak', amount: remaining }, others };
    }
    if (ci) { // tagihan cetak sudah lunas, sisanya hanya belanja baru
      return { note: 'Tagihan cetak ' + fmtTgl(ci.statementDate) + ' sudah lunas. Sisa hutang = belanja setelah cetak.', primary: full, others: [] };
    }
    const minPay = cardMinPayOf(acc, used);
    return { note: '', primary: full, others: minPay > 0 && minPay < used ? [{ kind: 'min', text: 'Minimal', amount: minPay }] : [] };
  }

  // Tutup detail/daftar akun lalu buka form Transfer dengan kartu sebagai akun tujuan & nominal terisi.
  function payCardFromDetail(accId, kind) {
    const data = loadData();
    const acc = data.accounts.find(a => a.id === accId);
    if (!acc) return;
    const opts = cardPayOptions(data, acc, accountBalance(data, accId));
    if (!opts) return;
    const all = [opts.primary].concat(opts.others);
    const pick = all.find(o => o.kind === kind) || opts.primary;
    const labels = { tagihan: 'Bayar KK - Tagihan cetak', min: 'Bayar KK - Minimal', full: 'Bayar KK - Penuh' };
    closeAccountDetail();
    openAddTxnForm();
    setType('transfer');
    const toSel = $('to-account-select');
    if (Array.from(toSel.options).some(o => o.value === accId)) toSel.value = accId;
    updateQuickPayButtons();
    fillTransferAmount(pick.amount, labels[pick.kind] || 'Bayar KK');
    const form = $('txn-form');
    if (form && form.scrollIntoView) form.scrollIntoView({ block: 'start' });
  }

  // A6: dari detail akun, buka form transaksi dengan akun ini terisi. mode 'catat' = akun sebagai akun transaksi;
  // mode 'transfer' = akun sebagai SUMBER transfer (akun tujuan otomatis dipindah kalau sama dengan sumber).
  function quickTxnForAccount(accId, mode) {
    const data = loadData();
    const acc = data.accounts.find(a => a.id === accId);
    if (!acc) return;
    const q = accountQuickActions(acc);
    if (mode === 'transfer' ? !q.transfer : !q.catat) return;
    closeAccountDetail();
    openAddTxnForm();
    const accSel = $('account-select');
    if (Array.from(accSel.options).some(o => o.value === accId)) accSel.value = accId;
    if (mode === 'transfer') {
      const toSel = $('to-account-select');
      if (toSel.value === accId) { const other = Array.from(toSel.options).find(o => o.value !== accId); if (other) toSel.value = other.value; }
      setType('transfer');
    }
    updateTypeAvailability(data);
    const form = $('txn-form');
    if (form && form.scrollIntoView) form.scrollIntoView({ block: 'start' });
  }
  function quickTxnFromDetail(mode) { if (detailAccountId) quickTxnForAccount(detailAccountId, mode); }

  // Tombol "Bayar" di kartu Jatuh tempo (Ringkasan). Tiap jenis akun memakai alur bayarnya sendiri:
  //  - kartu kredit : form Transfer, nominal tagihan cetak
  //  - PayLater     : form Transfer per bulan tagihan (periode cicilan ikut ditandai lunas)
  //  - pinjaman     : panel "Catat pembayaran" di detail akun, nominal angsuran terisi
  function payDueFromRingkasan(accId) {
    const data = loadData();
    const acc = data.accounts.find(a => a.id === accId);
    if (!acc) return;
    const balances = computeAllBalances(data);
    const due = computeUpcomingDues(data, balances, 100000).find(x => x.id === accId);
    if (acc.type === 'kartu_kredit') { payCardFromDetail(accId, 'tagihan'); return; }
    if (TYPE_LOAN[acc.type]) {
      openAccountDetail(accId);
      const amt = due ? Math.round(due.amount) : 0;
      const amountEl = $('loan-pay-amount-input');
      if (amt > 0 && amountEl) { amountEl.value = amt; updateLoanPaySplit(); }
      const wrap = $('acc-detail-loan-pay');
      if (wrap && wrap.scrollIntoView) wrap.scrollIntoView({ block: 'center' });
      return;
    }
    if (acc.type === 'paylater') {
      if (paylaterMonthlyBreakdown(data, acc, balances[accId] || 0).length > 0) { payMonthFromDetail(accId, 0); return; }
      if (!due || !(due.amount > 0)) { openAccountDetail(accId); return; }
      closeAccountDetail();
      openAddTxnForm();
      setType('transfer');
      const toSel = $('to-account-select');
      if (Array.from(toSel.options).some(o => o.value === accId)) toSel.value = accId;
      updateQuickPayButtons();
      fillTransferAmount(Math.round(due.amount), 'Bayar tagihan PayLater');
    }
  }

  // Tombol "Bayar bulan ini" di breakdown tagihan bulanan PayLater: tutup detail akun, buka form
  // transaksi Transfer dengan akun tujuan & nominal sudah terisi sesuai total tagihan bulan itu.
  function payMonthFromDetail(accId, groupIdx) {
    const data = loadData();
    const acc = data.accounts.find(a => a.id === accId);
    if (!acc) return;
    const balances = computeAllBalances(data);
    const bal = balances[accId] || 0;
    const groups = paylaterMonthlyBreakdown(data, acc, bal);
    const g = groups[groupIdx];
    if (!g) return;
    closeAccountDetail();
    openAddTxnForm();
    setType('transfer');
    const toSel = $('to-account-select');
    if (Array.from(toSel.options).some(o => o.value === accId)) toSel.value = accId;
    $('amount-input').value = g.total;
    updateQuickPayButtons(); // refresh tombol quick-pay untuk akun tujuan yang baru dipilih
    // Isi label & penanda pembayaran plan PALING TERAKHIR — updateQuickPayButtons() di atas mereset
    // state.pendingTransferLabel ke null, jadi urutan ini penting supaya labelnya tidak ketimpa.
    state.pendingTransferLabel = 'Bayar tagihan PayLater ' + fmtBulanTahun(g.due);
    // Tandai plan mana saja yang tercakup di tagihan bulan ini, DAN sampai periode ke berapa —
    // begitu transaksinya benar-benar disubmit, periode itu langsung dianggap lunas (tidak perlu
    // menunggu tanggal jatuh tempo lewat, penting untuk bayar lebih awal).
    const planIds = [];
    const planPaymentThrough = {};
    g.items.forEach(it => {
      if (!it.planId) return;
      if (!planIds.includes(it.planId)) planIds.push(it.planId);
      planPaymentThrough[it.planId] = Math.max(planPaymentThrough[it.planId] || 0, it.no);
    });
    state.pendingPlanPayment = { accId, planIds, planPaymentThrough };
    const catSel = $('category-select');
    if (catSel && [...catSel.options].some(o => o.value === 'Bayar tagihan/utang')) {
      catSel.value = 'Bayar tagihan/utang';
      onCategoryChange();
    }
  }

  // Klik salah satu baris "Tagihan per bulan ke depan" di detail akun PayLater: buka sheet detail
  // berisi rincian item PER CICILAN (tidak dipotong seperti tampilan ringkas di daftar), supaya bisa
  // dicocokkan satu-satu dengan rincian tagihan di aplikasi PayLater aslinya kalau ada selisih angka.
  function openPaylaterMonthDetail(accId, groupIdx) {
    const data = loadData();
    const acc = data.accounts.find(a => a.id === accId);
    if (!acc) return;
    const balances = computeAllBalances(data);
    const bal = balances[accId] || 0;
    const groups = paylaterMonthlyBreakdown(data, acc, bal);
    const g = groups[groupIdx];
    if (!g) return;

    $('paylater-month-detail-title').textContent = fmtBulanTahun(g.due) + ' · ' + acc.name;
    $('paylater-month-detail-total').textContent = formatRp(g.total);
    $('paylater-month-detail-meta').textContent = 'Jatuh tempo ' + formatDayLabel(g.due) + ' · ' + g.items.length + (g.items.length === 1 ? ' item' : ' item');

    const itemsSorted = g.items.slice().sort((a, b) => b.amount - a.amount);
    $('paylater-month-detail-items').innerHTML = itemsSorted.map(it => `
      <div class="txn-row">
        <div class="txn-left"><div class="txn-text">
          <div class="txn-desc">${escapeHtml(it.desc)}</div>
          ${it.no != null ? `<div class="txn-meta">Cicilan ke-${it.no} dari ${it.tenor}</div>` : `<div class="txn-meta" style="color:var(--rust); font-weight:600;">⚠ Belum terjadwal (Bayar Nanti / cicilan telat) — cek ulang di aplikasi PayLater asli, ini yang paling sering jadi selisih</div>`}
        </div></div>
        <div class="txn-right"><span class="txn-amount"${it.no == null ? ' style="color:var(--rust);"' : ''}>${formatRp(it.amount)}</span></div>
      </div>`).join('')
      + `<button type="button" class="submit-btn" style="margin-top:14px;" data-act="payMonthAndClose" data-a0="${accId}" data-n1="${groupIdx}">Bayar bulan ini</button>`;

    $('paylater-month-detail').classList.add('open');
  }

  function closePaylaterMonthDetail() {
    $('paylater-month-detail').classList.remove('open');
  }

  // Bunga bulan (refDate) yang MASIH harus dibayar = perkiraan bunga bulanan dikurangi bunga yang
  // sudah dibayar di bulan yang sama (supaya bayar bunga dua kali di bulan yang sama tidak terhitung dobel).
  // refDate opsional (default hari ini) -- dipakai supaya pembayaran yang dicatat mundur (tanggal lalu)
  // dicocokkan ke bulan tanggal itu, bukan selalu bulan berjalan.
  function computeLoanInterestDue(data, acc, mode, refDate) {
    const monthly = computeLoanMonthlyInterest(data, acc);
    if (monthly <= 0) return 0;
    // Angsuran pinjaman bunga flat bertenor: TIAP angsuran memuat bunga sebulan penuh (bukan sekali per bulan
    // kalender), sampai total bunga kontrak habis. Jadi bayar beberapa angsuran di hari/bulan yang sama tetap
    // masing-masing kena bunga.
    if (mode === 'pokok_bunga') {
      const remF = computeLoanRemaining(data, acc);
      if (remF.flat) return Math.min(monthly, remF.sisaBunga);
    }
    const ym = (refDate || todayStr()).slice(0, 7);
    const paid = data.txns
      .filter(t => t.loanId === acc.id && t.type === 'keluar' && t.category === 'Bunga & biaya bank' && (t.date || '').slice(0, 7) === ym)
      .reduce((sum, t) => sum + t.amount, 0);
    let due = Math.max(0, monthly - paid);
    const rem = computeLoanRemaining(data, acc);
    if (rem.flat) due = Math.min(due, rem.sisaBunga);
    return due;
  }

  // Pecah nominal pembayaran: bunga terutang dilunasi dulu, sisanya baru mengurangi pokok.
  // refDate opsional (default hari ini) -- lihat catatan di computeLoanInterestDue().
  function splitLoanPayment(data, acc, nominal, mode, refDate) {
    const sisaPokok = Math.max(0, -accountBalance(data, acc.id));
    let bungaDue = computeLoanInterestDue(data, acc, mode, refDate);
    // Pinjaman flat bertenor dibayar per angsuran: kalau nominalnya cukup untuk beberapa angsuran sekaligus,
    // tiap angsuran memuat bunga sebulan penuh (mis. 3 angsuran = 3x bunga), bukan bunga satu bulan saja.
    if (mode === 'pokok_bunga') {
      const remF = computeLoanRemaining(data, acc);
      const tenor = acc.loanTenorMonths || 0;
      if (remF.flat && tenor > 0) {
        const monthly = computeLoanMonthlyInterest(data, acc);
        const pokokAwal = Math.abs(acc.originalPrincipal || acc.initialBalance || 0);
        const perAngsuran = Math.floor(pokokAwal / tenor) + monthly;
        const k = perAngsuran > 0 ? Math.floor(nominal / perAngsuran) : 1;
        if (k > 1) bungaDue = Math.min(monthly * k, remF.sisaBunga);
      }
    }
    const bunga = Math.min(nominal, bungaDue);
    const pokok = Math.min(sisaPokok, Math.max(0, nominal - bunga));
    const kelebihan = Math.max(0, nominal - bunga - pokok);
    return { sisaPokok, bungaDue, bunga, pokok, kelebihan };
  }

  function onLoanPayModeChange() {
    const id = detailAccountId;
    if (!id) return;
    const data = loadData();
    const acc = data.accounts.find(a => a.id === id);
    if (!acc) return;
    const mode = $('loan-pay-mode-input').value;
    const isOnline = acc.type === 'pinjaman_online';
    const noRate = isOnline && !acc.loanRatePercent; // pinjol lama tanpa bunga flat: semua angsuran mengurangi sisa pinjaman
    const refDate = ($('loan-pay-date-input') || {}).value || todayStr();
    const monthly = computeLoanMonthlyInterest(data, acc);
    const due = computeLoanInterestDue(data, acc, mode, refDate);
    const hint = $('loan-interest-hint');
    const amountEl = $('loan-pay-amount-input');
    const rateInfo = acc.loanRatePercent
      ? ' (' + (acc.loanInterestType === 'menurun' ? 'dari sisa pokok' : 'dari pokok awal') + ', ' + (acc.loanRateUnit === 'bulan' ? acc.loanRatePercent + '%/bln' : acc.loanRatePercent + '%/thn') + ')'
      : (isOnline ? '' : ' (suku bunga belum diisi di akun ini, jadi seluruh nominal dihitung sebagai pokok)');
    const bulanLabel = refDate.slice(0, 7) === todayStr().slice(0, 7) ? 'bulan ini' : 'bulan ' + fmtTgl(refDate).replace(/^\d+\s/, '');
    const bungaInfo = acc.loanRatePercent
      ? 'Bunga ' + bulanLabel + ' ' + formatRp(monthly) + (monthly > due ? ', sudah dibayar ' + formatRp(monthly - due) + ', belum dibayar ' + formatRp(due) : '') + rateInfo + '. '
      : (isOnline ? '' : 'Bunga' + rateInfo + '. ');

    if (mode === 'bunga') {
      hint.textContent = bungaInfo + 'Semua nominal dianggap bunga, TIDAK mengurangi sisa pokok.';
      amountEl.value = due || '';
    } else if (mode === 'pokok_bunga') {
      const sisaPokok = Math.max(0, -accountBalance(data, id));
      const installment = acc.loanInstallment || 0;
      hint.textContent = bungaInfo + (installment > 0
        ? (noRate ? 'Nominal diisi otomatis dari angsuran tetap per bulan (bisa diubah); langsung mengurangi sisa pinjaman.' : 'Nominal diisi otomatis dari angsuran per bulan (bisa diubah). Bunga dilunasi dulu, sisanya mengurangi pokok.')
        : (noRate ? 'Isi angsuran tetap per bulan.' : 'Isi TOTAL angsuran. Bunga dilunasi dulu, sisanya mengurangi pokok. Angsuran pertama yang dicatat diingat untuk bulan berikutnya.'));
      amountEl.value = installment > 0 ? Math.min(installment, sisaPokok + due) : '';
    } else {
      hint.textContent = bungaInfo + (noRate ? 'Nominal bebas: langsung mengurangi sisa pinjaman.' : 'Nominal bebas: bunga yang belum dibayar bulan ini dilunasi dulu, sisanya langsung mengurangi pokok.');
      amountEl.value = '';
    }
    updateLoanPaySplit();
  }

  // Rincian otomatis: berapa bunga, berapa pokok, dan sisa hutang setelah pembayaran ini.
  function updateLoanPaySplit() {
    const el = $('loan-pay-split');
    if (!el) return;
    const id = detailAccountId;
    const data = loadData();
    const acc = id && data.accounts.find(a => a.id === id);
    if (!acc) { el.textContent = ''; return; }
    const mode = $('loan-pay-mode-input').value;
    const nominal = Math.round(parseFloat($('loan-pay-amount-input').value) || 0);
    if (nominal <= 0) { el.textContent = ''; return; }
    const refDate = ($('loan-pay-date-input') || {}).value || todayStr();
    const rem = computeLoanRemaining(data, acc);
    if (mode === 'bunga') {
      el.textContent = 'Bunga ' + formatRp(nominal) + ' · Sisa hutang jadi ' + formatRp(Math.max(0, rem.total - (rem.flat ? Math.min(nominal, rem.sisaBunga) : 0)));
      return;
    }
    const r = splitLoanPayment(data, acc, nominal, mode, refDate);
    el.textContent = (r.bunga > 0 ? 'Bunga ' + formatRp(r.bunga) + ' + ' : '') + 'Pokok ' + formatRp(r.pokok) +
      ' → sisa hutang jadi ' + formatRp(Math.max(0, rem.total - r.pokok - (rem.flat ? r.bunga : 0))) +
      (r.kelebihan > 0 ? ' · Kelebihan ' + formatRp(r.kelebihan) + ' tidak dicatat' : '');
  }

  async function submitLoanPayment() {
    const id = detailAccountId;
    if (!id) return;
    const data = loadData();
    const acc = data.accounts.find(a => a.id === id);
    if (!acc) return;
    const mode = $('loan-pay-mode-input').value;
    const sourceId = $('loan-pay-source-input').value;
    const sourceAcc = data.accounts.find(a => a.id === sourceId);
    const nominal = Math.round(parseFloat($('loan-pay-amount-input').value) || 0);
    if (!sourceId || !sourceAcc) { showIoMsg('Tidak ada akun sumber untuk membayar.', 'error', 'loan-pay-msg'); return; }
    if (nominal <= 0) { $('loan-pay-amount-input').focus(); showIoMsg('Isi nominal pembayaran.', 'error', 'loan-pay-msg'); return; }
    const payDate = $('loan-pay-date-input').value || todayStr();
    if (payDate > todayStr()) { $('loan-pay-date-input').focus(); showIoMsg('Tanggal pembayaran tidak boleh di masa depan.', 'error', 'loan-pay-msg'); return; }

    const today = payDate;
    const remP = computeLoanRemaining(data, acc);
    let confirmMsg, bunga = 0, pokok = 0, sisaPokok = remP.total;
    if (mode === 'bunga') {
      bunga = nominal;
      confirmMsg = `Catat bayar bunga ${acc.name} sebesar ${formatRp(nominal)} dari ${sourceAcc.name}?\n(Sisa hutang jadi ${formatRp(Math.max(0, sisaPokok - (remP.flat ? Math.min(nominal, remP.sisaBunga) : 0)))})`;
    } else {
      // 'pokok_bunga' (angsuran) dan 'nominal' (bebas): bunga terutang dilunasi dulu, sisanya ke pokok.
      const r = splitLoanPayment(data, acc, nominal, mode, payDate);
      bunga = r.bunga; pokok = r.pokok;
      const total = bunga + pokok;
      confirmMsg = `Catat ${mode === 'pokok_bunga' ? 'angsuran' : 'pembayaran'} ${acc.name} ${formatRp(total)} dari ${sourceAcc.name}?\n(Bunga ${formatRp(bunga)} + Pokok ${formatRp(pokok)})\nSisa hutang jadi ${formatRp(Math.max(0, sisaPokok - pokok - (remP.flat ? bunga : 0)))}` +
        (r.kelebihan > 0 ? `\nKelebihan ${formatRp(r.kelebihan)} tidak dicatat.` : '');
      if (total <= 0) { showIoMsg('Tidak ada yang perlu dibayar (bunga sudah lunas dan sisa hutang 0).', 'error', 'loan-pay-msg'); return; }
    }
    if (payDate !== todayStr()) confirmMsg += `\nTanggal: ${fmtTgl(payDate)}`;
    const ok = await showConfirm(confirmMsg);
    if (!ok) return;

    if (bunga > 0) {
      data.txns.push({
        id: generateId('txn'), date: today, type: 'keluar',
        desc: 'Bunga pinjaman ' + acc.name, amount: bunga, accountId: sourceId, category: 'Bunga & biaya bank', loanId: id
      });
    }
    if (pokok > 0) {
      data.txns.push({
        id: generateId('txn'), date: today, type: 'transfer',
        desc: (mode === 'pokok_bunga' ? 'Angsuran pokok ' : 'Bayar pokok ') + acc.name, amount: pokok, accountId: sourceId, toAccountId: id
      });
    }
    // Ingat total angsuran pertama sebagai default bulan berikutnya (bisa diubah di Edit akun).
    if (mode === 'pokok_bunga' && !acc.loanInstallment && pokok > 0) acc.loanInstallment = bunga + pokok;

    saveData(data);
    render();
    openAccountDetail(id);
    showIoMsg(mode === 'bunga'
      ? 'Bunga dicatat. Sisa pokok tidak berubah (ini hanya bunga).'
      : 'Dicatat: bunga ' + formatRp(bunga) + ', pokok ' + formatRp(pokok) + '. Sisa hutang ' + formatRp(Math.max(0, sisaPokok - pokok - (remP.flat ? bunga : 0))) + '.', 'ok', 'loan-pay-msg');
  }

  function editAccountFromDetail() {
    const id = detailAccountId;
    if (!id) return;
    closeAccountDetail();
    startEditAccount(id);
  }

  async function deleteAccountFromDetail() {
    const id = detailAccountId;
    if (!id) return;
    await deleteAccount(id);
    const data = loadData();
    if (!data.accounts.find(a => a.id === id)) closeAccountDetail();
  }

  async function addTxn() {
    const descEl = $('desc-input');
    const amtEl = $('amount-input');
    const accSel = $('account-select');
    const toSel = $('to-account-select');
    const catSel = $('category-select');
    const catCustomEl = $('category-custom-input');
    const dateEl = $('date-input');
    const amount = parseFloat(amtEl.value);

    if (!amount || amount <= 0) { amtEl.focus(); return; }

    let category = catSel.value;
    if (category === CATEGORY_CUSTOM) {
      const custom = catCustomEl.value.trim();
      if (!custom) { catCustomEl.focus(); showIoMsg('Isi nama kategorinya dulu.', 'error'); return; }
      category = custom;
    }

    const date = dateEl.value || todayStr();
    const data = loadData();
    const accName = (id) => { const a = data.accounts.find(x => x.id === id); return a ? a.name : '?'; };
    const isEditing = !!state.editingTxnId;

    if (state.currentType === 'transfer') {
      if (accSel.value === toSel.value) { showIoMsg('Akun asal dan tujuan harus beda.', 'error'); return; }
      const transferDesc = state.pendingTransferLabel || 'Transfer';
      const confirmMsg = isEditing
        ? `Simpan perubahan: ${transferDesc}\n${formatRp(amount)} dari ${accName(accSel.value)} ke ${accName(toSel.value)}, ${formatDayLabel(date)}?`
        : `${transferDesc}: ${formatRp(amount)}\ndari ${accName(accSel.value)} ke ${accName(toSel.value)}?`;
      const ok = await showConfirm(confirmMsg);
      if (!ok) return;
      if (isEditing) {
        const t = data.txns.find(x => x.id === state.editingTxnId);
        if (t) Object.assign(t, { date, type: 'transfer', desc: transferDesc, amount, accountId: accSel.value, toAccountId: toSel.value, category });
      } else {
        const newTransfer = {
          id: generateId('txn'), date, type: 'transfer',
          desc: transferDesc, amount, accountId: accSel.value, toAccountId: toSel.value, category
        };
        // Kalau transfer ini memang dari tombol "Bayar bulan ini" dan akun tujuannya cocok, tandai
        // plan-plan yang terbayar supaya periode cicilannya langsung dianggap lunas.
        if (state.pendingPlanPayment && state.pendingPlanPayment.accId === toSel.value && state.pendingPlanPayment.planIds.length) {
          newTransfer.planPaymentIds = state.pendingPlanPayment.planIds;
          newTransfer.planPaymentThrough = state.pendingPlanPayment.planPaymentThrough;
        }
        data.txns.push(newTransfer);
      }
      state.pendingTransferLabel = null;
      state.pendingPlanPayment = null;
    } else {
      const desc = descEl.value.trim();
      if (!desc) { descEl.focus(); return; }
      const label = state.currentType === 'masuk' ? 'Pemasukan' : 'Pengeluaran';
      const payAcc = data.accounts.find(a => a.id === accSel.value);
      const isPaylaterNew = !isEditing && state.currentType === 'keluar' && payAcc && payAcc.type === 'paylater';
      if (isPaylaterNew && $('paylater-method').value === 'cicilan') {
        // Cicilan PayLater: pokok + bunga flat + admin, dicatat di transaksi DAN di akun (rencana cicilan).
        const { tenor, rate, admin } = readPaylaterCicilanInput();
        if (tenor < 1 || tenor > 60) { $('paylater-tenor').focus(); showIoMsg('Isi tenor 1 sampai 60 bulan.', 'error'); return; }
        const c = computeFlatCicilan(Math.round(amount), tenor, rate, admin);
        const cicMsg = `Cicilan PayLater: ${desc}\n${formatRp(c.pokok)} — ${tenor} bulan, bunga flat ${rate}%/bln\nCicilan ${formatRp(c.monthly)}/bln · Bunga total ${formatRp(c.bunga)}` +
          (admin > 0 ? ` · Admin ${formatRp(admin)}` : '') + `\nTotal tagihan ${formatRp(c.total)} (masuk ke sisa hutang ${payAcc.name})\n\nTambahkan?`;
        const okCic = await showConfirm(cicMsg);
        if (!okCic) return;
        const planId = generateId('plan');
        const base = { date, type: 'keluar', accountId: accSel.value, planId, method: 'cicilan' };
        data.txns.push({ id: generateId('txn'), ...base, desc, amount: c.pokok, category });
        if (c.bunga > 0) data.txns.push({ id: generateId('txn'), ...base, desc: 'Bunga cicilan: ' + desc, amount: c.bunga, category: 'Bunga & biaya bank' });
        if (admin > 0) data.txns.push({ id: generateId('txn'), ...base, desc: 'Admin cicilan: ' + desc, amount: admin, category: 'Bunga & biaya bank' });
        if (!Array.isArray(payAcc.plans)) payAcc.plans = [];
        payAcc.plans.push({ id: planId, desc, date, pokok: c.pokok, tenor, ratePercent: rate, bunga: c.bunga, admin, monthly: c.monthly, total: c.total });
        descEl.value = '';
        amtEl.value = ''; catCustomEl.value = '';
        $('paylater-tenor').value = ''; $('paylater-rate').value = ''; $('paylater-admin').value = ''; $('paylater-method').value = 'nanti';
        saveData(data);
        render();
        closeTxnForm();
        return;
      }
      const confirmMsg = isEditing
        ? `Simpan perubahan: ${label} "${desc}"\n${formatRp(amount)} — ${accName(accSel.value)}, ${formatDayLabel(date)}?`
        : `${label}: ${desc}\n${formatRp(amount)} — ${accName(accSel.value)}\n\nTambahkan transaksi ini?`;
      const ok = await showConfirm(confirmMsg);
      if (!ok) return;
      if (isEditing) {
        const t = data.txns.find(x => x.id === state.editingTxnId);
        if (t) Object.assign(t, { date, type: state.currentType, desc, amount, accountId: accSel.value, category });
      } else {
        const newTxn = { id: generateId('txn'), date, type: state.currentType, desc, amount, accountId: accSel.value, category };
        if (isPaylaterNew) newTxn.method = 'nanti'; // Bayar nanti: bunga 0%
        data.txns.push(newTxn);
      }
      descEl.value = '';
    }
    amtEl.value = '';
    catCustomEl.value = '';
    saveData(data);
    render();
    if (isEditing) showIoMsg('Transaksi diperbarui.', 'ok');
    closeTxnForm();
  }


