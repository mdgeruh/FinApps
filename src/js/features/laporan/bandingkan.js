  // ============================================================
  // LAPORAN: perubahan per kategori dibanding periode sebelumnya, dengan catatan otomatis
  // ("Makan & minum naik 32%"). Fungsi hitung murni di atas, tampilan di bawah.
  // ============================================================
  const CMP_MIN_PCT = 20;       // perubahan di bawah ini tidak dianggap berarti
  const CMP_MIN_AMOUNT = 50000; // dan selisih nominal di bawah ini juga diabaikan
  const CMP_MAX_NOTES = 4;
  const CMP_MAX_ROWS = 8;

  function cmpYmd(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function cmpShiftMonths(range, n) {
    const [ys, ms] = range.start.split('-').map(Number);
    const [ye, me] = range.end.split('-').map(Number);
    return {
      start: cmpYmd(new Date(ys, ms - 1 - n, 1)),
      end: cmpYmd(new Date(ye, me - n, 0))
    };
  }
  function cmpDayDiff(a, b) {
    return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
  }
  function cmpAddDays(ymd, n) {
    const d = new Date(ymd + 'T00:00:00'); d.setDate(d.getDate() + n);
    return cmpYmd(d);
  }

  // Rentang pembanding. Bulan/3 bulan/tahun digeser per kalender; lainnya periode sebelumnya yang panjangnya sama.
  // Kalau periode ini belum selesai (mis. bulan berjalan), dua-duanya dipotong ke jumlah hari yang sama
  // supaya tidak membandingkan sebagian bulan dengan satu bulan penuh. Null = tidak bisa dibandingkan.
  function laporanCompareRanges(period, range, today) {
    if (period === 'alltime' || !range || range.start > today) return null;
    let prev;
    if (period === 'bulanan') prev = cmpShiftMonths(range, 1);
    else if (period === '3bulan') prev = cmpShiftMonths(range, 3);
    else if (period === '1tahun') prev = cmpShiftMonths(range, 12);
    else {
      const days = cmpDayDiff(range.start, range.end) + 1;
      prev = { start: cmpAddDays(range.start, -days), end: cmpAddDays(range.start, -1) };
    }
    let cur = { start: range.start, end: range.end };
    let partial = false;
    if (range.end > today) {
      partial = true;
      cur.end = today;
      const elapsed = cmpDayDiff(cur.start, cur.end);
      const cap = cmpAddDays(prev.start, elapsed);
      if (cap < prev.end) prev.end = cap;
    }
    return { cur, prev, partial };
  }

  // Jumlah per kategori untuk satu jenis (masuk/keluar), tanpa bayar utang & penyesuaian saldo.
  function sumByCategory(txns, type, start, end) {
    const m = {};
    (txns || []).forEach(t => {
      if (t.type !== type || t.date < start || t.date > end || isNonOperatingTxn(t)) return;
      const k = t.category || 'Tanpa kategori';
      m[k] = (m[k] || 0) + (Number(t.amount) || 0);
    });
    return m;
  }

  // Baris perbandingan per kategori, diurutkan dari selisih nominal terbesar.
  function computeCategoryComparison(txns, type, cur, prev) {
    const a = sumByCategory(txns, type, cur.start, cur.end);
    const b = sumByCategory(txns, type, prev.start, prev.end);
    const keys = {};
    Object.keys(a).forEach(k => { keys[k] = 1; });
    Object.keys(b).forEach(k => { keys[k] = 1; });
    return Object.keys(keys).map(k => {
      const c = a[k] || 0, p = b[k] || 0;
      return { category: k, cur: c, prev: p, diff: c - p, pct: p > 0 ? Math.round(((c - p) / p) * 100) : null };
    }).filter(r => r.cur > 0 || r.prev > 0).sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff));
  }

  // Catatan otomatis dari baris perbandingan. tone 'bad' = merugikan (pengeluaran naik / pemasukan turun).
  function buildComparisonNotes(rows, type, prefix, opts) {
    const minPct = opts && opts.minPct != null ? opts.minPct : CMP_MIN_PCT;
    const minAmount = opts && opts.minAmount != null ? opts.minAmount : CMP_MIN_AMOUNT;
    const pre = prefix || '';
    const up = type === 'keluar'; // naik itu buruk untuk pengeluaran
    const out = [];
    rows.forEach(r => {
      const big = Math.abs(r.diff) >= minAmount;
      if (!big) return;
      const name = pre + r.category;
      if (r.prev <= 0 && r.cur > 0) {
        out.push({ text: name + ' baru muncul: ' + formatRp(r.cur), tone: up ? 'bad' : 'good', size: Math.abs(r.diff) });
      } else if (r.cur <= 0 && r.prev > 0) {
        out.push({ text: name + ' tidak ada (sebelumnya ' + formatRp(r.prev) + ')', tone: up ? 'good' : 'bad', size: Math.abs(r.diff) });
      } else if (r.pct !== null && Math.abs(r.pct) >= minPct) {
        const naik = r.diff > 0;
        out.push({
          text: name + ' ' + (naik ? 'naik ' : 'turun ') + Math.abs(r.pct) + '% (' + formatRp(r.prev) + ' → ' + formatRp(r.cur) + ')',
          tone: (naik === up) ? 'bad' : 'good',
          size: Math.abs(r.diff)
        });
      }
    });
    return out;
  }

  function cmpPeriodWord(period) {
    return period === 'bulanan' ? 'bulan lalu' : period === '3bulan' ? '3 bulan sebelumnya' : period === '1tahun' ? 'tahun lalu' : 'periode sebelumnya';
  }

  function cmpDeltaText(r) {
    if (r.prev <= 0) return 'baru';
    if (r.cur <= 0) return '▼ 100%';
    if (r.pct === 0) return '0%';
    return (r.pct > 0 ? '▲ ' : '▼ ') + Math.abs(r.pct) + '%';
  }
  function cmpRowHtml(r, type) {
    const bad = type === 'keluar' ? r.diff > 0 : r.diff < 0;
    const color = r.diff === 0 ? '' : (bad ? 'var(--red-ink)' : 'var(--green-ink)');
    return lapRow(escapeHtml(r.category),
      formatRp(r.cur) + ' <span style="font-weight:500; font-size:11.5px;">(' + formatRp(r.prev) + ')</span> <span style="white-space:nowrap;">' + escapeHtml(cmpDeltaText(r)) + '</span>', color);
  }
  function cmpRowsBlock(rows, type) {
    const shown = rows.slice(0, CMP_MAX_ROWS).map(r => cmpRowHtml(r, type)).join('');
    const rest = rows.slice(CMP_MAX_ROWS);
    const more = rest.length
      ? `<details class="u-mt4"><summary class="acc-sub" style="cursor:pointer;">${rest.length} kategori lainnya</summary>${rest.map(r => cmpRowHtml(r, type)).join('')}</details>` : '';
    return shown + more;
  }

  // Kartu untuk Laporan. Mengikuti filter akun, tapi bukan filter kategori (tujuannya membandingkan semua kategori).
  function laporanCategoryCompareHtml(data, range) {
    const today = todayStr();
    const cmp = laporanCompareRanges(state.laporanPeriod, range, today);
    if (!cmp) return '';
    let txns = data.txns;
    if (state.laporanAccFilter !== 'all') {
      txns = txns.filter(t => t.accountId === state.laporanAccFilter || t.toAccountId === state.laporanAccFilter);
    }
    const keluar = computeCategoryComparison(txns, 'keluar', cmp.cur, cmp.prev);
    const masuk = computeCategoryComparison(txns, 'masuk', cmp.cur, cmp.prev);
    if (!keluar.length && !masuk.length) return '';

    const th = cmpThresholds();
    const notes = buildComparisonNotes(keluar, 'keluar', '', th)
      .concat(buildComparisonNotes(masuk, 'masuk', 'Pemasukan ', th))
      .sort((x, y) => y.size - x.size).slice(0, CMP_MAX_NOTES);
    const noteHtml = notes.length
      ? '<div style="margin:6px 0 8px;">' + notes.map(n =>
        `<div style="display:flex; gap:8px; align-items:baseline; font-size:13px; padding:3px 0;"><span aria-hidden="true" style="color:${n.tone === 'bad' ? 'var(--red-ink)' : 'var(--green-ink)'};">●</span><span>${escapeHtml(n.text)}</span></div>`).join('') + '</div>'
      : '<div class="acc-sub u-mb6">Tidak ada perubahan besar per kategori.</div>';

    const range1 = fmtTgl(cmp.cur.start) + ' – ' + fmtTgl(cmp.cur.end);
    const range2 = fmtTgl(cmp.prev.start) + ' – ' + fmtTgl(cmp.prev.end);
    const sub = `<div class="acc-sub u-mb4">${escapeHtml(range1)} dibanding ${escapeHtml(range2)} (${escapeHtml(cmpPeriodWord(state.laporanPeriod))})${cmp.partial ? ', jumlah hari disamakan karena periode ini belum selesai' : ''}</div>`;
    const keluarBlock = keluar.length
      ? '<div class="acc-type u-mt8">Pengeluaran per kategori <span style="font-weight:500;">(periode ini, sebelumnya)</span></div>' + cmpRowsBlock(keluar, 'keluar') : '';
    const masukBlock = masuk.length
      ? `<details class="u-mt8"><summary class="acc-type" style="cursor:pointer;">Pemasukan per kategori</summary>${cmpRowsBlock(masuk, 'masuk')}</details>` : '';
    return lapCard('Perubahan per kategori', sub + noteHtml + keluarBlock + masukBlock + cmpSettingsHtml(th));
  }

  // ---------- Ambang catatan yang bisa diatur (v1.1.152): tersimpan di perangkat ini ----------
  const CMP_THRESH_KEY = 'keuangan-ambang-bandingkan-v1';
  const CMP_PCT_RANGE = [1, 500];
  const CMP_AMOUNT_RANGE = [0, 1000000000];
  // Murni: terima objek mentah, kembalikan { minPct, minAmount } bulat dan dalam batas; yang tak valid kembali ke bawaan.
  function sanitizeCmpThresholds(raw) {
    const pick = (v, def, rng) => {
      const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
      return typeof n === 'number' && isFinite(n) && Math.round(n) >= rng[0] && Math.round(n) <= rng[1] ? Math.round(n) : def;
    };
    const r = raw && typeof raw === 'object' ? raw : {};
    return { minPct: pick(r.minPct, CMP_MIN_PCT, CMP_PCT_RANGE), minAmount: pick(r.minAmount, CMP_MIN_AMOUNT, CMP_AMOUNT_RANGE) };
  }
  function cmpThresholds() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(CMP_THRESH_KEY) || 'null'); } catch (e) { /* abaikan */ }
    return sanitizeCmpThresholds(raw);
  }
  function cmpSettingsHtml(th) {
    const isDefault = th.minPct === CMP_MIN_PCT && th.minAmount === CMP_MIN_AMOUNT;
    return `<details class="u-mt8 no-print"${state.cmpAmbangOpen ? ' open' : ''}><summary class="acc-sub" style="cursor:pointer;">Atur ambang catatan (sekarang ≥ ${th.minPct}% dan ≥ ${escapeHtml(formatRp(th.minAmount))})</summary>
      <div class="acc-sub u-mt6">Catatan otomatis hanya muncul bila perubahan kategori memenuhi keduanya. Pengaturan ini tersimpan di perangkat ini.</div>
      <div class="field-row has-label"><label class="field-label" for="cmp-pct-input">Perubahan minimal (%)</label><input type="text" id="cmp-pct-input" inputmode="numeric" maxlength="3" value="${th.minPct}" aria-label="Perubahan minimal dalam persen" data-keydown-act="saveCmpThresholds" data-keydown-keys="Enter"></div>
      <div class="field-row has-label"><label class="field-label" for="cmp-amt-input">Selisih minimal (Rp)</label><input type="text" id="cmp-amt-input" inputmode="numeric" maxlength="10" value="${th.minAmount}" aria-label="Selisih minimal dalam rupiah" data-keydown-act="saveCmpThresholds" data-keydown-keys="Enter"></div>
      <div class="io-row"><button type="button" class="io-btn u-flex1" data-act="saveCmpThresholds">Simpan</button><button type="button" class="io-btn u-flex1" data-act="resetCmpThresholds"${isDefault ? ' disabled' : ''}>Kembalikan bawaan</button></div>
      <div class="io-msg" id="cmp-msg"></div></details>`;
  }
  function saveCmpThresholds() {
    const p = document.getElementById('cmp-pct-input'), a = document.getElementById('cmp-amt-input');
    if (!p || !a) return;
    const pv = Number(String(p.value).replace(/[^\d]/g, '')), av = Number(String(a.value).replace(/[^\d]/g, ''));
    const th = sanitizeCmpThresholds({ minPct: pv, minAmount: av });
    if (!(pv >= CMP_PCT_RANGE[0] && pv <= CMP_PCT_RANGE[1])) { showToast('Persen harus ' + CMP_PCT_RANGE[0] + '–' + CMP_PCT_RANGE[1], 'error'); return; }
    if (av > CMP_AMOUNT_RANGE[1]) { showToast('Selisih maksimal ' + formatRp(CMP_AMOUNT_RANGE[1]), 'error'); return; }
    try { settingSet(CMP_THRESH_KEY, JSON.stringify(th)); } catch (e) { /* abaikan */ }
    state.cmpAmbangOpen = true;
    renderLaporan();
  }
  function resetCmpThresholds() {
    try { settingRemove(CMP_THRESH_KEY); } catch (e) { /* abaikan */ }
    state.cmpAmbangOpen = true;
    renderLaporan();
  }
