/* Service worker Keuangan Pribadi.
 * Strategi: NETWORK-FIRST dengan cadangan cache. Saat online selalu ambil versi terbaru
 * (jadi tidak ada risiko app basi), saat offline pakai salinan terakhir yang tersimpan.
 * Hanya menangani file app sendiri + pustaka Supabase (jsdelivr) + font Google.
 * TIDAK PERNAH menyentuh API Supabase (*.supabase.co) atau permintaan non-GET.
 * Naikkan CACHE_VERSION bersamaan dengan APP_VERSION supaya cache lama dibersihkan. */
const CACHE_VERSION = 'kp-v1.1.192';
const APP_SHELL = [
  './', 'index.html', 'css/app.css', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-192.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png', 'icons/icon.svg',
  'js/config.js', 'js/data.js', 'js/kategori-data.js', 'js/kelola-kategori.js', 'js/halaman-profil.js', 'js/pengaturan-sync.js', 'js/navigasi.js', 'js/rute.js', 'js/form-transaksi.js', 'js/label.js', 'js/pecah.js', 'js/kategori-otomatis.js', 'js/foto-struk.js', 'js/akun.js', 'js/akun-detail.js', 'js/akun-aset-tagihan.js',
  'js/form-titipan.js', 'js/util-ui.js', 'js/kunci-aplikasi.js', 'js/kalkulator.js', 'js/render-akun-transaksi.js', 'js/render-titipan.js',
  'js/grafik.js', 'js/render-beranda.js', 'js/anggaran.js', 'js/langganan.js', 'js/changelog.js', 'js/dana-darurat.js', 'js/target.js', 'js/tren-utang.js', 'js/denda-telat.js', 'js/ics-tagihan.js', 'js/rekonsiliasi.js', 'js/perhatian.js', 'js/laporan.js', 'js/laporan-utang.js', 'js/laporan-proyeksi.js', 'js/bandingkan.js', 'js/pengingat-cadangan.js', 'js/render-utama.js',
  'js/import-export.js', 'js/sync.js', 'js/startup.js'
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

// ---- Pengingat cadangan (v1.1.146) ----
// Keadaan cadangan disalin aplikasi ke IndexedDB 'keuangan-pengingat' (sw.js tidak bisa membaca localStorage).
// Fungsi murni di antara penanda ini harus sama dengan backupDueState/backupNotifBody di js/pengingat-cadangan.js (dijaga test).
// <pengingat-murni>
function backupDueState(info, nowMs) {   // info.intervalDays opsional (bawaan 14)
  const last = info && info.last;
  let days = last ? Math.floor((nowMs - new Date(last).getTime()) / 86400000) : null;
  if (days !== null && isNaN(days)) days = null;
  const snooze = Number(info && info.snooze) || 0;
  const need = ((info && info.txnCount) || 0) >= 10 && (days === null || days >= (Number(info && info.intervalDays) > 0 ? Number(info.intervalDays) : 14)) && nowMs >= snooze;
  return { need: need, days: days };
}
function backupNotifBody(days) {
  return (days === null ? 'Kamu belum pernah mengekspor cadangan.' : 'Cadangan terakhir ' + days + ' hari lalu.') + ' Ketuk untuk membuka aplikasi lalu ekspor JSON.';
}
// </pengingat-murni>
function remOpen() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('keuangan-pengingat', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('kv', { keyPath: 'id' }); };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function remCheck() {
  try {
    const db = await remOpen();
    const st = await new Promise((res) => { const g = db.transaction('kv', 'readonly').objectStore('kv').get('state'); g.onsuccess = () => res(g.result || null); g.onerror = () => res(null); });
    if (!st || !st.enabled) return;
    const now = Date.now();
    const d = backupDueState(st, now);
    if (!d.need) return;
    if (st.notifiedAt && now - st.notifiedAt < 20 * 3600 * 1000) return;   // paling sering sekali per ~20 jam
    await self.registration.showNotification('Cadangkan data keuangan', { body: backupNotifBody(d.days), tag: 'backup-reminder', icon: 'icons/icon-192.png', data: { url: './' } });
    st.notifiedAt = now;
    await new Promise((res) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(st); tx.oncomplete = () => res(); tx.onerror = () => res(); });
  } catch (e) { /* abaikan */ }
}
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'backup-reminder') event.waitUntil(remCheck());
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow('./');
  })());
});
