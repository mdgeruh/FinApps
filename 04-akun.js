  // ============================================================
  // AKUN: REKENING / KAS / KARTU (form, detail, CRUD)
  // ============================================================
  function toggleAccForm() {
    const form = $('acc-form');
    if (form.classList.contains('open') && !editingAccountId) {
      form.classList.remove('open');
    } else {
      openAccForm('add');
    }
  }

  function startEditAccount(id) {
    const data = loadData();
    const acc = data.accounts.find(a => a.id === id);
    if (!acc) return;
    // Form edit akun berada di dalam tab Akun. Kalau detail akun dibuka dari tab lain (mis. dari kartu
    // "Jatuh tempo" di Ringkasan), pindah ke tab Akun dulu supaya form-nya benar-benar terlihat.
    if (currentTabName() !== 'akun') setTab('akun');
    openAccForm('edit', acc);
  }

  function openAccForm(mode, acc) {
    const form = $('acc-form');
    const nameEl = $('acc-name-input');
    const typeEl = $('acc-type-input');
    const balEl = $('acc-balance-input');
    const limitEl = $('acc-limit-input');
    const feeAmountEl = $('acc-fee-amount-input');
    const feeDayEl = $('acc-fee-day-input');
    const interestEl = $('acc-interest-input');
    const loanTypeEl = $('acc-loan-type-input');
    const loanRateEl = $('acc-loan-rate-input');
    const loanRateUnitEl = $('acc-loan-rate-unit-input');
    const loanAdminEl = $('acc-loan-admin-input');
    const loanStampEl = $('acc-loan-stamp-input');
    const loanSavingsEl = $('acc-loan-savings-input');
    const loanInstallmentEl = $('acc-loan-installment-input');
    const loanTenorEl = $('acc-loan-tenor-input');
    const loanOriginalEl = $('acc-loan-original-input');
    const loanStageEl = $('acc-loan-stage-input');
    const loanAdminPctEl = $('acc-loan-admin-pct-input');

    if (mode === 'edit' && acc) {
      editingAccountId = acc.id;
      nameEl.value = acc.name;
      typeEl.value = acc.type;
      updateAccFormFields();
      const isDebt = TYPE_DEBT[acc.type];
      const isLoan = TYPE_LOAN[acc.type];
      loanInstallmentManual = !!(isLoan && acc.loanInstallment);
      balEl.value = isDebt ? Math.abs(acc.initialBalance) : acc.initialBalance;
      limitEl.value = isDebt ? (acc.limit || '') : '';
      feeAmountEl.value = isDebt ? (acc.feeAmount || '') : '';
      feeDayEl.value = isDebt ? (acc.feeDay || '') : '';
      interestEl.value = isDebt ? (acc.interestPercent || '') : '';
      $('acc-asset-kind-input').value = acc.type === 'aset' && acc.assetKind && Array.from($('acc-asset-kind-input').options).some(o => o.value === acc.assetKind) ? acc.assetKind : 'Lainnya';
      $('acc-asset-qty-input').value = acc.type === 'aset' ? (acc.assetQty || '') : '';
      $('acc-asset-unit-input').value = acc.type === 'aset' ? (acc.assetUnit || '') : '';
      $('acc-card-stmt-input').value = acc.type === 'kartu_kredit' ? (acc.cardStatementDay || '') : '';
      $('acc-card-min-input').value = acc.type === 'kartu_kredit' ? (acc.cardMinValue || '') : '';
      $('acc-card-min-type-input').value = acc.cardMinType === 'nominal' ? 'nominal' : 'percent';
      $('acc-fee-type-input').value = acc.feeType || 'nominal';
      $('acc-fee-period-input').value = acc.feePeriod || 'bulanan';
      updateFeeAmountLabel();
      loanTypeEl.value = isLoan ? (acc.loanInterestType || 'tetap') : 'tetap';
      loanRateEl.value = isLoan ? (acc.loanRatePercent || '') : '';
      loanRateUnitEl.value = isLoan ? (acc.loanRateUnit || 'tahun') : 'tahun';
      loanAdminEl.value = isLoan ? (acc.loanAdminFee || '') : '';
      loanAdminPctEl.value = (acc.type === 'pinjaman_online') ? (adminPctOf(acc) || '') : '';
      $('acc-loan-admin-mode-input').value = acc.loanAdminMode === 'cicil' ? 'cicil' : 'cair';
      $('acc-loan-insurance-input').value = (acc.type === 'pinjaman_online') ? (acc.loanInsurancePercent || '') : '';
      loanStampEl.value = isLoan ? (acc.loanStampFee || '') : '';
      loanSavingsEl.value = isLoan ? (acc.loanMandatorySavings || '') : '';
      loanInstallmentEl.value = isLoan ? (acc.loanInstallment || '') : '';
      loanTenorEl.value = isLoan ? (acc.loanTenorMonths || '') : '';
      loanOriginalEl.value = isLoan ? (acc.originalPrincipal || '') : '';
      $('acc-loan-start-input').value = isLoan ? (acc.loanStartDate || '') : '';
      $('acc-loan-dueday-input').value = isLoan ? (acc.loanDueDay || '') : '';
      loanStageEl.value = 'baru';
      updateOnlineLoanEstimate();
      $('acc-form-title').textContent = 'Edit akun';
      $('acc-submit-btn').textContent = 'Simpan perubahan';
      $('acc-cancel-btn').style.display = 'block';
    } else {
      editingAccountId = null;
      loanInstallmentManual = false; accFormPrevType = '';
      loanAdminPctEl.value = '';
      $('acc-loan-admin-mode-input').value = 'cair'; $('acc-loan-insurance-input').value = '';
      nameEl.value = ''; balEl.value = ''; limitEl.value = '';
      feeAmountEl.value = ''; feeDayEl.value = ''; interestEl.value = '';
      $('acc-asset-kind-input').value = 'Emas'; $('acc-asset-qty-input').value = ''; $('acc-asset-unit-input').value = '';
      $('acc-card-stmt-input').value = ''; $('acc-card-min-input').value = ''; $('acc-card-min-type-input').value = 'percent';
      $('acc-fee-type-input').value = 'nominal';
      $('acc-fee-period-input').value = 'bulanan';
      updateFeeAmountLabel();
      loanTypeEl.value = 'tetap'; loanRateEl.value = ''; loanRateUnitEl.value = 'tahun'; loanAdminEl.value = ''; loanStampEl.value = ''; loanSavingsEl.value = ''; loanInstallmentEl.value = ''; loanTenorEl.value = ''; loanOriginalEl.value = ''; loanStageEl.value = 'baru';
      $('acc-loan-start-input').value = ''; $('acc-loan-dueday-input').value = '';
      typeEl.value = 'kas';
      updateAccFormFields();
      $('acc-form-title').textContent = 'Tambah akun';
      $('acc-submit-btn').textContent = 'Simpan akun';
      $('acc-cancel-btn').style.display = 'none';
    }
    form.classList.add('open');
  }

  function cancelAccForm() {
    editingAccountId = null;
    $('acc-form').classList.remove('open');
  }

  // Persen admin pinjol: pakai yang tersimpan; kalau akun lama cuma punya nominal Rp, turunkan dari pokok awal.
  function adminPctOf(acc) {
    if (acc.loanAdminPercent != null) return acc.loanAdminPercent;
    const pokok = Math.abs(acc.originalPrincipal || acc.initialBalance || 0);
    return (acc.loanAdminFee && pokok > 0) ? Math.round(acc.loanAdminFee / pokok * 10000) / 100 : 0;
  }

  function feeAdminMetaText(acc) {
    if (!acc.feeAmount || acc.type === 'paylater') return '';
    const period = acc.feePeriod === 'tahunan' ? 'iuran tahunan' : 'biaya admin/bln';
    const val = acc.feeType === 'percent' ? acc.feeAmount + '%' : formatRp(acc.feeAmount);
    return ' · ' + val + ' ' + period;
  }

  function updateFeeAmountLabel() {
    const type = $('acc-fee-type-input').value;
    const period = $('acc-fee-period-input').value;
    const label = $('acc-fee-amount-label');
    const input = $('acc-fee-amount-input');
    if (!label || !input) return;
    label.textContent = period === 'tahunan' ? 'Iuran tahunan' : 'Biaya admin/bulan';
    if (type === 'percent') {
      input.placeholder = '%, opsional';
      input.step = '0.01';
    } else {
      input.placeholder = 'Rp, opsional';
      input.step = '1';
    }
  }

  function updateAccFormFields() {
    const type = $('acc-type-input').value;
    const isDebt = TYPE_DEBT[type];
    const isLoan = TYPE_LOAN[type];
    const isOnlineLoan = type === 'pinjaman_online';
    const isPaylater = type === 'paylater';
    $('acc-limit-row').style.display = (isDebt && !isLoan) ? 'flex' : 'none';
    $('acc-fee-row').style.display = (isDebt && !isLoan) ? 'flex' : 'none';
    // PayLater: tanggal jatuh tempo baku saja. Bunga & admin dicatat per transaksi cicilan, bukan per akun.
    $('acc-interest-row').style.display = (isDebt && !isLoan && !isPaylater) ? 'flex' : 'none';
    $('acc-card-row').style.display = type === 'kartu_kredit' ? 'flex' : 'none';
    $('acc-asset-row').style.display = type === 'aset' ? 'flex' : 'none';
    $('acc-fee-amount-wrap').style.display = isPaylater ? 'none' : 'block';
    $('acc-fee-day-wrap').style.flex = isPaylater ? '1' : '0 0 110px';
    $('acc-fee-opts-wrap').style.display = isPaylater ? 'none' : 'flex';
    updateFeeAmountLabel();
    const limitLabel = document.querySelector('#acc-limit-row .field-label');
    if (limitLabel) limitLabel.textContent = isPaylater ? 'Limit PayLater' : 'Limit kartu';
    $('acc-loan-row').style.display = isLoan ? 'flex' : 'none';
    // Pinjaman online: bunga selalu flat (tanpa pilihan jenis), tabungan wajib disembunyikan (khas pinjaman bank).
    // Biaya admin diisi dalam persen dari pokok; angsuran dihitung otomatis dari pokok, tenor, dan bunga flat.
    $('acc-loan-type-wrap').style.display = isOnlineLoan ? 'none' : 'block';
    $('acc-loan-rate-label').textContent = isOnlineLoan ? 'Bunga flat' : 'Suku bunga';
    $('acc-loan-rate-input').placeholder = isOnlineLoan ? '%, mis. 2.5' : '%, opsional';
    if (isOnlineLoan && accFormPrevType !== 'pinjaman_online' && !editingAccountId) $('acc-loan-rate-unit-input').value = 'bulan';
    accFormPrevType = type;
    $('acc-loan-savings-wrap').style.display = isOnlineLoan ? 'none' : 'block';
    $('acc-loan-admin-rp-wrap').style.display = isOnlineLoan ? 'none' : 'block';
    $('acc-loan-admin-pct-wrap').style.display = isOnlineLoan ? 'block' : 'none';
    $('acc-loan-admin-label').textContent = 'Biaya admin (sekali)';
    $('acc-loan-online-extra').style.display = isOnlineLoan ? 'flex' : 'none';
    $('acc-loan-installment-label').textContent = 'Angsuran per bulan (otomatis kalau tenor & bunga diisi, bisa diubah)';
    $('acc-loan-installment-input').placeholder = 'Rp, terisi otomatis kalau pokok, tenor & bunga diisi';
    $('acc-loan-tenor-row').style.display = isLoan ? 'block' : 'none';
    $('acc-balance-input').placeholder = isLoan
      ? 'Sisa pokok belum dibayar SEKARANG (Rp), boleh 0'
      : (isDebt ? 'Sudah terpakai saat ini (Rp), boleh 0' : (type === 'aset' ? 'Nilai awal / harga beli (Rp)' : 'Saldo awal (Rp), boleh 0'));
    // Status pinjaman (baru cair vs sudah berjalan) cuma relevan pas BIKIN akun baru — sesudah akun ada,
    // pilihan ini tidak bisa diubah lagi (disbursement cuma sekali di awal), tapi "pokok awal" tetap bisa dikoreksi lewat Edit akun.
    const editing = !!editingAccountId;
    const stageRow = $('acc-loan-stage-row');
    if (stageRow) stageRow.style.display = (isLoan && !editing) ? 'block' : 'none';
    const stageEl = $('acc-loan-stage-input');
    const stage = editing ? 'berjalan' : (stageEl ? stageEl.value : 'baru');
    // Field "pokok awal" ditampilkan kalau: sedang edit akun pinjaman (buat koreksi belakangan),
    // atau saat bikin baru dan user pilih "sudah berjalan" (karena sisa sekarang ≠ pokok awal).
    $('acc-loan-original-row').style.display = (isLoan && (editing || stage === 'berjalan')) ? 'block' : 'none';
    updateLoanDisburseRow();
    updateOnlineLoanEstimate();
  }

  function onLoanStageChange() {
    updateAccFormFields();
  }

  // Baca isian form pinjaman (pinjol maupun bank). Pokok awal = "pokok awal" (kalau barisnya tampil)
  // atau pokok/sisa yang diisi. Admin % dan asuransi cuma dibaca untuk pinjol (baris itu disembunyikan
  // di form pinjaman bank, jadi nilainya tidak berlaku di sana).
  function readOnlineLoanForm() {
    const type = $('acc-type-input').value;
    const isOnlineLoan = type === 'pinjaman_online';
    const balVal = Math.abs(parseFloat($('acc-balance-input').value) || 0);
    const origVisible = $('acc-loan-original-row').style.display !== 'none';
    const origVal = origVisible ? Math.abs(parseFloat($('acc-loan-original-input').value) || 0) : 0;
    const rate = Math.max(0, parseFloat($('acc-loan-rate-input').value) || 0);
    const ratePerBulan = $('acc-loan-rate-unit-input').value === 'tahun' ? rate / 12 : rate; // dalam persen
    return {
      pokok: origVal > 0 ? origVal : balVal,
      rate: rate,
      ratePerBulan: ratePerBulan,
      tenor: Math.max(0, Math.round(parseFloat($('acc-loan-tenor-input').value) || 0)),
      adminPct: isOnlineLoan ? Math.max(0, parseFloat($('acc-loan-admin-pct-input').value) || 0) : 0,
      adminMode: $('acc-loan-admin-mode-input').value === 'cicil' ? 'cicil' : 'cair',
      insPct: isOnlineLoan ? Math.max(0, parseFloat($('acc-loan-insurance-input').value) || 0) : 0,
      // Menurun (anuitas) cuma dipilih lewat dropdown "Jenis bunga" di pinjaman bank; pinjol selalu flat.
      declining: !isOnlineLoan && $('acc-loan-type-input').value === 'menurun'
    };
  }

  // Bunga flat: angsuran = pokok/tenor + pokok x bunga per bulan.
  // Angsuran = pokok/tenor + bunga flat + asuransi bulanan + (admin/tenor kalau admin dicicil).
  function computeOnlineInstallment(pokok, tenor, ratePerBulanPct, insPct, adminCicilPct) {
    return Math.round(pokok / tenor + pokok * ratePerBulanPct / 100 + pokok * (insPct || 0) / 100 + (adminCicilPct > 0 ? pokok * adminCicilPct / 100 / tenor : 0));
  }

  function onInstallmentManualInput() {
    loanInstallmentManual = ($('acc-loan-installment-input').value !== '');
    updateOnlineLoanEstimate();
  }

  function resetInstallmentAuto() {
    loanInstallmentManual = false;
    updateOnlineLoanEstimate();
  }

  // Form pinjol: hitung otomatis biaya admin (Rp dari %) dan angsuran (flat), plus estimasi bunga efektif kalau
  // bunga tidak diisi. Angsuran tersimpan di akun; bunga flat dipakai saat catat angsuran (bunga dipisah dari pokok).
  function updateOnlineLoanEstimate() {
    const hint = $('acc-loan-tenor-hint');
    if (!hint) return;
    const type = $('acc-type-input').value;
    const adminHint = $('acc-loan-admin-hint');
    const instHint = $('acc-loan-installment-hint');
    const autoBtn = $('acc-loan-installment-auto-btn');
    if (!TYPE_LOAN[type]) {
      hint.textContent = ''; adminHint.style.display = 'none'; adminHint.textContent = '';
      instHint.textContent = ''; autoBtn.style.display = 'none';
      return;
    }
    const f = readOnlineLoanForm();
    const instEl = $('acc-loan-installment-input');

    // Biaya admin: persen -> Rupiah (cuma ada di form pinjol; f.adminPct selalu 0 untuk pinjaman bank)
    if (f.adminPct > 0 && f.pokok > 0) {
      adminHint.textContent = 'Biaya admin ' + f.adminPct + '% = ' + formatRp(Math.round(f.pokok * f.adminPct / 100)) +
        (f.adminMode === 'cicil' ? ', dibagi rata ke ' + (f.tenor > 0 ? f.tenor + ' angsuran' : 'tiap angsuran (isi tenor)') + '.' : ', dipotong dari pencairan.');
      adminHint.style.display = 'block';
    } else if (f.adminPct > 0) {
      adminHint.textContent = 'Isi pokok pinjaman untuk melihat nominal biaya admin.';
      adminHint.style.display = 'block';
    } else {
      adminHint.textContent = ''; adminHint.style.display = 'none';
    }

    // Angsuran otomatis: anuitas (PMT) untuk bunga menurun, atau pokok rata + bunga flat untuk bunga tetap.
    const canAuto = f.pokok > 0 && f.tenor > 0 && f.ratePerBulan > 0;
    const adminCicilPct = f.adminMode === 'cicil' ? f.adminPct : 0;
    const autoVal = canAuto
      ? (f.declining ? loanAnnuityPMT(f.pokok, f.ratePerBulan, f.tenor) : computeOnlineInstallment(f.pokok, f.tenor, f.ratePerBulan, f.insPct, adminCicilPct))
      : 0;
    if (!loanInstallmentManual) instEl.value = canAuto ? autoVal : '';
    const curVal = Math.round(parseFloat(instEl.value) || 0);
    if (canAuto) {
      let txt;
      if (f.declining) {
        const bunga1 = Math.round(f.pokok * f.ratePerBulan / 100);
        const pokok1 = Math.max(0, autoVal - bunga1);
        const total = autoVal * f.tenor;
        txt = 'Anuitas: angsuran tetap ' + formatRp(autoVal) + '/bulan selama ' + f.tenor + ' bulan. Bulan pertama: pokok ' + formatRp(pokok1) + ' + bunga ' + formatRp(bunga1) +
          '. Porsi bunga mengecil & porsi pokok membesar tiap bulan seiring sisa pokok berkurang. Total bayar ' + formatRp(total) + ' (bunga ' + formatRp(total - f.pokok) + ').';
      } else {
        const bungaBulan = Math.round(f.pokok * f.ratePerBulan / 100);
        const asuransiBulan = Math.round(f.pokok * f.insPct / 100);
        const adminBulan = adminCicilPct > 0 ? Math.round(f.pokok * adminCicilPct / 100 / f.tenor) : 0;
        const pokokBulan = Math.round(f.pokok / f.tenor);
        const total = autoVal * f.tenor;
        txt = 'Hitungan: pokok ' + formatRp(pokokBulan) + ' + bunga ' + formatRp(bungaBulan) +
          (adminBulan > 0 ? ' + admin ' + formatRp(adminBulan) : '') + (asuransiBulan > 0 ? ' + asuransi ' + formatRp(asuransiBulan) : '') +
          ' per bulan = ' + formatRp(autoVal) + '. Total bayar ' + formatRp(total) + ' (bunga & biaya ' + formatRp(total - f.pokok) + ').';
      }
      if (loanInstallmentManual && curVal !== autoVal) txt = 'Diisi manual ' + formatRp(curVal) + '. ' + txt;
      instHint.textContent = txt;
      autoBtn.style.display = (loanInstallmentManual && curVal !== autoVal) ? 'block' : 'none';
    } else {
      instHint.textContent = f.declining
        ? 'Isi pokok, tenor & suku bunga supaya angsuran (anuitas) terhitung otomatis. Atau isi angsuran langsung.'
        : 'Isi pokok, tenor, dan suku bunga supaya angsuran terhitung otomatis. Atau isi angsuran langsung.';
      autoBtn.style.display = 'none';
    }

    // Estimasi bunga efektif hanya bila bunga tidak diisi (angsuran manual) dan bukan anuitas — anuitas
    // sudah pasti bunganya dari suku bunga yang diisi, tidak perlu ditaksir. Info saja.
    if (canAuto || f.declining) { hint.textContent = ''; return; }
    if (f.pokok <= 0 || curVal <= 0 || f.tenor <= 0) { hint.textContent = ''; return; }
    const totalBayar = curVal * f.tenor;
    const bungaEfektifTotal = totalBayar - f.pokok;
    if (bungaEfektifTotal <= 0) { hint.textContent = 'Total angsuran (' + formatRp(totalBayar) + ') tidak lebih besar dari pokok — cek lagi angkanya.'; return; }
    const bungaPerBulan = bungaEfektifTotal / f.tenor;
    const persenPerBulan = (bungaPerBulan / f.pokok) * 100;
    hint.textContent = 'Estimasi: total bayar ' + formatRp(totalBayar) + ', bunga efektif ' + formatRp(bungaEfektifTotal) +
      ' (≈' + formatRp(Math.round(bungaPerBulan)) + '/bulan, ≈' + persenPerBulan.toFixed(1) + '%/bulan dari pokok). Info saja: tanpa bunga flat di atas, semua angsuran mengurangi sisa pinjaman.';
  }

  // Baris "catat pencairan": cuma relevan saat BIKIN akun pinjaman baru YANG BARU DICAIRKAN
  // (bukan edit akun lama, dan bukan pinjaman yang sudah berjalan/sudah dipakai sebagian —
  // buat kasus itu duitnya sudah lama cair & sudah kepakai, jadi tidak ada apa-apa yang perlu
  // dicatat masuk ke akun manapun sekarang).
  function updateLoanDisburseRow() {
    const row = $('acc-loan-disburse-row');
    if (!row) return;
    const type = $('acc-type-input').value;
    const isLoan = TYPE_LOAN[type];
    const stageEl = $('acc-loan-stage-input');
    const stage = stageEl ? stageEl.value : 'baru';
    const show = isLoan && !editingAccountId && stage === 'baru';
    row.style.display = show ? 'block' : 'none';
    if (!show) return;
    const sel = $('acc-loan-disburse-input');
    const data = loadData();
    const options = data.accounts.filter(a => !TYPE_DEBT[a.type] && a.type !== 'titipan');
    sel.innerHTML = '<option value="">— Jangan catat otomatis —</option>' +
      options.map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
  }

  function saveAccount() {
    const nameEl = $('acc-name-input');
    const typeEl = $('acc-type-input');
    const balEl = $('acc-balance-input');
    const limitEl = $('acc-limit-input');
    const feeAmountEl = $('acc-fee-amount-input');
    const feeDayEl = $('acc-fee-day-input');
    const interestEl = $('acc-interest-input');
    const loanTypeEl = $('acc-loan-type-input');
    const loanRateEl = $('acc-loan-rate-input');
    const loanRateUnitEl = $('acc-loan-rate-unit-input');
    const loanAdminEl = $('acc-loan-admin-input');
    const loanStampEl = $('acc-loan-stamp-input');
    const loanSavingsEl = $('acc-loan-savings-input');
    const loanInstallmentEl = $('acc-loan-installment-input');
    const loanTenorEl = $('acc-loan-tenor-input');
    const loanOriginalEl = $('acc-loan-original-input');
    const loanStageEl = $('acc-loan-stage-input');
    const loanDisburseEl = $('acc-loan-disburse-input');
    const name = nameEl.value.trim();
    const type = typeEl.value;
    const isDebt = TYPE_DEBT[type];
    const isLoan = TYPE_LOAN[type];
    const isOnlineLoan = type === 'pinjaman_online';
    const balVal = parseFloat(balEl.value) || 0;
    const limitVal = parseFloat(limitEl.value) || 0;
    const feeAmountVal = type === 'paylater' ? 0 : (parseFloat(feeAmountEl.value) || 0);
    const feeDayVal = Math.min(31, Math.max(0, parseInt(feeDayEl.value, 10) || 0));
    const feeTypeVal = $('acc-fee-type-input').value === 'percent' ? 'percent' : 'nominal';
    const feePeriodVal = $('acc-fee-period-input').value === 'tahunan' ? 'tahunan' : 'bulanan';
    const cardStmtVal = type === 'kartu_kredit' ? Math.min(31, Math.max(0, parseInt($('acc-card-stmt-input').value, 10) || 0)) : 0;
    const cardMinValueVal = type === 'kartu_kredit' ? (parseFloat($('acc-card-min-input').value) || 0) : 0;
    const cardMinTypeVal = $('acc-card-min-type-input').value === 'nominal' ? 'nominal' : 'percent';
    const isAsset = type === 'aset';
    const assetKindVal = isAsset ? $('acc-asset-kind-input').value : '';
    const assetQtyVal = isAsset ? Math.max(0, parseFloat($('acc-asset-qty-input').value) || 0) : 0;
    const assetUnitVal = isAsset ? normalizeAssetUnit($('acc-asset-unit-input').value) : '';
    const interestVal = type === 'paylater' ? 0 : Math.max(0, parseFloat(interestEl.value) || 0);
    const loanRateVal = Math.max(0, parseFloat(loanRateEl.value) || 0);
    const loanRateUnitVal = loanRateUnitEl.value === 'bulan' ? 'bulan' : 'tahun';
    const onlineForm = isOnlineLoan ? readOnlineLoanForm() : null;
    const loanAdminPctVal = isOnlineLoan ? onlineForm.adminPct : 0;
    let loanAdminVal = isOnlineLoan ? Math.round(onlineForm.pokok * loanAdminPctVal / 100) : Math.max(0, parseFloat(loanAdminEl.value) || 0);
    const loanAdminModeVal = (isOnlineLoan && onlineForm.adminMode === 'cicil' && loanAdminPctVal > 0) ? 'cicil' : 'cair';
    const loanInsuranceVal = isOnlineLoan ? onlineForm.insPct : 0;
    const loanStampVal = Math.max(0, parseFloat(loanStampEl.value) || 0);
    const loanSavingsVal = isOnlineLoan ? 0 : Math.max(0, parseFloat(loanSavingsEl.value) || 0);
    const loanInstallmentVal = Math.max(0, Math.round(parseFloat(loanInstallmentEl.value) || 0));
    const loanTenorVal = isLoan ? Math.max(0, Math.round(parseFloat(loanTenorEl.value) || 0)) : 0;
    const loanStartRaw = isLoan ? String($('acc-loan-start-input').value || '') : '';
    const loanStartVal = /^\d{4}-\d{2}-\d{2}$/.test(loanStartRaw) ? loanStartRaw : '';
    const loanDueDayVal = isLoan ? Math.min(31, Math.max(0, parseInt($('acc-loan-dueday-input').value, 10) || 0)) : 0;
    // Pokok awal cuma dibaca kalau barisnya tampil (kalau tersembunyi, nilai sisa di kolom itu sudah tidak berlaku).
    const loanOriginalVal = (isLoan && $('acc-loan-original-row').style.display !== 'none') ? Math.max(0, parseFloat(loanOriginalEl.value) || 0) : 0;
    // Stage cuma dibaca saat BIKIN akun baru (baris & selectnya disembunyikan/tidak berlaku pas edit).
    const loanStage = (isLoan && !editingAccountId) ? (loanStageEl.value === 'berjalan' ? 'berjalan' : 'baru') : 'baru';
    const loanDisburseId = (isLoan && !editingAccountId && loanStage === 'baru') ? (loanDisburseEl.value || '') : '';
    if (!name) { nameEl.focus(); return; }
    if (isOnlineLoan && loanInstallmentVal <= 0) { loanInstallmentEl.focus(); showIoMsg('Isi tenor dan bunga flat supaya angsuran terhitung otomatis, atau isi angsuran per bulan langsung.', 'error'); return; }
    const data = loadData();
    if (isOnlineLoan && editingAccountId) {
      // Persen admin tidak diubah -> pertahankan nominal Rp yang sudah tersimpan (hindari geser karena pembulatan / pokok awal kosong).
      const ex = data.accounts.find(a => a.id === editingAccountId);
      if (ex && ex.loanAdminFee && adminPctOf(ex) === loanAdminPctVal) loanAdminVal = ex.loanAdminFee;
    }
    const dup = data.accounts.find(a => a.id !== editingAccountId && a.name.toLowerCase() === name.toLowerCase());
    if (dup) { showIoMsg(`Nama "${dup.name}" sudah dipakai akun lain.`, 'error'); nameEl.focus(); return; }
    if (type === 'kartu_kredit' && cardStmtVal > 0 && feeDayVal <= 0) { feeDayEl.focus(); showIoMsg('Isi tanggal jatuh tempo juga kalau tanggal cetak tagihan diisi.', 'error'); return; }
    if (type === 'kartu_kredit' && cardMinValueVal > 0 && cardMinTypeVal === 'percent' && cardMinValueVal > 100) { $('acc-card-min-input').focus(); showIoMsg('Pembayaran minimum persen tidak boleh lebih dari 100%.', 'error'); return; }
    if (isDebt && !isLoan && limitVal <= 0) { limitEl.focus(); showIoMsg('Isi limit untuk kartu kredit / paylater.', 'error'); return; }
    if (isDebt && !isLoan && interestVal > 0 && feeDayVal <= 0) { feeDayEl.focus(); showIoMsg('Isi tanggal jatuh tempo untuk bisa menghitung bunga bulanan.', 'error'); return; }
    if (loanDisburseId && ((loanAdminModeVal === 'cicil' ? 0 : loanAdminVal) + loanStampVal) > Math.abs(balVal)) {
      loanAdminEl.focus();
      showIoMsg('Total biaya admin + materai tidak boleh lebih besar dari pokok pinjaman.', 'error');
      return;
    }
    if (isLoan && loanOriginalVal > 0 && loanOriginalVal < Math.abs(balVal)) {
      loanOriginalEl.focus();
      showIoMsg('Pokok awal tidak boleh lebih kecil dari sisa pokok sekarang.', 'error');
      return;
    }

    const initialBalance = isDebt ? -Math.abs(balVal) : balVal;

    if (editingAccountId) {
      const acc = data.accounts.find(a => a.id === editingAccountId);
      if (acc) {
        acc.name = name;
        acc.type = type;
        acc.initialBalance = initialBalance;
        delete acc.cardStatementDay; delete acc.cardMinType; delete acc.cardMinValue;
        delete acc.assetKind; delete acc.assetQty; delete acc.assetUnit;
        if (isAsset) {
          if (assetKindVal) acc.assetKind = assetKindVal;
          if (assetQtyVal > 0) acc.assetQty = assetQtyVal;
          if (assetUnitVal) acc.assetUnit = assetUnitVal;
        } else { delete acc.valuations; }
        if (isLoan) {
          delete acc.limit; delete acc.feeAmount; delete acc.feeDay; delete acc.lastFeeAppliedMonth; delete acc.interestPercent; delete acc.feeType; delete acc.feePeriod; delete acc.feeAnniversaryMonth;
          acc.loanInterestType = (!isOnlineLoan && loanTypeEl.value === 'menurun') ? 'menurun' : 'tetap';
          if (loanRateVal > 0) { acc.loanRatePercent = loanRateVal; acc.loanRateUnit = loanRateUnitVal; } else { delete acc.loanRatePercent; delete acc.loanRateUnit; }
          if (loanAdminVal > 0) acc.loanAdminFee = loanAdminVal; else delete acc.loanAdminFee;
          if (isOnlineLoan && loanAdminPctVal > 0) acc.loanAdminPercent = loanAdminPctVal; else delete acc.loanAdminPercent;
          if (loanAdminModeVal === 'cicil') acc.loanAdminMode = 'cicil'; else delete acc.loanAdminMode;
          if (loanInsuranceVal > 0) acc.loanInsurancePercent = loanInsuranceVal; else delete acc.loanInsurancePercent;
          if (loanStampVal > 0) acc.loanStampFee = loanStampVal; else delete acc.loanStampFee;
          if (loanSavingsVal > 0) acc.loanMandatorySavings = loanSavingsVal; else delete acc.loanMandatorySavings;
          if (loanInstallmentVal > 0) acc.loanInstallment = loanInstallmentVal; else delete acc.loanInstallment;
          if (loanTenorVal > 0) acc.loanTenorMonths = loanTenorVal; else delete acc.loanTenorMonths;
          if (loanStartVal) acc.loanStartDate = loanStartVal; else delete acc.loanStartDate;
          if (loanDueDayVal > 0) acc.loanDueDay = loanDueDayVal; else delete acc.loanDueDay;
          if (loanOriginalVal > 0) acc.originalPrincipal = loanOriginalVal; else delete acc.originalPrincipal;
        } else if (isDebt) {
          acc.limit = limitVal;
          if (type === 'kartu_kredit') {
            if (cardStmtVal > 0) acc.cardStatementDay = cardStmtVal;
            if (cardMinValueVal > 0) { acc.cardMinType = cardMinTypeVal; acc.cardMinValue = cardMinValueVal; }
          }
          if (feeDayVal > 0) { acc.feeDay = feeDayVal; } else { delete acc.feeDay; delete acc.lastFeeAppliedMonth; delete acc.feeAnniversaryMonth; }
          if (feeAmountVal > 0 && feeDayVal > 0) {
            acc.feeAmount = feeAmountVal;
            acc.feeType = feeTypeVal;
            if (acc.feePeriod !== feePeriodVal) delete acc.feeAnniversaryMonth; // ganti periode -> hitung ulang titik tahunannya
            acc.feePeriod = feePeriodVal;
          } else { delete acc.feeAmount; delete acc.feeType; delete acc.feePeriod; delete acc.feeAnniversaryMonth; }
          if (interestVal > 0 && feeDayVal > 0) { acc.interestPercent = interestVal; }
          else { delete acc.interestPercent; }
          delete acc.loanInterestType; delete acc.loanRatePercent; delete acc.loanRateUnit; delete acc.loanAdminFee; delete acc.loanAdminPercent; delete acc.loanAdminMode; delete acc.loanInsurancePercent; delete acc.loanStampFee; delete acc.loanMandatorySavings; delete acc.loanInstallment; delete acc.loanTenorMonths; delete acc.originalPrincipal; delete acc.loanStartDate; delete acc.loanDueDay;
        } else {
          delete acc.limit; delete acc.feeAmount; delete acc.feeDay; delete acc.lastFeeAppliedMonth; delete acc.interestPercent; delete acc.feeType; delete acc.feePeriod; delete acc.feeAnniversaryMonth;
          delete acc.loanInterestType; delete acc.loanRatePercent; delete acc.loanRateUnit; delete acc.loanAdminFee; delete acc.loanAdminPercent; delete acc.loanAdminMode; delete acc.loanInsurancePercent; delete acc.loanStampFee; delete acc.loanMandatorySavings; delete acc.loanInstallment; delete acc.loanTenorMonths; delete acc.originalPrincipal; delete acc.loanStartDate; delete acc.loanDueDay;
        }
      }
    } else {
      const acc = { id: generateId('acc'), name, type, initialBalance };
      if (isAsset) {
        if (assetKindVal) acc.assetKind = assetKindVal;
        if (assetQtyVal > 0) acc.assetQty = assetQtyVal;
        if (assetUnitVal) acc.assetUnit = assetUnitVal;
      }
      if (isLoan) {
        acc.loanInterestType = (!isOnlineLoan && loanTypeEl.value === 'menurun') ? 'menurun' : 'tetap';
        if (loanRateVal > 0) { acc.loanRatePercent = loanRateVal; acc.loanRateUnit = loanRateUnitVal; }
        if (loanAdminVal > 0) acc.loanAdminFee = loanAdminVal;
        if (isOnlineLoan && loanAdminPctVal > 0) acc.loanAdminPercent = loanAdminPctVal;
        if (loanAdminModeVal === 'cicil') acc.loanAdminMode = 'cicil';
        if (loanInsuranceVal > 0) acc.loanInsurancePercent = loanInsuranceVal;
        if (loanStampVal > 0) acc.loanStampFee = loanStampVal;
        if (loanSavingsVal > 0) acc.loanMandatorySavings = loanSavingsVal;
        if (loanInstallmentVal > 0) acc.loanInstallment = loanInstallmentVal;
        if (loanTenorVal > 0) acc.loanTenorMonths = loanTenorVal;
        if (loanStartVal) acc.loanStartDate = loanStartVal;
        if (loanDueDayVal > 0) acc.loanDueDay = loanDueDayVal;
        if (loanOriginalVal > 0) acc.originalPrincipal = loanOriginalVal;
      } else if (isDebt) {
        acc.limit = limitVal;
        if (type === 'kartu_kredit') {
          if (cardStmtVal > 0) acc.cardStatementDay = cardStmtVal;
          if (cardMinValueVal > 0) { acc.cardMinType = cardMinTypeVal; acc.cardMinValue = cardMinValueVal; }
        }
        if (feeDayVal > 0) { acc.feeDay = feeDayVal; }
        if (feeAmountVal > 0 && feeDayVal > 0) { acc.feeAmount = feeAmountVal; acc.feeType = feeTypeVal; acc.feePeriod = feePeriodVal; }
        if (interestVal > 0 && feeDayVal > 0) { acc.interestPercent = interestVal; }
      }
      data.accounts.push(acc);

      // Catat pencairan pinjaman: pokok penuh masuk ke akun tujuan, lalu biaya admin + materai
      // langsung keluar dari akun yang sama — jadi saldo bersih yang kamu terima sudah otomatis
      // terpotong, dan kedua biaya itu ikut kehitung sebagai pengeluaran di laporan (bukan cuma info mati).
      if (isLoan && loanDisburseId) {
        const destAcc = data.accounts.find(a => a.id === loanDisburseId);
        const pokok = Math.abs(balVal);
        if (destAcc && pokok > 0) {
          const today = todayStr();
          data.txns.push({
            id: generateId('txn'), date: today, type: 'masuk',
            desc: 'Pencairan pinjaman ' + name, amount: pokok, accountId: destAcc.id, loanId: acc.id
          });
          // Kategori sengaja dibedakan dari 'Bunga & biaya bank' (dipakai computeLoanInterestDue untuk
          // menghitung bunga bulanan yang sudah dibayar) supaya biaya admin/materai di awal ini TIDAK
          // ketukar/keitung sebagai bunga sudah dibayar bulan ini.
          if (loanAdminVal > 0 && loanAdminModeVal !== 'cicil') {
            data.txns.push({
              id: generateId('txn'), date: today, type: 'keluar',
              desc: 'Biaya admin/provisi ' + name, amount: loanAdminVal, accountId: destAcc.id,
              category: 'Biaya admin & materai pinjaman', loanId: acc.id
            });
          }
          if (loanStampVal > 0) {
            data.txns.push({
              id: generateId('txn'), date: today, type: 'keluar',
              desc: 'Biaya materai ' + name, amount: loanStampVal, accountId: destAcc.id,
              category: 'Biaya admin & materai pinjaman', loanId: acc.id
            });
          }
        }
      }
    }

    saveData(data);
    editingAccountId = null;
    $('acc-form').classList.remove('open');
    runRecurringFees();   // akun baru/diubah bisa langsung kena bunga/biaya bulan ini
    render();
  }

  async function deleteAccount(id) {
    const data = loadData();
    const acc = data.accounts.find(a => a.id === id);
    if (!acc) return;
    const relatedCount = data.txns.filter(t => t.accountId === id || t.toAccountId === id || t.loanId === id).length;

    // Akun titipan/piutang: hapus beserta riwayat transaksinya (konsisten dengan tab Titipan).
    if (acc.type === 'titipan') {
      const msg = relatedCount > 0
        ? `Hapus "${acc.name}" beserta ${relatedCount} riwayat titipannya? Tindakan ini tidak bisa dibatalkan.`
        : `Hapus "${acc.name}"?`;
      const ok = await showConfirm(msg);
      if (!ok) return;
      data.txns = data.txns.filter(t => t.accountId !== id && t.toAccountId !== id);
      data.accounts = data.accounts.filter(a => a.id !== id);
      saveData(data);
      render();
      return;
    }

    // Akun keuangan biasa: jangan sampai riwayat transaksi asli ikut terhapus tanpa sadar.
    if (relatedCount > 0) { showIoMsg(`Akun ini masih punya ${relatedCount} transaksi, hapus transaksinya dulu.`, 'error'); return; }
    if (data.accounts.length <= 1) { showIoMsg('Minimal harus ada satu akun.', 'error'); return; }
    const ok = await showConfirm(`Hapus akun "${acc.name}"?`);
    if (!ok) return;
    data.accounts = data.accounts.filter(a => a.id !== id);
    saveData(data);
    render();
  }
