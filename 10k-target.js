  // ============================================================
  // TARGET TABUNGAN (v1.1.120)
  // data.goals = [{ id, name, target, deadline, accountId, saved }]
  //  - deadline: 'YYYY-MM-DD' atau '' (tanpa tenggat)
  //  - accountId: akun kas/bank/e-wallet yang saldonya dihitung sebagai terkumpul; '' = dicatat manual lewat `saved`
  // Terkumpul (akun terhubung) = saldo akun, minimal 0; (manual) = jumlah setoran yang dicatat.
  // Setoran per bulan yang disarankan = sisa / sisa bulan (dibulatkan ke atas ke Rp1.000). Sisa bulan = bulan kalender sampai tenggat, sisa hari dibulatkan ke satu bulan.
  // Fungsi hitung murni: sanitizeGoals, goalMonthsLeft, computeGoal.
  // ============================================================
  const GOAL_MAX_ITEMS = 30;
  const GOAL_ACCOUNT_TYPES = ['kas', 'bank', 'ewallet'];

  function sanitizeGoals(raw) {
    if (!Array.isArray(raw)) return [];
    const seen = new Set(), out = [];
    raw.forEach(g => {
      if (out.length >= GOAL_MAX_ITEMS || !g || typeof g !== 'object') return;
      const name = typeof g.name === 'string' ? g.name.trim().slice(0, 60) : '';
      const target = typeof g.target === 'number' && isFinite(g.target) && g.target > 0 && g.target < 1e13 ? roundMoney(g.target) : 0;
      if (!name || !target) return;
      const id = typeof g.id === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(g.id) && !seen.has(g.id) ? g.id : generateId('goal');
      seen.add(id);
      const deadline = typeof g.deadline === 'string' && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(g.deadline) ? g.deadline : '';
      const accountId = typeof g.accountId === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(g.accountId) ? g.accountId : '';
      const saved = !accountId && typeof g.saved === 'number' && isFinite(g.saved) && g.saved > 0 && g.saved < 1e13 ? roundMoney(g.saved) : 0;
      out.push({ id, name, target, deadline, accountId, saved });
    });
    return out;
  }

  // Sisa bulan kalender sampai tenggat: null = tanpa tenggat, 0 = sudah lewat/hari ini; sisa hari dihitung satu bulan penuh.
  function goalMonthsLeft(deadline, today) {
    if (!deadline) return null;
    today = today || todayStr();
    if (deadline <= today) return 0;
    const t = today.split('-').map(Number), d = deadline.split('-').map(Number);
    const plus = n => { const last = new Date(t[0], t[1] - 1 + n + 1, 0).getDate(); return new Date(t[0], t[1] - 1 + n, Math.min(t[2], last)); };
    const dl = new Date(d[0], d[1] - 1, d[2]);
    let m = (d[0] - t[0]) * 12 + (d[1] - t[1]);
    if (plus(m) > dl) m--;
    if (plus(m) < dl) m++;
    return Math.max(1, m);
  }

  function computeGoal(goal, balances, today) {
    const linked = !!goal.accountId;
    const bal = linked && balances && balances[goal.accountId] !== undefined ? balances[goal.accountId] : null;
    const saved = linked ? Math.max(0, bal || 0) : goal.saved;
    const remaining = Math.max(0, roundMoney(goal.target - saved));
    const done = remaining <= 0;
    const monthsLeft = goalMonthsLeft(goal.deadline, today);
    const overdue = !done && monthsLeft === 0;
    const perMonth = !done && monthsLeft ? Math.ceil(remaining / monthsLeft / 1000) * 1000 : 0;
    return { saved, remaining, done, overdue, monthsLeft, perMonth, pct: Math.min(100, saved / goal.target * 100), linked, accountMissing: linked && bal === null };
  }

  function goalAccountList(data) { return data.accounts.filter(a => !a.archived && GOAL_ACCOUNT_TYPES.indexOf(a.type) >= 0); }

  function renderGoalCard(data, balances) {
    const list = $('goal-list');
    if (!list) return;
    const goals = sanitizeGoals(data.goals);
    const accName = {}; data.accounts.forEach(a => accName[a.id] = a.name);
    list.innerHTML = goals.map(g => {
      const r = computeGoal(g, balances);
      const color = r.done ? 'var(--green-ink)' : (r.overdue ? 'var(--red-ink)' : 'var(--blue-ink)');
      const dl = g.deadline ? ' · tenggat ' + new Date(g.deadline + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      let hint;
      if (r.done) hint = 'Tercapai';
      else if (r.overdue) hint = 'Lewat tenggat · kurang ' + formatRp(r.remaining);
      else if (r.perMonth) hint = 'Sisihkan ±' + formatRp(r.perMonth) + '/bulan (' + r.monthsLeft + ' bulan lagi) · kurang ' + formatRp(r.remaining);
      else hint = 'Kurang ' + formatRp(r.remaining);
      const src = r.linked ? (r.accountMissing ? 'akun dihapus' : 'dari ' + accName[g.accountId]) : 'catatan manual';
      return `<div class="goal-row"><div class="budget-top"><span class="budget-name">${escapeHtml(g.name)}</span><span class="acc-sub">${formatRp(r.saved)} / ${formatRp(g.target)}</span></div>
        <div class="acc-bar"><div class="acc-bar-fill" style="width:${r.pct.toFixed(1)}%; background:${color};"></div></div>
        <div class="acc-sub" style="color:${color};">${Math.round(r.pct)}% · ${escapeHtml(hint)}</div>
        <div class="acc-sub">${escapeHtml(src)}${escapeHtml(dl)}</div></div>`;
    }).join('');
  }

  function renderGoalManageList(data, balances) {
    const goals = sanitizeGoals(data.goals);
    $('goal-manage-list').innerHTML = goals.map(g => {
      const r = computeGoal(g, balances);
      return `<div class="budget-top sub-row"><span class="budget-name">${escapeHtml(g.name)}<span class="acc-sub"> · ${formatRp(r.saved)} / ${formatRp(g.target)}</span></span>
        <span class="sub-actions">${r.linked ? '' : `<button type="button" class="see-all-btn" data-act="openGoalDeposit" data-a0="${escapeHtml(g.id)}">Setor</button>`}
        <button type="button" class="see-all-btn" data-act="deleteGoal" data-a0="${escapeHtml(g.id)}">Hapus</button></span></div>`;
    }).join('');
  }

  function onGoalAccountChange() {
    const manual = !$('goal-account-input').value;
    $('goal-saved-row').style.display = manual ? '' : 'none';
  }

  function openGoalForm() {
    const data = loadData();
    const opts = goalAccountList(data).map(a => `<option value="${escapeHtml(a.id)}">${escapeHtml(a.name)}</option>`).join('');
    $('goal-account-input').innerHTML = '<option value="">Tanpa akun (catat setoran manual)</option>' + opts;
    $('goal-name-input').value = ''; $('goal-target-input').value = ''; $('goal-deadline-input').value = ''; $('goal-saved-input').value = '';
    $('goal-form-msg').textContent = '';
    onGoalAccountChange();
    renderGoalManageList(data, computeAllBalances(data));
    $('goal-form').classList.add('open');
  }
  function closeGoalForm() { $('goal-form').classList.remove('open'); }

  function saveGoalForm() {
    const data = loadData();
    const msg = $('goal-form-msg');
    const name = $('goal-name-input').value.trim();
    const target = parseFloat($('goal-target-input').value);
    const deadline = $('goal-deadline-input').value || '';
    const accountId = $('goal-account-input').value;
    const saved = accountId ? 0 : (parseFloat($('goal-saved-input').value) || 0);
    if (!name) { msg.textContent = 'Isi nama target.'; return; }
    if (!(target > 0)) { msg.textContent = 'Nominal target harus lebih dari 0.'; return; }
    if (deadline && deadline < todayStr()) { msg.textContent = 'Tenggat tidak boleh sebelum hari ini.'; return; }
    if (accountId && !goalAccountList(data).some(a => a.id === accountId)) { msg.textContent = 'Pilih akun yang valid.'; return; }
    if (saved < 0) { msg.textContent = 'Terkumpul tidak boleh minus.'; return; }
    const goals = sanitizeGoals(data.goals);
    if (goals.length >= GOAL_MAX_ITEMS) { msg.textContent = 'Maksimal ' + GOAL_MAX_ITEMS + ' target.'; return; }
    goals.push({ id: generateId('goal'), name: name.slice(0, 60), target: roundMoney(target), deadline, accountId, saved: roundMoney(saved) });
    data.goals = sanitizeGoals(goals);
    saveData(data);
    closeGoalForm();
    render();
  }

  async function deleteGoal(id) {
    const data = loadData();
    const goals = sanitizeGoals(data.goals);
    const g = goals.find(x => x.id === id);
    if (!g) return;
    if (!(await showConfirm('Hapus target "' + g.name + '"? Saldo dan transaksi tidak berubah.'))) return;
    data.goals = goals.filter(x => x.id !== id);
    saveData(data);
    renderGoalManageList(data, computeAllBalances(data));
    render();
  }

  // Setoran manual: hanya menambah angka terkumpul pada target itu, tidak membuat transaksi.
  let goalDepositId = '';
  function openGoalDeposit(id) {
    const g = sanitizeGoals(loadData().goals).find(x => x.id === id);
    if (!g) return;
    goalDepositId = id;
    $('goal-deposit-title').textContent = g.name;
    $('goal-deposit-input').value = '';
    $('goal-deposit-msg').textContent = '';
    $('goal-deposit-form').classList.add('open');
  }
  function closeGoalDeposit() { $('goal-deposit-form').classList.remove('open'); }
  function saveGoalDeposit() {
    const amt = parseFloat($('goal-deposit-input').value);
    if (!(amt > 0)) { $('goal-deposit-msg').textContent = 'Nominal setoran harus lebih dari 0.'; return; }
    const data = loadData();
    const goals = sanitizeGoals(data.goals);
    const g = goals.find(x => x.id === goalDepositId);
    if (!g || g.accountId) { closeGoalDeposit(); return; }
    g.saved = Math.min(g.target * 10, roundMoney(g.saved + amt));
    data.goals = goals;
    saveData(data);
    closeGoalDeposit();
    renderGoalManageList(data, computeAllBalances(data));
    render();
  }

  // Import gabung: target yang namanya sama (dan nominal sama) dilewati; akun yang tak dikenal dilepas jadi manual.
  function mergeImportedGoals(data, parsed, idMap) {
    const incoming = sanitizeGoals(parsed && !Array.isArray(parsed) ? parsed.goals : null);
    if (!incoming.length) return;
    const out = sanitizeGoals(data.goals), ids = data.accounts.map(a => a.id);
    incoming.forEach(g => {
      let accountId = g.accountId;
      if (accountId && idMap && idMap[accountId] !== undefined) accountId = idMap[accountId];
      if (accountId && ids.indexOf(accountId) < 0) accountId = '';
      if (out.length >= GOAL_MAX_ITEMS || out.some(x => x.name === g.name && x.target === g.target)) return;
      out.push({ ...g, id: generateId('goal'), accountId, saved: accountId ? 0 : g.saved });
    });
    data.goals = out;
  }
