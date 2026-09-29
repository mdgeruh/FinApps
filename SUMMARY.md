# Ringkasan & Todolist: Keuangan Pribadi

Status per **v1.1.067** (29 Sep 2026). `[x]` selesai, `[~]` sebagian, `[-]` sengaja tidak dikerjakan, `[ ]` belum.
Detail perubahan: [CHANGELOG.md](CHANGELOG.md). Panduan pemakaian dan struktur kode: [README.md](README.md).

## 1. Gambaran singkat

App web statis (HTML + CSS + JS biasa, tanpa build tool), ±455 KB JS tanpa minify, 28 file JS modular + `sw.js`. Data di `localStorage` (`keuangan-app-data-v2`), sinkron cloud Supabase (email + Google) sebagai **satu blob JSON per user** dengan kunci versi. Fitur inti: akun (kas/bank/e-wallet/aset/kartu kredit/PayLater/pinjaman/pinjol), titipan, laporan utang, kalender tagihan, anggaran, langganan, dana darurat, export/import.

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

### Prioritas: perbaikan tab Ringkasan (usulan, menunggu persetujuanmu)

Dasar temuan: Ringkasan menumpuk **14 kartu** dalam satu gulir panjang. **Tidak ada peringatan tagihan** di sini (pengingat jatuh tempo ada di tab Tagihan). Semua kartu dihitung walau disembunyikan atau kosong, karena `applyRingkasanVisibility` baru jalan setelah render. Grafik tidak punya label aksesibilitas. Kartu hanya bisa disembunyikan, tidak bisa diurutkan. Performa hitung ternyata bukan masalah: pada 20.000 transaksi, `computeDebtTrend` ±19 ms, `computeBudgetStatus` ±10 ms, `emergencyMonthlyExpense` ±4 ms (native; ±4x lebih lambat di HP), jadi optimasi hitung ditaruh paling bawah.

Urut dari dampak terbesar ke terkecil:

- [ ] **R1 [F] Strip "Perlu perhatian" di puncak Ringkasan.** Maksimal 3 baris, dari `computeUpcomingDues` (telat atau ≤7 hari), anggaran ≥80%, dana darurat kurang, backup lama. Ketuk membuka tab atau akun terkait; strip hilang sendiri kalau tidak ada apa-apa. Ini informasi paling penting bagi pemakai dengan banyak utang, dan sekarang harus pindah ke tab Tagihan dulu
- [ ] **R2 [F] Satu kartu grafik dengan pilihan segmen** (Kekayaan | Cashflow | Kategori | Tren | Utang) menggantikan 5 kartu grafik bertumpuk. Hanya segmen aktif yang digambar, jadi gulir lebih pendek dan hitung lebih sedikit. Pemilih periode ikut ke kartu ini
- [ ] **R3 [F] Gabungkan "Insight lain" dan "Beban cicilan & bunga" ke kartu "Bulan ini"** sebagai baris tambahan, supaya 3 kartu kecil jadi 1
- [ ] **R4 [F] Susun ulang urutan default dan izinkan urut ulang.** Urutan usulan: Bulan ini → Rencana (anggaran, langganan, dana darurat) → Nilai akun → Transaksi terbaru → Grafik. Di Profil > Tampilan Ringkasan tambah tombol naik/turun selain sembunyikan (urutan disimpan per perangkat seperti `RINGKASAN_HIDDEN_KEY`)
- [ ] **R5 [E] Lewati render kartu yang disembunyikan atau kosong.** Hitung visibilitas sebelum render, bukan sesudah (`renderTabContent` di `02-navigasi.js`)
- [ ] **R6 [Q] Aksesibilitas grafik:** `role="img"` + `aria-label` ringkasan tiap SVG, tooltip bisa lewat fokus keyboard, dan naik/turun tidak hanya dibedakan warna (tambah ▲/▼)
- [ ] **R7 [F] Kartu Rencana yang belum dipakai** (anggaran, langganan, dana darurat kosong) tampil sebagai satu baris ajakan atau tersembunyi otomatis, bukan kartu kosong penuh
- [ ] **R8 [F] Proyeksi akhir bulan di kartu "Bulan ini":** rata-rata pengeluaran harian × sisa hari, dibandingkan total anggaran kalau ada
- [ ] **R9 [E] `computeDebtTrend` satu lintasan:** kelompokkan transaksi per akun per bulan sekali, bukan `accountBalanceAsOf` per akun per bulan (10–20x `computeAllBalances`). Baru perlu kalau R2 belum cukup atau data mencapai puluhan ribu transaksi

Urutan kerja yang disarankan: R1 → R2 + R5 (satu batch, saling terkait) → R3 + R4 → R7 → R6 → R8 → R9. Tiap batch naik satu versi dan memperbarui CHANGELOG, riwayat `?`, README, dan SUMMARY.

### Perlu kamu jalankan (tidak bisa saya lakukan)
- [ ] [K] Jalankan `supabase/setup.sql` di Supabase SQL Editor dan uji RLS dengan dua akun (langkah ada di akhir file SQL)
- [ ] [K] Uji sinkron sungguhan: login, push, bentrok dua perangkat, ganti akun di satu perangkat
- [ ] [E] Ukur performa di HP nyata; kalau terasa lambat, hasilnya jadi dasar memilih E2 atau E5

### Butuh keputusanmu
- [ ] [K] Enkripsi data cloud. Enkripsi klien berarti lupa passphrase = data tidak bisa dipulihkan, dan data tidak bisa dibaca di dashboard Supabase
- [ ] [F] Desktop tahap 3 (belum ada rinciannya di dokumen mana pun)
- [ ] [F] Akun forex USD/cent dengan kurs (sekarang lewat aset + trik harga per satuan)
- [ ] [K] Sapaan: kode dan CHANGELOG mengikuti v1.1.041 (sapaan tanpa nama). Kalau ingin sapaan dengan nama, bilang saja

### Ditunda (hasil ukur: belum perlu)
- [~] [E] E2 cache hasil parse `loadData()`: `render()` sudah parse 1x (bukan 4x, v1.1.055). Cache global ditunda: ±65 pemanggil, banyak yang memodifikasi hasilnya, butuh refactor dan test lebih lengkap. Manfaat terukur ±2x di 5.000 transaksi, tidak terasa di 187
- [ ] [E] E5 indeks transaksi per bulan/akun: `render()` 16–42 ms di 187 transaksi, ±150 ms di 5.000 (lihat bagian 4)
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
- [x] [F] Tombol `?` riwayat perubahan di tab Profil (v1.1.058)
- [x] [Q] README dan CHANGELOG diperbarui; CHANGELOG dipadatkan dan riwayat lengkap versi lama dipindah ke `CHANGELOG-ARSIP.md`

## 4. Hasil pengujian

**Unit:** 58 test lulus (`node tests/run.js`); semua file lolos `node --check`.

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

**Belum teruji:** login/sinkron Supabase sungguhan, service worker di perangkat nyata (offline), dua perangkat bentrok, sinkron `budgets` / `emergencyMonths` antar perangkat, sentuhan nyata di HP, tampilan v1.1.059 dan v1.1.064–067 (dana darurat, grafik tren utang, denda telat, tombol `.ics`, Cocokkan saldo).

### Ukur performa (v1.1.054)

Chromium headless 390 px, CPU diperlambat 4x (perkiraan kasar HP menengah, bukan HP nyata), data dummy 7 akun. Milidetik, tiga kali ukur:

| Operasi | 187 transaksi | 5.000 | 20.000 |
|---|---|---|---|
| `loadData()` (parse JSON) | ±0 | 21–26 | 43–64 |
| `render()` lengkap | 16–42 | 140–157 | 626–795 |
| `saveData()` | 3–10 | 35–89 | 203–240 |
| buka tab Transaksi (pertama kali) | n/a | 99 | 179 |
| buka tab Laporan (pertama kali) | 83 | 118 | 271 |

`render()` memanggil `loadData()` 4x (kini 1x sejak v1.1.055) dan `computeAllBalances()` 1x. Aman sampai ribuan transaksi; baru terasa di puluhan ribu. Urutan optimasi berikutnya kalau perlu: E2, lalu E5.

## 5. Setelah memasang

1. Timpa file lama dengan isi zip. Zip v1.1.052 ke atas hanya berisi file yang berubah; paket lengkap juga berisi `sw.js`, `supabase/setup.sql`, `tests/run.js`, `manifest.json`, dan empat ikon.
2. **Export JSON** dulu sebagai cadangan.
3. Jalankan `setup.sql` di Supabase dan verifikasi RLS dengan dua akun.
4. Buka app lewat `http(s)://` (bukan `file://`) agar service worker aktif; setelah pemuatan pertama coba mode pesawat.
5. Tab yang sudah terbuka: tutup dan buka lagi sekali supaya service worker baru mengambil alih.
