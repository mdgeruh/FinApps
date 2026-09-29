# Keuangan Pribadi

Aplikasi pencatatan keuangan pribadi berbasis web statis (HTML + CSS + JavaScript biasa, tanpa build tool). Tidak butuh instalasi atau server khusus. Data tersimpan di **localStorage browser** dan, kalau diaktifkan, disalin ke **cloud (Supabase)** supaya bisa dipakai di beberapa perangkat. Tanpa konfigurasi cloud, app berjalan 100% lokal. Kalau di-host lewat `http(s)://`, service worker menyimpan app supaya bisa dibuka tanpa internet.

Versi app: **v1.1.071** (tampil di kartu paling atas tab Profil). Kode dipecah per modul (`00-config.js` s.d. `15-startup.js`) yang dimuat berurutan oleh `index.html`.

Dokumen pendamping: [CHANGELOG.md](CHANGELOG.md) (riwayat perubahan; versi lama lengkap di [CHANGELOG-ARSIP.md](CHANGELOG-ARSIP.md)) dan [SUMMARY.md](SUMMARY.md) (status, todolist, hasil uji).

---

## Daftar Isi

- [Setup / Cara Menjalankan](#setup--cara-menjalankan)
- [Penyimpanan Data](#penyimpanan-data)
- [Tab & Fitur](#tab--fitur)
- [Tipe Akun](#tipe-akun)
- [Pinjaman Online (pinjol)](#pinjaman-online-pinjol)
- [Akun Aset — termasuk Forex & Crypto Futures](#akun-aset--termasuk-forex--crypto-futures)
- [Titipan / Piutang](#titipan--piutang)
- [Mencatat Bulan yang Sudah Lewat (Backdate)](#mencatat-bulan-yang-sudah-lewat-backdate)
- [Tab Laporan: Utang, Proyeksi & Simulasi](#tab-laporan-utang-proyeksi--simulasi)
- [Export, Import & Backup](#export-import--backup)
- [Sinkron Cloud (Supabase)](#sinkron-cloud-supabase)
- [Keterbatasan yang Perlu Diketahui](#keterbatasan-yang-perlu-diketahui)
- [Ide yang Belum Dibuat](#ide-yang-belum-dibuat)
- [Struktur Kode (untuk yang mau modifikasi)](#struktur-kode-untuk-yang-mau-modifikasi)
- [Penomoran Versi & Cara Rilis](#penomoran-versi--cara-rilis)

---

## Setup / Cara Menjalankan

Tidak ada proses instalasi. Tiga cara pakai:

1. **Buka langsung di browser** — klik dua kali `index.html` (semua file harus ada di folder yang sama). Selesai, app langsung jalan. Font dan pustaka Supabase dimuat dari internet; tanpa koneksi, app tetap jalan dengan font bawaan dan mode lokal.
2. **Install sebagai app** — app punya `manifest.json` + ikon, jadi bisa dipasang seperti aplikasi biasa (jendela sendiri, tanpa address bar):
   - **HP (Android/Chrome):** buka `index.html` di HP, titik tiga (⋮) → **"Instal aplikasi"** / **"Tambahkan ke Layar utama"**
   - **HP (iOS/Safari):** tombol Share → **"Add to Home Screen"**
   - **Desktop (Chrome/Edge):** ikon Install di address bar (kalau dibuka via `http(s)://`), atau titik tiga → **More tools/Cast, save, and share → "Create shortcut..."** lalu centang **"Open as window"**
   - Prompt install otomatis dari Chrome hanya muncul kalau app dibuka lewat `http://`/`https://` (bukan `file://` langsung) — lihat opsi "Host sendiri" di bawah. Dibuka langsung dari `file://` tetap jalan normal, cuma tanpa prompt install otomatis
3. **Host sendiri (opsional)** — taruh seluruh folder di static file server apa pun (Nginx, `python3 -m http.server`, GitHub Pages, dll). Tanpa sinkron cloud, data ada di localStorage **per-browser**, jadi tiap perangkat punya datanya sendiri. Untuk berbagi data antar perangkat, aktifkan [Sinkron Cloud](#sinkron-cloud-supabase).

**Syarat:** browser modern dengan JavaScript aktif dan localStorage tidak diblokir (jangan mode Incognito/Private kalau mau data bertahan lama — mode privat biasanya menghapus localStorage begitu jendela ditutup).

**Pindah ke versi baru:** data ada di browser, bukan di file, dan sebagian browser memperlakukan tiap lokasi/file HTML lokal sebagai penyimpanan terpisah. Cara paling aman: **Export JSON** dari versi lama, buka versi baru, lalu **Import JSON** (atau "Reset lalu isi dari file").

---

## Penyimpanan Data

- Semua akun & transaksi disimpan di `localStorage` dengan key `keuangan-app-data-v2` (format JSON). localStorage selalu jadi penyimpanan utama, jadi app tetap cepat dan jalan offline.
- **Tanpa sinkron cloud**, data 100% lokal. Kalau clear cache/data browser, uninstall browser, atau ganti perangkat, data akan hilang kecuali sudah di-**export** lebih dulu.
- **Data rusak:** kalau isi localStorage tidak bisa dibaca, app tidak menimpanya. Salinan mentah diamankan di key `keuangan-app-data-v2-corrupt`, muncul peringatan merah, dan yang tampil hanya data contoh di memori. Jangan ubah apa pun sebelum memulihkan dari backup JSON.
- Preferensi tampilan (tema, kartu ringkasan yang disembunyikan, grup akun yang di-collapse) dan nama pemilik (`kp_owner_name`) disimpan terpisah di localStorage dan **tidak ikut** ter-export ke JSON. Nama pemilik cuma dipakai sebagai awalan nama file export/backup dan tidak ikut sinkron akun; preferensi tampilan tetap per perangkat. Status sinkron ada di `kp_sync_meta`.
- **Wajib backup rutin** lewat menu Export JSON (lihat bagian [Export, Import & Backup](#export-import--backup)) — app akan mengingatkan otomatis kalau sudah lama tidak export.

---

## Tab & Fitur

**Tampilan:** ponsel memakai satu kolom dengan navigasi bawah. Tablet (768px ke atas) memakai dialog di tengah layar. Desktop (1024px ke atas) memakai sidebar kiri, dan Ringkasan tampil dua kolom mulai 1280px. Mulai 1024px, Transaksi, Titipan, dan Laporan memakai dua panel (filter atau ringkasan menempel di kiri, isi di kanan). Mulai 1280px, Ringkasan, grup akun, dan kartu pengaturan (Data, Profil) tampil dua kolom, dan isi Laporan ikut dua kolom di Data & Profil. Di 1024–1279px tab-tab ini tetap satu kolom selebar maksimal 760px.

Header menampilkan sapaan sesuai jam (GMT+8), tanggal singkat, ikon tampilan (sistem/terang/gelap), dan ikon Profil. Footer di tab Profil menampilkan nama app, nomor versi, dan tanggal build.

| Tab | Isi |
|---|---|
| **Ringkasan** | Kekayaan bersih, saldo per kategori, nilai akun, transaksi terbaru, insight bulanan, grafik (tren, kekayaan bersih, cashflow, kategori), serta kartu **Anggaran per kategori** (batas bulanan, peringatan 80%/100%), **Langganan berulang** (dicatat otomatis tiap bulan), **Dana darurat** (target dalam bulan pengeluaran), dan **Tren total utang** (6 bulan). Tiap kartu bisa disembunyikan lewat Profil > Tampilan Ringkasan; kartu yang belum ada datanya tersembunyi sendiri. |
| **Akun** | Daftar semua akun dikelompokkan per tipe, dengan progress bar untuk akun berlimit (kartu kredit/pinjaman). Tambah/edit/hapus akun, buka detail akun (saldo, riwayat, jadwal cicilan, dll). Akun kas/bank/e-wallet punya bagian **Cocokkan saldo** (rekonsiliasi): isi saldo asli, lihat selisihnya, dan catat sebagai transaksi kategori *Penyesuaian saldo* yang tidak dihitung sebagai pemasukan/pengeluaran. |
| **Transaksi** | Catat pemasukan/pengeluaran/transfer. Filter per akun, tipe, bulan, dan pencarian teks. Edit & hapus transaksi individual. Daftar dimuat bertahap (80 per halaman, tombol "Muat lebih banyak") supaya tetap ringan walau jurnalnya sudah panjang. |
| **Titipan** | Catat uang yang dititipkan/dibelanjakan untuk orang lain, atau uang yang diterima dari orang lain — tanggalnya bisa diubah untuk catat titipan bulan yang sudah lewat. Ringkasan siapa berutang & siapa dititipi lebih. Tombol **Lunasi sekarang** untuk melunasi penuh dalam satu klik. |
| **Laporan** | Ringkasan per periode (harian s.d. alltime/custom): total masuk-keluar, breakdown kategori, tren, perbandingan periode lalu, plus kartu utang: **Rincian utang, Proyeksi kas, Total biaya utang, Simulasi pelunasan, dan Saran**. Kartu utang berbentuk baris ringkas yang bisa diketuk untuk detail. Export ke PDF (print) otomatis membuka semua baris. Lihat [Tab Laporan](#tab-laporan-utang-proyeksi--simulasi). |
| **Tagihan** | Pengingat jatuh tempo 7/30/90 hari/1 tahun (kartu kredit, PayLater, pinjaman) dan kalender tagihan bulanan ke depan yang menggabungkan semua akun berutang. Ketuk satu bulan untuk rincian per akun. Tombol **Ekspor ke kalender (.ics)** membuat file kalender berisi semua tagihan 12 bulan ke depan (satu event sehari penuh per tagihan, pengingat H-1) untuk diimpor ke Google Calendar/Apple Kalender. |
| **Profil** *(ikon orang di header)* | Nama pemilik (awalan nama file export), akun sinkron (email, ubah email/kata sandi, masuk/keluar), dan **Pengaturan data lanjutan**: tampilan Ringkasan, data contoh, export/import JSON & CSV, reset (semua dengan backup otomatis sebelum aksi yang merusak data). Tombol **?** membuka riwayat perubahan ringkas untuk pengguna. |

---

## Tipe Akun

| Tipe | Perilaku |
|---|---|
| **Kas / Dompet, Bank, E-wallet** | Akun biasa: saldo naik-turun lewat transaksi masuk/keluar/transfer. |
| **Aset** *(emas, kendaraan, properti, investasi, forex, kripto, dll.)* | **Tidak** dicatat lewat masuk/keluar harian — nilainya berdasarkan **valuasi periodik** yang kamu update manual. Beli/jual tambahan dicatat lewat Transfer. Lihat detail di bagian [Akun Aset](#akun-aset--termasuk-forex--crypto-futures). |
| **Kartu Kredit** | Pengeluaran otomatis nambah tagihan; ada limit, tanggal cetak tagihan, bunga, dan skema pembayaran minimum. |
| **PayLater** | Mirip kartu kredit, mendukung cicilan flat dengan tenor & bunga per rencana. |
| **Pinjaman Bank** | Melacak sisa pokok, bunga (flat/menurun), jadwal jatuh tempo, biaya admin & materai, dan (opsional) denda telat. Panel "Catat pembayaran" di detail akun punya field tanggal sendiri — bisa dipakai untuk mencatat angsuran bulan-bulan yang sudah lewat, bukan cuma hari ini. |
| **Pinjaman Online** | Bunga selalu flat, angsuran dihitung otomatis dari pokok, tenor, dan bunga. Mendukung biaya admin (dipotong saat cair atau dicicil), asuransi/proteksi opsional, dan denda telat opsional. Lihat [Pinjaman Online](#pinjaman-online-pinjol). |
| **Titipan / Piutang** | Satu akun per orang. Saldo positif = orang itu berutang ke kamu; saldo negatif = kamu yang "berutang" (memegang titipan lebih dari mereka). Lihat [Titipan / Piutang](#titipan--piutang). |

Total **kekayaan bersih** otomatis menjumlahkan semua tipe di atas dengan tanda yang benar (piutang dihitung sebagai aset, sisa hutang & titipan lebih dihitung sebagai kewajiban).

---

## Pinjaman Online (pinjol)

Form akun tipe **Pinjaman Online** punya field berikut:

| Field | Keterangan |
|---|---|
| **Bunga flat** | Persen per bulan (atau per tahun) dari **pokok awal**, sama tiap bulan sepanjang tenor |
| **Biaya admin (% dari pokok)** | Dihitung ke Rupiah otomatis |
| **Cara bayar biaya admin** | *Dipotong dari pencairan* (default) atau *Dicicil bersama angsuran* (pencairan Rp0 biaya, gaya aplikasi pinjol seperti ShopeePay) |
| **Asuransi / proteksi (% per bulan dari pokok)** | **Opsional, boleh kosong** (kosong = tanpa asuransi) |
| **Biaya materai (sekali)** | Nominal Rupiah, opsional, dipotong saat cair |
| **Tenor, tanggal pencairan, tgl jatuh tempo** | Dasar jadwal angsuran & pengingat |

**Rumus angsuran (otomatis, bisa diubah manual):**

```
angsuran = pokok / tenor
         + pokok x bunga per bulan
         + pokok x asuransi per bulan
         + (pokok x admin% / tenor)    <- hanya kalau admin dicicil
```

Contoh: pokok Rp4.200.000, tenor 9 bulan, bunga 2,95%/bln, asuransi 0,15%/bln, admin 5% dicicil → **Rp620.200/bulan** (aplikasi aslinya Rp620.036; selisih kecil karena bunga aslinya sekitar 2,946%).

Bunga, asuransi, dan admin yang dicicil diperlakukan sebagai satu komponen "**bunga & biaya**" di tiap angsuran (kategori transaksi `Bunga & biaya bank`). Artinya sisa hutang, jadwal angsuran, dan rincian "Catat pembayaran" otomatis ikut menghitungnya.

**Pinjol yang sudah berjalan:** isi *Sisa pokok sekarang* dengan **sisa pokok yang sebenarnya**, bukan total angsuran terakhir. Kalau angka ini salah, jumlah angsuran yang dianggap lunas ikut salah (jadwal dihitung dari selisih pokok awal dan sisa pokok). Sisa hutang untuk pinjaman yang sudah berjalan memakai sisa pokok saja, karena bunga yang sudah terbayar sebelum app dipakai tidak diketahui.

---

## Akun Aset — termasuk Forex & Crypto Futures

Field pada akun tipe **Aset**:

- **Jenis aset**: Emas, Kendaraan, Properti, Investasi, **Forex / trading (akun cent)**, **Kripto / crypto futures**, atau Lainnya
- **Jumlah** & **Satuan** *(opsional)* — alat bantu hitung, bukan penentu nilai utama
- **Valuasi**: riwayat `{tanggal, nilai (Rp), harga per satuan (opsional)}` — inilah sumber kebenaran nilai akun

> ⚠️ App ini **satu mata uang (Rupiah)** — tidak ada konversi kurs otomatis (tidak ada `GOOGLEFINANCE` atau API kurs live). Semua nilai akhirnya harus dalam Rupiah, dikonversi manual oleh kamu.

**Cara pakai untuk akun forex cent:**
1. Jenis aset → "Forex / trading (akun cent)"
2. Jumlah = **equity dalam USD** (bagi saldo sen ÷ 100 dulu sebelum diinput), Satuan = `USD`
3. Setiap kali review: edit akun → update Jumlah ke equity terbaru → buka detail akun → tambah valuasi baru → isi "Harga per satuan" dengan **kurs USD/IDR hari itu** → nilai total Rp terhitung otomatis

**Cara pakai untuk akun crypto futures (margin USDT):**
1. Jenis aset → "Kripto / crypto futures"
2. Jumlah = equity dalam **USDT**, Satuan = `USDT`
3. Update berkala sama seperti di atas, tapi harga per satuan = **kurs USDT/IDR** dari exchange yang kamu pakai (bisa beda dari kurs USD resmi karena premium lokal)

Satuan `USD`/`USDT` (dan alias umum lain: IDR, EUR, GBP, SGD, JPY, BTC, ETH) otomatis dinormalisasi ke huruf besar baku, baik saat diketik manual maupun saat import dari file JSON — jadi `"usd"`, `"Usd"`, `"USD"` semuanya jadi `"USD"`.

Kalau tidak mau ribet dengan Jumlah/Satuan/Harga, kamu bisa langsung isi **nilai total dalam Rupiah** yang sudah kamu hitung sendiri di kolom valuasi, kosongkan Jumlah.

---

## Titipan / Piutang

- **"Belanjakan"** = kamu keluar uang untuk orang itu → piutang ke dia bertambah
- **"Terima bayar"** = orang itu bayar/kembalikan uang ke kamu → piutang berkurang (atau kalau tidak ada piutang sebelumnya, berarti dia menitipkan uang ke kamu)
- Tombol **"Lunasi sekarang"** di detail orang otomatis mengisi mode & nominal penuh sesuai sisa saldo — tinggal pilih akun dana dan simpan
- Hapus orang di tab ini otomatis menghapus seluruh riwayat transaksinya (beda dari akun biasa yang harus dikosongkan transaksinya dulu)

---

## Mencatat Bulan yang Sudah Lewat (Backdate)

Kalau kamu baru mulai memakai app ini padahal pinjaman/titipan sudah berjalan beberapa bulan, dua form berikut mendukung tanggal mundur (bukan cuma hari ini):

- **Pinjaman (bank/online) → detail akun → "Catat pembayaran"** — field **Tanggal** di form ini bisa diubah ke tanggal angsuran bulan lalu, bulan sebelumnya, dst. Catat satu per satu dari bulan paling lama ke paling baru, supaya perhitungan bunga terbayar & sisa pokok tetap akurat.
- **Titipan → "+ Catat titipan"** — field **Tanggal** di form ini juga bisa diubah, untuk mencatat titipan/pembayaran yang sebetulnya terjadi di bulan lalu.

**Untuk pinjaman yang memang sudah berjalan sejak sebelum pakai app ini** (bukan sekadar telat dicatat beberapa bulan), gunakan alur khusus saat *menambah akun baru*:
1. Status pinjaman → **"Sudah berjalan (sudah dipakai / dicicil sebagian)"**
2. Isi **Pokok awal saat pertama cair** (jumlah pinjaman asli) — beda dari **Sisa pokok sekarang** (saldo yang diisi di kolom saldo akun)
3. Isi **Tanggal pencairan** (tanggal asli pinjaman cair, boleh jauh di masa lalu) dan **Tenor**

Dengan kombinasi ini, jadwal angsuran otomatis menghitung mundur berapa bulan yang sudah "lunas" berdasarkan selisih pokok awal vs sisa sekarang — kamu tidak perlu mengetik ulang riwayat cicilan bulan demi bulan dari nol. Field "Catat pembayaran" di atas baru dipakai untuk angsuran-angsuran berikutnya (termasuk kalau ada yang telat dicatat).

> Catatan: field ini mengubah tanggal *transaksi* yang dicatat (pembayaran/titipan), bukan menambah field "tanggal akun dibuat" baru — akun pinjaman sudah punya field tanggal historisnya sendiri (Tanggal pencairan), dan itulah yang dipakai form-form di atas sebagai rujukan.

---

## Tab Laporan: Utang, Proyeksi & Simulasi

Selain ringkasan periode (pemasukan, pengeluaran, kategori, tren, perbandingan periode lalu), tab Laporan punya kartu-kartu berikut. Semuanya menggambarkan **kondisi saat ini**, tidak terpengaruh filter periode.

Rincian utang, Proyeksi kas, Total biaya utang, Simulasi, dan Saran memakai baris ringkas: titik status, nama, nilai, dan satu baris petunjuk. Ketuk baris (▾) untuk melihat detail; daftar panjang menampilkan sebagian dulu dan sisanya lewat "Tampilkan N lagi".

| Kartu | Isi |
|---|---|
| **Posisi saat ini** | Total aset, total utang (sisa pokok), sisa bunga kontrak, kekayaan bersih |
| **Rincian utang** | Per jenis: **Kartu kredit** (pemakaian vs limit, tagihan cetak, minimum, jatuh tempo, estimasi bunga), **PayLater** (limit terpakai, cicilan aktif, sisa bunga cicilan, tagihan periode ini), **Pinjol & Pinjaman bank** (sisa pokok + bunga & biaya, angsuran ke-n dari tenor, angsuran berikutnya, biaya efektif per bulan) |
| **Proyeksi kas 30/60 hari** | Saldo kas + bank + e-wallet setelah tagihan & angsuran terjadwal dibayar, urut per tanggal dengan saldo sesudahnya. Kalau saldo diperkirakan minus, tanggal dan tagihan penyebabnya ditandai |
| **Total biaya utang** | Bunga + admin + asuransi + materai per akun: sudah dibayar vs sisa, dan persen dari pokok |
| **Simulasi pelunasan** | Kolom dana ekstra per bulan, lalu bandingkan 3 skenario: tanpa ekstra, ekstra dengan bunga tertinggi dulu, ekstra dengan saldo terkecil dulu (cicilan yang lunas digulung ke utang lain). Hasil: bulan bebas utang dan bunga tambahan. Hasil langsung berubah saat angka diketik |
| **Saran** | Saran otomatis satu baris per poin (ketuk untuk detail), 3 tampil awal. Isinya: tagihan lewat jatuh tempo, dana 30 hari kurang, beban cicilan vs pemasukan, limit tinggi, pinjol berbiaya tinggi, pengeluaran melebihi pemasukan, beban bunga, prioritas dana ekstra |

**Cara kerja singkat:**
- **Beban cicilan** dibandingkan dengan rata-rata pemasukan bulanan 90 hari terakhir (tanpa pencairan pinjaman). Batas sehat yang dipakai: 30–35%.
- **Bunga pinjaman flat** (pinjol, dll.) dianggap sudah terkunci di saldo, jadi bayar lebih awal tidak menghemat bunga di simulasi. Manfaatnya hanya cicilan yang lunas bisa digulung ke utang lain.
- **Bunga kartu kredit** yang kosong dianggap 0% di simulasi. Isi bunganya di akun kartu supaya hasil akurat.
- Saran hanya berbasis data yang kamu catat dan bukan nasihat keuangan profesional.

---

## Export, Import & Backup

| Aksi | Fungsi |
|---|---|
| **Export JSON** | Unduh seluruh akun & transaksi sebagai `keuangan-YYYY-MM-DD.json` — ini file backup utama kamu |
| **Export CSV** | Unduh daftar transaksi (bukan akun) sebagai CSV, untuk dibuka di Excel/Sheets |
| **Import JSON** | **Gabungkan** isi file JSON ke data yang sudah ada — akun dengan nama+tipe yang sama tidak diduplikasi, transaksi baru ditambahkan |
| **Reset semua data** | Mengosongkan semua akun & transaksi (ada backup otomatis dulu sebelum dihapus) |
| **Reset lalu isi dari file** | Menghapus **semua** data lama lalu menggantinya total dengan isi file JSON yang dipilih (ada backup otomatis dulu) |

Semua field aset (Jenis, Jumlah, Satuan, Valuasi) dan field pinjol (termasuk cara bayar admin dan asuransi) ikut divalidasi & dinormalisasi konsisten di jalur Import maupun Reset-dari-file.

App juga akan menampilkan pengingat kalau kamu sudah lama tidak export (backup reminder), supaya tidak kehilangan data kalau tiba-tiba clear cache browser.

---

## Sinkron Cloud (Supabase)

Opsional. Aktif hanya kalau `SUPABASE_URL` dan `SUPABASE_ANON_KEY` di `00-config.js` terisi; kalau key dikosongkan, app 100% lokal tanpa login.

- **Cara kerja:** login email + kata sandi atau **Google** (daftar akun langsung dari layar masuk). Setelah tiap perubahan, data dikirim ke tabel `app_data` di latar belakang (jeda 1,5 detik, coba ulang tiap 30 detik kalau gagal). Status kecil di bawah footer: Tersinkron, Menyimpan, Belum terkirim, Mode lokal, atau "Ada pembaruan dari perangkat lain" (tombol Muat ulang).
- **Bentrok:** tiap baris cloud punya nomor versi. Kalau perangkat ini dan cloud sama-sama berubah, muncul dialog untuk memilih data cloud atau data perangkat ini; data yang tidak dipilih dibackup ke file JSON dulu.
- **Mode lokal dulu:** di layar login bisa memilih "Pakai mode lokal dulu". Perubahan tetap ditandai belum terkirim dan dikirim setelah login berikutnya. Kapan saja, buka tab **Profil** lalu pilih **Masuk** (opsi ini hanya tampil kalau belum login).
- **Pustaka Supabase** dimuat hanya saat dibutuhkan (`syncLoadLib()`), bukan `<script>` statis, jadi CDN yang lambat/offline tidak menahan app. Kalau perangkat sudah punya data, app langsung tampil dari data lokal lalu menyegarkan diri setelah sinkron selesai.
- **Biaya bulanan otomatis** (bunga/admin kartu & pinjaman) berID deterministik `fee-<akun>-<bulan>-...`, jadi dua perangkat tidak membuat transaksi ganda.
- **Lupa kata sandi / ganti email & kata sandi:** tersedia di layar login dan tab Profil.
- **Keamanan:** anon/publishable key memang publik, tapi **Row Level Security wajib aktif** (jalankan `supabase/setup.sql` di SQL Editor Supabase; berisi tabel, kebijakan, dan query verifikasi) supaya tiap akun hanya bisa membaca barisnya sendiri. Jangan pernah menaruh key `service_role` atau kata sandi database di file ini. Data tersimpan sebagai JSON biasa (tidak dienkripsi di sisi klien) di project Supabase kamu.
- **Keluar:** menghapus sesi login, tapi salinan data tetap ada di localStorage perangkat itu. Untuk perangkat bersama, reset data lokal setelah keluar.

---

## Keterbatasan yang Perlu Diketahui

- **Satu mata uang (Rupiah)** — tidak ada dukungan multi-currency asli; forex/kripto ditangani lewat trik "harga per satuan = kurs", bukan konversi otomatis
- **Tidak ada kurs/harga live** — semua update valuasi aset dilakukan manual
- **Asuransi pinjol** dihitung sebagai persen per bulan dari pokok awal. Kalau aplikasi pinjolmu memakai skema lain (misalnya sekali di awal), pakai kolom angsuran manual
- **Denda keterlambatan** (persen per hari + batas maksimal, diisi per akun pinjaman) hanya **perkiraan**: tidak mengubah saldo dan tidak membuat transaksi. Kalau denda benar-benar ditagih, catat sendiri sebagai pengeluaran
- **Ekspor kalender (.ics)** berupa snapshot, bukan langganan: kalau tagihan berubah, ekspor ulang
- **Rekonsiliasi saldo** hanya untuk akun kas/bank/e-wallet; aset memakai valuasi, akun utang memakai jadwal
- **Proyeksi kas** hanya menghitung tagihan & angsuran yang sudah terjadwal. Pemasukan (gaji dll.), belanja harian, dan tagihan kartu yang belum dicetak belum ikut
- **Simulasi pelunasan** memakai bunga bulanan sederhana dan tidak memasukkan belanja baru di kartu/PayLater

---

## Ide yang Belum Dibuat

- Pengecekan otomatis akun pinjaman yang sisa pokoknya tidak cocok dengan jadwal
- Layout desktop tahap 3 dan akun forex USD/cent dengan kurs

Todolist lengkap (termasuk yang menunggu keputusan) ada di [SUMMARY.md](SUMMARY.md).

---

## Struktur Kode (untuk yang mau modifikasi)

JavaScript dipecah per modul dan dimuat berurutan di akhir `index.html` (semua berbagi scope global, jadi **urutan `<script>` penting**). File baru harus didaftarkan di `index.html`, `APP_SHELL` di `sw.js`, dan daftar file di `tests/run.js` kalau fungsinya dites.

| File | Isi |
|---|---|
| `00-config` | Konfigurasi dan state terpusat (`SUPABASE_URL`/key di sini) |
| `01-data` | Lapisan data: load/save, saldo, pinjaman/anuitas, jadwal, kalender tagihan, arus utang |
| `02-navigasi` | Navigasi, header, sapaan, aksi cepat, pengingat jatuh tempo |
| `03-form-transaksi`, `05-form-titipan` | Form transaksi dan form titipan |
| `04-akun`, `04b-akun-detail`, `04c-akun-aset-tagihan` | Akun: form dan simpan, modal detail, nilai aset + bayar kartu/PayLater/pinjaman + `addTxn` |
| `06-util-ui` | Util UI (modal, toast, format, custom select) dan `dispatchDelegated()` |
| `07-render-akun-transaksi`, `08-render-titipan` | Render tab Akun/Transaksi/Tagihan dan tab Titipan |
| `09-grafik` | Grafik SVG dan pengaturan kartu Ringkasan |
| `10-render-beranda` | Tab Ringkasan |
| `10b-anggaran`, `10c-langganan`, `10e-dana-darurat`, `10f-tren-utang` | Kartu Ringkasan: anggaran, langganan berulang, dana darurat, tren utang |
| `10d-changelog` | Riwayat perubahan di tombol `?` (`CHANGELOG_ENTRIES`) |
| `10g-denda-telat`, `10h-ics-tagihan`, `10i-rekonsiliasi` | Perkiraan denda telat, ekspor `.ics`, rekonsiliasi saldo |
| `09-grafik` (urutan kartu) | `RINGKASAN_ORDER_UNITS`, `sanitizeRingkasanOrder`, `moveInOrder`, `applyRingkasanOrder`; pengaturan di Profil > Tampilan Ringkasan (▲ ▼, tersimpan per perangkat) |
| `09-grafik` (segmen) | Kartu "Grafik" di Ringkasan: `CHART_SEGMENTS`, `pickChartSegment`, `setChartSegment`; `computeRingkasanVisibility` menentukan kartu mana yang dirender |
| `10j-perhatian` | Strip "Perlu perhatian" di puncak Ringkasan (`computeAttentionItems`, `renderAttentionStrip`) dan kartu ajakan rencana (`renderPlanCta`; kartu Anggaran/Langganan/Dana darurat yang belum dipakai tersembunyi otomatis, `computePlanUsage`) |
| `11-laporan`, `11b-laporan-utang`, `11c-laporan-proyeksi` | Laporan: periode dan kategori; rincian utang dan saran; proyeksi kas, biaya utang, simulasi (`renderLaporanExtra`) |
| `12-render-utama` | Entry point `render()`, `APP_VERSION`/`APP_BUILD` |
| `13-import-export`, `14-sync`, `15-startup` | Import/export/reset, sinkron Supabase, startup (dijalankan terakhir; kode yang memanggil fungsi lintas file ditaruh di sini) |
| `sw.js`, `manifest.json`, `supabase/setup.sql`, `tests/run.js` | Service worker, PWA, skema Supabase + RLS, 58 test unit |

Titik masuk yang sering dipakai saat memodifikasi:

| Yang mau diubah | Cari |
|---|---|
| Rumus bunga/angsuran pinjaman | `computeLoanMonthlyInterest`, `computeOnlineInstallment`, `loanMonthlyFees`, `computeLoanSchedule`, `computeLoanRemaining` |
| Form akun pinjol | `updateAccFormFields`, `updateOnlineLoanEstimate`, `saveAccount` |
| Kartu-kartu di Laporan | `renderLaporanExtra` (`11c-laporan-proyeksi.js`), `laporanDebtDetailHtml`, `laporanAdviceHtml` (`11b-laporan-utang.js`), `laporanCashProjectionHtml`, `laporanDebtCostHtml`, `laporanSimulate` (`11c-laporan-proyeksi.js`) |
| Nomor versi di footer | konstanta `APP_VERSION`, `APP_BUILD` (`12-render-utama.js`) |
| Nama pemilik (awalan file export) & sapaan | `getOwnerName`, `setOwnerName` (`01-data.js`), `updateGreeting` (`02-navigasi.js`), `saveOwnerNameFromInput` (`02-navigasi.js`) |
| Denda telat, `.ics`, rekonsiliasi | `computeLateFees` (`10g-`), `buildBillsIcs` (`10h-`), `computeReconcileDiff` (`01-data.js`) dan `reconcileCheck`/`reconcileApply` (`10i-`) |
| Sinkron cloud | `syncBoot`, `syncReconcile`, `syncPush` (`14-sync.js`), konfigurasi di `00-config.js` |
| Penanganan data rusak | `loadData`, `handleCorruptData` (`01-data.js`) |
| Logika pinjaman | `computeLoanMonthlyInterest`, `computeLoanRemaining`, `computeLoanSchedule`, `loanEffectiveMonthlyRate`, `loanAnnuityPMT` (`01-data.js`), `splitLoanPayment` (`04c-akun-aset-tagihan.js`), `updateOnlineLoanEstimate` (`04-akun.js`), `laporanSimDebts`, `laporanDebtCostHtml` (`11c-laporan-proyeksi.js`) |

---

## Penomoran Versi & Cara Rilis

Nomor versi ada di `APP_VERSION` (`v1.1.NNN`) dan tampil di kartu atas tab Profil. `NNN` naik tiap batch perubahan. Detail per versi: [CHANGELOG.md](CHANGELOG.md).

**Checklist rilis** (semua dokumen ikut diperbarui tiap ada perubahan kode):

1. Naikkan `APP_VERSION` dan `APP_BUILD` (`12-render-utama.js`) **dan** `CACHE_VERSION` (`sw.js`) ke nomor yang sama.
2. File JS baru: daftarkan di `index.html`, `APP_SHELL` (`sw.js`), dan `tests/run.js` (kalau dites).
3. Dokumen: entri di [CHANGELOG.md](CHANGELOG.md) (teknis) dan `CHANGELOG_ENTRIES` di `10d-changelog.js` (bahasa awam, hanya entri terbaru per tanggal yang tampil); tandai [SUMMARY.md](SUMMARY.md) (todolist + hasil uji); perbarui README kalau fitur, struktur file, atau batasan berubah.
4. Jalankan `node tests/run.js` (semua harus lulus), cek sintaks tiap file (`node --check`), lalu buka semua tab di browser.
5. **Export JSON** dulu sebagai cadangan sebelum memasang versi baru.

**Konvensi kode**
- **Event delegation:** tulis `data-act="namaFungsi" data-a0="teks" data-n1="123"` (klik) atau `data-input-act` / `data-change-act` (argumen `data-input-a0`, `data-change-n0`, dst.), bukan `onclick="..."`. `data-a<i>` argumen teks, `data-n<i>` argumen angka. Atribut tambahan: `data-stop="1"` (berhenti setelah handler elemen ini) dan `data-backdrop` untuk menutup sheet. Ditangani `dispatchDelegated()` di `06-util-ui.js`.
- **Kelas utilitas:** `style.css` punya `u-*` (mis. `u-mb8`, `u-w100`) di bagian bawah untuk margin/lebar sederhana; pakai itu alih-alih inline style baru. Kelas utilitas kalah oleh aturan yang lebih spesifik (mis. `#tab-laporan .section-title`).
- **Transaksi non-operasional:** pembayaran utang, pencairan pinjaman, dan Penyesuaian saldo dikecualikan dari pemasukan/pengeluaran lewat `isNonOperatingTxn` (`01-data.js`); pakai helper itu untuk filter baru.

**Memasang paket zip:** timpa file lama dengan isi zip. Zip parsial hanya berisi file yang berubah; paket lengkap juga berisi `sw.js`, `supabase/setup.sql`, `tests/run.js`, `manifest.json`, dan empat ikon. Salin semua file JS baru (mis. `04b-`, `04c-`, `11b-`, `11c-`, `10b-` s.d. `10j-`).
