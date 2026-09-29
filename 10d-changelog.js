  // ============================================================
  // RIWAYAT PERUBAHAN (v1.1.058): tombol "?" di tab Profil membuka sheet ini.
  // Isinya ringkasan versi terbaru saja; riwayat lengkap ada di CHANGELOG.md.
  // Tiap rilis: tambahkan entri paling atas di CHANGELOG_ENTRIES (samakan dengan APP_VERSION).
  // ============================================================
  const CHANGELOG_ENTRIES = [
    { v: 'v1.1.058', d: '29 Sep 2026', items: [
      'Tombol ? di tab Profil untuk melihat riwayat perubahan (sheet ini)',
      'Tab Profil dirapikan: baris versi, jarak antarbagian seragam, Enter menyimpan nama / mengubah email / password',
      'Gaya inline di tab Profil diganti kelas CSS'] },
    { v: 'v1.1.057', d: '29 Sep 2026', items: [
      'Langganan berulang: dicatat otomatis tiap bulan pada tanggalnya, aman antar perangkat (ID deterministik)',
      'Ikut ekspor/import, sinkron cloud, dan cadangan otomatis'] },
    { v: 'v1.1.056', d: '29 Sep 2026', items: [
      'Anggaran per kategori: batas bulanan, bar realisasi, peringatan 80% dan 100%'] },
    { v: 'v1.1.055', d: '29 Sep 2026', items: [
      'Handler inline terakhir dipindah ke event delegation',
      'render() memuat data 1x, bukan 4x'] },
    { v: 'v1.1.054', d: '29 Sep 2026', items: [
      'Sisa handler inline dipindah ke event delegation',
      'Perbaikan: baris transaksi data contoh kini membuka detail'] },
    { v: 'v1.1.053', d: '29 Sep 2026', items: [
      '131 handler onclick/oninput/onchange diganti event delegation (data-act)'] },
    { v: 'v1.1.052', d: '29 Sep 2026', items: [
      '119 style inline diganti kelas utilitas u-*; tampilan tidak berubah'] },
    { v: 'v1.1.051', d: '29 Sep 2026', items: [
      '04-akun.js dan 11-laporan.js dipecah masing-masing jadi 3 file; isi identik'] }
  ];

  function renderChangelogList() {
    const el = $('changelog-list');
    if (!el) return;
    el.innerHTML = CHANGELOG_ENTRIES.map((e, i) => `<div class="cl-entry">
        <div class="cl-head"><b>${escapeHtml(e.v)}</b>${i === 0 ? '<span class="cl-badge">Terbaru</span>' : ''}<span class="acc-sub">${escapeHtml(e.d)}</span></div>
        <ul class="cl-list">${e.items.map(t => '<li>' + escapeHtml(t) + '</li>').join('')}</ul></div>`).join('');
  }
  function openChangelog() {
    renderChangelogList();
    const s = $('changelog-sheet');
    if (s) { s.classList.add('open'); const p = s.querySelector('.sheet-panel'); if (p) p.scrollTop = 0; }
  }
  function closeChangelog() { const s = $('changelog-sheet'); if (s) s.classList.remove('open'); }
