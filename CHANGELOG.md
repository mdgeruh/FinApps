# Changelog

Riwayat perubahan **Keuangan Pribadi**, yang terbaru di atas. Nomor versi mengikuti `APP_VERSION` (footer app di tab Profil).

- **v1.1.059 ke atas:** dicatat lengkap di bawah.
- **v1.1.058 ke bawah:** ringkasan satu baris per perubahan di bagian "Ringkasan versi lama". Teks lengkapnya (plus riwayat sebelum penomoran, v1.0–v1.2) ada di [CHANGELOG-ARSIP.md](CHANGELOG-ARSIP.md).
- Ringkasan bahasa awam untuk pengguna ada di tombol `?` (tab Profil), bersumber dari `10d-changelog.js`.

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
