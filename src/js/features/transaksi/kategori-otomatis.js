  // ============================================================
  // KATEGORI OTOMATIS DARI KETERANGAN (v1.1.142)
  // Saat mengetik keterangan di form transaksi baru, kategori dipilihkan otomatis (selama belum dipilih sendiri):
  //  1. RIWAYAT: transaksi lama berjenis sama yang keterangannya mirip (kata yang sama, tanpa kata umum seperti "bayar/beli") —
  //     kategori yang paling sering dipakai untuk keterangan itu menang.
  //  2. KATA KUNCI: daftar kata bawaan (beras → Belanja harian, bensin → Transportasi, listrik → Tagihan, dst.), dipakai bila riwayat belum ada.
  // Hanya kategori biasa yang disarankan (bukan "Lainnya", penyesuaian saldo, bunga/biaya bank, cicilan). Pilihan manual selalu menang.
  // Fungsi hitung murni: normalizeDescTokens, suggestCategory.
  // ============================================================
  const AUTO_CAT_EXCLUDE = ['Lainnya', 'Penyesuaian saldo', 'Bunga & biaya bank', 'Biaya admin & materai pinjaman', 'Cicilan/utang', 'Bayar tagihan/utang'];
  const AUTO_CAT_STOPWORDS = ['bayar', 'beli', 'untuk', 'dan', 'dari', 'yang', 'buat', 'ke', 'di', 'bulan', 'biaya', 'transaksi', 'pembayaran', 'kg', 'gram', 'liter', 'pcs', 'buah', 'rp', 'the', 'bln'];
  const AUTO_CAT_KEYWORDS = {
    keluar: {
      'Makan & minum': ['makan', 'minum', 'kopi', 'teh', 'nasi', 'mie', 'bakso', 'soto', 'sate', 'warung', 'warteg', 'resto', 'restoran', 'cafe', 'kafe', 'jajan', 'snack', 'camilan', 'sarapan', 'gofood', 'grabfood', 'shopeefood', 'jus', 'bukber', 'lunch', 'dinner', 'kantin', 'martabak', 'gorengan'],
      'Transportasi': ['bensin', 'pertamax', 'pertalite', 'solar', 'bbm', 'parkir', 'tol', 'etoll', 'ojek', 'ojol', 'gojek', 'grab', 'taksi', 'bus', 'kereta', 'krl', 'travel', 'tiket', 'servis', 'service', 'oli', 'ban', 'angkot', 'bengkel'],
      'Belanja harian': ['belanja', 'sembako', 'beras', 'telur', 'sayur', 'sayuran', 'gula', 'minyak', 'garam', 'tepung', 'sabun', 'shampo', 'sampo', 'deterjen', 'tisu', 'pasar', 'supermarket', 'indomaret', 'alfamart', 'alfamidi', 'bumbu', 'daging', 'ikan', 'susu', 'popok', 'gas', 'elpiji'],
      'Tagihan & langganan': ['listrik', 'token', 'pln', 'pdam', 'air', 'internet', 'wifi', 'indihome', 'pulsa', 'kuota', 'netflix', 'spotify', 'youtube', 'langganan', 'iuran', 'sewa', 'kontrakan', 'kos', 'pajak', 'stnk', 'asuransi', 'cicilan'],
      'Hiburan': ['nonton', 'bioskop', 'film', 'game', 'steam', 'konser', 'wisata', 'liburan', 'rekreasi', 'karaoke', 'mainan', 'hobi', 'rekreasi', 'staycation', 'hotel'],
      'Kesehatan': ['obat', 'apotek', 'dokter', 'rumah sakit', 'klinik', 'puskesmas', 'bpjs', 'vitamin', 'periksa', 'vaksin', 'gigi', 'lab', 'rontgen', 'bidan'],
      'Pendidikan': ['sekolah', 'spp', 'kuliah', 'buku', 'les', 'kursus', 'seragam', 'ujian', 'pelatihan', 'uang pangkal', 'alat tulis', 'atk'],
      'Upacara/Ibadah': ['zakat', 'sedekah', 'infaq', 'infak', 'donasi', 'persembahan', 'canang', 'banten', 'upacara', 'odalan', 'piodalan', 'kurban', 'qurban', 'masjid', 'gereja', 'pura', 'ngaben', 'dana punia', 'punia']
    },
    masuk: {
      'Gaji': ['gaji', 'salary', 'upah', 'honor'],
      'Bonus/THR': ['bonus', 'thr', 'insentif', 'komisi', 'tunjangan'],
      'Hasil usaha': ['panen', 'omzet', 'penjualan', 'dagang', 'laba', 'untung', 'usaha', 'hasil tani', 'hasil kebun', 'hasil ternak'],
      'Hadiah': ['hadiah', 'kado', 'angpao', 'hibah', 'giveaway', 'undian'],
      'Cashback/bunga': ['cashback', 'bunga', 'reward', 'dividen', 'poin'],
      'Jual barang': ['jual', 'terjual', 'lelang']
    }
  };

  // ---------- Kata kunci buatan sendiri (v1.1.163): tersimpan di perangkat ini, MENANG atas riwayat dan kata bawaan ----------
  const CUSTOM_KW_KEY = 'keuangan-kata-kunci-v1';
  const CUSTOM_KW_MAX = 100;   // total kata
  // Murni: { keluar: {kategori: [kata]}, masuk: {...} } -> hanya kategori yang valid untuk jenisnya, kata huruf kecil 2-30 karakter, unik.
  function sanitizeCustomKeywords(raw) {
    const out = { keluar: {}, masuk: {} };
    if (!raw || typeof raw !== 'object') return out;
    let total = 0;
    ['keluar', 'masuk'].forEach(type => {
      const src = raw[type];
      if (!src || typeof src !== 'object') return;
      const valid = (typeof categoryAll === 'function' ? categoryAll(type) : (typeof CATEGORIES !== 'undefined' ? CATEGORIES[type] : [])) || [];
      Object.keys(src).forEach(cat => {
        if (valid.indexOf(cat) < 0 || AUTO_CAT_EXCLUDE.indexOf(cat) >= 0 || !Array.isArray(src[cat])) return;
        const words = [];
        src[cat].forEach(w => {
          const k = String(w == null ? '' : w).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
          if (k.length >= 2 && k.length <= 30 && words.indexOf(k) < 0 && total < CUSTOM_KW_MAX) { words.push(k); total++; }
        });
        if (words.length) out[type][cat] = words;
      });
    });
    return out;
  }
  function loadCustomKeywords() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(CUSTOM_KW_KEY) || 'null'); } catch (e) { /* abaikan */ }
    return sanitizeCustomKeywords(raw);
  }
  function customKeywordList(kw) {
    const l = [];
    ['keluar', 'masuk'].forEach(type => Object.keys(kw[type]).forEach(cat => kw[type][cat].forEach(w => l.push({ type, cat, word: w }))));
    return l;
  }

  // Kata-kata penting dari keterangan: huruf kecil, tanpa tanda baca, tanpa kata umum dan angka.
  function normalizeDescTokens(s) {
    const out = [];
    String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).forEach(w => {
      if (w.length >= 2 && !/^\d+$/.test(w) && AUTO_CAT_STOPWORDS.indexOf(w) < 0 && out.indexOf(w) < 0) out.push(w);
    });
    return out;
  }

  // Return { category, source: 'riwayat' | 'kata kunci', match } atau null. categories = daftar kategori yang tersedia untuk jenis itu.
  function suggestCategory(desc, type, txns, categories, custom) {
    if (type !== 'keluar' && type !== 'masuk') return null;
    const toks = normalizeDescTokens(desc);
    if (!toks.length) return null;
    const allowed = (categories || (typeof categoryList === 'function' ? categoryList(type) : (typeof CATEGORIES !== 'undefined' ? CATEGORIES[type] : [])) || []).filter(c => AUTO_CAT_EXCLUDE.indexOf(c) < 0);
    if (!allowed.length) return null;
    const tokSet = new Set(toks);
    // 0. kata kunci buatan sendiri
    {
      const lowerC = ' ' + String(desc).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ') + ' ';
      const ck = (custom || loadCustomKeywords())[type] || {};
      for (const cat of Object.keys(ck)) {
        if (allowed.indexOf(cat) < 0) continue;
        const w = ck[cat].find(k => lowerC.indexOf(' ' + k + ' ') >= 0 || (k.length >= 4 && lowerC.indexOf(' ' + k) >= 0));
        if (w) return { category: cat, source: 'kata kunci sendiri', match: w };
      }
    }
    // 1. riwayat
    const score = {}, last = {}, via = {};
    (txns || []).forEach((t, i) => {
      if (t.type !== type || !t.category || allowed.indexOf(t.category) < 0 || !t.desc) return;
      const ht = normalizeDescTokens(t.desc);
      if (!ht.length) return;
      let hit = 0; ht.forEach(w => { if (tokSet.has(w)) hit++; });
      if (!hit) return;
      const sim = hit / Math.min(ht.length, toks.length);   // koefisien tumpang tindih: "telur" cocok penuh dengan "telur 1 kg"
      if (sim < 0.5) return;
      score[t.category] = (score[t.category] || 0) + sim;
      if (!(t.category in last) || (t.date || '') >= last[t.category]) { last[t.category] = t.date || ''; via[t.category] = t.desc; }
    });
    const ranked = Object.keys(score).sort((a, b) => score[b] - score[a] || (last[b] < last[a] ? -1 : 1));
    if (ranked.length) return { category: ranked[0], source: 'riwayat', match: via[ranked[0]] };
    // 2. kata kunci bawaan
    const lower = ' ' + String(desc).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ') + ' ';
    const kw = AUTO_CAT_KEYWORDS[type] || {};
    let best = null, bestN = 0, bestWord = '';
    Object.keys(kw).forEach(builtin => {
      const cat = typeof categoryAliasOf === 'function' ? categoryAliasOf(type, builtin) : builtin;   // kategori bawaan yang diganti nama tetap memakai kata kunci aslinya
      if (allowed.indexOf(cat) < 0) return;
      let n = 0, w0 = '';
      kw[builtin].forEach(k => { if (lower.indexOf(' ' + k + ' ') >= 0 || (k.length >= 4 && lower.indexOf(' ' + k) >= 0)) { n++; if (!w0) w0 = k; } });
      if (n > bestN) { best = cat; bestN = n; bestWord = w0; }
    });
    return best ? { category: best, source: 'kata kunci', match: bestWord } : null;
  }

  // ---------- Form ----------
  state.catManual = false;

  function applyAutoCategory(desc) {
    const hint = $('cat-auto-hint');
    if (!hint) return;
    if (state.editingTxnId || state.currentType === 'transfer' || state.catManual) { hint.style.display = 'none'; return; }
    const s = suggestCategory(desc, state.currentType, loadData().txns);
    const sel = $('category-select');
    if (!s || !Array.from(sel.options).some(o => o.value === s.category)) { hint.style.display = 'none'; return; }
    sel.value = s.category;
    onCategoryChange();
    hint.textContent = 'Kategori otomatis: ' + s.category + (s.source === 'riwayat' ? ' (dari riwayat "' + s.match + '")' : (s.source === 'kata kunci sendiri' ? ' (dari kata kunci Anda "' + s.match + '")' : ' (dari kata "' + s.match + '")')) + '. Ubah kategori bila kurang tepat.';
    hint.style.display = '';
  }
  function onDescInput() { applyAutoCategory($('desc-input').value); }
  // Mode pecah: pakai baris dengan jumlah terbesar yang kategorinya bisa ditebak.
  function onSplitDescInput() {
    const rows = splitReadParts().filter(p => p.desc && p.desc.trim());
    rows.sort((a, b) => (roundMoney(Number(b.amount)) || 0) - (roundMoney(Number(a.amount)) || 0));
    let done = false;
    for (const r of rows) {
      if (suggestCategory(r.desc, state.currentType, loadData().txns)) { applyAutoCategory(r.desc); done = true; break; }
    }
    if (!done) applyAutoCategory('');
    if (typeof autoSplitCats === 'function') autoSplitCats();
  }
  function resetAutoCategory() {
    state.catManual = false;
    const hint = $('cat-auto-hint'); if (hint) hint.style.display = 'none';
  }

  // ---------- Pengaturan di Profil ----------
  function renderCustomKeywords() {
    const typeEl = $('ck-type'); if (!typeEl) return;
    const type = typeEl.value === 'masuk' ? 'masuk' : 'keluar';
    const cats = categoryList(type).filter(c => AUTO_CAT_EXCLUDE.indexOf(c) < 0);
    const prev = $('ck-cat').value;
    $('ck-cat').innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    if (cats.indexOf(prev) >= 0) $('ck-cat').value = prev;
    const list = customKeywordList(loadCustomKeywords());
    $('ck-count').textContent = list.length ? list.length + ' kata' : '';
    $('ck-list').innerHTML = list.length ? list.map((e, i) => `<div class="budget-top sub-row"><span class="budget-name">${escapeHtml(e.word)}<span class="acc-sub"> → ${escapeHtml(e.cat)} (${e.type === 'masuk' ? 'masuk' : 'keluar'})</span></span><span class="sub-actions"><button type="button" class="see-all-btn" data-act="removeCustomKeyword" data-n0="${i}">Hapus</button></span></div>`).join('') : '<div class="acc-sub">Belum ada. Contoh: kata "pupuk" → kategori yang Anda pilih.</div>';
  }
  function saveCustomKeywords(kw) {
    try { settingSet(CUSTOM_KW_KEY, JSON.stringify(kw)); } catch (e) { showToast('Gagal menyimpan di perangkat ini.', 'error'); }
  }
  function addCustomKeyword() {
    const type = $('ck-type').value === 'masuk' ? 'masuk' : 'keluar';
    const cat = $('ck-cat').value;
    const msg = $('ck-msg');
    const kw = loadCustomKeywords();
    const before = customKeywordList(kw).length;
    (kw[type][cat] = kw[type][cat] || []).push(...String($('ck-word').value).split(','));
    const after = sanitizeCustomKeywords(kw);
    const n = customKeywordList(after).length;
    if (n === before) { msg.textContent = before >= CUSTOM_KW_MAX ? 'Maksimal ' + CUSTOM_KW_MAX + ' kata.' : 'Isi kata (2–30 huruf/angka) yang belum ada.'; return; }
    // kata yang sama tidak boleh ada di dua kategori (jenis sama): yang baru menggantikan
    const w0 = after[type][cat];
    Object.keys(after[type]).forEach(c => { if (c !== cat) after[type][c] = after[type][c].filter(w => w0.indexOf(w) < 0); if (!after[type][c].length) delete after[type][c]; });
    saveCustomKeywords(after);
    $('ck-word').value = ''; msg.textContent = '';
    renderCustomKeywords();
  }
  function removeCustomKeyword(i) {
    const kw = loadCustomKeywords();
    const e = customKeywordList(kw)[i];
    if (!e) return;
    kw[e.type][e.cat] = kw[e.type][e.cat].filter(w => w !== e.word);
    if (!kw[e.type][e.cat].length) delete kw[e.type][e.cat];
    saveCustomKeywords(kw);
    renderCustomKeywords();
  }
