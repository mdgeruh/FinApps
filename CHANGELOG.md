# Changelog

Riwayat perubahan **Keuangan Pribadi**, yang terbaru di atas. Nomor versi mengikuti `APP_VERSION` (footer app di tab Profil).

- **v1.1.059 ke atas:** dicatat lengkap di bawah.
- **v1.1.058 ke bawah:** ringkasan satu baris per perubahan di bagian "Ringkasan versi lama". Teks lengkapnya (plus riwayat sebelum penomoran, v1.0–v1.2) ada di [CHANGELOG-ARSIP.md](CHANGELOG-ARSIP.md).
- Ringkasan bahasa awam untuk pengguna ada di tombol `?` (tab Profil), bersumber dari `10d-changelog.js`.

## v1.1.136 — 13 Okt 2026

**Cetak / PDF laporan: perataan tepi dan elemen layar yang ikut tercetak** (`style.css`, `11b-laporan-utang.js`)
- Ditemukan dengan membuat PDF A4 dari tab Laporan (Chromium, media cetak, data sintetis 120–260 transaksi, periode bulanan dan 3 bulan, ada akun utang) lalu mengukur tepi tiap blok: kepala laporan mulai di x=0, tetapi ringkasan, daftar kategori, dan seluruh kartu analisis menjorok **12 px** di kiri-kanan. Akibatnya garis pemisah ringkasan lebih lebar daripada teksnya dan angka di baris kedua ringkasan tidak lurus dengan judulnya.
- Penyebab 1: `#tab-laporan .chart-card { padding: 12px 12px 8px }` (aturan layar, spesifisitas id) mengalahkan `.chart-card { padding: 0 }` di blok cetak. Perbaikan: `#tab-laporan .chart-card { padding: 0 }` di blok cetak.
- Penyebab 2: `.cat-list` dasar (`padding: 4px 12px`) ditulis **setelah** blok `@media print`, jadi menang walau spesifisitasnya sama. Perbaikan: `.laporan-cats .cat-list { padding: 0 }` di blok cetak.
- Tanda panah buka-tutup (`.adv-chev`) dan tombol "Tampilkan N lagi" (kelas baru `.adv-more-toggle` di `11b-laporan-utang.js`, 2 tempat) disembunyikan saat cetak, karena isi lipat sudah dibuka otomatis lewat `beforeprint`.
- Setelah perbaikan: kepala, ringkasan, daftar kategori, dan kartu analisis semuanya x=0..lebar penuh (diukur di lebar 703 px = isi A4); PDF dengan 4 akun utang 4 halaman, tanpa panah. Tampilan layar tidak berubah.
- 1 test baru (274 total).

## v1.1.135 — 12 Okt 2026

**Lanjutan perapian desktop: jaring pengaman untuk teks terpotong** (`12-render-utama.js`, `10-render-beranda.js`)
- Diperiksa ulang D1–D11 di 1280/1440/1920 px dengan data sintetis yang lebih padat (10 akun campuran, >30 transaksi) — semua tahap sebelumnya masih utuh, tidak ada regresi.
- Temuan: kolom **Kategori** di tabel Transaksi desktop (lebar tetap 130 px di 1280–1599 px) memotong nama kategori yang lebih panjang dari ~16 karakter (mis. "Biaya admin & materai pinjaman", "Tagihan & langganan") tanpa cara melihat teks penuhnya. Melebarkan kolom itu dicoba tapi malah mempersempit kolom **Keterangan** yang sudah pas-pasan di 1280 px — jadi dibatalkan.
- Perbaikan yang dipakai: tambahkan atribut `title` (tooltip bawaan browser) ke `.tc-cat`, `.tc-acc`, dan `.txn-desc` di baris tabel Transaksi, serta ke `.txn-desc`/`.txn-meta` di kartu "Transaksi terbaru" (Ringkasan) — teks penuh tetap bisa dibaca lewat hover/tap-tahan tanpa mengubah lebar kolom manapun.
- (Ditemukan saat pengujian, bukan bug asli: screenshot `fullPage: true` Puppeteer pada elemen `position: sticky` menampilkan posisi yang salah secara visual — dikonfirmasi lewat `getBoundingClientRect()` langsung bahwa tampilan sebenarnya di browser normal. Tidak ada perubahan kode untuk ini.)
- Tidak ada test baru (perubahan murni atribut HTML, tidak ada logika baru untuk diuji); 273 test lama tetap lulus semua.

## v1.1.134 — 12 Okt 2026

**Perapian tampilan desktop, tahap D9 s.d. D11** (`index.html`, `style.css`, `12-render-utama.js`, `tests/run.js`)
- **D9:** aturan tiga kolom Ringkasan (`1fr 1fr 340px`) dipindah dari ≥1600 ke ≥1440 px. Lebar isi sama karena `.wrap` dibatasi 1360 px di ≥1440, jadi kartu di bawah grafik (Bulan ini, Atur rencana, Transaksi terbaru, Kategori, Label) mengalir dua kolom di laptop besar. Kartu **Nilai akun** disembunyikan di ≥1280 px (`!important` karena display-nya juga diatur inline oleh pengaturan kartu) sebab sama dengan panel Akun di kanan.
- **D10:** `#tagihan-calendar-list` jadi grid dua kolom di ≥1440 px (10 bulan jadi 5 baris).
- **D11:** keterangan `month-projection-note` ("Rata-rata harian × sisa N hari") dipindah ke dalam `.txn-text` baris Proyeksi; sebelumnya memakai margin −4px sehingga menimpa garis pemisah (juga di HP). `APP_BUILD` selama ini tertinggal di "2 Okt 2026" (tampil di tab Profil); diperbarui ke 12 Okt 2026. **Catatan rilis:** tanggal build perlu ikut diperbarui tiap rilis.
- Diperiksa di Chromium 1280 dan 1440 px: tanpa scroll horizontal dan tanpa error JS. 3 test baru (273 total).

## v1.1.133 — 12 Okt 2026

**Tampilan desktop, tahap D4 s.d. D8 (satu rilis)** (`01-data.js`, `02-navigasi.js`, `index.html`, `style.css`, `tests/run.js`)
- **D4, panel Akun lebih kaya:** `deskAccountGroups(data, balances, max)` (murni, di `01-data.js`) membagi akun jadi kelompok **Aset** (kas, bank, e-wallet, aset) dan **Utang** (kartu kredit, PayLater, pinjaman), tanpa akun arsip dan titipan, urut nilai terbesar, maksimal 8 per kelompok (sisanya jadi tombol "+N akun lagi ›" ke tab Akun). Tiap kelompok punya subtotal (aset = saldo positif, utang = saldo negatif). Ikon per jenis akun (`DESK_TYPE_ICONS`/`deskTypeIcon`, garis saja, mengikuti warna teks). Kartu kredit dan PayLater berlimit memuat `usage` (`terpakai ÷ limit`, definisi sama dengan `computeLimitUsage`): bar hijau, kuning ≥70%, merah ≥90% (dengan ▲). Bar disembunyikan saat saldo disembunyikan.
- **D5, bar atas menempel:** layar ≥1280 px, `header` jadi `position: sticky` satu baris (judul tab, kotak cari, tanggal, tema, profil); sapaan disembunyikan. Panel sticky lain (filter Transaksi, Laporan, Tagihan, Titipan, panel Akun, judul kolom tabel) memakai `--desk-top` (84 px di ≥1280, 24 px di bawahnya) supaya tidak tertutup bar atas.
- **D6, form sebagai panel samping:** di ≥1280 px, `#txn-form` dan `#acc-form` meluncur dari kanan (lebar 460 px, tinggi penuh, animasi 0,22 dtk, dimatikan oleh `prefers-reduced-motion`). Lembar lain tetap dialog tengah. HP dan tablet tidak berubah.
- **D7, pintasan keyboard** (≥1280 px): `/` fokus kotak cari, `N` catat transaksi, `[` buka/ciutkan menu samping. `deskShortcutAction` murni dan mati saat mengetik di kolom isian, saat Ctrl/Alt/Meta ditekan, atau saat dialog/lembar/kunci/kalkulator terbuka. Petunjuk `/` tampil di kotak cari, `[` di tooltip tombol sidebar.
- **D8, tema gelap di layar lebar:** diperiksa di Chromium 1440 dan 1920 px (Ringkasan, Transaksi, Akun, panel form samping), tanpa scroll horizontal dan tanpa error JS. Temuan: ubin ikon akun menyatu dengan kartu di tema gelap (warna latarnya sama), diberi garis tepi. Test baru memastikan aturan desktop baru hanya memakai variabel warna.
- 7 test baru (270 total).

## v1.1.132 — 12 Okt 2026

**Tampilan desktop, tahap D3: tab Transaksi berbentuk tabel** (`index.html`, `style.css`, `07-render-akun-transaksi.js`, `12-render-utama.js`)
- Layar ≥1280 px: baris transaksi jadi grid Tanggal | Keterangan | Kategori | Jumlah | hapus. Akun tampil sebagai baris kedua di bawah keterangan (bersama label, Cicilan, Bayar nanti); di ≥1600 px Akun jadi kolom sendiri. Titik warna dan baris meta lama disembunyikan; warna jumlah tetap membedakan masuk/keluar/transfer.
- Judul kolom (`#txn-thead`, menempel di atas saat di-scroll) bisa diklik: Tanggal, Keterangan (abjad), Jumlah. Klik pertama = arah bawaan (terbaru / A-Z / terbesar), klik lagi = dibalik (`sortTxnBy`). Memakai `state.sortMode` yang sama dengan pilihan "Urutkan" di panel filter, jadi keduanya selalu sinkron; `updateTxnHead` memberi tanda ▲/▼ dan `aria-sort`.
- Baris memuat sel tambahan (`.tc-date`, `.tc-cat`, `.tc-acc`, `.txn-extra`) yang disembunyikan CSS di <1280 px, sehingga HP dan tablet tidak berubah. Pengelompokan per hari, lipat hari, "Muat lebih banyak", klik baris untuk detail, dan hapus tidak berubah.
- Diperiksa di 1280, 1440, dan 1920 px: tanpa scroll horizontal dan tanpa error JS; judul kolom tersembunyi di 390 px. 262 test lulus (aturan sembunyi lama dipertahankan, aturan baru ditulis terpisah).

## v1.1.131 — 12 Okt 2026

**Tampilan desktop, tahap D1 + D2: grafik pas lebar kartu, kartu angka dengan persen dan garis mini** (`09-grafik.js`, `10f-tren-utang.js`, `02-navigasi.js`, `index.html`, `style.css`)
- **D1:** `chartDims(svg, tinggiHP, tinggiDesktop)` menggantikan ukuran tetap 320 px di empat grafik garis/batang (Kekayaan, Cashflow, Tren, Utang). Layar ≥1280 px memakai lebar kartu sebenarnya (maks 960; 1 satuan = 1 px, teks tidak membesar) dan tinggi 220–240; HP/tablet tetap 320 × 170/150. Kartu tersembunyi → kembali ke 320. Batas tinggi 320 px dari v1.1.129 dihapus.
- Grafik digambar ulang bila jendela diubah ukurannya atau sidebar dibuka/ciutkan (`deskRelayout`, ditunda 250 ms, hanya ≥1280 px).
- **D2:** kartu Kekayaan bersih, Total aset, Total utang menampilkan perubahan 30 hari (▲/▼ + persen, utang berwarna terbalik) dan garis mini. Deret kekayaan bersih dipisah dari kurva jadi `netWorthSeries(data, hari)`, sehingga kurva dan kartu memakai hitungan yang sama; utang memakai `computeDebtAtDates`; aset = kekayaan bersih + utang. Persen disembunyikan saat saldo disembunyikan. `renderDeskDash` tidak menghitung apa pun di layar <1280 px.
- Diperiksa di 1440 dan 1920 px (dengan dan tanpa sidebar), HP 390 px tidak berubah; tanpa scroll horizontal. 1 test baru (262 total).

## v1.1.130 — 12 Okt 2026

**Tampilan desktop: menu samping bisa dibuka/ciutkan** (`index.html`, `style.css`, `02-navigasi.js`)
- Layar ≥1024 px: tombol toggle di puncak sidebar (`toggleSidebar`). Diciutkan → lebar 72 px, hanya ikon (label disembunyikan, tombol Catat transaksi jadi ikon +), isi halaman melebar. Pilihan disimpan di `localStorage` (`kp_sidebar`) dan dipulihkan saat app dibuka.
- Mobile dan tablet tidak berubah (tombol tersembunyi). Aksesibilitas: `aria-label` dan `aria-expanded` ikut berubah.
- 1 test baru, 1 test lama disesuaikan (261 total).

## v1.1.129 — 12 Okt 2026

**Tampilan desktop: dasbor Ringkasan (kotak cari, 3 kartu angka, grafik lebar, panel Akun)** (`index.html`, `style.css`, `02-navigasi.js`)
- **Bar atas (≥1024 px):** kotak cari di tengah. Ketik lalu Enter → pindah ke tab Transaksi dengan kata kunci terisi (`deskSearchSubmit`, memakai pencarian tab Transaksi yang sudah ada).
- **Ringkasan (≥1280 px):** blok hijau diganti tiga kartu angka berjajar (Kekayaan bersih, Total aset, Total utang; tombol mata ikut menyembunyikan angka) lewat `renderDeskDash`, dipanggil dari `renderBalanceHeader`. Grafik memakai lebar penuh kolom kiri (tinggi dibatasi 320 px). Panel **Akun** menempel di kanan: maksimal 12 akun aktif (tanpa arsip dan titipan), urut nilai terbesar, ketuk untuk membuka detail; utang merah.
- Layar ≥1600 px: kartu lain di bawah grafik mengalir dua kolom. Layar ≥1440 px: lebar isi maksimal 1360 px.
- Mobile, tablet, dan 1024–1279 px tidak berubah (blok hijau lama tetap dipakai di sana). Catatan: di ≥1280 px grup Grafik selalu tepat di bawah kartu angka (urutan ▲ ▼ tidak berlaku untuk grup itu).
- Diperiksa di 1100, 1440, dan 1920 px untuk semua tab: tanpa scroll horizontal dan tanpa error JS. 1 test baru (260 total).

## v1.1.128 — 12 Okt 2026

**Tampilan desktop: tombol Catat transaksi di sidebar, tab Tagihan dua kolom** (`style.css`)
- Layar ≥1024 px: tombol "+ Catat transaksi" pindah dari pojok kanan bawah (menutupi nominal dan tombol hapus di kolom isi) ke dasar sidebar kiri. Mobile dan tablet tetap tombol bulat melayang.
- Layar ≥1280 px: tab Tagihan dua kolom, kartu Jatuh tempo menempel di kiri (420 px) dan kalender bulanan di kanan; bila tak ada tagihan jatuh tempo, kalender memakai lebar penuh.
- Diperiksa di 1100, 1440, dan 1920 px untuk semua tab: tanpa scroll horizontal dan tanpa error JS. Tanpa perubahan logika, jadi jumlah test tetap 259.

## v1.1.127 — 12 Okt 2026

**Perbaikan: daftar Tagihan kartu kredit ikut berubah setelah dibayar** (`01-data.js`)
- Di `computeBillCalendar`, tagihan kartu kredit kini menampilkan sisa tagihan cetak setelah pembayaran sejak cetak (minimum, nominal, atau penuh). Label menjelaskan keadaannya: "min Rp…", "minimum terbayar", dan "sudah dibayar Rp…". Lunas penuh = hilang dari daftar.
- Kartu tanpa tanggal cetak sebelumnya tidak muncul sama sekali di tab Tagihan; kini tampil sebagai seluruh hutang dengan jatuh tempo tgl `feeDay` berikutnya, dan turun otomatis saat dibayar.
- 1 test baru (259 total).

## v1.1.126 — 11 Okt 2026

**Perbaikan: peringatan kartu kredit hilang setelah minimum dibayar** (`01-data.js`, `10j-perhatian.js`, `07-render-akun-transaksi.js`, `04b-akun-detail.js`)
- Kartu kredit yang tagihan cetaknya sudah dibayar sebesar minimum (`minRemaining` = 0) tidak lagi memicu strip "Perlu perhatian" (telat/jatuh tempo), tidak lagi merah/amber di kartu Jatuh tempo dan kartu Akun, dan tidak lagi bertanda "(lewat)" di detail akun. Sisa tagihan tetap tampil netral ("Minimum terbayar · sisa tagihan cetak ...") dan tetap ada di tab Tagihan.
- `computeUpcomingDues` memberi penanda `minMet` pada item tagihan cetak.
- 1 test baru (258 total).

## v1.1.125 — 11 Okt 2026

**Grafik: kartu Kategori terpisah, kartu Label baru, Tren dan Utang ikut filter periode** (`09-grafik.js`, `10f-tren-utang.js`, `03b-label.js`, `02-navigasi.js`, `index.html`)
- **Kategori** kini kartu sendiri di bawah kartu Grafik (bukan lagi tab di dalamnya). Isinya sama: pie Pengeluaran/Pemasukan/Transfer bulan ini.
- **Kartu Label baru**: pie per label bulan ini, tombol Pengeluaran/Pemasukan, maksimal 8 irisan (sisanya "Label lain"). Ketuk label untuk membuka tab Transaksi yang sudah disaring ke label dan jenis itu. Transaksi multi-label dihitung di tiap labelnya.
- **Tren dan Utang mengikuti pemilih periode** 1H/7H/30H/180H/360H seperti Kekayaan dan Cashflow: harian (1H/7H), per 5 hari (30H), bulanan (180H/360H). Judul, ringkasan, dan label sumbu ikut berubah. `computeDebtAtDates` menghitung utang di tanggal mana pun dalam satu putaran.
- Batasan: 180H/360H memakai 6/12 bulan kalender; bawaan 30H berarti Tren kini 5 harian (dulu 6 bulan); pilihan segmen 'kategori' lama kembali ke Kekayaan.
- 4 test baru (257 total); diuji di browser untuk semua periode.

## v1.1.124 — 11 Okt 2026

**Tampilan: grafik Tren dan Utang jadi garis, kartu Nilai akun diseragamkan** (`09-grafik.js`, `10f-tren-utang.js`, `index.html`)
- **Grafik Tren (pemasukan vs pengeluaran, 6 bulan)** kini berupa dua garis mulus (hijau/merah) dengan titik per bulan dan garis dasar putus-putus, seperti kurva Cashflow; ada ringkasan "Selisih bulan ini" berwarna di atas grafik. Tanpa area terisi (dua area bertumpuk jadi keruh).
- **Grafik Tren utang** kini berupa garis mulus berwarna rust dengan area tipis, titik per bulan, dan nilai terakhir tertulis; ringkasan di atas memakai gaya yang sama dengan Cashflow. Tooltip per bulan tetap bekerja (terang dan gelap).
- Kurva bulanan memakai **monotone cubic** (`monotonePathD`), jadi garis tidak melampaui nilai antar titik (tidak menembus sumbu bawah seperti kurva Catmull-Rom Cashflow saat nilainya naik-turun tajam).
- **Kartu Nilai akun** memakai baris yang sama dengan Transaksi terbaru: titik warna, nama akun, jenis akun di baris kedua, nominal di kanan. Garis aksen warna di tepi kiri dihapus.
- 3 test baru (253 total); diuji di browser dengan data enam bulan (garis, ringkasan, tooltip, mode gelap).

## v1.1.123 — 11 Okt 2026

**Perbaikan: Edit transaksi tidak bekerja** (`02b-rute.js`, `04c-akun-aset-tagihan.js`, `index.html`)
- **Form Edit langsung tertutup sendiri.** Dari detail transaksi, "Edit transaksi" menutup sheet detail lalu membuka form. Penutupan detail memicu `history.back()` (sejak rute v1.1.114) yang popstate-nya baru tiba setelah form terbuka, sehingga dianggap tombol Kembali dan menutup form itu. Kini Kembali yang dipicu app sendiri dihitung (`selfBacks`) dan popstate-nya tidak menutup sheet lain. Memperbaiki semua peralihan sheet ke sheet yang serupa, bukan hanya Edit.
- **Transaksi berkategori "Lainnya" tak bisa disimpan** ("Isi nama kategorinya dulu"): "Lainnya" sama dengan penanda kategori buatan sendiri, jadi saat diedit dianggap kategori baru berisi kosong. Kini nama kosong = tetap "Lainnya" (kolom nama ditandai "boleh kosong").
- 2 test baru (250 total); diuji di browser: buka detail, Edit, ubah nominal, simpan; Kembali setelah Edit menutup form saja.

## v1.1.122 — 11 Okt 2026

**Perbaikan: kalkulator tidak terlihat di form** (`06-util-ui.js`, `06c-kalkulator.js`, `style.css`)
- Sebelumnya kalkulator hanya muncul sebagai bar kecil di bawah kolom yang sedang fokus, sehingga mudah tak terlihat (mis. tertutup papan ketik HP). Kini setiap kolom nominal punya **ikon kalkulator permanen di sisi kanan**; ketuk untuk membuka papan hitung layar, lalu **Pakai hasil** mengisi kolom itu. Berlaku di semua form (transaksi, akun, anggaran, target, titipan, dll.). Mengetik rumus langsung di kolom tetap bisa.
- Kolom nominal kini dibungkus (`.cmoney-wrap`); ikon disembunyikan saat cetak. 1 test baru (248 total); diuji di browser (ikon tampak di form transaksi dan form target, ketuk membuka papan, 250.000+15.000×2 = 280.000 terisi ke kolom).

## v1.1.121 — 9 Okt 2026

**Baru: label (tag) transaksi** (`03b-label.js`, `04c-akun-aset-tagihan.js`, `03-form-transaksi.js`, `12-render-utama.js`, `07-render-akun-transaksi.js`, `02-navigasi.js`, `11-laporan.js`, `13-import-export.js`, `index.html`, `style.css`, `sw.js`)
- **Form transaksi:** kolom "Label" (pisahkan koma, boleh kosong) dan chip saran dari label yang sudah pernah dipakai (ketuk untuk pasang/lepas). Maksimal 5 label per transaksi, 24 huruf; `#`, koma, titik koma dibuang; "Kebun" dan "kebun" dianggap sama.
- **Daftar dan detail:** `#label` tampil di baris transaksi dan di detail. Tab Transaksi: baris chip **filter label** (muncul kalau ada label; ketuk lagi untuk melepas; ikut "Reset filter"), dan kolom cari kini mencocokkan label juga.
- **Laporan:** kartu **Per label** (total pengeluaran dan pemasukan per label di periode dan filter akun yang sedang dilihat; transfer tidak dihitung; transaksi berlabel ganda dihitung di tiap label).
- **CSV:** kolom baru `Label` di paling kanan. **JSON:** label ikut ekspor, dan impor (gabung maupun ganti semua) menjaga label yang valid.
- 34 file JS. 5 test baru (247 total); tes CSV lama disesuaikan dengan kolom baru. Diuji di browser (form + saran, simpan, filter, cari `#bibit`, Laporan).

## v1.1.120 — 9 Okt 2026

**Baru: target tabungan** (`10k-target.js`, `index.html`, `09-grafik.js`, `02-navigasi.js`, `10j-perhatian.js`, `13-import-export.js`, `06-util-ui.js`, `style.css`, `sw.js`)
- **Kartu "Target tabungan" di Ringkasan** (tersembunyi otomatis sampai ada target, ikut daftar kartu yang bisa disembunyikan/diurutkan, dan ajakan di kartu "Atur rencana keuanganmu"). Tiap target: bilah progres, terkumpul/target, persen, dan saran **setoran per bulan** (sisa ÷ sisa bulan kalender, dibulatkan ke atas Rp1.000); status Tercapai (hijau) atau Lewat tenggat (merah).
- **Sumber dana:** saldo satu akun kas/bank/e-wallet (terkumpul ikut saldo, minimal 0), atau **catatan manual** dengan tombol **Setor** (hanya menambah angka terkumpul, tidak membuat transaksi).
- Form kelola: tambah target (nama, nominal, tenggat, sumber, terkumpul awal), hapus. Tenggat sebelum hari ini ditolak; maksimal 30 target.
- **Ekspor/impor JSON** memuat `goals`: gabung melewati target yang sama (nama + nominal), akun dipetakan, akun yang tak dikenal jadi manual; impor "ganti semua" ikut memulihkan target.
- 33 file JS. 5 test baru (242 total); diuji di browser (tambah target terhubung akun dan manual, setoran lewat Enter, kartu dan form).

## v1.1.119 — 8 Okt 2026

**Baru: kalkulator di kolom nominal** (`06c-kalkulator.js`, `06-util-ui.js`, `index.html`, `style.css`, `sw.js`)
- **Rumus langsung di kolom:** ketik `25000+15000*2`, `150000/3`, `(1000+500)*2` atau `200000+10%` (persen = persen dari angka di kirinya untuk + dan −). Nilai kolom asli ikut hasil sementara (form tetap bisa disimpan tanpa pindah kolom); saat Enter atau pindah kolom, isi kolom jadi hasil. Rumus rusak/bagi nol: kolom bergaris merah (`aria-invalid`) dan nilai dikosongkan.
- **Papan kalkulator:** di bawah kolom nominal yang fokus muncul hasil sementara ("= 55.000") dan tombol **Kalkulator** yang membuka papan hitung layar (C, ⌫, %, ÷, ×, −, +, 000, koma, =) plus **Pakai hasil**; untuk HP yang papan angkanya tidak punya tanda operasi. Mulai dari nilai kolom saat ini (angka pertama yang diketik menggantikan, operator melanjutkan). Papan ketik fisik didukung.
- Aturan kolom tetap berlaku: titik = ribuan, koma = desimal; kolom tanpa desimal membulatkan hasil, kolom tanpa minus menolak hasil negatif, batas < 1e13. Parser sendiri (tanpa `eval`/`Function`).
- 32 file JS. 6 test baru (237 total); diuji di browser (rumus, Enter, persen, rumus rusak, papan, Pakai hasil, papan ketik).

## v1.1.118 — 8 Okt 2026

**Ekspor CSV disempurnakan** (`13-import-export.js`, `11-laporan.js`, `index.html`)
- Format CSV kini cocok untuk Excel/Google Sheets berlokal Indonesia: pemisah titik koma (`;`), desimal koma, UTF-8 dengan BOM. Sebelumnya pemisah koma membuat Excel Indonesia menaruh semuanya di satu kolom.
- Perlindungan CSV injection: sel teks (deskripsi, kategori, nama akun) yang diawali `=`, `+`, `-`, `@` atau tab diberi apostrof di depan supaya tidak dijalankan sebagai rumus.
- Baru: tombol **Unduh CSV (periode ini)** di tab Laporan: transaksi sesuai periode dan filter akun yang sedang dilihat (memakai penyaring yang sama dengan cetak: `laporanTxns`). Baru: **Export CSV akun** (nama, jenis, saldo, status aktif/diarsipkan, limit) di Profil → Pengaturan data lanjutan; tombol lama jadi "Export CSV transaksi".
- Pengurutan stabil (tanggal, lalu urutan asli); pembangun CSV bersama (`csvCell`, `csvBuild`, `buildTxnCsv`, `buildAccountsCsv`, `saveTextFile`).
- 5 test baru (231 total); unduhan ketiganya diverifikasi di browser.

## v1.1.117 — 8 Okt 2026

**Baru: pemasukan berulang (transaksi berulang)** (`10c-langganan.js`, `index.html`, `06-util-ui.js`, `09-grafik.js`, `01-data.js`, `style.css`)
- Langganan kini bisa berupa **Pemasukan** (gaji, sewa diterima, dll.): data langganan mendapat field `type` ('keluar' bawaan | 'masuk') dan `category`. Transaksi dibuat otomatis tiap bulan pada tanggalnya dengan jenis dan kategori itu, ID deterministik `sub-<id>-<YYYY-MM>` (dua perangkat tidak menggandakan), bulan terlewat dikejar maks. 12 bulan, idempoten.
- Form "Transaksi berulang": pilihan Jenis, Kategori (daftar menyesuaikan jenis; "Penyesuaian saldo" dikecualikan), akun (pemasukan hanya kas/bank/e-wallet), dan label ikut berubah (Masuk ke akun, Nama pemasukan, Tanggal diterima). Kartu Ringkasan menampilkan "Keluar …/bulan · Masuk …/bulan", pemasukan berwarna hijau dengan tanda +.
- Kompatibel: data lama tanpa `type`/`category` otomatis jadi pengeluaran "Tagihan & langganan"; ekspor/impor/sinkron membawa field baru; impor tidak menganggap pemasukan dan pengeluaran bernama sama sebagai duplikat.
- 7 test baru (226 total); form diuji di browser (tambah gaji berulang, total kartu).

## v1.1.116 — 8 Okt 2026

**Baru: kunci app (PIN)** (`06b-kunci.js`, `index.html`, `style.css`, `15-startup.js`, `sw.js`)
- Tab Profil → "Kunci app": Aktifkan PIN (6 angka, diketik dua kali), Ubah PIN (minta PIN lama), Matikan PIN (minta PIN), Kunci sekarang. Layar kunci dengan papan angka kustom (tanpa input bawaan browser), bisa juga lewat papan ketik fisik; terkunci saat app dibuka dan saat kembali dari latar lebih dari 1 menit. Isi halaman disembunyikan dari pembaca layar dan urutan tab saat terkunci.
- PIN disimpan sebagai hash PBKDF2-SHA256 (100.000 putaran, salt acak) di `localStorage` perangkat ini; tidak ikut ekspor, backup, atau sinkron. Cadangan hash sederhana bila Web Crypto tidak tersedia.
- Salah PIN: tiap kelipatan 5 kali berturut-turut, jeda 30 detik, 60, 120, … maksimal 15 menit (hitung mundur tampil; tetap berlaku walau app dimuat ulang).
- Lupa PIN: hanya lewat reset, yang menghapus data perangkat ini dan mematikan kunci, tanpa backup otomatis (agar data tidak bisa diambil tanpa PIN); dengan konfirmasi jelas, dan data bisa dipulihkan dari akun sinkron atau file backup.
- Catatan: ini penghalang akses sekilas, bukan enkripsi data (dijelaskan di layar Profil).
- 31 file JS. 4 test baru (219 total; verifikasi hash dijalankan di proses terpisah agar benar-benar menunggu hasil async); alur aktifkan, kunci, salah, jeda 5x, ubah, keyboard fisik, dan Lupa PIN diuji di browser.

## v1.1.115 — 8 Okt 2026

**Rute web: tombol Kembali menutup form/sheet** (`02b-rute.js`)
- Setiap sheet/form yang terbuka (transaksi, akun, titipan, anggaran, langganan, dana darurat, rincian, dll.) menambah satu entri riwayat dengan alamat yang sama; Kembali di browser/HP menutup sheet paling atas alih-alih keluar dari app. Ditutup lewat tombol/latar: mundur satu entri (riwayat tidak menumpuk). Bila penutupan ditolak (mis. konfirmasi buang perubahan), entri dikembalikan.
- Detail akun yang ditutup lalu langsung membuka form (mis. "Catat pengeluaran" dari detail): penutupan riwayatnya ditunda satu putaran agar form yang baru dibuka tidak ikut tertutup; Kembali dari form kembali ke detail akun, Kembali lagi menutup detail.
- Diuji di browser sungguhan (form dari tab Akun/Ringkasan, tutup lewat tombol, detail + form bertumpuk).

## v1.1.114 — 8 Okt 2026

**Baru: rute web** (`02b-rute.js`, `02-navigasi.js`, `04b-akun-detail.js`, `15-startup.js`, `index.html`, `sw.js`)
- Alamat browser mengikuti layar: `#/ringkasan`, `#/akun`, `#/transaksi`, `#/titipan`, `#/tagihan`, `#/laporan`, `#/profil`, dan `#/akun/<id>` untuk detail akun. Judul tab browser ikut berubah (mis. "Akun · Keuangan Pribadi", "BCA · Keuangan Pribadi").
- Tombol Kembali/Maju (browser dan HP) pindah tab sebelumnya dan menutup/membuka detail akun; menutup detail lewat tombol atau latar mundur satu langkah riwayat (tidak menumpuk entri). Membuka tautan langsung (`index.html#/laporan`, atau detail akun) langsung ke layar itu; akun tak ada dialihkan ke `#/akun`, alamat tak dikenal ke `#/ringkasan`; mengubah hash manual juga diterapkan.
- Memakai hash supaya jalan di hosting statis tanpa pengaturan server, file:// dan PWA. API history dibungkus try/catch: bila diblokir (mis. tampilan tertanam) app tetap jalan tanpa rute.
- 30 file JS (sebelumnya 29). 3 test baru (215 total); alur Kembali/Maju/deep link diuji di browser sungguhan.

## v1.1.113 — 7 Okt 2026

**Aksesibilitas: kontras teks (WCAG AA 4,5:1)** (`style.css`, `11b-laporan-utang.js`, `11c-laporan-proyeksi.js`, `11-laporan.js`, `07-render-akun-transaksi.js`, dll.)
- Audit otomatis kontras di 5 tab (terang dan gelap): mode gelap sudah lolos; mode terang punya teks merah (3,9:1), hijau (3,4:1), teal label menu aktif (2,3:1), kuning (2,9:1), oranye "Reset & ganti data" (2,6:1), dan teks tombol cetak (2,2:1).
- Variabel baru `--red-ink`, `--green-ink`, `--teal-ink`, `--blue-ink`, `--amber-ink`, `--rust-ink` khusus teks (mode gelap = warna dasar, tidak berubah). Semua `color: var(--warna)` di CSS, template JS, dan `index.html` dialihkan; isi grafik, batang, dan titik tetap warna dasar. `--ink-soft` terang diperdalam #5B6B65 → #52625C. Tombol cetak memakai latar `--teal-ink`.
- Hasil: 0 teks di bawah 4,5:1 di kedua tema. 1 test baru (212 total).

## v1.1.112 — 7 Okt 2026

**Aksesibilitas: target sentuh tombol teks kecil** (`style.css`)
- Audit otomatis di 5 tab (tombol/isian tanpa nama atau label, gambar tanpa alt, bahasa halaman, reduced-motion, focus-visible) bersih kecuali satu: tombol "Atur urutan" di tab Akun setinggi 19 px. `.see-all-btn` kini minimal 24 px (WCAG 2.2, 2.5.8).

## v1.1.111 — 7 Okt 2026

**Baru: build sebar `dist/` (E8)** (`tools/build-dist.js`, `tests/run.js`)
- `node tools/build-dist.js [folder]` menggabung 29 file JS jadi satu `app.js`, memadatkan CSS (52 → 41 KB), menyesuaikan `index.html` (satu tag script dengan `?v=<versi>`) dan daftar cache `sw.js`. JS diperkecil bila `terser` terpasang (tanpa mangle, karena handler dipanggil lewat nama global dari `data-act`); tanpanya hanya digabung.
- Dicek di browser: `src` vs `dist` identik piksel di tab Beranda, Transaksi, Akun, Laporan, tanpa galat konsol.
- 1 test baru (211 total).

## v1.1.110 — 7 Okt 2026

**Dirapikan: gaya inline grafik** (`09-grafik.js`, `10f-tren-utang.js`, `11-laporan.js`, `10j-perhatian.js`, `11c-laporan-proyeksi.js`, `08-render-titipan.js`, `index.html`, `style.css`)
- 23 atribut `style=""` (isi fill/stroke SVG, warna merah/hijau) diganti kelas `svg-fill-soft`, `svg-stroke-line`, `svg-fill-red`, `svg-fill-green`, `u-bg-green`, `u-c-red`. Tampilan sama (diverifikasi warna terhitung di browser); sisa `style=""` inline: 269.

## v1.1.109 — 7 Okt 2026

**Diubah: cetak laporan tanpa kurva tren** (`index.html`, `style.css`)
- Kartu "Tren alur kas" diberi `no-print`: kurva tetap tampil di layar tetapi tidak ikut tercetak/PDF. Aturan urutan dan cetak khusus kurva dihapus.
- Bagian pendek di laporan cetak tidak dipotong antar halaman (`break-inside: avoid`); hanya bagian berisi daftar akun yang boleh berlanjut. Catatan: judul "Ringkasan periode" masih bisa tertinggal di dasar halaman 1 pada data tertentu (kosmetik).
- Tes urutan cetak disesuaikan (210 total).

## v1.1.108 — 7 Okt 2026

**Diubah: tombol Export PDF laporan** (`index.html`, `11-laporan.js`, `style.css`)
- Label "⬇ Export PDF" (menyesatkan: tombol sebenarnya membuka jendela cetak browser, bukan mengunduh) diganti "Cetak / simpan PDF" dengan ikon printer, plus petunjuk di bawahnya: pilih "Simpan sebagai PDF" di jendela cetak, isi mengikuti periode dan filter.
- `exportLaporanPdf`: tidak mencetak kalau periode/akun terpilih tidak punya transaksi (toast pesan, `laporanHasData`); nama berkas PDF mengikuti judul "Laporan Keuangan - <periode>" dengan karakter terlarang diganti (`laporanPdfTitle`); kalau cetak diblokir (mis. tampilan tertanam tanpa izin cetak) tampil toast "Cetak tidak tersedia di tampilan ini" dan judul halaman dipulihkan, bukan gagal diam-diam.
- 1 test baru (210 total).

## v1.1.107 — 7 Okt 2026

**Diubah: cetak laporan tanpa kartu** (`style.css`, `@media print`)
- Saat cetak, semua bagian laporan tampil polos: tanpa kotak, latar, bayangan, atau sudut membulat (`.chart-card`, `.cat-list`, `.acc-card`, `.list-section`). Tiap bagian dipisah judul bergaris tebal, daftar kategori memakai garis tipis antarbaris, dan kartu utang/pinjaman dipisah garis tipis di bawahnya. Tampilan di layar tidak berubah. 209 test.

## v1.1.106 — 7 Okt 2026

**Diubah: cetak / Export PDF laporan** (`style.css` bagian cetak, `11-laporan.js`, `index.html`)
- **Kepala laporan** khusus cetak (`#laporan-print-head`, `renderLaporanPrintHead`): judul, periode, filter aktif (akun dan kategori) atau "Semua akun dan kategori", tanggal cetak, dan versi app. Judul halaman dan kontrol periode/filter disembunyikan saat cetak.
- **Urutan isi:** ringkasan, tren alur kas, pemasukan/pengeluaran per kategori, baru analisis tambahan (utang, proyeksi, simulasi, saran). Sebelumnya kategori ada di halaman terakhir. Grafik tren kini ikut tercetak (sebelumnya `no-print`).
- **Halaman:** `@page` A4 dengan margin 12 mm dan nomor halaman "n / total" di bawah; kartu boleh terpotong di antara baris, tetapi baris, judul, dan ringkasan tidak terbelah. Satu kolom saat cetak.
- **Selalu terang di kertas** walau app dalam mode gelap (variabel warna ditimpa di `@media print`).
- **Bilah kategori ikut tercetak** (`print-color-adjust: exact`), tetap tampil meski "background graphics" browser mati.
- Isi `<details>` yang terlipat dibuka otomatis saat cetak (`beforeprint`) lalu dikembalikan (`afterprint`), termasuk saat menekan Ctrl+P.
- 4 test baru (208 total). Diperiksa dengan merender PDF A4 dari Chromium pada data dummy (mode terang dan gelap).

## v1.1.105 — 7 Okt 2026

**Audit kontrol bawaan browser dan kode usang**
- Hasil audit: semua 21 `<select>` dan 8 kolom tanggal sudah kustom; tidak ada `alert/confirm/prompt`, `textarea`, radio, atau tipe bulan/jam/warna. Yang masih bawaan hanya input file (disembunyikan, dibuka lewat tombol sendiri), email, dan password.
- **Kolom angka:** tombol naik-turun bawaan browser (spinner) dimatikan dan roda mouse tidak lagi mengubah angka yang sedang fokus (`style.css`, `06-util-ui.js`).
- **Centang** (pengaturan kartu Ringkasan) kini kotak kustom hijau, bukan centang bawaan browser.
- **Dihapus (kode mati):** `goToAddTxn`, `toggleAccForm`, `setNetWorthPeriod`, `setCashflowPeriod` (sisa dari kartu grafik yang sudah digabung); CSS `.acc-top`, `.u-mt22`, `.u-bb-line`, `.u-fw5-fs115`, `.u-py8-ptr`, selektor `#tab-data` (tab itu sudah tidak ada), dan `-webkit-overflow-scrolling` (usang).
- Ditambah `<meta name="mobile-web-app-capable">` (pengganti resmi tag `apple-` yang sudah ditandai usang di Chrome; tag lama dipertahankan untuk iOS).
- Tidak diubah, dicatat: `activeAccounts` hanya dipakai test (produksi menyaring langsung); kode migrasi format transaksi lama di `loadData` dibiarkan demi data lama; 16 `!important` di CSS (sebagian besar pembatalan gaya inline, perlu perapian bertahap).
- 4 test baru (204 total).

## v1.1.104 — 3 Okt 2026

**Ditambah**
- **Titik pemisah ribuan otomatis di kolom nominal Rupiah** (ketik 1000000 jadi 1.000.000). `enhanceMoney` di `06-util-ui.js`, pola sama dengan `enhanceSelect`/`enhanceDate`: input asli `type="number"` tetap menjadi sumber nilai (angka murni, mis. `1500000` atau `16250.5`) tetapi disembunyikan; kolom teks di sampingnya hanya tampilan. Kode lain tidak berubah: `.value`, `.placeholder`, `.disabled`, `.focus()` pada input asli diteruskan, dan event `input`/`change` diteruskan ke input asli.
- Diaktifkan lewat atribut `data-money` (`dec` = boleh desimal dengan koma, `neg` = boleh minus). Terpasang di 15 kolom statis (jumlah transaksi, saldo awal, limit, pokok awal, angsuran, biaya admin, materai, tabungan wajib, nominal langganan, bayar pinjaman, titipan, admin cicilan PayLater, harga/nilai aset, saldo asli rekonsiliasi) dan kolom dinamis (isian anggaran per kategori, dana ekstra simulasi pelunasan, lewat `MutationObserver`).
- Posisi kursor dijaga saat mengetik di tengah angka; titik yang ditempel dianggap pemisah ribuan. Kolom persen, tanggal, tenor, dan jumlah unit tidak diubah.
- 4 test baru (200 total), termasuk penjaga agar kolom Rupiah baru tidak lupa diberi `data-money`.

## v1.1.103 — 3 Okt 2026

**Diubah**
- **Laporan: dua kartu, Pemasukan dan Pengeluaran, masing-masing berisi daftar kategorinya** (`renderLaporanCatCard`, `11-laporan.js`; wadah `#laporan-cat-masuk-list` dan `#laporan-cat-keluar-list`). Kepala kartu memuat judul dan total, lalu baris kategori (nama, jumlah transaksi, nominal, persen, bilah). Menggantikan daftar gabungan satu-kartu-per-kategori dari v1.1.102 yang salah dipahami. Lipat "Lihat N kategori lainnya" untuk lebih dari 6 kategori dan ketuk-untuk-filter dikembalikan; di layar lebar kedua kartu berdampingan.
- `mergeCategorySummaries` dan `renderLaporanCatCombined` dihapus. 196 test.

## v1.1.102 — 3 Okt 2026

**Diubah**
- **Laporan: pemasukan dan pengeluaran per kategori digabung dalam satu daftar, satu kartu per kategori** (`renderLaporanCatCombined`, `mergeCategorySummaries` di `11-laporan.js`; satu wadah `#laporan-cat-list` menggantikan dua daftar). Kartu memuat baris Pemasukan (hijau) dan/atau Pengeluaran (merah) untuk kategori itu, jadi kategori yang ada di keduanya (mis. "Lainnya") tampil dalam satu kartu. Urutan menurut volume terbesar; lebih dari 6 kategori dilipat ("Lihat N kategori lainnya", semua tampil saat Export PDF). Di layar lebar kartu tersusun dua kolom.
- Ketuk-untuk-filter pada baris kategori (v1.1.101) dihapus karena tidak jelas artinya untuk kartu gabungan; filter tetap lewat chip kategori di atas.
- 197 test.

## v1.1.101 — 3 Okt 2026

**Diubah**
- **Laporan: Pemasukan/Pengeluaran per kategori dirapikan** (`renderLaporanCatBreakdown`, `11-laporan.js`). Satu kartu berisi baris rapat (sebelumnya satu kartu per kategori) dengan nama, jumlah transaksi ("8x"), nominal, dan persen. Porsi di bawah 1% tampil "<1%" (sebelumnya "0%"). Bilah dibandingkan dengan kategori terbesar supaya kategori kecil tetap terbaca; persen tetap terhadap total.
- Lebih dari 6 kategori: sisanya dilipat dengan tombol "Lihat N kategori lainnya" (tetap tampil semua saat Export PDF).
- Ketuk baris kategori untuk memfilter ke kategori itu (sama dengan chip filter), ketuk lagi untuk kembali ke semua (`toggleLaporanCat`, `toggleLaporanCatMore`; `state.laporanCatExpanded`).
- 3 test baru (196 total).

## v1.1.100 — 2 Okt 2026

**Ditambah**
- **Pemilih tanggal kustom** menggantikan kalender bawaan browser untuk ketujuh `<input type="date">` (tanggal transaksi, tanggal pencairan pinjaman, tanggal penilaian aset, tanggal bayar pinjaman, tanggal titipan, dan rentang laporan kustom). `enhanceDate` di `06-util-ui.js` memakai pola yang sama dengan `enhanceSelect`: input asli tetap menjadi sumber nilai (`YYYY-MM-DD`), jadi kode lain tidak berubah. Mendukung `min`/`max` (hari di luar batas nonaktif), tombol "Hari ini", dan "Hapus" untuk rentang laporan. Minggu mulai Senin, nama bulan bahasa Indonesia.
- Audit form: semua 21 `<select>` sudah kustom sejak sebelumnya; dialog konfirmasi sudah kustom (`showConfirm`). Yang tersisa bawaan browser hanya input file, email, dan password.
- 4 test baru (193 total), termasuk penjaga agar input tanggal baru tidak lupa didaftarkan.

## v1.1.099 — 2 Okt 2026

**Diubah (kualitas kode, tampilan tidak berubah)**
- 18 `style=""` inline di `index.html` diganti kelas utilitas (`u-mb8`, `u-mb6`, `u-mb12`, `u-mt14`, `u-flex1`, dan kelas baru `u-red`, `u-bb-line`, `u-py8-fs12`, `u-py8-ptr`, `u-fw5-fs115` di `style.css`). Diverifikasi dengan membandingkan gaya terhitung 1.034 elemen sebelum dan sesudah: 0 selisih. Tiga judul bagian (`.section-title`) tetap inline karena aturan kelasnya lebih kuat dari utilitas.

## v1.1.098 — 2 Okt 2026

**Diubah**
- **Jadwal angsuran pinjaman kini memperlihatkan bulan "bunga saja"** sebagai baris sendiri di atas angsuran yang tersisa (`computeLoanSchedule` mengembalikan `deferredYm`; dirender di `04b-akun-detail.js`). Sebelumnya hanya ada catatan ringkas, sehingga bulan yang bunganya sudah dibayar tidak terlihat di rincian. 189 test.

## v1.1.097 — 2 Okt 2026

**Diubah**
- **Detail akun pinjaman: tombol cepat "Catat transaksi" diganti "Catat pembayaran"** (saat masih ada sisa utang). Tombol menggulir ke panel Catat pembayaran dan memfokuskan kolom nominal (pilihan bunga saja / pokok+bunga / nominal), tidak lagi membuka form pengeluaran (`quickTxnFromDetail` mode `bayar`, `04c-akun-aset-tagihan.js`). Pinjaman lunas tetap memakai Catat transaksi.
- Nominal jadwal angsuran memang tidak berubah saat bayar bunga saja; hanya tanggal jatuh tempo yang bergeser.

## v1.1.096 — 2 Okt 2026

**Ditambah**
- **Pinjaman bank: bayar bunga saja boleh lanjut ke bulan berikutnya, pokok tetap.** `loanInterestOnlyMonths` (`01-data.js`) menghitung bulan (setelah bulan pencairan, sampai bulan ini) yang punya pembayaran bunga ≥ 90% bunga bulanan dan tidak ada pembayaran pokok. `computeLoanSchedule` menggeser jatuh tempo semua angsuran yang belum lunas sebanyak bulan tersebut dan mengembalikan `deferred`. Berlaku untuk bunga tetap dan menurun. Bulan yang juga ada bayar pokok tidak dihitung.
- Catatan "Bayar bunga saja N bulan" di jadwal (`04b-akun-detail.js`) dan "pokok ditunda N bln" di kartu akun.
- 6 test baru (188 total).

## v1.1.095 — 2 Okt 2026

**Diubah**
- **`#sub-account-input` memakai select kustom** (`06-util-ui.js`, daftar `enhanceSelect`), sehingga gayanya sama dengan select form lain (sebelumnya panah bawaan browser). Form anggaran sudah berlabel sejak awal (`.field-label` per kategori), jadi tidak perlu diubah.
- **1 test baru** (total 182): setiap `<select>` di `index.html` harus terdaftar di `enhanceSelect`; select baru yang lupa didaftarkan akan menggagalkan test.
- `sw.js` `kp-v1.1.095`; riwayat tombol `?`; README.

## v1.1.094 — 2 Okt 2026

**Diubah**
- **Label tampak di form titipan, langganan, dan bayar pinjaman** (`index.html`, `05-form-titipan.js`), melanjutkan v1.1.093. Titipan: Orang, Dibayar dari / Diterima ke akun (`#titipan-fund-label` diatur `setTitipanMode`), Keterangan, Jumlah, Tanggal. Langganan: Nama, Nominal per bulan, Tanggal tagih, Dibayar dari akun. Bayar pinjaman: Jenis pembayaran, Dibayar dari akun, Tanggal pembayaran, Nominal. Placeholder dipendekkan; id dan logika tidak berubah.
- **3 test baru** (total 181): label untuk 13 isian, judul titipan per mode, dan tidak ada `<label for>` yatim di seluruh `index.html`. Dicek di Chromium 390 px.
- Catatan: pilihan akun di form langganan tampil dengan panah bawaan browser (bukan gaya kustom seperti form lain); belum diubah.
- `sw.js` `kp-v1.1.094`; riwayat tombol `?`; README.

## v1.1.093 — 2 Okt 2026

**Diubah**
- **Form transaksi: label tampak** (`index.html`, `style.css`, `03-form-transaksi.js`). Sebelumnya tanggal, kategori, dan akun hanya berupa kolom tanpa judul sehingga untuk transfer tidak jelas mana asal dan tujuan. Kini Tanggal, Kategori, Keterangan, Akun, Ke akun, dan Jumlah memakai `<label for>`; juga Metode bayar, Tenor, Bunga flat, dan Admin pada cicilan PayLater. `#account-label` diatur `setType`: Masuk ke akun / Dibayar dari akun / Dari akun. Kelas baru `.field-row.has-label` (kolom vertikal). Placeholder dipendekkan ("mis. Belanja telor", "Rp"). Id isian dan logika simpan tidak berubah.
- **2 test baru** (total 178). Chromium 390 px: form pemasukan, pengeluaran, transfer, dan cicilan PayLater tampil rapi; simpan tetap memunculkan dialog konfirmasi seperti sebelumnya.
- `sw.js` `kp-v1.1.093`; riwayat tombol `?`; README.

## v1.1.092 — 2 Okt 2026

**Ditambah / diubah**
- **Data contoh (`buildDummyData`, `13-import-export.js`) diperluas**: `dm-emas` (Emas 10 gram, 3 penilaian naik), `dm-forex` (Forex cent, equity 100 → 112 → 125 USD dengan kurs Rp16.000 → 16.150 → 16.300; memakai `qty` per penilaian v1.1.091), `dm-motor` (Kendaraan, nilai menyusut), `dm-kredit-motor` (pinjaman flat 12 bulan, 0,8%/bln, jatuh tempo tanggal 10, denda 0,5%/hari maks 10%, dibayar 2 dari 12 angsuran sehingga bulan ini muncul jatuh tempo/telat), `dm-lama` (rekening arsip dengan riwayat setoran/tarik), 2 langganan (Netflix, Spotify) dan 3 anggaran. Nilai kembalian kini `{ accounts, txns, subscriptions, budgets }`.
- `tools/build-preview.js`: suntikan "Rekening Lama" lama dihapus karena sudah ada di data contoh.
- **Saldo awal Kas dan Gopay dinaikkan** (Rp3.000.000 dan Rp1.200.000) karena data contoh sebelumnya membuat keduanya minus menjelang akhir bulan.
- **2 test baru** (total 176): id unik, transaksi menunjuk akun yang ada, langganan/anggaran lolos sanitasi, tanggal valid, penilaian tidak di masa depan, jumlah forex terbaru, tidak ada saldo non-utang minus, akun arsip lolos aturan arsip. Dicek di Chromium: 12 akun, 44 transaksi, aset Rp45,99 jt, kredit motor "Angsuran ke-3 Rp1.370.000 · jatuh tempo 10 Okt 2026".
- `sw.js` `kp-v1.1.092`; riwayat tombol `?`; README.

## v1.1.091 — 2 Okt 2026

**Ditambah** (langkah aman untuk todo Fase 2 "akun forex dengan kurs"; tidak mengubah model akun)
- **Jumlah per penilaian aset** (`01-data.js`, `04c-akun-aset-tagihan.js`, `index.html`). Form "Perbarui nilai" punya kolom *Jumlah sekarang* (terisi jumlah saat ini). Total = harga per satuan × jumlah, dan entri penilaian menyimpan `qty` di samping `price` dan `value`. `assetQtyNow(acc, asOf)` memberi jumlah dari penilaian terbaru yang mencatat `qty`, kalau tidak ada memakai `assetQty` awal. Dipakai di teks meta kartu, ringkasan detail (harga per satuan sekarang), dan prefill form. Menghapus penilaian mengembalikan jumlah ke penilaian sebelumnya. `sanitizeValuations` mempertahankan `qty` valid (impor, ekspor, sinkron). Nilai aset tetap = penilaian terbaru + transaksi sesudahnya, jadi saldo dan grafik tidak berubah.
- Kasus pakai: akun cent equity 100 USD, perbarui jadi 120 USD pada kurs Rp16.000 → nilai Rp1.920.000, kartu menampilkan "Forex · 120 USD" (diverifikasi di Chromium).
- **3 test baru** (total 174): `assetQtyNow` (terbaru, tanpa jumlah, masa depan), sanitasi `qty`, form dan simpan.
- **Belum dikerjakan:** konversi kurs otomatis lintas mata uang dan akun berdenominasi mata uang asing (butuh keputusan pemilik, lihat ROADMAP Fase 2).
- `sw.js` `kp-v1.1.091`; riwayat tombol `?`; README.

## v1.1.090 — 2 Okt 2026

**Kualitas (Fase 3)** — tanpa perubahan perilaku app.
- **4 test integritas modul baru** (total 171): (1) 29 file di `index.html` ada di disk dan terdaftar di cache `sw.js`; (2) semua file JS kecuali `15-startup.js` bisa dimuat berurutan ke sandbox tanpa galat (sebelumnya hanya 15 dari 29 yang dimuat test; `14-sync.js` ikut karena tidak menjalankan apa pun saat dimuat); (3) tidak ada nama fungsi/konstanta tingkat atas yang dideklarasikan di dua file (semua file berbagi scope global, deklarasi ganda diam-diam menimpa); (4) tiap `data-act`/`data-change-act`/`data-input-act`/`data-keydown-act` (125 pengendali) menunjuk fungsi yang ada. Diuji dengan mutasi: mengganti nama `cancelAccForm` membuat test (4) gagal.
- `15-startup.js` sengaja dikecualikan karena menjalankan app dan butuh DOM utuh.
- `sw.js` `kp-v1.1.090`; riwayat tombol `?`; README.

## v1.1.089 — 2 Okt 2026

**Diperbaiki**
- **Impor JSON menolak semua tanggal di zona waktu UTC+** (`13-import-export.js`, `isValidDateStr`). Penyebab: `new Date('YYYY-MM-DDT00:00:00').toISOString().slice(0,10)` membandingkan tanggal lokal dengan tanggal UTC; di WITA (UTC+8) tengah malam lokal jatuh pada hari sebelumnya menurut UTC, sehingga tiap tanggal dianggap tidak valid dan `buildTxnFromImport` menggantinya dengan hari ini. Dampak: impor/pemulihan cadangan di Indonesia menghasilkan semua transaksi bertanggal hari impor. Sekarang validasi dihitung murni dengan `Date.UTC` dan komponen UTC.
- **Nominal impor bukan angka menjadi `NaN`** (`buildTxnFromImport`): kini `0`.

**Kualitas (Fase 3)**
- **Test konsistensi versi otomatis:** `APP_VERSION`, `CACHE_VERSION`, README, entri teratas CHANGELOG.md, dan riwayat tombol `?` harus sama.
- **Test impor:** tanggal nyata saja (kabisat, 30 Feb, format salah), batas 5 MB, ID selalu baru, nominal negatif/NaN, tipe tak dikenal, akun tak dikenal jatuh ke akun cadangan, dan regresi zona waktu (dijalankan di UTC, Asia/Makassar, America/Los_Angeles, Pacific/Kiritimati lewat proses terpisah).
- **7 test baru** (total 167); seluruh suite juga lulus dengan `TZ=Asia/Makassar`.
- `sw.js` `kp-v1.1.089`; riwayat tombol `?`; README.

## v1.1.088 — 2 Okt 2026

**Diperbaiki**
- **Mode sembunyi saldo mencakup tab Akun** (todo uji visual; `01-data.js`, `07-render-akun-transaksi.js`, `02-navigasi.js`). Sebelumnya `state.balanceHidden` hanya dipakai header Ringkasan dan grafik kekayaan, sehingga Total aset/utang, Kekayaan bersih, Limit terpakai, total kelompok, dan kartu akun di tab Akun tetap menampilkan angka. Fungsi murni baru `maskRpText` (+ `HIDDEN_RP`) mengganti nominal `Rp…` di teks; `toggleBalanceVisibility` merender ulang tab Akun. Layar detail akun sengaja tidak ditutup (dibuka dengan sengaja).
- **2 test baru** (total 162). Chromium 390 px: sebelum tutup 5 nominal terlihat, sesudah tutup 0 nominal dan 5 titik, buka lagi kembali normal.
- Cek tambahan tema gelap: kelompok Diarsipkan tampil benar; aset hanya punya aksi Transfer (`catat:false, transfer:true`). Catatan: chip filter "Diarsipkan" terpotong di tepi kanan 390 px (baris chip bisa digeser).
- `sw.js` `kp-v1.1.088`; riwayat tombol `?`; README.

## v1.1.087 — 2 Okt 2026

**Diperbaiki**
- **Satuan suku bunga pinjaman terpotong ("%/...") di 390 px** (`index.html`): kolom Jenis bunga/Suku bunga diberi bobot 0,8/1,2, satuan `flex:0 0 84px`, teks opsi jadi `/thn` dan `/bln` (nilai `tahun`/`bulan` tidak berubah). Koreksi atas catatan "dilebarkan 52%" di v1.1.085 yang ternyata tidak berpengaruh karena `.field-row select { flex: 1 }`.
- Placeholder maksimal denda: "kosong = tanpa batas" → "tanpa batas" (terpotong di 390 px).

**Pengujian visual (todo uji visual, sebagian)**: Chromium 390 px tema gelap (form pinjaman dengan bagian Lainnya terbuka, daftar Akun), layar 1280 px (daftar Akun dan form), mode Atur urutan (tombol ▲ ▼ Sematkan semuanya `<button>` yang bisa di-Tab dengan aria-label), edit transaksi lama milik akun arsip (opsi akun arsip tetap muncul dan terpilih), tanpa galat JS. **1 test baru** (total 160): pinjaman bertenor lunas boleh diarsipkan, yang masih bersisa pokok tidak. Temuan: pinjaman flat dengan pokok 0 tidak punya sisa bunga terjadwal, jadi tidak diblokir oleh aturan bunga terjadwal (konsisten dengan `computeLoanRemaining`).
- `sw.js` `kp-v1.1.087`; riwayat tombol `?`; README.

## v1.1.086 — 2 Okt 2026

**Diubah**
- **Form pinjaman: isian opsional terlipat** (todo A9c; `index.html`, `04-akun.js`, `style.css`). Biaya admin/materai (+ cara bayar dan asuransi pinjaman online), tabungan wajib, dan denda telat/maksimal denda pindah ke `<details id="acc-loan-more">` "Lainnya (opsional)". Urutan inti kini: status, bunga, pokok awal, tenor, tanggal pencairan/jatuh tempo, angsuran, pencairan. `syncLoanMore` membuka bagian itu otomatis bila ada isi, untuk pinjaman online, atau lewat `openLoanMore` sebelum validasi memfokuskan isian di dalamnya (denda tanpa persen, biaya melebihi pokok). Id isian tidak berubah.
- **Teks bantuan diringkas** (pokok awal, jadwal, denda, pencairan).
- **3 test baru** (total 159).
- `sw.js`: `kp-v1.1.086`; riwayat tombol `?`; README.

## v1.1.085 — 2 Okt 2026

**Diubah**
- **Form akun: label tampak, Saldo awal dipindah ke atas** (todo A9b; `index.html`, `04-akun.js`). Nama akun, Jenis akun, dan Saldo awal memakai `<label for>` yang terlihat. `#acc-balance-row` kini tepat di bawah Jenis akun (sebelumnya baris terakhir). Judul `#acc-balance-label` diatur `updateAccFormFields` per jenis: Sisa pokok sekarang (pinjaman), Sudah terpakai saat ini (kartu/PayLater), Nilai awal / harga beli (aset), Saldo awal (lainnya); `aria-label` ikut disesuaikan.
- **Placeholder dipendekkan** agar tidak terpotong di 390 px (jumlah/satuan aset, angsuran, pokok awal, bunga pinjaman). Id, hook `updateOnlineLoanEstimate`, dan logika simpan tidak berubah.
- Kolom satuan suku bunga pinjaman dilebarkan (52%) supaya "%/thn" tidak terpotong di 390 px.
- **3 test baru** (total 156): label tampak, urutan baris saldo, judul saldo per jenis.
- `sw.js`: `CACHE_VERSION` `kp-v1.1.085`; riwayat tombol `?`; README.

## v1.1.084 — 2 Okt 2026

**Diperbaiki**
- **Galat form akun kini terlihat** (todo A9a; `04-akun.js`, `06-util-ui.js`, `index.html`, `style.css`). Penyebab: `saveAccount` memanggil `showIoMsg()` tanpa target, sehingga teks masuk ke `#io-msg` milik tab Profil yang tidak tampil. Kini ada `#acc-form-msg` (`role="alert"`) di dalam sheet di atas tombol Simpan, `position: sticky` di dasar panel supaya terlihat walau form panjang (pinjaman ±1.030 px). Semua validasi `saveAccount` lewat `accFormMsg()`; nama kosong kini punya pesan; pesan dibersihkan saat form dibuka dan saat Simpan ditekan.
- **`showIoMsg` jatuh ke toast bila targetnya tidak terlihat** (`06-util-ui.js`: `showToast`, `#app-toast`, `role="alert"` untuk galat, 6 dtk galat / 3 dtk lainnya). Ini memperbaiki sekaligus pesan lain yang memakai `#io-msg` bawaan dari luar tab Profil: "hapus transaksinya dulu" dan "Minimal harus ada satu akun" di `deleteAccount`, alasan arsip yang belum boleh, serta galat form transaksi. Pesan galat inline kini bertahan 8 dtk (sebelumnya 4).
- **Isian yang dibuang diam-diam kini diberi pesan:** biaya admin kartu tanpa tanggal jatuh tempo, dan maksimal denda pinjaman tanpa persen denda.
- **4 test baru** (total 153): jalur toast vs inline `showIoMsg`, teks kosong tanpa toast, `saveAccount` tidak memakai `showIoMsg` bawaan dan nama kosong berpesan, posisi `#acc-form-msg`.
- Riwayat perubahan di tombol `?` (v1.1.084); `sw.js`: `CACHE_VERSION` naik ke `kp-v1.1.084`; README: jumlah test.

**Pengujian**: 153 test lulus; Chromium headless 390 px: nama kosong, nama ganda, admin tanpa tanggal, denda maksimal tanpa persen semuanya menampilkan pesan di dalam sheet dan terlihat di layar (form pinjaman, panel digulir ke atas); setelah dilengkapi akun tersimpan; hapus akun bertransaksi dan `showIoMsg` dari tab non-Profil menampilkan toast; tanpa error JS. **Belum teruji:** tema gelap, pembaca layar untuk `role="alert"`, dan galat form transaksi lewat klik langsung (hanya lewat pemanggilan fungsi).

## v1.1.083 — 2 Okt 2026

**Ditambah**
- **Sematkan dan urutkan manual akun** (todo A8; `01-data.js`, `07-render-akun-transaksi.js`, `index.html`, `style.css`): tombol **Atur urutan** di judul tab Akun membuka mode atur (`state.accOrderMode`; filter dimatikan dan baris cari/chip disembunyikan supaya semua akun tampil). Tiap kartu mendapat baris ▲ ▼ + **Sematkan/Lepas**; tombol memakai `data-stop` sehingga tidak membuka detail. Fungsi murni: `sortAccountGroup(group, layout)` (tersemat dulu → urutan manual → nilai terbesar), `moveAccountInGroup` (hanya bertukar dengan tetangga yang statusnya sama; tidak mengubah layout lama), `toggleAccountPin`, `cleanAccountLayout` (membuang id yang hilang dan bentuk tidak valid).
- Tata letak `{ pins: [id], order: { tipe: [id] } }` disimpan di `localStorage` kunci `kp_acc_layout`, **per perangkat** (pola R4): tidak ikut ekspor/impor maupun sinkron cloud. Akun tersemat diberi label "Disematkan" di kartu; akun arsip tidak punya kontrol.
- **8 test baru** (total 149): urutan bawaan, sematan, urutan manual, sematan mengalahkan urutan, geser naik/turun, batas ujung dan batas sematan, toggle sematan, pembersihan layout.
- Riwayat perubahan di tombol `?` (v1.1.083); `sw.js`: `CACHE_VERSION` naik ke `kp-v1.1.083`; README: jumlah test.

**Pengujian**: 149 test lulus; Chromium headless 390 px (3 akun bank): turun, semat, label Disematkan, tombol ▲/▼ nonaktif di batas sematan, Selesai menyembunyikan kontrol, urutan bertahan setelah muat ulang, kartu kembali membuka detail di luar mode; tanpa error JS. **Belum teruji:** tema gelap, layar lebar, pembaca layar untuk tombol ▲ ▼, dan keyboard (Tab lalu Enter) di mode atur.

## v1.1.082 — 2 Okt 2026

**Ditambah**
- **Cari akun dan chip filter di tab Akun** (todo A7; `01-data.js`, `07-render-akun-transaksi.js`, `index.html`): fungsi murni `accountFilterMatch(acc, groupVal, isDebt, filter, query)` dan `accountFilterCounts(items)` dengan `ACCOUNT_FILTERS`. Filter: **Semua** (aktif + bagian Diarsipkan), **Ada tagihan** (akun utang dengan sisa utang > 0), **Lunas** (akun utang lunas, titipan bersaldo 0; arsip tidak ikut), **Diarsipkan**. Pencarian (debounce 180 ms) cocok ke nama atau label jenis, huruf besar/kecil tidak dibedakan, dan digabung dengan filter. Chip menampilkan jumlah per filter. State `state.accQuery` / `state.accFilter` (tidak disimpan antar sesi).
- Baris cari + chip (`#acc-filter-bar`) tampil bila akun ≥ 5 atau sedang memfilter. Saat memfilter semua kelompok dibuka (lipatan diabaikan sementara); bila kosong tampil pesan + tombol Reset filter (`resetAccFilters`).
- **8 test baru** (total 141): tiap filter, pencarian nama/jenis, gabungan, dan jumlah chip.
- Riwayat perubahan di tombol `?` (v1.1.082); `sw.js`: `CACHE_VERSION` naik ke `kp-v1.1.082`; README: jumlah test.

**Pengujian**: 141 test lulus; Chromium headless 390 px dengan data contoh + 1 akun arsip: chip berjumlah (Ada tagihan 3, Lunas 0, Diarsipkan 1), tiap filter menyaring benar, "bca" menemukan BCA dan Kartu Kredit BCA, pencarian tak cocok menampilkan pesan kosong dan Reset mengembalikan 8 akun; tanpa error JS. **Belum teruji:** tema gelap, layar lebar, pembaca layar untuk chip.

## v1.1.081 — 2 Okt 2026

**Diubah**
- **Kartu Grafik dan kartu grafiknya menjadi satu kartu di Ringkasan** (`style.css`): `#chart-group` kini yang berbingkai kartu; kartu pemilih (`#chart-period-card`: segmen + periode) dan kartu grafik aktif di dalamnya tanpa bingkai sendiri, dipisah satu garis tipis. Markup dan JS tidak berubah (tetap satu segmen aktif lewat `data-seg-off`), jadi urutan kartu, sembunyikan kartu, dan pemilihan segmen berjalan seperti sebelumnya. Grup otomatis tersembunyi bila tidak ada grafik yang tampil (`:has`). Layar lebar dan cetak ikut aturan yang sama.
- **2 test baru** (total 133): bingkai grup dan kartu dalam tanpa bingkai; selector dan semua kartu grafik berada di dalam `#chart-group`.
- Riwayat perubahan di tombol `?` (v1.1.081); `sw.js`: `CACHE_VERSION` naik ke `kp-v1.1.081`; README: jumlah test.

**Pengujian**: 133 test lulus; Chromium headless 390 px, tema terang dan gelap, data contoh: satu kartu berisi pemilih + periode + kurva kekayaan; ganti ke Tren menampilkan grafik batang di kartu yang sama; tanpa error JS. **Belum teruji:** layar lebar (≥1280 px), cetak, dan kondisi semua grafik disembunyikan lewat Profil.

## v1.1.080 — 2 Okt 2026

**Ditambah**
- **Arsip akun** (todo A4; `01-data.js`, `04-akun.js`, `04b-akun-detail.js`, `04c-akun-aset-tagihan.js`, `07-render-akun-transaksi.js`, `03-form-transaksi.js`, `05-form-titipan.js`, `10c-langganan.js`, `13-import-export.js`, `index.html`): field baru `archived: true` pada akun. Fungsi murni `archiveBlockReason(data, acc, bal)` memberi alasan bila belum boleh (titipan; saldo bukan Rp0; pinjaman masih punya bunga terjadwal; langganan aktif memakai akun itu; akun aktif terakhir) dan `activeAccounts(data)`. `setAccountArchived(id, flag)` (konfirmasi untuk arsip) dipanggil `toggleArchiveFromDetail`; tombol **Arsipkan akun / Pulihkan akun** ada di detail akun beserta teks alasan bila belum boleh.
- **Bagian "Diarsipkan"** di bawah daftar akun, terlipat bawaan (`accCollapsed._arsip === false` = dibuka). `renderAccounts` memakai `makeCard` bersama.
- **11 test baru** (total 131): syarat arsip, `activeAccounts`/`accountQuickActions`, biaya bulanan dilewati, impor `archived`, saldo historis utuh, limit kartu arsip tidak dihitung. Sandbox test kini juga memuat `04c` dan `13`.

**Diubah**
- Akun arsip tidak muncul di pilihan akun transaksi (`populateAccountSelects`; transaksi lama milik akun arsip tetap bisa diedit lewat `ensureArchivedOption`), pilihan akun titipan, pencairan pinjaman, langganan, dan chip filter transaksi (kecuali sedang dipilih). `applyRecurringFees`, `applySubscriptions`, dan `computeLimitUsage` melewati akun arsip. `accountQuickActions` kosong untuk akun arsip.
- Impor (`buildAccountFromImport`) mempertahankan `archived` hanya bila persis `true`. Sinkron cloud ikut otomatis (satu blob JSON).
- `tools/build-preview.js`: membangun pratinjau satu-halaman yang bisa dicoba langsung (bukan tangkapan layar) untuk artefak; dipakai tiap rilis.
- Riwayat perubahan di tombol `?` (v1.1.080); `sw.js`: `CACHE_VERSION` naik ke `kp-v1.1.080`; README: bagian Arsip akun dan jumlah test.

**Pengujian**: 131 test lulus, semua file lolos `node --check`; Chromium headless 390 px: akun bersaldo ditolak dengan alasan, akun saldo 0 (2 transaksi) diarsipkan dan pindah ke bagian Diarsipkan terlipat, hilang dari pilihan akun transaksi, tombol cepat tersembunyi, Pulihkan mengembalikannya; tanpa error JS. **Belum teruji:** tema gelap, layar lebar, edit transaksi lama milik akun arsip di browser (hanya lewat kode), pengarsipan pinjaman bertenor.

## v1.1.079 — 2 Okt 2026

**Diubah (keamanan; Fase 1 ROADMAP)**
- **Content-Security-Policy** (`index.html`, meta): `default-src 'self'`; `script-src 'self' https://cdn.jsdelivr.net`; `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`; `font-src https://fonts.gstatic.com`; `img-src 'self' data: blob:`; `connect-src 'self' https://*.supabase.co wss://*.supabase.co`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`. Tidak ada `<script>` inline atau handler `on*=` di `index.html`, jadi `script-src` tanpa `unsafe-inline`. `style-src` masih `unsafe-inline` karena `style=""` inline (274) belum dikurangi. Diuji di Chromium headless 390 px: render normal, tanpa pelanggaran CSP.
- **Semua atribut `data-a0/a1` dari template kini lewat `escapeHtml`** (17 tempat di `04b`, `04c`, `07`, `08`, `09`, `10-render-beranda`), supaya ID dari data cloud/impor yang tidak wajar tidak bisa keluar dari atribut.
- **Loader Supabase JS mendukung SRI** (`14-sync.js`: `SUPABASE_JS_VERSION`, `SUPABASE_JS_SRI`; `integrity` + `crossOrigin` dipasang bila hash diisi).

**Ditambah**
- `tools/pin-supabase.js`: mengunci versi persis dan menghitung hash SHA-384 dari jsDelivr, lalu mengisi dua konstanta di atas. **Belum dijalankan** (lingkungan pengembangan tidak punya akses ke jsDelivr/npm), jadi versi masih `@2` tanpa hash sampai kamu menjalankannya.
- **4 test baru** (total 120): atribut `data-aN` tak ter-escape, bentuk CSP, tanpa script/handler inline, loader SRI konsisten.
- Riwayat perubahan di tombol `?` (v1.1.079); `sw.js`: `CACHE_VERSION` naik ke `kp-v1.1.079`; README: bagian CSP dan kunci versi.

## v1.1.078 — 29 Sep 2026

**Ditambah**
- **Ringkasan atas tab Akun** (todo A5; `01-data.js`, `07-render-akun-transaksi.js`, `index.html`): dua kartu baru di bawah Total aset/Total utang. **Kekayaan bersih** = aset − utang dari `computeAssetDebt` (definisi utang sama dengan A1, jadi cocok dengan header Beranda; merah bila negatif). **Limit kartu terpakai** = `computeLimitUsage(data, balances)` (murni): jumlah terpakai ÷ jumlah limit semua kartu kredit dan PayLater yang punya limit (kartu kredit memakai saldo buku, PayLater memakai `paylaterCreditUsed`); ditampilkan sebagai persen + "Rp… dari Rp…", merah dengan ▲ bila ≥ 90%, amber bila ≥ 70% (ambang sama dengan bar kartu); kartunya tersembunyi bila tidak ada akun berlimit
- **Tombol Bayar di kartu untuk semua akun utang** (todo A6; `01-data.js`, `07-render-akun-transaksi.js`): `accountDisplayInfo` kini mengembalikan `canPay`, `payLabel`, `payAct`. Kartu kredit tetap "Bayar tagihan" (`payCardFromDetail`, tagihan cetak); PayLater "Bayar tagihan" dan pinjaman/pinjol "Bayar angsuran" lewat `payDueFromRingkasan` (alur yang sudah ada: PayLater membuka form Transfer per bulan tagihan, pinjaman membuka panel Catat pembayaran dengan nominal angsuran terisi). Hanya muncul bila ada utang (pokok > 0)
- **Aksi cepat di detail akun** (todo A6; `04c-akun-aset-tagihan.js`, `04b-akun-detail.js`, `index.html`): `quickTxnForAccount(accId, mode)` dan pembungkus `quickTxnFromDetail(mode)`. **Catat transaksi** membuka form transaksi dengan akun terpilih (untuk akun utang otomatis menjadi pengeluaran); **Transfer dari sini** membuka form Transfer dengan akun sebagai sumber (akun tujuan dipindah otomatis kalau sama dengan sumber). Aturan tombol lewat `accountQuickActions(acc)` (murni): Catat = bukan aset dan bukan titipan; Transfer dari sini = bukan akun utang (membayar utang = Transfer ke akun utang) dan bukan titipan. Tombol yang tidak berlaku disembunyikan, baris tombol hilang bila keduanya tidak berlaku
- **5 test baru** (total 116): `computeLimitUsage` (kartu + PayLater berlimit, kartu tanpa limit tidak ikut, tanpa limit = null, PayLater 95%), `accountQuickActions` untuk kas/aset/kartu kredit/pinjaman/titipan, dan tombol Bayar per jenis akun (aksi dan label)
- Riwayat perubahan di tombol `?` (v1.1.078); `sw.js`: `CACHE_VERSION` naik ke `kp-v1.1.078`; README: jumlah test

**Pengujian**: 116 test unit lulus; semua file lolos cek sintaks; Chromium headless 390 px (kas, aset, kartu kredit tagihan Rp700.000 limit Rp5 juta, PayLater Rp950.000 limit Rp1 juta, pinjaman telat, pinjol, titipan): Limit kartu terpakai 28% "Rp1.650.000 dari Rp6.000.000" dan Kekayaan bersih tampil; tombol Bayar ada di kartu kredit, PayLater ("Bayar tagihan"), pinjaman dan pinjol ("Bayar angsuran") dan tidak ada di kas/aset/titipan; Bayar angsuran membuka detail dengan panel pembayaran dan nominal Rp1.100.000; Bayar PayLater membuka Transfer ke PayLater nominal Rp950.000; Transfer dari sini (kas) membuka Transfer dengan sumber kas dan detail tertutup; Catat transaksi di kas → pemasukan akun kas, di kartu kredit → pengeluaran akun kartu; kartu kredit tanpa tombol Transfer, titipan tanpa baris tombol; tanpa scroll horizontal, tanpa error JS. **Belum teruji:** tema gelap; tampilan saat saldo disembunyikan (ringkasan Akun belum ikut mode sembunyi saldo, sama seperti Total aset/utang sebelumnya); Kekayaan bersih tidak mengikuti mode samarkan saldo; aset yang hanya bisa Transfer belum diklik langsung

## v1.1.077 — 29 Sep 2026

**Diubah**
- **Kartu akun maksimal dua baris prioritas** (todo A3; `01-data.js`, `07-render-akun-transaksi.js`, `04b-akun-detail.js`): fungsi baru `accountPriorityLines(data, acc, bal, info)` dipanggil dari `accountDisplayInfo` (hanya mode kartu, `info.lines`). Tiap baris `{ text, tone }` dengan tone `''` / `warn` (amber: jatuh tempo ≤ 7 hari atau limit ≥ 70%) / `late` (merah tebal: telat atau limit ≥ 90%). Isi per jenis:
  - **Kartu kredit:** baris 1 = sisa tagihan cetak + jatuh tempo (bila tanggal cetak dan jatuh tempo diisi; "Tagihan cetak lunas"; "Tidak ada tagihan" bila tidak terpakai; tanpa skema cetak: "Jatuh tempo tgl N"); baris 2 = "Limit terpakai N% · sisa Rp…"
  - **Pinjaman/pinjol:** baris 1 = "Angsuran ke-N Rp… · jatuh tempo tanggal" (lewat: "▲ Telat N hari · …"); baris 2 = "Terbayar N% · angsuran x/y · + bunga terjadwal Rp…"; lunas = tanpa baris (nilainya sudah "Lunas")
  - **PayLater:** baris 1 = limit terpakai; baris 2 = "Jatuh tempo tgl N · N cicilan aktif" (dua keterangan pertama)
  - **Kas/bank/e-wallet/aset/titipan:** satu baris keterangan + jumlah transaksi
- **Telat tidak hanya warna:** baris telat diawali "▲ Telat N hari" (merah tebal); limit ≥ 90% diawali "▲" (merah). Baris jatuh tempo ≤ 7 hari berwarna amber dengan "(N hari lagi)" atau "(hari ini)"
- **Dipindah ke detail:** keterangan panjang (bunga, biaya admin, skema kartu, dan seterusnya) tidak lagi di kartu; semuanya masih ada di detail akun (`metaExtra` mode detail tidak berubah). Jumlah transaksi kini tampil di kartu hanya untuk akun non-utang, dan ditambahkan ke baris keterangan detail untuk semua akun (sebelumnya hanya ada di kartu)
- Tidak ada perubahan angka: nilai utama, urutan, total kelompok, dan header tetap dari `accountDisplayInfo` (A1/A2)
- **7 test baru** (total 111): maksimal 2 baris untuk semua jenis akun, kartu kredit (sisa tagihan + jatuh tempo warn + limit), kartu tanpa pemakaian, pinjaman telat (▲, tone late, "Terbayar 0% · angsuran 0/10 · + bunga terjadwal"), pinjaman belum jatuh tempo (tanpa ▲, warn), PayLater limit 95% (▲ merah + jatuh tempo), kas
- Riwayat perubahan di tombol `?` (v1.1.077); `sw.js`: `CACHE_VERSION` naik ke `kp-v1.1.077`; README: jumlah test

**Pengujian**: 111 test unit lulus; semua file lolos cek sintaks; Chromium headless 390 px (kas, kartu kredit dengan tagihan cetak telat 9 hari, PayLater limit 95%, pinjaman telat 90 hari, pinjol 2 hari lagi, titipan): kartu utang memuat tepat 2 baris meta, kartu kredit menampilkan "▲ Telat 9 hari · Sisa tagihan cetak Rp700.000 · jatuh tempo 20 Sep 2026", pinjaman menampilkan "▲ Telat 90 hari · Angsuran ke-1 …", tombol "Bayar tagihan" tetap ada, detail akun menampilkan jumlah transaksi, tanpa scroll horizontal, tanpa error JS. **Belum teruji:** tema gelap (warna amber di teks kecil bisa kurang kontras), layar lebar (dua kolom untuk kas/bank), akun dengan nama sangat panjang

## v1.1.076 — 29 Sep 2026

**Diubah**
- **Satu fungsi bersama untuk teks kartu dan detail akun** (todo A2; `01-data.js`, `07-render-akun-transaksi.js`, `04b-akun-detail.js`): blok ±25 baris `metaExtra` yang ditulis dua kali di `renderAccounts` dan `openAccountDetail` diganti `accountDisplayInfo(data, acc, bal, opts)` → `{ valueText, color, metaExtra, pct, barColor, bar, used, limit, usedShown, canPay, sortVal, groupVal }`. `opts.detail = true` menambah keterangan yang hanya ada di detail (bunga efektif pinjol, biaya awal, admin dicicil, asuransi, "total sampai lunas"); tanpa itu = versi kartu (plus Terbayar %, Angsuran x/y · berikutnya, dan bar). Fungsi hanya membaca data, tidak menyentuh DOM
- Kartu dan detail tidak lagi berisi salinan logika sendiri, jadi tidak bisa berbeda lagi; `sortVal`/`groupVal` (urutan dan total kelompok) berasal dari fungsi yang sama dengan nilai yang tampil. Indentasi baris `feeAdminMetaText` yang salah di `renderAccounts` ikut hilang bersama blok lamanya
- **Tampilan tidak berubah** (sengaja): kartu tetap memuat semua keterangan lama. Pemangkasan kartu jadi dua baris prioritas adalah A3
- **7 test baru** (total 104): pinjaman (nilai = sisa pokok, sortVal = pokok, bunga hanya keterangan), "total sampai lunas" hanya di detail, Terbayar/Angsuran/bar hanya di kartu, bunga efektif pinjol hanya di detail, kartu kredit (Terpakai, sisa limit, pct 14%, bisa dibayar), kas dan titipan lunas, dan header Total utang = jumlah `groupVal` semua akun utang (Rp12.700.000 pada data uji)
- Riwayat perubahan di tombol `?` (v1.1.076); `sw.js`: `CACHE_VERSION` naik ke `kp-v1.1.076`; README: jumlah test

**Pengujian**: 104 test unit lulus; semua file lolos cek sintaks; Chromium headless 390 px (kas, kartu kredit Rp700.000, pinjaman Rp10 juta bunga tetap 1%/bln × 10, pinjol Rp2 juta): header Total utang Rp12.700.000 sama dengan jumlah kelompok (Rp700.000 + Rp10.000.000 + Rp2.000.000); kartu pinjaman menampilkan "Sisa pokok Rp10.000.000" dengan "+ bunga terjadwal Rp1.000.000"; detail pinjaman menampilkan "total sampai lunas Rp11.000.000", detail pinjol "Estimasi bunga efektif ≈2.5%/bln" (tidak ada di kartu), tanpa scroll horizontal, tanpa error JS. Ini sekaligus menguji tampilan A1 (v1.1.075). **Belum teruji:** tema gelap; kartu PayLater berbunga (lihat catatan v1.1.075); layar lebar

## v1.1.075 — 29 Sep 2026

**Diubah**
- **Definisi "utang" di tab Akun disamakan: pokok saja** (todo A1, pilihan a; `01-data.js`, `07-render-akun-transaksi.js`, `04b-akun-detail.js`, `11b-laporan-utang.js`): sebelumnya header "Total utang" dan kekayaan bersih memakai saldo buku (pokok), sedangkan kelompok dan kartu pinjaman memakai `computeLoanRemaining().total` (pokok + sisa bunga kontrak). Contoh uji: pinjaman Rp10.000.000, bunga tetap 1%/bln, tenor 10 bulan, ditambah kartu Rp700.000. Header menampilkan Rp10.700.000, kartu dan kelompok Rp11.000.000. Kini semuanya Rp10.700.000 (kartu Rp700.000 + pokok Rp10.000.000)
- Fungsi murni baru `loanDebtParts(data, acc, bal)` (→ `{ pokok, bunga }`, `null` untuk bukan pinjaman) dan `loanBungaNote(parts)` dipakai bersama oleh `renderAccounts` dan `openAccountDetail`, supaya kartu dan detail tidak bisa berbeda lagi (langkah awal A2)
- Kartu dan detail pinjaman: label "Sisa hutang" → "Sisa pokok"; nilai = pokok. Bunga kontrak yang belum jatuh tempo (flat maupun menurun) tampil sebagai keterangan "+ bunga terjadwal Rp…" (hanya bila pokok > 0 dan bunga > 0); detail menambah "(total sampai lunas Rp…)". Urutan dan total kelompok Pinjaman Bank/Pinjol mengikuti pokok
- Tab Laporan (Laporan utang) **sengaja tidak diubah angkanya**: total utang di sana tetap pokok + bunga terjadwal (setara "Total Sisa Pinjaman" di bank). Yang berubah hanya label: "Total semua utang (pokok + bunga terjadwal)" saat ada bunga terjadwal
- **4 test baru** (total 97): pokok dan bunga dari contoh Rp10 juta 1%/bln × 10 bln (pokok 10.000.000, bunga 1.000.000), `null` untuk kartu kredit, keluaran `loanBungaNote` (kosong bila lunas atau tanpa bunga), dan header Total utang = jumlah pokok kartu + pinjaman
- Riwayat perubahan di tombol `?` (v1.1.075); `sw.js`: `CACHE_VERSION` naik ke `kp-v1.1.075`; README: jumlah test

**Pengujian**: 97 test unit lulus; semua file lolos cek sintaks. **Belum teruji:** tampilan di browser (kartu, detail akun, label Laporan); PayLater belum disentuh: kartunya memakai `paylaterCreditUsed` (pokok kredit terpakai) sedangkan header memakai saldo buku, jadi bila ada cicilan PayLater berbunga, angka kelompok PayLater dan header masih bisa berbeda (dicatat sebagai lanjutan di A2/A3)

## v1.1.074 — 29 Sep 2026

**Diubah**
- **`computeDebtTrend` satu lintasan** (todo R9; `10f-tren-utang.js`): saldo tiap akun utang pada 6 tanggal akhir bulan kini dihitung sekaligus dalam satu telusuran transaksi (tiap transaksi menambah saldo semua tanggal yang belum terlewati), bukan `accountBalanceAsOf` per akun per bulan. Akun dengan riwayat penilaian (`hasValuations`) tetap lewat `accountBalanceAsOf`. Hasil identik dengan cara lama; sebelumnya tren utang menelusuri seluruh transaksi sebanyak (jumlah akun utang × 6) kali
- Ukur (Node, 20.000 transaksi, 12 akun, 4 akun utang, tiga kali ukur): cara lama 14–16 ms, cara baru 1–5 ms (±3–10x lebih cepat di komputer; HP lebih lambat, selisihnya lebih besar makin banyak akun utang)
- **3 test baru** (total 93), termasuk perbandingan dengan cara lama pada 300 set data acak (akun kartu/PayLater/pinjaman/kas/bank, transfer, saldo awal, kelebihan bayar) yang harus identik
- Riwayat perubahan di tombol `?` (v1.1.074); `sw.js`: `CACHE_VERSION` naik ke `kp-v1.1.074`; README: jumlah test

**Pengujian**: 93 test unit lulus; semua file lolos cek sintaks; Chromium headless 390 px (kartu kredit + transfer pembayaran): segmen Utang menampilkan total Rp800.000 (naik Rp300.000 dari akhir bulan lalu), 6 batang, label aksesibilitas benar, tanpa error JS. **Belum teruji:** waktu di HP nyata

## v1.1.073 — 29 Sep 2026

**Ditambah**
- **Proyeksi akhir bulan di kartu "Bulan ini"** (todo R8; `10b-anggaran.js`, `10-render-beranda.js`, `index.html`): `computeMonthProjection(data, monthKey, day, daysInMonth)` (murni) = pengeluaran sungguhan bulan ini (tanpa bayar utang, `isNonOperatingTxn`) ÷ hari berjalan × jumlah hari sebulan (setara sudah keluar + rata-rata harian × sisa hari). `null` bila belum ada pengeluaran atau hari tidak valid. Bila ada anggaran, dibandingkan hanya untuk kategori yang dianggarkan (proyeksi pengeluaran kategori tsb vs jumlah batasnya; total semua pengeluaran vs batas sebagian kategori tidak sebanding), status `ok`/`warn` (ambang `BUDGET_WARN_PCT`)/`over`. `renderMonthProjection` menampilkan baris "Proyeksi akhir bulan" (≈ Rp…) di blok insight, catatan "Rata-rata harian × sisa N hari" (plus "perkiraan kasar" bila hari < 7), dan baris anggaran ("▲ diperkirakan lebih …" merah / "▼ diperkirakan sisa …"). Baris disembunyikan di hari terakhir bulan (sudah pasti) dan bersama blok insight bila belum ada pengeluaran
- **6 test baru** (total 90)

**Diubah**
- Riwayat perubahan di tombol `?` (v1.1.073); `sw.js`: `CACHE_VERSION` naik ke `kp-v1.1.073`; README: jumlah test dan peta modul

**Pengujian**: 90 test unit lulus; semua file lolos cek sintaks; Chromium headless 390 px (tanggal 29 Sep, 2 pengeluaran): tanpa anggaran hanya proyeksi tampil, anggaran terlampaui → baris merah "▲ diperkirakan lebih", anggaran longgar → "▼ diperkirakan sisa", data kosong menyembunyikan blok, tanpa scroll horizontal, tanpa error JS. **Belum teruji:** tampilan tema gelap; pengeluaran besar di awal bulan (mis. sewa) membuat proyeksi terlalu tinggi karena rata-rata tidak membedakan biaya tetap dan harian (sengaja sederhana, ditandai "perkiraan kasar" di awal bulan)

## v1.1.072 — 29 Sep 2026

**Ditambah**
- **Aksesibilitas grafik** (todo R6; `09-grafik.js`, `10f-tren-utang.js`, `index.html`, `style.css`): fungsi murni `chartAriaLabel(title, geom)`, `describeChartPoint(geom, idx)`, `describePieChart(items, total, typeLabel)`, dan `trendArrow(delta)`. `bindChartInteraction` kini memanggil `applyChartA11y` tiap grafik digambar ulang: SVG mendapat `role="img"`, `tabindex="0"`, dan `aria-label` berisi judul, jumlah titik, rentang tanggal, nilai terakhir, dan petunjuk keyboard (label ikut data terbaru, termasuk penyamaran saldo). Lima grafik garis/batang (kekayaan, cashflow, tren, tren utang, tren Laporan) memakainya; judul diambil dari `CHART_TITLES` (kekayaan dan cashflow mengikuti judul kartu yang memuat periode)
- **Tooltip lewat keyboard**: fokus keyboard (`:focus-visible`, klik mouse tidak dihitung) menampilkan titik terakhir; panah kiri/kanan berpindah titik, Home/End ke ujung, Esc menutup, blur menyembunyikan. Isi titik dibacakan lewat wilayah `#chart-live` (`role="status"`, `aria-live="polite"`, kelas baru `.sr-only`). Fokus diberi cincin `:focus-visible`
- **Lingkaran kategori**: `role="img"` + `aria-label` (jenis, total, lima kategori terbesar dengan persen); baris legenda kini `role="button"` + `tabindex="0"` + `aria-label`, dan bisa dibuka dengan Enter/Spasi (sebelumnya hanya klik)
- **Naik/turun tidak hanya warna**: ringkasan kekayaan ("▲ +Rp…"), arus kas bersih, nilai per akun di legenda cashflow, dan ringkasan tren utang ("▲ naik" / "▼ turun") memakai tanda ▲/▼; legenda grafik pemasukan vs pengeluaran menjadi "▲ Pemasukan" dan "▼ Pengeluaran" (Ringkasan dan Laporan)
- **7 test baru** (total 84)

**Diubah**
- Riwayat perubahan di tombol `?` (v1.1.072); `sw.js`: `CACHE_VERSION` naik ke `kp-v1.1.072`; README: jumlah test dan peta modul

**Pengujian**: 84 test unit lulus; semua file lolos cek sintaks; Chromium headless 390 px (data contoh 3 akun, ±100 transaksi, 1 kartu kredit): kelima segmen grafik dan lingkaran kategori punya `role`/`aria-label` yang benar, fokus keyboard menampilkan titik terakhir, ArrowLeft, Home, Esc bekerja dan `#chart-live` terisi, Enter pada baris legenda membuka rincian kategori, tanda ▲ tampil di ringkasan, tanpa scroll horizontal, tanpa error JS. **Belum teruji:** pembaca layar sungguhan (TalkBack/VoiceOver/NVDA); tampilan cincin fokus di tema gelap; tooltip tetap hanya bisa dijelajahi per titik, belum per seri

## v1.1.071 — 29 Sep 2026

**Ditambah**
- **Kartu rencana yang belum dipakai jadi satu kartu ajakan** (todo R7; `09-grafik.js`, `10j-perhatian.js`, `index.html`, `02-navigasi.js`): `computePlanUsage(data)` (murni) menilai apakah anggaran (`sanitizeBudgets` tidak kosong), langganan (`sanitizeSubscriptions` tidak kosong), dan dana darurat (`sanitizeEmergencyMonths` > 0) sudah dipakai. `computeRingkasanVisibility` menandai kartu yang belum dipakai sebagai kosong (`budget-card`, `sub-card`, `emergency-card` → `data-empty`, tersembunyi otomatis dan dilewati render lewat R5). Kartu baru `#plan-cta-card` (`renderPlanCta`, `PLAN_CTAS`) menampilkan satu baris per fitur yang belum dipakai dengan tombol "Atur ›" ke form yang sudah ada (`openBudgetForm`, `openSubForm`, `openEmergencyForm`; ketiganya sheet terpisah, bukan bagian kartu, jadi tetap terjangkau saat kartu tersembunyi); kartu hilang sendiri kalau ketiganya sudah dipakai. Setelah form disimpan, `render()` menghitung ulang: kartu fitur muncul dan barisnya hilang dari kartu ajakan
- Kartu ajakan masuk `RINGKASAN_CARDS` (bisa disembunyikan lewat Profil, label "Ajakan mengatur rencana") dan `RINGKASAN_ORDER_UNITS` (bisa diurutkan; bawaan tepat setelah Dana darurat)
- **5 test baru** (total 77; termasuk 1 test urutan lama)

**Diubah**
- `sanitizeRingkasanOrder`: unit yang belum ada di urutan tersimpan kini disisipkan tepat setelah unit pendahulunya menurut urutan bawaan, bukan ditaruh di ujung (supaya pengguna yang sudah mengatur urutan tidak mendapati kartu baru terlempar ke paling bawah). Test urutan diperbarui
- **Perilaku yang berubah**: kartu Anggaran, Langganan, dan Dana darurat yang kosong sebelumnya tampil dengan teks "Belum ada …"; kini tersembunyi sampai dipakai. Teks itu masih ada di kode sebagai cadangan tetapi tidak terlihat
- Riwayat perubahan di tombol `?` (v1.1.071); `sw.js`: `CACHE_VERSION` naik ke `kp-v1.1.071`

**Pengujian**: 77 test unit lulus; semua file lolos cek sintaks; Chromium headless 390 px: data tanpa rencana → 3 kartu tersembunyi + kartu ajakan 3 baris, klik "Atur" membuka form anggaran, mengisi anggaran memunculkan kartu Anggaran dan menyisakan 2 baris ajakan, semua dipakai → ajakan hilang, urutan lama tersimpan tanpa kartu ajakan → kartu masuk setelah posisi Dana darurat, menyembunyikan kartu ajakan lewat Profil berhasil, tanpa error JS. **Belum teruji:** sentuhan nyata di HP; tampilan kartu ajakan dengan tema gelap

## v1.1.070 — 29 Sep 2026

**Ditambah**
- **Gabungkan kartu kecil ke "Bulan ini"** (todo R3; `index.html`, `10-render-beranda.js`, `09-grafik.js`, `02-navigasi.js`, `style.css`): kartu "Insight lain" (rata-rata pengeluaran/hari, pengeluaran terbesar) dan "Beban cicilan & bunga" tidak lagi berdiri sendiri; keduanya jadi blok `.month-extra` di dalam `#month-insight-card` dengan id lama dipertahankan (`more-insight-card`, `debt-burden-card`) sehingga `renderMonthInsights`/`renderDebtBurden` tidak berubah logikanya. Blok insight tampil hanya kalau ada pengeluaran bulan ini (sebelumnya lewat `data-empty`, kini `style.display` di `renderMonthInsights`); blok beban cicilan tetap tampil hanya kalau ada cicilan/bunga. Kedua id dihapus dari `RINGKASAN_CARDS` (id lama yang tersimpan di preferensi sembunyi diabaikan, tidak berbahaya), dan pengecekan render di `renderTabContent` disederhanakan jadi cukup `month-insight-card`
- **Urutan kartu Ringkasan bisa diatur** (todo R4; `09-grafik.js`, `index.html`): di Profil > Tampilan Ringkasan tiap kartu punya tombol ▲ ▼ (dinonaktifkan di ujung). Urutan disimpan per perangkat di `keuangan-ringkasan-order-v1` (tidak ikut ekspor dan tidak disinkron), dijaga oleh `sanitizeRingkasanOrder` (id asing dan duplikat dibuang, unit yang belum tersimpan ditaruh di belakang) dan `moveInOrder` (keduanya fungsi murni). `applyRingkasanOrder()` hanya memindahkan elemen DOM yang sudah ada tepat setelah kartu backup, jadi isi kartu dan pendengar kejadian tidak tersentuh. Lima kartu grafik dibungkus `#chart-group` supaya bergerak sebagai satu unit "Grafik" (di layar lebar `break-inside: avoid`). Tombol reset kini berbunyi "Tampilkan semua & urutan awal" dan mengembalikan juga urutan
- **Urutan bawaan** = usulan R4: Bulan ini → Anggaran → Langganan → Dana darurat → Nilai akun → Transaksi terbaru → Grafik. Urutan DOM sebelumnya sudah nyaris sama setelah R3, jadi tampilan awal hampir tidak berubah; yang baru adalah kemampuan mengurutkan
- **Anggaran bulan ini dan Langganan berulang kini bisa disembunyikan** (`RINGKASAN_CARDS`), dan render keduanya dilewati kalau disembunyikan (R5). Efek samping yang disengaja: baris "Perlu perhatian" untuk anggaran tetap muncul walau kartu Anggaran disembunyikan (informasinya tetap berguna); ketuk barisnya tidak menggulir apa-apa karena kartu tidak tampil
- **4 test baru** (total 72)

**Diubah**
- Judul blok di "Bulan ini" dipendekkan ("Rata-rata pengeluaran/hari", "Pengeluaran terbesar") karena konteks bulannya sudah dari judul kartu
- Riwayat perubahan di tombol `?` (v1.1.070); `sw.js`: `CACHE_VERSION` naik ke `kp-v1.1.070`

**Pengujian**: 72 test unit lulus; semua file lolos cek sintaks; Chromium headless (390 px dan 1200 px, data contoh 13 transaksi): blok insight dan beban cicilan berada di dalam kartu Bulan ini, geser ▲▼ mengubah urutan di Ringkasan, urutan bertahan setelah reload, grup Grafik bisa dinaikkan dan tetap hanya menampilkan 1 segmen, menyembunyikan Anggaran lalu reset mengembalikan urutan awal dan isi kartu, data kosong menyembunyikan blok insight/beban, tanpa scroll horizontal di desktop, tanpa error JS. **Belum teruji:** sentuhan nyata di HP; pengalaman menggeser banyak kartu berkali-kali (tidak ada drag-and-drop, sengaja sederhana)

## v1.1.069 — 29 Sep 2026

**Ditambah**
- **Satu kartu grafik dengan pilihan segmen** (todo R2; `09-grafik.js`, `index.html`, `style.css`): lima kartu grafik bertumpuk (Kekayaan bersih, Cashflow, Kategori, Tren pemasukan/pengeluaran, Tren utang) kini ditampilkan satu per satu lewat kartu "Grafik" (`#chart-period-card`) berisi tombol segmen `Kekayaan | Cashflow | Kategori | Tren | Utang`. Kartu-kartu lama dan semua id di dalamnya tidak diubah (renderer grafik tetap sama); yang ditambah hanya atribut `data-seg-off` (CSS: disembunyikan). Pilihan segmen disimpan per perangkat di `keuangan-ringkasan-segmen-v1`. Segmen yang disembunyikan pengguna atau kosong tidak muncul sebagai tombol; kalau segmen tersimpan tidak tersedia, jatuh ke segmen pertama yang tersedia; kalau semuanya mati, kartu Grafik hilang. Pemilih periode (1H–360H) pindah ke kartu ini dan hanya tampil untuk Kekayaan dan Cashflow (`CHART_SEGMENTS[].period`)
- **Lewati render kartu yang tidak tampil** (todo R5; `02-navigasi.js`, `09-grafik.js`): `computeRingkasanVisibility(data)` (murni, tanpa DOM) dihitung SEBELUM render dan dioper ke `applyRingkasanVisibility(data, vis)`. Di `renderTabContent('ringkasan')` kini dilewati: `renderAccountValues`, `renderRecentTxns`, `renderEmergencyCard`, `renderMonthInsights` (hanya kalau ketiga kartunya, Bulan ini/Beban cicilan/Insight lain, mati), dan dari kartu grafik hanya segmen aktif yang digambar. Menampilkan kembali kartu lewat Profil (`toggleRingkasanCard`, `resetRingkasanCards`) kini memanggil `renderTabContent('ringkasan')` supaya kartu yang baru tampil langsung terisi
- **5 test baru** (total 68)

**Diubah**
- `setChartPeriod` dan `toggleBalanceVisibility` hanya menggambar ulang kurva kalau segmennya sedang aktif; segmen lain digambar dengan periode/keadaan terbaru saat dipilih (selalu dari `loadData()`, jadi tidak ada data basi)
- Riwayat perubahan di tombol `?` (v1.1.069); `sw.js`: `CACHE_VERSION` naik ke `kp-v1.1.069`

**Pengujian**: 68 test unit lulus; semua file lolos cek sintaks; Chromium headless 390 px dengan data contoh (48 transaksi, 1 kartu kredit): saat awal hanya kurva Kekayaan yang tergambar (4 grafik lain 0 elemen), tiap segmen baru digambar saat dipilih, periode tampil hanya di Kekayaan/Cashflow, pilihan bertahan setelah reload, menyembunyikan "Tren total utang" membuat segmen Utang hilang dan jatuh ke Kekayaan, reset mengembalikannya, data kosong menyembunyikan kartu Grafik, tanpa error JS. **Belum teruji:** sentuhan nyata di HP; tampilan 5 tombol segmen di layar sangat sempit (dibuat wrap ke baris kedua bila tidak muat); waktu render sebelum/sesudah tidak diukur ulang

## v1.1.068 — 29 Sep 2026

**Ditambah**
- **Strip "Perlu perhatian" di puncak Ringkasan** (todo R1; `10j-perhatian.js` baru, `index.html`, `02-navigasi.js`): kartu `#attention-card` maksimal 3 baris, urut prioritas: (1) tagihan telat (merah, ▲), (2) tagihan jatuh tempo ≤7 hari (`computeUpcomingDues`), (3) anggaran bulan ini ≥80% atau terlampaui (`computeBudgetStatus`, merah kalau ada yang terlampaui, disertai "+N lainnya"), (4) dana darurat kurang (`computeEmergencyFund`, status `low`/`warn`). Kalau baris ke-4 ikut terpenuhi, yang terpotong adalah baris paling bawah (dana darurat)
- Satu tagihan = ketuk membuka detail akun; lebih dari satu tagihan digabung jadi satu baris ("N tagihan …", total) yang membuka tab Tagihan; anggaran dan dana darurat menggulir ke kartunya (`scrollToRingkasanCard`, tidak berbuat apa-apa kalau kartu disembunyikan pengguna). Baris bisa dioperasikan keyboard (Enter/Spasi)
- Kartu menghilang sendiri kalau tidak ada yang perlu diperhatikan. Fungsi hitung murni: `computeAttentionItems(data, balances, monthKey)`
- **5 test baru** (total 63)

**Diubah**
- Riwayat perubahan di tombol `?` diperbarui (v1.1.068); `sw.js`: `10j-perhatian.js` masuk `APP_SHELL`, `CACHE_VERSION` naik ke `kp-v1.1.068`; `tests/run.js` memuat modul baru

**Sengaja tidak dimasukkan**: pengingat cadangan (backup) yang disebut di usulan R1 tidak diulang di strip, karena sudah punya kartu sendiri dengan tombol "Ekspor sekarang"/"Nanti"; menaruhnya di dua tempat akan dobel

**Pengujian**: 63 test unit lulus; semua file lolos cek sintaks; Chromium headless 390 px dengan data contoh: strip tampil 3 baris berurutan benar, ketuk baris pertama membuka detail akun, strip hilang saat data aman, tanpa error JS. **Belum teruji:** sentuhan nyata di HP, dan gulir ke kartu anggaran/dana darurat dengan data nyata

## v1.1.067 — 29 Sep 2026

**Ditambah**
- **Rekonsiliasi saldo** (`10i-rekonsiliasi.js` baru, `01-data.js`, `04b-akun-detail.js`, `index.html`): bagian "Cocokkan saldo" di detail akun bertipe kas, bank, dan e-wallet (`RECONCILE_TYPES`; aset punya penilaian sendiri, akun utang punya jadwal). Isi saldo asli, "Cek selisih" menampilkan saldo app, saldo asli, dan selisih (`computeReconcileDiff` = asli − app, 2 desimal, fungsi murni). Kalau berbeda, tombol "Catat penyesuaian" membuat satu transaksi hari ini (masuk kalau selisih positif, keluar kalau negatif) berkategori **Penyesuaian saldo** (`RECONCILE_CATEGORY`, ditambahkan ke kategori masuk dan keluar). Tidak ada yang tercatat tanpa ketukan tombol; selisih dihitung ulang dari data terbaru saat tombol ditekan
- **Penyesuaian bukan pemasukan/pengeluaran**: helper baru `isNonOperatingTxn` = `isDebtFlowTxn` atau kategori penyesuaian. 17 pemanggil filter "pemasukan/pengeluaran sungguhan" (Ringkasan, grafik, Laporan, anggaran) kini memakainya. `isDebtFlowTxn` sengaja tidak diubah supaya `debtFlowsOf` tidak menghitung penyesuaian sebagai bayar/pencairan utang. Kategori ini masuk `BUDGET_EXCLUDED` (tidak bisa dianggarkan)
- **4 test baru** (total 58)

**Diubah**
- Riwayat perubahan di tombol `?` diperbarui (v1.1.067, sudah memuat ekspor `.ics` dari v1.1.066 karena hanya entri terbaru per tanggal yang tampil); `sw.js`: `10i-rekonsiliasi.js` masuk `APP_SHELL`, `CACHE_VERSION` naik ke `kp-v1.1.067`
- README: versi, deskripsi detail akun, dan "Ide yang Belum Dibuat"
- **Dokumen dirapikan (tanpa perubahan kode)**: `CHANGELOG.md` dipadatkan (v1.1.058 ke bawah jadi ringkasan satu baris; teks lengkap dipindah tanpa diubah ke `CHANGELOG-ARSIP.md`, 68 KB → 29 KB); `SUMMARY.md` dipadatkan (hasil uji per versi jadi satu tabel, todolist dikelompokkan: perlu kamu jalankan / butuh keputusan / ditunda / selesai); README: kartu Ringkasan baru, batasan denda/`.ics`/rekonsiliasi diperbarui, daftar modul bernomor diganti tabel per file, rujukan fungsi dikoreksi (`renderLaporanExtra` ada di `11c-`), dan bagian rilis jadi checklist + konvensi kode
- **Dokumen: usulan perbaikan tab Ringkasan (R1–R9) masuk `SUMMARY.md` sebagai prioritas** (belum dikerjakan); README dikoreksi: pengingat jatuh tempo ada di tab Tagihan, bukan Ringkasan

**Pengujian**: 58 test unit lulus; semua file lolos cek sintaks. **Belum teruji:** bagian "Cocokkan saldo" di browser/HP, dan tampilan transaksi penyesuaian di daftar Transaksi serta Laporan dengan data nyata

## v1.1.066 — 29 Sep 2026

**Ditambah**
- **Ekspor kalender tagihan ke `.ics`** (`10h-ics-tagihan.js` baru, `index.html`, `sw.js`): tombol "Ekspor ke kalender (.ics)" di kartu Kalender tagihan (tab Tagihan) mengunduh file iCalendar berisi semua item `computeBillCalendar` 12 bulan ke depan. Satu `VEVENT` sehari penuh per item (`DTSTART;VALUE=DATE`, `DTEND` = hari berikutnya), judul "Tagihan {akun} · {jumlah}", deskripsi berisi label dan jumlah, `TRANSP:TRANSPARENT` (tidak menandai waktu sibuk), dan `VALARM` `-P1D` (pengingat H-1). `UID` deterministik (`tagihan-{akunId}-{tanggal}-{urutan}@keuangan-pribadi`) supaya impor ulang ke kalender yang sama tidak menggandakan event di kebanyakan aplikasi kalender. Teks di-escape (`\\`, `;`, `,`, baris baru) dan baris dilipat maks 75 karakter sesuai RFC 5545. `buildBillsIcs(months, stamp)` fungsi murni; `exportBillsIcs()` memakai pola unduh yang sama dengan `exportCsv` (`downloadsCap` dulu, lalu `Blob`). Pesan hasil tampil di `#tagihan-ics-msg`. Snapshot: file tidak berlangganan, jadi kalau tagihan berubah, ekspor ulang
- **4 test baru** (total 54)

**Diubah**
- Riwayat perubahan di tombol `?` diperbarui (v1.1.066); `sw.js`: `10h-ics-tagihan.js` masuk `APP_SHELL`, `CACHE_VERSION` naik ke `kp-v1.1.066`
- README: versi, deskripsi tab Tagihan, dan daftar "Ide yang Belum Dibuat" dibersihkan (tren utang, dana darurat, denda, anggaran, langganan sudah dibuat)

**Pengujian**: 54 test unit lulus; semua file lolos cek sintaks. **Belum teruji:** tombol dan unduhan di browser/HP, serta impor file `.ics` ke Google Calendar/Apple Kalender

## v1.1.065 — 29 Sep 2026

**Ditambah**
- **Perkiraan denda keterlambatan pinjaman** (`10g-denda-telat.js` baru, `index.html`, `04-akun.js`, `04b-akun-detail.js`, `11b-laporan-utang.js`, `13-import-export.js`): dua field opsional di form akun pinjaman (bank dan online): **Denda telat (%/hari)** = `loanLateFeePercent` dan **Maks denda (% angsuran)** = `loanLateFeeCapPercent` (kosong = tanpa batas). Denda per angsuran berstatus `telat` = angsuran × persen × hari telat, dibatasi cap (`computeLateFees`, fungsi murni). Tampil di detail akun (catatan merah di atas jadwal, jumlah hari telat dan perkiraan denda per baris) dan sebagai peringatan merah di Laporan
- **Hanya perkiraan**: tidak mengubah saldo dan tidak membuat transaksi; kalau denda benar-benar ditagih, catat sendiri sebagai pengeluaran. Nilai dirapikan lewat `sanitizeLateFeePct` (0–100) dan `sanitizeLateFeeCap` (0–1000). Ikut ekspor/import (import gabung hanya mengisi akun yang belum punya persen denda), sinkron cloud, dan cadangan otomatis karena melekat pada objek akun
- **4 test baru** (total 50)

**Diubah**
- Riwayat perubahan di tombol `?` diperbarui (v1.1.065); `sw.js`: `10g-denda-telat.js` masuk `APP_SHELL`, `CACHE_VERSION` naik ke `kp-v1.1.065`

**Pengujian**: 50 test unit lulus; semua file lolos cek sintaks. **Belum teruji:** form akun, detail akun, dan Laporan di browser/HP dengan data pinjaman nyata

## v1.1.064 — 29 Sep 2026

**Ditambah**
- **Tren total utang** (`10f-tren-utang.js` baru, `index.html`, `02-navigasi.js`, `09-grafik.js`): kartu grafik batang di tab Ringkasan (di bawah "Pemasukan vs pengeluaran") berisi total utang di akhir tiap bulan selama 6 bulan terakhir (bulan berjalan sampai hari ini), dengan ringkasan naik/turun dibanding akhir bulan lalu dan tooltip per batang (memakai `bindChartInteraction` seperti grafik lain). Total = jumlah saldo negatif semua akun utang (kartu kredit, PayLater, pinjaman bank, pinjaman online) lewat `accountBalanceAsOf`; saldo positif dihitung 0. Angka mengikuti saldo yang tercatat, dan saldo awal akun dianggap ada sejak bulan pertama
- Kartu otomatis tersembunyi kalau belum ada akun utang (`applyRingkasanVisibility`) dan bisa disembunyikan lewat Profil > Tampilan Ringkasan (`RINGKASAN_CARDS`)
- **3 test baru** (total 46)

**Diubah**
- Riwayat perubahan di tombol `?` diperbarui (v1.1.064); `sw.js`: `10f-tren-utang.js` masuk `APP_SHELL`, `CACHE_VERSION` naik ke `kp-v1.1.064`

**Pengujian**: 46 test unit lulus; semua file lolos cek sintaks. **Belum teruji:** tampilan grafik di browser/HP dan tooltip sentuh

## v1.1.063 — 29 Sep 2026

**Diubah**
- **Tombol tema dikembalikan ke header, di sebelah ikon Profil** (`index.html`, `02-navigasi.js`, `style.css`): satu tombol ikon yang bergilir Sistem → Terang → Gelap (`cycleTheme`). Ikon (monitor / matahari / bulan) mengikuti `data-mode` pada tombol, diatur `applyTheme()`; `aria-label` dan `title` berisi "Tampilan: …". Blok "Tampilan" di tab Profil dihapus, sehingga tombolnya tidak ganda. Id tombol tetap `theme-toggle-btn`
- Riwayat perubahan di tombol `?` diperbarui (v1.1.063); `sw.js`: `CACHE_VERSION` naik ke `kp-v1.1.063`

**Pengujian**: 43 test unit lulus; semua file lolos cek sintaks. **Belum teruji:** tampilan di browser/HP (ukuran dan jarak tiga ikon di header)

## v1.1.062 — 29 Sep 2026

**Diubah**
- **Riwayat perubahan di tombol `?` hanya menampilkan entri terbaru untuk tiap tanggal** (`10d-changelog.js`): fungsi murni baru `changelogLatestPerDate()` menyaring `CHANGELOG_ENTRIES` saat ditampilkan. Kalau satu hari ada beberapa rilis, hanya yang paling baru yang tampil; tanggal sebelumnya tampil dengan rilis terbarunya. Data `CHANGELOG_ENTRIES` tetap lengkap (penyaringan hanya di tampilan), dan aturan ini dicatat di komentar file untuk rilis berikutnya
- **2 test baru** (total 43); `sw.js`: `CACHE_VERSION` naik ke `kp-v1.1.062`

**Pengujian**: 43 test unit lulus; semua file lolos cek sintaks. **Belum teruji:** tampilan di browser/HP

## v1.1.061 — 29 Sep 2026

**Diperbaiki**
- **Versi app tampil 2 kali di tab Profil** (`12-render-utama.js`, `index.html`, `style.css`): kartu "Keuangan Pribadi" di atas (v1.1.058) dan teks footer di bawah. Sekarang hanya kartu di atas yang menampilkan versi (isi lewat `renderProfilTab`). `#app-footer` tetap ada tapi kosong, karena dipakai `14-sync.js` sebagai jangkar status sinkron (`syncSetStatus`); `.app-footer:empty` merapatkan jaraknya
- Riwayat perubahan di tombol `?` diperbarui (v1.1.061; entri v1.1.053 dibuang supaya tetap 8 rilis)
- `sw.js`: `CACHE_VERSION` naik ke `kp-v1.1.061`

**Pengujian**: 41 test unit lulus; semua file lolos cek sintaks. **Belum teruji:** tampilan di browser/HP (posisi status sinkron di bawah tab Profil)

## v1.1.060 — 29 Sep 2026

**Diubah**
- **Riwayat perubahan di tombol `?` ditulis ulang dengan bahasa pengguna akhir** (`10d-changelog.js`): tanpa nama file, fungsi, atau istilah teknis; perubahan internal (event delegation, kelas utilitas) diringkas jadi satu kalimat "perbaikan di balik layar". Ketentuan ini dicatat di komentar file untuk rilis berikutnya. Isi `CHANGELOG.md` ini tetap teknis
- `sw.js`: `CACHE_VERSION` naik ke `kp-v1.1.060`

**Pengujian**: 41 test unit lulus; semua file lolos cek sintaks

## v1.1.059 — 29 Sep 2026

**Ditambah**
- **Dana darurat** (`10e-dana-darurat.js` baru, `index.html`, `02-navigasi.js`, `09-grafik.js`, `13-import-export.js`): kartu "Dana darurat" di tab Ringkasan (di bawah Langganan berulang). Tombol **Atur** membuka sheet untuk target dalam bulan (1–24). Target = rata-rata pengeluaran bulanan × bulan; rata-rata dihitung dari 90 hari terakhir tanpa arus utang/cicilan (data kurang dari 3 bulan dibagi umur data, minimal 1 bulan). Dana = saldo kas + bank + e-wallet (`computeLiquidFunds`). Kartu menampilkan dana, target, bar progres, persen, cukup berapa bulan, dan kekurangan. Warna: hijau ≥100%, kuning ≥50%, merah di bawahnya. Tanpa pengeluaran 90 hari, kartu meminta pengeluaran dicatat dulu (target belum bisa dihitung)
- **Data**: `data.emergencyMonths` (opsional; data lama tetap valid), dirapikan lewat `sanitizeEmergencyMonths`. Ikut sinkron cloud (sinkron mengirim seluruh data), ekspor JSON, dan cadangan otomatis. Import gabung hanya mengisi target kalau di sini belum diatur; import ganti-semua memakai target dari file
- Kartu bisa disembunyikan lewat Profil > Tampilan Ringkasan (`RINGKASAN_CARDS`)
- **6 test baru** (total 41)

**Diubah**
- `sw.js`: `10e-dana-darurat.js` masuk `APP_SHELL`, `CACHE_VERSION` naik ke `kp-v1.1.059`
- Riwayat perubahan di tombol `?` diperbarui (v1.1.059)

**Pengujian**: 41 test unit lulus; semua file lolos cek sintaks. **Belum teruji:** tampilan di browser/HP, dan sinkron `emergencyMonths` antar perangkat

---

# Ringkasan versi lama (v1.1.058 ke bawah)

## v1.1.058 — 29 Sep 2026

- Tombol `?` riwayat perubahan — di bagian atas tab Profil ada kartu "Keuangan Pribadi" berisi versi + tanggal build dan tombol `?` yang membuka sheet "…
- Jarak antarbagian seragam
- Gaya inline di tab Profil diganti kelas; yang tersisa hanya `display:none` yang diubah JS
- Tombol Enter

## v1.1.057 — 29 Sep 2026

- Langganan berulang — kartu "Langganan berulang" di tab Ringkasan (di bawah kartu Anggaran) menampilkan daftar langganan dan totalnya per bul…
- Aman antar perangkat — transaksi berID deterministik `sub-<id>-<YYYY-MM>` dan dijalankan dari `runRecurringFees()` (bukan dari `render()`), sa…
- Tidak mencatat mundur — langganan baru atau yang diaktifkan lagi mulai dicatat dari bulan ini hanya kalau tanggal tagihnya belum lewat (atau te…
- Data — `data.subscriptions` (opsional; data lama tetap valid), selalu dirapikan lewat `sanitizeSubscriptions` (maks 100, nama/…

## v1.1.056 — 29 Sep 2026

- Anggaran per kategori — kartu "Anggaran bulan ini" di tab Ringkasan (di bawah kartu "Bulan ini") menampilkan realisasi vs batas per kategori pe…
- Data — `data.budgets` = `{ kategori

## v1.1.055 — 29 Sep 2026

- Handler inline terakhir dipindah ke event delegation — tombol hapus di daftar tab Transaksi kini `data-act="deleteTxn"` dengan ID dari `data-a0` (sudah di-escape).
- `!important` dikurangi 2 — `.acc-tile` (`min-width`, `padding`) dan `.acc-accent` (`padding-left`, diganti selektor `.txn-row.acc-accent` yang leb…
- `render()` parse localStorage 1x, bukan 4x — `updateTypeAvailability`, `updatePaylaterUI`, dan `updateAssetHint` menerima `data` opsional dari `populateAccountSelec…

## v1.1.054 — 29 Sep 2026

- Sisa handler inline dipindah ke event delegation — klik latar modal (`data-backdrop`, 9 tempat), `event.stopPropagation()` (`data-stop`), `onkeydown` (Enter/Spasi pada ka…
- ID transaksi data contoh sekarang teks — baris transaksi di tab Ringkasan tidak membuka detail pada data contoh karena ID angka dibandingkan dengan `===` terhad…

## v1.1.053 — 29 Sep 2026

- Event delegation menggantikan 131 handler inline — `, plus `index.html`, `02-`, `04b-`, `04c-`, `07-`, `08-`, `09-`, `10-`, `11c-`, `12-`, `13-`)
- Perilaku tidak berubah — dibandingkan otomatis di Chromium 390 px (data contoh; 131 elemen di 7 tab, nav bawah, dan modal statis; fungsi di-stub…

## v1.1.052 — 29 Sep 2026

- 119 `style=""` inline diganti kelas utilitas — gaya yang paling sering berulang (`width:100%`, `flex:1; min-width:0`, `flex:1`, `display:flex; gap:8px`, dan margin at…
- Tampilan tidak berubah — dibandingkan otomatis di Chromium 390 px (7 tab + 3 modal detail akun, data contoh)

## v1.1.051 — 29 Sep 2026

- `04-akun.js` (1.423 baris) dipecah jadi tiga file — dan `11-laporan.js` (1.010 baris) jadi tiga file, tanpa mengubah satu baris kode pun (isi gabungan diverifikasi ide…

## v1.1.050 — 29 Sep 2026

- `manifest.json` dan ikon app masuk ke paket — sebelumnya tidak ikut di zip, jadi rujukan di `index.html` dan `sw.js` menunjuk file yang tidak ada di paket.

## v1.1.049 — 29 Sep 2026

- Bunga/biaya bulanan otomatis tidak lagi ditulis dari dalam `render()` — `applyRecurringFees()` sebelumnya jalan di setiap render dan menulis transaksi baru.
- `escapeHtml` sekarang meng-escape tanda kutip — sehingga aman dipakai di nilai atribut, dan memakai penggantian string alih-alih membuat elemen `<div>` tiap panggilan
- Sapaan memakai jam GMT+8 — seperti semua tanggal lain di app (sebelumnya jam perangkat)
- Pustaka Supabase dimuat saat dibutuhkan — `; `<script>` statis di `index.html` dihapus)
- Render pertama tidak menunggu sinkron kalau perangkat sudah punya data — app langsung menggambar dari data lokal, lalu menggambar ulang setelah sinkron selesai.
- Tab Laporan memakai saldo yang sudah dihitung `render()` — alih-alih menghitung `computeAllBalances()` sekali lagi
- Import lebih ketat — file maksimal 5 MB dan 100.000 transaksi, tanggal harus valid (`YYYY-MM-DD`, kalau tidak dipakai tanggal hari ini), nom…
- Service worker — app shell tersimpan sehingga bisa dibuka tanpa internet.
- `supabase/setup.sql` — definisi tabel `app_data` + RLS (4 kebijakan `user_id = auth.uid()`, `anon` dicabut) beserta query verifikasinya
- `tests/run.js` — 17 test unit tanpa dependensi untuk `escapeHtml`, saldo akun, nominal, biaya bulanan (idempoten + tidak ganda antar per…

## v1.1.048 — 27 Sep 2026

- Footer & status sinkron sekarang cuma tampil di tab Profil — sebelumnya elemen ini ditaruh di luar `.tab-panel#tab-profil` (tapi masih di dalam `.wrap`), jadi tetap tampil di tab m…

## v1.1.047 — 27 Sep 2026

- Footer & status sinkron dikembalikan ke posisi semula — cukup tampil di tab Profil saja (di dalam alur konten `.tab-panel#tab-profil`), tidak lagi jadi bagian dari `.bottom-na…

## v1.1.046 — 27 Sep 2026

- Posisi footer versi: sekarang di atas baris tombol navigasi — bukan di bawahnya — tetap sama-sama menjadi bagian dari `.bottom-nav-wrap` yang `position

## v1.1.045 — 27 Sep 2026

- Footer versi sekarang sticky di bawah — sebelumnya `#app-footer` (dan `#sync-status` yang disisipkan setelahnya oleh `14-sync.js`) berada di akhir alur konten…

## v1.1.044 — 25 Sep 2026

- Nama default diganti jadi "User" — sebelumnya "Made Ceplor".
- Nama file export JSON sekarang ikut jam:menit — `keuangan-user-2026-09-25.json` -> `keuangan-user-2026-09-25-2127.json` (fungsi baru `nowTimeStr()` di `01-data.js`, GM…

## v1.1.043 — 25 Sep 2026

- Tombol tampilan (sistem/terang/gelap) dipindah ke header — jadi ikon di sebelah ikon Profil

## v1.1.042 — 25 Sep 2026

- Rapikan & optimasi tab Profil — blok "Profil pemilik" (nama) dipindah dari posisi teratas ke dalam "Export & import" (di bawah "Pengaturan data lanjuta…

## v1.1.041 — 25 Sep 2026

- Nama pemilik dicabut sementara dari sapaan — fitur sinkron nama-ke-akun dari v1.1.039/v1.1.040 masih bermasalah (nama tidak update dengan andal, sempat "nyangkut" d…

## v1.1.040 — 25 Sep 2026

- Sapaan masih menampilkan nama default ("Made Ceplor") walau sudah login — v1.1.039 kirim nama pemilik ke metadata akun cuma kalau metadata masih kosong, tapi tidak mengecek dulu apakah nama lok…
- Kalau akun sudah sempat kepenuhi nama default dari v1.1.039 — buka tab Profil, ganti nama ke nama asli, tap Simpan — ini akan menimpa metadata akun dengan nama yang benar

## v1.1.039 — 25 Sep 2026

- Nama pemilik di sapaan sekarang ikut akun sinkron, bukan cuma perangkat — sebelumnya nama pemilik (dipakai di sapaan tab Ringkasan) cuma tersimpan di `localStorage` device itu sendiri, jadi log…

## v1.1.038 — 24 Sep 2026

- Tab Profil dirapikan jadi 2 tingkat — sejak tab Data digabung ke Profil (v1.1.037), tab ini jadi 7 blok pengaturan ditumpuk vertikal — kepanjangan untuk di-s…

## v1.1.037 — 24 Sep 2026

- Tab baru "Tagihan" — di nav bawah (antara Titipan dan Laporan), menggantikan slot tab "Data" (isinya dipindah ke Profil, lihat di bawah) — s…
- Tab "Data" dihapus, isinya (Data contoh, Tampilan Ringkasan, Export & import, Reset & ganti data) dipindah jadi bagian bawah tab Profil — jadi Profil sekarang berisi semua pengaturan

## v1.1.036 — 24 Sep 2026

- Tombol "Bayar bulan ini" di baris "Tagihan per bulan ke depan" dipindah ke dalam modal detail — baris di daftar sekarang cuma menampilkan ringkasan (klik untuk buka detail), tombol bayarnya cuma ada di dalam sheet `…

## v1.1.035 — 24 Sep 2026

- Modal detail per-item saat baris "Tagihan per bulan ke depan" (detail akun PayLater) diklik — sebelumnya daftar item per bulan cuma tampil ringkas terpotong (`...`) di baris itu sendiri.

## v1.1.034 — 23 Sep 2026

- Proyeksi "Tagihan per bulan ke depan" di detail akun PayLater tidak menghitung transaksi "Bayar Nanti" — `)
- Render breakdown bulanan di detail akun disesuaikan

## v1.1.033 — 23 Sep 2026

- "Total jumlah pembayaran" di jadwal angsuran pinjaman — baris baru di atas daftar per-angsuran, menjumlahkan pokok + bunga & biaya seluruh angsuran sepanjang tenor — setara fi…

## v1.1.032 — 23 Sep 2026

- Bunga terutang salah bulan saat mencatat pembayaran pinjaman bertanggal mundur — `computeLoanInterestDue()` selalu mengecek "bunga sudah dibayar" dari bulan hari ini, walau form "Catat pembayaran"…
- Field tanggal pembayaran sebelumnya tidak memicu apa pun saat diubah — hint & preview di bawahnya tetap memakai perhitungan lama sampai fie…
- Teks hint "Bunga bulan ini ..." kini menyebut nama bulan yang sebenarnya (mis.

## v1.1.031 — 23 Sep 2026

- Icon gear diganti icon user, langsung buka tab Profil — tombol di pojok kanan atas sebelumnya membuka dropdown menu (Profil / Tampilan / Sinkron) lewat `toggleSettingsMenu()`.
- Toggle Tampilan (gelap/terang) dan tombol Masuk/Keluar sinkron dipindah ke tab Profil — sebelumnya ada di dropdown menu gear yang sekarang dihapus, jadi semua pengaturan "tentang saya & tampilan" sekarang ng…
- Duplikasi kode parsing akun & transaksi import dipangkas — `importJson()` (gabung ke data yang ada) dan `resetAndImport()` (ganti semua data) sebelumnya masing-masing punya ~70 b…

## v1.1.030 — 23 Sep 2026

- Nama file export/backup sekarang berprefix identitas user — `)

## v1.1.029 — 23 Sep 2026

- Data bisa "kebawa" antar akun cloud di device yang sama (bug penting) — localStorage cuma satu untuk seluruh device, tidak dibedakan per akun.

## v1.1.028 — 23 Sep 2026

- Akun cloud baru tidak lagi ikut kebawa data contoh — sebelumnya `loadData()` selalu mengisi 7 transaksi contoh bawaan (`defaultData()`) begitu localStorage perangkat kosong.

## v1.1.027 — 23 Sep 2026

- `signUp()` di form Daftar sekarang mengirim `emailRedirectTo: location.href` — sama seperti pola yang sudah dipakai di "Lupa kata sandi" — memastikan link konfirmasi di email pendaftaran mengarah…

## v1.1.026 — 23 Sep 2026

- Masuk/daftar dengan Google (OAuth) — tombol "Masuk dengan Google" / "Daftar dengan Google" di layar Masuk & Daftar, lewat `supabase.auth.signInWithOAuth({ p…
- Setup sekali di luar app (wajib sebelum tombol Google berfungsi) — aktifkan provider Google di dashboard Supabase (Authentication → Providers → Google, isi Client ID & Secret dari Google…

## v1.1.025 — 23 Sep 2026

- Pendaftaran akun baru langsung dari layar masuk — tautan "Belum punya akun?

## v1.1.024 — 23 Sep 2026

- Sisa dropdown bawaan browser diganti jadi custom — form akun/edit akun — jenis akun, jenis nilai & periode biaya admin, jenis aset, jenis pembayaran minimum kartu kredit,…
- Panel dropdown custom sekarang ikut menyembunyikan opsi yang di-nonaktifkan lewat kode (mis.
- Filter bulan & urutkan di tab Transaksi ikut diganti juga — tampilan tetap ringkas seperti sebelumnya (ukuran/padding disesuaikan lewat CSS khusus per lokasi), cuma widget-nya sek…

## v1.1.023 — 23 Sep 2026

- Tab "Akun" dan "Data" dipindah ke nav bawah — (sebelumnya cuma bisa dibuka lewat menu pengaturan ⚙️)

## v1.1.022 — 23 Sep 2026

- Tombol + (catat transaksi) di nav bawah diganti jadi FAB (floating action button) yang melayang lepas — di pojok kanan bawah layar, bukan lagi menyatu di tengah baris nav — juga berlaku di tampilan desktop (sebelumnya di de…

## v1.1.021 — 23 Sep 2026

- Dropdown akun & kategori di form transaksi diganti jadi custom (bukan `<select>` bawaan browser) — field kategori, akun, dan akun tujuan (transfer) sekarang tampil sebagai tombol + panel pilihan sendiri, supaya tampila…

## v1.1.020 — 22 Sep 2026

- Palet warna diganti total, — menjauh dari kombinasi krem+serif+terracotta lama
- Font judul diganti dari Fraunces (serif) ke Space Grotesk (sans modern) — dipakai di `h1`, saldo besar di Ringkasan, jumlah di detail transaksi, dan layar login (logo + judul).
- Warna shadow/overlay modal disesuaikan dari coklat hangat ke gelap kehijauan biar senada palet baru
- Ikon PWA dan `manifest.json` (`theme_color`, `background_color`) ikut diperbarui ke palet baru
- Tidak ada perubahan struktur/logika — murni visual

## v1.1.019 — 22 Sep 2026

- Bisa di-install sebagai app (PWA) — menambahkan `manifest.json` + ikon serta tag terkait di `index.html`.

## v1.1.018 — 22 Sep 2026

- Hitung bunga pinjaman bunga TETAP dipercepat — `computeLoanMonthlyInterest()` sebelumnya selalu scan ulang SELURUH `data.txns` lewat `accountBalance()` untuk menghitu…

## v1.1.017 — 22 Sep 2026

- Daftar transaksi divirtualisasi — tab Transaksi kini menggambar 80 transaksi per halaman (bukan semuanya sekaligus), dengan tombol "Muat lebih banyak" un…
- Hitung saldo akun aset dipercepat — `computeAllBalances()` sebelumnya scan ulang SELURUH transaksi dari nol untuk tiap akun aset (properti/emas/forex dll —…

## v1.1.016 — 21 Sep 2026

- Anuitas (PMT) untuk bunga menurun — kalau pokok, tenor, dan suku bunga diisi tapi angsuran dikosongkan, angsuran per bulan dihitung otomatis dengan rumus a…
- Jadwal angsuran untuk pinjaman menurun — kalau tenor dan tanggal pencairan diisi, muncul jadwal angsuran, progres terbayar, dan masuk pengingat Jatuh tempo di R…
- Kolom Tenor, tanggal pencairan, dan tanggal jatuh tempo kini muncul untuk pinjaman bank juga — (sebelumnya hanya pinjaman online).
- Laporan → Total biaya utang — kini menghitung sisa bunga pinjaman menurun dari jadwal anuitas kalau datanya lengkap (sebelumnya selalu tampil "-" unt…
- Simulasi pelunasan — pinjaman menurun yang tenor/tanggal pencairan/suku bunganya lengkap tidak lagi butuh angsuran manual — angsuran anuitas…

## v1.1.015 — 21 Sep 2026

- Bayar beberapa angsuran sekaligus (pinjaman flat bertenor) — bunga kini dihitung per angsuran, bukan satu bulan saja.
- Simulasi pelunasan — pinjaman yang angsuran per bulannya belum diisi tidak lagi dianggap lunas dalam 1 bulan.
- Baris biaya di Laporan — kini akurat

## v1.1.014 — 21 Sep 2026

- Transaksi, Titipan, dan Laporan kini dua panel mulai layar 1024px — (sebelumnya 1280px), jadi laptop berlayar 1024–1279px tidak lagi terlihat seperti tampilan ponsel.
- Akun — kartu yang sendirian di grupnya kini memenuhi lebar grup, tidak lagi setengah lebar
- Di bawah 1024px tidak ada perubahan

## v1.1.013 — 21 Sep 2026

- Layar 1280px ke atas
- Layar 1024px ke atas — bagian pengaturan Data & Profil tampil sebagai kartu; tab lain tetap satu kolom selebar maksimal 760px
- Ponsel, tablet, dan Export PDF tidak berubah.

## v1.1.012 — 21 Sep 2026

- Layar 1024px ke atas — navigasi pindah ke sidebar kiri (tombol Catat transaksi di atas, lalu Ringkasan, Transaksi, Titipan, Laporan).
- Layar 1280px ke atas — tab Ringkasan tampil dua kolom (kartu operasional di kiri, grafik di kanan), sehingga halaman jauh lebih pendek
- Layar 768px ke atas — dialog konfirmasi dan sheet detail muncul di tengah layar (sebelumnya naik dari bawah); kolom isi 720px
- Efek hover pada menu navigasi
- Ponsel (di bawah 768px) dan Export PDF tidak berubah

## v1.1.011 — 21 Sep 2026

- Nama pemilik ikut tersinkron — lewat metadata akun Supabase.
- Menyimpan nama di tab Profil saat sudah login ikut memperbarui akun.
- Teks di tab Profil menyesuaikan status login

## v1.1.010 — 21 Sep 2026

- Menu gear punya opsi Masuk untuk sinkron yang tampil kalau belum login (misalnya tadi memilih "Pakai mode lokal dulu").
- Layar masuk dari menu gear punya tombol Batal.
- Kalau pustaka sinkron belum termuat (offline), muncul pesan untuk periksa koneksi lalu muat ulang
- Alur login setelah app terbuka dipakai bersama dengan alur saat boot, jadi perilakunya sama
- Teks di tab Profil disesuaikan

## v1.1.009 — 21 Sep 2026

- Layar masuk didesain ulang — tanpa kotak modal, satu kolom bersih dengan logo "Rp", judul serif, label di atas kolom, tombol tampil/sembunyikan kata…
- Layar lupa kata sandi dan kata sandi baru memakai tampilan yang sama.
- Ukuran teks kolom isian 16px supaya iOS tidak memperbesar layar saat mengetik.
- Istilah diseragamkan jadi "kata sandi" (sebelumnya campur dengan "password")

## v1.1.008 — 21 Sep 2026

- App tidak tampil sama sekali (semua angka Rp0) — `15-startup.js` masih memakai konstanta `OWNER_NAME` yang sudah diganti `getOwnerName()`, sehingga startup berhenti den…
- Data lokal rusak tidak lagi ditimpa data contoh — kalau JSON di localStorage tidak bisa dibaca (atau bentuknya salah), salinan mentahnya diamankan di key `keuangan-app-d…

## v1.1.007 — 21 Sep 2026

- Rincian utang — Proyeksi kas, Total biaya utang, dan Simulasi pelunasan dipadatkan dengan pola yang sama seperti Saran
- Proyeksi kas
- Total biaya utang
- Simulasi pelunasan
- Export PDF — semua baris lipat (termasuk Saran) dibuka otomatis saat cetak lalu dikembalikan.
- Jadwal dan sisa pinjaman, daftar jatuh tempo, dan rata-rata pemasukan dihitung sekali per render Laporan (dulu berulang di tiap kartu)
- Total biaya utang menjumlah bunga & biaya dalam satu kali lewat transaksi, bukan sekali per akun
- Input dana ekstra di Simulasi menunggu jeda ketik 120 ms sebelum menghitung ulang
- Uji dengan 6.000 transaksi

## v1.1.006 — 21 Sep 2026

- Kartu Saran di tab Laporan dipadatkan
- Ringkasan jumlah "segera / waspada" ditampilkan di judul kartu
- Saran serupa digabung (limit kartu + PayLater jadi satu; pinjol berbiaya tinggi jadi satu).
- Saran "tagihan terdekat" dihapus karena sudah ada di Proyeksi kas
- Disclaimer dikecilkan jadi satu baris

## v1.1.005 — 21 Sep 2026

- Header dirapikan
- Ikon pengaturan ⚙ diganti ikon SVG yang gayanya sama dengan ikon mata di kartu saldo, supaya tampil konsisten di semua perangkat
- Perataan eyebrow (sapaan, tanggal, ikon) dan jarak ke judul dirapikan

## v1.1.004 — 21 Sep 2026

- Footer versi — di bawah semua tab

## v1.1.003 — 21 Sep 2026

- Proyeksi kas 30/60 hari — saldo kas + bank + e-wallet setelah tagihan & angsuran terjadwal, urut per tanggal, dengan peringatan tanggal saldo dip…
- Total biaya utang — bunga, admin, asuransi, materai per akun (sudah dibayar vs sisa, persen dari pokok), plus total gabungan
- Simulasi pelunasan — input dana ekstra per bulan, membandingkan 3 skenario (tanpa ekstra, ekstra bunga tertinggi dulu, ekstra saldo terkecil…

## v1.1.002 — 21 Sep 2026

- Rincian utang — per jenis
- Kartu Saran otomatis

## v1.1.001 — 21 Sep 2026

- Field Asuransi / proteksi pinjaman (% per bulan dari pokok awal), opsional, boleh kosong
- Pilihan Cara bayar biaya admin
- Angsuran otomatis kini = pokok/tenor + bunga flat + asuransi + (admin/tenor kalau dicicil), dengan rincian di bawah field angsuran
- Meta akun menampilkan "Admin ...
- Field baru ikut Export/Import JSON dan Reset-dari-file
- Asuransi dan admin yang dicicil diperlakukan sebagai bagian "bunga & biaya" tiap angsuran, jadi otomatis ikut sisa hutang, jadwal angsuran…
- Kalau admin dicicil, pencairan tidak lagi memotong biaya admin

## v1.1.000 — basis revisi

Titik awal penomoran file.

Riwayat sebelum penomoran file (v1.0–v1.2): lihat [CHANGELOG-ARSIP.md](CHANGELOG-ARSIP.md).
