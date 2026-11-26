  // ============================================================
  // PECAH TRANSAKSI PER KETERANGAN (v1.1.139, diubah v1.1.141)
  // Satu struk berisi beberapa barang/keterangan (mis. telur, sabun, gula) dicatat per keterangan: satu akun, satu tanggal,
  // tetapi tiap baris punya keterangan dan jumlah sendiri. Tersimpan sebagai beberapa transaksi biasa yang berbagi `splitId`, jadi saldo,
  // anggaran, laporan, grafik, CSV, dan sinkron otomatis benar tanpa mengubah satu pun perhitungan.
  // Tiap baris boleh punya kategori sendiri (pilihan di bawah barisnya); kosong = ikut kategori utama. Total struk dihitung otomatis dari jumlah semua baris. Maksimal 5 baris (minimal 2). Setelah tersimpan tiap baris berdiri sendiri
  // (edit/hapus satuan); detail transaksi menampilkan baris lain dari struk yang sama.
  // Fungsi hitung murni: cleanSplitId, splitTotalOf, validateSplitParts, buildSplitTxns, splitSiblings.
  // ============================================================
  const SPLIT_MAX_PARTS = 5;
  const SPLIT_MIN_PARTS = 2;

  function cleanSplitId(x) { return typeof x === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(x) ? x : ''; }

  // Total struk otomatis = jumlah semua baris (jumlah kosong/tidak valid dihitung 0).
  function splitTotalOf(parts) {
    return roundMoney((parts || []).reduce((s, p) => { const a = roundMoney(Number(p && p.amount)); return s + (a > 0 ? a : 0); }, 0));
  }

  // parts = [{ desc, amount, category? }] (jumlah boleh teks/angka). Hasil: { ok, error, parts, total }.
  function validateSplitParts(parts) {
    const out = [];
    for (const p of (parts || [])) {
      const desc = String(p && p.desc != null ? p.desc : '').replace(/\s+/g, ' ').trim().slice(0, 80);
      const amt = roundMoney(Number(p && p.amount));
      if (!desc || !(amt > 0)) return { ok: false, error: 'Isi keterangan dan jumlah di setiap baris.', parts: [], total: 0 };
      const cat = String(p && p.category != null ? p.category : '').replace(/\s+/g, ' ').trim().slice(0, 40);
      out.push(cat ? { desc, amount: amt, category: cat } : { desc, amount: amt });
    }
    if (out.length < SPLIT_MIN_PARTS) return { ok: false, error: 'Isi minimal dua baris keterangan.', parts: out, total: splitTotalOf(out) };
    if (out.length > SPLIT_MAX_PARTS) return { ok: false, error: 'Maksimal ' + SPLIT_MAX_PARTS + ' baris.', parts: out, total: splitTotalOf(out) };
    return { ok: true, error: '', parts: out, total: splitTotalOf(out) };
  }

  // base = { date, type, accountId, category, method? }; makeId dioper dari luar supaya fungsi tetap murni.
  function buildSplitTxns(base, parts, splitId, tags, makeId) {
    return parts.map(p => {
      const t = { id: makeId('txn'), ...base, desc: p.desc, amount: p.amount, splitId };
      if (p.category) t.category = p.category;   // kategori khusus baris ini; kosong = ikut kategori utama (base)
      if (tags && tags.length) t.tags = tags.slice();
      return t;
    });
  }

  // Semua transaksi dalam struk yang sama (termasuk t), terbesar dulu. Kosong bila bukan hasil pecahan atau sisa satu.
  function splitSiblings(txns, t) {
    const id = t && cleanSplitId(t.splitId);
    if (!id) return [];
    const list = (txns || []).filter(x => x.splitId === id);
    return list.length > 1 ? list.sort((a, b) => b.amount - a.amount) : [];
  }

  // Murni (v1.1.166): bentuk isian form dari baris-baris struk (urutan data). Kategori utama = yang paling sering; baris yang sama dengannya dikosongkan.
  // Return { category, date, accountId, type, method, tags, parts: [{ desc, amount, category }] } atau null.
  function splitFormFromSiblings(sibs) {
    if (!sibs || sibs.length < 1) return null;
    const cnt = {};
    sibs.forEach(s => { cnt[s.category] = (cnt[s.category] || 0) + 1; });
    const main = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    const f = sibs[0];
    return { category: main, date: f.date, accountId: f.accountId, type: f.type, method: f.method || '', tags: f.tags ? f.tags.slice() : [],
      parts: sibs.map(s => ({ desc: s.desc || '', amount: s.amount, category: s.category && s.category !== main ? s.category : '' })) };
  }
  // Murni: ganti baris lama dengan baris baru dalam urutan; ID lama dipakai ulang per posisi supaya referensi tetap stabil.
  function replaceSplitTxns(txns, splitId, newTxns) {
    const old = (txns || []).filter(x => x.splitId === splitId);
    const rest = (txns || []).filter(x => x.splitId !== splitId);
    return rest.concat(newTxns.map((t, i) => old[i] ? { ...t, id: old[i].id } : t));
  }

  // ---------- Form ----------
  state.editingSplitId = null;
  state.splitMode = false; state.splitCount = SPLIT_MIN_PARTS; state.splitWasOn = false; state.splitCatManual = [];

  function splitReadParts() {
    const out = [];
    for (let i = 0; i < state.splitCount; i++) { const c = $('split-cat-' + i); out.push({ desc: $('split-desc-' + i).value, amount: $('split-amt-' + i).value, category: c ? c.value : '' }); }
    return out;
  }
  // Pilihan kategori per baris: "Sama dengan kategori di atas" (kosong) lalu semua kategori jenis ini. Nilai terpilih dipertahankan.
  function populateSplitCats() {
    const list = categoryList(state.currentType) || [];
    for (let i = 0; i < SPLIT_MAX_PARTS; i++) {
      const s = $('split-cat-' + i); if (!s) continue;
      const cur = s.value;
      s.innerHTML = '<option value="">Kategori: sama dengan di atas</option>' + list.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
      s.value = list.indexOf(cur) >= 0 ? cur : '';
    }
  }
  // Kategori otomatis per baris (v1.1.154): tiap baris yang kategorinya belum dipilih sendiri ditebak dari keterangannya
  // (riwayat lalu kata kunci, sama seperti kategori utama). Bila tebakan sama dengan kategori utama, baris dibiarkan "sama dengan di atas".
  function autoSplitCats() {
    if (!state.splitMode) return;
    const main = $('category-select').value, type = state.currentType, txns = loadData().txns;
    for (let i = 0; i < state.splitCount; i++) {
      const s = $('split-cat-' + i);
      if (!s || state.splitCatManual[i]) continue;
      const d = $('split-desc-' + i).value;
      const sg = d && d.trim() ? suggestCategory(d, type, txns) : null;
      const want = sg && sg.category !== main && Array.from(s.options).some(o => o.value === sg.category) ? sg.category : '';
      if (s.value !== want) s.value = want;
    }
  }
  function onSplitCatChange() {
    const m = /split-cat-(\d)/.exec(this && this.id || '');
    if (m) state.splitCatManual[Number(m[1])] = true;
  }
  function refreshSplitUI() {
    const on = !!state.splitMode;
    $('split-box').style.display = on ? '' : 'none';
    $('desc-row').style.display = on || state.currentType === 'transfer' ? 'none' : 'flex';
    const btn = $('split-toggle-btn'); if (btn) btn.textContent = on ? 'Batal pecah, satu keterangan saja' : 'Pecah per keterangan (rincian struk)';
    const lbl = document.querySelector('label[for="amount-input"]'); if (lbl) lbl.textContent = on ? 'Total struk (otomatis)' : 'Jumlah';
    for (let i = 0; i < SPLIT_MAX_PARTS; i++) { const r = $('split-row-' + i); if (r) r.style.display = i < state.splitCount ? 'flex' : 'none'; }
    const add = $('split-add-btn'); if (add) add.style.display = state.splitCount >= SPLIT_MAX_PARTS ? 'none' : '';
    for (let i = 0; i < SPLIT_MAX_PARTS; i++) { const d = $('split-del-' + i); if (d) d.style.display = state.splitCount > SPLIT_MIN_PARTS ? '' : 'none'; }
    lockSplitTotal(on);
    if (on) populateSplitCats();
    if (on) updateSplitRemain(); else if (state.splitWasOn) $('amount-input').value = '';
    state.splitWasOn = on;
  }
  // Mode pecah: kolom Total struk terkunci dan terisi otomatis dari jumlah semua baris.
  function updateSplitRemain() {
    const el = $('split-remain'), amt = $('amount-input');
    if (!el || !state.splitMode) return;
    const total = splitTotalOf(splitReadParts());
    amt.value = total > 0 ? total : '';
    el.textContent = total > 0 ? 'Total struk otomatis dari semua baris: ' + formatRp(total) : 'Isi keterangan dan jumlah tiap baris; total struk terhitung otomatis.';
    el.style.color = total > 0 ? 'var(--green-ink)' : '';
  }
  function lockSplitTotal(on) {
    const amt = $('amount-input'), text = amt && amt.parentNode && amt.parentNode.querySelector('input.cmoney');
    if (text) { text.readOnly = !!on; text.setAttribute('aria-readonly', on ? 'true' : 'false'); }
    if (text && text.parentNode) text.parentNode.classList.toggle('split-locked', !!on);
  }
  function updateSplitToggle() {
    const row = $('split-toggle-row');
    if (!row) return;
    if (state.editingSplitId) { row.style.display = 'none'; return; }
    const can = state.currentType !== 'transfer' && !state.editingTxnId;
    row.style.display = can ? 'flex' : 'none';
    if (!can && state.splitMode) { state.splitMode = false; refreshSplitUI(); }
  }
  function toggleSplitMode() {
    state.splitMode = !state.splitMode;
    if (state.splitMode) {
      state.splitCount = SPLIT_MIN_PARTS; state.splitCatManual = [];
      for (let i = 0; i < SPLIT_MAX_PARTS; i++) { $('split-desc-' + i).value = ''; $('split-amt-' + i).value = ''; $('split-cat-' + i).value = ''; }
      const d = $('desc-input').value.trim(); if (d) $('split-desc-0').value = d;
    }
    refreshSplitUI();
    if (state.splitMode) $('split-desc-' + (($('split-desc-0').value) ? 1 : 0)).focus();
  }
  function addSplitRow() {
    if (state.splitCount >= SPLIT_MAX_PARTS) return;
    const i = state.splitCount++; state.splitCatManual[i] = false;
    $('split-desc-' + i).value = ''; $('split-amt-' + i).value = ''; $('split-cat-' + i).value = '';
    refreshSplitUI();
    $('split-desc-' + i).focus();
  }
  function removeSplitRow(i) {
    if (state.splitCount <= SPLIT_MIN_PARTS) return;
    const rows = splitReadParts(); rows.splice(i, 1); state.splitCatManual.splice(i, 1);
    state.splitCount--;
    rows.forEach((p, k) => { $('split-desc-' + k).value = p.desc; $('split-amt-' + k).value = p.amount; $('split-cat-' + k).value = p.category || ''; });
    $('split-desc-' + state.splitCount).value = ''; $('split-amt-' + state.splitCount).value = ''; $('split-cat-' + state.splitCount).value = '';
    refreshSplitUI();
  }
  function resetSplitUI() {
    state.splitMode = false; state.splitCount = SPLIT_MIN_PARTS; state.splitCatManual = [];
    if ($('split-box')) refreshSplitUI();
  }

  // Simpan: dipanggil addTxn bila mode pecah aktif (pemasukan/pengeluaran baru). category sudah ditentukan addTxn.
  async function saveSplitTxn(category, tags) {
    const data = loadData();
    const v = validateSplitParts(splitReadParts());
    if (!v.ok) { showIoMsg(v.error, 'error'); return; }
    const accId = $('account-select').value;
    const payAcc = data.accounts.find(a => a.id === accId);
    const date = $('date-input').value || todayStr();
    const type = state.currentType;
    const base = { date, type, accountId: accId, category };
    if (type === 'keluar' && payAcc && payAcc.type === 'paylater') {
      if ($('paylater-method').value === 'cicilan') { showIoMsg('Cicilan PayLater tidak bisa dipecah. Pilih "Bayar nanti" atau catat satu per satu.', 'error'); return; }
      base.method = 'nanti';
    }
    const editSid = state.editingSplitId;
    const oldIds = editSid ? data.txns.filter(x => x.splitId === editSid).map(x => x.id) : [];
    const odS = overdraftMessage(data, [{ type, amount: v.total, accountId: accId }], oldIds);
    if (odS) { showIoMsg(odS, 'error'); return; }
    const lines = v.parts.map(p => '• ' + p.desc + ' ' + formatRp(p.amount) + (p.category && p.category !== category ? ' [' + p.category + ']' : '')).join('\n');
    const okc = await showConfirm((type === 'masuk' ? 'Pemasukan' : 'Pengeluaran') + ' (' + category + ') — ' + (payAcc ? payAcc.name : '?') + '\n' + lines + '\nTotal ' + formatRp(v.total) + '\n\n' + (editSid ? 'Simpan perubahan struk ini dengan ' : 'Tambahkan ') + v.parts.length + ' transaksi ini?');
    if (!okc) return;
    const splitKey = editSid || generateId('split');
    const built = buildSplitTxns(base, v.parts, splitKey, tags, generateId);
    if (editSid) data.txns = replaceSplitTxns(data.txns, editSid, built); else built.forEach(t => data.txns.push(t));
    $('desc-input').value = ''; $('amount-input').value = ''; $('category-custom-input').value = '';
    resetSplitUI();
    saveData(data);
    render();
    if (!editSid && typeof commitPendingPhoto === 'function') await commitPendingPhoto(splitKey);
    closeTxnForm();
  }

  // Hapus semua baris satu struk pecahan sekaligus (v1.1.150).
  async function deleteSplitFromDetail() {
    const data = loadData();
    const t = data.txns.find(x => x.id === state.detailTxnId);
    const sibs = t ? splitSiblings(data.txns, t) : [];
    if (!sibs.length) return;
    const total = sibs.reduce((s2, x) => s2 + x.amount, 0);
    if (!(await showConfirm('Hapus seluruh struk ini (' + sibs.length + ' baris, total ' + formatRp(total) + ')?'))) return;
    const ids = new Set(sibs.map(x => x.id));
    data.txns = data.txns.filter(x => !ids.has(x.id));
    saveData(data);
    closeTxnDetail();
    if (typeof photoCleanup === 'function') photoCleanup();
    render();
  }

  // Edit seluruh struk dari detail transaksi (v1.1.166): form Tambah dibuka dalam mode pecah, terisi dari semua baris; simpan = ganti semua baris.
  function startEditSplit() {
    const data = loadData();
    const t = data.txns.find(x => x.id === state.detailTxnId);
    const sid = t && cleanSplitId(t.splitId);
    if (!sid) return;
    const sibs = data.txns.filter(x => x.splitId === sid);
    const f = splitFormFromSiblings(sibs);
    if (!f || sibs.length < SPLIT_MIN_PARTS) return;
    closeTxnDetail();
    state.editingTxnId = null; state.editingSplitId = null;
    resetSplitUI();
    if (typeof resetFormPhoto === 'function') resetFormPhoto();
    resetAutoCategory();
    const accSel = $('account-select');
    ensureArchivedOption(accSel, data, f.accountId);
    if (Array.from(accSel.options).some(o => o.value === f.accountId)) accSel.value = f.accountId;
    setType(f.type);
    updateTypeAvailability();
    const catSel = $('category-select'), catCustomEl = $('category-custom-input');
    if (typeof ensureCategoryOption === 'function') ensureCategoryOption(catSel, state.currentType, f.category);
    if (f.category && Array.from(catSel.options).some(o => o.value === f.category)) { catSel.value = f.category; catCustomEl.value = ''; }
    else if (f.category) { catSel.value = CATEGORY_CUSTOM; catCustomEl.value = f.category; }
    onCategoryChange();
    setTagsInput(f.tags);
    $('date-input').value = f.date;
    if (f.method === 'nanti') $('paylater-method').value = 'nanti';
    state.editingSplitId = sid;
    state.splitMode = true; state.splitCount = Math.min(SPLIT_MAX_PARTS, f.parts.length);
    state.splitCatManual = f.parts.map(p => !!p.category);
    for (let i = 0; i < SPLIT_MAX_PARTS; i++) { $('split-desc-' + i).value = ''; $('split-amt-' + i).value = ''; }
    refreshSplitUI();
    f.parts.slice(0, SPLIT_MAX_PARTS).forEach((p, i) => { $('split-desc-' + i).value = p.desc; $('split-amt-' + i).value = p.amount; $('split-cat-' + i).value = p.category; });
    updateSplitRemain();
    updateSplitToggle();
    $('txn-form-title').textContent = 'Edit seluruh struk';
    $('txn-submit-btn').textContent = 'Simpan perubahan struk';
    $('txn-cancel-btn').style.display = 'block';
    $('txn-form').classList.add('open');
  }
