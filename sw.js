/* Service worker Keuangan Pribadi.
 * Strategi: NETWORK-FIRST dengan cadangan cache. Saat online selalu ambil versi terbaru
 * (jadi tidak ada risiko app basi), saat offline pakai salinan terakhir yang tersimpan.
 * Hanya menangani file app sendiri + pustaka Supabase (jsdelivr) + font Google.
 * TIDAK PERNAH menyentuh API Supabase (*.supabase.co) atau permintaan non-GET.
 * Naikkan CACHE_VERSION bersamaan dengan APP_VERSION supaya cache lama dibersihkan. */
const CACHE_VERSION = 'kp-v1.1.053';
const APP_SHELL = [
  './', 'index.html', 'style.css', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png',
  '00-config.js', '01-data.js', '02-navigasi.js', '03-form-transaksi.js', '04-akun.js', '04b-akun-detail.js', '04c-akun-aset-tagihan.js',
  '05-form-titipan.js', '06-util-ui.js', '07-render-akun-transaksi.js', '08-render-titipan.js',
  '09-grafik.js', '10-render-beranda.js', '11-laporan.js', '11b-laporan-utang.js', '11c-laporan-proyeksi.js', '12-render-utama.js',
  '13-import-export.js', '14-sync.js', '15-startup.js'
];
const CDN_HOSTS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    // satu per satu: file yang tidak ada (mis. ikon) tidak menggagalkan seluruh instalasi
    await Promise.allSettled(APP_SHELL.map(u => cache.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('kp-') && k !== CACHE_VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !CDN_HOSTS.includes(url.hostname)) return;   // termasuk *.supabase.co: biarkan lewat

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    try {
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    } catch (e) {
      const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
      if (hit) return hit;
      if (req.mode === 'navigate') { const shell = await cache.match('index.html'); if (shell) return shell; }
      throw e;
    }
  })());
});
