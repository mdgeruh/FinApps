  // ============================================================
  // RIWAYAT PERUBAHAN (v1.1.058): tombol "?" di tab Profil membuka sheet ini.
  // Isinya ringkasan versi terbaru saja; riwayat lengkap ada di CHANGELOG.md.
  // Tiap rilis: tambahkan entri paling atas di CHANGELOG_ENTRIES (samakan dengan APP_VERSION).
  // Tampilan di app hanya memuat entri TERBARU untuk tiap tanggal (changelogLatestPerDate): kalau satu hari ada beberapa
  // rilis, yang tampil hanya yang paling baru. Jadi tulis entri terbaru itu sudah mencakup hal penting hari itu.
  // Tulis dengan bahasa awam untuk pengguna akhir: apa yang berubah bagi mereka, tanpa nama file, fungsi, atau istilah teknis.
  // ============================================================
  const CHANGELOG_ENTRIES = [
    { v: 'v1.1.100', d: '2 Okt 2026', items: [
      'Semua kolom tanggal kini memakai kalender bawaan app yang tampilannya senada, bukan kalender bawaan browser. Ada tombol Hari ini, dan tanggal yang belum boleh dipilih (misalnya tanggal di masa depan saat catat pembayaran) tampil redup'] },
    { v: 'v1.1.099', d: '2 Okt 2026', items: [
      'Perapian di balik layar supaya app lebih mudah dirawat. Tampilan dan cara pakai tidak berubah'] },
    { v: 'v1.1.098', d: '2 Okt 2026', items: [
      'Rincian jadwal angsuran pinjaman kini menampilkan bulan yang hanya dibayar bunganya sebagai baris tersendiri, jadi terlihat jelas bulan mana yang bunganya sudah dibayar dan pokoknya digeser'] },
    { v: 'v1.1.097', d: '2 Okt 2026', items: [
      'Di detail akun pinjaman, tombol cepat kini bernama Catat pembayaran dan langsung membawa ke kolom pembayaran (bunga saja, pokok + bunga, atau nominal bebas), bukan membuka form pengeluaran. Pinjaman yang sudah lunas tetap memakai Catat transaksi'] },
    { v: 'v1.1.096', d: '2 Okt 2026', items: [
      'Pinjaman bank: kalau bulan ini kamu hanya membayar bunga, jadwal lanjut ke bulan berikutnya dan sisa pokok tetap. Angsuran pokok tidak lagi dianggap telat, jatuh temponya bergeser sebanyak bulan yang hanya bayar bunga, dan ada catatannya di kartu serta jadwal pinjaman'] },
    { v: 'v1.1.095', d: '2 Okt 2026', items: [
      'Pilihan akun di form tambah langganan kini tampil dengan gaya yang sama seperti pilihan akun di form lain, bukan lagi tampilan bawaan browser'] },
    { v: 'v1.1.094', d: '2 Okt 2026', items: [
      'Form catat titipan, tambah langganan, dan bayar pinjaman kini juga punya judul yang terlihat di atas tiap kolom. Pada titipan, judul akun menyesuaikan mode: Dibayar dari akun saat belanjakan dan Diterima ke akun saat terima bayar'] },
    { v: 'v1.1.093', d: '2 Okt 2026', items: [
      'Form tambah transaksi kini punya judul yang terlihat di atas tiap kolom (Tanggal, Kategori, Keterangan, Akun, Jumlah), tidak lagi hanya tulisan samar di dalam kolom',
      'Judul akun menyesuaikan jenis transaksi: Masuk ke akun untuk pemasukan, Dibayar dari akun untuk pengeluaran, dan Dari akun serta Ke akun untuk transfer, sehingga tidak tertukar. Kolom cicilan PayLater juga berjudul jelas'] },
    { v: 'v1.1.092', d: '2 Okt 2026', items: [
      'Data contoh (tombol Isi data contoh di tab Data) diperluas supaya semua fitur terbaru bisa dicoba: akun Emas 10 gram, Forex cent dengan equity USD dan kurs yang berubah tiap bulan, Motor (nilai menyusut), Kredit Motor bertenor 12 bulan dengan angsuran dan jatuh tempo, Rekening Lama yang sudah diarsipkan, dua langganan, dan anggaran per kategori',
      'Saldo awal Kas dan Gopay pada data contoh dinaikkan supaya tidak jadi minus'] },
    { v: 'v1.1.091', d: '2 Okt 2026', items: [
      'Aset yang punya jumlah dan satuan (misalnya akun forex/cent dengan equity dalam USD, atau emas dalam gram) kini bisa memperbarui jumlahnya sekaligus nilainya. Di Perbarui nilai ada kolom Jumlah sekarang: isi jumlah terbaru dan harga per satuan (kurs), nilai totalnya terhitung otomatis',
      'Jumlah terbaru tampil di kartu dan detail akun, dan riwayat nilai mencatat jumlah serta harga pada tiap tanggal. Aset lama tanpa pembaruan jumlah tidak berubah'] },
    { v: 'v1.1.090', d: '2 Okt 2026', items: [
      'Pemeriksaan otomatis di balik layar diperluas supaya kesalahan seperti tombol tanpa fungsi atau berkas yang lupa dimasukkan ke cache offline cepat ketahuan. Tidak ada perubahan tampilan'] },
    { v: 'v1.1.089', d: '2 Okt 2026', items: [
      'Perbaikan penting impor data: di HP atau komputer dengan zona waktu di timur Greenwich (termasuk WIB, WITA, WIT), tanggal transaksi dari file cadangan salah dibaca sebagai tidak valid, sehingga semua transaksi yang diimpor tercatat bertanggal hari ini. Sekarang tanggalnya dibaca benar di zona waktu mana pun',
      'Nominal transaksi di file impor yang bukan angka kini dibaca sebagai 0, tidak lagi merusak saldo'] },
    { v: 'v1.1.088', d: '2 Okt 2026', items: [
      'Tombol mata (sembunyikan saldo) kini juga berlaku di tab Akun: total aset, utang, kekayaan bersih, pemakaian limit, total tiap kelompok, dan nominal di kartu akun ikut tertutup. Sebelumnya hanya kartu saldo di Ringkasan dan grafik kekayaan yang tertutup'] },
    { v: 'v1.1.087', d: '2 Okt 2026', items: [
      'Form pinjaman: pilihan satuan suku bunga (/thn atau /bln) tidak lagi terpotong di layar HP, dan tulisan contoh "tanpa batas" pada maksimal denda muat penuh',
      'Sudah diperiksa di tema gelap, layar lebar, dan mode atur urutan akun lewat keyboard; tampilan dan tombolnya berfungsi normal'] },
    { v: 'v1.1.086', d: '2 Okt 2026', items: [
      'Form pinjaman lebih pendek: biaya admin, materai, tabungan wajib, dan denda telat kini ada di bagian Lainnya (opsional) yang terlipat. Bagian ini terbuka sendiri kalau sudah ada isinya, untuk pinjaman online, atau kalau ada isian di dalamnya yang perlu diperbaiki',
      'Teks bantuan di form pinjaman diringkas supaya tidak memenuhi layar'] },
    { v: 'v1.1.085', d: '2 Okt 2026', items: [
      'Form tambah/edit akun lebih jelas: kolom Nama akun, Jenis akun, dan Saldo awal kini punya judul yang terlihat, tidak lagi hanya tulisan samar di dalam kolom',
      'Saldo awal dipindah tepat di bawah Jenis akun, jadi tidak perlu menggulir ke bawah dulu. Judulnya menyesuaikan jenis akun (misalnya Sisa pokok sekarang untuk pinjaman, Sudah terpakai saat ini untuk kartu kredit)',
      'Tulisan contoh di dalam kolom dipendekkan supaya tidak terpotong di layar HP'] },
    { v: 'v1.1.084', d: '2 Okt 2026', items: [
      'Perbaikan: pesan kesalahan saat menyimpan akun (misalnya nama sudah dipakai, limit kosong, atau tanggal jatuh tempo belum diisi) sebelumnya tidak terlihat sama sekali. Sekarang pesannya muncul di dalam form, tepat di atas tombol Simpan, dan tetap terlihat walau formnya panjang. Nama akun yang kosong juga diberi pesan',
      'Biaya admin kartu yang diisi tanpa tanggal jatuh tempo, dan batas maksimal denda tanpa persen denda, tidak lagi hilang diam-diam; kamu diminta melengkapinya dulu',
      'Pesan hasil aksi yang tampil di tempat yang sedang tidak terlihat (misalnya "hapus transaksinya dulu" saat menghapus akun, atau galat dari form transaksi) kini muncul sebagai pesan kecil di bagian bawah layar'] },
    { v: 'v1.1.083', d: '2 Okt 2026', items: [
      'Di tab Akun ada tombol Atur urutan. Di mode ini setiap akun punya tombol ▲ ▼ untuk menggeser posisinya di kelompoknya, dan tombol Sematkan supaya akun selalu berada di puncak kelompok (diberi label Disematkan). Ketuk Selesai untuk kembali',
      'Akun yang disematkan tetap di atas akun lain, dan urutan geseranmu dipakai menggantikan urutan otomatis (nilai terbesar). Pengaturan ini tersimpan per perangkat, jadi tidak ikut terkirim ke cloud atau file ekspor'] },
    { v: 'v1.1.082', d: '2 Okt 2026', items: [
      'Di tab Akun ada kotak pencarian dan pilihan filter: Semua, Ada tagihan, Lunas, dan Diarsipkan, masing-masing dengan jumlah akunnya. Pencarian cocok ke nama atau jenis akun (misalnya "bca" atau "kartu kredit")',
      'Kotak pencarian dan filter muncul kalau kamu punya 5 akun atau lebih. Saat memfilter, semua kelompok akun otomatis terbuka, dan tombol Reset filter muncul kalau tidak ada akun yang cocok'] },
    { v: 'v1.1.081', d: '2 Okt 2026', items: [
      'Di tab Ringkasan, kartu Grafik (pilihan jenis dan periode) dan kartu grafiknya kini menjadi satu kartu. Pilih jenis grafik di bagian atas, grafiknya tampil tepat di bawahnya dalam kartu yang sama, jadi tidak perlu lagi menggulir antara dua kartu'] },
    { v: 'v1.1.080', d: '2 Okt 2026', items: [
      'Akun yang sudah tidak dipakai kini bisa diarsipkan, tanpa perlu menghapus semua transaksinya dulu. Buka akunnya lalu pilih Arsipkan akun. Syaratnya saldo Rp0 atau utang sudah lunas, dan tidak ada langganan aktif di akun itu',
      'Akun arsip hilang dari daftar utama dan dari pilihan akun saat mencatat transaksi baru. Ia pindah ke bagian Diarsipkan di bawah daftar akun (terlipat, ketuk untuk membuka). Riwayat transaksi, laporan, dan saldo lama tetap utuh',
      'Akun arsip bisa dipulihkan kapan saja lewat tombol Pulihkan akun di halamannya. Kartu yang diarsipkan tidak lagi dikenai biaya bulanan dan tidak dihitung di Limit kartu terpakai'] },
    { v: 'v1.1.079', d: '2 Okt 2026', items: [
      'Perlindungan keamanan tambahan: app kini membatasi dari mana saja skrip dan sambungan data boleh dimuat (hanya app ini, penyedia pustaka sinkron, font, dan server sinkron). Cara kerja dan tampilan app tidak berubah',
      'Penanda internal di daftar akun, transaksi, dan titipan kini diamankan, jadi data yang aneh dari cloud atau file impor tidak bisa merusak tampilan'] },
    { v: 'v1.1.078', d: '29 Sep 2026', items: [
      'Bagian atas tab Akun kini menampilkan juga Kekayaan bersih (aset dikurangi utang) dan Limit kartu terpakai: total pemakaian semua kartu kredit dan PayLater yang punya limit dibagi total limitnya. Angka limit menjadi merah dengan tanda ▲ kalau sudah 90% ke atas',
      'Tombol Bayar kini ada di kartu PayLater (Bayar tagihan) dan kartu pinjaman (Bayar angsuran), tidak hanya di kartu kredit. Bayar angsuran membuka panel pembayaran dengan nominal angsuran terisi',
      'Di halaman detail akun ada dua tombol cepat: Catat transaksi (akun sudah terpilih) dan Transfer dari sini (akun ini jadi sumber). Tombol yang tidak berlaku disembunyikan: akun utang tidak bisa jadi sumber transfer, aset hanya bisa Transfer, titipan memakai form sendiri'] },
    { v: 'v1.1.077', d: '29 Sep 2026', items: [
      'Kartu di tab Akun kini ringkas: paling banyak dua baris yang paling penting. Kartu kredit menampilkan sisa tagihan cetak dan jatuh temponya, lalu pemakaian limit; pinjaman menampilkan angsuran berikutnya beserta tanggalnya, lalu kemajuan pembayaran; PayLater menampilkan pemakaian limit dan jatuh tempo',
      'Yang telat tampil merah dan diawali tanda ▲ beserta jumlah hari telatnya, jadi tidak hanya dibedakan lewat warna. Limit terpakai 90% ke atas juga diberi ▲ merah',
      'Keterangan lengkap (bunga, biaya, skema kartu, jumlah transaksi) tetap ada di halaman detail akun yang terbuka saat kartu diketuk'] },
    { v: 'v1.1.076', d: '29 Sep 2026', items: [
      'Kartu akun dan halaman detail akun kini memakai satu sumber untuk nilai dan keterangan, jadi angka dan tulisan keduanya tidak akan berbeda lagi. Tampilanmu hampir tidak berubah; ini perapian di balik layar yang jadi dasar perbaikan kartu akun berikutnya'] },
    { v: 'v1.1.075', d: '29 Sep 2026', items: [
      'Angka utang di tab Akun kini konsisten: total di atas, total per kelompok, dan kartu pinjaman semuanya memakai sisa pokok, jadi tidak ada lagi selisih antara header dan kartu',
      'Bunga kontrak pinjaman yang belum jatuh tempo tidak dihitung sebagai utang saat ini; ia tampil sebagai keterangan \"+ bunga terjadwal\" di kartu, dan di detail akun ada total sampai lunas. Tulisan \"Sisa hutang\" pada kartu pinjaman berubah menjadi \"Sisa pokok\"',
      'Di tab Laporan, total utang tetap menyertakan bunga terjadwal (seperti total sisa pinjaman di bank) dan kini diberi label yang jelas'] },
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
