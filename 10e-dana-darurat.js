  // ============================================================
  // DANA DARURAT (v1.1.059)
  // data.emergencyMonths = target dalam bulan (1-24), opsional; 0/kosong = belum diatur.
  // Target = rata-rata pengeluaran bulanan (90 hari terakhir, tanpa arus utang/cicilan) x jumlah bulan.
  // Dana yang dihitung = kas + bank + e-wallet (computeLiquidFunds). Status: >=100% ok, >=50% warn, selain itu low.
  // ============================================================
  const EMERGENCY_MAX_MONTHS = 24;

  function sanitizeEmergencyMonths(raw) {
    const n = Math.round(Number(raw));
    return isFinite(n) && n >= 1 && n <= EMERGENCY_MAX_MONTHS ? n : 0;
  }

  // Fungsi murni. today = 'YYYY-MM-DD' (opsional, untuk test). Data kurang dari 3 bulan: dibagi umur data (min 1 bulan).
  function emergencyMonthlyExpense(data, today) {
    today = today || todayStr();
    const d0 = new Date(today + 'T00:00:00'); d0.setDate(d0.getDate() - 90);
    const p2 = n => String(n).padStart(2, '0');
    const from = d0.getFullYear() + '-' + p2(d0.getMonth() + 1) + '-' + p2(d0.getDate());
    const exp = data.txns.filter(t => t.type === 'keluar' && !isDebtFlowTxn(t) && t.date >= from && t.date <= today);
    if (!exp.length) return 0;
    const firstAny = data.txns.reduce((m, t) => (t.date && t.date < m) ? t.date : m, today);
    const startD = firstAny > from ? firstAny : from;
    const days = Math.round((new Date(today + 'T00:00:00') - new Date(startD + 'T00:00:00')) / 86400000) + 1;
    const months = Math.min(3, Math.max(1, days / 30));
    return roundMoney(exp.reduce((s, t) => s + t.amount, 0) / months);
  }

  // null = target belum diatur; status 'nodata' = target ada tapi belum ada pengeluaran untuk dijadikan dasar.
  function computeEmergencyFund(data, balances, today) {
    const months = sanitizeEmergencyMonths(data.emergencyMonths);
    if (!months) return null;
    const avg = emergencyMonthlyExpense(data, today);
    const liquid = computeLiquidFunds(data, balances);
    if (!(avg > 0)) return { months, avg: 0, target: 0, liquid, pct: null, cover: null, status: 'nodata' };
    const target = roundMoney(avg * months), pct = liquid / target * 100;
    return { months, avg, target, liquid, pct, cover: liquid / avg, status: pct >= 100 ? 'ok' : (pct >= 50 ? 'warn' : 'low') };
  }

  function renderEmergencyCard(data, balances) {
    const list = $('emergency-list');
    if (!list) return;
    const r = computeEmergencyFund(data, balances);
    if (!r) { list.innerHTML = '<div class="acc-sub">Belum ada target. Atur berapa bulan pengeluaran yang ingin dicadangkan sebagai dana darurat.</div>'; return; }
    if (r.status === 'nodata') { list.innerHTML = '<div class="acc-sub">Target ' + r.months + ' bulan. Belum ada pengeluaran 90 hari terakhir, jadi target belum bisa dihitung. Catat pengeluaran dulu.</div>'; return; }
    const color = { ok: 'var(--green)', warn: 'var(--amber)', low: 'var(--red)' }[r.status];
    const cover = r.cover.toFixed(1).replace('.', ',');
    list.innerHTML = `<div class="budget-top"><span class="budget-name">${formatRp(r.liquid)}</span><span class="acc-sub">target ${formatRp(r.target)}</span></div>
      <div class="acc-bar"><div class="acc-bar-fill" style="width:${Math.min(100, r.pct).toFixed(1)}%; background:${color};"></div></div>
      <div class="acc-sub" style="color:${color};">${Math.round(r.pct)}% · cukup ${cover} bulan dari target ${r.months} bulan${r.status === 'ok' ? '' : ' · kurang ' + formatRp(r.target - r.liquid)}</div>
      <div class="acc-sub u-mt4">Pengeluaran rata-rata ${formatRp(r.avg)}/bulan (90 hari, tanpa cicilan). Dana = kas + bank + e-wallet.</div>`;
  }

  function openEmergencyForm() {
    const m = sanitizeEmergencyMonths(loadData().emergencyMonths);
    $('emergency-months-input').value = m || '';
    $('emergency-form-msg').textContent = '';
    $('emergency-form').classList.add('open');
  }
  function closeEmergencyForm() { $('emergency-form').classList.remove('open'); }
  function saveEmergencyForm() {
    const n = parseInt($('emergency-months-input').value, 10);
    if (!(n >= 1 && n <= EMERGENCY_MAX_MONTHS)) { $('emergency-form-msg').textContent = 'Isi target 1–' + EMERGENCY_MAX_MONTHS + ' bulan.'; return; }
    const data = loadData();
    data.emergencyMonths = n;
    saveData(data);
    closeEmergencyForm();
    render();
  }
  function clearEmergency() {
    const data = loadData();
    delete data.emergencyMonths;
    saveData(data);
    closeEmergencyForm();
    render();
  }

  // Import gabung: target dari file hanya dipakai kalau di sini belum diatur.
  function mergeImportedEmergency(data, parsed) {
    if (sanitizeEmergencyMonths(data.emergencyMonths)) return;
    const v = sanitizeEmergencyMonths(parsed && !Array.isArray(parsed) ? parsed.emergencyMonths : 0);
    if (v) data.emergencyMonths = v;
  }
