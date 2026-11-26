  // ============================================================
  // FOTO STRUK (v1.1.144+): lampiran foto di detail transaksi.
  // Disimpan di IndexedDB perangkat ini saja (bukan di data utama), jadi TIDAK ikut sinkron, backup JSON, atau CSV (sejak v1.1.165 ada cadangan foto terpisah: exportPhotos/importPhotos di Profil).
  // Foto dikecilkan dulu (sisi terpanjang 1280 px, JPEG) dan total penyimpanan dibatasi.
  // Kunci foto = splitId bila transaksi hasil pecah (satu struk, satu foto), selain itu id transaksi.
  // ============================================================
  const PHOTO_DB = 'keuangan-foto';
  const PHOTO_STORE = 'foto';
  const PHOTO_MAX_EDGE = 1280;
  const PHOTO_MAX_BYTES = 450 * 1024;        // sasaran per foto setelah dikecilkan
  const PHOTO_TOTAL_LIMIT = 60 * 1024 * 1024; // batas total di perangkat
  const PHOTO_MAX_INPUT = 25 * 1024 * 1024;   // file asli lebih besar dari ini ditolak

  // ----- fungsi murni -----
  function photoKeyOf(t) { return t ? (t.splitId || t.id || '') : ''; }
  function photoScaleSize(w, h, maxEdge) {
    w = Number(w) || 0; h = Number(h) || 0;
    if (w <= 0 || h <= 0) return { w: 0, h: 0 };
    const m = Math.max(w, h);
    if (m <= maxEdge) return { w: Math.round(w), h: Math.round(h) };
    const k = maxEdge / m;
    return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
  }
  function photoDataUrlBytes(url) {
    const i = String(url || '').indexOf(',');
    if (i < 0) return 0;
    const b64 = url.slice(i + 1);
    const pad = b64.endsWith('==') ? 2 : (b64.endsWith('=') ? 1 : 0);
    return Math.floor(b64.length * 3 / 4) - pad;
  }
  // Boleh menambah newBytes bila totalnya (dikurangi foto lama yang diganti) tidak melewati batas.
  function photoQuotaOk(usedBytes, newBytes, replacedBytes) {
    return (Number(usedBytes) || 0) - (Number(replacedBytes) || 0) + (Number(newBytes) || 0) <= PHOTO_TOTAL_LIMIT;
  }
  // Kunci foto yang yatim: tidak ada transaksi (atau pecahannya) yang memakainya.
  function photoOrphanKeys(keys, txns) {
    const live = {};
    (txns || []).forEach(t => { live[photoKeyOf(t)] = true; });
    return (keys || []).filter(k => !live[k]);
  }
  // ----- Cadangan foto (v1.1.165): berkas JSON terpisah { format, photos: [{ id, data }] }, agar JSON utama tetap kecil -----
  const PHOTO_BACKUP_FORMAT = 'keuangan-foto-v1';
  const PHOTO_MAX_ONE = 2 * 1024 * 1024;   // satu foto cadangan lebih besar dari ini dilewati
  // Tanda tangan transaksi tunggal untuk mencocokkan foto setelah Import JSON (ID transaksi dibuat ulang saat impor; splitId tetap).
  function photoSigOf(t, accName) { return [t.date, t.type, t.desc || '', t.amount, accName || ''].join('|'); }
  // Murni: pilih foto yang boleh dipulihkan. Syarat: gambar data-URL valid, kunci masih dipakai transaksi, muat kuota (mengganti foto lama dihitung).
  // meta = { kunci: byte } foto yang sudah ada. Return { accept: [{ id, data, bytes }], skipped: { invalid, orphan, quota } }.
  function photoParseBackup(raw, txns, meta, accounts) {
    const res = { accept: [], skipped: { invalid: 0, orphan: 0, quota: 0 } };
    if (!raw || typeof raw !== 'object' || raw.format !== PHOTO_BACKUP_FORMAT || !Array.isArray(raw.photos)) return null;
    const live = {};
    (txns || []).forEach(t => { live[photoKeyOf(t)] = true; });
    const accName = {}; (accounts || []).forEach(a => { accName[a.id] = a.name; });
    // transaksi tunggal (bukan pecahan) per tanda tangan; hanya yang cocok tepat satu dan belum berfoto yang dipakai
    const bySig = {};
    (txns || []).forEach(t => { if (t.splitId) return; const s = photoSigOf(t, accName[t.accountId]); (bySig[s] = bySig[s] || []).push(t.id); });
    const seen = {};
    let used = Object.values(meta || {}).reduce((s, n) => s + (Number(n) || 0), 0);
    raw.photos.forEach(p => {
      let id = p && typeof p.id === 'string' ? p.id : '';
      if (id && !live[id] && Array.isArray(p.sig) && p.sig.length === 5) {
        const c = bySig[p.sig.join('|')];
        if (c && c.length === 1 && !(meta && meta[c[0]] !== undefined)) id = c[0];
      }
      const data = p && typeof p.data === 'string' ? p.data : '';
      const bytes = photoDataUrlBytes(data);
      if (!id || seen[id] || !/^data:image\/(jpeg|png|webp);base64,/.test(data) || bytes <= 0 || bytes > PHOTO_MAX_ONE) { res.skipped.invalid++; return; }
      seen[id] = true;
      if (!live[id]) { res.skipped.orphan++; return; }
      const old = meta && meta[id] !== undefined ? Number(meta[id]) || 0 : 0;
      if (!photoQuotaOk(used, bytes, old)) { res.skipped.quota++; return; }
      used = used - old + bytes;
      res.accept.push({ id, data, bytes });
    });
    return res;
  }
  function photoSizeLabel(bytes) {
    const b = Number(bytes) || 0;
    return b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
  }

  // ----- IndexedDB -----
  state.photoMeta = {}; // key -> bytes (hanya ukuran; gambarnya dibaca saat dibuka)
  let photoDbPromise = null;
  function photoSupported() { return typeof indexedDB !== 'undefined' && !!indexedDB; }
  function photoDb() {
    if (!photoSupported()) return Promise.reject(new Error('IndexedDB tidak tersedia'));
    if (!photoDbPromise) {
      photoDbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(PHOTO_DB, 1);
        req.onupgradeneeded = () => { req.result.createObjectStore(PHOTO_STORE, { keyPath: 'id' }); };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => { photoDbPromise = null; reject(req.error); };
      });
    }
    return photoDbPromise;
  }
  function photoTx(mode, fn) {
    return photoDb().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, mode);
      const store = tx.objectStore(PHOTO_STORE);
      let out;
      try { out = fn(store); } catch (e) { reject(e); return; }
      tx.oncomplete = () => resolve(out && out.result !== undefined ? out.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('dibatalkan'));
    }));
  }
  function photoPut(id, dataUrl) {
    return photoTx('readwrite', s => s.put({ id: id, data: dataUrl, bytes: photoDataUrlBytes(dataUrl), at: Date.now() }))
      .then(() => { state.photoMeta[id] = photoDataUrlBytes(dataUrl); });
  }
  function photoGet(id) {
    return photoDb().then(db => new Promise((resolve, reject) => {
      const r = db.transaction(PHOTO_STORE, 'readonly').objectStore(PHOTO_STORE).get(id);
      r.onsuccess = () => resolve(r.result ? r.result.data : null);
      r.onerror = () => reject(r.error);
    }));
  }
  function photoDel(id) {
    return photoTx('readwrite', s => s.delete(id)).then(() => { delete state.photoMeta[id]; });
  }
  // Muat daftar kunci + ukuran (tanpa membawa gambarnya ke memori terlalu lama).
  function photoLoadMeta() {
    if (!photoSupported()) return Promise.resolve({});
    return photoDb().then(db => new Promise((resolve, reject) => {
      const meta = {};
      const r = db.transaction(PHOTO_STORE, 'readonly').objectStore(PHOTO_STORE).openCursor();
      r.onsuccess = () => {
        const c = r.result;
        if (c) { meta[c.value.id] = c.value.bytes || photoDataUrlBytes(c.value.data); c.continue(); }
        else { state.photoMeta = meta; resolve(meta); }
      };
      r.onerror = () => reject(r.error);
    })).catch(() => ({}));
  }
  function photoUsedBytes() { return Object.values(state.photoMeta).reduce((s, n) => s + (Number(n) || 0), 0); }
  function txnHasPhoto(t) { return !!(t && state.photoMeta && state.photoMeta[photoKeyOf(t)] !== undefined); }

  // Dipanggil dari startup dan setelah hapus: buang foto transaksi yang sudah tidak ada.
  async function photoCleanup() {
    try {
      const data = loadData();
      if (!data.txns.length) return;
      const keys = photoOrphanKeys(Object.keys(state.photoMeta), data.txns);
      for (const k of keys) await photoDel(k);
    } catch (e) { /* abaikan */ }
  }

  // ----- kompres foto -----
  function photoLoadBitmap(file) {
    if (typeof createImageBitmap === 'function') {
      return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => photoLoadViaImg(file));
    }
    return photoLoadViaImg(file);
  }
  function photoLoadViaImg(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gambar tidak bisa dibaca')); };
      img.src = url;
    });
  }
  async function photoCompress(file) {
    const bmp = await photoLoadBitmap(file);
    const w0 = bmp.width || bmp.naturalWidth, h0 = bmp.height || bmp.naturalHeight;
    let edge = PHOTO_MAX_EDGE, quality = 0.72, url = '';
    for (let i = 0; i < 4; i++) {
      const sz = photoScaleSize(w0, h0, edge);
      const cv = document.createElement('canvas');
      cv.width = sz.w; cv.height = sz.h;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, sz.w, sz.h);
      ctx.drawImage(bmp, 0, 0, sz.w, sz.h);
      url = cv.toDataURL('image/jpeg', quality);
      if (photoDataUrlBytes(url) <= PHOTO_MAX_BYTES) break;
      quality = Math.max(0.5, quality - 0.1); edge = Math.round(edge * 0.8);
    }
    if (bmp.close) bmp.close();
    return url;
  }

  // ----- tampilan di detail transaksi -----
  function renderTxnPhotoBox(t) {
    const box = $('txn-photo-box');
    if (!box) return;
    if (!t) { box.innerHTML = ''; return; }
    if (!photoSupported()) {
      box.innerHTML = '<div class="acc-sub">Foto struk tidak didukung di browser ini.</div>';
      return;
    }
    const key = photoKeyOf(t);
    const has = state.photoMeta[key] !== undefined;
    const note = '<div class="acc-sub u-mt4">Disimpan di perangkat ini saja, tidak ikut backup atau sinkron.</div>';
    if (has) {
      box.innerHTML = `<div class="txn-detail-label u-mb4">Foto struk</div>
        <button type="button" class="photo-thumb" data-act="viewTxnPhoto" aria-label="Lihat foto struk"><img alt="Foto struk" id="txn-photo-thumb-img"></button>
        <div class="acc-form-actions u-mt8"><button type="button" class="io-btn" data-act="pickTxnPhoto">Ganti foto</button><button type="button" class="io-btn danger" data-act="deleteTxnPhoto">Hapus foto</button></div>
        <div class="acc-sub u-mt4">${escapeHtml(photoSizeLabel(state.photoMeta[key]))} · disimpan di perangkat ini saja, tidak ikut backup atau sinkron.</div>`;
      photoGet(key).then(d => {
        const img = $('txn-photo-thumb-img');
        if (img && d && state.detailTxnId === t.id) img.src = d;
      }).catch(() => {});
    } else {
      box.innerHTML = `<button type="button" class="io-btn io-btn-full" data-act="pickTxnPhoto">Tambah foto struk</button>${note}`;
    }
  }
  function pickTxnPhoto() {
    const f = $('txn-photo-file');
    if (f) { f.value = ''; f.click(); }
  }
  async function onTxnPhotoPicked(event) {
    const input = event && event.target;
    const file = input && input.files && input.files[0];
    if (!file) return;
    const id = state.detailTxnId;
    const t = loadData().txns.find(x => x.id === id);
    if (!t) return;
    if (!/^image\//.test(file.type || '')) { showToast('Pilih file gambar', 'error'); return; }
    if (file.size > PHOTO_MAX_INPUT) { showToast('Foto terlalu besar (maksimal 25 MB)', 'error'); return; }
    const key = photoKeyOf(t);
    try {
      showToast('Memproses foto…');
      const url = await photoCompress(file);
      const bytes = photoDataUrlBytes(url);
      if (!photoQuotaOk(photoUsedBytes(), bytes, state.photoMeta[key] || 0)) {
        showToast('Penyimpanan foto penuh (maks. ' + photoSizeLabel(PHOTO_TOTAL_LIMIT) + '). Hapus foto lama dulu.', 'error');
        return;
      }
      await photoPut(key, url);
      showToast('Foto struk tersimpan');
      if (state.detailTxnId === id) renderTxnPhotoBox(t);
      render();
    } catch (e) {
      console.error('foto gagal', e);
      showToast('Foto gagal disimpan', 'error');
    }
  }
  async function deleteTxnPhoto() {
    const t = loadData().txns.find(x => x.id === state.detailTxnId);
    if (!t) return;
    if (!(await showConfirm('Hapus foto struk ini?'))) return;
    try { await photoDel(photoKeyOf(t)); } catch (e) { showToast('Foto gagal dihapus', 'error'); return; }
    renderTxnPhotoBox(t);
    render();
  }
  function viewTxnPhoto() {
    const t = loadData().txns.find(x => x.id === state.detailTxnId);
    if (!t) return;
    photoGet(photoKeyOf(t)).then(d => {
      if (!d) return;
      $('photo-view-img').src = d;
      $('photo-view').classList.add('open');
    }).catch(() => showToast('Foto tidak bisa dibuka', 'error'));
  }
  function closePhotoView() {
    $('photo-view').classList.remove('open');
    const img = $('photo-view-img'); if (img) img.removeAttribute('src');
  }

  // ----- foto langsung dari form Tambah transaksi (v1.1.151) -----
  // Foto dikecilkan saat dipilih, ditahan di state.pendingPhoto, lalu disimpan bersama transaksi (kunci = id transaksi atau splitId).
  state.pendingPhoto = null;
  function updateFormPhotoRow() {
    const row = document.getElementById('form-photo-row');
    if (!row) return;
    const show = photoSupported() && !state.editingTxnId && !state.editingSplitId && state.currentType !== 'transfer';
    row.style.display = show ? '' : 'none';
    const has = !!state.pendingPhoto;
    const img = document.getElementById('form-photo-preview'), rm = document.getElementById('form-photo-remove'), btn = document.getElementById('form-photo-btn');
    if (img) { img.style.display = has ? '' : 'none'; if (has) img.src = state.pendingPhoto; else img.removeAttribute('src'); }
    if (rm) rm.style.display = has ? '' : 'none';
    if (btn) btn.textContent = has ? 'Ganti foto' : 'Tambah foto';
  }
  function resetFormPhoto() { state.pendingPhoto = null; updateFormPhotoRow(); }
  function pickFormPhoto() { const f = document.getElementById('form-photo-file'); if (f) { f.value = ''; f.click(); } }
  function removeFormPhoto() { resetFormPhoto(); }
  async function onFormPhotoPicked(event) {
    const input = event && event.target;
    const file = input && input.files && input.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type || '')) { showToast('Pilih file gambar', 'error'); return; }
    if (file.size > PHOTO_MAX_INPUT) { showToast('Foto terlalu besar (maksimal 25 MB)', 'error'); return; }
    try {
      const url = await photoCompress(file);
      if (!photoQuotaOk(photoUsedBytes(), photoDataUrlBytes(url), 0)) { showToast('Penyimpanan foto penuh (maks. ' + photoSizeLabel(PHOTO_TOTAL_LIMIT) + '). Hapus foto lama dulu.', 'error'); return; }
      state.pendingPhoto = url;
      updateFormPhotoRow();
    } catch (e) { console.error('foto gagal', e); showToast('Foto tidak bisa dibaca', 'error'); }
  }
  // Dipanggil setelah transaksi tersimpan. Gagal menyimpan foto tidak membatalkan transaksi.
  async function commitPendingPhoto(key) {
    const url = state.pendingPhoto;
    state.pendingPhoto = null;
    if (!url || !key) return;
    try {
      if (!photoQuotaOk(photoUsedBytes(), photoDataUrlBytes(url), state.photoMeta[key] || 0)) { showToast('Transaksi tersimpan, tetapi penyimpanan foto penuh.', 'error'); return; }
      await photoPut(key, url);
      render();
    } catch (e) { showToast('Transaksi tersimpan, tetapi foto gagal disimpan.', 'error'); }
  }

  // ----- Cadangan foto: ekspor & impor -----
  function photoGetAll() {
    return photoDb().then(db => new Promise((resolve, reject) => {
      const out = [];
      const r = db.transaction(PHOTO_STORE, 'readonly').objectStore(PHOTO_STORE).openCursor();
      r.onsuccess = () => { const c = r.result; if (c) { out.push({ id: c.value.id, data: c.value.data }); c.continue(); } else resolve(out); };
      r.onerror = () => reject(r.error);
    }));
  }
  async function exportPhotos() {
    const msgId = 'foto-io-msg';
    if (!photoSupported()) { showIoMsg('Penyimpanan foto tidak tersedia di browser ini.', 'error', msgId); return; }
    try {
      const keys = Object.keys(state.photoMeta);
      if (!keys.length) { showIoMsg('Belum ada foto struk untuk dicadangkan.', 'error', msgId); return; }
      const photos = await photoGetAll();
      const data = loadData(), accName = {}; data.accounts.forEach(a => { accName[a.id] = a.name; });
      photos.forEach(p => { const t = data.txns.find(x => x.id === p.id && !x.splitId); if (t) p.sig = [t.date, t.type, t.desc || '', t.amount, accName[t.accountId] || '']; });
      const json = JSON.stringify({ format: PHOTO_BACKUP_FORMAT, exported_at: new Date().toISOString(), photos });
      const filename = 'keuangan-foto-' + todayStr() + '-' + nowTimeStr() + '.json';
      if (downloadsCap) {
        try { await downloadsCap.save({ filename, data: json }); showIoMsg(photos.length + ' foto siap disimpan.', 'ok', msgId); return; } catch (e) { /* lanjut */ }
      }
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showIoMsg(photos.length + ' foto diunduh (' + photoSizeLabel(json.length) + ').', 'ok', msgId);
    } catch (e) { showIoMsg('Gagal membuat cadangan foto.', 'error', msgId); }
  }
  async function importPhotos(event) {
    const msgId = 'foto-io-msg';
    const input = event && event.target;
    const file = input && input.files && input.files[0];
    if (!file) return;
    try {
      let raw = null;
      try { raw = JSON.parse(await file.text()); } catch (e) { /* di bawah */ }
      const res = photoParseBackup(raw, loadData().txns, state.photoMeta, loadData().accounts);
      if (!res) { showIoMsg('Berkas bukan cadangan foto Finapps.', 'error', msgId); return; }
      for (const p of res.accept) await photoPut(p.id, p.data);
      const sk = res.skipped, parts = [];
      if (sk.orphan) parts.push(sk.orphan + ' tanpa transaksi (impor transaksi dulu)');
      if (sk.quota) parts.push(sk.quota + ' melebihi batas penyimpanan');
      if (sk.invalid) parts.push(sk.invalid + ' tidak valid');
      showIoMsg(res.accept.length + ' foto dipulihkan' + (parts.length ? '; dilewati: ' + parts.join(', ') : '') + '.', res.accept.length ? 'ok' : 'error', msgId);
      render();
    } catch (e) { showIoMsg('Gagal memulihkan foto.', 'error', msgId); }
    finally { if (input) input.value = ''; }
  }
