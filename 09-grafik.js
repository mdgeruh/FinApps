  // ============================================================
  // GRAFIK (SVG): tren, net worth, cashflow, kategori
  // ============================================================
  function monthKeyFromDate(dateStr) {
    return dateStr.slice(0, 7); // YYYY-MM
  }

  function monthShortLabel(key) {
    const [y, m] = key.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('id-ID', { month: 'short' });
  }

  function renderTrendChart(data) {
    const svg = $('trend-chart');
    if (!svg) return;

    const now = todayGmt8();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
    }

    const totals = months.map(key => {
      let inSum = 0, outSum = 0;
      data.txns.forEach(t => {
        if (monthKeyFromDate(t.date) !== key) return;
        if (isNonOperatingTxn(t)) return;
        if (t.type === 'masuk') inSum += t.amount;
        else if (t.type === 'keluar') outSum += t.amount;
      });
      return { key, inSum, outSum };
    });

    const maxVal = Math.max(1, ...totals.flatMap(t => [t.inSum, t.outSum]));
    const W = 320, H = 170;
    const padBottom = 22, padTop = 10, padSide = 10;
    const chartH = H - padBottom - padTop;
    const groupW = (W - padSide * 2) / months.length;
    const barW = Math.min(16, groupW / 3);
    const xAt = i => padSide + i * groupW + groupW / 2;
    const yAt = v => padTop + chartH - (v / maxVal) * chartH;

    let svgContent = '';
    totals.forEach((t, i) => {
      const gx = xAt(i);
      const inH = (t.inSum / maxVal) * chartH;
      const outH = (t.outSum / maxVal) * chartH;
      const inX = gx - barW - 2;
      const outX = gx + 2;
      svgContent += `<rect x="${inX.toFixed(1)}" y="${(padTop + chartH - inH).toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(inH, 0).toFixed(1)}" rx="2" style="fill:var(--green)"></rect>`;
      svgContent += `<rect x="${outX.toFixed(1)}" y="${(padTop + chartH - outH).toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(outH, 0).toFixed(1)}" rx="2" style="fill:var(--red)"></rect>`;
      svgContent += `<text x="${gx.toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="9" style="fill:var(--ink-soft)" font-family="Inter, sans-serif">${monthShortLabel(t.key)}</text>`;
    });
    svgContent += `<line x1="${padSide}" y1="${padTop + chartH}" x2="${W - padSide}" y2="${padTop + chartH}" style="stroke:var(--line)" stroke-width="1"></line>`;
    svgContent += tooltipGroupSvgMulti('trend-chart', 2);

    svg.innerHTML = svgContent;
    chartGeom['trend-chart'] = {
      days: months, xAt, yAt, W, H, padTop, padBottom, padSide,
      series: [
        { label: 'Pemasukan', values: totals.map(t => t.inSum), color: 'var(--green)' },
        { label: 'Pengeluaran', values: totals.map(t => t.outSum), color: 'var(--red)' }
      ],
      formatValue: v => formatRp(v),
      formatDate: monthShortLabel
    };
    bindChartInteraction('trend-chart');
  }

  function dayShortLabel(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }

  // ===== Interaksi hover/tap pada kurva (chart-geom + tooltip) =====
  const chartGeom = {};

  // Ukur lebar teks yang sebenarnya (pakai canvas) supaya kotak tooltip bisa menyesuaikan
  // isinya - nama akun ada yang pendek ("BCA") ada yang panjang ("Kartu Kredit BCA"),
  // jadi lebar kotak yang tetap gampang bikin teksnya kepotong/keluar kotak.
  let __measureCtx = null;
  function measureTextWidth(text, fontSize, fontWeight) {
    if (!__measureCtx) __measureCtx = document.createElement('canvas').getContext('2d');
    __measureCtx.font = `${fontWeight || 400} ${fontSize}px Inter, sans-serif`;
    return __measureCtx.measureText(text).width;
  }

  function updateChartTooltip(svgId, idx) {
    const geom = chartGeom[svgId];
    if (!geom || geom.days[idx] === undefined) return;
    // Ambil langsung dari DOM (bukan cache $()) karena grup tooltip ini dibuat ulang
    // setiap kurva digambar ulang (ganti periode dll), jadi id-nya sama tapi elemennya baru.
    const g = document.getElementById(svgId + '-tooltip');
    if (!g) return;
    if (geom.series) { updateMultiChartTooltip(svgId, geom, g, idx); return; }
    const x = geom.xAt(idx);
    const v = geom.points[idx];
    const y = geom.yAt(v);
    const color = typeof geom.color === 'function' ? geom.color(v) : geom.color;

    const line = g.querySelector('.tt-line');
    const dot = g.querySelector('.tt-dot');
    const bg = g.querySelector('.tt-bg');
    const valText = g.querySelector('.tt-val');
    const dateText = g.querySelector('.tt-date');

    line.setAttribute('x1', x.toFixed(1)); line.setAttribute('x2', x.toFixed(1));
    line.setAttribute('y1', geom.padTop); line.setAttribute('y2', (geom.H - geom.padBottom).toFixed(1));

    dot.setAttribute('cx', x.toFixed(1)); dot.setAttribute('cy', y.toFixed(1));
    dot.setAttribute('fill', color);

    const valStr = geom.formatValue(v);
    const dateStr = geom.formatDate(geom.days[idx]);
    const textW = Math.max(measureTextWidth(valStr, 10.5, 700), measureTextWidth(dateStr, 8.5, 400));
    const boxW = Math.min(Math.max(textW + 20, 72), geom.W - geom.padSide * 2);
    const boxH = 30;
    const above = y - (boxH + 8) >= geom.padTop;
    const boxY = above ? y - (boxH + 8) : y + 10;
    let boxX = x - boxW / 2;
    boxX = Math.min(Math.max(boxX, geom.padSide), geom.W - geom.padSide - boxW);

    bg.setAttribute('x', boxX.toFixed(1));
    bg.setAttribute('y', boxY.toFixed(1));
    bg.setAttribute('width', boxW.toFixed(1));
    bg.setAttribute('height', boxH);

    const textX = boxX + boxW / 2;
    const textAvail1 = boxW - 14;
    const fitText1 = (el, text, fontSize, fontWeight) => {
      el.textContent = text;
      if (measureTextWidth(text, fontSize, fontWeight) > textAvail1) {
        el.setAttribute('textLength', textAvail1.toFixed(1));
        el.setAttribute('lengthAdjust', 'spacingAndGlyphs');
      } else {
        el.removeAttribute('textLength');
        el.removeAttribute('lengthAdjust');
      }
    };
    valText.setAttribute('x', textX.toFixed(1)); valText.setAttribute('y', (boxY + 13).toFixed(1));
    fitText1(valText, valStr, 10.5, 700);
    dateText.setAttribute('x', textX.toFixed(1)); dateText.setAttribute('y', (boxY + 25).toFixed(1));
    fitText1(dateText, dateStr, 8.5, 400);

    g.style.opacity = '1';
    const perm = document.getElementById(svgId + '-perm-labels');
    if (perm) perm.style.opacity = '0';
  }

  function hideChartTooltip(svgId) {
    const g = document.getElementById(svgId + '-tooltip');
    if (g) g.style.opacity = '0';
    const perm = document.getElementById(svgId + '-perm-labels');
    if (perm) perm.style.opacity = '1';
  }

  // ---------- Aksesibilitas grafik (v1.1.072, R6) ----------
  // Fungsi murni (tanpa DOM): teks untuk pembaca layar dan penanda arah yang tidak bergantung warna.
  function trendArrow(delta) { return delta > 0 ? '▲ ' : (delta < 0 ? '▼ ' : ''); }

  function describeChartPoint(geom, idx) {
    if (!geom || !geom.days || geom.days[idx] === undefined) return '';
    const when = geom.formatDate(geom.days[idx]);
    if (geom.series) return when + ': ' + geom.series.map(s => s.label + ' ' + geom.formatValue(s.values[idx])).join(', ');
    return when + ': ' + geom.formatValue(geom.points[idx]);
  }

  function chartAriaLabel(title, geom) {
    if (!geom || !geom.days || !geom.days.length) return title + '. Belum ada data.';
    const n = geom.days.length;
    return title + '. ' + n + ' titik data, dari ' + geom.formatDate(geom.days[0]) + ' sampai ' + geom.formatDate(geom.days[n - 1]) +
      '. Terakhir, ' + describeChartPoint(geom, n - 1) + '. Fokus lalu pakai panah kiri dan kanan untuk membaca tiap titik.';
  }

  const CATEGORY_TYPE_LABEL = { keluar: 'Pengeluaran', masuk: 'Pemasukan', transfer: 'Transfer' };
  function describePieChart(items, total, typeLabel) {
    if (!items || !items.length || !(total > 0)) return typeLabel + ' bulan ini: belum ada transaksi.';
    const top = items.slice(0, 5).map(it => it.category + ' ' + Math.round(it.amount / total * 100) + ' persen').join(', ');
    return typeLabel + ' bulan ini, total ' + formatRp(total) + '. ' + (items.length > 5 ? 'Lima terbesar: ' : '') + top + '.';
  }

  const elText = (id, fallback) => { const el = document.getElementById(id); return (el && el.textContent) || fallback; };
  const CHART_TITLES = {
    'networth-chart': () => elText('networth-title', 'Kurva kekayaan bersih'),
    'cashflow-chart': () => elText('cashflow-title', 'Kurva cashflow'),
    'trend-chart': 'Pemasukan dan pengeluaran, 6 bulan terakhir',
    'debt-trend-chart': 'Tren total utang, 6 bulan terakhir',
    'laporan-trend-chart': 'Pemasukan dan pengeluaran pada periode laporan'
  };
  function chartTitleFor(svgId) { const t = CHART_TITLES[svgId]; return typeof t === 'function' ? t() : (t || 'Grafik'); }

  // Dipanggil tiap grafik digambar ulang, jadi label selalu mengikuti data terbaru.
  function applyChartA11y(svg, svgId) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('tabindex', '0');
    svg.setAttribute('aria-label', chartAriaLabel(chartTitleFor(svgId), chartGeom[svgId]));
  }

  function bindChartInteraction(svgId) {
    const svg = $(svgId);
    if (svg) applyChartA11y(svg, svgId);
    if (!svg || svg.dataset.interactiveBound) return;
    svg.dataset.interactiveBound = '1';
    svg.style.touchAction = 'none';
    svg.style.cursor = 'pointer';

    const posToIndex = (clientX) => {
      const geom = chartGeom[svgId];
      if (!geom) return null;
      const rect = svg.getBoundingClientRect();
      if (!rect.width) return null;
      const relX = (clientX - rect.left) / rect.width * geom.W;
      let nearest = 0, minDist = Infinity;
      geom.days.forEach((_, i) => {
        const dx = Math.abs(geom.xAt(i) - relX);
        if (dx < minDist) { minDist = dx; nearest = i; }
      });
      return nearest;
    };

    // Mouse: tooltip mengikuti kursor langsung (hover asli), tidak perlu tekan dulu.
    const onMouseMove = (e) => {
      const idx = posToIndex(e.clientX);
      if (idx !== null) updateChartTooltip(svgId, idx);
    };
    const onMouseLeave = () => hideChartTooltip(svgId);

    // Sentuh: tap/geser buat cek titik data; tooltip tetap tampil setelah jari diangkat
    // (baru hilang kalau tap di luar kurva), biar tap sekali cukup - tidak perlu ditahan.
    let touching = false;
    const onTouchStart = (e) => {
      touching = true;
      const idx = posToIndex(e.touches[0].clientX);
      if (idx !== null) updateChartTooltip(svgId, idx);
      e.preventDefault();
    };
    const onTouchMove = (e) => {
      if (!touching) return;
      const idx = posToIndex(e.touches[0].clientX);
      if (idx !== null) updateChartTooltip(svgId, idx);
      e.preventDefault();
    };
    const onTouchEnd = () => { touching = false; };
    const onDocTouchStart = (e) => {
      if (touching) return;
      if (!svg.contains(e.target)) hideChartTooltip(svgId);
    };

    // Keyboard (R6): fokus menampilkan titik terakhir; panah kiri/kanan, Home, End berpindah titik; Esc menutup.
    // Isi titik dibacakan lewat wilayah aria-live #chart-live.
    let kbIdx = null;
    const announce = (idx) => { const live = document.getElementById('chart-live'); if (live) live.textContent = describeChartPoint(chartGeom[svgId], idx); };
    const onKeyDown = (e) => {
      const geom = chartGeom[svgId];
      if (!geom || !geom.days || !geom.days.length) return;
      const n = geom.days.length;
      let idx = kbIdx === null ? n - 1 : Math.min(kbIdx, n - 1);
      if (e.key === 'ArrowRight') idx = Math.min(n - 1, idx + 1);
      else if (e.key === 'ArrowLeft') idx = Math.max(0, idx - 1);
      else if (e.key === 'Home') idx = 0;
      else if (e.key === 'End') idx = n - 1;
      else if (e.key === 'Escape') { kbIdx = null; hideChartTooltip(svgId); return; }
      else return;
      e.preventDefault();
      kbIdx = idx;
      updateChartTooltip(svgId, idx);
      announce(idx);
    };
    const onFocus = () => {
      let visible = true;
      try { visible = svg.matches(':focus-visible'); } catch (_) { /* browser lama: anggap keyboard */ }
      const geom = chartGeom[svgId];
      if (!visible || !geom || !geom.days || !geom.days.length) return; // klik mouse tidak perlu memaksa titik terakhir
      kbIdx = geom.days.length - 1;
      updateChartTooltip(svgId, kbIdx);
      announce(kbIdx);
    };
    const onBlur = () => { kbIdx = null; hideChartTooltip(svgId); };
    svg.addEventListener('keydown', onKeyDown);
    svg.addEventListener('focus', onFocus);
    svg.addEventListener('blur', onBlur);

    svg.addEventListener('mousemove', onMouseMove);
    svg.addEventListener('mouseleave', onMouseLeave);
    svg.addEventListener('touchstart', onTouchStart, { passive: false });
    svg.addEventListener('touchmove', onTouchMove, { passive: false });
    svg.addEventListener('touchend', onTouchEnd);
    svg.addEventListener('touchcancel', onTouchEnd);
    document.addEventListener('touchstart', onDocTouchStart, { passive: true });
  }

  function tooltipGroupSvg(svgId) {
    return `<g id="${svgId}-tooltip" style="opacity:0; transition:opacity 0.12s; pointer-events:none;">
      <line class="tt-line" x1="0" y1="0" x2="0" y2="0" stroke="var(--ink-soft)" stroke-width="1" stroke-dasharray="2,2"></line>
      <rect class="tt-bg" x="0" y="0" width="1" height="1" rx="6" fill="var(--ink)"></rect>
      <text class="tt-val" x="0" y="0" font-size="10.5" font-weight="700" fill="var(--paper)" font-family="Inter, sans-serif" text-anchor="middle"></text>
      <text class="tt-date" x="0" y="0" font-size="8.5" fill="var(--paper)" opacity="0.75" font-family="Inter, sans-serif" text-anchor="middle"></text>
      <circle class="tt-dot" r="4" fill="var(--teal)" stroke="var(--card)" stroke-width="1.5"></circle>
    </g>`;
  }

  // Versi tooltip untuk kurva dengan beberapa seri sekaligus (mis. masuk vs keluar dalam satu chart).
  function tooltipGroupSvgMulti(svgId, seriesCount) {
    let dots = '', vals = '';
    for (let i = 0; i < seriesCount; i++) {
      dots += `<circle class="tt-dot-${i}" r="4" stroke="var(--card)" stroke-width="1.5"></circle>`;
      vals += `<text class="tt-val-${i}" x="0" y="0" font-size="10" font-weight="700" font-family="Inter, sans-serif" text-anchor="middle"></text>`;
    }
    return `<g id="${svgId}-tooltip" style="opacity:0; transition:opacity 0.12s; pointer-events:none;">
      <line class="tt-line" x1="0" y1="0" x2="0" y2="0" stroke="var(--ink-soft)" stroke-width="1" stroke-dasharray="2,2"></line>
      <rect class="tt-bg" x="0" y="0" width="1" height="1" rx="6" fill="var(--ink)"></rect>
      <text class="tt-date" x="0" y="0" font-size="8.5" fill="var(--paper)" opacity="0.75" font-family="Inter, sans-serif" text-anchor="middle"></text>
      ${vals}
      ${dots}
    </g>`;
  }

  function updateMultiChartTooltip(svgId, geom, g, idx) {
    const x = geom.xAt(idx);
    const line = g.querySelector('.tt-line');
    line.setAttribute('x1', x.toFixed(1)); line.setAttribute('x2', x.toFixed(1));
    line.setAttribute('y1', geom.padTop); line.setAttribute('y2', (geom.H - geom.padBottom).toFixed(1));

    const bg = g.querySelector('.tt-bg');
    const dateText = g.querySelector('.tt-date');
    const dateStr = geom.formatDate(geom.days[idx]);
    const lineStrs = geom.series.map(s => `${s.label}: ${geom.formatValue(s.values[idx])}`);
    // Lebar kotak menyesuaikan teks terpanjang (nama akun ada yang pendek "BCA", ada yang
    // panjang "Kartu Kredit BCA") - dulu lebarnya angka tetap jadi nama akun panjang kepotong.
    const widestLine = Math.max(...lineStrs.map(t => measureTextWidth(t, 10, 700)), measureTextWidth(dateStr, 8.5, 400));
    const boxW = Math.min(Math.max(widestLine + 18, 90), geom.W - geom.padSide * 2);
    // Tinggi antar baris biasanya 13px, tapi kalau akunnya banyak (banyak baris) kotak bisa lebih
    // tinggi dari tinggi SVG-nya sendiri dan bagian atas/bawahnya kepotong. Rapatkan barisnya
    // (dengan batas bawah 9px, tetap kebaca) supaya seberapa pun akunnya, kotak selalu utuh muat.
    const maxBoxH = geom.H - 4;
    const lineH = Math.min(13, Math.max(9, (maxBoxH - 16) / geom.series.length));
    const boxH = Math.min(16 + geom.series.length * lineH, maxBoxH);
    const ys = geom.series.map(s => geom.yAt(s.values[idx]));
    const topY = Math.min(...ys), bottomY = Math.max(...ys);
    const above = topY - (boxH + 8) >= geom.padTop;
    let boxY = above ? topY - (boxH + 8) : bottomY + 10;
    // Kotak tooltip tingginya berubah-ubah tergantung jumlah akun yang ditampilkan (Total + tiap akun),
    // jadi kalau akunnya banyak, kotaknya bisa nongol lewat batas atas/bawah kurva dan kepotong SVG.
    // Kunci di sini supaya selalu utuh kelihatan di dalam area kurva.
    boxY = Math.min(Math.max(boxY, 2), geom.H - boxH - 2);
    let boxX = x - boxW / 2;
    boxX = Math.min(Math.max(boxX, geom.padSide), geom.W - geom.padSide - boxW);

    bg.setAttribute('x', boxX.toFixed(1));
    bg.setAttribute('y', boxY.toFixed(1));
    bg.setAttribute('width', boxW.toFixed(1));
    bg.setAttribute('height', boxH);

    const textX = boxX + boxW / 2;
    // Ruang teks efektif di dalam kotak (kurangi padding kiri-kanan). Kalau suatu baris
    // (nama akun panjang dll) tetap lebih lebar dari ini - karena boxW sendiri dibatasi max
    // selebar area chart - teksnya dikompres pakai textLength supaya tidak nongol keluar kotak.
    const textAvail = boxW - 14;
    const fitText = (el, text, fontSize, fontWeight) => {
      el.textContent = text;
      if (measureTextWidth(text, fontSize, fontWeight) > textAvail) {
        el.setAttribute('textLength', textAvail.toFixed(1));
        el.setAttribute('lengthAdjust', 'spacingAndGlyphs');
      } else {
        el.removeAttribute('textLength');
        el.removeAttribute('lengthAdjust');
      }
    };

    dateText.setAttribute('x', textX.toFixed(1));
    dateText.setAttribute('y', (boxY + 12).toFixed(1));
    fitText(dateText, dateStr, 8.5, 400);

    geom.series.forEach((s, i) => {
      const val = s.values[idx];
      const y = geom.yAt(val);
      const dot = g.querySelector('.tt-dot-' + i);
      dot.setAttribute('cx', x.toFixed(1));
      dot.setAttribute('cy', y.toFixed(1));
      dot.setAttribute('fill', s.color);
      const valText = g.querySelector('.tt-val-' + i);
      valText.setAttribute('x', textX.toFixed(1));
      valText.setAttribute('y', (boxY + 12 + (i + 1) * lineH).toFixed(1));
      valText.setAttribute('fill', s.color);
      fitText(valText, lineStrs[i], 10, 700);
    });

    g.style.opacity = '1';
    const perm = document.getElementById(svgId + '-perm-labels');
    if (perm) perm.style.opacity = '0';
  }

  // Catmull-Rom -> bezier: bikin kurva mulus (bukan garis patah-patah) dari titik-titik data.
  function smoothPathD(xs, ys) {
    const n = xs.length;
    if (n === 0) return '';
    if (n === 1) return `M${xs[0].toFixed(2)},${ys[0].toFixed(2)}`;
    if (n === 2) return `M${xs[0].toFixed(2)},${ys[0].toFixed(2)} L${xs[1].toFixed(2)},${ys[1].toFixed(2)}`;
    let d = `M${xs[0].toFixed(2)},${ys[0].toFixed(2)} `;
    for (let i = 0; i < n - 1; i++) {
      const p0x = i > 0 ? xs[i - 1] : xs[i], p0y = i > 0 ? ys[i - 1] : ys[i];
      const p1x = xs[i], p1y = ys[i];
      const p2x = xs[i + 1], p2y = ys[i + 1];
      const p3x = i + 2 < n ? xs[i + 2] : p2x, p3y = i + 2 < n ? ys[i + 2] : p2y;
      const cp1x = p1x + (p2x - p0x) / 6;
      const cp1y = p1y + (p2y - p0y) / 6;
      const cp2x = p2x - (p3x - p1x) / 6;
      const cp2y = p2y - (p3y - p1y) / 6;
      d += `C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2x.toFixed(2)},${p2y.toFixed(2)} `;
    }
    return d.trim();
  }

  // Satu pemilih periode untuk kurva kekayaan bersih & cashflow.
  function setChartPeriod(days) {
    networthPeriodDays = days;
    cashflowPeriodDays = days;
    document.querySelectorAll('[data-chart-period]').forEach(b => b.classList.toggle('active', Number(b.dataset.chartPeriod) === days));
    // Hanya segmen aktif yang digambar; segmen lain menggambar dengan periode baru saat dipilih.
    const cur = activeChartSegmentId();
    if (cur === 'kekayaan' || cur === 'cashflow') renderChartSegment(cur, loadData());
  }

  // ---------- Tampilan kartu Ringkasan (tampil/sembunyi + sembunyi otomatis kalau kosong) ----------
  const RINGKASAN_CARDS = [
    { id: 'month-insight-card', label: 'Bulan ini' },
    { id: 'budget-card', label: 'Anggaran bulan ini' },
    { id: 'sub-card', label: 'Langganan berulang' },
    { id: 'emergency-card', label: 'Dana darurat' },
    { id: 'plan-cta-card', label: 'Ajakan mengatur rencana' },
    { id: 'account-values-card', label: 'Nilai akun' },
    { id: 'recent-txn-card', label: 'Transaksi terbaru' },
    { id: 'networth-chart-card', label: 'Kurva kekayaan bersih' },
    { id: 'cashflow-chart-card', label: 'Kurva cashflow' },
    { id: 'category-chart-card', label: 'Kategori bulan ini' },
    { id: 'trend-chart-card', label: 'Pemasukan vs pengeluaran (6 bulan)' },
    { id: 'debt-trend-card', label: 'Tren total utang' }
  ];
  const RINGKASAN_HIDDEN_KEY = 'keuangan-ringkasan-hidden-v1';
  function loadHiddenCards() {
    try {
      const a = JSON.parse(localStorage.getItem(RINGKASAN_HIDDEN_KEY) || '[]');
      return Array.isArray(a) ? a.filter(x => typeof x === 'string') : [];
    } catch (e) { return []; }
  }
  function saveHiddenCards(list) {
    try { localStorage.setItem(RINGKASAN_HIDDEN_KEY, JSON.stringify(list)); } catch (e) { /* preferensi tampilan, tidak kritis */ }
  }
  // Fungsi murni: fitur perencanaan mana yang sudah dipakai (v1.1.071, R7).
  function computePlanUsage(data) {
    return {
      budget: Object.keys(sanitizeBudgets(data && data.budgets)).length > 0,
      sub: sanitizeSubscriptions(data && data.subscriptions).length > 0,
      emergency: sanitizeEmergencyMonths(data && data.emergencyMonths) > 0
    };
  }

  // Hitung dulu (murni, tanpa menyentuh DOM): kartu mana yang disembunyikan pengguna / kosong.
  // Dipakai sebelum render supaya kartu yang tidak tampil tidak ikut digambar (v1.1.069, R5).
  function computeRingkasanVisibility(data) {
    const hidden = new Set(loadHiddenCards());
    const now = todayGmt8();
    const curKey = now.getFullYear() + '-' + padMonth(now.getMonth() + 1);
    const monthReal = data.txns.filter(t => monthKeyFromDate(t.date || '') === curKey && !isNonOperatingTxn(t));
    const sixKeys = new Set();
    for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); sixKeys.add(d.getFullYear() + '-' + padMonth(d.getMonth() + 1)); }
    const plan = computePlanUsage(data);
    const empty = {
      // R7: kartu rencana yang belum dipakai tidak tampil penuh; diganti satu kartu ajakan ringkas (plan-cta-card)
      'budget-card': !plan.budget,
      'sub-card': !plan.sub,
      'emergency-card': !plan.emergency,
      'plan-cta-card': plan.budget && plan.sub && plan.emergency,
      'category-chart-card': monthReal.length === 0,
      'trend-chart-card': !data.txns.some(t => sixKeys.has(monthKeyFromDate(t.date || '')) && !isNonOperatingTxn(t) && (t.type === 'masuk' || t.type === 'keluar')),
      'debt-trend-card': !data.accounts.some(a => TYPE_DEBT[a.type]),
      'networth-chart-card': data.txns.length === 0,
      'cashflow-chart-card': data.txns.length === 0
    };
    const off = id => hidden.has(id) || !!empty[id];
    return { hidden, empty, off };
  }

  function applyRingkasanVisibility(data, vis) {
    if (!data) data = loadData();
    if (!vis) vis = computeRingkasanVisibility(data);
    RINGKASAN_CARDS.forEach(c => {
      const el = $(c.id);
      if (!el) return;
      el.dataset.userHidden = vis.hidden.has(c.id) ? '1' : '0';
      el.dataset.empty = vis.empty[c.id] ? '1' : '0';
    });
    applyChartSegments(data, vis);
  }

  // ---------- Satu kartu grafik dengan pilihan segmen (v1.1.069, R2) ----------
  // Hanya segmen aktif yang digambar; segmen yang disembunyikan/kosong tidak muncul sebagai pilihan.
  const CHART_SEGMENTS = [
    { id: 'kekayaan', label: 'Kekayaan', card: 'networth-chart-card', period: true },
    { id: 'cashflow', label: 'Cashflow', card: 'cashflow-chart-card', period: true },
    { id: 'kategori', label: 'Kategori', card: 'category-chart-card' },
    { id: 'tren', label: 'Tren', card: 'trend-chart-card' },
    { id: 'utang', label: 'Utang', card: 'debt-trend-card' }
  ];
  const CHART_SEGMENT_KEY = 'keuangan-ringkasan-segmen-v1';
  function loadChartSegment() {
    try { const v = localStorage.getItem(CHART_SEGMENT_KEY); return CHART_SEGMENTS.some(s => s.id === v) ? v : 'kekayaan'; } catch (e) { return 'kekayaan'; }
  }
  let chartSegment = loadChartSegment();

  // Fungsi murni: segmen yang tersedia (tidak disembunyikan, tidak kosong) dan segmen efektif.
  function pickChartSegment(wanted, off) {
    const avail = CHART_SEGMENTS.filter(s => !off(s.card));
    const cur = avail.find(s => s.id === wanted) || avail[0] || null;
    return { avail, cur };
  }
  function activeChartSegmentId() {
    const vis = computeRingkasanVisibility(loadData());
    const p = pickChartSegment(chartSegment, vis.off);
    return p.cur ? p.cur.id : null;
  }

  function renderChartSegment(id, data) {
    if (id === 'kekayaan') renderNetWorthChart(data);
    else if (id === 'cashflow') renderCashflowChart(data);
    else if (id === 'kategori') renderCategoryChart(data);
    else if (id === 'tren') renderTrendChart(data);
    else if (id === 'utang') renderDebtTrendChart(data);
  }

  function applyChartSegments(data, vis) {
    const pc = $('chart-period-card'), row = $('chart-seg-row');
    const p = pickChartSegment(chartSegment, vis.off);
    CHART_SEGMENTS.forEach(s => { const el = $(s.card); if (el) el.dataset.segOff = (p.cur && p.cur.id === s.id) ? '0' : '1'; });
    if (pc) pc.dataset.empty = p.cur ? '0' : '1';
    if (row) {
      row.innerHTML = p.avail.map(s => `<button type="button" class="type-btn${p.cur && p.cur.id === s.id ? ' active' : ''}" role="tab" aria-selected="${p.cur && p.cur.id === s.id}" data-act="setChartSegment" data-a0="${s.id}">${s.label}</button>`).join('');
      row.style.display = p.avail.length > 1 ? 'flex' : 'none';
    }
    const pw = $('chart-period-wrap');
    if (pw) pw.style.display = (p.cur && p.cur.period) ? 'block' : 'none';
    return p.cur ? p.cur.id : null;
  }

  function setChartSegment(id) {
    if (!CHART_SEGMENTS.some(s => s.id === id)) return;
    chartSegment = id;
    try { localStorage.setItem(CHART_SEGMENT_KEY, id); } catch (e) { /* preferensi tampilan, tidak kritis */ }
    const data = loadData();
    const vis = computeRingkasanVisibility(data);
    const cur = applyChartSegments(data, vis);
    if (cur) renderChartSegment(cur, data);
  }

  // ---------- Urutan kartu Ringkasan (v1.1.070, R4) ----------
  // Unit yang bisa diurutkan = anak langsung tab Ringkasan di bawah kartu backup. Grup grafik (#chart-group)
  // bergerak sebagai satu unit. "Bulan ini" sudah memuat rata-rata harian, pengeluaran terbesar, dan beban cicilan (R3).
  const RINGKASAN_ORDER_UNITS = [
    { id: 'month-insight-card', label: 'Bulan ini' },
    { id: 'budget-card', label: 'Anggaran bulan ini' },
    { id: 'sub-card', label: 'Langganan berulang' },
    { id: 'emergency-card', label: 'Dana darurat' },
    { id: 'plan-cta-card', label: 'Ajakan mengatur rencana' },
    { id: 'account-values-card', label: 'Nilai akun' },
    { id: 'recent-txn-card', label: 'Transaksi terbaru' },
    { id: 'chart-group', label: 'Grafik' }
  ];
  const RINGKASAN_ORDER_KEY = 'keuangan-ringkasan-order-v1';
  // Fungsi murni: id dikenal saja, tanpa duplikat, urutan tersimpan dipertahankan. Unit yang belum ada di daftar
  // tersimpan (mis. unit baru dari versi lebih baru) disisipkan tepat setelah unit pendahulunya menurut urutan bawaan.
  function sanitizeRingkasanOrder(saved) {
    const known = RINGKASAN_ORDER_UNITS.map(u => u.id);
    const out = [];
    (Array.isArray(saved) ? saved : []).forEach(id => { if (known.includes(id) && !out.includes(id)) out.push(id); });
    known.forEach((id, k) => {
      if (out.includes(id)) return;
      const at = k === 0 ? -1 : out.indexOf(known[k - 1]);
      out.splice(at + 1, 0, id);
    });
    return out;
  }
  // Fungsi murni: geser id satu langkah (dir -1 = naik, +1 = turun); di ujung tidak berubah.
  function moveInOrder(order, id, dir) {
    const arr = order.slice(), i = arr.indexOf(id), j = i + (dir < 0 ? -1 : 1);
    if (i < 0 || j < 0 || j >= arr.length) return arr;
    arr[i] = arr[j]; arr[j] = id;
    return arr;
  }
  function loadRingkasanOrder() {
    try { return sanitizeRingkasanOrder(JSON.parse(localStorage.getItem(RINGKASAN_ORDER_KEY) || '[]')); } catch (e) { return sanitizeRingkasanOrder([]); }
  }
  function saveRingkasanOrder(list) {
    try { localStorage.setItem(RINGKASAN_ORDER_KEY, JSON.stringify(list)); } catch (e) { /* preferensi tampilan, tidak kritis */ }
  }
  // Hanya memindahkan elemen DOM yang sudah ada (isi kartu tidak diubah), tepat setelah kartu backup.
  function applyRingkasanOrder() {
    let prev = $('backup-reminder-card');
    if (!prev) return;
    loadRingkasanOrder().forEach(id => {
      const el = $(id);
      if (!el || el.parentNode !== prev.parentNode) return;
      if (prev.nextElementSibling !== el) prev.after(el);
      prev = el;
    });
  }
  function moveRingkasanCard(id, dir) {
    saveRingkasanOrder(moveInOrder(loadRingkasanOrder(), id, dir));
    applyRingkasanOrder();
    renderRingkasanConfig();
  }

  function renderRingkasanConfig() {
    const el = $('ringkasan-cards-config');
    if (!el) return;
    const hidden = new Set(loadHiddenCards());
    const order = loadRingkasanOrder();
    const label = id => (RINGKASAN_ORDER_UNITS.find(u => u.id === id) || {}).label || id;
    const chk = (c, indent) => `<input type="checkbox" ${hidden.has(c.id) ? '' : 'checked'} data-change-act="toggleRingkasanCardFromEl" data-change-a0="${c.id}" style="width:20px; height:20px; accent-color:var(--green);" aria-label="Tampilkan ${escapeHtml(c.label)}">`;
    const arrows = (id, i) => `<button type="button" class="io-btn order-btn" data-act="moveRingkasanCard" data-a0="${id}" data-n1="-1" ${i === 0 ? 'disabled' : ''} aria-label="Naikkan ${escapeHtml(label(id))}">▲</button><button type="button" class="io-btn order-btn" data-act="moveRingkasanCard" data-a0="${id}" data-n1="1" ${i === order.length - 1 ? 'disabled' : ''} aria-label="Turunkan ${escapeHtml(label(id))}">▼</button>`;
    const chartIds = new Set(CHART_SEGMENTS.map(s => s.card));
    el.innerHTML = order.map((id, i) => {
      if (id === 'chart-group') {
        const sub = RINGKASAN_CARDS.filter(c => chartIds.has(c.id)).map(c => `
          <label class="txn-row" style="cursor:pointer; align-items:center; padding-left:18px;">
            <div class="txn-left"><div class="txn-text"><div class="txn-desc txn-desc-wrap">${escapeHtml(c.label)}</div></div></div>
            <div class="txn-right">${chk(c)}</div>
          </label>`).join('');
        return `<div class="txn-row" style="align-items:center;"><div class="txn-left"><div class="txn-text"><div class="txn-desc txn-desc-wrap">Grafik</div></div></div><div class="txn-right" style="gap:6px;">${arrows(id, i)}</div></div>${sub}`;
      }
      const c = RINGKASAN_CARDS.find(x => x.id === id);
      if (!c) return '';
      return `<div class="txn-row" style="align-items:center;">
        <label class="txn-left" style="cursor:pointer; align-items:center; flex:1;"><div class="txn-text"><div class="txn-desc txn-desc-wrap">${escapeHtml(c.label)}</div></div></label>
        <div class="txn-right" style="gap:6px;">${chk(c)}${arrows(id, i)}</div>
      </div>`;
    }).join('');
  }
  function toggleRingkasanCard(id, show) {
    const set = new Set(loadHiddenCards());
    if (show) set.delete(id); else set.add(id);
    saveHiddenCards(Array.from(set));
    renderTabContent('ringkasan', loadData());
  }
  function resetRingkasanCards() {
    saveHiddenCards([]);
    saveRingkasanOrder(sanitizeRingkasanOrder([]));
    renderRingkasanConfig();
    renderTabContent('ringkasan', loadData());
  }

  let networthPeriodDays = 30;

  function setNetWorthPeriod(days) {
    networthPeriodDays = days;
    document.querySelectorAll('#networth-chart-card .type-btn').forEach(b => b.classList.toggle('active', Number(b.dataset.networthPeriod) === days));
    renderNetWorthChart(loadData());
  }

  function renderNetWorthChart(data) {
    const svg = $('networth-chart');
    const summaryEl = $('networth-summary');
    const titleEl = $('networth-title');
    if (!svg) return;

    const DAYS = Math.max(networthPeriodDays, 2);
    if (titleEl) titleEl.textContent = `Kurva kekayaan bersih (${networthPeriodDays} hari terakhir)`;
    const today = todayGmt8();
    today.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
    }

    // Kekayaan bersih per hari = saldo awal semua akun + kumulatif (masuk - keluar) s/d hari itu.
    // Transfer antar akun sendiri diabaikan karena hasilnya nol terhadap TOTAL kekayaan bersih
    // (uang cuma pindah kantong, bukan nambah/ngurangin total). Ini bikin perhitungan cukup satu
    // kali lewat semua transaksi + satu kali lewat semua hari, bukan diulang per akun per hari
    // (dulu: hari x akun x transaksi, bisa berat untuk 180/360 hari dengan riwayat panjang).
    const accountIds = new Set(data.accounts.map(a => a.id));
    const initialSum = data.accounts.reduce((s, a) => s + (a.initialBalance || 0), 0);
    const firstDay = days[0];
    const deltaByDate = new Map();
    let baseBeforeWindow = initialSum;
    data.txns.forEach(t => {
      if (!accountIds.has(t.accountId)) return;
      if (t.type !== 'masuk' && t.type !== 'keluar') return;
      const delta = t.type === 'masuk' ? t.amount : -t.amount;
      if (t.date < firstDay) baseBeforeWindow += delta;
      else deltaByDate.set(t.date, (deltaByDate.get(t.date) || 0) + delta);
    });
    // Penilaian ulang aset = lompatan kekayaan bersih di tanggal penilaian (nilai baru dikurangi nilai
    // yang seharusnya tanpa penilaian itu). Total di akhir sama dengan saldo aset di header.
    const todayKey = todayStr();
    data.accounts.forEach(acc => {
      if (!hasValuations(acc)) return;
      const vals = acc.valuations.filter(v => v && v.date <= todayKey && typeof v.value === 'number').sort((a, b) => a.date.localeCompare(b.date));
      vals.forEach((v, i) => {
        const before = assetBalance({ id: acc.id, initialBalance: acc.initialBalance, valuations: vals.slice(0, i) }, data.txns, v.date);
        const jump = v.value - before;
        if (Math.abs(jump) < 1e-9) return;
        if (v.date < firstDay) baseBeforeWindow += jump;
        else deltaByDate.set(v.date, (deltaByDate.get(v.date) || 0) + jump);
      });
    });
    let runningNetWorth = baseBeforeWindow;
    const points = days.map(k => { runningNetWorth += (deltaByDate.get(k) || 0); return runningNetWorth; });

    const minV = Math.min(0, ...points);
    const maxV = Math.max(0, ...points);
    const range = (maxV - minV) || 1;

    const W = 320, H = 170;
    const padTop = 28, padBottom = 20, padSide = 4;
    const chartH = H - padTop - padBottom;
    const chartW = W - padSide * 2;
    const stepX = chartW / (days.length - 1 || 1);
    const xAt = i => padSide + i * stepX;
    const yAt = v => padTop + chartH - ((v - minV) / range) * chartH;
    const baseY = padTop + chartH;

    const lastVal = points[points.length - 1];
    const firstVal = points[0];

    const xs = points.map((_, i) => xAt(i));
    const ys = points.map(v => yAt(v));
    const lineD = smoothPathD(xs, ys);
    const areaD = `${lineD} L${xs[xs.length - 1].toFixed(2)},${baseY.toFixed(2)} L${xs[0].toFixed(2)},${baseY.toFixed(2)} Z`;

    let svgContent = '';
    svgContent += `<defs><linearGradient id="networth-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--teal)" stop-opacity="0.28"></stop>
        <stop offset="100%" stop-color="var(--teal)" stop-opacity="0"></stop>
      </linearGradient></defs>`;
    svgContent += `<path d="${areaD}" fill="url(#networth-grad)"></path>`;
    svgContent += `<path d="${lineD}" style="fill:none; stroke:var(--teal)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"></path>`;
    const lastX = xAt(points.length - 1), lastY = yAt(lastVal);
    const firstX = xAt(0), firstY = yAt(firstVal);
    svgContent += `<circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3.5" style="fill:var(--teal)"></circle>`;
    const endLabelY = Math.min(Math.max(padTop - 10, 11), Math.max(11, lastY - 16));
    const startLabelY = Math.max(Math.min(H - padBottom + 16, H - 6), Math.min(H - 6, firstY + 22));
    svgContent += `<g id="networth-chart-perm-labels" style="transition:opacity 0.12s;">`;
    svgContent += `<text x="${lastX.toFixed(1)}" y="${endLabelY.toFixed(1)}" text-anchor="end" font-size="11" font-weight="600" style="fill:var(--ink-soft)" font-family="Inter, sans-serif">${state.balanceHidden ? '•••••••' : formatRp(lastVal)}</text>`;
    svgContent += `<text x="${firstX.toFixed(1)}" y="${startLabelY.toFixed(1)}" text-anchor="start" font-size="11" font-weight="600" style="fill:var(--ink-soft)" font-family="Inter, sans-serif">${state.balanceHidden ? '•••••••' : formatRp(firstVal)}</text>`;
    svgContent += `</g>`;
    svgContent += tooltipGroupSvg('networth-chart');

    svg.innerHTML = svgContent;
    chartGeom['networth-chart'] = {
      days, points, xAt, yAt, W, H, padTop, padBottom, padSide,
      color: 'var(--teal)',
      formatValue: v => state.balanceHidden ? '•••••••' : formatRp(v),
      formatDate: dayShortLabel
    };
    bindChartInteraction('networth-chart');

    if (summaryEl) {
      const delta = lastVal - firstVal;
      const pct = firstVal !== 0 ? (delta / Math.abs(firstVal)) * 100 : (delta !== 0 ? 100 : 0);
      const sign = delta > 0 ? '+' : (delta < 0 ? '−' : '');
      if (state.balanceHidden) {
        summaryEl.textContent = 'Perubahan periode ini: •••••••';
        summaryEl.style.color = 'var(--ink)';
      } else {
        summaryEl.textContent = `Perubahan periode ini: ${trendArrow(delta)}${sign}${formatRp(Math.abs(delta))} (${sign}${Math.abs(pct).toFixed(1)}%)`;
        summaryEl.style.color = delta > 0 ? 'var(--green)' : (delta < 0 ? 'var(--red)' : 'var(--ink-soft)');
      }
    }
  }

  let cashflowPeriodDays = 30;
  let cashflowViewMode = 'per-account'; // 'total' | 'per-account'

  function toggleCashflowView() {
    cashflowViewMode = cashflowViewMode === 'per-account' ? 'total' : 'per-account';
    const btn = $('cashflow-view-toggle');
    if (btn) btn.textContent = cashflowViewMode === 'per-account' ? 'Total saja' : 'Per akun';
    renderCashflowChart(loadData());
  }

  function setCashflowPeriod(days) {
    cashflowPeriodDays = days;
    document.querySelectorAll('#cashflow-chart-card .type-btn').forEach(b => b.classList.toggle('active', Number(b.dataset.cashflowPeriod) === days));
    renderCashflowChart(loadData());
  }

  function renderCashflowChart(data) {
    const svg = $('cashflow-chart');
    const summaryEl = $('cashflow-summary');
    const titleEl = $('cashflow-title');
    const legendEl = $('cashflow-legend');
    const toggleBtn = $('cashflow-view-toggle');
    if (!svg) return;

    const realAccounts = data.accounts.filter(a => a.type !== 'titipan');
    if (toggleBtn) {
      toggleBtn.style.display = realAccounts.length > 1 ? '' : 'none';
      toggleBtn.textContent = cashflowViewMode === 'per-account' ? 'Total saja' : 'Per akun';
    }
    const showPerAccount = cashflowViewMode === 'per-account' && realAccounts.length > 1;

    const DAYS = Math.max(cashflowPeriodDays, 2);
    if (titleEl) titleEl.textContent = `Kurva cashflow (${cashflowPeriodDays} hari terakhir)`;
    const today = todayGmt8();
    today.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
    }

    // Arus kas harian: pemasukan - pengeluaran. Transfer diabaikan karena cuma pindah antar akun sendiri, bukan uang masuk/keluar sungguhan.
    const netByDay = {};
    days.forEach(k => { netByDay[k] = 0; });
    data.txns.forEach(t => {
      if (!(t.date in netByDay)) return;
      if (t.type === 'masuk') netByDay[t.date] += t.amount;
      else if (t.type === 'keluar') netByDay[t.date] -= t.amount;
    });

    let running = 0;
    const rawPoints = days.map(k => { running += netByDay[k]; return running; });

    // Tambah satu titik baseline (0) sebelum hari pertama, biar kurva mulai landai dari 0 - bukan langsung loncat ke nilai hari pertama.
    const baselineDay = (() => {
      const d = new Date(today);
      d.setDate(d.getDate() - DAYS);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    })();
    const days_ = [baselineDay, ...days];
    const points = [0, ...rawPoints];

    // Kurva per akun: arus kas bersih kumulatif masing-masing akun (hanya transaksi masuk/keluar milik akun itu).
    // Dihitung hanya kalau mode "per akun" aktif, dan dalam satu kali pass atas txns untuk
    // SEMUA akun sekaligus (bukan satu pass penuh per akun seperti sebelumnya, yang jadi
    // O(akun x transaksi) - bisa berat kalau akun & riwayat transaksi sama-sama banyak).
    let accountSeries = [];
    if (showPerAccount) {
      const netByAccountDay = {};
      realAccounts.forEach(acc => { netByAccountDay[acc.id] = {}; });
      data.txns.forEach(t => {
        const byDay = netByAccountDay[t.accountId];
        if (!byDay || !(t.date in netByDay)) return;
        if (t.type === 'masuk') byDay[t.date] = (byDay[t.date] || 0) + t.amount;
        else if (t.type === 'keluar') byDay[t.date] = (byDay[t.date] || 0) - t.amount;
      });
      accountSeries = realAccounts.map((acc, i) => {
        const byDay = netByAccountDay[acc.id];
        let run = 0;
        const raw = days.map(k => { run += (byDay[k] || 0); return run; });
        return { acc, colorVar: PIE_COLOR_VARS[i % PIE_COLOR_VARS.length], values: [0, ...raw] };
      });
      // Biar kurva & legend tidak penuh sesak kalau akunnya banyak — cukup 3 akun dengan
      // arus kas (absolut) terbesar dalam periode ini yang ditampilkan.
      accountSeries.sort((a, b) => Math.abs(b.values[b.values.length - 1]) - Math.abs(a.values[a.values.length - 1]));
      accountSeries = accountSeries.slice(0, 3);
    }

    const allValuesForRange = showPerAccount
      ? [...points, ...accountSeries.flatMap(s => s.values)]
      : points;
    const minV = Math.min(0, ...allValuesForRange);
    const maxV = Math.max(0, ...allValuesForRange);
    const range = (maxV - minV) || 1;

    const W = 320, H = 150;
    const padTop = 26, padBottom = 20, padSide = 4;
    const chartH = H - padTop - padBottom;
    const chartW = W - padSide * 2;
    const stepX = chartW / (days_.length - 1 || 1);
    const xAt = i => padSide + i * stepX;
    const yAt = v => padTop + chartH - ((v - minV) / range) * chartH;

    const lastVal = points[points.length - 1];
    const firstVal = points[0];
    const lineColor = lastVal >= 0 ? 'var(--green)' : 'var(--red)';
    const zeroY = yAt(0);

    const xs = points.map((_, i) => xAt(i));
    const ys = points.map(v => yAt(v));
    const lineD = smoothPathD(xs, ys);
    const areaD = `${lineD} L${xs[xs.length - 1].toFixed(2)},${zeroY.toFixed(2)} L${xs[0].toFixed(2)},${zeroY.toFixed(2)} Z`;

    let svgContent = '';
    svgContent += `<line x1="${padSide}" y1="${zeroY.toFixed(1)}" x2="${W - padSide}" y2="${zeroY.toFixed(1)}" style="stroke:var(--line)" stroke-width="1" stroke-dasharray="3,3"></line>`;
    if (!showPerAccount) svgContent += `<path d="${areaD}" style="fill:${lineColor}; opacity:0.12"></path>`;
    svgContent += `<path d="${lineD}" style="fill:none; stroke:${lineColor}" stroke-width="${showPerAccount ? 2.6 : 2}" stroke-linejoin="round" stroke-linecap="round"></path>`;

    // Kurva per akun digambar lebih tipis di atas kurva total, supaya total tetap jadi acuan utama.
    if (showPerAccount) {
      accountSeries.forEach(s => {
        const axs = s.values.map((_, i) => xAt(i));
        const ays = s.values.map(v => yAt(v));
        svgContent += `<path d="${smoothPathD(axs, ays)}" style="fill:none; stroke:var(${s.colorVar})" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" opacity="0.85"></path>`;
      });
    }

    const lastX = xAt(points.length - 1), lastY = yAt(lastVal);
    const firstX = xAt(0), firstY = yAt(firstVal);
    svgContent += `<circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3.5" style="fill:${lineColor}"></circle>`;
    const fmtSigned = v => (v > 0 ? '+' : (v < 0 ? '−' : '')) + formatRp(Math.abs(v));
    const endLabelY = Math.min(Math.max(padTop - 10, 11), Math.max(11, lastY - 16));
    const startLabelY = Math.max(Math.min(H - padBottom + 16, H - 6), Math.min(H - 6, firstY + 22));
    svgContent += `<g id="cashflow-chart-perm-labels" style="transition:opacity 0.12s;">`;
    svgContent += `<text x="${lastX.toFixed(1)}" y="${endLabelY.toFixed(1)}" text-anchor="end" font-size="11" font-weight="600" style="fill:var(--ink-soft)" font-family="Inter, sans-serif">${fmtSigned(lastVal)}</text>`;
    svgContent += `<text x="${firstX.toFixed(1)}" y="${startLabelY.toFixed(1)}" text-anchor="start" font-size="11" font-weight="600" style="fill:var(--ink-soft)" font-family="Inter, sans-serif">${fmtSigned(firstVal)}</text>`;
    svgContent += `</g>`;

    const seriesForTooltip = [{ label: 'Total', values: points, color: lineColor }];
    if (showPerAccount) {
      accountSeries.forEach(s => seriesForTooltip.push({ label: s.acc.name, values: s.values, color: `var(${s.colorVar})` }));
    }
    svgContent += tooltipGroupSvgMulti('cashflow-chart', seriesForTooltip.length);

    svg.innerHTML = svgContent;
    chartGeom['cashflow-chart'] = {
      days: days_, xAt, yAt, W, H, padTop, padBottom, padSide,
      series: seriesForTooltip,
      formatValue: v => fmtSigned(v),
      formatDate: dayShortLabel
    };
    bindChartInteraction('cashflow-chart');

    if (legendEl) {
      const capNote = (showPerAccount && realAccounts.length > 3)
        ? `<div class="acc-sub u-mb6">Top 3 akun (arus kas terbesar)</div>`
        : '';
      legendEl.innerHTML = showPerAccount ? capNote + accountSeries.map(s => {
        const val = s.values[s.values.length - 1];
        return `
          <div class="pie-legend-row">
            <div class="pie-legend-left">
              <span class="pie-dot" style="background:var(${s.colorVar})"></span>
              <span>${escapeHtml(s.acc.name)}</span>
            </div>
            <span class="pie-legend-amount" style="color:${val >= 0 ? 'var(--green)' : 'var(--red)'}">${trendArrow(val)}${fmtSigned(val)}</span>
          </div>
        `;
      }).join('') : '';
    }

    if (summaryEl) {
      const sign = lastVal > 0 ? '+' : (lastVal < 0 ? '−' : '');
      summaryEl.textContent = `Arus kas bersih: ${trendArrow(lastVal)}${sign}${formatRp(Math.abs(lastVal))}`;
      summaryEl.style.color = lastVal > 0 ? 'var(--green)' : (lastVal < 0 ? 'var(--red)' : 'var(--ink-soft)');
    }
  }

  function setCategoryChartType(t) {
    state.categoryChartType = t;
    document.querySelectorAll('#category-chart-card .type-btn').forEach(b => b.classList.toggle('active', b.dataset.catChart === t));
    renderCategoryChart(loadData());
  }

  function renderCategoryChart(data) {
    const svg = $('category-pie-chart');
    const legend = $('category-pie-legend');
    if (!svg || !legend) return;

    const now = todayGmt8();
    const curMonthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const monthTxns = data.txns.filter(t => t.type === state.categoryChartType && monthKeyFromDate(t.date) === curMonthKey && (t.type === 'transfer' || !isNonOperatingTxn(t)));

    const sums = {};
    monthTxns.forEach(t => {
      const key = t.category || 'Tanpa kategori';
      sums[key] = (sums[key] || 0) + t.amount;
    });
    const items = Object.entries(sums).map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
    const total = items.reduce((s, it) => s + it.amount, 0);

    if (items.length === 0 || total <= 0) {
      svg.innerHTML = `<circle cx="60" cy="60" r="52" style="fill:var(--paper-dim)"></circle>`;
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', describePieChart([], 0, CATEGORY_TYPE_LABEL[state.categoryChartType] || 'Kategori'));
      legend.innerHTML = '<div class="empty" style="padding:0;">Belum ada transaksi bulan ini.</div>';
      return;
    }

    const cx = 60, cy = 60, r = 52;
    let svgContent = '';
    if (items.length === 1) {
      svgContent = `<circle cx="${cx}" cy="${cy}" r="${r}" data-idx="0" style="fill:var(${PIE_COLOR_VARS[0]})"></circle>`;
    } else {
      let angleStart = -90;
      items.forEach((item, i) => {
        const angle = (item.amount / total) * 360;
        const angleEnd = angleStart + angle;
        const largeArc = angle > 180 ? 1 : 0;
        const x1 = cx + r * Math.cos(angleStart * Math.PI / 180);
        const y1 = cy + r * Math.sin(angleStart * Math.PI / 180);
        const x2 = cx + r * Math.cos(angleEnd * Math.PI / 180);
        const y2 = cy + r * Math.sin(angleEnd * Math.PI / 180);
        const colorVar = PIE_COLOR_VARS[i % PIE_COLOR_VARS.length];
        svgContent += `<path d="M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" data-idx="${i}" style="fill:var(${colorVar})"></path>`;
        angleStart = angleEnd;
      });
    }
    svg.innerHTML = svgContent;
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', describePieChart(items, total, CATEGORY_TYPE_LABEL[state.categoryChartType] || 'Kategori'));

    legend.innerHTML = items.map((item, i) => {
      const colorVar = PIE_COLOR_VARS[i % PIE_COLOR_VARS.length];
      const pct = Math.round((item.amount / total) * 100);
      return `
        <div class="pie-legend-row clickable" data-idx="${i}" role="button" tabindex="0" aria-label="${escapeHtml(item.category)}, ${pct} persen, ${formatRp(item.amount)}. Buka rincian">
          <div class="pie-legend-left">
            <span class="pie-dot" style="background:var(${colorVar})"></span>
            <span>${escapeHtml(item.category)} · ${pct}%</span>
          </div>
          <span class="pie-legend-amount">${formatRp(item.amount)}</span>
        </div>
      `;
    }).join('');

    // Klik irisan pie atau baris legenda -> buka daftar transaksi kategori itu. Dipasang lewat
    // addEventListener (bukan onclick inline) karena nama kategori bisa teks bebas (custom),
    // jadi berisiko merusak atribut HTML kalau ditulis langsung sebagai string di dalam onclick="".
    svg.querySelectorAll('[data-idx]').forEach(el => {
      el.addEventListener('click', () => openCategoryDetail(items[+el.dataset.idx].category));
    });
    legend.querySelectorAll('.pie-legend-row[data-idx]').forEach(el => {
      el.addEventListener('click', () => openCategoryDetail(items[+el.dataset.idx].category));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCategoryDetail(items[+el.dataset.idx].category); }
      });
    });
  }

  function openCategoryDetail(category) {
    const data = loadData();
    const now = todayGmt8();
    const curMonthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const type = state.categoryChartType;
    const matched = data.txns.filter(t => t.type === type && monthKeyFromDate(t.date) === curMonthKey && (t.category || 'Tanpa kategori') === category);
    matched.sort((a, b) => a.date !== b.date ? b.date.localeCompare(a.date) : 0);
    const total = matched.reduce((s, t) => s + t.amount, 0);

    $('category-detail-name').textContent = category;
    const dotEl = $('category-detail-dot');
    if (dotEl) dotEl.className = 'dot ' + type;
    const amtEl = $('category-detail-amount');
    amtEl.textContent = formatRp(total);
    amtEl.className = 'txn-detail-amount ' + type;
    $('category-detail-meta').textContent = matched.length + (matched.length === 1 ? ' transaksi bulan ini' : ' transaksi bulan ini');

    const accById = {};
    data.accounts.forEach(a => accById[a.id] = a);

    const histEl = $('category-detail-history');
    if (matched.length === 0) {
      histEl.innerHTML = '<div class="empty">Belum ada transaksi.</div>';
    } else {
      histEl.innerHTML = matched.map(t => {
        const accName = accById[t.accountId] ? accById[t.accountId].name : '?';
        let metaText = accName;
        if (t.planId) metaText += ' · Cicilan'; else if (t.method === 'nanti') metaText += ' · Bayar nanti';
        metaText += ' · ' + formatDayLabel(t.date);
        const sign = type === 'masuk' ? '+' : '−';
        return `
          <div class="txn-row clickable" data-act="openTxnDetail" data-a0="${t.id}">
            <div class="txn-left">
              <span class="dot ${t.type}"></span>
              <div class="txn-text">
                <div class="txn-desc">${escapeHtml(t.desc)}</div>
                <div class="txn-meta">${escapeHtml(metaText)}</div>
              </div>
            </div>
            <div class="txn-right">
              <span class="txn-amount ${t.type}">${sign} ${formatRp(t.amount)}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    $('category-detail').classList.add('open');
  }

  function closeCategoryDetail() {
    $('category-detail').classList.remove('open');
  }

  function renderAccountValues(data, balances) {
    if (!balances) balances = computeAllBalances(data);
    const container = $('account-values-list');
    const moreEl = $('account-values-more');
    if (!container) return;
    if (data.accounts.length === 0) {
      container.innerHTML = '<div class="empty">Belum ada akun.</div>';
      if (moreEl) moreEl.style.display = 'none';
      return;
    }
    if (moreEl) {
      const extra = data.accounts.length - 3;
      if (extra > 0) {
        moreEl.textContent = `+${extra} akun lainnya`;
        moreEl.style.display = 'block';
      } else {
        moreEl.style.display = 'none';
      }
    }
    container.innerHTML = data.accounts.slice(0, 3).map(acc => {
      const bal = balances[acc.id];
      const isDebt = TYPE_DEBT[acc.type];
      const colorVar = TYPE_COLOR_VAR[acc.type] || '--teal';
      let valueText, color;
      if (isDebt) {
        const used = bal < 0 ? Math.abs(bal) : 0;
        const overpaid = bal > 0 ? bal : 0;
        valueText = overpaid > 0 ? 'Lebih bayar ' + formatRp(overpaid) : formatRp(-used);
        color = used > 0 ? 'var(--red)' : 'var(--ink)';
      } else if (acc.type === 'titipan') {
        if (bal > 0) { valueText = 'Berutang ' + formatRp(bal); color = 'var(--red)'; }
        else if (bal < 0) { valueText = 'Lebih ' + formatRp(Math.abs(bal)); color = 'var(--green)'; }
        else { valueText = 'Lunas'; color = 'var(--ink-soft)'; }
      } else {
        valueText = formatRp(bal);
        color = bal < 0 ? 'var(--red)' : 'var(--ink)';
      }
      return `
        <div class="txn-row acc-accent" style="--accent-color: var(${colorVar});">
          <div class="txn-left">
            <span class="dot" style="background: var(${colorVar})"></span>
            <div class="txn-text"><div class="txn-desc">${escapeHtml(acc.name)}</div></div>
          </div>
          <div class="txn-right">
            <span class="txn-amount" style="color:${color}">${valueText}</span>
          </div>
        </div>
      `;
    }).join('');
  }


