  // ============================================================
  // RIWAYAT PERUBAHAN (v1.1.058): tombol "?" di tab Profil membuka sheet ini.
  // Isinya ringkasan versi terbaru saja; riwayat lengkap ada di CHANGELOG.md.
  // Tiap rilis: tambahkan entri paling atas di CHANGELOG_ENTRIES (samakan dengan APP_VERSION).
  // Tampilan di app hanya memuat entri TERBARU untuk tiap tanggal (changelogLatestPerDate): kalau satu hari ada beberapa
  // rilis, yang tampil hanya yang paling baru. Jadi tulis entri terbaru itu sudah mencakup hal penting hari itu.
  // Tulis dengan bahasa awam untuk pengguna akhir: apa yang berubah bagi mereka, tanpa nama file, fungsi, atau istilah teknis.
  // ============================================================
  const CHANGELOG_ENTRIES = [
    { v: 'v1.1.067', d: '29 Sep 2026', items: [
      'Di detail akun kas, bank, dan e-wallet ada bagian "Cocokkan saldo": isi saldo asli, lihat selisihnya dengan saldo di app, lalu catat sebagai penyesuaian kalau perlu',
      'Penyesuaian saldo tidak dihitung sebagai pemasukan atau pengeluaran di Ringkasan, grafik, anggaran, maupun Laporan',
      'Di tab Tagihan ada tombol "Ekspor ke kalender (.ics)" untuk memasukkan tagihan ke Google Calendar atau Kalender di HP'] },
    { v: 'v1.1.066', d: '29 Sep 2026', items: [
      'Di tab Tagihan ada tombol "Ekspor ke kalender (.ics)": semua tagihan 12 bulan ke depan bisa dimasukkan ke Google Calendar atau Kalender di HP, lengkap dengan pengingat sehari sebelum jatuh tempo'] },
    { v: 'v1.1.065', d: '29 Sep 2026', items: [
      'Pinjaman kini bisa diisi denda telat (persen per hari) dan batas maksimalnya; app menampilkan perkiraan denda untuk angsuran yang telat, di detail akun dan di Laporan',
      'Ini hanya perkiraan dan tidak mengubah saldo; catat sebagai pengeluaran kalau denda benar-benar ditagih'] },
    { v: 'v1.1.064', d: '29 Sep 2026', items: [
      'Grafik baru "Tren total utang" di Ringkasan: lihat total utang kartu kredit, PayLater, dan pinjaman di akhir tiap bulan, beserta naik atau turunnya dibanding bulan lalu',
      'Grafik bisa disembunyikan lewat Profil, dan tidak muncul kalau kamu belum punya akun utang'] },
    { v: 'v1.1.063', d: '29 Sep 2026', items: [
      'Tombol tampilan terang/gelap/otomatis kembali ke bagian atas, di samping ikon Profil; ikonnya berubah sesuai mode yang dipilih'] },
    { v: 'v1.1.062', d: '29 Sep 2026', items: [
      'Riwayat perubahan kini hanya menampilkan pembaruan terbaru untuk tiap tanggal'] },
    { v: 'v1.1.061', d: '29 Sep 2026', items: [
      'Nomor versi di halaman Profil kini hanya tampil sekali, di kartu paling atas'] },
    { v: 'v1.1.060', d: '29 Sep 2026', items: [
      'Riwayat perubahan ini ditulis ulang dengan bahasa yang lebih mudah dipahami'] },
    { v: 'v1.1.059', d: '29 Sep 2026', items: [
      'Kartu baru "Dana darurat" di Ringkasan: atur target berapa bulan pengeluaran yang ingin kamu cadangkan, lalu pantau progres dan kekurangannya',
      'Kartu bisa disembunyikan lewat Profil, dan target ikut tersimpan di cadangan serta tersinkron ke perangkat lain'] },
    { v: 'v1.1.058', d: '29 Sep 2026', items: [
      'Tombol ? di halaman Profil untuk melihat riwayat perubahan',
      'Halaman Profil dirapikan; tekan Enter untuk menyimpan nama, mengubah email, atau mengubah password'] },
    { v: 'v1.1.057', d: '29 Sep 2026', items: [
      'Fitur baru "Langganan berulang": tagihan rutin seperti Netflix atau internet dicatat otomatis tiap bulan pada tanggalnya',
      'Tidak akan tercatat dobel walau app dibuka di dua perangkat; langganan bisa dijeda atau dihapus kapan saja'] },
    { v: 'v1.1.056', d: '29 Sep 2026', items: [
      'Fitur baru "Anggaran": tentukan batas pengeluaran bulanan per kategori',
      'Bar menunjukkan pemakaian, berubah kuning saat mencapai 80% dan merah saat melewati batas'] },
    { v: 'v1.1.055', d: '29 Sep 2026', items: [
      'Aplikasi sedikit lebih cepat saat menampilkan data',
      'Tombol hapus di daftar transaksi lebih andal'] },
    { v: 'v1.1.054', d: '29 Sep 2026', items: [
      'Perbaikan: transaksi pada data contoh kini bisa dibuka detailnya',
      'Tombol dan jendela lebih konsisten saat diketuk'] }
  ];

  // Fungsi murni: entri diasumsikan urut terbaru dulu; ambil yang pertama untuk tiap tanggal.
  function changelogLatestPerDate(entries) {
    const seen = new Set();
    return entries.filter(e => { if (seen.has(e.d)) return false; seen.add(e.d); return true; });
  }

  function renderChangelogList() {
    const el = $('changelog-list');
    if (!el) return;
    el.innerHTML = changelogLatestPerDate(CHANGELOG_ENTRIES).map((e, i) => `<div class="cl-entry">
        <div class="cl-head"><b>${escapeHtml(e.v)}</b>${i === 0 ? '<span class="cl-badge">Terbaru</span>' : ''}<span class="acc-sub">${escapeHtml(e.d)}</span></div>
        <ul class="cl-list">${e.items.map(t => '<li>' + escapeHtml(t) + '</li>').join('')}</ul></div>`).join('');
  }
  function openChangelog() {
    renderChangelogList();
    const s = $('changelog-sheet');
    if (s) { s.classList.add('open'); const p = s.querySelector('.sheet-panel'); if (p) p.scrollTop = 0; }
  }
  function closeChangelog() { const s = $('changelog-sheet'); if (s) s.classList.remove('open'); }
