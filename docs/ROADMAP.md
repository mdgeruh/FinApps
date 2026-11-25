# Roadmap: Keuangan Pribadi

Rencana pekerjaan yang **belum selesai**, per **v1.1.191** (25 Nov 2026). Yang sudah selesai ada di [ARSIP-TODOLIST.md](ARSIP-TODOLIST.md), ringkasan status di [SUMMARY.md](SUMMARY.md), riwayat per versi di [CHANGELOG.md](../CHANGELOG.md).

Tanda: `[ ]` belum, `[~]` sebagian, `[-]` sengaja ditunda/tidak dikerjakan. Kategori: **[K]** keamanan/kebenaran, **[E]** efisiensi, **[Q]** kualitas/dokumentasi, **[F]** fitur.

## Cara kerja
- Fokus pada **pengembangan fitur**; optimalisasi dan hardening Supabase sengaja dilewati sampai diminta (permintaan 2 Okt 2026).
- Tiap batch naik satu versi dan memperbarui `APP_VERSION`, `CACHE_VERSION` di `sw.js`, CHANGELOG, riwayat `?` (`js/changelog.js`), README, SUMMARY/ROADMAP, serta menambah tes.
- Tiap rilis dikirim sebagai dua zip: **full** (seluruh proyek) dan **update** (hanya berkas yang berubah).

## 1. Berikutnya: lanjutan tab Ringkasan (S5–S6)
S1–S4 sudah selesai (lihat arsip). Urutan yang disarankan: S5 → S6.

- [ ] **S5 [F] Estimasi bulan lunas di kartu Tren total utang:** perkiraan bulan lunas bila cicilan berjalan seperti sekarang.
- [ ] **S6 [F] Label bulan opsional di kurva Tren dan Utang:** dihapus di v1.1.187 supaya segaya Kekayaan/Cashflow; sediakan sebagai pilihan bila terasa terlalu polos.

## 2. Kualitas: perapian tes
- [ ] [Q] **Perbaiki muatan berkas di `tests/run.js`.** Hasil `node tests/run.js` per 25 Nov 2026: 323 lulus, **47 gagal**, jumlah gagal sama persis di v1.1.190 dan v1.1.191 (bukan akibat rilis terakhir). 41 di antaranya galat `categoryAll is not defined`: daftar berkas yang dimuat tes belum menyertakan `js/kategori-data.js` (hasil penataan ulang berkas, v1.1.169 dan v1.1.182). Enam sisanya perlu ditelaah satu per satu: pemeriksaan versi dan tanggal build, kelompok lipat Profil (`profil-g-*`), jumlah berkas JS (43 ≠ 39), kelola label memuat langganan, pemeriksaan `html`, dan detail akun. Belum diketahui mana yang salah tes dan mana yang salah kode.

## 3. Perlu kamu jalankan (tidak bisa saya lakukan)
- [-] [K] Kunci versi `supabase-js` + SRI (`node tools/pin-supabase.js`): sengaja dilewati dulu atas permintaanmu (2 Okt 2026); Supabase tetap `@2`. Begitu juga RLS/uji sinkron: fokus ke pengembangan fitur
- [ ] [K] Jalankan `supabase/setup.sql` di Supabase SQL Editor dan uji RLS dengan dua akun (langkah ada di akhir file SQL)
- [ ] [K] Uji sinkron sungguhan: login, push, bentrok dua perangkat, ganti akun di satu perangkat
- [ ] [E] Ukur performa di HP nyata; kalau terasa lambat, hasilnya jadi dasar memilih E2 atau E5

## 4. Butuh keputusanmu
- [ ] [K] Enkripsi data cloud. Enkripsi klien berarti lupa passphrase = data tidak bisa dipulihkan, dan data tidak bisa dibaca di dashboard Supabase
- [-] [F] Desktop tahap 3: terwujud sebagai roadmap D1–D12 (semua selesai v1.1.135)
- [ ] [F] Akun forex USD/cent dengan kurs (sekarang lewat aset + trik harga per satuan)
- [ ] [K] Sapaan: kode dan CHANGELOG mengikuti v1.1.041 (sapaan tanpa nama). Kalau ingin sapaan dengan nama, bilang saja

## 5. Ide yang belum dijadwalkan
(Akun forex USD/cent ada di bagian 4, menunggu keputusan.)
- [ ] [F] Pengecekan otomatis akun pinjaman yang sisa pokoknya tidak cocok dengan jadwal

## 6. Ditunda (hasil ukur: belum perlu)
- [~] [E] E2 cache hasil parse `loadData()`: `render()` sudah parse 1x (bukan 4x, v1.1.055). Cache global ditunda: ±65 pemanggil, banyak yang memodifikasi hasilnya, butuh refactor dan test lebih lengkap. Manfaat terukur ±2x di 5.000 transaksi, tidak terasa di 187
- [-] [E] E5 indeks transaksi per bulan/akun: ukur ulang 2 Okt 2026 menunjukkan `render()` 30–88 ms di 5.000 transaksi (CPU 4x), tidak perlu sekarang (lihat bagian 4 di SUMMARY.md)
- [ ] [E] E8 build minify/gabung: tidak ada minifier di lingkungan ini dan butuh keputusan alur kerja (sumber modular tetap dijaga)
- [ ] [E] E6 sinkron per-item (bukan satu blob)
- [ ] [E] Hosting sendiri Supabase JS dan font (sekarang di-cache service worker setelah pemuatan online pertama)
- [ ] [Q] Namespace / ES modules (semua berbagi scope global; perubahan besar di ratusan pemanggilan)
- [ ] [Q] Kurangi `style=""` inline dan `!important` yang tersisa. Sudah 393 → 274 inline (v1.1.052) dan 2 `!important` dihapus (v1.1.055); sisanya sengaja dibiarkan: `display:none` yang diubah JS, warna SVG grafik, `.section-title`, blok `@media print`, `[data-user-hidden]`/`[data-empty]`, aturan desktop yang menimpa inline

