  // ============================================================
  // PERKIRAAN DENDA KETERLAMBATAN PINJAMAN (v1.1.065)
  // Field opsional di akun pinjaman (bank / online): loanLateFeePercent = % per hari dari angsuran yang telat,
  // loanLateFeeCapPercent = batas total denda per angsuran (% dari angsuran; kosong = tanpa batas).
  // Denda per angsuran telat = angsuran x persen x hari telat (dibatasi cap). Ini PERKIRAAN untuk ditampilkan:
  // tidak mengubah saldo dan tidak membuat transaksi; catat sendiri sebagai pengeluaran kalau memang ditagih.
  // ============================================================
  function sanitizeLateFeePct(v) {
    const n = Number(v);
    return isFinite(n) && n > 0 && n <= 100 ? Math.round(n * 1000) / 1000 : 0;
  }
  function sanitizeLateFeeCap(v) {
    const n = Number(v);
    return isFinite(n) && n > 0 && n <= 1000 ? Math.round(n * 100) / 100 : 0;
  }

  // Fungsi murni. sch = hasil computeLoanSchedule; today = 'YYYY-MM-DD' (opsional, untuk test).
  // null kalau persen denda belum diisi atau jadwal tidak ada.
  function computeLateFees(acc, sch, today) {
    const pct = sanitizeLateFeePct(acc && acc.loanLateFeePercent);
    if (!pct || !sch || !Array.isArray(sch.rows)) return null;
    today = today || todayStr();
    const cap = sanitizeLateFeeCap(acc.loanLateFeeCapPercent);
    const t0 = new Date(today + 'T00:00:00');
    const items = [];
    let total = 0;
    sch.rows.forEach(r => {
      if (r.status !== 'telat') return;
      const days = Math.round((t0 - new Date(r.due + 'T00:00:00')) / 86400000);
      if (days <= 0) return;
      let fee = r.total * pct / 100 * days;
      if (cap > 0) fee = Math.min(fee, r.total * cap / 100);
      fee = roundMoney(fee);
      items.push({ no: r.no, due: r.due, days, fee });
      total += fee;
    });
    return { pct, cap, items, total: roundMoney(total) };
  }

  // Kalimat ringkas untuk ditampilkan di detail akun / laporan (teks biasa, belum di-escape).
  function lateFeeRuleText(lf) {
    return lf.pct + '%/hari dari angsuran' + (lf.cap > 0 ? ', maks ' + lf.cap + '% per angsuran' : '');
  }
