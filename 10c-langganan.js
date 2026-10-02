  // ============================================================
  // LANGGANAN BERULANG (v1.1.057)
  // data.subscriptions = [{ id, name, amount, accountId, day, active, lastAppliedMonth }]
  // Tiap bulan, pada tanggal `day`, dibuat 1 transaksi pengeluaran (kategori "Tagihan & langganan")
  // berID deterministik `sub-<id>-<YYYY-MM>`, jadi dua perangkat tidak menghasilkan transaksi ganda.
  // Dijalankan dari runRecurringFees() (bukan dari render()). Bulan yang terlewat dikejar maksimal 12 bulan.
  // ============================================================
  const SUB_CATEGORY = 'Tagihan & langganan';
  const SUB_MAX_ITEMS = 100;
  const SUB_CATCHUP_MONTHS = 12;
  const SUB_ACCOUNT_TYPES = ['kas', 'bank', 'ewallet', 'kartu_kredit'];

  function subMonthKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }

  // Rapikan daftar langganan dari sumber apa pun (import/sync/form).
  function sanitizeSubscriptions(raw) {
    if (!Array.isArray(raw)) return [];
    const seen = new Set(), out = [];
    raw.forEach(s => {
      if (out.length >= SUB_MAX_ITEMS || !s || typeof s !== 'object') return;
      const name = typeof s.name === 'string' ? s.name.trim().slice(0, 60) : '';
      const amount = typeof s.amount === 'number' && isFinite(s.amount) && s.amount > 0 && s.amount < 1e13 ? roundMoney(s.amount) : 0;
      const day = Math.round(Number(s.day));
      if (!name || !amount || typeof s.accountId !== 'string' || !s.accountId || !(day >= 1 && day <= 31)) return;
      const id = typeof s.id === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(s.id) && !seen.has(s.id) ? s.id : generateId('sub');
      seen.add(id);
      out.push({ id, name, amount, accountId: s.accountId, day, active: s.active !== false,
        lastAppliedMonth: typeof s.lastAppliedMonth === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s.lastAppliedMonth) ? s.lastAppliedMonth : '' });
    });
    return out;
  }

  // Bulan terakhir yang dianggap "sudah diproses" untuk langganan baru/diaktifkan lagi:
  // kalau tanggal tagih bulan ini sudah lewat, bulan ini dilewati (tidak mencatat mundur); kalau belum, dicatat saat jatuh tempo.
  function subInitialLastApplied(day, now) {
    now = now || todayGmt8();
    const dueDay = Math.min(day, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());
    const ref = now.getDate() > dueDay ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return subMonthKey(ref);
  }

  function subMonthlyTotal(subs) { return roundMoney(subs.filter(s => s.active).reduce((t, s) => t + s.amount, 0)); }

  function applySubscriptions(data) {
    const subs = sanitizeSubscriptions(data.subscriptions);
    if (!subs.length) return data;
    const now = todayGmt8();
    const accIds = new Set(data.accounts.map(a => a.id));
    const existing = new Set(data.txns.map(t => t.id));
    const floor = new Date(now.getFullYear(), now.getMonth() - (SUB_CATCHUP_MONTHS - 1), 1);
    let dirty = false;
    subs.forEach(s => {
      if (!s.active || !accIds.has(s.accountId)) return;
      { const sa = data.accounts.find(a => a.id === s.accountId); if (sa && sa.archived) return; }   // A4
      let cursor;
      if (s.lastAppliedMonth) {
        const [y, m] = s.lastAppliedMonth.split('-').map(Number);
        cursor = new Date(y, m, 1); // bulan setelah lastAppliedMonth
      } else cursor = new Date(now.getFullYear(), now.getMonth(), 1);
      if (cursor < floor) cursor = floor;
      while (cursor.getFullYear() < now.getFullYear() || (cursor.getFullYear() === now.getFullYear() && cursor.getMonth() <= now.getMonth())) {
        const dueDay = Math.min(s.day, new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate());
        const isCurrent = cursor.getFullYear() === now.getFullYear() && cursor.getMonth() === now.getMonth();
        if (isCurrent && now.getDate() < dueDay) break;
        const key = subMonthKey(cursor), id = 'sub-' + s.id + '-' + key;
        if (!existing.has(id)) {
          existing.add(id);
          data.txns.push({ id, date: key + '-' + String(dueDay).padStart(2, '0'), type: 'keluar', desc: s.name, amount: s.amount, accountId: s.accountId, category: SUB_CATEGORY });
        }
        s.lastAppliedMonth = key; dirty = true;
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      }
    });
    if (dirty) { data.subscriptions = subs; saveData(data); }
    return data;
  }

  function renderSubscriptionCard(data) {
    const list = $('sub-list');
    if (!list) return;
    const subs = sanitizeSubscriptions(data.subscriptions);
    const totalEl = $('sub-total');
    if (totalEl) totalEl.textContent = subs.some(s => s.active) ? formatRp(subMonthlyTotal(subs)) + '/bulan' : '';
    if (!subs.length) { list.innerHTML = '<div class="acc-sub">Belum ada langganan. Tambahkan tagihan rutin agar tercatat otomatis tiap bulan.</div>'; return; }
    const accName = {}; data.accounts.forEach(a => accName[a.id] = a.name);
    list.innerHTML = subs.map(s => `<div class="budget-top sub-row${s.active ? '' : ' sub-off'}">
        <span class="budget-name">${escapeHtml(s.name)}<span class="acc-sub"> · tgl ${s.day} · ${escapeHtml(accName[s.accountId] || 'akun dihapus')}${s.active ? '' : ' · dijeda'}</span></span>
        <span class="acc-balance">${formatRp(s.amount)}</span></div>`).join('');
  }

  function subAccountOptions(data) { return accountOptionsHtml(data.accounts.filter(a => !a.archived && SUB_ACCOUNT_TYPES.indexOf(a.type) >= 0)); }

  function renderSubManageList(data) {
    const subs = sanitizeSubscriptions(data.subscriptions);
    $('sub-manage-list').innerHTML = subs.map(s => `<div class="budget-top sub-row">
        <span class="budget-name">${escapeHtml(s.name)}<span class="acc-sub"> · ${formatRp(s.amount)} · tgl ${s.day}${s.active ? '' : ' · dijeda'}</span></span>
        <span class="sub-actions"><button type="button" class="see-all-btn" data-act="toggleSub" data-a0="${escapeHtml(s.id)}">${s.active ? 'Jeda' : 'Aktifkan'}</button>
        <button type="button" class="see-all-btn" data-act="deleteSub" data-a0="${escapeHtml(s.id)}">Hapus</button></span></div>`).join('');
  }

  function openSubForm() {
    const data = loadData();
    const opts = subAccountOptions(data);
    $('sub-account-input').innerHTML = opts;
    $('sub-name-input').value = ''; $('sub-amount-input').value = ''; $('sub-day-input').value = '';
    $('sub-form-msg').textContent = opts ? '' : 'Belum ada akun kas/bank/e-wallet/kartu kredit untuk membayar langganan.';
    renderSubManageList(data);
    $('sub-form').classList.add('open');
  }
  function closeSubForm() { $('sub-form').classList.remove('open'); }

  function saveSubForm() {
    const data = loadData();
    const name = $('sub-name-input').value.trim();
    const amount = parseFloat($('sub-amount-input').value);
    const day = parseInt($('sub-day-input').value, 10);
    const accountId = $('sub-account-input').value;
    const msg = $('sub-form-msg');
    if (!name) { msg.textContent = 'Isi nama langganan.'; return; }
    if (!(amount > 0)) { msg.textContent = 'Nominal harus lebih dari 0.'; return; }
    if (!(day >= 1 && day <= 31)) { msg.textContent = 'Tanggal tagih 1–31.'; return; }
    if (!data.accounts.some(a => a.id === accountId)) { msg.textContent = 'Pilih akun pembayaran.'; return; }
    const subs = sanitizeSubscriptions(data.subscriptions);
    if (subs.length >= SUB_MAX_ITEMS) { msg.textContent = 'Maksimal ' + SUB_MAX_ITEMS + ' langganan.'; return; }
    subs.push({ id: generateId('sub'), name: name.slice(0, 60), amount: roundMoney(amount), accountId, day, active: true, lastAppliedMonth: subInitialLastApplied(day) });
    data.subscriptions = subs;
    saveData(data);
    runRecurringFees(); // kalau hari ini tepat tanggal tagihnya, langsung tercatat
    closeSubForm();
    render();
  }

  function toggleSub(id) {
    const data = loadData();
    const subs = sanitizeSubscriptions(data.subscriptions);
    const s = subs.find(x => x.id === id);
    if (!s) return;
    s.active = !s.active;
    if (s.active) s.lastAppliedMonth = subInitialLastApplied(s.day); // bulan selama dijeda tidak dikejar
    data.subscriptions = subs;
    saveData(data);
    runRecurringFees();
    renderSubManageList(loadData());
    render();
  }

  async function deleteSub(id) {
    const data = loadData();
    const subs = sanitizeSubscriptions(data.subscriptions);
    const s = subs.find(x => x.id === id);
    if (!s) return;
    if (!(await showConfirm('Hapus langganan "' + s.name + '"? Transaksi yang sudah tercatat tetap ada.'))) return;
    data.subscriptions = subs.filter(x => x.id !== id);
    saveData(data);
    renderSubManageList(data);
    render();
  }

  // Import: petakan akun lewat idMap; gabung = lewati yang sama (nama + akun + tanggal); langganan tanpa akun valid dibuang.
  function importSubscriptions(existing, parsed, idMap, accountIds) {
    const incoming = sanitizeSubscriptions(parsed && !Array.isArray(parsed) ? parsed.subscriptions : null);
    const out = sanitizeSubscriptions(existing);
    const cur = todayGmt8();
    incoming.forEach(s => {
      const accountId = idMap[s.accountId] !== undefined ? idMap[s.accountId] : s.accountId;
      if (accountIds.indexOf(accountId) < 0) return;
      if (out.some(x => x.name === s.name && x.accountId === accountId && x.day === s.day)) return;
      if (out.length >= SUB_MAX_ITEMS) return;
      out.push({ ...s, id: generateId('sub'), accountId, lastAppliedMonth: s.lastAppliedMonth || subInitialLastApplied(s.day, cur) });
    });
    return out;
  }

  function mergeImportedSubscriptions(data, parsed, idMap) {
    const merged = importSubscriptions(data.subscriptions, parsed, idMap, data.accounts.map(a => a.id));
    if (merged.length) data.subscriptions = merged;
  }
