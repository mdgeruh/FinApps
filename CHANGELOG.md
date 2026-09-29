# Changelog

Riwayat perubahan **Keuangan Pribadi**, yang terbaru di atas. Nomor versi mengikuti `APP_VERSION` (footer app di tab Profil).

- **v1.1.059 ke atas:** dicatat lengkap di bawah.
- **v1.1.058 ke bawah:** ringkasan satu baris per perubahan di bagian "Ringkasan versi lama". Teks lengkapnya (plus riwayat sebelum penomoran, v1.0–v1.2) ada di [CHANGELOG-ARSIP.md](CHANGELOG-ARSIP.md).
- Ringkasan bahasa awam untuk pengguna ada di tombol `?` (tab Profil), bersumber dari `10d-changelog.js`.

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
