# Ringkasan: Keuangan Pribadi

Ringkasan analisis dan perubahan pada proyek **Keuangan Pribadi** (v1.1.007 menjadi **v1.1.020**), tanggal 22 Sep 2026.

## 1. Gambaran proyek

Aplikasi pencatatan keuangan pribadi berbasis web statis: HTML + CSS + JavaScript biasa, tanpa build tool, sekitar 8.300 baris.

- Data utama di `localStorage` (key `keuangan-app-data-v2`), jalan offline.
- Sinkron cloud **opsional** lewat Supabase (login email + kata sandi). Aktif hanya kalau `SUPABASE_ANON_KEY` di `00-config.js` terisi; key saat ini kosong, jadi app masih mode lokal.
- Fitur: kas/bank/e-wallet, aset dengan valuasi, kartu kredit, PayLater, pinjaman bank & online (pinjol), titipan/piutang, grafik, laporan utang (proyeksi kas, total biaya utang, simulasi pelunasan, saran), export/import JSON & CSV.

**Struktur modul** (dimuat berurutan oleh `index.html`, berbagi scope global):

| File | Isi |
|---|---|
| `00-config.js` | Konfigurasi Supabase |
| `01-data.js` | State, penyimpanan, kalkulasi saldo & pinjaman |
| `02-navigasi.js` | Navigasi, header, tab Profil, sapaan |
| `03`–`05` | Form transaksi, akun, form titipan |
| `06`–`08` | Util UI, render akun/transaksi, render titipan |
| `09`–`12` | Grafik, beranda, laporan, render utama |
| `13-import-export.js` | Import, export, reset, backup |
| `14-sync.js` | Login, sinkron cloud, nama pemilik |
| `15-startup.js` | Startup (dijalankan terakhir) |

## 2. Temuan analisis dan statusnya

| # | Temuan | Status |
|---|---|---|
| 1 | **Bug kritis:** `15-startup.js` memakai `OWNER_NAME` yang sudah tidak ada, sehingga startup berhenti dan app tidak pernah merender (semua angka Rp0) | **Diperbaiki** (v1.1.008) |
| 2 | `loadData()` menimpa data lokal yang rusak dengan data contoh, dan bisa ikut terkirim ke cloud | **Diperbaiki** (v1.1.008) |
| 3 | README dan CHANGELOG usang (masih "satu file HTML, 100% lokal") | **Diperbarui** (v1.1.008 dan seterusnya) |
| 4 | `escapeHtml` tidak meng-escape tanda kutip, sedangkan dipakai di dua atribut (`03-form-transaksi.js:165`, `14-sync.js`) | Belum |
| 5 | Cache DOM `$()` rawan elemen basi setelah `innerHTML` dibuat ulang (sumber bug simulasi di v1.1.007) | Belum |
| 6 | `supabase/setup.sql` tidak ada di unggahan, jadi Row Level Security belum bisa diverifikasi | Belum |
| 7 | Data keuangan tersimpan di Supabase sebagai JSON biasa (tidak dienkripsi di sisi klien) | Catatan risiko |
| 8 | Nama default "Made Ceplor" dan data contoh `defaultData()` tertulis langsung di kode | Belum |

## 3. Perubahan per versi

### v1.1.008: perbaikan kritis
- Sapaan di startup memakai `updateGreeting()`, jadi app tampil normal lagi.
- Data lokal rusak diamankan di key `keuangan-app-data-v2-corrupt`, muncul peringatan merah, dan data contoh hanya di memori.
- README ditulis ulang: struktur multi-file, sinkron cloud, tab Profil.

### v1.1.009: layar login baru
- Tanpa kotak modal: satu kolom bersih, logo "Rp", judul serif, tombol tampil/sembunyikan kata sandi, spinner saat proses.
- Layar lupa kata sandi dan kata sandi baru memakai gaya yang sama.
- Teks isian 16px (iOS tidak zoom), layar bisa digulir di HP pendek, istilah diseragamkan jadi "kata sandi".

### v1.1.010: login dari menu gear
- Opsi **Masuk untuk sinkron** tampil kalau belum login; setelah login berganti jadi **Keluar (email)**.
- Layar masuk dari gear punya tombol **Batal**.
- Alur sesi dipakai bersama dengan alur saat boot (`syncStartSession`).
- Pesan khusus kalau pustaka Supabase belum termuat (offline).

### v1.1.011: nama pemilik tersinkron
- Nama disimpan di metadata akun Supabase (`user_metadata.owner_name`), dengan salinan lokal di `kp_owner_name`.
- Akun yang sudah punya nama menang; kalau belum, nama perangkat dikirim sebagai isi awal.
- Menyimpan nama saat login ikut memperbarui akun, dengan pesan jelas kalau gagal.

### v1.1.012: tampilan tablet dan desktop
- Layar 1024px ke atas: sidebar kiri dengan tombol **Catat transaksi**, kolom isi maksimal 760px.
- Layar 1280px ke atas: Ringkasan tampil dua kolom (kartu operasional di kiri, grafik di kanan).
- Layar 768px ke atas: dialog dan sheet muncul di tengah layar.
- Ponsel dan Export PDF tidak berubah.

### v1.1.013: desktop untuk semua tab
- Layar 1280px ke atas: Akun dua kolom, Transaksi dan Laporan dengan panel filter menempel di kiri, Titipan dengan ringkasan di kiri, Data & Profil sebagai kartu dua kolom.
- Layar 1024–1279px: tab tetap satu kolom (maksimal 760px), pengaturan tampil sebagai kartu.

### v1.1.014: dua panel mulai 1024px
- Transaksi, Titipan, dan Laporan memakai dua panel (kiri 264px, isi di kanan) mulai layar 1024px, bukan 1280px. Laptop berlayar 1024–1279px tidak lagi terlihat seperti ponsel.
- Mulai 1280px panel kiri melebar dan bagian dalam Laporan dua kolom.
- Akun: kartu yang sendirian di grupnya memenuhi lebar grup.

### v1.1.015: logika pinjaman
- Bayar beberapa angsuran sekaligus (flat bertenor) kini dipecah benar: bunga per angsuran, bukan satu bulan.
- Simulasi pelunasan tidak lagi menganggap pinjaman tanpa angsuran lunas dalam 1 bulan; pinjaman itu dikeluarkan dengan catatan.
- Laporan menampilkan bunga flat dan bunga efektif (IRR) yang dibedakan dari bunga menurun.

### v1.1.017: performa (virtualisasi transaksi & saldo aset)
- Tab Transaksi menggambar 80 transaksi per halaman (bukan semuanya sekaligus), dengan tombol "Muat lebih banyak"; potongan halaman selalu di batas hari.
- `computeAllBalances()` untuk akun aset dipercepat dari `O(akun aset × transaksi)` ke `O(transaksi)` lewat pengelompokan transaksi per akun sekali di awal (`groupTxnsByAccount`).

### v1.1.018: performa perhitungan bunga pinjaman
- `computeLoanMonthlyInterest()` sebelumnya selalu scan ulang SELURUH `data.txns` lewat `accountBalance()` untuk menghitung sisa pokok, padahal nilai itu cuma dipakai untuk pinjaman bunga **menurun** — pinjaman **tetap/flat** memakai pokok awal, bukan sisa pokok, jadi scan-nya sia-sia untuk jenis ini.
- Sekarang scan hanya dijalankan kalau jenis bunganya memang menurun; fungsi ini juga menerima `bal` opsional dari pemanggil yang sudah punya saldo (`computeLoanSchedule`, laporan utang), supaya tidak scan ulang sama sekali. Hasil perhitungan sama persis, cuma lebih cepat di tab Akun & Laporan kalau akun pinjaman dan transaksi sudah banyak.

### v1.1.019: bisa di-install sebagai app (PWA)
- Tambah `manifest.json` + ikon (`icon-192.png`, `icon-512.png`, dan versi `maskable` untuk keduanya), warna ikon mengikuti skema app (teal `#1F4B43` di atas krem `#F6F1E6`). Motif ikon: dompet + koin (aksen rust `#A9532B`), bukan teks "Rp".
- `index.html`: tautan manifest, `theme-color`, `apple-touch-icon`, dan meta tag `apple-mobile-web-app-*` untuk iOS.
- Memunculkan opsi "Install"/"Tambahkan ke Layar utama" yang membuka app di jendela sendiri (tanpa address bar) di HP dan desktop.
- **Catatan:** prompt install otomatis Chrome butuh app di-host lewat `http://`/`https://` (mis. `python3 -m http.server`, GitHub Pages) — dibuka langsung dari `file://` tetap jalan normal, cuma tanpa prompt install otomatis.

### v1.1.020: color scheme & tipografi ("Modern mint")
- Palet diganti total: dasar abu-hijau sejuk (`#F3F6F4`), kartu putih bersih, primer mint cerah (`#14B88A`), aksen koral (`#FF6B4A`) — menjauh dari kombinasi krem+serif+terracotta lama yang dianggap "klise AI". Mode gelap disegarkan senada.
- Font judul diganti dari Fraunces (serif) ke Space Grotesk (sans modern); body tetap Inter.
- Ikon PWA dan `manifest.json` ikut disesuaikan ke palet baru. Murni visual, tidak ada perubahan logika.

## 4. File yang berubah

| File | 008 | 009 | 010 | 011 | 012 | 013 | 014 | 015 | 016 | 017 | 018 | 019 | 020 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `01-data.js` | ✓ |  |  | ✓ (komentar) |  |  |  | ✓ | ✓ | ✓ | ✓ |  |  |
| `02-navigasi.js` |  |  |  | ✓ |  |  |  |  |  |  |  |  |  |
| `12-render-utama.js` (versi) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `14-sync.js` |  | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |  |  |
| `15-startup.js` | ✓ |  |  |  |  |  |  |  |  |  |  |  |  |
| `index.html` |  |  | ✓ | ✓ | ✓ | ✓ |  |  | ✓ |  |  | ✓ | ✓ |
| `style.css` |  | ✓ |  |  | ✓ | ✓ | ✓ |  |  |  |  |  | ✓ |
| `04-akun.js` |  |  |  |  |  |  |  | ✓ | ✓ |  |  |  |  |
| `11-laporan.js` |  |  |  |  |  |  |  | ✓ | ✓ |  | ✓ |  |  |
| `README.md` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  | ✓ |  |
| `CHANGELOG.md` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `manifest.json` *(baru v019)* |  |  |  |  |  |  |  |  |  |  |  | ✓ | ✓ |
| `icon-192.png`, `icon-512.png`, `icon-maskable-*.png` *(baru v019)* |  |  |  |  |  |  |  |  |  |  |  | ✓ | ✓ |

### v1.1.016: anuitas & jadwal untuk bunga menurun, tenor untuk pinjaman bank
- Angsuran anuitas (PMT) dihitung otomatis kalau pokok, tenor, dan suku bunga diisi.
- Jadwal angsuran, progres, dan pengingat jatuh tempo kini juga berlaku untuk pinjaman bunga menurun (sebelumnya hanya bunga tetap).
- Kolom Tenor dan tanggal pencairan kini muncul di form pinjaman bank juga, tidak hanya pinjol.
- Laporan Total biaya utang menghitung sisa bunga pinjaman menurun dari jadwal, kalau datanya lengkap.

## 5. Cara pengujian

Semua perubahan diuji di browser headless (Playwright, Chromium) dengan Supabase tiruan:

- Render semua tab dengan data contoh tanpa error JavaScript.
- Data rusak: data asli tetap utuh, backup dan peringatan muncul.
- Login: isian kosong, gagal, berhasil, tombol mata, lupa kata sandi, tema terang/gelap, layar pendek.
- Menu gear: tanpa cloud, mode lokal lalu login, login saat boot.
- Nama pemilik: akun sudah punya nama, migrasi dari lokal, simpan berhasil, simpan gagal, mode lokal.
- Tampilan: lebar 1440, 1280, 1100, 1024, 900, dan 390px (tanpa scroll horizontal), dialog di tengah, mode cetak tetap satu kolom, dan interaksi di desktop (cari, filter, periode laporan, detail titipan dan akun).

**Belum teruji:** login dan sinkron ke Supabase sungguhan, karena key kosong.

## 6. Yang belum dikerjakan

1. Perbaiki `escapeHtml` di dalam atribut (escape tanda kutip) atau ganti dengan fungsi khusus atribut.
2. Kurangi risiko cache `$()` untuk elemen yang dibuat ulang lewat `innerHTML`.
3. Tinjau `supabase/setup.sql` dan pastikan RLS aktif sebelum mengisi `SUPABASE_ANON_KEY`.
4. Pertimbangkan mengganti nama default dan menghapus data contoh untuk pengguna baru.
5. Sinkron nama dari perangkat lain masih terlihat saat login atau app dibuka ulang, belum real-time.
6. Desktop tahap 3 (opsional): Transaksi bergaya tabel, Titipan master-detail (detail di panel kanan, bukan dialog), dan pintasan keyboard.

## 7. Cara memakai file hasil

Timpa file di folder proyek dengan versi terbaru dari folder output. Urutan pemuatan skrip di `index.html` tidak boleh diubah. Sebelum memasang versi baru, **Export JSON** dulu sebagai cadangan.

Sejak v1.1.019 ada **file baru** (bukan cuma timpa): `manifest.json`, `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`. Taruh semuanya di folder yang sama dengan file JS lainnya.

## 8. Lanjutan: v1.1.029 – v1.1.030 (23 Sep 2026, sesi terpisah)

Dua perbaikan tambahan di luar cakupan tabel §4 di atas (yang berhenti di v1.1.020):

### v1.1.029: proteksi ganti akun di device yang sama
- **Bug:** `STORAGE_KEY` di localStorage cuma satu untuk seluruh device, tidak dibedakan per akun cloud. Kalau device pernah sync ke akun A lalu Keluar dan Masuk/Daftar akun B, `syncReconcile()` (`14-sync.js`) mengira sisa data akun A itu "data perangkat ini" milik akun B — bisa tertukar, atau otomatis terkirim jadi isi awal akun B kalau cloud-nya masih kosong.
- **Perbaikan:** fungsi baru `syncGuardAccountSwitch()`, dipanggil di awal `syncStartSession()` sebelum `syncReconcile()` menyentuh localStorage. Kalau `uid` di `kp_sync_meta` beda dari akun yang baru login, data lama dibackup ke file JSON (`autoBackupBeforeReset`) lalu dihapus dan meta direset — device diperlakukan seolah baru pertama kali dipakai akun tersebut. Alur migrasi "mode lokal dulu → Daftar" tidak berubah (di situ `meta.uid` memang masih kosong).

### v1.1.030: prefix identitas user di nama file export/backup
- Fungsi baru `exportUserPrefix()` (`13-import-export.js`), dipakai di `exportJson`, `exportCsv`, dan `autoBackupBeforeReset`. Prioritas sumber: email akun cloud (bagian sebelum `@`) → nama pemilik di tab Profil → `'user'`. Contoh: `keuangan-budi-2026-09-23.json`.
- Melengkapi v1.1.029: file backup dari akun berbeda di device yang sama jadi mudah dibedakan tanpa buka isinya dulu.

**File yang berubah:** `14-sync.js`, `13-import-export.js`, `12-render-utama.js` (versi), `CHANGELOG.md`, `README.md`, `SUMMARY.md` (dokumen ini).

**Belum diuji end-to-end** dengan Supabase sungguhan (sama seperti catatan di §5) — logika diverifikasi lewat pembacaan kode (alur `syncReconcile`/`syncStartSession` dan pemanggilan `exportUserPrefix` di tiap fungsi export).

## 9. Saran: tab Profil — **sudah dikerjakan, lihat §10**

Usulan perbaikan tab Profil (`02-navigasi.js` `renderProfilTab()`, markup di `index.html` `#tab-profil`):

**Cepat / low effort**
- Tombol **"Masuk untuk sinkron"** langsung di `#profil-sync-none` (panggil `syncLoginFromMenu()`), bukan cuma teks yang menyuruh buka menu gear.
- Tombol **Keluar** di tab Profil sendiri (panggil `syncLogout()`), tidak cuma di menu gear.
- Validasi **email baru ≠ email lama** sebelum memanggil `syncChangeEmail()`.

**Menambah kegunaan**
- Tampilkan **status sync & tanggal backup JSON terakhir** (`LAST_EXPORT_KEY`) di Profil sebagai ringkasan "kesehatan data", plus tombol pintas **Backup sekarang** (`exportJson()`) — tanpa pindah ke tab Data.
- Pindahkan **toggle tema** (`cycleTheme()`, sekarang di menu gear) ke Profil, supaya Profil jadi hub preferensi pribadi (nama + tema), terpisah dari tab Data (manajemen data).

**Lebih besar**
- Opsi **"Hapus akun cloud"** — belum ada jalan bagi user menghapus akunnya sendiri. Hapus user Auth sungguhan butuh Supabase Edge Function (perlu `service_role` key, sengaja tidak ditaruh di client); langkah awal realistis: tombol yang mengosongkan baris `app_data` miliknya + logout, dengan peringatan jelas soal keterbatasannya.
- **Konfirmasi (`showConfirm`)** sebelum submit ganti email/password — dua aksi sensitif ini sekarang langsung jalan begitu tombol diklik, tidak seperti pola konfirmasi yang sudah dipakai di form transaksi.

## 10. Implementasi saran §9: v1.1.031 (23 Sep 2026)

Semua 7 poin di §9 dikerjakan sekaligus:

| Poin di §9 | Implementasi |
|---|---|
| Tombol "Masuk untuk sinkron" di Profil | `#profil-sync-none` di `index.html` sekarang punya tombol, bukan cuma teks |
| Tombol Keluar di Profil | Ditambahkan di `#profil-sync-section`, memanggil `syncLogout()` yang sudah ada |
| Validasi email baru ≠ lama | `syncChangeEmail()` (`14-sync.js`) menolak kalau sama persis (case-insensitive) |
| Status sync & tanggal backup terakhir + tombol Backup sekarang | Bagian baru "Kesehatan data" di Profil; fungsi baru `lastExportSummary()` (`13-import-export.js`) dan `profilBackupNow()`; `syncSetStatus()` (`14-sync.js`) diperbarui supaya juga menulis ke `#profil-sync-status`, bukan cuma footer |
| Pindahkan toggle tema ke Profil | **Deviasi kecil dari usulan:** tombol tema **ditambahkan** ke Profil (`#profil-theme-btn`), bukan dipindah/dihapus dari menu gear — supaya akses cepat dari tab manapun tetap ada. `applyTheme()` menyamakan label di kedua tombol |
| Opsi hapus akun cloud | Fungsi baru `syncDeleteCloudData()` (`14-sync.js`, 2x konfirmasi + backup otomatis): hapus baris `app_data` di cloud + localStorage perangkat ini. **Tidak** menghapus akun Auth Supabase itu sendiri — dicatat jelas di UI (butuh Edge Function + `service_role` key, sengaja di luar cakupan app client) |
| Konfirmasi sebelum ganti email/password | `syncChangeEmail()` dan `syncChangePassword()` (`14-sync.js`) sekarang `showConfirm()` dulu sebelum memanggil Supabase |

**File yang berubah:** `index.html` (markup tab Profil dirombak), `02-navigasi.js` (`renderProfilTab`, `applyTheme`, `cycleTheme`, `currentThemeMode` baru), `13-import-export.js` (`lastExportSummary`, `profilBackupNow` baru; `markExported` memanggil `renderProfilTab`), `14-sync.js` (`syncSetStatus`, `syncChangeEmail`, `syncChangePassword` diubah; `syncDeleteCloudData` baru), `12-render-utama.js` (versi), `CHANGELOG.md`, `README.md`, `SUMMARY.md` (dokumen ini). Tidak ada perubahan CSS — tombol "danger" pakai class `.io-btn.danger` yang sudah ada (dipakai juga di "Reset semua data" tab Data).

**Belum diuji end-to-end** dengan Supabase sungguhan (sama seperti catatan di §5/§8) — termasuk `syncDeleteCloudData()` yang memanggil `.delete()` ke tabel `app_data`.



