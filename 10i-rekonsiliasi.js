  // ============================================================
  // REKONSILIASI SALDO (v1.1.067) — akun kas / bank / e-wallet.
  // Pengguna mengisi saldo asli (mis. dari mutasi bank), app menampilkan selisihnya terhadap saldo tercatat.
  // Kalau berbeda, selisih bisa dicatat sebagai transaksi kategori "Penyesuaian saldo" (masuk/keluar) yang
  // TIDAK dihitung sebagai pemasukan/pengeluaran (lihat isNonOperatingTxn). Tidak ada yang tercatat tanpa ketukan tombol.
  // Fungsi hitung murni: computeReconcileDiff (01-data.js).
  // ============================================================
  function renderReconcilePanel(data, acc) {
    const wrap = $('acc-detail-recon');
    if (!wrap) return;
    if (!RECONCILE_TYPES[acc.type]) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    const inp = $('recon-actual-input');
    if (inp) inp.value = '';
    const res = $('recon-result');
    if (res) { res.textContent = ''; res.className = 'acc-sub'; }
    const btn = $('recon-apply-btn');
    if (btn) btn.style.display = 'none';
  }

  function reconcileRead() {
    const id = detailAccountId;
    const data = loadData();
    const acc = id && data.accounts.find(a => a.id === id);
    if (!acc || !RECONCILE_TYPES[acc.type]) return null;
    const raw = String($('recon-actual-input').value).trim();
    const actual = parseFloat(raw);
    if (raw === '' || !isFinite(actual)) return { data, acc, invalid: true };
    const bal = accountBalance(data, id);
    return { data, acc, bal, actual, diff: computeReconcileDiff(bal, actual) };
  }

  function reconcileCheck() {
    const r = reconcileRead();
    if (!r) return;
    const res = $('recon-result'), btn = $('recon-apply-btn');
    if (r.invalid) { $('recon-actual-input').focus(); showIoMsg('Isi saldo asli dulu.', 'error', 'recon-msg'); return; }
    if (r.diff === 0) {
      res.textContent = 'Sudah cocok: saldo di app sama dengan saldo asli (' + formatRp(r.bal) + ').';
      res.className = 'acc-sub';
      btn.style.display = 'none';
      return;
    }
    const kurang = r.diff > 0;
    res.textContent = 'Saldo di app ' + formatRp(r.bal) + ', saldo asli ' + formatRp(r.actual) + '. Selisih ' + (kurang ? '+' : '−') + formatRp(Math.abs(r.diff)) +
      (kurang ? ' (ada pemasukan yang belum tercatat).' : ' (ada pengeluaran yang belum tercatat).') + ' Cek dulu transaksi yang mungkin terlewat sebelum dicatat sebagai penyesuaian.';
    res.className = 'acc-sub u-mb8';
    btn.textContent = 'Catat penyesuaian ' + (kurang ? '+' : '−') + formatRp(Math.abs(r.diff));
    btn.style.display = '';
  }

  function reconcileApply() {
    const r = reconcileRead();
    if (!r || r.invalid) { showIoMsg('Isi saldo asli dulu.', 'error', 'recon-msg'); return; }
    if (r.diff === 0) { reconcileCheck(); return; }
    r.data.txns.push({
      id: generateId('txn'), date: todayStr(), type: r.diff > 0 ? 'masuk' : 'keluar',
      desc: 'Penyesuaian saldo (rekonsiliasi)', amount: Math.abs(r.diff), accountId: r.acc.id, category: RECONCILE_CATEGORY
    });
    saveData(r.data);
    render();
    openAccountDetail(r.acc.id);
    showIoMsg('Penyesuaian ' + formatRp(Math.abs(r.diff)) + ' dicatat. Saldo sekarang ' + formatRp(r.actual) + '.', 'ok', 'recon-msg');
  }
