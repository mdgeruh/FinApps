  // ============================================================
  // TREN TOTAL UTANG (v1.1.064)
  // Total utang di akhir tiap bulan (6 bulan terakhir; bulan berjalan sampai hari ini) = jumlah saldo negatif semua akun utang
  // (kartu kredit, PayLater, pinjaman bank, pinjaman online) dari accountBalanceAsOf. Saldo positif (kelebihan bayar) dihitung 0.
  // Angka mengikuti saldo yang tercatat; saldo awal akun dianggap sudah ada sejak bulan pertama.
  // ============================================================
  const DEBT_TREND_MONTHS = 6;

  // Fungsi murni. today = 'YYYY-MM-DD'. Hasil: [{ key: 'YYYY-MM', date: 'YYYY-MM-DD', total }] urut lama -> baru.
  function computeDebtTrend(data, today) {
    today = today || todayStr();
    const [y, m] = today.split('-').map(Number);
    const p2 = n => String(n).padStart(2, '0');
    const out = [];
    for (let i = DEBT_TREND_MONTHS - 1; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1);
      const key = d.getFullYear() + '-' + p2(d.getMonth() + 1);
      out.push({ key, date: i === 0 ? today : key + '-' + p2(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()), total: 0 });
    }
    const totals = computeDebtAtDates(data, out.map(o => o.date));
    out.forEach((o, i) => { o.total = totals[i]; });
    return out;
  }

  // Fungsi murni: total utang (jumlah saldo negatif akun utang) pada tiap tanggal di `dates` (urut lama -> baru).
  function computeDebtAtDates(data, dates) {
    const debtAccs = data.accounts.filter(a => TYPE_DEBT[a.type]);
    // Satu lintasan (v1.1.074, R9): saldo tiap akun utang pada tiap tanggal akhir bulan dihitung sekaligus, bukan
    // accountBalanceAsOf per akun per bulan (yang menelusuri seluruh transaksi berulang-ulang). Hasil identik dengan
    // cara lama (dijaga test). Akun dengan riwayat penilaian (hasValuations) tetap lewat accountBalanceAsOf.
    const n = dates.length;
    const perAcc = new Map(); // id akun -> saldo pada tiap tanggal
    const totals = new Array(n).fill(0);
    const addBal = (bal) => { for (let i = 0; i < n; i++) if (bal[i] < 0) totals[i] += -bal[i]; };
    debtAccs.forEach(a => {
      if (hasValuations(a)) { addBal(dates.map(dt => accountBalanceAsOf(data, a.id, dt))); return; }
      if (!perAcc.has(a.id)) perAcc.set(a.id, new Array(n).fill(a.initialBalance || 0));
    });
    const bump = (id, date, delta) => {
      const arr = perAcc.get(id);
      if (!arr) return;
      for (let i = 0; i < n; i++) if (date <= dates[i]) arr[i] += delta;
    };
    data.txns.forEach(t => {
      if (t.type === 'masuk') bump(t.accountId, t.date, t.amount);
      else if (t.type === 'keluar') bump(t.accountId, t.date, -t.amount);
      else if (t.type === 'transfer') { bump(t.accountId, t.date, -t.amount); bump(t.toAccountId, t.date, t.amount); }
    });
    perAcc.forEach(addBal);
    return totals.map(roundMoney);
  }

  function renderDebtTrendChart(data) {
    const svg = $('debt-trend-chart');
    if (!svg) return;
    // Periode mengikuti pemilih yang sama dengan kurva lain (v1.1.125): total utang di akhir tiap bucket waktu.
    const buckets = chartBuckets(trendPeriodDays);
    const totals = computeDebtAtDates(data, buckets.map(b => b.to));
    const trend = buckets.map((b, i) => ({ b, key: b.key, total: totals[i] }));
    const periodText = bucketPeriodText(buckets);
    const titleEl = $('debt-trend-title');
    if (titleEl) titleEl.textContent = `Tren total utang (${periodText})`;
    const sumEl = $('debt-trend-summary');
    const last = trend[trend.length - 1], first = trend[0];
    if (sumEl) {
      if (trend.every(t => t.total === 0)) { sumEl.textContent = 'Tidak ada utang tercatat dalam ' + periodText + '.'; sumEl.style.color = ''; }
      else {
        const delta = roundMoney(last.total - first.total);
        sumEl.textContent = 'Sekarang ' + formatRp(last.total) + (delta === 0 ? ', sama seperti awal periode' : (delta > 0 ? ', ▲ naik ' : ', ▼ turun ') + formatRp(Math.abs(delta)) + ' dalam ' + periodText);
        sumEl.style.color = delta > 0 ? 'var(--red-ink)' : (delta < 0 ? 'var(--green-ink)' : '');
      }
    }
    // Garis seperti kurva cashflow (v1.1.124): garis mulus + area tipis, titik per bucket, nilai terakhir tertulis.
    const { W, H } = chartDims(svg, 170, 230), padBottom = 22, padTop = 26, padSide = 18;
    const chartH = H - padBottom - padTop;
    const maxVal = Math.max(1, ...trend.map(t => t.total));
    const stepX = (W - padSide * 2) / Math.max(1, trend.length - 1);
    const xAt = i => padSide + i * stepX;
    const yAt = v => padTop + chartH - (v / maxVal) * chartH;
    const baseY = yAt(0), xs = trend.map((_, i) => xAt(i)), ys = trend.map(t => yAt(t.total));
    const lineD = monotonePathD(xs, ys);
    const tipByKey = {}; buckets.forEach(b => { tipByKey[b.key] = bucketTipLabel(b); });
    let svgContent = `<line x1="${padSide}" y1="${baseY.toFixed(1)}" x2="${W - padSide}" y2="${baseY.toFixed(1)}" class="svg-stroke-line" stroke-width="1" stroke-dasharray="3,3"></line>`;
    svgContent += `<path d="${lineD} L${xs[xs.length - 1].toFixed(2)},${baseY.toFixed(2)} L${xs[0].toFixed(2)},${baseY.toFixed(2)} Z" style="fill:var(--rust); opacity:0.12"></path>`;
    svgContent += `<path d="${lineD}" style="fill:none; stroke:var(--rust)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>`;
    ys.forEach((y, i) => { svgContent += `<circle cx="${xs[i].toFixed(1)}" cy="${y.toFixed(1)}" r="${i === ys.length - 1 ? 3.5 : 2.5}" style="fill:var(--rust)"></circle>`; });
    buckets.forEach((b, i) => {
      svgContent += `<text x="${xs[i].toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="9" class="svg-fill-soft" font-family="Inter, sans-serif">${bucketAxisLabel(b)}</text>`;
    });
    const endLabelY = Math.max(11, ys[ys.length - 1] - 10);
    svgContent += `<g id="debt-trend-chart-perm-labels" style="transition:opacity 0.12s;">`;
    svgContent += `<text x="${xs[xs.length - 1].toFixed(1)}" y="${endLabelY.toFixed(1)}" text-anchor="end" font-size="11" font-weight="600" class="svg-fill-soft" font-family="Inter, sans-serif">${formatRp(last.total)}</text>`;
    svgContent += `</g>`;
    svgContent += tooltipGroupSvgMulti('debt-trend-chart', 1);
    svg.innerHTML = svgContent;
    chartGeom['debt-trend-chart'] = {
      days: trend.map(t => t.key), xAt, yAt, W, H, padTop, padBottom, padSide,
      series: [{ label: 'Total utang', values: trend.map(t => t.total), color: 'var(--rust)' }],
      formatValue: v => formatRp(v),
      formatDate: k => tipByKey[k] || k
    };
    bindChartInteraction('debt-trend-chart');
  }
