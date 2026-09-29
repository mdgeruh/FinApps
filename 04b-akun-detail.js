  // ============================================================
  // AKUN: DETAIL AKUN (modal detail, jadwal angsuran, breakdown bulanan)
  // Lanjutan 04-akun.js: dimuat sesudahnya, berbagi lingkup global yang sama.
  // ============================================================

  let detailAccountId = null;

  function openAccountDetail(id) {
    const data = loadData();
    const acc = data.accounts.find(a => a.id === id);
    if (!acc) return;
    detailAccountId = id;

    const bal = accountBalance(data, id);
    const isDebt = TYPE_DEBT[acc.type];
    const colorVar = TYPE_COLOR_VAR[acc.type] || '--teal';
    const di = accountDisplayInfo(data, acc, bal, { detail: true });
    const { valueText, color, pct, barColor } = di;
    let metaExtra = di.metaExtra;
    { const q = accountQuickActions(acc), qWrap = $('acc-detail-quick');
      if (qWrap) { qWrap.style.display = (q.catat || q.transfer) ? 'flex' : 'none'; $('acc-quick-catat').style.display = q.catat ? '' : 'none'; $('acc-quick-transfer').style.display = q.transfer ? '' : 'none'; } }
    { const st = computeAccountTxnStats(data)[id]; metaExtra += ' · ' + (st ? st.count : 0) + ' transaksi'; }

    // Jadwal angsuran (pinjaman bunga flat bertenor)
    const schedEl = $('acc-detail-schedule');
    if (schedEl) {
      const sch = TYPE_LOAN[acc.type] ? computeLoanSchedule(data, acc, bal) : null;
      if (sch) {
        metaExtra += ' · Angsuran ' + sch.paid + '/' + sch.tenor;
        const icon = { lunas: '✓', telat: '!', belum: '○' };
        const colr = { lunas: 'var(--green)', telat: 'var(--red)', belum: 'var(--ink-soft)' };
        const nextNo = sch.next ? sch.next.no : 0;
        const lf = computeLateFees(acc, sch), lfBy = {};
        if (lf) lf.items.forEach(x => { lfBy[x.no] = x; });
        const lfNote = lf && lf.total > 0 ? '<div class="acc-sub" style="color:var(--red); margin-bottom:8px;">Perkiraan denda telat ' + formatRp(lf.total) + ' (' + lf.items.length + ' angsuran, ' + escapeHtml(lateFeeRuleText(lf)) + '). Ini hanya perkiraan; catat sebagai pengeluaran kalau memang ditagih.</div>' : '';
        schedEl.style.display = 'block';
        schedEl.innerHTML = lfNote + '<details' + (sch.paid < sch.tenor ? ' open' : '') + '><summary class="section-title" style="cursor:pointer; margin-bottom:8px;">Jadwal angsuran (' + sch.paid + '/' + sch.tenor + ')</summary>' +
          sch.rows.map(r => `
            <div class="txn-row" style="${r.no === nextNo ? 'background:var(--teal-soft); border-radius:10px;' : ''}">
              <div class="txn-left">
                <span style="color:${colr[r.status]}; font-weight:700; width:16px; text-align:center;">${icon[r.status]}</span>
                <div class="txn-text">
                  <div class="txn-desc">Ke-${r.no} · ${escapeHtml(fmtTgl(r.due))}${r.status === 'telat' ? ' · lewat ' + (lfBy[r.no] ? lfBy[r.no].days + ' hari' : 'jatuh tempo') : ''}</div>
                  <div class="txn-meta">Pokok ${formatRp(r.pokok)} + ${loanMonthlyFees(acc) > 0 ? 'bunga & biaya' : 'bunga'} ${formatRp(r.bunga)} · sisa pokok ${formatRp(r.sisa)}${lfBy[r.no] && lfBy[r.no].fee > 0 ? ' · perkiraan denda ' + formatRp(lfBy[r.no].fee) : ''}</div>
                </div>
              </div>
              <div class="txn-right"><span class="txn-amount" style="color:${colr[r.status]};">${formatRp(r.total)}</span></div>
            </div>`).join('') + '</details>';
      } else if (TYPE_LOAN[acc.type] && (acc.loanTenorMonths || 0) > 0) {
        schedEl.style.display = 'block';
        schedEl.innerHTML = '<div class="acc-sub">Isi tanggal pencairan di Edit akun untuk melihat jadwal angsuran & pengingat jatuh tempo.</div>';
      } else if (acc.type === 'kartu_kredit' && cardStatementInfo(data, acc, todayStr())) {
        const ci = cardStatementInfo(data, acc, todayStr());
        const usedNow = bal < 0 ? Math.abs(bal) : 0;
        const newCharges = Math.max(0, Math.round((usedNow - ci.remaining) * 100) / 100);
        const late = ci.remaining > 0 && ci.dueDate < todayStr();
        const rows = [
          ['Cetak terakhir · ' + fmtTgl(ci.statementDate), formatRp(ci.statement), 'var(--ink)'],
          ['Sudah dibayar sejak cetak', formatRp(ci.paid), 'var(--green)'],
          ['Sisa tagihan cetak · jatuh tempo ' + fmtTgl(ci.dueDate) + (late ? ' (lewat)' : ''), formatRp(ci.remaining), ci.remaining > 0 ? 'var(--red)' : 'var(--green)'],
          ['Minimum yang masih harus dibayar', formatRp(ci.minRemaining), 'var(--ink)'],
          ['Belanja setelah cetak (masuk tagihan berikutnya)', formatRp(newCharges), 'var(--ink-soft)'],
          ['Cetak berikutnya', fmtTgl(ci.nextStatement), 'var(--ink-soft)']
        ];
        schedEl.style.display = 'block';
        schedEl.innerHTML = '<div class="section-title" style="margin-bottom:8px;">Tagihan kartu</div>' + rows.map(r => `
          <div class="txn-row">
            <div class="txn-left"><div class="txn-text"><div class="txn-desc">${escapeHtml(r[0])}</div></div></div>
            <div class="txn-right"><span class="txn-amount" style="color:${r[2]};">${r[1]}</span></div>
          </div>`).join('');
      } else if (acc.type === 'kartu_kredit' && acc.feeDay) {
        schedEl.style.display = 'block';
        schedEl.innerHTML = '<div class="acc-sub">Isi tanggal cetak tagihan di Edit akun supaya tagihan cetak dipisah dari belanja baru.</div>';
      } else {
        schedEl.style.display = 'none'; schedEl.innerHTML = '';
      }
    }

    $('acc-detail-name').textContent = acc.name;
    $('acc-detail-type').textContent = TYPE_LABELS[acc.type] + metaExtra;
    const amtEl = $('acc-detail-amount');
    amtEl.textContent = valueText;
    amtEl.style.color = color;

    const barWrap = $('acc-detail-bar-wrap');
    const barLabel = $('acc-detail-bar-label');
    const loanProg = TYPE_LOAN[acc.type] ? computeLoanProgress(acc, bal) : null;
    if (loanProg) {
      // Pinjaman: bar = persen pokok yang sudah terbayar (bukan pemakaian limit).
      barWrap.style.display = 'block';
      barWrap.style.marginBottom = '6px';
      const fill = $('acc-detail-bar-fill');
      fill.style.width = loanProg.pct + '%';
      fill.style.background = 'var(--green)';
      barLabel.style.display = 'block';
      barLabel.textContent = loanProg.pct + '% terbayar · ' + formatRp(loanProg.terbayar) + ' dari ' + formatRp(loanProg.pokokAwal) + (loanProg.sisa > 0 ? ' · sisa pokok ' + formatRp(loanProg.sisa) : ' · lunas');
    } else if (isDebt && (acc.limit || 0) > 0) {
      barWrap.style.display = 'block';
      barWrap.style.marginBottom = '16px';
      barLabel.style.display = 'none';
      const fill = $('acc-detail-bar-fill');
      fill.style.width = pct + '%';
      fill.style.background = `var(${barColor})`;
    } else {
      barWrap.style.display = 'none';
      barLabel.style.display = 'none';
    }

    renderAssetPanel(data, acc, bal);
    renderReconcilePanel(data, acc);

    // Tombol bayar tagihan kartu kredit
    const payEl = $('acc-detail-pay');
    if (payEl) {
      const opts = acc.type === 'kartu_kredit' ? cardPayOptions(data, acc, bal) : null;
      if (opts) {
        const q = (k) => `data-act="payCardFromDetail" data-a0="${acc.id}" data-a1="${k}"`;
        let html = '<div class="section-title" style="margin-bottom:8px;">Bayar tagihan</div>';
        if (opts.note) html += `<div class="acc-sub u-mb8">${escapeHtml(opts.note)}</div>`;
        html += `<div class="acc-form-actions u-mb8"><button type="button" class="submit-btn" ${q(opts.primary.kind)}>${escapeHtml(opts.primary.text)} — ${formatRp(opts.primary.amount)}</button></div>`;
        if (opts.others.length) {
          html += '<div class="acc-form-actions">' + opts.others.map(o => `<button type="button" class="io-btn" ${q(o.kind)}>${escapeHtml(o.text)} — ${formatRp(o.amount)}</button>`).join('') + '</div>';
        }
        payEl.style.display = 'block';
        payEl.innerHTML = html;
      } else {
        payEl.style.display = 'none'; payEl.innerHTML = '';
      }
    }

    const loanPayWrap = $('acc-detail-loan-pay');
    if (TYPE_LOAN[acc.type] && bal < 0) {
      loanPayWrap.style.display = 'block';
      const sourceSel = $('loan-pay-source-input');
      const sourceOptions = data.accounts.filter(a => a.id !== id && !TYPE_DEBT[a.type] && a.type !== 'titipan');
      sourceSel.innerHTML = sourceOptions.map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
      $('loan-pay-amount-input').value = '';
      const dateEl = $('loan-pay-date-input');
      if (dateEl) { dateEl.value = todayStr(); dateEl.max = todayStr(); }
      // Pinjaman online: angsuran sudah gabungan pokok+bunga, jadi opsi "bayar bunga saja" tidak relevan.
      const bungaOption = document.querySelector('#loan-pay-mode-input option[value="bunga"]');
      if (bungaOption) bungaOption.style.display = acc.type === 'pinjaman_online' ? 'none' : '';
      $('loan-pay-mode-input').value = 'pokok_bunga';
      onLoanPayModeChange();
    } else {
      loanPayWrap.style.display = 'none';
    }

    const plansWrap = $('acc-detail-plans');
    const plans = acc.type === 'paylater' && Array.isArray(acc.plans) ? acc.plans : [];
    if (plans.length > 0) {
      plansWrap.style.display = 'block';
      const feeSum = paylaterFeeSummary(data, acc);
      const feeSummaryHtml = feeSum.feeAllTime > 0 ? `
          <div class="acc-sub" style="margin-bottom:10px; line-height:1.6;">
            Sisa bunga belum jatuh tempo: <b>${formatRp(feeSum.feeRemaining)}</b><br>
            Bunga sudah terbayar: <b>${formatRp(feeSum.feePaidSoFar)}</b> dari total ${formatRp(feeSum.feeAllTime)} seumur cicilan<br>
            Rata-rata bunga: <b>${feeSum.feeAvgPct.toFixed(1)}%</b> dari pokok per cicilan
          </div>` : '';
      $('acc-detail-plans-list').innerHTML = feeSummaryHtml + plans.slice().sort((a, b) => b.date.localeCompare(a.date)).map(pl => {
        const sc = paylaterPlanSchedule(data, acc, pl);
        let jadwal, pct = 0;
        if (!sc) jadwal = 'Isi tanggal jatuh tempo di Edit akun untuk melihat jadwal';
        else {
          pct = Math.round((sc.k / sc.tenor) * 100);
          jadwal = sc.next
            ? 'Jadwal: cicilan ke-' + Math.min(sc.k + 1, sc.tenor) + ' dari ' + sc.tenor + ' · jatuh tempo berikutnya ' + formatDayLabel(sc.next)
            : 'Jadwal selesai · cicilan terakhir ' + formatDayLabel(sc.last);
        }
        return `
          <div class="txn-row">
            <div class="txn-left"><div class="txn-text">
              <div class="txn-desc">${escapeHtml(pl.desc)}</div>
              <div class="txn-meta">${formatRp(pl.monthly)}/bln × ${pl.tenor} bln · bunga flat ${pl.ratePercent}%/bln${pl.admin > 0 ? ' · admin ' + formatRp(pl.admin) : ''} · total ${formatRp(pl.total)}</div>
              <div class="txn-meta">${escapeHtml(jadwal)}</div>
              ${sc ? `<div class="acc-bar u-mt6"><div class="acc-bar-fill" style="width:${pct}%; background:var(--amber);"></div></div>` : ''}
            </div></div>
          </div>`;
      }).join('');
    } else {
      plansWrap.style.display = 'none';
    }

    const monthlyWrap = $('acc-detail-monthly');
    const monthlyGroups = acc.type === 'paylater' ? paylaterMonthlyBreakdown(data, acc, bal) : [];
    if (monthlyGroups.length > 0) {
      monthlyWrap.style.display = 'block';
      $('acc-detail-monthly-list').innerHTML = monthlyGroups.map((g, idx) => `
        <div class="txn-row clickable" data-act="openPaylaterMonthDetail" data-a0="${acc.id}" data-n1="${idx}">
          <div class="txn-left"><div class="txn-text">
            <div class="txn-desc">${escapeHtml(fmtBulanTahun(g.due))}</div>
            <div class="txn-meta">Jatuh tempo ${formatDayLabel(g.due)} · ${g.items.length} item</div>
            <div class="txn-meta" style="color:var(--ink-soft);">${g.items.map(it => escapeHtml(it.desc) + (it.no != null ? ' (ke-' + it.no + '/' + it.tenor + ')' : '')).join(', ')}</div>
          </div></div>
          <div class="txn-right"><span class="txn-amount">${formatRp(g.total)}</span></div>
        </div>`).join('');
    } else {
      monthlyWrap.style.display = 'none';
    }

    const accById = {};
    data.accounts.forEach(a => accById[a.id] = a);
    const related = data.txns.filter(t => t.accountId === id || t.toAccountId === id || t.loanId === id);
    const indexed = related.map((t, i) => ({ t, i }));
    indexed.sort((a, b) => a.t.date !== b.t.date ? b.t.date.localeCompare(a.t.date) : b.i - a.i);

    const histEl = $('acc-detail-history');
    if (indexed.length === 0) {
      histEl.innerHTML = '<div class="empty">Belum ada transaksi.</div>';
    } else {
      histEl.innerHTML = indexed.map(({ t }) => {
        let metaText, descText, sign;
        if (t.type === 'transfer') {
          const otherId = t.accountId === id ? t.toAccountId : t.accountId;
          const otherName = accById[otherId] ? accById[otherId].name : '?';
          const increases = t.toAccountId === id;
          descText = (t.desc && t.desc !== 'Transfer') ? t.desc : 'Transfer';
          metaText = (increases ? 'dari ' : 'ke ') + otherName;
          sign = increases ? '+' : '−';
        } else if (t.loanId === id && t.accountId !== id) {
          // Pembayaran bunga pinjaman: uang keluar dari akun sumber, tidak mengubah sisa pokok.
          const srcName = accById[t.accountId] ? accById[t.accountId].name : '?';
          descText = t.desc;
          metaText = 'Bunga, dibayar dari ' + srcName + ' (pokok tidak berubah)';
          sign = '';
        } else {
          descText = t.desc;
          metaText = t.category || '';
          if (t.planId) metaText += (metaText ? ' · ' : '') + 'Cicilan'; else if (t.method === 'nanti') metaText += (metaText ? ' · ' : '') + 'Bayar nanti';
          sign = t.type === 'masuk' ? '+' : '−';
        }
        metaText += (metaText ? ' · ' : '') + formatDayLabel(t.date);
        return `
          <div class="txn-row clickable" data-act="openTxnDetail" data-a0="${t.id}">
            <div class="txn-left">
              <span class="dot ${t.type}"></span>
              <div class="txn-text">
                <div class="txn-desc">${escapeHtml(descText)}</div>
                <div class="txn-meta">${escapeHtml(metaText)}</div>
              </div>
            </div>
            <div class="txn-right">
              <span class="txn-amount ${t.type}">${sign} ${formatRp(t.amount)}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    $('acc-detail').classList.add('open');
  }

  function closeAccountDetail() {
    $('acc-detail').classList.remove('open');
    detailAccountId = null;
  }
