  // ============================================================
  // HALAMAN KELOLA KATEGORI & LABEL (v1.1.178)
  // Halaman di dalam tab Profil (alamat #/profil/kelola). Dua tab: Kategori (tambah, ubah nama, gabung, sembunyikan, hapus)
  // dan Label (ubah nama/gabung, hapus). Logika datanya ada di kategori-data.js (kategori) dan label.js (label); berkas ini hanya tampilan
  // dan alur: ringkasan sebelum menggabung/menghapus, serta tombol Urungkan untuk perubahan terakhir.
  // Elemen dinamis (input/select di dalam daftar) diambil dengan document.getElementById, bukan $() yang menyimpan hasil lama.
  // ============================================================
  const kelola = { open: false, tab: 'kategori', type: 'keluar', q: '', openIdx: -1, mode: '', rows: [], undo: null, scrollY: 0 };

  function kelolaSay(text, kind) {
    const m = $('kelola-msg');
    if (!m) return;
    m.textContent = text || '';
    m.className = 'io-msg ' + (kind || '');
  }

  // ---------- Buka / tutup ----------
  function openKelolaPage(tab) {
    const wasOpen = kelola.open;
    let tabChanged = false;
    if (currentTabName() !== 'profil') { setTab('profil', true); tabChanged = true; }
    if (!wasOpen) kelola.scrollY = tabChanged ? 0 : (window.scrollY || 0);
    kelola.open = true;
    if (tab === 'label' || tab === 'kategori') kelola.tab = tab;
    kelola.openIdx = -1; kelola.mode = ''; kelola.q = '';
    const s = $('kelola-search'); if (s) s.value = '';
    $('kelola-page').classList.add('open');
    $('tab-profil').classList.add('sub-open');
    kelolaSay('');
    renderKelolaPage();
    try { window.scrollTo(0, 0); const h = $('kelola-title'); if (h) h.focus({ preventScroll: true }); } catch (e) { /* abaikan */ }
    routeOnKelolaOpen(wasOpen);   // src/js/core/rute.js
  }
  // Sembunyikan tanpa menyentuh alamat/riwayat (dipakai closeKelolaPage dan setTab saat pindah tab).
  function hideKelolaPage() {
    kelola.open = false; kelola.undo = null;
    const p = $('kelola-page'), t = $('tab-profil');
    if (p) p.classList.remove('open');
    if (t) t.classList.remove('sub-open');
  }
  function closeKelolaPage() {
    const was = kelola.open;
    hideKelolaPage();
    if (was) {
      const y = kelola.scrollY;
      const restore = () => { if (!kelola.open && currentTabName() === 'profil') window.scrollTo(0, y); };
      try { requestAnimationFrame(restore); setTimeout(restore, 90); } catch (e) { /* abaikan */ }
      routeOnKelolaClose();   // src/js/core/rute.js
    }
  }
  function openTagManager() { openKelolaPage('label'); }   // chip "Kelola label" di filter Transaksi

  function setKelolaTab(tab) { kelola.tab = tab === 'label' ? 'label' : 'kategori'; kelola.openIdx = -1; kelola.mode = ''; kelola.q = ''; const s = $('kelola-search'); if (s) s.value = ''; kelolaSay(''); renderKelolaPage(); }
  function setKelolaType(type) { if (CATEGORY_TYPES.indexOf(type) < 0) return; kelola.type = type; kelola.openIdx = -1; kelola.mode = ''; kelolaSay(''); renderKelolaPage(); }
  function onKelolaSearch() { kelola.q = String(this.value || '').trim().toLowerCase(); kelola.openIdx = -1; kelola.mode = ''; renderKelolaList(); }
  function kelolaToggleRow(i) { kelola.openIdx = kelola.openIdx === i ? -1 : i; kelola.mode = ''; kelolaSay(''); renderKelolaList(); }
  function kelolaSetMode(i, mode) { kelola.openIdx = i; kelola.mode = mode; kelolaSay(''); renderKelolaList(); const el = document.getElementById('kelola-rename-input'); if (el) { el.focus(); el.select(); } }
  function kelolaCancelMode() { kelola.mode = ''; kelolaSay(''); renderKelolaList(); }

  // ---------- Gambar ----------
  function renderKelolaPage() {
    if (!kelola.open) return;
    document.querySelectorAll('#kelola-tabs [data-kelola-tab]').forEach(b => { const on = b.getAttribute('data-kelola-tab') === kelola.tab; b.classList.toggle('active', on); b.setAttribute('aria-selected', String(on)); });
    document.querySelectorAll('#kelola-type-row [data-kelola-type]').forEach(b => { const on = b.getAttribute('data-kelola-type') === kelola.type; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
    $('kelola-cat-tools').style.display = kelola.tab === 'kategori' ? '' : 'none';
    const s = $('kelola-search'); if (s) s.setAttribute('placeholder', kelola.tab === 'kategori' ? 'Cari kategori...' : 'Cari label...');
    renderKelolaList();
    renderKelolaUndo();
  }
  function renderKelolaUndo() {
    const box = $('kelola-undo');
    if (!box) return;
    if (!kelola.undo) { box.style.display = 'none'; return; }
    box.style.display = 'flex';
    $('kelola-undo-text').textContent = kelola.undo.text;
  }
  function renderKelolaList() {
    if (!kelola.open) return;
    if (kelola.tab === 'label') renderKelolaTags(); else renderKelolaCategories();
  }

  function kelolaBadge(text, cls) { return '<span class="kelola-tag' + (cls ? ' ' + cls : '') + '">' + text + '</span>'; }
  function kelolaMeta(r) {
    const parts = [r.count + ' transaksi'];
    if (r.count) parts.push(formatRp(r.amount));
    if (r.refs && r.refs.budget) parts.push('ada anggaran');
    if (r.refs && r.refs.subs) parts.push(r.refs.subs + ' transaksi berulang');
    return parts.join(' · ');
  }
  function kelolaRefsText(refs, extra) {
    const p = [];
    if (refs.txns) p.push(refs.txns + ' transaksi');
    if (refs.subs) p.push(refs.subs + ' transaksi berulang');
    if (refs.budget) p.push('anggarannya');
    return p.length ? 'Ikut berubah: ' + p.join(', ') + (extra ? '. ' + extra : '.') : 'Belum dipakai transaksi mana pun.';
  }

  function renderKelolaCategories() {
    const box = $('kelola-list');
    const data = loadData(), cfg = categoryConfigOf(data), type = kelola.type;
    const usage = categoryUsage(data, type), q = kelola.q;
    const mk = (name, listed) => {
      const u = usage[name] || { count: 0, amount: 0 };
      return { kind: 'cat', name: name, listed: listed, locked: listed && isCategoryLocked(name), builtin: listed && !!categoryBuiltinOrigin(cfg, type, name),
        hidden: listed && cfg.hidden[type].indexOf(name) >= 0, count: u.count, amount: u.amount, refs: categoryRefs(data, type, name) };
    };
    const match = r => !q || r.name.toLowerCase().indexOf(q) >= 0;
    const listed = categoryAllFor(cfg, type).map(n => mk(n, true)).filter(match);
    const groups = [
      { title: '', rows: listed.filter(r => !r.hidden) },
      { title: 'Disembunyikan dari pilihan', rows: listed.filter(r => r.hidden) },
      { title: 'Belum terdaftar (dipakai transaksi lama)', rows: categoryUnlisted(data, type, cfg).map(u => mk(u.name, false)).filter(match) }
    ];
    kelola.rows = [];
    let html = '';
    groups.forEach(g => {
      if (!g.rows.length) return;
      if (g.title) html += '<div class="kelola-group">' + escapeHtml(g.title) + '</div>';
      g.rows.forEach(r => { const i = kelola.rows.push(r) - 1; html += kelolaRowHtml(r, i); });
    });
    box.innerHTML = html || '<div class="empty">Tidak ada kategori yang cocok.</div>';
    if (kelola.mode === 'rename') { const el = document.getElementById('kelola-rename-input'); if (el && document.activeElement !== el) { el.focus(); el.select(); } }
  }

  function kelolaRowHtml(r, i) {
    const open = kelola.openIdx === i;
    const badges = (r.builtin ? kelolaBadge('Bawaan') : '') + (r.listed && !r.builtin ? kelolaBadge('Buatan sendiri') : '') + (r.locked ? kelolaBadge('🔒 Dikunci', 'lock') : '') + (r.hidden ? kelolaBadge('Disembunyikan', 'dim') : '') + (!r.listed ? kelolaBadge('Belum terdaftar', 'warn') : '');
    return '<div class="kelola-row' + (open ? ' open' : '') + '">' +
      '<button type="button" class="kelola-head" data-act="kelolaToggleRow" data-n0="' + i + '" aria-expanded="' + open + '">' +
      '<span class="kelola-name">' + escapeHtml(r.name) + '</span><span class="kelola-badges">' + badges + '</span>' +
      '<span class="kelola-meta">' + escapeHtml(kelolaMeta(r)) + '</span></button>' +
      (open ? '<div class="kelola-actions">' + kelolaActionsHtml(r, i) + '</div>' : '') + '</div>';
  }

  function kelolaActionsHtml(r, i) {
    const type = kelola.type;
    if (r.locked) return '<div class="acc-sub">Kategori ini dipakai perhitungan (bunga, cicilan, penyesuaian saldo, pilihan "Lainnya", dan sejenisnya), jadi tidak bisa diubah nama, disembunyikan, digabung, atau dihapus. Kamu tetap bisa memakainya dan menggabungkan kategori lain ke dalamnya.</div>';
    if (kelola.mode === 'rename') {
      return '<label class="field-label" for="kelola-rename-input">Nama baru</label>' +
        '<input type="text" id="kelola-rename-input" maxlength="' + CATEGORY_NAME_MAX + '" value="' + escapeHtml(r.name) + '" autocomplete="off" data-keydown-act="kelolaSaveRename" data-keydown-n0="' + i + '" data-keydown-keys="Enter">' +
        '<div class="acc-sub u-mt6">' + escapeHtml(kelolaRefsText(r.refs, 'Nama yang sama dengan kategori lain berarti digabung.')) + '</div>' +
        '<div class="acc-form-actions u-mt8"><button type="button" class="submit-btn" data-act="kelolaSaveRename" data-n0="' + i + '">Simpan</button><button type="button" class="io-btn" data-act="kelolaCancelMode">Batal</button></div>';
    }
    const targets = categoryList(type).filter(c => c !== r.name);
    const opts = targets.map(c => '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>').join('');
    if (kelola.mode === 'merge') {
      return '<label class="field-label" for="kelola-target">Gabungkan ke</label><select id="kelola-target" aria-label="Kategori tujuan">' + opts + '</select>' +
        '<div class="acc-sub u-mt6">' + escapeHtml(kelolaRefsText(r.refs, r.builtin ? 'Kategori ini lalu disembunyikan.' : (r.listed ? 'Kategori ini lalu dihapus dari daftar.' : ''))) + '</div>' +
        '<div class="acc-form-actions u-mt8"><button type="button" class="submit-btn" data-act="kelolaSaveMerge" data-n0="' + i + '">Gabungkan</button><button type="button" class="io-btn" data-act="kelolaCancelMode">Batal</button></div>';
    }
    if (kelola.mode === 'delete') {
      const used = r.refs.txns || r.refs.subs || r.refs.budget;
      return (used ? '<label class="field-label" for="kelola-target">Pindahkan pemakainya ke</label><select id="kelola-target" aria-label="Kategori tujuan">' + opts + '</select><div class="acc-sub u-mt6">' + escapeHtml(kelolaRefsText(r.refs)) + '</div>'
        : '<div class="acc-sub">Kategori ini belum dipakai, jadi aman dihapus.</div>') +
        '<div class="acc-form-actions u-mt8"><button type="button" class="io-btn danger" data-act="kelolaSaveDelete" data-n0="' + i + '">Hapus kategori</button><button type="button" class="io-btn" data-act="kelolaCancelMode">Batal</button></div>';
    }
    let b = '';
    if (!r.listed) b += '<button type="button" class="io-btn" data-act="kelolaAdopt" data-n0="' + i + '">Tambahkan ke daftar</button>';
    b += '<button type="button" class="io-btn" data-act="kelolaSetMode" data-n0="' + i + '" data-a1="rename">Ubah nama</button>';
    if (targets.length) b += '<button type="button" class="io-btn" data-act="kelolaSetMode" data-n0="' + i + '" data-a1="merge">Gabung ke…</button>';
    if (r.listed && r.builtin) b += '<button type="button" class="io-btn" data-act="kelolaToggleHide" data-n0="' + i + '">' + (r.hidden ? 'Tampilkan lagi' : 'Sembunyikan') + '</button>';
    if (r.listed && !r.builtin) b += '<button type="button" class="io-btn danger" data-act="kelolaSetMode" data-n0="' + i + '" data-a1="delete">Hapus</button>';
    if (r.listed && !r.builtin && r.hidden) b += '<button type="button" class="io-btn" data-act="kelolaToggleHide" data-n0="' + i + '">Tampilkan lagi</button>';
    return '<div class="acc-form-actions">' + b + '</div>';
  }

  // ---------- Jalankan operasi (dengan urungkan) ----------
  // opFn(data) mengubah data di tempat dan mengembalikan { ok, error?, ... }; okText(res) = kalimat hasil. Keadaan sebelumnya disimpan untuk Urungkan.
  async function kelolaRun(opFn, okText, confirmText) {
    if (confirmText && !(await showConfirm(confirmText))) return false;
    const data = loadData();
    const before = { raw: null, kw: null };
    try { before.raw = localStorage.getItem(STORAGE_KEY); before.kw = localStorage.getItem(CUSTOM_KW_KEY); } catch (e) { /* abaikan */ }
    const res = opFn(data);
    if (!res || !res.ok) { kelolaSay((res && res.error) || 'Gagal.', 'error'); return false; }
    if (!saveData(data)) return false;
    kelola.undo = { raw: before.raw, kw: before.kw, text: okText(res) };
    kelola.openIdx = -1; kelola.mode = '';
    render();
    renderKelolaPage();
    kelolaSay('');   // hasilnya tampil di bilah Urungkan
    return true;
  }
  function kelolaUndo() {
    const u = kelola.undo;
    if (!u || !u.raw) return;
    try {
      saveData(JSON.parse(u.raw));
      if (u.kw === null) settingRemove(CUSTOM_KW_KEY); else settingSet(CUSTOM_KW_KEY, u.kw);
    } catch (e) { kelolaSay('Gagal membatalkan.', 'error'); return; }
    kelola.undo = null; kelola.openIdx = -1; kelola.mode = '';
    render();
    renderKelolaPage();
    kelolaSay('Perubahan dibatalkan.', 'ok');
  }
  function kelolaChangedText(c) {
    if (!c) return '';
    const p = [];
    if (c.txns) p.push(c.txns + ' transaksi');
    if (c.subs) p.push(c.subs + ' transaksi berulang');
    if (c.budget) p.push('anggaran');
    return p.length ? ' (' + p.join(', ') + ' diperbarui)' : '';
  }

  // ---------- Aksi kategori ----------
  function kelolaAddCategory() {
    const inp = $('kelola-cat-new');
    const v = inp ? inp.value : '';
    kelolaRun(d => categoryAdd(d, kelola.type, v), r => r.revived ? 'Kategori "' + r.name + '" ditampilkan lagi.' : 'Kategori "' + r.name + '" ditambahkan.').then(ok => { if (ok && inp) { inp.value = ''; inp.focus(); } });
  }
  function kelolaSaveRename(i) {
    const r = kelola.rows[i], inp = document.getElementById('kelola-rename-input');
    if (!r || !inp) return;
    const type = kelola.type, from = r.name;
    kelolaRun(d => { const res = categoryRename(d, type, from, inp.value); if (res.ok && res.to !== from) categoryMoveKeywords(type, from, res.to); return res; },
      res => (res.merged ? 'Digabung ke "' + res.to + '"' : (res.to === from ? 'Tidak ada yang berubah' : 'Nama diubah menjadi "' + res.to + '"')) + kelolaChangedText(res.changed) + '.');
  }
  function kelolaSaveMerge(i) {
    const r = kelola.rows[i], sel = document.getElementById('kelola-target');
    if (!r || !sel || !sel.value) return;
    const type = kelola.type, from = r.name, to = sel.value;
    kelolaRun(d => { const res = categoryMerge(d, type, from, to); if (res.ok) categoryMoveKeywords(type, from, to); return res; },
      res => '"' + from + '" digabung ke "' + res.to + '"' + kelolaChangedText(res.changed) + '.',
      'Gabungkan "' + from + '" ke "' + to + '"? ' + kelolaRefsText(r.refs).replace(/^Ikut berubah: /, 'Yang dipindah: ').replace('Belum dipakai transaksi mana pun.', 'Belum ada transaksi yang dipindah.'));
  }
  function kelolaSaveDelete(i) {
    const r = kelola.rows[i], sel = document.getElementById('kelola-target');
    if (!r) return;
    const type = kelola.type, from = r.name, to = sel ? sel.value : '';
    const used = r.refs.txns || r.refs.subs || r.refs.budget;
    if (used && !to) { kelolaSay('Pilih kategori tujuan.', 'error'); return; }
    kelolaRun(d => { const res = categoryDelete(d, type, from, to); if (res.ok && to) categoryMoveKeywords(type, from, to); return res; },
      res => 'Kategori "' + from + '" dihapus' + (to ? ', pemakainya dipindah ke "' + to + '"' : '') + kelolaChangedText(res.changed) + '.',
      used ? 'Hapus "' + from + '" dan pindahkan pemakainya ke "' + to + '"? ' + kelolaRefsText(r.refs).replace(/^Ikut berubah: /, 'Yang dipindah: ') : '');
  }
  function kelolaToggleHide(i) {
    const r = kelola.rows[i];
    if (!r) return;
    const type = kelola.type, name = r.name, hide = !r.hidden;
    kelolaRun(d => categoryHide(d, type, name, hide), () => hide ? '"' + name + '" disembunyikan dari pilihan. Riwayatnya tetap utuh.' : '"' + name + '" tampil lagi di pilihan.');
  }
  function kelolaAdopt(i) {
    const r = kelola.rows[i];
    if (!r) return;
    const type = kelola.type, name = r.name;
    kelolaRun(d => categoryAdd(d, type, name), res => '"' + res.name + '" masuk daftar kategori.');
  }

  // ---------- Label ----------
  function renderKelolaTags() {
    const box = $('kelola-list');
    const d = loadData(), subs = Array.isArray(d.subscriptions) ? d.subscriptions : [];
    const q = kelola.q;
    const all = collectTags(d.txns.concat(subs)).filter(e => !q || e.tag.toLowerCase().indexOf(q) >= 0);
    kelola.rows = all.map(e => ({ kind: 'tag', key: e.key, name: e.tag, count: e.count }));
    box.innerHTML = kelola.rows.length ? kelola.rows.map((r, i) => {
      const open = kelola.openIdx === i;
      let act = '';
      if (open) {
        if (kelola.mode === 'rename') {
          act = '<label class="field-label" for="kelola-rename-input">Nama baru</label><input type="text" id="kelola-rename-input" maxlength="' + TAG_MAX_LEN + '" value="' + escapeHtml(r.name) + '" autocomplete="off" data-keydown-act="kelolaTagSaveRename" data-keydown-n0="' + i + '" data-keydown-keys="Enter">' +
            '<div class="acc-sub u-mt6">Berubah di ' + r.count + ' transaksi. Nama yang sama dengan label lain berarti digabung.</div>' +
            '<div class="acc-form-actions u-mt8"><button type="button" class="submit-btn" data-act="kelolaTagSaveRename" data-n0="' + i + '">Simpan</button><button type="button" class="io-btn" data-act="kelolaCancelMode">Batal</button></div>';
        } else if (kelola.mode === 'delete') {
          act = '<div class="acc-sub">Label dilepas dari ' + r.count + ' transaksi. Transaksinya tetap ada.</div><div class="acc-form-actions u-mt8"><button type="button" class="io-btn danger" data-act="kelolaTagDelete" data-n0="' + i + '">Hapus label</button><button type="button" class="io-btn" data-act="kelolaCancelMode">Batal</button></div>';
        } else {
          act = '<div class="acc-form-actions"><button type="button" class="io-btn" data-act="kelolaSetMode" data-n0="' + i + '" data-a1="rename">Ubah nama</button><button type="button" class="io-btn danger" data-act="kelolaSetMode" data-n0="' + i + '" data-a1="delete">Hapus</button></div>';
        }
      }
      return '<div class="kelola-row' + (open ? ' open' : '') + '"><button type="button" class="kelola-head" data-act="kelolaToggleRow" data-n0="' + i + '" aria-expanded="' + open + '"><span class="kelola-name">#' + escapeHtml(r.name) + '</span><span class="kelola-meta">' + r.count + ' transaksi</span></button>' + (open ? '<div class="kelola-actions">' + act + '</div>' : '') + '</div>';
    }).join('') : '<div class="empty">' + (q ? 'Tidak ada label yang cocok.' : 'Belum ada label. Tambahkan lewat kolom Label saat mencatat transaksi.') + '</div>';
    if (kelola.mode === 'rename') { const el = document.getElementById('kelola-rename-input'); if (el && document.activeElement !== el) { el.focus(); el.select(); } }
  }
  function kelolaTagSaveRename(i) {
    const r = kelola.rows[i], inp = document.getElementById('kelola-rename-input');
    if (!r || !inp) return;
    const from = r.key;
    kelolaRun(d => {
      const subs = Array.isArray(d.subscriptions) ? d.subscriptions : [];
      const res = renameTagInTxns(d.txns, from, inp.value);
      if (res.error) return { ok: false, error: res.error };
      const rs = renameTagInTxns(subs, from, res.to);   // transaksi berulang memakai ejaan akhir yang sama
      const changed = res.changed + rs.changed;
      if (!changed) return { ok: false, error: 'Tidak ada yang berubah.' };
      if (state.activeTagFilter === tagKey(from)) state.activeTagFilter = res.toKey;
      return { ok: true, changed: changed, merged: res.merged, to: res.to };
    }, res => (res.merged ? 'Digabung ke #' + res.to : 'Label diubah menjadi #' + res.to) + ' (' + res.changed + ' transaksi).');
  }
  function kelolaTagDelete(i) {
    const r = kelola.rows[i];
    if (!r) return;
    const key = r.key;
    kelolaRun(d => {
      const subs = Array.isArray(d.subscriptions) ? d.subscriptions : [];
      const a = deleteTagInTxns(d.txns, key), b = deleteTagInTxns(subs, key);
      if (state.activeTagFilter === tagKey(key)) state.activeTagFilter = 'all';
      return { ok: true, changed: a.changed + b.changed };
    }, res => 'Label #' + r.name + ' dihapus dari ' + res.changed + ' transaksi.', 'Hapus label #' + r.name + ' dari ' + r.count + ' transaksi? Transaksinya tetap ada.');
  }
