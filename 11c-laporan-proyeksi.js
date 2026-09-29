  // ============================================================
  // TAB LAPORAN (lanjutan): proyeksi kas, total biaya utang, simulasi pelunasan
  // Lanjutan 11b-laporan-utang.js: dimuat sesudahnya, berbagi lingkup global yang sama.
  // ============================================================

  // ---------- LAPORAN: PROYEKSI KAS, TOTAL BIAYA UTANG, SIMULASI PELUNASAN ----------
  function laporanMonthLabel(offsetMonths) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offsetMonths);
    return d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
  }
  // Ganti 30/60 hari cukup menggambar ulang kartu proyeksi (bukan seluruh Laporan), jadi baris lain yang
  // sedang dibuka dan posisi gulir tidak ikut berubah.
  function setLaporanProjDays(d) {
    state.laporanProjDays = d;
    const host = document.getElementById('laporan-proj-host');
    if (!host) { renderLaporan(); return; }
    const data = loadData();
    host.innerHTML = lapMemoScope(() => laporanCashProjectionHtml(data, computeAllBalances(data), lapCard, lapRow));
  }

  // 1. Proyeksi saldo kas/bank/e-wallet setelah tagihan & angsuran jatuh tempo (pengeluaran rutin lain & pemasukan belum dihitung).
  function laporanCashProjectionHtml(data, balances, card, row) {
    const horizon = state.laporanProjDays === 60 ? 60 : 30;
    const today = todayStr();
    const t0 = new Date(today + 'T00:00:00');
    const daysTo = (ds) => Math.round((new Date(ds + 'T00:00:00') - t0) / 86400000);
    const accById = {}; data.accounts.forEach(a => { accById[a.id] = a; });
    let liquid = 0;
    data.accounts.forEach(a => { if (a.type === 'kas' || a.type === 'bank' || a.type === 'ewallet') liquid += balances[a.id]; });
    const events = [];
    data.accounts.forEach(acc => {
      const bal = balances[acc.id];
      if (TYPE_LOAN[acc.type]) {
        const sc = lapLoanSchedule(data, acc, bal);
        if (sc) sc.rows.forEach(r => {
          if (r.status === 'lunas') return;
          const d = daysTo(r.due);
          if (d <= horizon) events.push({ name: acc.name, label: 'Angsuran ' + r.no + '/' + sc.tenor, amount: r.total, date: d < 0 ? today : r.due, late: d < 0 });
        });
      } else if (acc.type === 'paylater' && bal < 0) {
        (Array.isArray(acc.plans) ? acc.plans : []).forEach(pl => {
          const sc = paylaterPlanSchedule(data, acc, pl);
          if (!sc || sc.k >= sc.tenor) return;
          for (let i = sc.k + 2; i <= sc.tenor; i++) { // periode berikutnya sudah ada di daftar jatuh tempo di bawah
            const due = paylaterPeriodDue(acc, pl, i);
            if (daysTo(due) > horizon) break;
            const amount = i === sc.tenor ? Math.max(0, pl.total - (sc.tenor - 1) * pl.monthly) : pl.monthly;
            if (amount > 0) events.push({ name: acc.name, label: 'Cicilan PayLater ' + i + '/' + sc.tenor, amount, date: due, late: false });
          }
        });
      }
    });
    lapUpcomingDues(data, balances, horizon).forEach(d => {
      const acc = accById[d.id];
      if (acc && TYPE_LOAN[acc.type]) return; // angsuran pinjaman sudah diambil dari jadwal (semua bulan)
      events.push({ name: d.name, label: d.label.split(' · ')[0], amount: d.amount, date: d.days < 0 ? today : d.due, late: d.days < 0 });
    });
    events.sort((a, b) => a.date < b.date ? -1 : (a.date > b.date ? 1 : 0));
    let run = liquid, minBal = liquid, minDate = today, firstNeg = null, totalOut = 0;
    events.forEach(e => {
      run -= e.amount; totalOut += e.amount; e.after = run;
      if (run < minBal) { minBal = run; minDate = e.date; }
      if (run < 0 && !firstNeg) firstNeg = e;
    });
    const btn = (d) => `<button type="button" class="type-btn${d === horizon ? ' active' : ''}" style="padding:6px 0; font-size:11px;" onclick="setLaporanProjDays(${d})">${d} hari</button>`;
    const stat = (label, val, color) => `<div><div class="acc-sub" style="margin:0;">${label}</div><strong style="font-size:13.5px; font-variant-numeric:tabular-nums;${color ? ' color:' + color + ';' : ''}">${val}</strong></div>`;
    let body = `<div class="type-toggle no-print" style="display:grid; grid-template-columns:repeat(2, 1fr); gap:6px; margin:6px 0 4px;">${btn(30)}${btn(60)}</div>` +
      '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px 12px; padding:8px 0 10px; border-bottom:1px solid var(--line);">' +
      stat('Saldo sekarang', formatRp(liquid), liquid < 0 ? 'var(--red)' : '') +
      stat('Tagihan & angsuran ' + horizon + ' hr', formatRp(totalOut), totalOut > 0 ? 'var(--red)' : '') +
      stat('Setelah dibayar semua', formatRp(liquid - totalOut), liquid - totalOut < 0 ? 'var(--red)' : 'var(--green)') +
      (events.length ? stat('Terendah (' + escapeHtml(fmtTgl(minDate)) + ')', formatRp(minBal), minBal < 0 ? 'var(--red)' : '') : '') + '</div>';
    if (firstNeg) {
      body += `<div style="border-left:3px solid var(--red); padding:6px 0 6px 10px; margin:8px 0; font-size:13px;"><strong style="color:var(--red);">Minus mulai ${escapeHtml(fmtTgl(firstNeg.date))}</strong> saat bayar ${escapeHtml(firstNeg.name)} ${formatRp(firstNeg.amount)}. Siapkan tambahan dana atau atur ulang urutan bayar.</div>`;
    }
    if (!events.length) {
      body += '<div class="acc-sub" style="margin-top:8px;">Tidak ada tagihan atau angsuran jatuh tempo dalam ' + horizon + ' hari ke depan.</div>';
    } else {
      const shown = events.slice(0, 20);
      body += '<div class="acc-sub" style="margin:10px 0 0;">Urutan bayar & saldo sesudahnya</div>' + lapMore(shown.map(e => lapItem({
        noDot: true, title: e.name + ' · ' + formatRp(e.amount), right: formatRp(e.after), rightColor: e.after < 0 ? 'var(--red)' : 'var(--ink)',
        hint: escapeHtml(e.label) + ' · ' + (e.late ? '<span style="color:var(--red);">sudah lewat, bayar sekarang</span>' : escapeHtml(fmtTgl(e.date)))
      })), 5) + (events.length > 20 ? '<div class="acc-sub" style="margin-top:4px;">+' + (events.length - 20) + ' tagihan lain tidak ditampilkan.</div>' : '');
    }
    body += lapNote('Saldo = kas + bank + e-wallet. Hanya tagihan & angsuran yang sudah terjadwal; pemasukan (gaji dll.), belanja harian, dan tagihan kartu yang belum dicetak belum ikut dihitung.');
    return card('Proyeksi kas ' + horizon + ' hari', body);
  }

  // 2. Total biaya utang: bunga + admin + asuransi + materai, sudah dibayar vs sisa.
  function laporanDebtCostHtml(data, balances, card, row) {
    // Satu kali lewat semua transaksi: total 'Bunga & biaya bank' per akun dan per loanId
    // (dulu difilter ulang di seluruh transaksi untuk tiap akun utang).
    const feeByAcc = {}, feeByLoan = {};
    data.txns.forEach(t => {
      if (t.type !== 'keluar' || t.category !== 'Bunga & biaya bank') return;
      feeByAcc[t.accountId] = (feeByAcc[t.accountId] || 0) + t.amount;
      if (t.loanId) feeByLoan[t.loanId] = (feeByLoan[t.loanId] || 0) + t.amount;
    });
    const items = [];
    data.accounts.forEach(acc => {
      if (!TYPE_DEBT[acc.type]) return;
      const bal = balances[acc.id];
      const pokokAwal = Math.abs(acc.originalPrincipal || acc.initialBalance || 0);
      if (TYPE_LOAN[acc.type]) {
        const rem = lapLoanRemaining(data, acc, bal);
        if (rem.total <= 0 && bal >= 0) return;
        const awal = (acc.loanAdminMode === 'cicil' ? 0 : (acc.loanAdminFee || 0)) + (acc.loanStampFee || 0);
        const tenor = acc.loanTenorMonths || 0;
        const monthly = computeLoanMonthlyInterest(data, acc, bal);
        const isMenurun = acc.loanInterestType === 'menurun';
        const kindBase = acc.type === 'pinjaman_online' ? 'Pinjol' : 'Pinjaman bank';
        // Kalau jadwalnya bisa dibuat (tenor + tanggal pencairan, dan untuk bunga menurun juga suku
        // bunganya), bunga terbayar/tersisa dijumlah dari jadwal itu — berlaku untuk flat maupun menurun.
        const sc = lapLoanSchedule(data, acc, bal);
        if (sc) {
          const paidBunga = sc.rows.slice(0, sc.paid).reduce((s, r) => s + r.bunga, 0);
          const remBunga = sc.rows.slice(sc.paid).reduce((s, r) => s + r.bunga, 0);
          const paid = paidBunga + awal, remaining = remBunga, total = paid + remaining;
          items.push({ name: acc.name, kind: kindBase + (isMenurun ? ' (menurun)' : ''), paid, remaining, total, pct: pokokAwal > 0 ? total / pokokAwal * 100 : null, pokokAwal, estimated: true });
        } else if (!isMenurun && tenor > 0 && monthly > 0) {
          // Flat tanpa jadwal (tenor & bunga diketahui, tapi tanggal pencairan belum diisi): pakai bunga
          // yang sudah tercatat lewat transaksi, dan sisa bunga dari kontrak (computeLoanRemaining).
          const paid = (feeByLoan[acc.id] || 0) + awal;
          const remaining = rem.sisaBunga;
          const total = paid + remaining;
          items.push({ name: acc.name, kind: kindBase, paid, remaining, total, pct: pokokAwal > 0 ? total / pokokAwal * 100 : null, pokokAwal });
        } else {
          // Menurun tanpa jadwal (tenor/tanggal pencairan/suku bunga belum lengkap): sisa bunga tidak diketahui.
          const paid = (feeByLoan[acc.id] || 0) + awal;
          items.push({ name: acc.name, kind: kindBase + ' (bunga menurun)', paid, remaining: null, total: null, pct: null, pokokAwal, monthly });
        }
      } else if (acc.type === 'paylater') {
        const fs = paylaterFeeSummary(data, acc);
        if (fs.feeAllTime <= 0 && bal >= 0) return;
        items.push({ name: acc.name, kind: 'PayLater', paid: fs.feePaidSoFar, remaining: fs.feeRemaining, total: fs.feeAllTime, pct: fs.feeAvgPct || null, pokokAwal: null });
      } else if (acc.type === 'kartu_kredit') {
        const paid = (feeByAcc[acc.id] || 0);
        const used = bal < 0 ? Math.abs(bal) : 0;
        if (paid <= 0 && used <= 0) return;
        items.push({ name: acc.name, kind: 'Kartu kredit', paid, remaining: null, total: null, pct: null, pokokAwal: null, monthly: acc.interestPercent ? Math.round(used * acc.interestPercent / 100) : 0 });
      }
    });
    if (!items.length) return '';
    let sumPaid = 0, sumRem = 0;
    items.forEach(i => { sumPaid += i.paid || 0; sumRem += i.remaining || 0; });
    let body = row('Bunga & biaya sudah dibayar', formatRp(Math.round(sumPaid)), 'var(--red)') +
      row('Bunga & biaya masih harus dibayar', formatRp(Math.round(sumRem)), sumRem > 0 ? 'var(--red)' : '') +
      row('Total biaya utang (yang bisa dihitung)', formatRp(Math.round(sumPaid + sumRem)));
    body += items.map(i => {
      const lines = [];
      let right = '—', hint;
      if (i.total !== null) {
        right = formatRp(Math.round(i.total));
        hint = escapeHtml(i.kind) + (i.pct != null ? ' · ' + i.pct.toFixed(1) + '% dari pokok' : '') + ' · sisa ' + formatRp(Math.round(i.remaining));
        lines.push({ text: 'Total biaya kontrak ' + formatRp(Math.round(i.total)) + (i.pct != null && i.pokokAwal ? ' = ' + i.pct.toFixed(1) + '% dari pokok ' + formatRp(i.pokokAwal) : (i.pct != null ? ' (rata-rata ' + i.pct.toFixed(1) + '% dari pokok)' : '')) });
        lines.push({ text: 'Sudah dibayar ' + formatRp(Math.round(i.paid)) + ' · sisa ' + formatRp(Math.round(i.remaining)) + (i.estimated ? ' (dihitung dari jadwal angsuran)' : '') });
      } else {
        hint = escapeHtml(i.kind) + ' · sudah dibayar ' + formatRp(Math.round(i.paid)) + ' · total belum pasti';
        if (i.monthly > 0) lines.push({ text: 'Perkiraan bunga bulan ini ' + formatRp(i.monthly) + ' kalau tidak lunas penuh' });
        lines.push({ text: 'Total sisa biaya tidak bisa dipastikan karena bunganya menurun / tergantung pelunasan.' });
      }
      return lapItem({ noDot: true, title: i.name, right, hint, lines });
    }).join('');
    body += lapNote('Untuk pinjaman yang sudah berjalan sebelum dipakai di app ini, angka "sudah dibayar" adalah estimasi dari jadwal angsuran.');
    return card('Total biaya utang', body);
  }

  // 3. Simulasi pelunasan: bayar minimum saja vs gulung cicilan + ekstra per bulan (bunga tertinggi / saldo terkecil dulu).
  function laporanSimDebts(data, balances) {
    const debts = [];
    const skipped = [];   // pinjaman yang angsuran bulanannya belum diketahui
    data.accounts.forEach(acc => {
      const bal = balances[acc.id];
      if (!TYPE_DEBT[acc.type]) return;
      if (acc.type === 'kartu_kredit') {
        if (bal >= 0) return;
        debts.push({ name: acc.name, kind: 'Kartu kredit', bal: Math.abs(bal), rate: acc.interestPercent || 0, minFn: (b) => Math.min(b, cardMinPayOf(acc, b)), noRate: !(acc.interestPercent > 0) });
      } else if (acc.type === 'paylater') {
        if (bal >= 0) return;
        let monthly = 0;
        (Array.isArray(acc.plans) ? acc.plans : []).forEach(pl => { const sc = paylaterPlanSchedule(data, acc, pl); if (sc && sc.k < sc.tenor) monthly += pl.monthly || 0; });
        const total = Math.abs(bal);
        debts.push({ name: acc.name, kind: 'PayLater', bal: total, rate: 0, minFn: (b) => Math.min(b, monthly > 0 ? monthly : b) });
      } else if (TYPE_LOAN[acc.type]) {
        const rem = lapLoanRemaining(data, acc, bal);
        if (rem.total <= 0) return;
        const sc = lapLoanSchedule(data, acc, bal);
        const inst = acc.loanInstallment || (sc && sc.rows[0] ? sc.rows[0].total : 0);
        // Tanpa angsuran per bulan, cicilan wajibnya tak diketahui (dulu dianggap = seluruh saldo, jadi
        // "lunas dalam 1 bulan"). Pinjaman ini dikeluarkan dari simulasi dan diberi catatan.
        if (!(inst > 0)) { skipped.push(acc.name); return; }
        if (acc.loanInterestType === 'menurun') {
          const rate = acc.loanRatePercent ? (acc.loanRateUnit === 'bulan' ? acc.loanRatePercent : acc.loanRatePercent / 12) : 0;
          debts.push({ name: acc.name, kind: 'Pinjaman bank', bal: rem.sisaPokok, rate, minFn: (b) => Math.min(b, inst > 0 ? inst : b) });
        } else {
          // Bunga flat: bunga & biaya sisa sudah terkunci, jadi masuk ke saldo dan tidak bertambah lagi.
          let total = rem.total;
          if (sc && sc.next) total = Math.max(rem.sisaPokok, (sc.tenor - sc.paid) * (sc.rows[0] ? sc.rows[0].total : 0));
          debts.push({ name: acc.name, kind: acc.type === 'pinjaman_online' ? 'Pinjol (flat)' : 'Pinjaman (flat)', bal: total, rate: 0, flat: true, minFn: (b) => Math.min(b, inst > 0 ? inst : b) });
        }
      }
    });
    debts.skipped = skipped;
    return debts;
  }
  function laporanSimulate(debts, extra, strategy, roll) {
    const ds = debts.map(d => Object.assign({}, d, { done: 0 }));
    const mins0 = ds.reduce((s2, d) => s2 + d.minFn(d.bal), 0);
    const budget = mins0 + extra;
    let interest = 0, months = 0;
    while (months < 240 && ds.some(d => d.bal > 0.5)) {
      months++;
      ds.forEach(d => { if (d.bal > 0.5 && d.rate > 0) { const i = d.bal * d.rate / 100; d.bal += i; interest += i; } });
      let spent = 0;
      ds.forEach(d => { if (d.bal > 0.5) { const pay = Math.min(d.bal, d.minFn(d.bal)); d.bal -= pay; spent += pay; } });
      if (roll) {
        let left = budget - spent;
        const order = ds.filter(d => d.bal > 0.5).sort((a, b) => strategy === 'saldo' ? a.bal - b.bal : (b.rate - a.rate) || (a.bal - b.bal));
        for (let k = 0; k < order.length && left > 0.5; k++) { const pay = Math.min(left, order[k].bal); order[k].bal -= pay; left -= pay; }
      }
      ds.forEach(d => { if (d.bal <= 0.5 && !d.done) d.done = months; });
    }
    return { months, interest: Math.round(interest), finished: !ds.some(d => d.bal > 0.5) };
  }
  function laporanSimResultHtml(data, balances) {
    const debts = laporanSimDebts(data, balances);
    const skipped = debts.skipped || [];
    const skipNote = skipped.length
      ? '<div class="acc-sub" style="margin-top:8px; line-height:1.5;">Belum disertakan: ' + skipped.map(escapeHtml).join(', ') + ' (angsuran per bulan belum diisi). Isi di Edit akun, atau catat satu angsuran dulu supaya terisi otomatis.</div>'
      : '';
    if (!debts.length) return skipped.length ? skipNote : '<div class="acc-sub">Tidak ada utang aktif untuk disimulasikan.</div>';
    const extra = state.laporanSimExtra != null ? state.laporanSimExtra : (() => { const inc = laporanMonthlyIncome(data); return inc > 0 ? Math.round(inc * 0.1 / 50000) * 50000 : 500000; })();
    const base = laporanSimulate(debts, 0, 'bunga', false);
    const sc = [
      { label: 'Tanpa ekstra', r: base },
      { label: 'Ekstra · bunga tertinggi dulu', r: laporanSimulate(debts, extra, 'bunga', true) },
      { label: 'Ekstra · saldo terkecil dulu', r: laporanSimulate(debts, extra, 'saldo', true) }
    ];
    const mLabel = (r) => r.finished ? r.months + ' bln (' + laporanMonthLabel(r.months) + ')' : '&gt; 20 tahun';
    const totalBal = debts.reduce((s2, d) => s2 + d.bal, 0);
    const totalMin = debts.reduce((s2, d) => s2 + d.minFn(d.bal), 0);
    let html = '<div class="acc-sub" style="margin-bottom:4px;">' + debts.length + ' utang · total ' + formatRp(Math.round(totalBal)) + ' · cicilan wajib ± ' + formatRp(Math.round(totalMin)) + '/bln</div>';
    html += sc.map((x, i) => {
      const saved = i === 0 ? null : base.interest - x.r.interest;
      const faster = i === 0 || !base.finished ? null : base.months - x.r.months;
      return `<div style="padding:8px 0; border-bottom:1px solid var(--line);"><div style="font-size:13px; font-weight:600;">${x.label}</div>
        <div class="acc-sub" style="margin-top:2px;">Bebas utang: <strong>${mLabel(x.r)}</strong> · bunga tambahan ${formatRp(x.r.interest)}${saved !== null && saved > 0 ? ' · <span style="color:var(--green);">hemat ' + formatRp(saved) + '</span>' : ''}${faster !== null && faster > 0 ? ' · <span style="color:var(--green);">' + faster + ' bln lebih cepat</span>' : ''}</div></div>`;
    }).join('');
    const notes = ['Tanpa ekstra: kartu bayar minimum, lainnya sesuai angsuran. Skenario ekstra: cicilan yang sudah lunas digulung ke utang lain, ditambah dana ekstra tiap bulan.'];
    if (debts.some(d => d.flat)) notes.push('Bunga pinjaman flat (pinjol, dll.) sudah terkunci di saldo, jadi bayar lebih awal tidak menghemat bunga di simulasi ini. Manfaatnya: cicilan yang lunas bisa digulung ke utang lain.');
    const noRate = debts.filter(d => d.noRate).map(d => d.name);
    if (noRate.length) notes.push('Bunga kartu ' + noRate.map(escapeHtml).join(', ') + ' belum diisi di akun, jadi dianggap 0%. Isi bunganya supaya hasil lebih akurat.');
    notes.push('Hitungan pakai bunga bulanan sederhana dan tidak memasukkan belanja baru di kartu / PayLater.');
    html += '<details class="adv-more"><summary class="acc-sub" style="padding:8px 0; cursor:pointer;">Catatan simulasi</summary>' + notes.map(n => '<div class="acc-sub" style="margin-bottom:6px; line-height:1.5;">' + n + '</div>').join('') + '</details>';
    html += skipNote;
    return html;
  }
  // Elemen simulasi dibuat ulang tiap Laporan digambar, jadi selalu diambil lewat getElementById
  // (bukan cache $(), yang setelah render ulang menunjuk ke elemen lama yang sudah lepas dari halaman).
  let _simTimer = null;
  function onLaporanSimInput() {
    const el = document.getElementById('laporan-sim-extra');
    if (!el) return;
    state.laporanSimExtra = Math.max(0, parseFloat(el.value) || 0);
    clearTimeout(_simTimer);
    _simTimer = setTimeout(() => { // tunggu jeda ketik sebentar supaya tidak menghitung ulang di tiap ketukan angka
      const out = document.getElementById('laporan-sim-result');
      if (!out) return;
      const wasOpen = !!out.querySelector('details[open]');
      const data = loadData();
      out.innerHTML = lapMemoScope(() => laporanSimResultHtml(data, computeAllBalances(data)));
      if (wasOpen) { const dt = out.querySelector('details'); if (dt) dt.open = true; }
    }, 120);
  }
  function laporanSimHtml(data, balances, card) {
    { const sd = laporanSimDebts(data, balances); if (!sd.length && !(sd.skipped && sd.skipped.length)) return ''; }
    const shown = state.laporanSimExtra != null ? state.laporanSimExtra : (() => { const inc = laporanMonthlyIncome(data); return inc > 0 ? Math.round(inc * 0.1 / 50000) * 50000 : 500000; })();
    return card('Simulasi pelunasan',
      '<div class="acc-sub" style="margin:4px 0 6px;">Dana ekstra per bulan (Rp), di luar cicilan wajib</div>' +
      `<div class="field-row no-print" style="margin-bottom:8px;"><input type="number" id="laporan-sim-extra" value="${shown}" inputmode="numeric" min="0" step="50000" oninput="onLaporanSimInput()" aria-label="Dana ekstra per bulan untuk bayar utang" style="width:100%;"></div>` +
      '<div id="laporan-sim-result">' + laporanSimResultHtml(data, balances) + '</div>');
  }

  // Informasi tambahan di Laporan: rasio tabungan, perbandingan periode lalu, hari terboros,
  // beban utang, posisi kekayaan saat ini, dan 5 pengeluaran terbesar.
  function renderLaporanExtra(...args) { return lapMemoScope(() => renderLaporanExtraInner(...args)); }
  function renderLaporanExtraInner(data, range, dayCount, txns, masukTxns, keluarTxns, totalIn, totalOut, balancesIn) {
    const el = $('laporan-extra');
    if (!el) return;
    const net = totalIn - totalOut;
    const row = lapRow, card = lapCard;
    let html = '';

    // 1. Ringkasan cepat
    const saveRate = totalIn > 0 ? Math.round((net / totalIn) * 100) : null;
    const byDay = {};
    keluarTxns.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + t.amount; });
    const worst = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
    html += card('Ringkasan periode',
      row('Rasio tabungan (sisa dari pemasukan)', saveRate === null ? '—' : saveRate + '%', saveRate !== null && saveRate < 0 ? 'var(--red)' : (saveRate !== null ? 'var(--green)' : '')) +
      row('Rata-rata pemasukan/hari', formatRp(Math.round(totalIn / dayCount)), 'var(--green)') +
      row('Hari terboros', worst ? escapeHtml(fmtTgl(worst[0])) + ' · ' + formatRp(worst[1]) : '—') +
      row('Jumlah transaksi', masukTxns.length + keluarTxns.length + ' (' + masukTxns.length + ' masuk, ' + keluarTxns.length + ' keluar)'));

    // 2. Dibanding periode sebelumnya (panjang sama, tepat sebelum periode ini)
    if (state.laporanPeriod !== 'alltime') {
      const ymd = (d) => d.getFullYear() + '-' + padMonth(d.getMonth() + 1) + '-' + padMonth(d.getDate());
      const pe = new Date(range.start + 'T00:00:00'); pe.setDate(pe.getDate() - 1);
      const ps = new Date(pe); ps.setDate(ps.getDate() - (dayCount - 1));
      const prevStart = ymd(ps), prevEnd = ymd(pe);
      let pt = data.txns.filter(t => t.date >= prevStart && t.date <= prevEnd);
      if (state.laporanAccFilter !== 'all') pt = pt.filter(t => t.accountId === state.laporanAccFilter || t.toAccountId === state.laporanAccFilter);
      pt = pt.filter(t => !isDebtFlowTxn(t)); // konsisten dengan periode ini
      const pIn = pt.filter(t => t.type === 'masuk' && (state.laporanCatMasukFilter === 'all' || (t.category || 'Tanpa kategori') === state.laporanCatMasukFilter)).reduce((s2, t) => s2 + t.amount, 0);
      const pOut = pt.filter(t => t.type === 'keluar' && (state.laporanCatKeluarFilter === 'all' || (t.category || 'Tanpa kategori') === state.laporanCatKeluarFilter)).reduce((s2, t) => s2 + t.amount, 0);
      const delta = (cur, prev, upGood) => {
        if (prev <= 0) return cur > 0 ? 'baru' : '—';
        const pct = Math.round(((cur - prev) / prev) * 100);
        if (pct === 0) return '0%';
        return (pct > 0 ? '▲ ' : '▼ ') + Math.abs(pct) + '%';
      };
      const deltaColor = (cur, prev, upGood) => { if (prev <= 0 || cur === prev) return ''; return ((cur > prev) === upGood) ? 'var(--green)' : 'var(--red)'; };
      html += card('Dibanding periode sebelumnya',
        `<div class="acc-sub" style="margin-bottom:4px;">${escapeHtml(fmtTgl(prevStart))} – ${escapeHtml(fmtTgl(prevEnd))}</div>` +
        row('Pemasukan', formatRp(totalIn) + ' <span style="font-weight:500; font-size:11.5px;">(sebelumnya ' + formatRp(pIn) + ')</span> ' + delta(totalIn, pIn, true), deltaColor(totalIn, pIn, true)) +
        row('Pengeluaran', formatRp(totalOut) + ' <span style="font-weight:500; font-size:11.5px;">(sebelumnya ' + formatRp(pOut) + ')</span> ' + delta(totalOut, pOut, false), deltaColor(totalOut, pOut, false)) +
        row('Selisih (laba bersih)', formatRp(net) + ' <span style="font-weight:500; font-size:11.5px;">(sebelumnya ' + formatRp(pIn - pOut) + ')</span>', net >= (pIn - pOut) ? 'var(--green)' : 'var(--red)'));
    }

    // 3. Beban utang di periode ini
    const loanIds = {};
    data.accounts.forEach(a => { if (TYPE_DEBT[a.type]) loanIds[a.id] = true; });
    const bungaPaid = txns.filter(t => t.type === 'keluar' && t.category === 'Bunga & biaya bank').reduce((s2, t) => s2 + t.amount, 0);
    const flows = debtFlowsOf(data, txns);
    const pokokPaid = flows.paid; // transfer ke akun utang + pengeluaran berkategori utang
    if (bungaPaid > 0 || pokokPaid > 0 || flows.disbursed > 0) {
      const totalBayar = bungaPaid + pokokPaid;
      html += card('Pembayaran utang',
        (flows.disbursed > 0 ? row('Pencairan pinjaman (bukan pemasukan)', formatRp(flows.disbursed)) : '') +
        row('Angsuran pokok / bayar tagihan', formatRp(pokokPaid)) +
        row('Bunga & biaya bank', formatRp(bungaPaid), 'var(--red)') +
        row('Total keluar untuk utang', formatRp(totalBayar)) +
        row('Porsi terhadap pemasukan', totalIn > 0 ? Math.round((totalBayar / totalIn) * 100) + '%' : '—'));
    }

    // 4. Posisi saat ini (semua akun, tidak terpengaruh periode)
    const balances = balancesIn || computeAllBalances(data);   // dibagikan dari render() kalau ada
    let aset = 0, utang = 0, sisaBunga = 0;
    data.accounts.forEach(acc => {
      const bal = balances[acc.id];
      if (TYPE_DEBT[acc.type]) {
        utang += bal < 0 ? Math.abs(bal) : 0;
        if (bal > 0) aset += bal;
        if (TYPE_LOAN[acc.type]) sisaBunga += lapLoanRemaining(data, acc, bal).sisaBunga;
      } else if (acc.type === 'titipan') {
        if (bal > 0) aset += bal; else if (bal < 0) utang += Math.abs(bal);
      } else {
        if (bal >= 0) aset += bal; else utang += Math.abs(bal);
      }
    });
    const kekayaan = aset - utang;
    html += card('Posisi saat ini (semua akun)',
      row('Total aset', formatRp(aset), 'var(--green)') +
      row('Total utang (sisa pokok)', formatRp(utang), utang > 0 ? 'var(--red)' : '') +
      (sisaBunga > 0 ? row('Sisa bunga kontrak (belum jatuh tempo)', formatRp(sisaBunga)) : '') +
      row('Kekayaan bersih', formatRp(kekayaan), kekayaan < 0 ? 'var(--red)' : 'var(--green)'));

    // 4b. Rincian utang per jenis (kartu kredit, PayLater, pinjol, pinjaman bank) + saran
    const debtAn = laporanDebtAnalysis(data, balances);
    html += laporanDebtDetailHtml(debtAn, card, row);
    html += '<div id="laporan-proj-host">' + laporanCashProjectionHtml(data, balances, card, row) + '</div>';
    html += laporanDebtCostHtml(data, balances, card, row);
    html += laporanSimHtml(data, balances, card);

    // 5. Lima pengeluaran terbesar
    const top = keluarTxns.slice().sort((a, b) => b.amount - a.amount).slice(0, 5);
    if (top.length) {
      html += card('5 pengeluaran terbesar', top.map(t => `
        <div style="display:flex; justify-content:space-between; gap:10px; padding:7px 0; border-bottom:1px solid var(--line); font-size:13px;">
          <div style="min-width:0;"><div style="font-weight:600;">${escapeHtml(t.desc || t.category || 'Transaksi')}</div><div class="acc-sub">${escapeHtml((t.category || 'Tanpa kategori') + ' · ' + fmtTgl(t.date))}</div></div>
          <strong style="color:var(--red); font-variant-numeric:tabular-nums; white-space:nowrap;">${formatRp(t.amount)}</strong>
        </div>`).join(''));
    }

    html += laporanAdviceHtml(data, debtAn, { totalIn, totalOut, bungaPaid }, card);

    el.innerHTML = html;
  }


