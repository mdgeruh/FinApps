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
    const debtAccs = data.accounts.filter(a => TYPE_DEBT[a.type]);
    const out = [];
    for (let i = DEBT_TREND_MONTHS - 1; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1);
      const key = d.getFullYear() + '-' + p2(d.getMonth() + 1);
      const date = i === 0 ? today : key + '-' + p2(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate());
      let total = 0;
      debtAccs.forEach(a => { const bal = accountBalanceAsOf(data, a.id, date); if (bal < 0) total += -bal; });
      out.push({ key, date, total: roundMoney(total) });
    }
    return out;
  }

  function renderDebtTrendChart(data) {
    const svg = $('debt-trend-chart');
    if (!svg) return;
    const trend = computeDebtTrend(data);
    const sumEl = $('debt-trend-summary');
    const last = trend[trend.length - 1], prev = trend[trend.length - 2];
    if (sumEl) {
      if (trend.every(t => t.total === 0)) { sumEl.textContent = 'Tidak ada utang tercatat dalam ' + DEBT_TREND_MONTHS + ' bulan terakhir.'; sumEl.style.color = ''; }
      else {
        const delta = roundMoney(last.total - prev.total);
        sumEl.textContent = 'Sekarang ' + formatRp(last.total) + (delta === 0 ? ', sama seperti akhir bulan lalu' : (delta > 0 ? ', naik ' : ', turun ') + formatRp(Math.abs(delta)) + ' dari akhir bulan lalu');
        sumEl.style.color = delta > 0 ? 'var(--red)' : (delta < 0 ? 'var(--green)' : '');
      }
    }
    const W = 320, H = 170, padBottom = 22, padTop = 10, padSide = 10;
    const chartH = H - padBottom - padTop;
    const maxVal = Math.max(1, ...trend.map(t => t.total));
    const groupW = (W - padSide * 2) / trend.length;
    const barW = Math.min(28, groupW * 0.55);
    const xAt = i => padSide + i * groupW + groupW / 2;
    const yAt = v => padTop + chartH - (v / maxVal) * chartH;
    let svgContent = '';
    trend.forEach((t, i) => {
      const h = Math.max(0, (t.total / maxVal) * chartH), gx = xAt(i);
      svgContent += `<rect x="${(gx - barW / 2).toFixed(1)}" y="${(padTop + chartH - h).toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="2" style="fill:var(--rust)"></rect>`;
      svgContent += `<text x="${gx.toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="9" style="fill:var(--ink-soft)" font-family="Inter, sans-serif">${monthShortLabel(t.key)}</text>`;
    });
    svgContent += `<line x1="${padSide}" y1="${padTop + chartH}" x2="${W - padSide}" y2="${padTop + chartH}" style="stroke:var(--line)" stroke-width="1"></line>`;
    svgContent += tooltipGroupSvgMulti('debt-trend-chart', 1);
    svg.innerHTML = svgContent;
    chartGeom['debt-trend-chart'] = {
      days: trend.map(t => t.key), xAt, yAt, W, H, padTop, padBottom, padSide,
      series: [{ label: 'Total utang', values: trend.map(t => t.total), color: 'var(--rust)' }],
      formatValue: v => formatRp(v),
      formatDate: monthShortLabel
    };
    bindChartInteraction('debt-trend-chart');
  }
