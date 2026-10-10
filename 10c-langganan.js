  // ============================================================
  // LANGGANAN & TRANSAKSI BERULANG (v1.1.057; pemasukan berulang v1.1.117)
  // data.subscriptions = [{ id, name, amount, accountId, day, active, lastAppliedMonth, type?, category? }]
  // type: 'keluar' (bawaan, data lama) atau 'masuk' (gaji, sewa diterima, dll.); category: salah satu CATEGORIES[type].
  // Tiap bulan, pada tanggal `day`, dibuat 1 transaksi (pengeluaran berkategori "Tagihan & langganan" bila tak diisi)
  // berID deterministik `sub-<id>-<YYYY-MM>`, jadi dua perangkat tidak menghasilkan transaksi ganda.
  // Dijalankan dari runRecurringFees() (bukan dari render()). Bulan yang terlewat dikejar maksimal 12 bulan.
  // ============================================================
  const SUB_CATEGORY = 'Tagihan & langganan';
  const SUB_MAX_ITEMS = 100;
  const SUB_CATCHUP_MONTHS = 12;
  const SUB_ACCOUNT_TYPES = ['kas', 'bank', 'ewallet', 'kartu_kredit'];
  const SUB_INCOME_ACCOUNT_TYPES = ['kas', 'bank', 'ewallet'];   // pemasukan tidak masuk ke kartu kredit
  const SUB_DEFAULT_CATEGORY = { keluar: SUB_CATEGORY, masuk: 'Gaji' };
  // Kategori yang tak ada di daftar (mis. "Penyesuaian saldo", yang khusus sistem) jatuh ke bawaan.
  function subCategoryOf(type, category) {
    const list = (CATEGORIES[type] || []).filter(c => c !== 'Penyesuaian saldo');
    return list.indexOf(category) >= 0 ? category : SUB_DEFAULT_CATEGORY[type];
  }

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
      const type = s.type === 'masuk' ? 'masuk' : 'keluar';
      out.push({ id, name, amount, accountId: s.accountId, day, active: s.active !== false, type, category: subCategoryOf(type, s.category),
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

  function subMonthlyTotal(subs) { return roundMoney(subs.filter(s => s.active && s.type !== 'masuk').reduce((t, s) => t + s.amount, 0)); }
  function subMonthlyIncome(subs) { return roundMoney(subs.filter(s => s.active && s.type === 'masuk').reduce((t, s) => t + s.amount, 0)); }

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
          data.txns.push({ id, date: key + '-' + String(dueDay).padStart(2, '0'), type: s.type, desc: s.name, amount: s.amount, accountId: s.accountId, category: s.category });
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
    if (totalEl) {
      const out = subMonthlyTotal(subs), inc = subMonthlyIncome(subs), parts = [];
      if (out > 0) parts.push('Keluar ' + formatRp(out) + '/bulan');
      if (inc > 0) parts.push('Masuk ' + formatRp(inc) + '/bulan');
      totalEl.textContent = parts.join(' · ');
    }
    if (!subs.length) { list.innerHTML = '<div class="acc-sub">Belum ada transaksi berulang. Tambahkan langganan, gaji, atau tagihan rutin agar tercatat otomatis tiap bulan.</div>'; return; }
    const accName = {}; data.accounts.forEach(a => accName[a.id] = a.name);
    list.innerHTML = subs.map(s => `<div class="budget-top sub-row${s.active ? '' : ' sub-off'}">
        <span class="budget-name">${escapeHtml(s.name)}<span class="acc-sub"> · tgl ${s.day} · ${escapeHtml(accName[s.accountId] || 'akun dihapus')}${s.active ? '' : ' · dijeda'}</span></span>
        <span class="acc-balance${s.type === 'masuk' ? ' u-c-green' : ''}">${s.type === 'masuk' ? '+' : ''}${formatRp(s.amount)}</span></div>`).join('');
  }

  function subAccountOptions(data, type) { return accountOptionsHtml(data.accounts.filter(a => !a.archived && (type === 'masuk' ? SUB_INCOME_ACCOUNT_TYPES : SUB_ACCOUNT_TYPES).indexOf(a.type) >= 0)); }

  // Jenis (pengeluaran/pemasukan) menentukan daftar kategori, akun yang boleh dipilih, dan teks label
  function onSubTypeChange() {
    const data = loadData();
    const type = $('sub-type-input').value === 'masuk' ? 'masuk' : 'keluar';
    const cats = CATEGORIES[type].filter(c => c !== 'Penyesuaian saldo');
    $('sub-category-input').innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    $('sub-category-input').value = SUB_DEFAULT_CATEGORY[type];
    const opts = subAccountOptions(data, type);
    $('sub-account-input').innerHTML = opts;
    $('sub-account-label').textContent = type === 'masuk' ? 'Masuk ke akun' : 'Dibayar dari akun';
    $('sub-day-label').textContent = type === 'masuk' ? 'Tanggal diterima (1–31)' : 'Tanggal tagih (1–31)';
    $('sub-name-label').textContent = type === 'masuk' ? 'Nama pemasukan' : 'Nama langganan';
    $('sub-name-input').placeholder = type === 'masuk' ? 'mis. Gaji, Sewa kios' : 'mis. Netflix';
    $('sub-submit-btn').textContent = type === 'masuk' ? 'Tambah pemasukan berulang' : 'Tambah langganan';
    $('sub-form-msg').textContent = opts ? '' : 'Belum ada akun ' + (type === 'masuk' ? 'kas/bank/e-wallet' : 'kas/bank/e-wallet/kartu kredit') + ' untuk transaksi ini.';
  }

  function renderSubManageList(data) {
    const subs = sanitizeSubscriptions(data.subscriptions);
    $('sub-manage-list').innerHTML = subs.map(s => `<div class="budget-top sub-row">
        <span class="budget-name">${escapeHtml(s.name)}<span class="acc-sub"> · ${s.type === 'masuk' ? 'masuk ' : ''}${formatRp(s.amount)} · tgl ${s.day}${s.active ? '' : ' · dijeda'}</span></span>
        <span class="sub-actions"><button type="button" class="see-all-btn" data-act="toggleSub" data-a0="${escapeHtml(s.id)}">${s.active ? 'Jeda' : 'Aktifkan'}</button>
        <button type="button" class="see-all-btn" data-act="deleteSub" data-a0="${escapeHtml(s.id)}">Hapus</button></span></div>`).join('');
  }

  function openSubForm() {
    const data = loadData();
    $('sub-type-input').value = 'keluar';
    $('sub-name-input').value = ''; $('sub-amount-input').value = ''; $('sub-day-input').value = '';
    onSubTypeChange();
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
    const type = $('sub-type-input').value === 'masuk' ? 'masuk' : 'keluar';
    const category = subCategoryOf(type, $('sub-category-input').value);
    const msg = $('sub-form-msg');
    if (!name) { msg.textContent = type === 'masuk' ? 'Isi nama pemasukan.' : 'Isi nama langganan.'; return; }
    if (!(amount > 0)) { msg.textContent = 'Nominal harus lebih dari 0.'; return; }
    if (!(day >= 1 && day <= 31)) { msg.textContent = 'Tanggal tagih 1–31.'; return; }
    if (!data.accounts.some(a => a.id === accountId)) { msg.textContent = type === 'masuk' ? 'Pilih akun tujuan.' : 'Pilih akun pembayaran.'; return; }
    const subs = sanitizeSubscriptions(data.subscriptions);
    if (subs.length >= SUB_MAX_ITEMS) { msg.textContent = 'Maksimal ' + SUB_MAX_ITEMS + ' transaksi berulang.'; return; }
    subs.push({ id: generateId('sub'), name: name.slice(0, 60), amount: roundMoney(amount), accountId, day, active: true, type, category, lastAppliedMonth: subInitialLastApplied(day) });
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
    if (!(await showConfirm('Hapus transaksi berulang "' + s.name + '"? Transaksi yang sudah tercatat tetap ada.'))) return;
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
      if (out.some(x => x.name === s.name && x.accountId === accountId && x.day === s.day && x.type === s.type)) return;
      if (out.length >= SUB_MAX_ITEMS) return;
      out.push({ ...s, id: generateId('sub'), accountId, lastAppliedMonth: s.lastAppliedMonth || subInitialLastApplied(s.day, cur) });
    });
    return out;
  }

  function mergeImportedSubscriptions(data, parsed, idMap) {
    const merged = importSubscriptions(data.subscriptions, parsed, idMap, data.accounts.map(a => a.id));
    if (merged.length) data.subscriptions = merged;
  }
