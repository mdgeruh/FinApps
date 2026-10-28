  // ============================================================
  // KATEGORI: MODEL DATA DAN OPERASI (v1.1.178)
  // Daftar kategori bawaan ada di CATEGORIES (data.js). Pengaturan pemilik disimpan di data.categories (ikut sinkron dan ekspor):
  //   { custom: { keluar:[nama], masuk:[], transfer:[] },   // kategori buatan sendiri
  //     hidden: { ... },                                     // disembunyikan dari pilihan form (riwayat tetap utuh)
  //     renames: { keluar: { 'Nama bawaan': 'Nama baru' } } } // nama bawaan yang diganti
  // Transaksi tetap menyimpan nama kategori sebagai teks, jadi tidak ada migrasi. Ubah nama/gabung menulis ulang transaksi,
  // anggaran, dan transaksi berulang yang memakai nama itu. Kategori yang dipakai perhitungan (bunga, cicilan, penyesuaian saldo,
  // dll.) DIKUNCI: tidak boleh diubah nama, disembunyikan, digabung, atau dihapus.
  // Fungsi operasi mengubah objek data di tempat dan mengembalikan { ok, error?, ... }; pemanggil yang menyimpan (saveData).
  // ============================================================
  const CATEGORY_TYPES = ['keluar', 'masuk', 'transfer'];
  const CATEGORY_TYPE_LABELS = { keluar: 'Pengeluaran', masuk: 'Pemasukan', transfer: 'Transfer' };
  const CATEGORY_NAME_MAX = 30;
  const CATEGORY_CUSTOM_MAX = 40;   // kategori buatan sendiri per jenis
  const CATEGORY_LOCKED = ['Lainnya', 'Penyesuaian saldo', 'Cicilan/utang', 'Bayar tagihan/utang', 'Bunga & biaya bank', 'Biaya admin & materai pinjaman',
    'Tagihan & langganan', 'Titipan/piutang', 'Pindah dana antar akun', 'Beli/jual aset', 'Top up saldo'];

  function categoryKey(s) { return String(s == null ? '' : s).toLowerCase(); }
  function normalizeCategoryName(s) {
    return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, CATEGORY_NAME_MAX).trim();
  }
  function isCategoryLocked(name) { return CATEGORY_LOCKED.indexOf(name) >= 0; }

  function emptyCategoryConfig() {
    const o = { custom: {}, hidden: {}, renames: {} };
    CATEGORY_TYPES.forEach(t => { o.custom[t] = []; o.hidden[t] = []; o.renames[t] = {}; });
    return o;
  }

  // Nama efektif semua kategori satu jenis (termasuk yang disembunyikan): bawaan (sudah diganti nama) + buatan sendiri; "Lainnya" selalu terakhir.
  function categoryAllFor(cfg, type) {
    const base = CATEGORIES[type] || [];
    const out = base.filter(c => c !== CATEGORY_CUSTOM).map(c => cfg.renames[type][c] || c).concat(cfg.custom[type]);
    if (base.indexOf(CATEGORY_CUSTOM) >= 0) out.push(CATEGORY_CUSTOM);
    return out;
  }

  // Rapikan data.categories dari sumber apa pun (impor/sinkron): hanya nama valid, tanpa kembar (huruf besar/kecil diabaikan),
  // yang dikunci tidak ikut diubah/disembunyikan. Mengembalikan struktur lengkap (bukan null).
  function sanitizeCategoryConfig(raw) {
    const cfg = emptyCategoryConfig();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return cfg;
    CATEGORY_TYPES.forEach(type => {
      const base = CATEGORIES[type] || [];
      const seen = new Set(base.map(categoryKey));
      const rn = raw.renames && typeof raw.renames === 'object' && raw.renames[type] && typeof raw.renames[type] === 'object' ? raw.renames[type] : {};
      const usedNew = new Set();
      Object.keys(rn).forEach(orig => {
        if (base.indexOf(orig) < 0 || isCategoryLocked(orig)) return;
        const nn = normalizeCategoryName(rn[orig]);
        const k = categoryKey(nn);
        if (!nn || nn === orig || usedNew.has(k)) return;
        if (seen.has(k) && k !== categoryKey(orig)) return;   // bentrok dengan kategori lain
        usedNew.add(k); cfg.renames[type][orig] = nn;
      });
      // nama baru menggantikan nama bawaan lama di himpunan nama terpakai
      Object.keys(cfg.renames[type]).forEach(orig => { seen.delete(categoryKey(orig)); });
      Object.keys(cfg.renames[type]).forEach(orig => { seen.add(categoryKey(cfg.renames[type][orig])); });
      const cu = raw.custom && Array.isArray(raw.custom[type]) ? raw.custom[type] : [];
      cu.forEach(x => {
        const nn = normalizeCategoryName(x), k = categoryKey(nn);
        if (!nn || seen.has(k) || cfg.custom[type].length >= CATEGORY_CUSTOM_MAX) return;
        seen.add(k); cfg.custom[type].push(nn);
      });
      const all = categoryAllFor(cfg, type);
      const hid = raw.hidden && Array.isArray(raw.hidden[type]) ? raw.hidden[type] : [];
      hid.forEach(x => { if (typeof x === 'string' && all.indexOf(x) >= 0 && !isCategoryLocked(x) && cfg.hidden[type].indexOf(x) < 0) cfg.hidden[type].push(x); });
    });
    return cfg;
  }
  // Bentuk simpan: hanya bagian yang terisi; semuanya kosong -> null (kunci data.categories dihapus).
  function serializeCategoryConfig(cfg) {
    const out = { custom: {}, hidden: {}, renames: {} };
    let any = false;
    CATEGORY_TYPES.forEach(t => {
      if (cfg.custom[t].length) { out.custom[t] = cfg.custom[t].slice(); any = true; }
      if (cfg.hidden[t].length) { out.hidden[t] = cfg.hidden[t].slice(); any = true; }
      if (Object.keys(cfg.renames[t]).length) { out.renames[t] = Object.assign({}, cfg.renames[t]); any = true; }
    });
    return any ? out : null;
  }
  function categoryConfigOf(data) { return sanitizeCategoryConfig(data && data.categories); }
  function storeCategoryConfig(data, cfg) {
    const s = serializeCategoryConfig(cfg);
    if (s) data.categories = s; else delete data.categories;
  }

  // Konfigurasi yang sedang berlaku (dari data tersimpan). Di-cache menurut isi mentah penyimpanan, jadi ikut berubah
  // saat data berganti lewat sinkron atau impor tanpa perlu menyegarkan manual.
  let _categoryCfgCache = { raw: undefined, cfg: null };
  function categoryConfig() {
    let raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { /* abaikan */ }
    if (_categoryCfgCache.cfg && _categoryCfgCache.raw === raw) return _categoryCfgCache.cfg;
    let cfg = emptyCategoryConfig();
    if (raw && raw.indexOf('"categories"') >= 0) { try { cfg = categoryConfigOf(JSON.parse(raw)); } catch (e) { /* data rusak ditangani loadData */ } }
    _categoryCfgCache = { raw: raw, cfg: cfg };
    return cfg;
  }
  // Semua kategori satu jenis, termasuk yang disembunyikan (dipakai validasi anggaran, impor, kata kunci).
  function categoryAll(type, cfg) { return categoryAllFor(cfg || categoryConfig(), type); }
  // Kategori yang ditawarkan di form/pilihan (tanpa yang disembunyikan).
  function categoryList(type, cfg) {
    cfg = cfg || categoryConfig();
    const hid = cfg.hidden[type] || [];
    return categoryAllFor(cfg, type).filter(c => hid.indexOf(c) < 0);
  }
  // Nama efektif untuk kategori bawaan (mis. kata kunci otomatis bawaan yang disusun dengan nama aslinya).
  function categoryAliasOf(type, builtinName, cfg) { cfg = cfg || categoryConfig(); return (cfg.renames[type] && cfg.renames[type][builtinName]) || builtinName; }
  // Nama asli bila `name` adalah kategori bawaan (mungkin sudah diganti nama); null bila buatan sendiri.
  function categoryBuiltinOrigin(cfg, type, name) {
    const base = (CATEGORIES[type] || []).filter(c => c !== CATEGORY_CUSTOM);
    for (let i = 0; i < base.length; i++) if ((cfg.renames[type][base[i]] || base[i]) === name) return base[i];
    return null;
  }

  // Cek nama untuk kategori baru / nama baru. exceptName: nama yang sedang diubah (boleh ganti huruf besar/kecil saja).
  function validateCategoryName(cfg, type, raw, exceptName) {
    const name = normalizeCategoryName(raw);
    if (!name) return { error: 'Nama kategori tidak boleh kosong.' };
    const clash = categoryAllFor(cfg, type).find(c => categoryKey(c) === categoryKey(name) && c !== exceptName);
    if (clash) return { error: 'Sudah ada kategori "' + clash + '" untuk ' + CATEGORY_TYPE_LABELS[type].toLowerCase() + '.', clash: clash };
    return { name: name };
  }

  // ---------- Pemakaian ----------
  // { nama: { count, amount } } untuk transaksi jenis ini (semua waktu). Nama yang tidak terdaftar di daftar ikut muncul.
  function categoryUsage(data, type) {
    const out = {};
    ((data && data.txns) || []).forEach(t => {
      if (t.type !== type || !t.category) return;
      const e = out[t.category] || (out[t.category] = { count: 0, amount: 0 });
      e.count++; e.amount = roundMoney(e.amount + (t.amount || 0));
    });
    return out;
  }
  // Nama yang dipakai transaksi tetapi tidak ada di daftar (mis. diketik lewat "Lainnya"): [{ name, count }], terbanyak dulu.
  function categoryUnlisted(data, type, cfg) {
    cfg = cfg || categoryConfigOf(data);
    const known = new Set(categoryAllFor(cfg, type).map(categoryKey));
    const u = categoryUsage(data, type);
    return Object.keys(u).filter(n => !known.has(categoryKey(n))).map(n => ({ name: n, count: u[n].count })).sort((a, b) => b.count - a.count || (a.name < b.name ? -1 : 1));
  }
  // Berapa data yang akan terpengaruh bila nama `name` diubah/digabung/dihapus.
  function categoryRefs(data, type, name) {
    const txns = ((data && data.txns) || []).filter(t => t.type === type && t.category === name).length;
    const subs = ((data && data.subscriptions) || []).filter(s => (s.type || 'keluar') === type && s.category === name).length;
    const budget = type === 'keluar' && !!(data && data.budgets && typeof data.budgets[name] === 'number');
    return { txns: txns, subs: subs, budget: budget };
  }

  // Tulis ulang semua pemakai nama `from` menjadi `to`. Anggaran yang bertabrakan dijumlahkan.
  function categoryRewriteRefs(data, type, from, to) {
    let txns = 0, subs = 0, budget = false;
    (data.txns || []).forEach(t => { if (t.type === type && t.category === from) { t.category = to; txns++; } });
    (data.subscriptions || []).forEach(s => { if ((s.type || 'keluar') === type && s.category === from) { s.category = to; subs++; } });
    if (type === 'keluar' && data.budgets && typeof data.budgets[from] === 'number') {
      const v = data.budgets[from]; delete data.budgets[from];
      data.budgets[to] = roundMoney((typeof data.budgets[to] === 'number' ? data.budgets[to] : 0) + v);
      budget = true;
    }
    return { txns: txns, subs: subs, budget: budget };
  }

  // ---------- Operasi ----------
  function categoryAdd(data, type, raw) {
    if (CATEGORY_TYPES.indexOf(type) < 0) return { ok: false, error: 'Jenis tidak dikenal.' };
    const cfg = categoryConfigOf(data);
    const nn = normalizeCategoryName(raw);
    const hidden = categoryAllFor(cfg, type).find(c => categoryKey(c) === categoryKey(nn) && cfg.hidden[type].indexOf(c) >= 0);
    if (hidden) { cfg.hidden[type] = cfg.hidden[type].filter(c => c !== hidden); storeCategoryConfig(data, cfg); return { ok: true, name: hidden, revived: true }; }
    const v = validateCategoryName(cfg, type, raw);
    if (v.error) return { ok: false, error: v.error };
    if (cfg.custom[type].length >= CATEGORY_CUSTOM_MAX) return { ok: false, error: 'Maksimal ' + CATEGORY_CUSTOM_MAX + ' kategori buatan sendiri per jenis.' };
    cfg.custom[type].push(v.name);
    storeCategoryConfig(data, cfg);
    return { ok: true, name: v.name };
  }

  function categoryHide(data, type, name, hide) {
    const cfg = categoryConfigOf(data);
    if (isCategoryLocked(name)) return { ok: false, error: 'Kategori ini dipakai perhitungan, tidak bisa disembunyikan.' };
    if (categoryAllFor(cfg, type).indexOf(name) < 0) return { ok: false, error: 'Kategori tidak ditemukan.' };
    cfg.hidden[type] = cfg.hidden[type].filter(c => c !== name);
    if (hide) cfg.hidden[type].push(name);
    storeCategoryConfig(data, cfg);
    return { ok: true };
  }

  // Gabung `from` ke `to`: semua pemakai dipindah. Bawaan -> disembunyikan; buatan sendiri -> dihapus dari daftar; tak terdaftar -> hanya dipindah.
  function categoryMerge(data, type, from, to) {
    const cfg = categoryConfigOf(data);
    const all = categoryAllFor(cfg, type);
    if (isCategoryLocked(from)) return { ok: false, error: 'Kategori ini dipakai perhitungan, tidak bisa digabung ke kategori lain.' };
    if (from === to) return { ok: false, error: 'Pilih kategori tujuan yang berbeda.' };
    if (all.indexOf(to) < 0) return { ok: false, error: 'Kategori tujuan tidak ditemukan.' };
    if (cfg.hidden[type].indexOf(to) >= 0) return { ok: false, error: 'Kategori tujuan sedang disembunyikan. Tampilkan dulu.' };
    const r = categoryRewriteRefs(data, type, from, to);
    if (all.indexOf(from) >= 0) {
      if (categoryBuiltinOrigin(cfg, type, from)) { if (cfg.hidden[type].indexOf(from) < 0) cfg.hidden[type].push(from); }
      else { cfg.custom[type] = cfg.custom[type].filter(c => c !== from); cfg.hidden[type] = cfg.hidden[type].filter(c => c !== from); }
    }
    storeCategoryConfig(data, cfg);
    return { ok: true, merged: true, to: to, changed: r };
  }

  // Ubah nama. Bila nama baru sama dengan kategori lain yang sudah ada -> digabung ke kategori itu (ejaan kategori yang ada dipakai).
  function categoryRename(data, type, from, toRaw) {
    const cfg = categoryConfigOf(data);
    if (isCategoryLocked(from)) return { ok: false, error: 'Kategori ini dipakai perhitungan, tidak bisa diubah namanya.' };
    const listed = categoryAllFor(cfg, type).indexOf(from) >= 0;
    const v = validateCategoryName(cfg, type, toRaw, from);
    if (v.error) {
      if (v.clash && v.clash !== from) return categoryMerge(data, type, from, v.clash);
      return { ok: false, error: v.error };
    }
    const to = v.name;
    if (to === from) return { ok: true, changed: { txns: 0, subs: 0, budget: false }, to: to };
    const r = categoryRewriteRefs(data, type, from, to);
    if (listed) {
      const origin = categoryBuiltinOrigin(cfg, type, from);
      if (origin) { if (to === origin) delete cfg.renames[type][origin]; else cfg.renames[type][origin] = to; }
      else cfg.custom[type] = cfg.custom[type].map(c => c === from ? to : c);
      cfg.hidden[type] = cfg.hidden[type].map(c => c === from ? to : c);
    }
    storeCategoryConfig(data, cfg);
    return { ok: true, to: to, changed: r };
  }

  // Hapus kategori buatan sendiri. Bila masih dipakai, `target` (kategori tujuan) wajib.
  function categoryDelete(data, type, name, target) {
    const cfg = categoryConfigOf(data);
    if (isCategoryLocked(name) || categoryBuiltinOrigin(cfg, type, name)) return { ok: false, error: 'Kategori bawaan tidak bisa dihapus; sembunyikan saja.' };
    if (cfg.custom[type].indexOf(name) < 0) return { ok: false, error: 'Kategori tidak ditemukan.' };
    const refs = categoryRefs(data, type, name);
    if (refs.txns || refs.subs || refs.budget) {
      if (!target) return { ok: false, error: 'Kategori ini masih dipakai. Pilih kategori tujuan.' };
      return categoryMerge(data, type, name, target);
    }
    cfg.custom[type] = cfg.custom[type].filter(c => c !== name);
    cfg.hidden[type] = cfg.hidden[type].filter(c => c !== name);
    storeCategoryConfig(data, cfg);
    return { ok: true, changed: { txns: 0, subs: 0, budget: false } };
  }

  // Impor gabung: tambahkan kategori buatan sendiri dari file (tanpa menimpa pengaturan lokal).
  function categoryMergeImported(data, rawImported) {
    const imp = sanitizeCategoryConfig(rawImported);
    const cfg = categoryConfigOf(data);
    let added = 0;
    CATEGORY_TYPES.forEach(t => imp.custom[t].forEach(n => {
      if (cfg.custom[t].length >= CATEGORY_CUSTOM_MAX) return;
      if (categoryAllFor(cfg, t).some(c => categoryKey(c) === categoryKey(n))) return;
      cfg.custom[t].push(n); added++;
    }));
    if (added) storeCategoryConfig(data, cfg);
    return added;
  }

  // Kata kunci otomatis buatan sendiri (tersimpan di perangkat, bukan di data) ikut pindah saat kategori diubah nama/digabung.
  // Panggil SEBELUM menyimpan data, selagi `from` masih dikenali; mengembalikan jumlah kata yang dipindah.
  function categoryMoveKeywords(type, from, to) {
    if ((type !== 'keluar' && type !== 'masuk') || typeof CUSTOM_KW_KEY === 'undefined') return 0;
    // Baca/tulis mentah (bukan loadCustomKeywords): kategori tujuan baru belum terdaftar di pengaturan lama, sanitasi akan membuangnya.
    // Saat dimuat nanti kata tetap disaring oleh sanitizeCustomKeywords.
    let kw = null;
    try { kw = JSON.parse(localStorage.getItem(CUSTOM_KW_KEY) || 'null'); } catch (e) { return 0; }
    const src = kw && kw[type] && Array.isArray(kw[type][from]) ? kw[type][from] : null;
    if (!src || !src.length) return 0;
    delete kw[type][from];
    const cur = Array.isArray(kw[type][to]) ? kw[type][to] : [];
    kw[type][to] = cur.concat(src.filter(w => cur.indexOf(w) < 0));
    try { settingSet(CUSTOM_KW_KEY, JSON.stringify(kw)); } catch (e) { return 0; }
    return src.length;
  }
