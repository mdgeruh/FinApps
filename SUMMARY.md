# Ringkasan, Efisiensi & Todolist: Keuangan Pribadi

Status per **v1.1.063** (29 Sep 2026). Centang `[x]` = sudah dikerjakan sampai v1.1.063, `[ ]` = belum.
Detail perubahan ada di [CHANGELOG.md](CHANGELOG.md).

## 1. Gambaran singkat

App web statis (HTML + CSS + JS biasa, tanpa build tool), ±404 KB JS tanpa minify. Data di `localStorage` (`keuangan-app-data-v2`), sinkron cloud Supabase (email + Google) sebagai **satu blob JSON per user** dengan kunci versi. Fitur inti: akun (kas/bank/e-wallet/aset/kartu kredit/PayLater/pinjaman/pinjol), titipan, laporan utang, kalender tagihan, export/import.

## 2. Koreksi terhadap analisis sebelumnya

Setelah kode dibaca lebih teliti saat mengerjakan, beberapa temuan di versi SUMMARY sebelumnya ternyata kurang tepat:

| Temuan lama | Yang sebenarnya |
|---|---|
| E1: skrip Supabase "memblokir render" | Skrip ada di akhir `<body>`, jadi parsing HTML tidak terblokir. Yang tertahan adalah **startup app**, karena semua file app dimuat di belakang skrip CDN dan render pertama menunggu sinkron. Sudah diperbaiki lewat lazy-load |
| E3: `computeAllBalances()` dihitung ulang di ≥10 tempat | Sebagian besar itu handler aksi yang terpisah (satu kali per aksi), bukan duplikasi. Duplikasi nyata hanya di tab Laporan |
| E7: pencarian tanpa debounce | Sudah ada debounce 220 ms (`08-render-titipan.js`, dan pola sama di Transaksi). Tidak perlu diubah |
| E10: listener grafik mungkin menumpuk | Tidak. `bindChartInteraction()` dijaga `svg.dataset.interactiveBound`, jadi hanya terpasang sekali |
| Import menerima ID dari file | Tidak. `importJson` dan `resetAndImport` selalu membuat ID baru lewat `generateId()`; ID file hanya untuk memetakan relasi |
| Nominal pecahan = bug | Bukan. 4 transaksi itu bunga/pajak bunga bank dengan sen yang sah (mis. Rp9.363,98). Yang ditambahkan hanya perapian ke 2 desimal |

## 3. Todolist

Tanda: **[K]** keamanan/kebenaran, **[E]** efisiensi, **[Q]** kualitas/dokumentasi, **[F]** fitur.

### P0
- [x] [K] Samakan kode dan CHANGELOG untuk nama pemilik/sapaan. Mengikuti CHANGELOG v1.1.041: fungsi sinkron nama dihapus, sapaan tanpa nama. **Kalau kamu justru ingin sapaan dengan nama, bilang saja**; itu perlu dikembalikan dan CHANGELOG yang diperbaiki
- [x] [K] `supabase/setup.sql` (tabel + RLS + 4 kebijakan + query verifikasi)
- [ ] [K] **Kamu yang harus menjalankan:** jalankan `setup.sql` di Supabase SQL Editor, lalu uji dengan dua akun (langkah ada di akhir file SQL). Saya tidak punya akses ke project Supabase-mu, jadi RLS-nya belum terverifikasi
- [ ] [K] **Kamu yang harus menjalankan:** uji sinkron sungguhan (login, push, bentrok dua perangkat, ganti akun di satu perangkat)
- [x] [K] Biaya bulanan otomatis keluar dari `render()`, berID deterministik, tidak ganda antar perangkat
- [x] [E] Pustaka Supabase dimuat lazy, render pertama tidak menunggu sinkron kalau data lokal sudah ada

### P1
- [x] [E] Tab Laporan memakai saldo dari `render()`
- [x] [K] `escapeHtml` aman untuk atribut (sekaligus lebih cepat: tanpa membuat elemen DOM per panggilan)
- [x] [K] Import: batas 5 MB / 100.000 transaksi, validasi tanggal dan nominal
- [x] [K] Nominal dirapikan ke 2 desimal di `saveData()` dan import
- [x] [Q] Sapaan memakai jam GMT+8
- [-] [E] E9 (jangan bangun ulang `<select>` tiap render): **tidak dikerjakan.** Rebuild-nya murah, sedangkan menahannya berisiko membuat pilihan dropdown basi (fungsi itu juga mengatur pilihan default dan ketersediaan tipe)
- [-] [K] Cache DOM `$()` basi: **belum ada kasus nyata di kode sekarang**, jadi tidak diubah. Kalau ada elemen yang dibuat ulang lewat `innerHTML` dan dicari lewat `$()`, gunakan `document.getElementById` langsung untuk elemen itu

### P2
- [x] [Q] Test unit: `tests/run.js`, 17 test (`node tests/run.js`)
- [~] [E] E2: cache data di memori agar `loadData()` tidak parse ulang. **Sebagian (v1.1.055):** `render()` kini parse 1x, bukan 4x (3 fungsi form menerima `data` opsional, tanpa cache global). **Cache global tetap ditunda, dan hasil ukur menunjukkan belum perlu:** ±65 pemanggil, banyak yang memodifikasi objek hasil `loadData()`; risiko data basi/tercemar perlu refactor terpisah dengan test lebih lengkap. Manfaatnya terukur hanya ±2x pada `render()` di 5.000 transaksi (parse JSON ±55% waktunya), tidak terasa di 187 transaksi
- [ ] [E] E5: indeks transaksi per bulan/akun untuk Laporan/Beranda/grafik. **Ditunda, dan hasil ukur menunjukkan belum perlu:** `render()` 16–42 ms di 187 transaksi dan ±150 ms di 5.000 (CPU 4x lebih lambat), lihat bagian 4
- [ ] [E] E8: build minify/gabung. **Ditunda:** tidak ada minifier di lingkungan ini dan butuh keputusan alur kerja (sumber modular tetap dijaga)
- [~] [E] Ukur performa dengan data 187 dan 5.000 transaksi sebelum optimasi lanjutan. **Sudah diukur di Chromium dengan CPU diperlambat 4x** (hasil di bagian 4): tidak ada yang lambat di ukuran data nyata (187 transaksi), jadi E2/E5 tidak perlu dikerjakan sekarang. **Yang belum:** ukur di HP nyata; kalau di HP terasa lambat saat pindah tab atau simpan, bilang, dan hasilnya jadi dasar memilih E2 atau E5

### P3
- [x] [E] Service worker `sw.js` (network-first, app shell + jsdelivr + font, tidak menyentuh `*.supabase.co`)
- [ ] [E] Hosting sendiri Supabase JS dan font (sekarang di-cache oleh service worker setelah pemuatan online pertama)
- [ ] [K] Putuskan enkripsi data cloud. **Butuh keputusanmu**: enkripsi klien berarti lupa passphrase = data tidak bisa dipulihkan, dan sinkron tidak bisa dibaca di dashboard
- [ ] [E] E6: sinkron per-item (bukan satu blob)
- [x] [Q] Ganti `onclick` inline dengan event delegation: v1.1.053 memindahkan 131 handler (99 click, 15 input, 17 change) ke `data-act` / `data-input-act` / `data-change-act`. v1.1.054 memindahkan sisanya (backdrop modal, `stopPropagation`, keydown, input file, multi-perintah); tombol hapus di tab Transaksi (handler inline terakhir) dipindah di v1.1.055. Item ini selesai kecuali namespace/ES modules di bawah
- [x] [Q] Pecah `04-akun.js` (1.423 baris) jadi 3 file dan `11-laporan.js` (1.010 baris) jadi 3 file (v1.1.051; isi identik, tiap file 280–570 baris)
- [ ] [Q] Namespace / ES modules (semua masih berbagi scope global; butuh perubahan besar di ratusan pemanggilan, terutama `onclick` inline, jadi sebaiknya dikerjakan bersama item event delegation di atas)
- [ ] [Q] Kurangi `style=""` inline dan 14 `!important`. **Sebagian selesai di v1.1.052:** 119 inline yang paling sering berulang diganti kelas utilitas `u-*` (total `style="` di kode 393 → 274). Sisanya sengaja dibiarkan: `display:none` (diubah JS lewat `style.display`), elemen `.section-title` (margin diatur aturan CSS yang lebih spesifik), warna/fill/stroke SVG grafik, dan gaya unik satu-kali. v1.1.055 menghapus 2 `!important` (`.acc-tile`, `.acc-accent`); sisanya di blok `@media print`, `[data-user-hidden]`/`[data-empty]`, dan aturan desktop yang menimpa `style=""` inline, sengaja dibiarkan

### P4: fitur (butuh keputusan desain darimu, tidak dikerjakan)
- [x] [F] Anggaran per kategori (v1.1.056: kartu di Ringkasan, batas bulanan, peringatan 80%/100%; kategori Cicilan/utang tidak bisa dianggarkan)
- [x] [F] Langganan berulang (v1.1.057: kartu di Ringkasan, catat otomatis tiap bulan dengan ID deterministik, jeda/hapus, ikut ekspor/import/sinkron)
- [x] [F] Dana darurat (v1.1.059: kartu di Ringkasan, target dalam bulan pengeluaran, dana = kas + bank + e-wallet)
- [ ] [F] Tren total utang · denda keterlambatan pinjol · rekonsiliasi saldo · ekspor kalender `.ics` · desktop tahap 3

### P5: dokumentasi
- [x] [F] Tombol `?` riwayat perubahan di tab Profil + rapikan tab Profil (v1.1.058; tiap rilis tambah entri di `CHANGELOG_ENTRIES`, `10d-changelog.js`, ditulis dengan bahasa awam; yang tampil hanya rilis terbaru tiap tanggal)
- [x] [Q] README diperbarui (versi, tab Tagihan/Profil, login Google, tanpa menu gear, service worker, cara rilis)
- [x] [Q] CHANGELOG v1.1.049
- [x] [Q] Rujukan `syncPullOwnerName` dihapus dari README

## 4. Hasil pengujian v1.1.049

- **Test unit:** 17 lulus, 0 gagal (`node tests/run.js`).
- **Regresi pada data ekspor asli** (26 akun, 187 transaksi): saldo semua akun, tagihan jatuh tempo 365 hari, kalender tagihan 12 bulan, dan dana likuid **identik** antara kode lama dan baru.
- **Browser (Chromium, layar 390 px):** app render dan semua 7 tab terbuka tanpa error JavaScript; tanpa scroll horizontal; footer `v1.1.049`; `runRecurringFees()` dijalankan lagi tidak menambah transaksi; service worker aktif. Satu-satunya error konsol adalah CDN dan font yang sengaja diblokir di sandbox. App tetap tampil, membuktikan lazy-load bekerja saat CDN tidak terjangkau.
- **v1.1.051 (setelah pemecahan file):** 17 test unit lulus; semua file lolos cek sintaks; di Chromium 390 px semua tab terbuka, 12 fungsi yang berpindah file tetap terdefinisi, detail akun terbuka, tab Laporan terisi, tanpa scroll horizontal, tanpa error JavaScript.
- **Belum teruji:** login/sinkron ke Supabase sungguhan, service worker di perangkat nyata (offline), dan dua perangkat bentrok.

- **v1.1.052 (kelas utilitas):** 17 test unit lulus; semua file lolos cek sintaks; perbandingan otomatis Chromium 390 px v1.1.051 vs v1.1.052 (7 tab + 3 modal detail akun, data contoh): nilai CSS terhitung semua elemen identik (0 selisih), tanpa error JavaScript.

- **v1.1.053 (event delegation):** 17 test unit lulus; semua file lolos cek sintaks; perbandingan otomatis Chromium 390 px v1.1.052 vs v1.1.053: 131 elemen, urutan + argumen panggilan fungsi identik (0 selisih), semua nama fungsi handler terdefinisi, tanpa error JavaScript. **Belum teruji:** klik nyata di semua modal dan alur input di perangkat sungguhan; coba cepat semua tombol setelah memasang.

- **v1.1.054 (sisa handler + ID contoh):** 17 test unit lulus; semua file lolos cek sintaks; perbandingan otomatis Chromium 390 px v1.1.053 vs v1.1.054 dengan data dummy: 182 elemen termasuk modal dinamis, 0 selisih, tanpa error JavaScript. **Belum teruji:** sentuhan nyata di perangkat sungguhan (terutama klik latar modal dan Enter/Spasi pada kartu akun).

- **v1.1.055 (handler terakhir, !important, render 1 parse):** 17 test unit lulus; Chromium 390 px v1.1.054 vs v1.1.055: CSS terhitung 3 tab identik (0 selisih); klik hapus/baris terpisah benar; parse besar di `render()` 4 → 1. **Belum teruji:** sentuhan nyata di HP.

- **v1.1.056 (anggaran per kategori):** 24 test unit lulus (7 baru); Chromium 390 px: buka sheet, simpan lewat klik nyata, kartu terisi, bertahan setelah reload, ikut ekspor, tanpa scroll horizontal, tanpa error JS. **Belum teruji:** HP nyata dan sinkron `budgets` antar perangkat.

- **v1.1.057 (langganan berulang):** 35 test unit lulus (11 baru); Chromium 390 px dengan klik nyata: tambah, validasi, catat otomatis, idempoten, bertahan setelah reload, jeda, hapus, tanpa scroll horizontal, tanpa error JS. **Belum teruji:** HP nyata, sinkron antar perangkat, pergantian bulan sungguhan.

- **v1.1.059 (dana darurat):** 41 test unit lulus (6 baru); semua file lolos cek sintaks. **Belum teruji:** tampilan di browser/HP dan sinkron `emergencyMonths` antar perangkat.

### Ukur performa (29 Sep 2026, v1.1.054)

Chromium headless 390 px, CPU diperlambat 4x (perkiraan kasar HP menengah, **bukan** HP nyata), data dummy 7 akun dengan transaksi digandakan dan tanggal diacak dalam 12 bulan. Waktu dalam milidetik, tiga kali ukur:

| Operasi | 187 transaksi | 5.000 | 20.000 |
|---|---|---|---|
| `loadData()` (parse JSON) | ±0 | 21–26 | 43–64 |
| `render()` lengkap | 16–42 | 140–157 | 626–795 |
| `saveData()` | 3–10 | 35–89 | 203–240 |
| buka tab Transaksi (pertama kali) | n/a | 99 | 179 |
| buka tab Laporan (pertama kali) | 83 | 118 | 271 |

`render()` memanggil `loadData()` 4x dan `computeAllBalances()` 1x. Di 5.000 transaksi, empat parse itu ±56% waktu `render()`. Kesimpulan: aman sampai ribuan transaksi; baru terasa di puluhan ribu. Kalau nanti perlu, urutan optimasi yang paling murah adalah E2 (cache hasil parse, dengan sangat hati-hati), lalu E5.

## 5. Yang perlu kamu lakukan setelah memasang

1. Timpa file lama dengan isi zip. Zip v1.1.052 sampai v1.1.063 hanya berisi file yang berubah (`style.css`, `index.html`, `sw.js`, file `.js` yang diubah, dan dokumen); file lain tetap dari v1.1.051. Paket lengkap berisi `sw.js`, `supabase/setup.sql`, `tests/run.js`, `manifest.json`, dan keempat ikon).
2. **Export JSON** dulu sebagai cadangan.
3. Jalankan `setup.sql` di Supabase dan verifikasi RLS dengan dua akun.
4. Buka app lewat `http(s)://` (bukan `file://`) agar service worker aktif; setelah pemuatan pertama coba mode pesawat.
5. Tab yang sudah dibuka sebelum update: tutup dan buka lagi sekali supaya service worker baru mengambil alih.
