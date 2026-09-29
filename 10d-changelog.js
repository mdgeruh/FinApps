  // ============================================================
  // RIWAYAT PERUBAHAN (v1.1.058): tombol "?" di tab Profil membuka sheet ini.
  // Isinya ringkasan versi terbaru saja; riwayat lengkap ada di CHANGELOG.md.
  // Tiap rilis: tambahkan entri paling atas di CHANGELOG_ENTRIES (samakan dengan APP_VERSION).
  // Tampilan di app hanya memuat entri TERBARU untuk tiap tanggal (changelogLatestPerDate): kalau satu hari ada beberapa
  // rilis, yang tampil hanya yang paling baru. Jadi tulis entri terbaru itu sudah mencakup hal penting hari itu.
  // Tulis dengan bahasa awam untuk pengguna akhir: apa yang berubah bagi mereka, tanpa nama file, fungsi, atau istilah teknis.
  // ============================================================
  const CHANGELOG_ENTRIES = [
    { v: 'v1.1.074', d: '29 Sep 2026', items: [
      'Grafik \"Tren total utang\" kini dihitung lebih cepat (hasilnya tetap sama), terutama terasa kalau kamu punya banyak akun utang dan ribuan transaksi'] },
    { v: 'v1.1.073', d: '29 Sep 2026', items: [
      'Kartu "Bulan ini" kini menampilkan Proyeksi akhir bulan: perkiraan total pengeluaran sampai akhir bulan kalau kebiasaan belanjamu sama seperti hari-hari yang sudah lewat',
      'Kalau kamu punya anggaran, di bawahnya tertulis apakah kategori beranggaran diperkirakan melewati batas (▲) atau masih tersisa (▼). Di awal bulan angkanya masih perkiraan kasar, dan proyeksi tidak tampil di hari terakhir bulan'] },
    { v: 'v1.1.072', d: '29 Sep 2026', items: [
      'Grafik kini bisa dibaca pembaca layar: tiap grafik punya deskripsi singkat (judul, rentang, nilai terakhir), dan lingkaran kategori dibacakan beserta persentasenya',
      'Grafik bisa dijelajahi dengan keyboard: fokus ke grafik lalu tekan panah kiri atau kanan untuk berpindah titik, Home dan End untuk ke ujung, Esc untuk menutup',
      'Naik dan turun tidak lagi hanya dibedakan warna: ringkasan grafik dan legenda memakai tanda ▲ dan ▼. Baris kategori di bawah lingkaran juga bisa dibuka dengan keyboard'] },
    { v: 'v1.1.071', d: '29 Sep 2026', items: [
      'Anggaran, Langganan, dan Dana darurat yang belum kamu pakai tidak lagi tampil sebagai kartu kosong yang panjang; diganti satu kartu "Atur rencana keuanganmu" dengan satu baris dan tombol Atur untuk tiap fitur yang belum dipakai',
      'Begitu sebuah fitur diatur, kartunya muncul otomatis dan barisnya hilang dari kartu ajakan; kalau semuanya sudah dipakai, kartu ajakan menghilang sendiri. Kartu ajakan juga bisa disembunyikan lewat Profil'] },
    { v: 'v1.1.070', d: '29 Sep 2026', items: [
      'Rata-rata pengeluaran harian, pengeluaran terbesar, dan beban cicilan & bunga kini menyatu di kartu "Bulan ini", jadi Ringkasan lebih ringkas',
      'Urutan kartu di Ringkasan bisa diatur sendiri: buka Profil > Tampilan Ringkasan lalu pakai tombol naik/turun (▲ ▼). Grafik bergerak sebagai satu kelompok',
      'Anggaran bulan ini dan Langganan berulang kini juga bisa disembunyikan lewat Profil'] },
    { v: 'v1.1.069', d: '29 Sep 2026', items: [
      'Lima grafik di Ringkasan digabung jadi satu kartu "Grafik" dengan pilihan Kekayaan, Cashflow, Kategori, Tren, dan Utang; halaman jadi jauh lebih pendek dan pilihan terakhirmu diingat',
      'Pemilih periode (1H sampai 360H) ikut di kartu ini dan hanya muncul untuk Kekayaan dan Cashflow',
      'Kartu yang kamu sembunyikan atau yang masih kosong tidak lagi dihitung, jadi Ringkasan terbuka lebih ringan'] },
    { v: 'v1.1.068', d: '29 Sep 2026', items: [
      'Di puncak Ringkasan ada kotak "Perlu perhatian" (maksimal 3 baris): tagihan yang telat atau jatuh tempo 7 hari ke depan, anggaran yang hampir habis atau terlampaui, dan dana darurat yang masih kurang. Ketuk barisnya untuk membuka akun atau bagian terkait; kotak hilang sendiri kalau semuanya aman'] },
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
