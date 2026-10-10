  // ============================================================
  // TAB LAPORAN: filter periode & breakdown
  // ============================================================
  function dateToStr(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function setLaporanPeriod(p) {
    state.laporanPeriod = p;
    document.querySelectorAll('#laporan-period-row .type-btn').forEach(b => b.classList.toggle('active', b.dataset.laporanPeriod === p));
    $('laporan-custom-row').style.display = p === 'custom' ? 'flex' : 'none';
    $('laporan-date-nav').style.display = (p === 'custom' || p === 'alltime') ? 'none' : 'flex';
    renderLaporan();
  }

  function shiftLaporanPeriod(dir) {
    const d = new Date(state.laporanRefDate);
    if (state.laporanPeriod === 'harian') d.setDate(d.getDate() + dir);
    else if (state.laporanPeriod === 'mingguan') d.setDate(d.getDate() + dir * 7);
    else if (state.laporanPeriod === 'bulanan') d.setMonth(d.getMonth() + dir);
    else if (state.laporanPeriod === '3bulan') d.setMonth(d.getMonth() + dir * 3);
    else if (state.laporanPeriod === '1tahun') d.setFullYear(d.getFullYear() + dir);
    state.laporanRefDate = d;
    renderLaporan();
  }

  // Baris lipat (Saran, Rincian utang, dst) yang sedang tertutup tidak ikut tercetak, jadi dibuka dulu
  // selama proses cetak/Export PDF lalu dikembalikan seperti semula.
  (function () {
    let opened = [];
    window.addEventListener('beforeprint', () => {
      opened = Array.from(document.querySelectorAll('#laporan-extra details:not([open])'));
      opened.forEach(d => { d.open = true; });
    });
    window.addEventListener('afterprint', () => { opened.forEach(d => { d.open = false; }); opened = []; });
  })();

  // Kepala laporan yang hanya tampil saat dicetak: judul, periode, filter aktif, tanggal cetak, versi app.
  function laporanPrintFilterText(data) {
    const acc = state.laporanAccFilter !== 'all' ? (data.accounts.find(a => a.id === state.laporanAccFilter) || {}).name : '';
    const parts = [];
    if (acc) parts.push('Akun: ' + acc);
    if (state.laporanCatMasukFilter !== 'all') parts.push('Kategori pemasukan: ' + state.laporanCatMasukFilter);
    if (state.laporanCatKeluarFilter !== 'all') parts.push('Kategori pengeluaran: ' + state.laporanCatKeluarFilter);
    return parts.length ? parts.join(' · ') : 'Semua akun dan kategori';
  }
  function renderLaporanPrintHead(data, periodLabel) {
    const el = $('laporan-print-head');
    if (!el) return;
    el.innerHTML = '<div class="ph-title">Laporan Keuangan</div>' +
      '<div class="ph-period">' + escapeHtml(periodLabel || '') + '</div>' +
      '<div class="ph-meta">' + escapeHtml(laporanPrintFilterText(data)) + '</div>' +
      '<div class="ph-meta">Dicetak ' + escapeHtml(fmtTgl(todayStr())) + ' · Keuangan Pribadi ' + escapeHtml(typeof APP_VERSION === 'string' ? APP_VERSION : '') + '</div>';
  }
  // Isi <details> yang terlipat tidak ikut tercetak: buka semuanya selama proses cetak, lalu kembalikan.
  let _printOpened = [];
  window.addEventListener('beforeprint', () => {
    _printOpened = Array.from(document.querySelectorAll('.tab-panel.active details:not([open])'));
    _printOpened.forEach(d => { d.open = true; });
  });
  window.addEventListener('afterprint', () => { _printOpened.forEach(d => { d.open = false; }); _printOpened = []; });

  // Nama berkas PDF mengikuti judul dokumen saat dicetak; karakter yang tidak boleh di nama berkas diganti.
  function laporanPdfTitle(periodLabel) {
    const l = String(periodLabel || '').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
    return 'Laporan Keuangan' + (l ? ' - ' + l : '');
  }
  // Ada transaksi pada periode (dan akun) yang sedang dilihat? Kalau tidak, tidak ada yang perlu dicetak.
  function laporanTxns(data, range) {
    return (data.txns || []).filter(t => t.date >= range.start && t.date <= range.end &&
      (state.laporanAccFilter === 'all' || t.accountId === state.laporanAccFilter || t.toAccountId === state.laporanAccFilter));
  }
  function laporanHasData(data, range) { return laporanTxns(data, range).length > 0; }
  // Unduh CSV transaksi pada periode dan filter akun yang sedang dilihat di Laporan
  async function exportLaporanCsv() {
    const data = loadData(), range = getLaporanRange(data), txns = laporanTxns(data, range);
    if (!txns.length) { showToast('Tidak ada transaksi di periode ini untuk diunduh.', 'error'); return; }
    await saveTextFile('laporan-' + exportUserPrefix() + '-' + range.start + '_' + range.end + '.csv', buildTxnCsv(data, txns), 'text/csv;charset=utf-8', 'CSV laporan (' + txns.length + ' transaksi)', 'laporan-export-msg');
  }
  // Tombol "Cetak / simpan PDF": membuka jendela cetak browser (pilih "Simpan sebagai PDF"). Layout cetak ada di @media print.
  function exportLaporanPdf() {
    const data = loadData();
    if (!laporanHasData(data, getLaporanRange(data))) { showToast('Tidak ada transaksi di periode ini untuk dicetak.', 'error'); return; }
    const prevTitle = document.title;
    document.title = laporanPdfTitle($('laporan-period-label')?.textContent);
    const restoreTitle = () => {
      document.title = prevTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };
    window.addEventListener('afterprint', restoreTitle);
    try {
      if (typeof window.print !== 'function') throw new Error('print tidak tersedia');
      window.print();
    } catch (e) {
      restoreTitle();
      showToast('Cetak tidak tersedia di tampilan ini. Buka app langsung di browser.', 'error');
    }
  }

  function onLaporanCustomChange() {
    state.laporanCustomStart = $('laporan-custom-start').value || null;
    state.laporanCustomEnd = $('laporan-custom-end').value || null;
    renderLaporan();
  }

  function getLaporanRange(data) {
    if (state.laporanPeriod === 'custom') {
      const s = state.laporanCustomStart || todayStr();
      const e = state.laporanCustomEnd || s;
      return e < s ? { start: e, end: s } : { start: s, end: e };
    }
    if (state.laporanPeriod === 'alltime') {
      const txns = (data && data.txns) || [];
      if (txns.length === 0) { const t = todayStr(); return { start: t, end: t }; }
      const dates = txns.map(t => t.date).sort();
      return { start: dates[0], end: dates[dates.length - 1] };
    }
    const d = state.laporanRefDate;
    if (state.laporanPeriod === 'harian') {
      const s = dateToStr(d);
      return { start: s, end: s };
    }
    if (state.laporanPeriod === 'mingguan') {
      const day = d.getDay();
      const diffToMonday = (day === 0 ? -6 : 1 - day);
      const monday = new Date(d); monday.setDate(d.getDate() + diffToMonday);
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
      return { start: dateToStr(monday), end: dateToStr(sunday) };
    }
    if (state.laporanPeriod === 'bulanan') {
      const first = new Date(d.getFullYear(), d.getMonth(), 1);
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return { start: dateToStr(first), end: dateToStr(last) };
    }
    if (state.laporanPeriod === '3bulan') {
      const first = new Date(d.getFullYear(), d.getMonth() - 2, 1);
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return { start: dateToStr(first), end: dateToStr(last) };
    }
    // 1tahun
    const first = new Date(d.getFullYear(), 0, 1);
    const last = new Date(d.getFullYear(), 11, 31);
    return { start: dateToStr(first), end: dateToStr(last) };
  }

  function laporanPeriodLabel(range) {
    if (state.laporanPeriod === 'harian') return formatDayLabel(range.start);
    if (state.laporanPeriod === 'mingguan') return dayShortLabel(range.start) + ' – ' + dayShortLabel(range.end);
    if (state.laporanPeriod === 'bulanan') {
      const [y, m] = range.start.split('-').map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    }
    if (state.laporanPeriod === '3bulan') {
      const [ys, ms] = range.start.split('-').map(Number);
      const [ye, me] = range.end.split('-').map(Number);
      const startLabel = new Date(ys, ms - 1, 1).toLocaleDateString('id-ID', { month: 'short' });
      const endLabel = new Date(ye, me - 1, 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
      return startLabel + ' – ' + endLabel;
    }
    if (state.laporanPeriod === '1tahun') {
      const [y] = range.start.split('-').map(Number);
      return String(y);
    }
    if (state.laporanPeriod === 'alltime') {
      return 'Semua Waktu (' + dayShortLabel(range.start) + ' – ' + dayShortLabel(range.end) + ')';
    }
    return dayShortLabel(range.start) + ' – ' + dayShortLabel(range.end);
  }

  function renderLaporanFilters(data) {
    const accRow = $('laporan-acc-filter-row');
    accRow.innerHTML = '';
    const allChip = document.createElement('button');
    allChip.className = 'chip' + (state.laporanAccFilter === 'all' ? ' active' : '');
    allChip.textContent = 'Semua akun';
    allChip.onclick = () => { state.laporanAccFilter = 'all'; renderLaporan(); };
    accRow.appendChild(allChip);
    data.accounts.forEach(acc => {
      const chip = document.createElement('button');
      chip.className = 'chip' + (state.laporanAccFilter === acc.id ? ' active' : '');
      chip.textContent = acc.name;
      chip.onclick = () => { state.laporanAccFilter = acc.id; renderLaporan(); };
      accRow.appendChild(chip);
    });

    const catsMasuk = Array.from(new Set(data.txns.filter(t => t.type === 'masuk' && !isNonOperatingTxn(t)).map(t => t.category || 'Tanpa kategori')));
    const catMasukRow = $('laporan-cat-masuk-row');
    catMasukRow.innerHTML = '';
    const allMasukChip = document.createElement('button');
    allMasukChip.className = 'chip' + (state.laporanCatMasukFilter === 'all' ? ' active' : '');
    allMasukChip.textContent = 'Semua';
    allMasukChip.onclick = () => { state.laporanCatMasukFilter = 'all'; renderLaporan(); };
    catMasukRow.appendChild(allMasukChip);
    catsMasuk.forEach(cat => {
      const chip = document.createElement('button');
      chip.className = 'chip' + (state.laporanCatMasukFilter === cat ? ' active' : '');
      chip.textContent = cat;
      chip.onclick = () => { state.laporanCatMasukFilter = cat; renderLaporan(); };
      catMasukRow.appendChild(chip);
    });

    const catsKeluar = Array.from(new Set(data.txns.filter(t => t.type === 'keluar' && !isNonOperatingTxn(t)).map(t => t.category || 'Tanpa kategori')));
    const catKeluarRow = $('laporan-cat-keluar-row');
    catKeluarRow.innerHTML = '';
    const allKeluarChip = document.createElement('button');
    allKeluarChip.className = 'chip' + (state.laporanCatKeluarFilter === 'all' ? ' active' : '');
    allKeluarChip.textContent = 'Semua';
    allKeluarChip.onclick = () => { state.laporanCatKeluarFilter = 'all'; renderLaporan(); };
    catKeluarRow.appendChild(allKeluarChip);
    catsKeluar.forEach(cat => {
      const chip = document.createElement('button');
      chip.className = 'chip' + (state.laporanCatKeluarFilter === cat ? ' active' : '');
      chip.textContent = cat;
      chip.onclick = () => { state.laporanCatKeluarFilter = cat; renderLaporan(); };
      catKeluarRow.appendChild(chip);
    });
  }

  // Ringkasan per kategori (lihat renderLaporanCatCard di bawah).
  const CAT_TOP_N = 6;
  function formatCatPct(amount, total) {
    const p = total > 0 ? (amount / total) * 100 : 0;
    if (p > 0 && p < 1) return '<1%';
    return Math.round(p) + '%';
  }
  function summarizeCategories(txns) {
    const sums = {};
    txns.forEach(t => {
      const key = t.category || 'Tanpa kategori';
      if (!sums[key]) sums[key] = { category: key, amount: 0, count: 0 };
      sums[key].amount += t.amount; sums[key].count++;
    });
    return Object.values(sums).sort((x, y) => y.amount - x.amount);
  }
  // Dua kartu: satu untuk Pemasukan dan satu untuk Pengeluaran. Judul + total di kepala kartu, lalu daftar kategorinya
  // (nama, jumlah transaksi, nominal, persen, bilah). Bilah dibandingkan dengan kategori terbesar di kartu itu supaya
  // kategori kecil tetap terbaca; persen terhadap total. Lebih dari CAT_TOP_N kategori: sisanya dilipat
  // ("Lihat N kategori lainnya"), tetapi tampil semua saat dicetak. Ketuk baris untuk memfilter ke kategori itu, ketuk lagi untuk semua.
  function renderLaporanCatCard(containerId, kind, txns, total, colorVar, title) {
    const container = $(containerId);
    if (!container) return;
    const head = `<div class="cat-head"><span class="cat-title">${escapeHtml(title)}</span><span class="cat-total" style="color:var(${colorVar}-ink);">${total > 0 ? formatRp(total) : 'Rp0'}</span></div>`;
    if (txns.length === 0 || total <= 0) {
      container.innerHTML = `<div class="cat-list">${head}<div class="empty">Tidak ada transaksi di periode ini.</div></div>`;
      return;
    }
    const active = kind === 'masuk' ? state.laporanCatMasukFilter : state.laporanCatKeluarFilter;
    const items = summarizeCategories(txns);
    const max = items[0].amount || 1;
    const expanded = !!(state.laporanCatExpanded && state.laporanCatExpanded[kind]);
    const extra = items.length - CAT_TOP_N;
    const rows = items.map((item, i) => {
      const w = Math.max(2, Math.round((item.amount / max) * 100));
      return `<div class="cat-row${i >= CAT_TOP_N ? ' cat-extra' : ''}${active === item.category ? ' active' : ''}" role="button" tabindex="0" data-act="toggleLaporanCat" data-a0="${escapeHtml(kind)}" data-a1="${escapeHtml(item.category)}" aria-label="Filter kategori ${escapeHtml(item.category)}">
        <div class="cat-main"><span class="cat-name">${escapeHtml(item.category)}<span class="cat-count">${item.count}x</span></span>
          <span class="cat-amt" style="color:var(${colorVar});">${formatRp(item.amount)}<span class="cat-pct">${formatCatPct(item.amount, total)}</span></span></div>
        <div class="cat-bar"><div class="cat-bar-fill" style="width:${w}%; background:var(${colorVar});"></div></div>
      </div>`;
    }).join('');
    const more = extra > 0
      ? `<button type="button" class="cat-more no-print" data-act="toggleLaporanCatMore" data-a0="${escapeHtml(kind)}">${expanded ? 'Tampilkan lebih sedikit' : 'Lihat ' + extra + ' kategori lainnya'}</button>` : '';
    container.innerHTML = `<div class="cat-list${expanded ? ' expanded' : ''}">${head}${rows}${more}</div>`;
  }
  function toggleLaporanCat(kind, cat) {
    const key = kind === 'masuk' ? 'laporanCatMasukFilter' : 'laporanCatKeluarFilter';
    state[key] = state[key] === cat ? 'all' : cat;
    renderLaporan();
  }
  function toggleLaporanCatMore(kind) {
    if (!state.laporanCatExpanded) state.laporanCatExpanded = {};
    state.laporanCatExpanded[kind] = !state.laporanCatExpanded[kind];
    renderLaporan();
  }

  function renderLaporanTrendChart(range, masukTxns, keluarTxns) {
    const svg = $('laporan-trend-chart');
    if (!svg) return;

    const days = [];
    const cursor = new Date(range.start + 'T00:00:00');
    const endDate = new Date(range.end + 'T00:00:00');
    while (cursor <= endDate && days.length < 366) {
      days.push(dateToStr(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    if (days.length === 0) days.push(range.start);

    const inByDay = {}, outByDay = {};
    days.forEach(d => { inByDay[d] = 0; outByDay[d] = 0; });
    masukTxns.forEach(t => { if (t.date in inByDay) inByDay[t.date] += t.amount; });
    keluarTxns.forEach(t => { if (t.date in outByDay) outByDay[t.date] += t.amount; });

    const inVals = days.map(d => inByDay[d]);
    const outVals = days.map(d => outByDay[d]);
    const maxVal = Math.max(1, ...inVals, ...outVals);

    const W = 320, H = 138;
    const padTop = 20, padBottom = 18, padSide = 4;
    const chartH = H - padTop - padBottom;
    const chartW = W - padSide * 2;
    const n = days.length;
    const stepX = chartW / (n - 1 || 1);
    const xAt = i => padSide + i * stepX;
    const yAt = v => padTop + chartH - (v / maxVal) * chartH;
    const baseY = padTop + chartH;

    const inXs = inVals.map((_, i) => xAt(i));
    const inYs = inVals.map(v => yAt(v));
    const outXs = outVals.map((_, i) => xAt(i));
    const outYs = outVals.map(v => yAt(v));
    const inLineD = smoothPathD(inXs, inYs);
    const outLineD = smoothPathD(outXs, outYs);
    const inAreaD = `${inLineD} L${inXs[inXs.length - 1].toFixed(2)},${baseY.toFixed(2)} L${inXs[0].toFixed(2)},${baseY.toFixed(2)} Z`;

    let svgContent = '';
    svgContent += `<line x1="${padSide}" y1="${baseY.toFixed(1)}" x2="${W - padSide}" y2="${baseY.toFixed(1)}" class="svg-stroke-line" stroke-width="1" stroke-dasharray="3,3"></line>`;
    svgContent += `<path d="${inAreaD}" style="fill:var(--green); opacity:0.12"></path>`;
    svgContent += `<path d="${outLineD}" style="fill:none; stroke:var(--red)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>`;
    svgContent += `<path d="${inLineD}" style="fill:none; stroke:var(--green)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>`;

    const lastX = xAt(n - 1);

    // Tandai titik puncak (nilai tertinggi) tiap garis — bukan titik hari terakhir, karena
    // hari terakhir bisa saja belum ada transaksi (nilainya 0) meski hari lain di periode ini ada.
    const inPeakIdx = inVals.reduce((best, v, i) => (v > inVals[best] ? i : best), 0);
    const outPeakIdx = outVals.reduce((best, v, i) => (v > outVals[best] ? i : best), 0);
    const inPeakVal = inVals[inPeakIdx], outPeakVal = outVals[outPeakIdx];
    const inPeakX = xAt(inPeakIdx), inPeakY = yAt(inPeakVal);
    const outPeakX = xAt(outPeakIdx), outPeakY = yAt(outPeakVal);
    svgContent += `<circle cx="${inPeakX.toFixed(1)}" cy="${inPeakY.toFixed(1)}" r="3.5" class="svg-fill-green"></circle>`;
    svgContent += `<circle cx="${outPeakX.toFixed(1)}" cy="${outPeakY.toFixed(1)}" r="3.5" class="svg-fill-red"></circle>`;

    // Label nilai puncak, nempel di kurva (sama seperti kurva cashflow di Ringkasan).
    const anchorFor = x => (x < 40 ? 'start' : (x > W - 40 ? 'end' : 'middle'));
    let inLabelY = Math.max(inPeakY - 10, 11);
    let outLabelY = Math.max(outPeakY - 10, 11);
    if (Math.abs(inPeakX - outPeakX) < 34 && Math.abs(inLabelY - outLabelY) < 12) {
      if (inLabelY <= outLabelY) { outLabelY = inLabelY + 12; } else { inLabelY = outLabelY + 12; }
    }

    const labelIdx = n === 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1];
    svgContent += `<g id="laporan-trend-chart-perm-labels" style="transition:opacity 0.12s;">`;
    if (inPeakVal > 0) {
      svgContent += `<text x="${inPeakX.toFixed(1)}" y="${inLabelY.toFixed(1)}" text-anchor="${anchorFor(inPeakX)}" font-size="11" font-weight="600" class="svg-fill-green" font-family="Inter, sans-serif">${formatRp(inPeakVal)}</text>`;
    }
    if (outPeakVal > 0) {
      svgContent += `<text x="${outPeakX.toFixed(1)}" y="${outLabelY.toFixed(1)}" text-anchor="${anchorFor(outPeakX)}" font-size="11" font-weight="600" class="svg-fill-red" font-family="Inter, sans-serif">${formatRp(outPeakVal)}</text>`;
    }
    labelIdx.forEach(i => {
      const anchor = i === 0 ? 'start' : (i === n - 1 ? 'end' : 'middle');
      svgContent += `<text x="${xAt(i).toFixed(1)}" y="${H - 6}" text-anchor="${anchor}" font-size="9" class="svg-fill-soft" font-family="Inter, sans-serif">${dayShortLabel(days[i])}</text>`;
    });
    svgContent += `</g>`;
    svgContent += tooltipGroupSvgMulti('laporan-trend-chart', 2);

    svg.innerHTML = svgContent;
    chartGeom['laporan-trend-chart'] = {
      days, xAt, yAt, W, H, padTop, padBottom, padSide,
      series: [
        { label: 'Masuk', values: inVals, color: 'var(--green)' },
        { label: 'Keluar', values: outVals, color: 'var(--red)' }
      ],
      formatValue: v => formatRp(v),
      formatDate: dayShortLabel
    };
    bindChartInteraction('laporan-trend-chart');
  }

  function renderLaporan(data, balances) {
    if (!data) data = loadData();
    const labelEl = $('laporan-period-label');
    if (!labelEl) return;

    const range = getLaporanRange(data);
    labelEl.textContent = laporanPeriodLabel(range);
    renderLaporanPrintHead(data, labelEl.textContent);

    renderLaporanFilters(data);

    let txns = data.txns.filter(t => t.date >= range.start && t.date <= range.end);
    if (state.laporanAccFilter !== 'all') {
      txns = txns.filter(t => t.accountId === state.laporanAccFilter || t.toAccountId === state.laporanAccFilter);
    }

    // Sama dengan Ringkasan: bayar utang & pencairan pinjaman tidak dihitung sebagai pengeluaran/pemasukan.
    const masukTxns = txns.filter(t => t.type === 'masuk' && !isNonOperatingTxn(t) && (state.laporanCatMasukFilter === 'all' || (t.category || 'Tanpa kategori') === state.laporanCatMasukFilter));
    const keluarTxns = txns.filter(t => t.type === 'keluar' && !isNonOperatingTxn(t) && (state.laporanCatKeluarFilter === 'all' || (t.category || 'Tanpa kategori') === state.laporanCatKeluarFilter));

    const totalIn = masukTxns.reduce((s, t) => s + t.amount, 0);
    const totalOut = keluarTxns.reduce((s, t) => s + t.amount, 0);
    const net = totalIn - totalOut;

    $('laporan-total-in').textContent = formatRp(totalIn);
    $('laporan-total-out').textContent = formatRp(totalOut);
    const netEl = $('laporan-net');
    netEl.textContent = formatRp(net);
    netEl.style.color = net < 0 ? 'var(--red-ink)' : 'var(--green-ink)';
    const debtNoteEl = $('laporan-debt-note');
    if (debtNoteEl) {
      const fl = debtFlowsOf(data, txns);
      const bits = [];
      if (fl.paid > 0) bits.push('bayar utang & cicilan ' + formatRp(fl.paid));
      if (fl.disbursed > 0) bits.push('pencairan pinjaman ' + formatRp(fl.disbursed));
      debtNoteEl.style.display = bits.length ? 'block' : 'none';
      debtNoteEl.textContent = bits.length ? 'Tidak dihitung di atas: ' + bits.join(' · ') : '';
    }

    renderLaporanTrendChart(range, masukTxns, keluarTxns);
    renderLaporanCatCard('laporan-cat-masuk-list', 'masuk', masukTxns, totalIn, '--green', 'Pemasukan per kategori');
    renderLaporanCatCard('laporan-cat-keluar-list', 'keluar', keluarTxns, totalOut, '--red', 'Pengeluaran per kategori');
    renderLaporanTagCard(masukTxns.concat(keluarTxns));

    const biggestLabelEl = $('laporan-biggest-expense-label');
    const biggestAmountEl = $('laporan-biggest-expense-amount');
    if (keluarTxns.length > 0) {
      const biggest = keluarTxns.reduce((max, t) => t.amount > max.amount ? t : max, keluarTxns[0]);
      biggestLabelEl.textContent = 'Pengeluaran terbesar: ' + (biggest.desc || biggest.category || 'Transaksi');
      biggestAmountEl.textContent = formatRp(biggest.amount);
    } else {
      biggestLabelEl.textContent = 'Pengeluaran terbesar';
      biggestAmountEl.textContent = '—';
    }

    const dayCount = Math.max(1, Math.round((new Date(range.end + 'T00:00:00') - new Date(range.start + 'T00:00:00')) / 86400000) + 1);
    $('laporan-avg-daily-expense').textContent = formatRp(Math.round(totalOut / dayCount));

    renderLaporanExtra(data, range, dayCount, txns, masukTxns, keluarTxns, totalIn, totalOut, balances);
  }

