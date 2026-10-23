# Pemetaan nama berkas (v1.1.169)

Struktur lama bernomor (`00-…`, `10l-…`) diganti struktur per domain. Urutan muat `<script>` di `index.html` TIDAK berubah (semua berbagi scope global), hanya nama dan lokasinya.

| Nama lama | Lokasi baru |
|---|---|
| `00-config.js` | `src/js/core/config.js` |
| `01-data.js` | `src/js/core/data.js` |
| `02-navigasi.js` | `src/js/core/navigasi.js` |
| `12-render-utama.js` | `src/js/core/render-utama.js` |
| `02b-rute.js` | `src/js/core/rute.js` |
| `15-startup.js` | `src/js/core/startup.js` |
| `06-util-ui.js` | `src/js/core/util-ui.js` |
| `04c-akun-aset-tagihan.js` | `src/js/features/akun/akun-aset-tagihan.js` |
| `04b-akun-detail.js` | `src/js/features/akun/akun-detail.js` |
| `04-akun.js` | `src/js/features/akun/akun.js` |
| `10g-denda-telat.js` | `src/js/features/akun/denda-telat.js` |
| `10h-ics-tagihan.js` | `src/js/features/akun/ics-tagihan.js` |
| `10i-rekonsiliasi.js` | `src/js/features/akun/rekonsiliasi.js` |
| `07-render-akun-transaksi.js` | `src/js/features/akun/render-akun-transaksi.js` |
| `10f-tren-utang.js` | `src/js/features/akun/tren-utang.js` |
| `10j-perhatian.js` | `src/js/features/beranda/perhatian.js` |
| `10-render-beranda.js` | `src/js/features/beranda/render-beranda.js` |
| `13-import-export.js` | `src/js/features/data/import-export.js` |
| `14-sync.js` | `src/js/features/data/sync.js` |
| `11d-bandingkan.js` | `src/js/features/laporan/bandingkan.js` |
| `09-grafik.js` | `src/js/features/laporan/grafik.js` |
| `11c-laporan-proyeksi.js` | `src/js/features/laporan/laporan-proyeksi.js` |
| `11b-laporan-utang.js` | `src/js/features/laporan/laporan-utang.js` |
| `11-laporan.js` | `src/js/features/laporan/laporan.js` |
| `10b-anggaran.js` | `src/js/features/perencanaan/anggaran.js` |
| `10e-dana-darurat.js` | `src/js/features/perencanaan/dana-darurat.js` |
| `10c-langganan.js` | `src/js/features/perencanaan/langganan.js` |
| `10k-target.js` | `src/js/features/perencanaan/target.js` |
| `10d-changelog.js` | `src/js/features/profil/changelog.js` |
| `06c-kalkulator.js` | `src/js/features/profil/kalkulator.js` |
| `06b-kunci.js` | `src/js/features/profil/kunci-aplikasi.js` |
| `10l-pengingat-cadangan.js` | `src/js/features/profil/pengingat-cadangan.js` |
| `05-form-titipan.js` | `src/js/features/titipan/form-titipan.js` |
| `08-render-titipan.js` | `src/js/features/titipan/render-titipan.js` |
| `03-form-transaksi.js` | `src/js/features/transaksi/form-transaksi.js` |
| `03e-foto-struk.js` | `src/js/features/transaksi/foto-struk.js` |
| `03d-kategori-otomatis.js` | `src/js/features/transaksi/kategori-otomatis.js` |
| `03b-label.js` | `src/js/features/transaksi/label.js` |
| `03c-pecah.js` | `src/js/features/transaksi/pecah.js` |
| `style.css` | `src/css/app.css` |
| `SUMMARY.md` | `docs/SUMMARY.md` |
| `CHANGELOG-ARSIP.md` | `docs/CHANGELOG-ARSIP.md` |
