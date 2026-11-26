# Pemetaan nama berkas

**v1.1.182:** struktur disederhanakan. Semua JS di satu folder `js/`, CSS di `css/app.css`, ikon di `icons/`. Nama berkas tidak berubah dari v1.1.169, hanya subfolder `core/` dan `features/<domain>/` dihapus. Urutan muat `<script>` di `index.html` tidak berubah (semua berbagi scope global).

Ikon (`icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`) dipindah dari akar ke `icons/`.

**v1.1.169:** struktur lama bernomor (`00-…`, `10l-…`) diganti nama per domain.

| Nama lama (sebelum v1.1.169) | Lokasi sekarang (v1.1.182) |
|---|---|
| `00-config.js` | `js/config.js` |
| `01-data.js` | `js/data.js` |
| `02-navigasi.js` | `js/navigasi.js` |
| `12-render-utama.js` | `js/render-utama.js` |
| `02b-rute.js` | `js/rute.js` |
| `15-startup.js` | `js/startup.js` |
| `06-util-ui.js` | `js/util-ui.js` |
| `04c-akun-aset-tagihan.js` | `js/akun-aset-tagihan.js` |
| `04b-akun-detail.js` | `js/akun-detail.js` |
| `04-akun.js` | `js/akun.js` |
| `10g-denda-telat.js` | `js/denda-telat.js` |
| `10h-ics-tagihan.js` | `js/ics-tagihan.js` |
| `10i-rekonsiliasi.js` | `js/rekonsiliasi.js` |
| `07-render-akun-transaksi.js` | `js/render-akun-transaksi.js` |
| `10f-tren-utang.js` | `js/tren-utang.js` |
| `10j-perhatian.js` | `js/perhatian.js` |
| `10-render-beranda.js` | `js/render-beranda.js` |
| `13-import-export.js` | `js/import-export.js` |
| `14-sync.js` | `js/sync.js` |
| `11d-bandingkan.js` | `js/bandingkan.js` |
| `09-grafik.js` | `js/grafik.js` |
| `11c-laporan-proyeksi.js` | `js/laporan-proyeksi.js` |
| `11b-laporan-utang.js` | `js/laporan-utang.js` |
| `11-laporan.js` | `js/laporan.js` |
| `10b-anggaran.js` | `js/anggaran.js` |
| `10e-dana-darurat.js` | `js/dana-darurat.js` |
| `10c-langganan.js` | `js/langganan.js` |
| `10k-target.js` | `js/target.js` |
| `10d-changelog.js` | `js/changelog.js` |
| `06c-kalkulator.js` | `js/kalkulator.js` |
| `06b-kunci.js` | `js/kunci-aplikasi.js` |
| `10l-pengingat-cadangan.js` | `js/pengingat-cadangan.js` |
| `05-form-titipan.js` | `js/form-titipan.js` |
| `08-render-titipan.js` | `js/render-titipan.js` |
| `03-form-transaksi.js` | `js/form-transaksi.js` |
| `03e-foto-struk.js` | `js/foto-struk.js` |
| `03d-kategori-otomatis.js` | `js/kategori-otomatis.js` |
| `03b-label.js` | `js/label.js` |
| `03c-pecah.js` | `js/pecah.js` |
| `style.css` | `css/app.css` |
| `SUMMARY.md` | `docs/SUMMARY.md` |
| `CHANGELOG-ARSIP.md` | `docs/CHANGELOG-ARSIP.md` |

Berkas dokumen baru (25 Nov 2026, v1.1.191): `docs/ROADMAP.md` (rencana yang belum selesai) dan `docs/ARSIP-TODOLIST.md` (rincian pekerjaan selesai, dipindah dari `SUMMARY.md`).
