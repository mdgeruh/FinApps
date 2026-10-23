#!/bin/bash
# Pindahkan berkas ke struktur v1.1.169 dengan riwayat git tetap terjaga.
# Jalankan SEKALI dari akar repo sebelum menimpa dengan isi zip baru:  bash tools/migrasi-struktur.sh
set -e
mkdir -p docs src/css src/js/core src/js/features/akun src/js/features/beranda src/js/features/data src/js/features/laporan src/js/features/perencanaan src/js/features/profil src/js/features/titipan src/js/features/transaksi
git mv 00-config.js src/js/core/config.js
git mv 01-data.js src/js/core/data.js
git mv 02-navigasi.js src/js/core/navigasi.js
git mv 12-render-utama.js src/js/core/render-utama.js
git mv 02b-rute.js src/js/core/rute.js
git mv 15-startup.js src/js/core/startup.js
git mv 06-util-ui.js src/js/core/util-ui.js
git mv 04c-akun-aset-tagihan.js src/js/features/akun/akun-aset-tagihan.js
git mv 04b-akun-detail.js src/js/features/akun/akun-detail.js
git mv 04-akun.js src/js/features/akun/akun.js
git mv 10g-denda-telat.js src/js/features/akun/denda-telat.js
git mv 10h-ics-tagihan.js src/js/features/akun/ics-tagihan.js
git mv 10i-rekonsiliasi.js src/js/features/akun/rekonsiliasi.js
git mv 07-render-akun-transaksi.js src/js/features/akun/render-akun-transaksi.js
git mv 10f-tren-utang.js src/js/features/akun/tren-utang.js
git mv 10j-perhatian.js src/js/features/beranda/perhatian.js
git mv 10-render-beranda.js src/js/features/beranda/render-beranda.js
git mv 13-import-export.js src/js/features/data/import-export.js
git mv 14-sync.js src/js/features/data/sync.js
git mv 11d-bandingkan.js src/js/features/laporan/bandingkan.js
git mv 09-grafik.js src/js/features/laporan/grafik.js
git mv 11c-laporan-proyeksi.js src/js/features/laporan/laporan-proyeksi.js
git mv 11b-laporan-utang.js src/js/features/laporan/laporan-utang.js
git mv 11-laporan.js src/js/features/laporan/laporan.js
git mv 10b-anggaran.js src/js/features/perencanaan/anggaran.js
git mv 10e-dana-darurat.js src/js/features/perencanaan/dana-darurat.js
git mv 10c-langganan.js src/js/features/perencanaan/langganan.js
git mv 10k-target.js src/js/features/perencanaan/target.js
git mv 10d-changelog.js src/js/features/profil/changelog.js
git mv 06c-kalkulator.js src/js/features/profil/kalkulator.js
git mv 06b-kunci.js src/js/features/profil/kunci-aplikasi.js
git mv 10l-pengingat-cadangan.js src/js/features/profil/pengingat-cadangan.js
git mv 05-form-titipan.js src/js/features/titipan/form-titipan.js
git mv 08-render-titipan.js src/js/features/titipan/render-titipan.js
git mv 03-form-transaksi.js src/js/features/transaksi/form-transaksi.js
git mv 03e-foto-struk.js src/js/features/transaksi/foto-struk.js
git mv 03d-kategori-otomatis.js src/js/features/transaksi/kategori-otomatis.js
git mv 03b-label.js src/js/features/transaksi/label.js
git mv 03c-pecah.js src/js/features/transaksi/pecah.js
git mv style.css src/css/app.css
git mv SUMMARY.md docs/SUMMARY.md
git mv CHANGELOG-ARSIP.md docs/CHANGELOG-ARSIP.md
[ -f cmp.png ] && git rm -q cmp.png || true
echo "Selesai. Lanjutkan: timpa berkas dengan isi zip v1.1.169, lalu git add -A dan commit."
