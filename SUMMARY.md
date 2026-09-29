# Ringkasan, Efisiensi & Todolist: Keuangan Pribadi

Status per **v1.1.049** (29 Sep 2026). Centang `[x]` = sudah dikerjakan di v1.1.049, `[ ]` = belum.
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
- [ ] [E] E2: cache data di memori agar `loadData()` tidak parse ulang. **Ditunda:** ±65 pemanggil, banyak yang memodifikasi objek hasil `loadData()`; risiko data basi/tercemar perlu refactor terpisah dengan test lebih lengkap
- [ ] [E] E5: indeks transaksi per bulan/akun untuk Laporan/Beranda/grafik. **Ditunda:** ukur dulu (lihat di bawah)
- [ ] [E] E8: build minify/gabung. **Ditunda:** tidak ada minifier di lingkungan ini dan butuh keputusan alur kerja (sumber modular tetap dijaga)
- [ ] [E] Ukur performa di HP nyata dengan data 187 dan 5.000 transaksi sebelum optimasi lanjutan

### P3
- [x] [E] Service worker `sw.js` (network-first, app shell + jsdelivr + font, tidak menyentuh `*.supabase.co`)
- [ ] [E] Hosting sendiri Supabase JS dan font (sekarang di-cache oleh service worker setelah pemuatan online pertama)
- [ ] [K] Putuskan enkripsi data cloud. **Butuh keputusanmu**: enkripsi klien berarti lupa passphrase = data tidak bisa dipulihkan, dan sinkron tidak bisa dibaca di dashboard
- [ ] [E] E6: sinkron per-item (bukan satu blob)
- [ ] [Q] Ganti `onclick` inline dengan event delegation (±90 tempat)
- [ ] [Q] Pecah `04-akun.js` (1.422 baris) dan `11-laporan.js` (1.010 baris); namespace / ES modules
- [ ] [Q] Kurangi 235 `style=""` inline dan 14 `!important`

### P4: fitur (butuh keputusan desain darimu, tidak dikerjakan)
- [ ] [F] Anggaran per kategori · langganan berulang · dana darurat · tren total utang · denda keterlambatan pinjol · rekonsiliasi saldo · ekspor kalender `.ics` · desktop tahap 3

### P5: dokumentasi
- [x] [Q] README diperbarui (versi, tab Tagihan/Profil, login Google, tanpa menu gear, service worker, cara rilis)
- [x] [Q] CHANGELOG v1.1.049
- [x] [Q] Rujukan `syncPullOwnerName` dihapus dari README

## 4. Hasil pengujian v1.1.049

- **Test unit:** 17 lulus, 0 gagal (`node tests/run.js`).
- **Regresi pada data ekspor asli** (26 akun, 187 transaksi): saldo semua akun, tagihan jatuh tempo 365 hari, kalender tagihan 12 bulan, dan dana likuid **identik** antara kode lama dan baru.
- **Browser (Chromium, layar 390 px):** app render dan semua 7 tab terbuka tanpa error JavaScript; tanpa scroll horizontal; footer `v1.1.049`; `runRecurringFees()` dijalankan lagi tidak menambah transaksi; service worker aktif. Satu-satunya error konsol adalah CDN dan font yang sengaja diblokir di sandbox. App tetap tampil, membuktikan lazy-load bekerja saat CDN tidak terjangkau.
- **Belum teruji:** login/sinkron ke Supabase sungguhan, service worker di perangkat nyata (offline), dan dua perangkat bentrok.

## 5. Yang perlu kamu lakukan setelah memasang

1. Timpa seluruh file kode lama dengan isi zip (paket lengkap, termasuk file baru `sw.js`, `supabase/setup.sql`, `tests/run.js`). `manifest.json` dan ikon tidak ada di unggahan, jadi tetap pakai yang lama.
2. **Export JSON** dulu sebagai cadangan.
3. Jalankan `setup.sql` di Supabase dan verifikasi RLS dengan dua akun.
4. Buka app lewat `http(s)://` (bukan `file://`) agar service worker aktif; setelah pemuatan pertama coba mode pesawat.
5. Tab yang sudah dibuka sebelum update: tutup dan buka lagi sekali supaya service worker baru mengambil alih.
