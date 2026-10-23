  // ============================================================
  // LANGGANAN & TRANSAKSI BERULANG (v1.1.057; pemasukan berulang v1.1.117)
  // data.subscriptions = [{ id, name, amount, accountId, day, active, lastAppliedMonth, type?, category? }]
  // type: 'keluar' (bawaan, data lama) atau 'masuk' (gaji, sewa diterima, dll.); category: salah satu CATEGORIES[type].
  // Tiap bulan, pada tanggal `day`, dibuat 1 transaksi (pengeluaran berkategori "Tagihan & langganan" bila tak diisi)
  // berID deterministik `sub-<id>-<YYYY-MM>`, jadi dua perangkat tidak menghasilkan transaksi ganda.
  // v1.1.162: frekuensi `freq` = 'bulanan' (bawaan) | 'mingguan' (weekday 0-6, 0 = Minggu) | 'tahunan' (month 1-12 + day), dan jenis
  // 'transfer' (accountId = asal, toAccountId = tujuan; mis. tabung otomatis). ID: bulanan sub-<id>-YYYY-MM, mingguan sub-<id>-YYYY-MM-DD,
  // tahunan sub-<id>-YYYY. Bulanan memakai lastAppliedMonth; mingguan/tahunan memakai lastAppliedDate (tanggal kejadian terakhir yang diproses).
  // Dijalankan dari runRecurringFees() (bukan dari render()). Bulan yang terlewat dikejar maksimal 12 bulan.
  // ============================================================
  const SUB_CATEGORY = 'Tagihan & langganan';
  const SUB_MAX_ITEMS = 100;
  const SUB_CATCHUP_MONTHS = 12;
  const SUB_ACCOUNT_TYPES = ['kas', 'bank', 'ewallet', 'kartu_kredit'];
  const SUB_INCOME_ACCOUNT_TYPES = ['kas', 'bank', 'ewallet'];   // pemasukan tidak masuk ke kartu kredit
  const SUB_TRANSFER_ACCOUNT_TYPES = ['kas', 'bank', 'ewallet'];   // asal dan tujuan transfer berulang
  const SUB_DEFAULT_CATEGORY = { keluar: SUB_CATEGORY, masuk: 'Gaji', transfer: 'Pindah dana antar akun' };
  const SUB_FREQS = ['bulanan', 'mingguan', 'tahunan'];
  const SUB_CATCHUP_WEEKS = 12;     // mingguan: kejar maksimal 12 minggu
  const SUB_CATCHUP_YEARS = 2;      // tahunan: kejar maksimal 2 tahun
  const SUB_WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const SUB_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function subYmd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
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
      const freq = SUB_FREQS.indexOf(s.freq) >= 0 ? s.freq : 'bulanan';
      const day = freq === 'mingguan' ? 1 : Math.round(Number(s.day));
      const weekday = freq === 'mingguan' ? Math.round(Number(s.weekday)) : 0;
      const month = freq === 'tahunan' ? Math.round(Number(s.month)) : 0;
      if (!name || !amount || typeof s.accountId !== 'string' || !s.accountId || !(day >= 1 && day <= 31)) return;
      if (freq === 'mingguan' && !(weekday >= 0 && weekday <= 6)) return;
      if (freq === 'tahunan' && !(month >= 1 && month <= 12)) return;
      if (s.type === 'transfer' && !(typeof s.toAccountId === 'string' && s.toAccountId && s.toAccountId !== s.accountId)) return;
      const id = typeof s.id === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(s.id) && !seen.has(s.id) ? s.id : generateId('sub');
      seen.add(id);
      const type = s.type === 'masuk' ? 'masuk' : (s.type === 'transfer' ? 'transfer' : 'keluar');
      const tags = sanitizeTags(s.tags);   // label (v1.1.148), src/js/features/transaksi/label.js
      out.push({ id, name, amount, accountId: s.accountId, day, active: s.active !== false, type, category: subCategoryOf(type, s.category), ...(tags.length ? { tags } : {}),
        ...(type === 'transfer' ? { toAccountId: s.toAccountId } : {}),
        ...(freq !== 'bulanan' ? { freq } : {}), ...(freq === 'mingguan' ? { weekday } : {}), ...(freq === 'tahunan' ? { month } : {}),
        lastAppliedMonth: typeof s.lastAppliedMonth === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s.lastAppliedMonth) ? s.lastAppliedMonth : '',
        ...(typeof s.lastAppliedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.lastAppliedDate) ? { lastAppliedDate: s.lastAppliedDate } : {}) });
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

  // Padanan per bulan (mingguan x 52/12, tahunan / 12); transfer tidak dihitung sebagai pengeluaran atau pemasukan.
  function subPerMonth(s) { return s.freq === 'mingguan' ? s.amount * 52 / 12 : (s.freq === 'tahunan' ? s.amount / 12 : s.amount); }
  function subMonthlyTotal(subs) { return roundMoney(subs.filter(s => s.active && s.type !== 'masuk' && s.type !== 'transfer').reduce((t, s) => t + subPerMonth(s), 0)); }
  function subMonthlyIncome(subs) { return roundMoney(subs.filter(s => s.active && s.type === 'masuk').reduce((t, s) => t + subPerMonth(s), 0)); }

  // Tanggal kejadian (YYYY-MM-DD) mingguan/tahunan yang jatuh dalam (after, today]; after = '' berarti hanya hari ini. Murni.
  // Hasil: [{ date, id }] urut lama -> baru, dibatasi kejar-ulang (12 minggu / 2 tahun).
  function subDueDates(s, today) {
    const out = [], last = s.lastAppliedDate || '';
    const t = new Date(today + 'T00:00:00');
    if (s.freq === 'mingguan') {
      let start = last ? new Date(last + 'T00:00:00') : new Date(t.getTime() - 86400000);
      start = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
      const floor = new Date(t.getFullYear(), t.getMonth(), t.getDate() - SUB_CATCHUP_WEEKS * 7 + 1);
      if (start < floor) start = floor;
      for (let d = start; d <= t; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
        if (d.getDay() === s.weekday) out.push({ date: subYmd(d), id: 'sub-' + s.id + '-' + subYmd(d) });
      }
    } else if (s.freq === 'tahunan') {
      const lastY = last ? Number(last.slice(0, 4)) : t.getFullYear();
      for (let y = Math.max(lastY, t.getFullYear() - (SUB_CATCHUP_YEARS - 1)); y <= t.getFullYear(); y++) {
        const dd = Math.min(s.day, new Date(y, s.month, 0).getDate());
        const date = y + '-' + String(s.month).padStart(2, '0') + '-' + String(dd).padStart(2, '0');
        if (date <= today && date > last) out.push({ date, id: 'sub-' + s.id + '-' + y });
      }
    }
    return out;
  }
  // Keadaan awal untuk transaksi berulang baru/diaktifkan lagi: kejadian yang sudah lewat tidak dicatat mundur.
  function subInitialState(s, now) {
    now = now || todayGmt8();
    if (s.freq === 'mingguan' || s.freq === 'tahunan') {
      const today = subYmd(now);
      let prev = '';
      if (s.freq === 'mingguan') {
        for (let i = 1; i <= 7; i++) { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i); if (d.getDay() === s.weekday) { prev = subYmd(d); break; } }
      } else {
        for (const y of [now.getFullYear(), now.getFullYear() - 1]) {
          const dd = Math.min(s.day, new Date(y, s.month, 0).getDate());
          const date = y + '-' + String(s.month).padStart(2, '0') + '-' + String(dd).padStart(2, '0');
          if (date < today) { prev = date; break; }
        }
      }
      return { lastAppliedDate: prev };
    }
    return { lastAppliedMonth: subInitialLastApplied(s.day, now) };
  }

  function subBuildTxn(s, id, date) {
    const tx = { id, date, type: s.type, desc: s.name, amount: s.amount, accountId: s.accountId, category: s.category };
    if (s.type === 'transfer') tx.toAccountId = s.toAccountId;
    if (s.tags && s.tags.length) tx.tags = s.tags.slice();
    return tx;
  }

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
      if (s.type === 'transfer') { const ta = data.accounts.find(a => a.id === s.toAccountId); if (!ta || ta.archived) return; }
      if (s.freq === 'mingguan' || s.freq === 'tahunan') {
        const todayS = subYmd(now);
        subDueDates(s, todayS).forEach(o => {
          if (!existing.has(o.id)) {
            existing.add(o.id);
            data.txns.push(subBuildTxn(s, o.id, o.date));
          }
          s.lastAppliedDate = o.date; dirty = true;
        });
        return;
      }
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
          data.txns.push(subBuildTxn(s, id, key + '-' + String(dueDay).padStart(2, '0')));
        }
        s.lastAppliedMonth = key; dirty = true;
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      }
    });
    if (dirty) { data.subscriptions = subs; saveData(data); }
    return data;
  }

  // Teks jadwal: "tgl 12", "tiap Senin", "tiap 17 Agu".
  function subWhenText(s) {
    if (s.freq === 'mingguan') return 'tiap ' + SUB_WEEKDAYS[s.weekday];
    if (s.freq === 'tahunan') return 'tiap ' + s.day + ' ' + SUB_MONTHS_SHORT[s.month - 1];
    return 'tgl ' + s.day;
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
        <span class="budget-name">${escapeHtml(s.name)}<span class="acc-sub"> · ${escapeHtml(subWhenText(s))} · ${escapeHtml(accName[s.accountId] || 'akun dihapus')}${s.type === 'transfer' ? ' → ' + escapeHtml(accName[s.toAccountId] || 'akun dihapus') : ''}${s.active ? '' : ' · dijeda'}</span></span>
        <span class="acc-balance${s.type === 'masuk' ? ' u-c-green' : ''}">${s.type === 'masuk' ? '+' : ''}${formatRp(s.amount)}</span></div>`).join('');
  }

  function subAccountOptions(data, type) { return accountOptionsHtml(data.accounts.filter(a => !a.archived && (type === 'masuk' ? SUB_INCOME_ACCOUNT_TYPES : SUB_ACCOUNT_TYPES).indexOf(a.type) >= 0)); }

  // Jenis (pengeluaran/pemasukan) menentukan daftar kategori, akun yang boleh dipilih, dan teks label
  function onSubTypeChange() {
    const data = loadData();
    const tv = $('sub-type-input').value;
    const type = tv === 'masuk' ? 'masuk' : (tv === 'transfer' ? 'transfer' : 'keluar');
    const cats = CATEGORIES[type].filter(c => c !== 'Penyesuaian saldo');
    $('sub-category-input').innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    $('sub-category-input').value = SUB_DEFAULT_CATEGORY[type];
    const opts = type === 'transfer' ? accountOptionsHtml(data.accounts.filter(a => !a.archived && SUB_TRANSFER_ACCOUNT_TYPES.indexOf(a.type) >= 0)) : subAccountOptions(data, type);
    $('sub-account-input').innerHTML = opts;
    $('sub-to-account-input').innerHTML = opts;
    if (type === 'transfer') { const o = $('sub-to-account-input').options; if (o.length > 1) $('sub-to-account-input').value = o[1].value; }
    $('sub-to-row').hidden = type !== 'transfer';
    $('sub-account-label').textContent = type === 'masuk' ? 'Masuk ke akun' : (type === 'transfer' ? 'Dari akun' : 'Dibayar dari akun');
    $('sub-name-label').textContent = type === 'masuk' ? 'Nama pemasukan' : (type === 'transfer' ? 'Nama transfer' : 'Nama langganan');
    $('sub-name-input').placeholder = type === 'masuk' ? 'mis. Gaji, Sewa kios' : (type === 'transfer' ? 'mis. Tabung bulanan' : 'mis. Netflix');
    $('sub-submit-btn').textContent = type === 'masuk' ? 'Tambah pemasukan berulang' : (type === 'transfer' ? 'Tambah transfer berulang' : 'Tambah langganan');
    onSubFreqChange();
    $('sub-form-msg').textContent = opts ? '' : 'Belum ada akun ' + (type === 'keluar' ? 'kas/bank/e-wallet/kartu kredit' : 'kas/bank/e-wallet') + ' untuk transaksi ini.';
  }

  // Frekuensi menentukan kolom jadwal yang tampil: tanggal (bulanan), hari (mingguan), bulan + tanggal (tahunan)
  function onSubFreqChange() {
    const f = $('sub-freq-input').value;
    const tv = $('sub-type-input').value;
    $('sub-weekday-row').hidden = f !== 'mingguan';
    $('sub-month-row').hidden = f !== 'tahunan';
    $('sub-day-row').hidden = f === 'mingguan';
    $('sub-day-label').textContent = (f === 'tahunan' ? 'Tanggal' : (tv === 'masuk' ? 'Tanggal diterima' : (tv === 'transfer' ? 'Tanggal transfer' : 'Tanggal tagih'))) + ' (1–31)';
    $('sub-amount-label').textContent = f === 'mingguan' ? 'Nominal per minggu' : (f === 'tahunan' ? 'Nominal per tahun' : 'Nominal per bulan');
  }

  function renderSubManageList(data) {
    const subs = sanitizeSubscriptions(data.subscriptions);
    $('sub-manage-list').innerHTML = subs.map(s => `<div class="budget-top sub-row">
        <span class="budget-name">${escapeHtml(s.name)}<span class="acc-sub"> · ${s.type === 'masuk' ? 'masuk ' : (s.type === 'transfer' ? 'transfer ' : '')}${formatRp(s.amount)} · ${escapeHtml(subWhenText(s))}${s.tags && s.tags.length ? ' · ' + escapeHtml(tagsText(s.tags)) : ''}${s.active ? '' : ' · dijeda'}</span></span>
        <span class="sub-actions"><button type="button" class="see-all-btn" data-act="startEditSub" data-a0="${escapeHtml(s.id)}">Ubah</button>
        <button type="button" class="see-all-btn" data-act="toggleSub" data-a0="${escapeHtml(s.id)}">${s.active ? 'Jeda' : 'Aktifkan'}</button>
        <button type="button" class="see-all-btn" data-act="deleteSub" data-a0="${escapeHtml(s.id)}">Hapus</button></span></div>`).join('');
  }

  state.editingSubId = null;
  // Ubah transaksi berulang yang sudah ada (v1.1.167): form terisi dari data; simpan memperbarui di tempat (ID sama, riwayat tercatat tetap).
  function startEditSub(id) {
    const data = loadData();
    const s = sanitizeSubscriptions(data.subscriptions).find(x => x.id === id);
    if (!s) return;
    openSubForm();
    state.editingSubId = id;
    const set = (el, v) => { $(el).value = v; };
    set('sub-type-input', s.type); onSubTypeChange();
    set('sub-freq-input', s.freq || 'bulanan'); onSubFreqChange();
    set('sub-name-input', s.name); set('sub-amount-input', s.amount); set('sub-day-input', s.freq === 'mingguan' ? '' : s.day);
    if (s.freq === 'mingguan') set('sub-weekday-input', s.weekday);
    if (s.freq === 'tahunan') set('sub-month-input', s.month);
    set('sub-tags-input', (s.tags || []).join(', '));
    const accSel = $('sub-account-input');
    if (!Array.from(accSel.options).some(o => o.value === s.accountId)) { const a = data.accounts.find(x => x.id === s.accountId); if (a) { const o = document.createElement('option'); o.value = a.id; o.textContent = a.name; accSel.appendChild(o); } }
    set('sub-account-input', s.accountId);
    if (s.type === 'transfer') set('sub-to-account-input', s.toAccountId);
    if (Array.from($('sub-category-input').options).some(o => o.value === s.category)) set('sub-category-input', s.category);
    $('sub-submit-btn').textContent = 'Simpan perubahan';
    $('sub-form-msg').textContent = '';
  }

  function openSubForm() {
    state.editingSubId = null;
    const data = loadData();
    $('sub-type-input').value = 'keluar'; $('sub-freq-input').value = 'bulanan';
    $('sub-name-input').value = ''; $('sub-amount-input').value = ''; $('sub-day-input').value = ''; $('sub-tags-input').value = '';
    onSubTypeChange();
    renderSubManageList(data);
    $('sub-form').classList.add('open');
  }
  function closeSubForm() { $('sub-form').classList.remove('open'); state.editingSubId = null; }

  function saveSubForm() {
    const data = loadData();
    const name = $('sub-name-input').value.trim();
    const amount = parseFloat($('sub-amount-input').value);
    const accountId = $('sub-account-input').value;
    const tv = $('sub-type-input').value;
    const type = tv === 'masuk' ? 'masuk' : (tv === 'transfer' ? 'transfer' : 'keluar');
    const freq = SUB_FREQS.indexOf($('sub-freq-input').value) >= 0 ? $('sub-freq-input').value : 'bulanan';
    const weekday = parseInt($('sub-weekday-input').value, 10);
    const month = parseInt($('sub-month-input').value, 10);
    const toAccountId = $('sub-to-account-input').value;
    const day = freq === 'mingguan' ? 1 : parseInt($('sub-day-input').value, 10);
    const category = subCategoryOf(type, $('sub-category-input').value);
    const msg = $('sub-form-msg');
    if (!name) { msg.textContent = type === 'masuk' ? 'Isi nama pemasukan.' : 'Isi nama langganan.'; return; }
    if (!(amount > 0)) { msg.textContent = 'Nominal harus lebih dari 0.'; return; }
    if (!(day >= 1 && day <= 31)) { msg.textContent = 'Tanggal tagih 1–31.'; return; }
    if (!data.accounts.some(a => a.id === accountId)) { msg.textContent = type === 'masuk' ? 'Pilih akun tujuan.' : 'Pilih akun pembayaran.'; return; }
    if (type === 'transfer' && (!data.accounts.some(a => a.id === toAccountId) || toAccountId === accountId)) { msg.textContent = 'Pilih akun tujuan yang berbeda dari akun asal.'; return; }
    const subs = sanitizeSubscriptions(data.subscriptions);
    const editing = state.editingSubId ? subs.find(x => x.id === state.editingSubId) : null;
    if (!editing && subs.length >= SUB_MAX_ITEMS) { msg.textContent = 'Maksimal ' + SUB_MAX_ITEMS + ' transaksi berulang.'; return; }
    const tags = parseTagsInput($('sub-tags-input').value);
    const ns = { id: generateId('sub'), name: name.slice(0, 60), amount: roundMoney(amount), accountId, day, active: true, type, category, ...(tags.length ? { tags } : {}),
      ...(type === 'transfer' ? { toAccountId } : {}), ...(freq !== 'bulanan' ? { freq } : {}), ...(freq === 'mingguan' ? { weekday } : {}), ...(freq === 'tahunan' ? { month } : {}) };
    if (editing) {
      ns.id = editing.id; ns.active = editing.active;
      const same = (editing.freq || 'bulanan') === freq && editing.day === day && (editing.weekday || 0) === (freq === 'mingguan' ? weekday : 0) && (editing.month || 0) === (freq === 'tahunan' ? month : 0);
      // jadwal tidak berubah: pertahankan kejadian yang sudah diproses; berubah: mulai dari kejadian berikutnya
      Object.assign(ns, { lastAppliedMonth: editing.lastAppliedMonth || '' }, editing.lastAppliedDate ? { lastAppliedDate: editing.lastAppliedDate } : {}, same ? {} : { lastAppliedMonth: '', lastAppliedDate: undefined }, same ? {} : subInitialState(ns));
      if (ns.lastAppliedDate === undefined) delete ns.lastAppliedDate;
      subs[subs.indexOf(editing)] = ns;
    } else {
      Object.assign(ns, { lastAppliedMonth: '' }, subInitialState(ns));
      subs.push(ns);
    }
    state.editingSubId = null;
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
    if (s.active) Object.assign(s, subInitialState(s)); // kejadian selama dijeda tidak dikejar
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
      // transfer berulang: akun tujuan juga dipetakan ke ID akun hasil impor (v1.1.171); tujuan yang tak ada atau sama dengan asal dibuang
      const toAccountId = s.type === 'transfer' ? (idMap[s.toAccountId] !== undefined ? idMap[s.toAccountId] : s.toAccountId) : undefined;
      if (s.type === 'transfer' && (accountIds.indexOf(toAccountId) < 0 || toAccountId === accountId)) return;
      if (out.some(x => x.name === s.name && x.accountId === accountId && x.day === s.day && x.type === s.type && x.freq === s.freq && x.weekday === s.weekday && x.month === s.month && x.toAccountId === toAccountId)) return;
      if (out.length >= SUB_MAX_ITEMS) return;
      const ns = { ...s, id: generateId('sub'), accountId, ...(toAccountId ? { toAccountId } : {}) };
      // tanpa penanda terakhir diproses: mulai dari kejadian berikutnya sesuai frekuensi
      if (!ns.lastAppliedMonth && !ns.lastAppliedDate) Object.assign(ns, { lastAppliedMonth: '' }, subInitialState(ns, cur));
      out.push(ns);
    });
    return out;
  }

  function mergeImportedSubscriptions(data, parsed, idMap) {
    const merged = importSubscriptions(data.subscriptions, parsed, idMap, data.accounts.map(a => a.id));
    if (merged.length) data.subscriptions = merged;
  }
