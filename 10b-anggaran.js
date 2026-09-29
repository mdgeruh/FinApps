  // ============================================================
  // ANGGARAN PER KATEGORI (v1.1.056)
  // data.budgets = { '<kategori pengeluaran>': nominal per bulan }. Opsional; data lama tanpa `budgets` tetap valid.
  // Realisasi = pengeluaran bulan ini per kategori, tanpa arus utang (isDebtFlowTxn), sama seperti kartu "Bulan ini".
  // Ambang peringatan: 80% (kuning), 100% (merah).
  // ============================================================
  const BUDGET_WARN_PCT = 80;
  const BUDGET_EXCLUDED = ['Cicilan/utang', 'Penyesuaian saldo']; // sudah tercatat sebagai arus utang, bukan pengeluaran

  function budgetCategories() { return CATEGORIES.keluar.filter(c => BUDGET_EXCLUDED.indexOf(c) < 0); }

  // Rapikan isi budgets dari sumber apa pun (import/sync): hanya kategori keluar yang dikenal, nominal > 0, 2 desimal.
  function sanitizeBudgets(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    budgetCategories().forEach(c => {
      const v = raw[c];
      if (typeof v === 'number' && isFinite(v) && v > 0 && v < 1e13) out[c] = roundMoney(v);
    });
    return out;
  }

  // Fungsi murni: daftar { category, limit, spent, pct, status } untuk satu bulan ('YYYY-MM'), urut pemakaian tertinggi.
  function computeBudgetStatus(data, monthKey) {
    const budgets = sanitizeBudgets(data && data.budgets);
    const spent = {};
    ((data && data.txns) || []).forEach(t => {
      if (t.type !== 'keluar' || isNonOperatingTxn(t) || monthKeyFromDate(t.date) !== monthKey) return;
      if (budgets[t.category] === undefined) return;
      spent[t.category] = (spent[t.category] || 0) + t.amount;
    });
    return Object.keys(budgets).map(c => {
      const s = roundMoney(spent[c] || 0), limit = budgets[c], pct = (s / limit) * 100;
      return { category: c, limit, spent: s, pct, status: pct > 100 ? 'over' : (pct >= BUDGET_WARN_PCT ? 'warn' : 'ok') };
    }).sort((a, b) => b.pct - a.pct);
  }

  // Proyeksi akhir bulan (v1.1.073, R8). Fungsi murni.
  // Pengeluaran sungguhan (tanpa bayar utang) sampai hari ini dibagi jumlah hari berjalan, dikali jumlah hari sebulan
  // (= yang sudah keluar + rata-rata harian x sisa hari). Kalau ada anggaran, dibandingkan hanya untuk kategori yang
  // dianggarkan (total semua pengeluaran vs batas beberapa kategori tidak sebanding). null bila belum ada pengeluaran.
  function computeMonthProjection(data, monthKey, day, daysInMonth) {
    if (!(day >= 1) || !(daysInMonth >= day)) return null;
    let spent = 0;
    ((data && data.txns) || []).forEach(t => {
      if (t.type === 'keluar' && !isNonOperatingTxn(t) && monthKeyFromDate(t.date) === monthKey) spent += t.amount;
    });
    spent = roundMoney(spent);
    if (!(spent > 0)) return null;
    const factor = daysInMonth / day;
    const out = { spent, day, daysInMonth, remaining: daysInMonth - day, projected: roundMoney(spent * factor), rough: day < 7, budget: null };
    const items = computeBudgetStatus(data, monthKey);
    if (items.length) {
      const limit = roundMoney(items.reduce((s, it) => s + it.limit, 0));
      const bSpent = roundMoney(items.reduce((s, it) => s + it.spent, 0));
      const projected = roundMoney(bSpent * factor);
      out.budget = { limit, spent: bSpent, projected, diff: roundMoney(projected - limit), status: projected > limit ? 'over' : (projected >= limit * BUDGET_WARN_PCT / 100 ? 'warn' : 'ok') };
    }
    return out;
  }

  function renderBudgetCard(data) {
    const card = $('budget-card'), list = $('budget-list');
    if (!card || !list) return;
    const now = todayGmt8();
    const key = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const items = computeBudgetStatus(data, key);
    if (!items.length) {
      list.innerHTML = '<div class="acc-sub">Belum ada anggaran. Atur batas bulanan per kategori untuk memantau pengeluaran.</div>';
      return;
    }
    const color = { ok: 'var(--green)', warn: 'var(--amber)', over: 'var(--red)' };
    list.innerHTML = items.map(it => {
      const w = Math.min(100, it.pct);
      const note = it.status === 'over' ? 'Lebih ' + formatRp(it.spent - it.limit) : 'Sisa ' + formatRp(it.limit - it.spent);
      return `<div class="budget-row">
        <div class="budget-top"><span class="budget-name">${escapeHtml(it.category)}</span><span class="acc-sub">${formatRp(it.spent)} / ${formatRp(it.limit)}</span></div>
        <div class="acc-bar"><div class="acc-bar-fill" style="width:${w.toFixed(1)}%; background:${color[it.status]};"></div></div>
        <div class="acc-sub" style="color:${it.status === 'ok' ? 'var(--ink-soft)' : color[it.status]};">${Math.round(it.pct)}% · ${note}</div>
      </div>`;
    }).join('');
  }

  function openBudgetForm() {
    const budgets = sanitizeBudgets(loadData().budgets);
    $('budget-form-list').innerHTML = budgetCategories().map((c, i) =>
      `<label class="budget-field"><span class="field-label">${escapeHtml(c)}</span>
        <input type="number" inputmode="numeric" min="0" step="1" placeholder="Tanpa batas" data-budget-cat="${escapeHtml(c)}" value="${budgets[c] !== undefined ? budgets[c] : ''}" aria-label="Anggaran ${escapeHtml(c)}"></label>`).join('');
    $('budget-form').classList.add('open');
  }
  function closeBudgetForm() { $('budget-form').classList.remove('open'); }
  function saveBudgetForm() {
    const raw = {};
    document.querySelectorAll('#budget-form-list input[data-budget-cat]').forEach(inp => {
      const v = parseFloat(inp.value);
      if (isFinite(v) && v > 0) raw[inp.getAttribute('data-budget-cat')] = v;
    });
    const data = loadData();
    data.budgets = sanitizeBudgets(raw);
    saveData(data);
    closeBudgetForm();
    render();
  }

  // Import gabung: anggaran dari file hanya mengisi kategori yang belum punya anggaran (tidak menimpa yang sudah diatur).
  function mergeImportedBudgets(data, parsed) {
    const incoming = sanitizeBudgets(parsed && !Array.isArray(parsed) ? parsed.budgets : null);
    const cur = sanitizeBudgets(data.budgets);
    Object.keys(incoming).forEach(c => { if (cur[c] === undefined) cur[c] = incoming[c]; });
    if (Object.keys(cur).length) data.budgets = cur;
  }
