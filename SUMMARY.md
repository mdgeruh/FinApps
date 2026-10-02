# Ringkasan & Todolist: Keuangan Pribadi

Status per **v1.1.084** (2 Okt 2026). `[x]` selesai, `[~]` sebagian, `[-]` sengaja tidak dikerjakan, `[ ]` belum.
Detail perubahan: [CHANGELOG.md](CHANGELOG.md). Panduan pemakaian dan struktur kode: [README.md](README.md).

## 1. Gambaran singkat

App web statis (HTML + CSS + JS biasa, tanpa build tool), ±492 KB JS tanpa minify, 29 file JS modular + `sw.js`. Data di `localStorage` (`keuangan-app-data-v2`), sinkron cloud Supabase (email + Google) sebagai **satu blob JSON per user** dengan kunci versi. Fitur inti: akun (kas/bank/e-wallet/aset/kartu kredit/PayLater/pinjaman/pinjol), titipan, laporan utang, kalender tagihan, anggaran, langganan, dana darurat, export/import.

## 2. Koreksi terhadap analisis awal

| Temuan lama | Yang sebenarnya |
|---|---|
| E1: skrip Supabase memblokir render | Skrip di akhir `<body>`; yang tertahan adalah startup app. Sudah diperbaiki lewat lazy-load |
| E3: `computeAllBalances()` dihitung ulang di ≥10 tempat | Sebagian besar handler aksi terpisah. Duplikasi nyata hanya di tab Laporan (sudah diperbaiki) |
| E7: pencarian tanpa debounce | Sudah ada (220 ms) |
| E10: listener grafik menumpuk | Tidak; dijaga `svg.dataset.interactiveBound` |
| Import menerima ID dari file | Tidak; ID selalu dibuat baru lewat `generateId()` |
| Nominal pecahan = bug | Bukan; bunga/pajak bunga bank dengan sen yang sah. Hanya dirapikan ke 2 desimal |

## 3. Todolist

Tanda: **[K]** keamanan/kebenaran, **[E]** efisiensi, **[Q]** kualitas/dokumentasi, **[F]** fitur.

### PRIORITAS UTAMA SEKARANG: perbaikan tab Akun (A1 selesai v1.1.075, A2 selesai v1.1.076, A3 selesai v1.1.077, A5 + A6 selesai v1.1.078, A4 selesai v1.1.080, A7 selesai v1.1.082, A8 selesai v1.1.083; A9 berikutnya)

Optimalisasi (bagian "Ditunda" di bawah) **dilewati dulu atas permintaanmu**; tidak dikerjakan sampai kamu minta. Fokus berikutnya adalah tab Akun.

Dasar temuan (dibaca dari `07-render-akun-transaksi.js`, `04b-akun-detail.js`, `04-akun.js`, dan dicoba di Chromium 390 px dengan kartu kredit, PayLater, dan pinjaman bunga tetap):
- **Angka tidak konsisten.** Contoh uji: pinjaman Rp10.000.000 bunga 1%/bln tenor 10 bulan. Header "Total utang" menampilkan **Rp10.700.000** (kartu Rp700.000 + pokok pinjaman Rp10.000.000), tetapi kelompok Pinjaman Bank dan kartunya menampilkan **Rp11.000.000** (pokok + sisa bunga tetap Rp1.000.000). Penyebabnya: `computeAssetDebt` (dipakai header dan kekayaan bersih) memakai saldo buku, sedangkan tampilan kartu memakai `computeLoanRemaining().total`
- Akun tidak bisa dihapus kalau masih punya transaksi ("hapus transaksinya dulu", `deleteAccount`), dan tidak ada arsip. Kartu yang sudah ditutup atau pinjaman lunas menetap di daftar selamanya; data aslimu sudah 26 akun
- Teks kecil di tiap kartu menyambung sampai 8 potongan (bunga, biaya admin, skema kartu, terbayar, angsuran, berikutnya, jumlah transaksi). Kartu kredit tidak menampilkan jatuh tempo dan sisa tagihan cetak padahal detailnya punya (`cardStatementInfo`)
- Blok teks kartu (±25 baris `metaExtra`) ditulis dua kali, di `renderAccounts` dan `openAccountDetail`, dan sudah mulai berbeda: detail punya sisa pokok + bunga, estimasi bunga efektif, biaya awal, dan asuransi; kartu tidak
- Ringkasan atas hanya dua angka (aset, utang). Satu-satunya aksi cepat di kartu adalah "Bayar tagihan" khusus kartu kredit. Urutan otomatis (nilai terbesar), tidak ada pencarian atau penyematan

Urut dari dampak terbesar ke terkecil:

- [x] **A1 [K] (selesai v1.1.075, pilihan a: pokok saja) Samakan definisi "utang" di header, kelompok, kartu, dan kekayaan bersih.** Utang = pokok (saldo buku); bunga tetap yang belum jatuh tempo hanya keterangan "+ bunga terjadwal" di kartu dan "total sampai lunas" di detail. `loanDebtParts`/`loanBungaNote` dipakai bersama kartu dan detail. Laporan utang sengaja tetap pokok + bunga (label diperjelas). Sisa: PayLater berbunga (kartu memakai `paylaterCreditUsed`, header memakai saldo buku) bisa masih berbeda; ikut ditangani di A2/A3
- [x] **A2 [Q] (selesai v1.1.076; tampilan sengaja tidak berubah, pemangkasan ada di A3) Satu fungsi bersama untuk teks kartu dan detail akun** (`accountDisplayInfo(data, acc, bal, { detail })` di `01-data.js`): kartu dan detail tidak bisa berbeda lagi; `sortVal`/`groupVal` berasal dari fungsi yang sama. Indentasi baris `feeAdminMetaText` ikut rapi
- [x] **A3 [F] (selesai v1.1.077) Kartu akun lebih ringkas dan berguna:** maksimal dua baris prioritas lewat `accountPriorityLines` (kartu kredit: sisa tagihan cetak + jatuh tempo, lalu limit; pinjaman: angsuran berikutnya + tanggal, lalu terbayar/bunga terjadwal; PayLater: limit + jatuh tempo). Baris telat merah dengan "▲ Telat N hari", limit ≥ 90% juga ▲; keterangan panjang pindah ke detail (yang kini juga memuat jumlah transaksi). Belum teruji: tema gelap dan layar lebar
- [x] **A4 [F] (selesai v1.1.080) Arsipkan akun** (pengganti "hapus dulu semua transaksi"): hanya untuk akun bersaldo 0 atau lunas; akun arsip hilang dari daftar dan dari pilihan transaksi baru, masuk bagian "Diarsipkan" yang terlipat; riwayat, laporan, dan saldo historis tetap utuh; bisa dipulihkan. Menambah field `archived` (perlu masuk sanitasi, ekspor/impor, dan sinkron cloud serta test)
- [x] **A5 [F] (selesai v1.1.078) Ringkasan atas tab Akun:** kartu Kekayaan bersih (aset − utang, definisi A1) dan Limit kartu terpakai (`computeLimitUsage`: kartu kredit + PayLater berlimit; merah ▲ ≥90%, amber ≥70%; tersembunyi bila tidak ada limit)
- [x] **A6 [F] (selesai v1.1.078) Aksi cepat di kartu/detail akun:** tombol Bayar di kartu kini juga untuk PayLater ("Bayar tagihan") dan pinjaman/pinjol ("Bayar angsuran") lewat alur `payDueFromRingkasan` yang sudah ada; detail akun punya "Catat transaksi" dan "Transfer dari sini" dengan akun terisi otomatis (`quickTxnForAccount`, aturan di `accountQuickActions`: akun utang tidak jadi sumber transfer, aset hanya Transfer, titipan tidak ada)
- [x] **A7 [F] (selesai v1.1.082) Cari akun dan chip filter** (Semua | Ada tagihan | Lunas | Diarsipkan) untuk daftar panjang; pola sama dengan filter tab Transaksi
- [x] **A8 [F] (selesai v1.1.083) Sematkan dan urutkan manual:** tombol ▲ ▼ per akun, tersimpan per perangkat (pola R4), akun yang disematkan tampil di puncak kelompoknya
- [x] **A9 [Q] (telaah selesai 2 Okt 2026, hasil di bawah; perbaikan = A9a–A9c; A9a selesai v1.1.084, A9b selesai v1.1.085, A9c selesai v1.1.086) Form tambah/edit akun** (satu sheet panjang dengan baris bergantung jenis akun): **belum ditelaah**; ditelaah dulu sebelum diusulkan perubahan apa pun

**Hasil telaah form akun (A9)**, diukur di Chromium 390 px (tinggi panel sheet 743 px) dan dibaca dari `index.html` + `saveAccount` di `04-akun.js`:

| Jenis akun | Kontrol tampil | Tinggi isi form | Catatan |
|---|---|---|---|
| Kas, Bank, E-wallet, Titipan | 2 | 274 px | cukup |
| PayLater | 4 | 418 px | cukup |
| Aset | 4 | 492 px | 1 blok bantuan 452 karakter |
| Kartu kredit | 8 | 689 px | muat satu layar, padat |
| Pinjaman bank / online | 12 | 1027 / 1092 px | ±1,4–1,5 layar, 5 blok bantuan ±494 karakter |

Temuan, dari yang paling berdampak:
- **[K] Pesan galat form tidak terlihat (terkonfirmasi di browser).** `saveAccount` memanggil `showIoMsg(...)` tanpa target, sehingga teks masuk ke `#io-msg` milik tab Data yang tidak tampil. Contoh: menyimpan dengan nama yang sudah dipakai ("Nama ... sudah dipakai akun lain") tidak menampilkan apa pun, hanya fokus pindah. Berlaku untuk semua ±8 validasi di form (nama ganda, limit kosong, tanggal jatuh tempo, persen minimum > 100, pokok awal, biaya admin > pokok, angsuran pinjol), dan nama kosong tidak diberi pesan sama sekali. Pesan galat `deleteAccount` ("hapus transaksinya dulu") dan alasan arsip yang diklik saat belum boleh memakai jalur yang sama.
- **[K] Isian dibuang diam-diam.** Biaya admin kartu hanya disimpan bila tanggal jatuh tempo juga diisi, begitu pula bunga bulanan (`feeAmountVal > 0 && feeDayVal > 0`); kalau tanggal kosong, nominal yang diketik dibuang tanpa peringatan. Hal serupa untuk denda telat tanpa persen.
- **[F] Saldo awal ada paling bawah dan tanpa label tampak.** Field terpenting bagi pinjaman (sisa pokok) berada setelah 11 kontrol lain, dan placeholder-nya terpotong di 390 px ("Sisa pokok belum dibayar SEKARANG (Rp), b…"). Nama akun, saldo, jumlah/satuan aset, pembayaran minimum, dan suku bunga hanya punya placeholder (ada `aria-label`, tapi tidak ada label tampak); beberapa placeholder terpotong ("%, opsic", "kosong = tanpa bat").
- **[F] Pinjaman: semua isian opsional tampil sekaligus** (materai, tabungan wajib, denda telat + maksimum, tanggal jatuh tempo, admin, angsuran), ditambah 5 blok bantuan permanen. Bagian yang wajib hanya jenis, saldo/pokok, dan (untuk pinjol) bunga + tenor.
- **[Q] Pengelompokan:** kartu kredit memisahkan dua tanggal yang saling bergantung (cetak dan jatuh tempo) oleh isian lain; aturan "diisi bersama" hanya diketahui lewat pesan galat (yang tidak terlihat, lihat atas).
- Sudah baik: semua kontrol punya `aria-label`, dan label muncul/berubah sesuai jenis akun; tidak ada error JS saat berganti jenis akun.

Usulan perbaikan (dikerjakan berurutan, tiap batch satu rilis dengan test):
1. **A9a [K]** (selesai v1.1.084; A9b selesai v1.1.085, A9c selesai v1.1.086) Pesan galat tampil di dalam sheet (`acc-form-msg` di atas tombol Simpan, fokus ke field bermasalah, `role="alert"`), pesan untuk nama kosong, dan isian yang akan dibuang diberi peringatan atau pasangan wajibnya ditandai.
2. **A9b [F]** Label tampak untuk Nama dan Saldo; Saldo awal dipindah ke tepat di bawah Jenis akun (sebelum isian khusus jenis); placeholder dipendekkan dan penjelasan panjang pindah ke teks bantu satu baris.
3. **A9c [F]** Pinjaman: bagian "Lainnya (opsional)" terlipat untuk materai, tabungan wajib, denda telat, dan sejenisnya; blok bantuan menjadi satu baris atau terlipat. Perkiraan: tinggi pinjaman turun dari ±1.030 px mendekati satu layar (perkiraan, belum diukur).

Urutan kerja yang disarankan: A1 (selesai) → A2 (selesai) → A3 (selesai) → A5 + A6 (selesai) → A4 (selesai) → A7 (selesai) → A8 (selesai) → A9. Tiap batch naik satu versi dan memperbarui CHANGELOG, riwayat `?`, README, SUMMARY, serta menambah test.

### Perbaikan tab Ringkasan (R1–R9 selesai semua; dicatat sebagai arsip)

Dasar temuan: Ringkasan menumpuk **14 kartu** dalam satu gulir panjang. **Tidak ada peringatan tagihan** di sini (pengingat jatuh tempo ada di tab Tagihan). Semua kartu dihitung walau disembunyikan atau kosong, karena `applyRingkasanVisibility` baru jalan setelah render. Grafik tidak punya label aksesibilitas. Kartu hanya bisa disembunyikan, tidak bisa diurutkan. Performa hitung ternyata bukan masalah: pada 20.000 transaksi, `computeDebtTrend` ±19 ms, `computeBudgetStatus` ±10 ms, `emergencyMonthlyExpense` ±4 ms (native; ±4x lebih lambat di HP), jadi optimasi hitung ditaruh paling bawah.

Urut dari dampak terbesar ke terkecil:

- [x] **R1 [F] (selesai v1.1.068; pengingat backup tidak diulang karena sudah punya kartu sendiri) Strip "Perlu perhatian" di puncak Ringkasan.** Maksimal 3 baris, dari `computeUpcomingDues` (telat atau ≤7 hari), anggaran ≥80%, dana darurat kurang, backup lama. Ketuk membuka tab atau akun terkait; strip hilang sendiri kalau tidak ada apa-apa. Ini informasi paling penting bagi pemakai dengan banyak utang, dan sekarang harus pindah ke tab Tagihan dulu
- [x] **R2 [F] (selesai v1.1.069; kartu lama dipertahankan, hanya segmen aktif ditampilkan dan digambar) Satu kartu grafik dengan pilihan segmen** (Kekayaan | Cashflow | Kategori | Tren | Utang) menggantikan 5 kartu grafik bertumpuk. Hanya segmen aktif yang digambar, jadi gulir lebih pendek dan hitung lebih sedikit. Pemilih periode ikut ke kartu ini
- [x] **R3 [F] (selesai v1.1.070) Gabungkan "Insight lain" dan "Beban cicilan & bunga" ke kartu "Bulan ini"** sebagai baris tambahan, supaya 3 kartu kecil jadi 1
- [x] **R4 [F] (selesai v1.1.070; urutan bawaan sudah sesuai usulan setelah R3, tombol ▲ ▼ di Profil) Susun ulang urutan default dan izinkan urut ulang.** Urutan usulan: Bulan ini → Rencana (anggaran, langganan, dana darurat) → Nilai akun → Transaksi terbaru → Grafik. Di Profil > Tampilan Ringkasan tambah tombol naik/turun selain sembunyikan (urutan disimpan per perangkat seperti `RINGKASAN_HIDDEN_KEY`)
- [x] **R5 [E] (selesai v1.1.069) Lewati render kartu yang disembunyikan atau kosong.** Hitung visibilitas sebelum render, bukan sesudah (`renderTabContent` di `02-navigasi.js`)
- [x] **R6 [Q] (selesai v1.1.072; pembaca layar sungguhan belum diuji) Aksesibilitas grafik:** `role="img"` + `aria-label` ringkasan tiap SVG (judul, rentang, nilai terakhir), tooltip bisa lewat fokus keyboard (panah, Home, End, Esc; isi titik dibacakan lewat `#chart-live`), lingkaran kategori berlabel dengan legenda yang bisa dibuka lewat Enter/Spasi, dan naik/turun tidak hanya dibedakan warna (▲/▼ di ringkasan dan legenda)
- [x] **R7 [F] (selesai v1.1.071; kartu kosong tersembunyi otomatis, diganti satu kartu ajakan) Kartu Rencana yang belum dipakai** (anggaran, langganan, dana darurat kosong) tampil sebagai satu baris ajakan atau tersembunyi otomatis, bukan kartu kosong penuh
- [x] **R8 [F] (selesai v1.1.073; dibandingkan hanya dengan kategori beranggaran) Proyeksi akhir bulan di kartu "Bulan ini":** pengeluaran sungguhan ÷ hari berjalan × jumlah hari sebulan; kalau ada anggaran, tampil apakah kategori beranggaran diperkirakan melewati batas (▲) atau sisa (▼). Tersembunyi di hari terakhir dan tanpa pengeluaran
- [x] **R9 [E] (selesai v1.1.074; hasil identik dengan cara lama, dijaga test acak) `computeDebtTrend` satu lintasan:** saldo semua akun utang pada 6 tanggal akhir bulan dihitung dalam satu telusuran transaksi, bukan `accountBalanceAsOf` per akun per bulan. Ukur 20.000 transaksi: 14–16 ms → 1–5 ms

Urutan kerja yang disarankan (R1–R9 sudah selesai; semua item Ringkasan tuntas): R1 → R2 + R5 (satu batch, saling terkait) → R3 + R4 → R7 → R6 → R8 → R9 (urutan R1–R9 sudah dijalankan). Tiap batch naik satu versi dan memperbarui CHANGELOG, riwayat `?`, README, dan SUMMARY.

### Perlu kamu jalankan (tidak bisa saya lakukan)
- [-] [K] Kunci versi `supabase-js` + SRI (`node tools/pin-supabase.js`): sengaja dilewati dulu atas permintaanmu (2 Okt 2026); Supabase tetap `@2`. Begitu juga RLS/uji sinkron: fokus ke pengembangan fitur, lihat ROADMAP.md
- [ ] [K] Jalankan `supabase/setup.sql` di Supabase SQL Editor dan uji RLS dengan dua akun (langkah ada di akhir file SQL)
- [ ] [K] Uji sinkron sungguhan: login, push, bentrok dua perangkat, ganti akun di satu perangkat
- [ ] [E] Ukur performa di HP nyata; kalau terasa lambat, hasilnya jadi dasar memilih E2 atau E5

### Butuh keputusanmu
- [ ] [K] Enkripsi data cloud. Enkripsi klien berarti lupa passphrase = data tidak bisa dipulihkan, dan data tidak bisa dibaca di dashboard Supabase
- [ ] [F] Desktop tahap 3 (belum ada rinciannya di dokumen mana pun)
- [ ] [F] Akun forex USD/cent dengan kurs (sekarang lewat aset + trik harga per satuan)
- [ ] [K] Sapaan: kode dan CHANGELOG mengikuti v1.1.041 (sapaan tanpa nama). Kalau ingin sapaan dengan nama, bilang saja

### Ditunda (hasil ukur: belum perlu; optimalisasi dilewati dulu atas permintaanmu)
- [~] [E] E2 cache hasil parse `loadData()`: `render()` sudah parse 1x (bukan 4x, v1.1.055). Cache global ditunda: ±65 pemanggil, banyak yang memodifikasi hasilnya, butuh refactor dan test lebih lengkap. Manfaat terukur ±2x di 5.000 transaksi, tidak terasa di 187
- [-] [E] E5 indeks transaksi per bulan/akun: ukur ulang 2 Okt 2026 menunjukkan `render()` 30–88 ms di 5.000 transaksi (CPU 4x), tidak perlu sekarang (lihat bagian 4)
- [ ] [E] E8 build minify/gabung: tidak ada minifier di lingkungan ini dan butuh keputusan alur kerja (sumber modular tetap dijaga)
- [ ] [E] E6 sinkron per-item (bukan satu blob)
- [ ] [E] Hosting sendiri Supabase JS dan font (sekarang di-cache service worker setelah pemuatan online pertama)
- [ ] [Q] Namespace / ES modules (semua berbagi scope global; perubahan besar di ratusan pemanggilan)
- [ ] [Q] Kurangi `style=""` inline dan `!important` yang tersisa. Sudah 393 → 274 inline (v1.1.052) dan 2 `!important` dihapus (v1.1.055); sisanya sengaja dibiarkan: `display:none` yang diubah JS, warna SVG grafik, `.section-title`, blok `@media print`, `[data-user-hidden]`/`[data-empty]`, aturan desktop yang menimpa inline

### Sudah selesai
- [x] [K] Sapaan/nama pemilik disamakan dengan CHANGELOG v1.1.041; `supabase/setup.sql` (tabel + RLS + 4 kebijakan + query verifikasi)
- [x] [K] Biaya bulanan otomatis keluar dari `render()`, berID deterministik, tidak ganda antar perangkat
- [x] [K] `escapeHtml` aman untuk atribut; import dibatasi 5 MB / 100.000 transaksi dengan validasi tanggal dan nominal; nominal dirapikan ke 2 desimal
- [x] [E] Supabase JS lazy-load; Laporan memakai saldo dari `render()`; service worker `sw.js` (network-first, tidak menyentuh `*.supabase.co`)
- [x] [Q] Sapaan memakai jam GMT+8; test unit `tests/run.js`; event delegation `data-act` (semua handler inline, v1.1.053–055); `04-akun.js` dan `11-laporan.js` dipecah (v1.1.051)
- [-] [E] E9 (jangan bangun ulang `<select>` tiap render): tidak dikerjakan, rebuild murah dan menahannya berisiko pilihan dropdown basi
- [-] [K] Cache DOM `$()` basi: belum ada kasus nyata. Kalau elemen dibuat ulang lewat `innerHTML` dan dicari lewat `$()`, pakai `document.getElementById`
- [x] [F] Anggaran per kategori (v1.1.056) · Langganan berulang (v1.1.057) · Dana darurat (v1.1.059) · Tren total utang (v1.1.064) · Denda keterlambatan pinjaman, hanya perkiraan (v1.1.065) · Ekspor kalender `.ics` (v1.1.066) · Rekonsiliasi saldo kas/bank/e-wallet (v1.1.067)
- [x] [F] Strip "Perlu perhatian" di Ringkasan (R1, v1.1.068) · Kartu Grafik bersegmen (R2, v1.1.069) · Lewati render kartu tidak tampil (R5, v1.1.069) · Kartu kecil digabung ke Bulan ini (R3, v1.1.070) · Urutan kartu bisa diatur (R4, v1.1.070) · Kartu rencana kosong jadi satu ajakan (R7, v1.1.071) · Aksesibilitas grafik (R6, v1.1.072) · Proyeksi akhir bulan (R8, v1.1.073) · Tren utang satu lintasan (R9, v1.1.074)
- [x] [K] (v1.1.079) Content-Security-Policy, semua atribut `data-aN` di-escape, loader SRI siap pakai (hash menunggu `tools/pin-supabase.js`)
- [x] [F] (v1.1.081) Kartu Grafik dan kartu grafiknya digabung menjadi satu kartu di Ringkasan (CSS saja)
- [x] [F] Tombol `?` riwayat perubahan di tab Profil (v1.1.058)
- [x] [Q] README dan CHANGELOG diperbarui; CHANGELOG dipadatkan dan riwayat lengkap versi lama dipindah ke `CHANGELOG-ARSIP.md`

## 4. Hasil pengujian

**Unit:** 189 test lulus (`node tests/run.js`); semua file lolos `node --check`.

**Regresi data ekspor asli** (v1.1.049; 26 akun, 187 transaksi): saldo semua akun, tagihan 365 hari, kalender tagihan 12 bulan, dan dana likuid identik antara kode lama dan baru.

**Browser (Chromium 390 px, perbandingan otomatis antar versi):**

| Versi | Cakupan | Hasil |
|---|---|---|
| 1.1.049 | 7 tab, service worker, `runRecurringFees()` idempoten, lazy-load saat CDN diblokir | tanpa error JS, tanpa scroll horizontal |
| 1.1.051 | pemecahan file: 12 fungsi berpindah file tetap terdefinisi, detail akun, Laporan | tanpa error JS |
| 1.1.052 | kelas utilitas: 7 tab + 3 modal | CSS terhitung identik (0 selisih) |
| 1.1.053–054 | event delegation: 131 lalu 182 elemen, urutan + argumen panggilan | identik (0 selisih) |
| 1.1.055 | 3 tab identik; klik hapus/baris terpisah benar; parse di `render()` 4 → 1 | lulus |
| 1.1.056–057 | anggaran dan langganan dengan klik nyata (tambah, validasi, idempoten, reload, ekspor) | lulus |
| 1.1.059, 1.1.064–067 | hanya unit test dan cek sintaks | tampilan belum diuji |
| 1.1.078 | A5 + A6: 7 akun (kas, aset, kartu kredit, PayLater, pinjaman, pinjol, titipan): Limit kartu terpakai 28% dan Kekayaan bersih tampil; tombol Bayar per jenis akun benar; Bayar angsuran membuka panel bayar nominal Rp1.100.000; Bayar PayLater membuka Transfer Rp950.000; Transfer dari sini dan Catat transaksi mengisi akun dengan benar; kartu kredit tanpa Transfer; titipan tanpa tombol; tanpa scroll horizontal; tema gelap dan mode samarkan saldo belum | tanpa error JS |
| 1.1.077 | A3: 6 akun (kas, kartu kredit dengan tagihan cetak telat, PayLater limit 95%, pinjaman telat 90 hari, pinjol 2 hari lagi, titipan): kartu utang tepat 2 baris meta, ▲ Telat N hari dan ▲ limit tampil, tombol Bayar tagihan tetap, detail memuat jumlah transaksi, tanpa scroll horizontal; tema gelap dan layar lebar belum | tanpa error JS |
| 1.1.076 | A1 + A2: 4 akun (kas, kartu kredit, pinjaman bunga tetap Rp10 juta, pinjol): header Total utang Rp12.700.000 = jumlah kelompok; kartu "Sisa pokok" + "+ bunga terjadwal"; detail "total sampai lunas" dan bunga efektif pinjol hanya di detail; tanpa scroll horizontal | tanpa error JS |
| 1.1.075 | A1: unit test (pokok/bunga contoh Rp10 juta, header = jumlah pokok kartu + pinjaman); tampilannya diuji di 1.1.076 | unit + sintaks lulus |
| 1.1.074 | R9: segmen Utang dengan kartu kredit + transfer pembayaran: total, kenaikan, 6 batang, label aksesibilitas benar; unit: identik dengan cara lama pada 300 data acak | tanpa error JS |
| 1.1.073 | R8: proyeksi tanpa anggaran, anggaran terlampaui (▲ merah), anggaran longgar (▼), data kosong menyembunyikan blok, tanpa scroll horizontal | tanpa error JS |
| 1.1.072 | R6: 5 segmen grafik + lingkaran kategori punya `role`/`aria-label`, fokus keyboard menampilkan titik terakhir, ArrowLeft/Home/Esc bekerja dan `#chart-live` terisi, Enter di legenda membuka rincian, tanda ▲ tampil, tanpa scroll horizontal | tanpa error JS |
| 1.1.071 | R7: kartu rencana kosong tersembunyi, kartu ajakan 3 baris, klik Atur membuka form, isi anggaran memunculkan kartunya, semua dipakai = ajakan hilang, urutan lama tersimpan tetap benar | tanpa error JS |
| 1.1.070 | R3/R4: blok insight dan beban cicilan di dalam Bulan ini, urutan kartu bisa digeser dan bertahan setelah reload, grup Grafik bergerak utuh, reset, data kosong, desktop tanpa scroll horizontal | tanpa error JS |
| 1.1.069 | kartu Grafik bersegmen: hanya segmen aktif tergambar, pilihan bertahan setelah reload, segmen mati jatuh ke yang tersedia, kartu hilang saat data kosong | tanpa error JS |
| 1.1.068 | strip "Perlu perhatian": 3 baris berurutan, klik membuka detail akun, hilang saat data aman | tanpa error JS |

**Belum teruji:** login/sinkron Supabase sungguhan, pembaca layar sungguhan (TalkBack/VoiceOver/NVDA) untuk grafik v1.1.072, service worker di perangkat nyata (offline), dua perangkat bentrok, sinkron `budgets` / `emergencyMonths` antar perangkat, sentuhan nyata di HP, tampilan v1.1.059 dan v1.1.064–067 (dana darurat, grafik tren utang, denda telat, tombol `.ics`, Cocokkan saldo).

### Ukur performa (v1.1.054)

Chromium headless 390 px, CPU diperlambat 4x (perkiraan kasar HP menengah, bukan HP nyata), data dummy 7 akun. Milidetik, tiga kali ukur:

| Operasi | 187 transaksi | 5.000 | 20.000 |
|---|---|---|---|
| `loadData()` (parse JSON) | ±0 | 21–26 | 43–64 |
| `render()` lengkap | 16–42 | 140–157 | 626–795 |
| `saveData()` | 3–10 | 35–89 | 203–240 |
| buka tab Transaksi (pertama kali) | n/a | 99 | 179 |
| buka tab Laporan (pertama kali) | 83 | 118 | 271 |

**Ukur ulang 2 Okt 2026 (v1.1.092)**, cara sama (Chromium 390 px, CPU 4x, data tambahan transaksi acak), `render()` dengan tiap tab aktif, ms (3 kali ukur):

| Tab aktif | 5.000 transaksi | 20.000 |
|---|---|---|
| Ringkasan | 55–88 | 202–275 |
| Transaksi | 30–40 | 90–107 |
| Laporan | 45–50 | 104–115 |
| Akun | 28–40 | 93–107 |
| `loadData()` / `saveData()` | 11 / 8 | 37 / 89 |

Kesimpulan: jauh lebih cepat dari ukuran awal (5.000 transaksi: ±150 ms menjadi 30–88 ms). Ringkasan paling berat (±4x Akun) tapi tetap di bawah 100 ms pada 5.000 transaksi. Hasil ini simulasi di PC, belum HP nyata, jadi E2 dan E5 tidak perlu dikerjakan sekarang.

`render()` memanggil `loadData()` 4x (kini 1x sejak v1.1.055) dan `computeAllBalances()` 1x. Aman sampai ribuan transaksi; baru terasa di puluhan ribu. Urutan optimasi berikutnya kalau perlu: E2, lalu E5.

## 5. Setelah memasang

1. Timpa file lama dengan isi zip. Zip v1.1.052 ke atas hanya berisi file yang berubah; paket lengkap juga berisi `sw.js`, `supabase/setup.sql`, `tests/run.js`, `manifest.json`, dan empat ikon.
2. **Export JSON** dulu sebagai cadangan.
3. Jalankan `setup.sql` di Supabase dan verifikasi RLS dengan dua akun.
4. Buka app lewat `http(s)://` (bukan `file://`) agar service worker aktif; setelah pemuatan pertama coba mode pesawat.
5. Tab yang sudah terbuka: tutup dan buka lagi sekali supaya service worker baru mengambil alih.
