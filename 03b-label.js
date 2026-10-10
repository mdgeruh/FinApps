  // ============================================================
  // LABEL (TAG) TRANSAKSI (v1.1.121)
  // txn.tags = ['kebun', 'Lebaran'] (opsional), melengkapi kategori: satu transaksi bisa punya sampai 5 label.
  // Label dirapikan: tanpa '#', ',' dan ';', spasi ganda dipadatkan, maksimal 24 huruf; sama dengan beda huruf besar/kecil
  // dianggap satu label (ejaan yang pertama dipakai). Dipakai di form, daftar, pencarian, filter, Laporan, dan CSV.
  // Fungsi hitung murni: normalizeTag, sanitizeTags, parseTagsInput, txnTags, collectTags, summarizeTags.
  // ============================================================
  const TAG_MAX_LEN = 24;
  const TAG_MAX_PER_TXN = 5;

  function normalizeTag(s) { return String(s == null ? '' : s).replace(/[#,;]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, TAG_MAX_LEN).trim(); }
  function tagKey(s) { return String(s).toLowerCase(); }

  // Terima array atau teks (dipisah koma/titik koma/baris baru); buang yang kosong dan kembar.
  function sanitizeTags(raw) {
    const list = Array.isArray(raw) ? raw : (typeof raw === 'string' ? raw.split(/[,;\n]+/) : []);
    const seen = new Set(), out = [];
    list.forEach(x => {
      if (out.length >= TAG_MAX_PER_TXN || typeof x !== 'string') return;
      const t = normalizeTag(x), k = tagKey(t);
      if (!t || seen.has(k)) return;
      seen.add(k); out.push(t);
    });
    return out;
  }
  function parseTagsInput(text) { return sanitizeTags(String(text == null ? '' : text)); }
  function txnTags(t) { return t && Array.isArray(t.tags) ? sanitizeTags(t.tags) : []; }
  function tagsText(tags) { return tags.map(x => '#' + x).join(' '); }
  function applyTags(t, tags) { if (tags && tags.length) t.tags = tags; else delete t.tags; return t; }

  // Daftar label yang dipakai: [{ key, tag, count }], terbanyak dulu lalu abjad.
  function collectTags(txns) {
    const map = new Map();
    (txns || []).forEach(t => txnTags(t).forEach(x => {
      const k = tagKey(x), e = map.get(k);
      if (e) e.count++; else map.set(k, { key: k, tag: x, count: 1 });
    }));
    return Array.from(map.values()).sort((a, b) => b.count - a.count || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  }

  // Total per label untuk Laporan: hanya pemasukan dan pengeluaran. Satu transaksi dengan dua label dihitung di keduanya,
  // jadi jumlah antar label boleh lebih besar dari total periode.
  function summarizeTags(txns) {
    const map = new Map();
    (txns || []).forEach(t => {
      if (t.type !== 'masuk' && t.type !== 'keluar') return;
      txnTags(t).forEach(x => {
        const k = tagKey(x);
        if (!map.has(k)) map.set(k, { key: k, tag: x, masuk: 0, keluar: 0, count: 0 });
        const e = map.get(k); e[t.type] = roundMoney(e[t.type] + t.amount); e.count++;
      });
    });
    return Array.from(map.values()).sort((a, b) => (b.keluar + b.masuk) - (a.keluar + a.masuk) || (a.key < b.key ? -1 : 1));
  }

  // ---------- Form ----------
  function setTagsInput(tags) { const el = $('tags-input'); if (el) el.value = (tags || []).join(', '); renderTagSuggest(); }
  function renderTagSuggest() {
    const box = $('tags-suggest'), input = $('tags-input');
    if (!box || !input) return;
    const cur = new Set(parseTagsInput(input.value).map(tagKey));
    const top = collectTags(loadData().txns).slice(0, 8);
    box.innerHTML = top.map(e => `<button type="button" class="chip${cur.has(e.key) ? ' active' : ''}" data-act="toggleTagSuggest" data-a0="${escapeHtml(e.tag)}" aria-pressed="${cur.has(e.key) ? 'true' : 'false'}">#${escapeHtml(e.tag)}</button>`).join('');
  }
  function toggleTagSuggest(tag) {
    const input = $('tags-input');
    const cur = parseTagsInput(input.value), k = tagKey(tag);
    const next = cur.some(x => tagKey(x) === k) ? cur.filter(x => tagKey(x) !== k) : sanitizeTags(cur.concat([tag]));
    if (next.length === cur.length && !cur.some(x => tagKey(x) === k)) showToast('Maksimal ' + TAG_MAX_PER_TXN + ' label per transaksi.', 'error');
    setTagsInput(next);
  }

  // ---------- Filter di tab Transaksi ----------
  function renderTagFilters(data) {
    const row = $('tag-filter-row');
    if (!row) return;
    const all = collectTags(data.txns);
    if (state.activeTagFilter !== 'all' && !all.some(e => e.key === state.activeTagFilter)) state.activeTagFilter = 'all';
    row.style.display = all.length ? '' : 'none';
    row.innerHTML = '';
    if (!all.length) return;
    [{ key: 'all', tag: 'Semua label' }].concat(all.slice(0, 20).map(e => ({ key: e.key, tag: '#' + e.tag }))).forEach(e => {
      const chip = document.createElement('button');
      chip.className = 'chip' + (state.activeTagFilter === e.key ? ' active' : '');
      chip.textContent = e.tag;
      chip.onclick = () => { state.activeTagFilter = state.activeTagFilter === e.key ? 'all' : e.key; refreshTxnList(); };
      row.appendChild(chip);
    });
  }

  // ---------- Laporan: ringkasan per label ----------
  function renderLaporanTagCard(txns) {
    const box = $('laporan-tag-list');
    if (!box) return;
    const items = summarizeTags(txns);
    if (!items.length) { box.innerHTML = ''; box.style.display = 'none'; return; }
    box.style.display = '';
    const rows = items.slice(0, 15).map(it => `<div class="cat-row"><div class="cat-main"><span class="cat-name">#${escapeHtml(it.tag)}<span class="cat-count">${it.count}x</span></span>
      <span class="cat-amt">${it.keluar > 0 ? '<span class="u-c-red">−' + formatRp(it.keluar) + '</span>' : ''}${it.keluar > 0 && it.masuk > 0 ? ' · ' : ''}${it.masuk > 0 ? '<span class="u-c-green">+' + formatRp(it.masuk) + '</span>' : ''}</span></div></div>`).join('');
    box.innerHTML = `<div class="cat-list"><div class="cat-head"><span class="cat-title">Per label</span></div>${rows}<div class="acc-sub u-mt6">Transaksi dengan beberapa label dihitung di tiap labelnya.</div></div>`;
  }
