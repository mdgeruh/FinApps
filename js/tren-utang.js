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

  // Perkiraan bulan lunas (v1.1.192, S5). Fungsi murni. Per akun utang yang masih bersaldo negatif, bulan lunas =
  // bulan jatuh tempo terakhir di jadwalnya, dengan asumsi angsuran dibayar sesuai jadwal:
  //  - pinjaman bank/online: baris terakhir computeLoanSchedule (sudah memuat bulan "bunga saja" yang menggeser jadwal)
  //  - PayLater: jatuh tempo terakhir dari cicilan (plans) yang belum lunas
  //  - kartu kredit, dan akun tanpa jadwal (pinjaman tanpa tenor/tanggal cair): tidak bisa diperkirakan -> `unknown`
  // Jadwal yang sudah lewat tapi belum lunas dihitung bulan ini. Akun diarsipkan atau tanpa utang dilewati.
  // Hasil: null (tidak ada utang) atau { ym: 'YYYY-MM' | null, months, accounts: [{ name, ym }], unknown: [nama] }.
  function estimateDebtFree(data, today) {
    today = today || todayStr();
    const nowYm = today.slice(0, 7);
    const accounts = [], unknown = [];
    let maxYm = '';
    data.accounts.forEach(a => {
      if (!TYPE_DEBT[a.type] || a.archived) return;
      const bal = accountBalance(data, a.id);
      if (!(bal < 0)) return;
      let end = '';
      if (TYPE_LOAN[a.type]) {
        const sch = computeLoanSchedule(data, a, bal);
        if (sch && sch.rows.length) end = sch.rows[sch.rows.length - 1].due;
      } else if (a.type === 'paylater') {
        (Array.isArray(a.plans) ? a.plans : []).forEach(pl => {
          const sc = paylaterPlanSchedule(data, a, pl);
          if (sc && sc.k < sc.tenor && sc.last > end) end = sc.last;
        });
      }
      if (!end) { unknown.push(a.name); return; }
      const ym = end.slice(0, 7) < nowYm ? nowYm : end.slice(0, 7);
      accounts.push({ name: a.name, ym });
      if (ym > maxYm) maxYm = ym;
    });
    if (!accounts.length && !unknown.length) return null;
    const months = maxYm ? (Number(maxYm.slice(0, 4)) - Number(nowYm.slice(0, 4))) * 12 + Number(maxYm.slice(5, 7)) - Number(nowYm.slice(5, 7)) : 0;
    return { ym: maxYm || null, months, accounts, unknown };
  }

  // Kalimat untuk kartu Tren total utang; '' = sembunyikan.
  function describeDebtFree(est) {
    if (!est) return '';
    let unk = '';
    if (est.unknown.length) {
      const shown = est.unknown.slice(0, 3).join(', ') + (est.unknown.length > 3 ? ' dan ' + (est.unknown.length - 3) + ' lainnya' : '');
      unk = shown;
    }
    if (!est.ym) return 'Belum bisa memperkirakan bulan lunas: ' + unk + ' tidak punya jadwal cicilan.';
    const when = est.months <= 0 ? 'bulan ini' : fmtBulanTahun(est.ym + '-01') + ' (' + est.months + ' bulan lagi)';
    return 'Perkiraan lunas: ' + when + ', bila angsuran dibayar sesuai jadwal.' + (unk ? ' Belum termasuk ' + unk + ' (tanpa jadwal cicilan).' : '');
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
        if (state.balanceHidden) { sumEl.textContent = 'Sekarang ' + HIDDEN_RP; sumEl.style.color = 'var(--ink)'; }
        else {
          sumEl.textContent = 'Sekarang ' + formatRp(last.total) + (delta === 0 ? ', sama seperti awal periode' : (delta > 0 ? ', ▲ naik ' : ', ▼ turun ') + formatRp(Math.abs(delta)) + ' dalam ' + periodText);
          sumEl.style.color = delta > 0 ? 'var(--red-ink)' : (delta < 0 ? 'var(--green-ink)' : '');
        }
      }
    }
    // Gaya sama dengan kurva kekayaan bersih (v1.1.187): garis mulus + area gradasi, hanya titik terakhir yang diberi
    // penanda, nilai akhir di kanan atas dan nilai awal di kiri bawah, tanpa label sumbu (periode ada di tooltip).
    const { W, H } = chartDims(svg, 170, 230), padBottom = 20, padTop = 28, padSide = 4;
    const chartH = H - padBottom - padTop;
    const maxVal = Math.max(1, ...trend.map(t => t.total));
    const stepX = (W - padSide * 2) / Math.max(1, trend.length - 1);
    const xAt = i => padSide + i * stepX;
    const yAt = v => padTop + chartH - (v / maxVal) * chartH;
    const baseY = yAt(0), xs = trend.map((_, i) => xAt(i)), ys = trend.map(t => yAt(t.total));
    const lineD = monotonePathD(xs, ys);
    const tipByKey = {}; buckets.forEach(b => { tipByKey[b.key] = bucketTipLabel(b); });
    const lastX = xs[xs.length - 1], lastY = ys[ys.length - 1], firstX = xs[0], firstY = ys[0];
    let svgContent = `<defs><linearGradient id="debt-trend-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--rust)" stop-opacity="0.28"></stop>
        <stop offset="100%" stop-color="var(--rust)" stop-opacity="0"></stop>
      </linearGradient></defs>`;
    svgContent += `<path d="${lineD} L${lastX.toFixed(2)},${baseY.toFixed(2)} L${firstX.toFixed(2)},${baseY.toFixed(2)} Z" fill="url(#debt-trend-grad)"></path>`;
    svgContent += `<path d="${lineD}" style="fill:none; stroke:var(--rust)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"></path>`;
    svgContent += `<circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3.5" style="fill:var(--rust)"></circle>`;
    const endLabelY = Math.min(Math.max(padTop - 10, 11), Math.max(11, lastY - 16));
    const startLabelY = Math.max(Math.min(H - padBottom + 16, H - 6), Math.min(H - 6, firstY + 22));
    svgContent += `<g id="debt-trend-chart-perm-labels" style="transition:opacity 0.12s;">`;
    svgContent += `<text x="${lastX.toFixed(1)}" y="${endLabelY.toFixed(1)}" text-anchor="end" font-size="11" font-weight="600" class="svg-fill-soft" font-family="Inter, sans-serif">${state.balanceHidden ? HIDDEN_RP : formatRp(last.total)}</text>`;
    svgContent += `<text x="${firstX.toFixed(1)}" y="${startLabelY.toFixed(1)}" text-anchor="start" font-size="11" font-weight="600" class="svg-fill-soft" font-family="Inter, sans-serif">${state.balanceHidden ? HIDDEN_RP : formatRp(first.total)}</text>`;
    svgContent += `</g>`;
    svgContent += tooltipGroupSvgMulti('debt-trend-chart', 1);
    svg.innerHTML = svgContent;
    chartGeom['debt-trend-chart'] = {
      days: trend.map(t => t.key), xAt, yAt, W, H, padTop, padBottom, padSide,
      series: [{ label: 'Total utang', values: trend.map(t => t.total), color: 'var(--rust)' }],
      formatValue: v => state.balanceHidden ? HIDDEN_RP : formatRp(v),
      formatDate: k => tipByKey[k] || k
    };
    bindChartInteraction('debt-trend-chart');
    const etaEl = $('debt-trend-eta');
    if (etaEl) { const txt = describeDebtFree(estimateDebtFree(data, todayStr())); etaEl.textContent = txt; etaEl.style.display = txt ? '' : 'none'; }
  }
