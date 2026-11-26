# Ringkasan: Keuangan Pribadi

Status per **v1.1.199** (26 Nov 2026). Riwayat tiap versi ada di [CHANGELOG.md](../CHANGELOG.md); panduan pemakaian dan struktur kode di [README.md](../README.md).

## Peta dokumen

| Dokumen | Isi |
|---|---|
| `docs/SUMMARY.md` (ini) | Gambaran app, status per area, koreksi analisis, hasil pengujian, langkah setelah memasang |
| `docs/ROADMAP.md` | Yang **belum** selesai: pekerjaan berikutnya, keputusan, hal yang perlu dijalankan sendiri, yang ditunda |
| `docs/ARSIP-TODOLIST.md` | Catatan lengkap pekerjaan yang **sudah** selesai (A, D, R, S, dan lainnya) |
| `docs/CHANGELOG-ARSIP.md` | Riwayat versi lama (v1.1.058 ke bawah dan sebelumnya) |
| `docs/PEMETAAN-NAMA-FILE.md` | Nama berkas lama → baru (penataan v1.1.169 dan v1.1.182) |

## 1. Gambaran singkat

App web statis (HTML + CSS + JS biasa, tanpa build tool), ±800 KB JS tanpa minify dalam 43 berkas di `js/` plus `sw.js`. Data di `localStorage` (`keuangan-app-data-v2`), sinkron cloud Supabase (email + Google) sebagai **satu blob JSON per user** dengan kunci versi. Fitur inti: akun (kas/bank/e-wallet/aset/kartu kredit/PayLater/pinjaman/pinjol), titipan, laporan utang, kalender tagihan, anggaran, langganan, dana darurat, target tabungan, export/import.

## 2. Status per area

| Area | Status | Rincian |
|---|---|---|
| Tab Akun (A1–A9) | Selesai, v1.1.075–086 | Definisi utang seragam, kartu ringkas, arsip akun, cari/filter, sematkan, aksi cepat, form akun dirapikan |
| Tampilan desktop (D1–D12) | Selesai, v1.1.131–135 | Dasbor, tabel Transaksi, panel Akun, bar atas menempel, form panel samping, pintasan keyboard |
| Tab Ringkasan (R1–R9) | Selesai, v1.1.068–074 | Perlu perhatian, grafik bersegmen, urutan kartu, proyeksi akhir bulan |
| Lanjutan Ringkasan (S1–S6) | Selesai, v1.1.188–193 | Sembunyikan saldo di semua kurva, periode sebelumnya, rasio tabungan, kategori naik/turun, perkiraan bulan lunas utang, label bulan opsional di kurva |
| Tampilan desktop melayang (T1–T8) | Selesai, v1.1.194–195 | Sidebar kapsul, kartu membulat, pil, ikon kartu angka; sakelar di Profil; warna tidak berubah |
| Tampilan, tema, sinkron | Berjalan | Palet warna dan Kaca, banner versi baru, sinkron pengaturan dan saklar sinkron otomatis |
| Keamanan dasar | Selesai | CSP, `escapeHtml`, batas import, `supabase/setup.sql` (RLS) |
| Optimalisasi | Ditunda | Hasil ukur: belum perlu (lihat bagian 4 dan ROADMAP) |

Tidak ada item roadmap Ringkasan yang tersisa; daftar lengkap di [ROADMAP.md](ROADMAP.md).

## 3. Koreksi terhadap analisis awal

| Temuan lama | Yang sebenarnya |
|---|---|
| E1: skrip Supabase memblokir render | Skrip di akhir `<body>`; yang tertahan adalah startup app. Sudah diperbaiki lewat lazy-load |
| E3: `computeAllBalances()` dihitung ulang di ≥10 tempat | Sebagian besar handler aksi terpisah. Duplikasi nyata hanya di tab Laporan (sudah diperbaiki) |
| E7: pencarian tanpa debounce | Sudah ada (220 ms) |
| E10: listener grafik menumpuk | Tidak; dijaga `svg.dataset.interactiveBound` |
| Import menerima ID dari file | Tidak; ID selalu dibuat baru lewat `generateId()` |
| Nominal pecahan = bug | Bukan; bunga/pajak bunga bank dengan sen yang sah. Hanya dirapikan ke 2 desimal |

## 4. Hasil pengujian

**Unit** (`node tests/run.js`, 26 Nov 2026, v1.1.199): **388 lulus, 0 gagal** (sebelumnya 330 lulus, 47 gagal karena `tests/run.js` belum memuat `js/kategori-data.js` dan enam tes usang; sudah dirapikan, T7).

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

1. Ada dua zip tiap rilis: **full** (seluruh proyek) dan **update** (hanya berkas yang berubah, folder sama). Timpa file lama dengan isi zip.
2. **Export JSON** dulu sebagai cadangan.
3. Jalankan `setup.sql` di Supabase dan verifikasi RLS dengan dua akun.
4. Buka app lewat `http(s)://` (bukan `file://`) agar service worker aktif; setelah pemuatan pertama coba mode pesawat.
5. Tab yang sudah terbuka: tutup dan buka lagi sekali supaya service worker baru mengambil alih.
