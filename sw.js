/* Service worker Keuangan Pribadi.
 * Strategi: NETWORK-FIRST dengan cadangan cache. Saat online selalu ambil versi terbaru
 * (jadi tidak ada risiko app basi), saat offline pakai salinan terakhir yang tersimpan.
 * Hanya menangani file app sendiri + pustaka Supabase (jsdelivr) + font Google.
 * TIDAK PERNAH menyentuh API Supabase (*.supabase.co) atau permintaan non-GET.
 * Naikkan CACHE_VERSION bersamaan dengan APP_VERSION supaya cache lama dibersihkan. */
const CACHE_VERSION = 'kp-v1.1.154';
const APP_SHELL = [
  './', 'index.html', 'style.css', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png',
  '00-config.js', '01-data.js', '02-navigasi.js', '02b-rute.js', '03-form-transaksi.js', '03b-label.js', '03c-pecah.js', '03d-kategori-otomatis.js', '03e-foto-struk.js', '04-akun.js', '04b-akun-detail.js', '04c-akun-aset-tagihan.js',
  '05-form-titipan.js', '06-util-ui.js', '06b-kunci.js', '06c-kalkulator.js', '07-render-akun-transaksi.js', '08-render-titipan.js',
  '09-grafik.js', '10-render-beranda.js', '10b-anggaran.js', '10c-langganan.js', '10d-changelog.js', '10e-dana-darurat.js', '10k-target.js', '10f-tren-utang.js', '10g-denda-telat.js', '10h-ics-tagihan.js', '10i-rekonsiliasi.js', '10j-perhatian.js', '11-laporan.js', '11b-laporan-utang.js', '11c-laporan-proyeksi.js', '11d-bandingkan.js', '10l-pengingat-cadangan.js', '12-render-utama.js',
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

// ---- Pengingat cadangan (v1.1.146) ----
// Keadaan cadangan disalin aplikasi ke IndexedDB 'keuangan-pengingat' (sw.js tidak bisa membaca localStorage).
// Fungsi murni di antara penanda ini harus sama dengan backupDueState/backupNotifBody di 10l-pengingat-cadangan.js (dijaga test).
// <pengingat-murni>
function backupDueState(info, nowMs) {
  const last = info && info.last;
  let days = last ? Math.floor((nowMs - new Date(last).getTime()) / 86400000) : null;
  if (days !== null && isNaN(days)) days = null;
  const snooze = Number(info && info.snooze) || 0;
  const need = ((info && info.txnCount) || 0) >= 10 && (days === null || days >= 14) && nowMs >= snooze;
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
    await self.registration.showNotification('Cadangkan data keuangan', { body: backupNotifBody(d.days), tag: 'backup-reminder', icon: 'icon-192.png', data: { url: './' } });
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
