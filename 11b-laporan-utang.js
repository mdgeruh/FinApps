  // ============================================================
  // TAB LAPORAN (lanjutan): rincian utang, saran, kartu ringkas
  // Lanjutan 11-laporan.js: dimuat sesudahnya, berbagi lingkup global yang sama.
  // ============================================================

  // ---------- LAPORAN: RINCIAN UTANG & SARAN ----------
  // Rata-rata pemasukan per bulan (90 hari terakhir, tanpa pencairan pinjaman), dipakai buat rasio beban cicilan.
  // ---------- LAPORAN: cache sementara, helper kartu, dan baris ringkas ----------
  // Cache berlaku hanya selama SATU kali render Laporan (lapMemoScope): jadwal/sisa pinjaman, daftar jatuh tempo,
  // dan rata-rata pemasukan dipakai berulang oleh beberapa kartu. Di luar scope selalu dihitung ulang (aman).
  let _lapMemo = null;
  function lapMemoScope(fn) {
    if (_lapMemo) return fn();
    _lapMemo = { sched: new Map(), rem: new Map(), duesAll: null, income: undefined };
    try { return fn(); } finally { _lapMemo = null; }
  }
  function lapLoanSchedule(data, acc, bal) {
    if (!_lapMemo) return computeLoanSchedule(data, acc, bal);
    if (!_lapMemo.sched.has(acc.id)) _lapMemo.sched.set(acc.id, computeLoanSchedule(data, acc, bal));
    return _lapMemo.sched.get(acc.id);
  }
  function lapLoanRemaining(data, acc, bal) {
    if (!_lapMemo) return computeLoanRemaining(data, acc, bal);
    if (!_lapMemo.rem.has(acc.id)) _lapMemo.rem.set(acc.id, computeLoanRemaining(data, acc, bal));
    return _lapMemo.rem.get(acc.id);
  }
  // computeUpcomingDues hanya menyaring hasil akhirnya menurut jumlah hari (urutan tetap), jadi cukup dihitung sekali
  // untuk semua tanggal lalu disaring per kebutuhan (365 hari untuk Saran, 30/60 hari untuk Proyeksi kas).
  function lapUpcomingDues(data, balances, days) {
    if (!_lapMemo) return computeUpcomingDues(data, balances, days);
    if (!_lapMemo.duesAll) _lapMemo.duesAll = computeUpcomingDues(data, balances, Infinity);
    return _lapMemo.duesAll.filter(x => x.days <= days);
  }
  function lapRow(label, val, color) {
    return `<div style="display:flex; justify-content:space-between; align-items:baseline; gap:10px; padding:7px 0; border-bottom:1px solid var(--line); font-size:13px;"><span style="color:var(--ink-soft);">${label}</span><strong style="font-variant-numeric:tabular-nums; text-align:right;${color ? ' color:' + color + ';' : ''}">${val}</strong></div>`;
  }
  function lapCard(title, body) {
    return `<div class="chart-card u-mt10"><div class="section-title" style="margin-bottom:4px;">${title}</div>${body}</div>`;
  }
  // Baris ringkas seperti kartu Saran: titik status + judul (+ nilai di kanan) + petunjuk satu baris; kalau ada
  // `lines`, baris bisa diketuk untuk membuka detail. title = teks biasa (di-escape di sini); hint & lines = HTML yang sudah aman.
  const LAP_DOT = { red: 'var(--red)', amber: 'var(--amber)', ok: 'var(--green)', none: 'var(--ink-soft)' };
  function lapItem(o) {
    const dot = o.noDot ? '' : `<span style="flex:0 0 8px; width:8px; height:8px; margin-top:5px; border-radius:50%; background:${LAP_DOT[o.level || 'none']};"></span>`;
    const head = `<div style="display:flex; justify-content:space-between; gap:10px; font-size:13px;"><strong>${escapeHtml(o.title)}</strong>` +
      (o.right ? `<strong style="font-variant-numeric:tabular-nums; white-space:nowrap;${o.rightColor ? ' color:' + o.rightColor + ';' : ''}">${o.right}</strong>` : '') + '</div>' +
      (o.hint ? `<div class="acc-sub"${o.hintColor ? ` style="color:${o.hintColor};"` : ''}>${o.hint}</div>` : '');
    const lines = (o.lines || []).filter(Boolean);
    const chev = lines.length ? '<span class="adv-chev" style="color:var(--ink-soft); font-size:11px; margin-top:2px;">▾</span>' : '';
    const row = `<div style="display:flex; align-items:flex-start; gap:9px; padding:9px 0;">${dot}<div class="u-flex1-min0">${head}</div>${chev}</div>`;
    if (!lines.length) return `<div style="border-bottom:1px solid var(--line);">${row}</div>`;
    return `<details class="adv-item" style="border-bottom:1px solid var(--line);"><summary>${row}</summary><div class="acc-sub" style="padding:0 0 10px ${o.noDot ? 0 : 17}px; line-height:1.5;">` +
      lines.map(l => `<div${l.color ? ` style="color:${l.color};"` : ''}>${l.text}</div>`).join('') + '</div></details>';
  }
  // Daftar panjang: tampilkan `show` baris pertama, sisanya di "Tampilkan N lagi".
  function lapMore(items, show) {
    const top = items.slice(0, show), rest = items.slice(show);
    return top.join('') + (rest.length ? `<details class="adv-more"><summary class="acc-sub" style="padding:8px 0; cursor:pointer;">Tampilkan ${rest.length} lagi</summary>${rest.join('')}</details>` : '');
  }
  function lapNote(text) { return `<div class="acc-sub" style="margin-top:8px; font-size:11px; line-height:1.45;">${text}</div>`; }

  function laporanMonthlyIncome(data) {
    if (_lapMemo && _lapMemo.income !== undefined) return _lapMemo.income;
    const v = laporanMonthlyIncomeCalc(data);
    if (_lapMemo) _lapMemo.income = v;
    return v;
  }
  function laporanMonthlyIncomeCalc(data) {
    const today = todayStr();
    const d0 = new Date(today + 'T00:00:00'); d0.setDate(d0.getDate() - 90);
    const from = d0.getFullYear() + '-' + padMonth(d0.getMonth() + 1) + '-' + padMonth(d0.getDate());
    const inc = data.txns.filter(t => t.type === 'masuk' && !isNonOperatingTxn(t) && t.date >= from && t.date <= today);
    if (!inc.length) return 0;
    const firstAny = data.txns.reduce((m, t) => (t.date && t.date < m) ? t.date : m, today);
    const startD = firstAny > from ? firstAny : from;
    const days = Math.round((new Date(today + 'T00:00:00') - new Date(startD + 'T00:00:00')) / 86400000) + 1;
    const months = Math.min(3, Math.max(1, days / 30));
    return inc.reduce((s2, t) => s2 + t.amount, 0) / months;
  }

  // Kumpulkan data utang per jenis (kartu kredit, PayLater, pinjol, pinjaman bank) + tagihan terdekat.
  function laporanDebtAnalysis(data, balances) {
    const today = todayStr();
    const dues = lapUpcomingDues(data, balances, 365);
    const dueById = {};
    dues.forEach(d => { if (!dueById[d.id] || d.days < dueById[d.id].days) dueById[d.id] = d; });
    const res = { cards: [], paylaters: [], online: [], bank: [], totalDebt: 0, due30: 0, dues, liquid: 0 };
    data.accounts.forEach(acc => {
      const bal = balances[acc.id];
      if (!TYPE_DEBT[acc.type]) {
        if (acc.type === 'kas' || acc.type === 'bank' || acc.type === 'ewallet') res.liquid += Math.max(0, bal);
        return;
      }
      const used = bal < 0 ? Math.abs(bal) : 0;
      const due = dueById[acc.id] || null;
      if (acc.type === 'kartu_kredit') {
        if (used <= 0) return;
        const limit = acc.limit || 0;
        res.cards.push({ acc, used, limit, pct: limit > 0 ? Math.round(used / limit * 100) : null, ci: cardStatementInfo(data, acc, today), due, total: used });
      } else if (acc.type === 'paylater') {
        if (used <= 0) return;
        const limit = acc.limit || 0;
        const credit = paylaterCreditUsed(data, acc, bal);
        res.paylaters.push({ acc, used, credit, limit, pct: limit > 0 ? Math.round(credit / limit * 100) : null, due, total: used, meta: paylaterMetaExtra(data, acc).replace(/^ · /, '') });
      } else if (TYPE_LOAN[acc.type]) {
        const rem = lapLoanRemaining(data, acc, bal);
        if (rem.total <= 0) return;
        const sch = lapLoanSchedule(data, acc, bal);
        const pokokAwal = Math.abs(acc.originalPrincipal || acc.initialBalance || 0);
        const monthlyCost = pokokAwal > 0 ? computeLoanMonthlyInterest(data, acc, bal) / pokokAwal * 100 : 0;
        const item = { acc, rem, sch, due, monthlyCost, effMonthly: loanEffectiveMonthlyRate(data, acc), total: rem.total };
        (acc.type === 'pinjaman_online' ? res.online : res.bank).push(item);
      }
    });
    [res.cards, res.paylaters, res.online, res.bank].forEach(g => g.forEach(x => { res.totalDebt += x.total; }));
    res.due30 = dues.filter(d => d.days <= 30).reduce((s2, d) => s2 + d.amount, 0);
    return res;
  }

  // Baris biaya pinjaman: bunga menurun dari sisa pokok; bunga flat dari pokok awal + bunga efektifnya
  // (kalau tenor diketahui), supaya tidak tertukar dengan pinjaman berbunga menurun.
  function costLine(a, c) {
    const feeNote = a.type === 'pinjaman_online' ? ' (bunga' + ((a.loanInsurancePercent || 0) > 0 || a.loanAdminMode === 'cicil' ? ' + biaya' : '') + ')' : '';
    if (a.loanInterestType === 'menurun') {
      return c.effMonthly > 0 ? { text: 'Bunga menurun ≈ ' + c.effMonthly.toFixed(2) + '%/bln dari sisa pokok' } : null;
    }
    if (!(c.monthlyCost > 0)) return null;
    let t = 'Bunga flat ≈ ' + c.monthlyCost.toFixed(2) + '%/bln dari pokok awal' + feeNote;
    if (c.effMonthly > 0) {
      const yr = (Math.pow(1 + c.effMonthly / 100, 12) - 1) * 100;
      t += ' · efektif ≈ ' + c.effMonthly.toFixed(2) + '%/bln (≈ ' + Math.round(yr) + '%/thn)';
    }
    return { text: t };
  }

  function laporanDebtDetailHtml(an, card, row) {
    if (an.totalDebt <= 0) return '';
    const head = (title, total) => `<div style="display:flex; justify-content:space-between; margin-top:10px; padding-bottom:2px; font-size:12px; font-weight:700; letter-spacing:.02em; color:var(--ink-soft); text-transform:uppercase;"><span>${title}</span><span>${formatRp(total)}</span></div>`;
    const dueLine = (d) => {
      if (!d) return null;
      const late = d.days < 0;
      return { text: escapeHtml(d.label) + ' · ' + formatRp(d.amount) + ' · jatuh tempo ' + escapeHtml(fmtTgl(d.due)) + (late ? ' (lewat ' + (-d.days) + ' hari)' : (d.days === 0 ? ' (hari ini)' : ' (' + d.days + ' hari lagi)')), color: late ? 'var(--red)' : '' };
    };
    // Petunjuk satu baris di bawah nama akun (detail lengkap ada di baris yang bisa dibuka)
    const dueShort = (d) => !d ? '' : (d.days < 0 ? 'lewat ' + (-d.days) + ' hari' : (d.days === 0 ? 'jatuh tempo hari ini' : 'jatuh tempo ' + escapeHtml(fmtTgl(d.due)) + ' (' + d.days + ' hari lagi)'));
    const pctColor = (pct) => pct === null ? '' : (pct >= 70 ? 'var(--red)' : (pct >= 30 ? 'var(--amber)' : 'var(--green)'));
    const levelOf = (pct, d) => ((d && d.days < 0) || (pct !== null && pct >= 70)) ? 'red' : (((pct !== null && pct >= 30) || (d && d.days <= 7)) ? 'amber' : 'ok');
    const hintOf = (parts, d) => ({ hint: parts.concat(dueShort(d) || []).filter(Boolean).join(' · '), hintColor: d && d.days < 0 ? 'var(--red)' : '' });
    let html = row('Total semua utang', formatRp(an.totalDebt), 'var(--red)') +
      row('Tagihan & angsuran 30 hari ke depan', formatRp(an.due30), an.due30 > 0 ? 'var(--red)' : '');

    if (an.cards.length) {
      html += head('Kartu kredit', an.cards.reduce((s2, c) => s2 + c.total, 0));
      html += an.cards.map(c => lapItem(Object.assign({
        title: c.acc.name, right: formatRp(c.used), rightColor: 'var(--red)', level: levelOf(c.pct, c.due),
        lines: [
          c.limit > 0 ? { text: 'Terpakai ' + c.pct + '% dari limit ' + formatRp(c.limit) + ' · sisa limit ' + formatRp(Math.max(0, c.limit - c.used)), color: pctColor(c.pct) } : null,
          c.ci ? { text: 'Tagihan cetak ' + escapeHtml(fmtTgl(c.ci.statementDate)) + ' ' + formatRp(c.ci.statement) + ' · belum dibayar ' + formatRp(c.ci.remaining) + (c.ci.remaining > 0 ? ' (minimum ' + formatRp(c.ci.minRemaining) + ')' : '') + (c.due ? ' · jatuh tempo ' + escapeHtml(fmtTgl(c.due.due)) + (c.due.days < 0 ? ' (lewat ' + (-c.due.days) + ' hari)' : ' (' + c.due.days + ' hari lagi)') : ''), color: (c.due && c.due.days < 0) ? 'var(--red)' : '' } : dueLine(c.due),
          c.acc.interestPercent ? { text: 'Bunga ' + c.acc.interestPercent + '%/bln kalau tidak lunas penuh ≈ ' + formatRp(Math.round(c.used * c.acc.interestPercent / 100)) + '/bln dari saldo sekarang' } : null
        ]
      }, hintOf([c.limit > 0 ? 'Limit ' + c.pct + '%' : ''], c.due)))).join('');
    }
    if (an.paylaters.length) {
      html += head('PayLater', an.paylaters.reduce((s2, c) => s2 + c.total, 0));
      html += an.paylaters.map(c => lapItem(Object.assign({
        title: c.acc.name, right: formatRp(c.used), rightColor: 'var(--red)', level: levelOf(c.pct, c.due),
        lines: [
          c.limit > 0 ? { text: 'Limit terpakai ' + formatRp(c.credit) + ' dari ' + formatRp(c.limit) + ' (' + c.pct + '%)', color: pctColor(c.pct) } : null,
          c.meta ? { text: escapeHtml(c.meta) } : null,
          dueLine(c.due)
        ]
      }, hintOf([c.limit > 0 ? 'Limit ' + c.pct + '%' : ''], c.due)))).join('');
    }
    if (an.online.length) {
      html += head('Pinjaman online', an.online.reduce((s2, c) => s2 + c.total, 0));
      html += an.online.map(c => loanBlock(c, dueLine, dueShort, hintOf, levelOf)).join('');
    }
    if (an.bank.length) {
      html += head('Pinjaman bank', an.bank.reduce((s2, c) => s2 + c.total, 0));
      html += an.bank.map(c => loanBlock(c, dueLine, dueShort, hintOf, levelOf)).join('');
    }
    return card('Rincian utang (saat ini)', html);
  }
  function loanBlock(c, dueLine, dueShort, hintOf, levelOf) {
    const a = c.acc;
    const sisaBiaya = c.rem.flat ? c.rem.sisaBunga : 0;
    const angs = c.sch ? 'Angsuran ' + c.sch.paid + '/' + c.sch.tenor : '';
    return lapItem(Object.assign({
      title: a.name, right: formatRp(c.total), rightColor: 'var(--red)', level: levelOf(null, c.due),
      lines: [
        { text: 'Sisa pokok ' + formatRp(c.rem.sisaPokok) + (sisaBiaya > 0 ? ' + bunga & biaya ' + formatRp(sisaBiaya) : '') },
        c.sch ? { text: 'Angsuran ' + c.sch.paid + '/' + c.sch.tenor + (c.sch.rows[0] ? ' · ' + formatRp(c.sch.rows[0].total) + '/bln' : '') } : (a.loanInstallment ? { text: 'Angsuran ' + formatRp(a.loanInstallment) + '/bln' } : null),
        dueLine(c.due),
        costLine(a, c)
      ]
    }, hintOf([angs], c.due)));
  }

  // Saran otomatis, dipadatkan: tiap saran satu baris judul (ketuk untuk detail), maksimal 3 tampil awal.
  // level: red (segera), amber (waspada), info, green (aman).
  function laporanAdviceHtml(data, an, ctx, card) {
    const items = [];
    const add = (level, title, detail) => items.push({ level, title, detail });
    const names = (arr) => arr.map(escapeHtml).join(', ');

    // Sudah lewat jatuh tempo
    const late = an.dues.filter(d => d.days < 0);
    if (late.length) {
      add('red', late.length + ' tagihan lewat jatuh tempo',
        late.map(d => escapeHtml(d.name) + ' ' + formatRp(d.amount) + ' (lewat ' + (-d.days) + ' hari)').join('<br>') + '<br>Bayar ini paling dulu supaya denda dan catatan kredit (SLIK) tidak makin buruk.');
    }
    // Perkiraan denda keterlambatan pinjaman (hanya kalau persen denda diisi di akun)
    an.online.concat(an.bank).forEach(c => {
      const lf = computeLateFees(c.acc, c.sch);
      if (!lf || !(lf.total > 0)) return;
      add('red', 'Perkiraan denda ' + escapeHtml(c.acc.name) + ' ' + formatRp(lf.total),
        lf.items.length + ' angsuran telat (' + escapeHtml(lateFeeRuleText(lf)) + '). Ini hanya perkiraan; nominal sebenarnya mengikuti aturan pemberi pinjaman. Bayar angsuran yang telat paling dulu supaya denda tidak terus bertambah.');
    });
    // Dana likuid vs tagihan 30 hari
    if (an.due30 > 0 && an.liquid < an.due30) {
      add('red', 'Dana 30 hari kurang ' + formatRp(an.due30 - an.liquid),
        'Saldo kas, bank, dan e-wallet ' + formatRp(an.liquid) + ', tagihan 30 hari ke depan ' + formatRp(an.due30) + '. Sisihkan dulu sebelum belanja lain. Lihat urutannya di Proyeksi kas.');
    }
    // Beban cicilan vs pemasukan
    const inc = laporanMonthlyIncome(data);
    if (an.due30 > 0 && inc > 0) {
      const r = Math.round(an.due30 / inc * 100);
      const det = 'Tagihan & angsuran 30 hari ' + formatRp(an.due30) + ' dibanding rata-rata pemasukan bulanan ± ' + formatRp(Math.round(inc)) + '. Batas sehat umumnya di bawah 30–35%.';
      if (r >= 50) add('red', 'Cicilan ' + r + '% dari pemasukan', det + ' Hindari utang baru dan cari yang bisa dipercepat atau dinegosiasikan.');
      else if (r > 35) add('amber', 'Cicilan ' + r + '% dari pemasukan', det + ' Tahan dulu utang baru.');
    } else if (an.due30 > 0 && inc <= 0) {
      add('info', 'Rasio cicilan belum bisa dihitung', 'Belum ada pemasukan tercatat 90 hari terakhir. Catat pemasukan supaya analisis akurat.');
    }
    // Limit kartu / PayLater
    const hi = an.cards.concat(an.paylaters).filter(c => c.pct !== null && c.pct >= 30).sort((x, y) => y.pct - x.pct);
    if (hi.length) {
      const worst = hi[0].pct;
      add(worst >= 70 ? 'red' : 'amber', 'Limit tinggi: ' + hi.slice(0, 2).map(c => escapeHtml(c.acc.name) + ' ' + c.pct + '%').join(', ') + (hi.length > 2 ? ' +' + (hi.length - 2) : ''),
        hi.map(c => escapeHtml(c.acc.name) + ' terpakai ' + c.pct + '% dari limit').join('<br>') + '<br>Idealnya di bawah 30%; di atas 70% berisiko dan menekan skor kredit. Bayar lebih sebelum tanggal cetak tagihan dan tahan belanja baru.');
    }
    // Pinjol berbiaya tinggi
    const costly = an.online.filter(c => c.monthlyCost >= 2).sort((x, y) => y.monthlyCost - x.monthlyCost);
    if (costly.length) {
      const c0 = costly[0];
      add('amber', costly.length === 1 ? escapeHtml(c0.acc.name) + ' ≈ ' + c0.monthlyCost.toFixed(1) + '%/bln' : costly.length + ' pinjol berbiaya tinggi (≈' + c0.monthlyCost.toFixed(1) + '%/bln)',
        costly.map(c => escapeHtml(c.acc.name) + ': ≈ ' + c.monthlyCost.toFixed(1) + '%/bln (≈ ' + Math.round(c.monthlyCost * 12) + '%/thn dari pokok awal)').join('<br>') +
        '<br>Tergolong mahal. Jangan perpanjang atau ambil pinjol baru untuk menutup tagihan lain.' +
        (costly.some(c => c.rem.flat && c.rem.sisaBunga > 0) ? '<br>Bunga flat sudah terkunci di angsuran, jadi melunasi lebih awal biasanya tidak mengurangi total bunga kecuali ada diskon pelunasan dipercepat. Cek dulu di aplikasinya.' : ''));
    }
    // Arus kas & beban bunga periode terpilih
    if (ctx.totalIn > 0 && ctx.totalOut > ctx.totalIn) {
      add('amber', 'Pengeluaran melebihi pemasukan ' + formatRp(ctx.totalOut - ctx.totalIn), 'Di periode yang dipilih. Kalau berulang, saldo menipis dan utang bisa bertambah.');
    }
    if (ctx.totalIn > 0 && ctx.bungaPaid > 0) {
      const r = Math.round(ctx.bungaPaid / ctx.totalIn * 100);
      if (r >= 10) add('amber', 'Bunga & biaya ' + r + '% dari pemasukan', 'Bunga & biaya yang dibayar periode ini ' + formatRp(ctx.bungaPaid) + ' tidak mengurangi pokok. Prioritaskan mengurangi utang berbunga.');
    }
    // Prioritas dana ekstra
    const cand = [];
    an.cards.forEach(c => { if (c.acc.interestPercent > 0) cand.push({ name: c.acc.name, rate: c.acc.interestPercent }); });
    an.bank.forEach(c => { if (c.acc.loanInterestType === 'menurun' && c.acc.loanRatePercent > 0) cand.push({ name: c.acc.name, rate: c.acc.loanRateUnit === 'bulan' ? c.acc.loanRatePercent : c.acc.loanRatePercent / 12 }); });
    if (cand.length) {
      cand.sort((x, y) => y.rate - x.rate);
      add('info', 'Dana ekstra: dahulukan ' + escapeHtml(cand[0].name), 'Bunga ' + (Math.round(cand[0].rate * 100) / 100) + '%/bln, tertinggi yang bisa turun kalau dilunasi. Bandingkan skenarionya di Simulasi pelunasan.');
    }
    // Aman
    if (an.totalDebt <= 0) add('green', 'Tidak ada utang tercatat', '');
    else if (!items.some(i => i.level === 'red' || i.level === 'amber')) add('green', 'Tidak ada tanda bahaya', 'Tidak ada tunggakan dan beban cicilan masih wajar. Pertahankan bayar tepat waktu.');

    const order = { red: 0, amber: 1, info: 2, green: 3 };
    items.sort((x, y) => order[x.level] - order[y.level]);
    const color = { red: 'var(--red)', amber: 'var(--amber)', info: 'var(--ink-soft)', green: 'var(--green)' };
    const one = (i) => {
      const dot = `<span style="flex:0 0 8px; width:8px; height:8px; border-radius:50%; background:${color[i.level]};"></span>`;
      const row = `<div style="display:flex; align-items:center; gap:9px; padding:9px 0; font-size:13px;">${dot}<span class="u-flex1-min0">${i.title}</span>${i.detail ? '<span class="adv-chev" style="color:var(--ink-soft); font-size:11px;">▾</span>' : ''}</div>`;
      if (!i.detail) return `<div style="border-bottom:1px solid var(--line);">${row}</div>`;
      return `<details class="adv-item" style="border-bottom:1px solid var(--line);"><summary>${row}</summary><div class="acc-sub" style="padding:0 0 10px 17px; line-height:1.5;">${i.detail}</div></details>`;
    };
    const SHOW = 3;
    const top = items.slice(0, SHOW), rest = items.slice(SHOW);
    const nRed = items.filter(i => i.level === 'red').length, nAmber = items.filter(i => i.level === 'amber').length;
    const badge = (nRed ? `<span style="color:var(--red); font-size:11.5px; font-weight:600; margin-left:8px;">${nRed} segera</span>` : '') + (nAmber ? `<span style="color:var(--amber); font-size:11.5px; font-weight:600; margin-left:8px;">${nAmber} waspada</span>` : '');
    const body = top.map(one).join('') +
      (rest.length ? `<details class="adv-more"><summary class="acc-sub" style="padding:8px 0; cursor:pointer;">Tampilkan ${rest.length} lagi</summary>${rest.map(one).join('')}</details>` : '') +
      '<div class="acc-sub" style="margin-top:8px; font-size:11px;">Otomatis dari data yang dicatat, bukan nasihat keuangan profesional.</div>';
    return card('Saran' + badge, body);
  }
