  // ============================================================
  // PENGINGAT CADANGAN LEWAT NOTIFIKASI (v1.1.146)
  // Aplikasi ini statis (tanpa server push), jadi notifikasi di latar belakang memakai Periodic Background Sync
  // milik service worker: browser membangunkan sw.js beberapa kali sehari, sw.js membaca "keadaan cadangan" dari
  // IndexedDB (keuangan-pengingat) dan menampilkan notifikasi bila cadangan sudah lewat 14 hari. Karena sw.js tidak bisa
  // membaca localStorage, aplikasi menyalin keadaan itu (terakhir ekspor, tunda, jumlah transaksi) ke IndexedDB.
  // Syarat dan aturan "kapan perlu cadangan" sama persis dengan kartu di Ringkasan (backupDueState dipakai bersama;
  // salinan murni yang sama ada di sw.js dan dijaga sama oleh test).
  // ============================================================
  const REMINDER_DB = 'keuangan-pengingat';
  const REMINDER_STORE = 'kv';
  const REMINDER_TAG = 'backup-reminder';
  const REMINDER_ENABLED_KEY = 'keuangan-notif-backup-v1';
  const REMINDER_MIN_TXNS = 10;
  const REMINDER_DAYS = 14;   // bawaan; bisa diganti 7 / 14 / 30 hari di Profil (v1.1.161)
  const REMINDER_INTERVALS = [7, 14, 30];
  const REMINDER_INTERVAL_KEY = 'keuangan-jarak-cadangan-v1';
  function reminderIntervalDays() {
    let v = REMINDER_DAYS;
    try { v = Number(localStorage.getItem(REMINDER_INTERVAL_KEY)) || REMINDER_DAYS; } catch (e) { /* abaikan */ }
    return REMINDER_INTERVALS.indexOf(v) >= 0 ? v : REMINDER_DAYS;
  }
  function setReminderInterval(d) {
    d = Number(d);
    if (REMINDER_INTERVALS.indexOf(d) < 0) d = REMINDER_DAYS;
    try { if (d === REMINDER_DAYS) settingRemove(REMINDER_INTERVAL_KEY); else settingSet(REMINDER_INTERVAL_KEY, String(d)); } catch (e) { /* abaikan */ }
    reminderSyncState();
    renderBackupNotifSettings();
    if (typeof renderBackupReminder === 'function') renderBackupReminder(loadData());
    if (typeof renderProfilStatus === 'function') renderProfilStatus();
  }

  // Murni. info = { last: ISO|null, snooze: ms, txnCount }.
  function backupDueState(info, nowMs) {   // info.intervalDays opsional (bawaan 14)
    const last = info && info.last;
    let days = last ? Math.floor((nowMs - new Date(last).getTime()) / 86400000) : null;
    if (days !== null && isNaN(days)) days = null;
    const snooze = Number(info && info.snooze) || 0;
    const need = ((info && info.txnCount) || 0) >= REMINDER_MIN_TXNS && (days === null || days >= (Number(info && info.intervalDays) > 0 ? Number(info.intervalDays) : 14)) && nowMs >= snooze;
    return { need: need, days: days };
  }
  function backupNotifBody(days) {
    return (days === null ? 'Kamu belum pernah mengekspor cadangan.' : 'Cadangan terakhir ' + days + ' hari lalu.') + ' Ketuk untuk membuka aplikasi lalu ekspor JSON.';
  }

  // ----- status dan dukungan -----
  function reminderSwSupported() { return typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof Notification !== 'undefined'; }
  function reminderBgSupported() { return reminderSwSupported() && typeof ServiceWorkerRegistration !== 'undefined' && 'periodicSync' in ServiceWorkerRegistration.prototype; }
  function reminderPermission() { return reminderSwSupported() ? Notification.permission : 'unsupported'; }
  function reminderEnabled() {
    try { return localStorage.getItem(REMINDER_ENABLED_KEY) === '1'; } catch (e) { return false; }
  }

  // ----- IndexedDB (dibaca juga oleh sw.js) -----
  let reminderDbPromise = null;
  function reminderDb() {
    if (typeof indexedDB === 'undefined' || !indexedDB) return Promise.reject(new Error('IndexedDB tidak tersedia'));
    if (!reminderDbPromise) {
      reminderDbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(REMINDER_DB, 1);
        req.onupgradeneeded = () => { req.result.createObjectStore(REMINDER_STORE, { keyPath: 'id' }); };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => { reminderDbPromise = null; reject(req.error); };
      });
    }
    return reminderDbPromise;
  }
  function reminderRead() {
    return reminderDb().then(db => new Promise((resolve) => {
      const g = db.transaction(REMINDER_STORE, 'readonly').objectStore(REMINDER_STORE).get('state');
      g.onsuccess = () => resolve(g.result || null);
      g.onerror = () => resolve(null);
    })).catch(() => null);
  }
  function reminderWrite(obj) {
    return reminderDb().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(REMINDER_STORE, 'readwrite');
      tx.objectStore(REMINDER_STORE).put(Object.assign({ id: 'state' }, obj));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    }));
  }
  // Salin keadaan terbaru ke IndexedDB. Aman dipanggil kapan saja; kegagalan tidak mengganggu aplikasi.
  async function reminderSyncState() {
    try {
      let last = null, snooze = 0;
      try { last = localStorage.getItem(LAST_EXPORT_KEY); snooze = Number(localStorage.getItem(BACKUP_SNOOZE_KEY)) || 0; } catch (e) { /* abaikan */ }
      const old = (await reminderRead()) || {};
      await reminderWrite({ enabled: reminderEnabled(), last: last, snooze: snooze, txnCount: loadData().txns.length, intervalDays: reminderIntervalDays(), notifiedAt: old.notifiedAt || 0 });
    } catch (e) { /* abaikan */ }
  }

  // ----- aktif / matikan / tes -----
  async function reminderRegistration() {
    return navigator.serviceWorker.ready;
  }
  async function enableBackupNotif() {
    if (!reminderSwSupported()) return 'unsupported';
    let perm = Notification.permission;
    if (perm === 'default') perm = await Notification.requestPermission();
    if (perm !== 'granted') return perm;
    try { localStorage.setItem(REMINDER_ENABLED_KEY, '1'); } catch (e) { /* abaikan */ }
    if (reminderBgSupported()) {
      try { const reg = await reminderRegistration(); await reg.periodicSync.register(REMINDER_TAG, { minInterval: 12 * 3600 * 1000 }); } catch (e) { /* izin periodic sync bisa ditolak browser */ }
    }
    await reminderSyncState();
    return 'granted';
  }
  async function disableBackupNotif() {
    try { localStorage.removeItem(REMINDER_ENABLED_KEY); } catch (e) { /* abaikan */ }
    if (reminderBgSupported()) {
      try { const reg = await reminderRegistration(); await reg.periodicSync.unregister(REMINDER_TAG); } catch (e) { /* abaikan */ }
    }
    await reminderSyncState();
  }
  async function toggleBackupNotif() {
    const msg = $('backup-notif-msg');
    const setMsg = (t, k) => { if (msg) { msg.textContent = t; msg.className = 'io-msg ' + (k || ''); } };
    if (reminderEnabled()) { await disableBackupNotif(); setMsg('Pengingat notifikasi dimatikan.', 'ok'); }
    else {
      const r = await enableBackupNotif();
      if (r === 'granted') setMsg('Pengingat notifikasi aktif.', 'ok');
      else if (r === 'denied') setMsg('Izin notifikasi ditolak. Aktifkan lewat pengaturan situs di browser.', 'err');
      else if (r === 'unsupported') setMsg('Browser ini tidak mendukung notifikasi.', 'err');
      else setMsg('Izin notifikasi belum diberikan.', 'err');
    }
    renderBackupNotifSettings();
  }
  async function testBackupNotif() {
    const msg = $('backup-notif-msg');
    try {
      const reg = await reminderRegistration();
      await reg.showNotification('Cadangkan data keuangan', { body: 'Ini contoh pengingat. Notifikasi sungguhan muncul bila cadangan sudah lewat ' + reminderIntervalDays() + ' hari.', tag: REMINDER_TAG + '-test', icon: 'icon-192.png', data: { url: './' } });
      if (msg) { msg.textContent = 'Notifikasi contoh dikirim.'; msg.className = 'io-msg ok'; }
    } catch (e) {
      if (msg) { msg.textContent = 'Notifikasi gagal ditampilkan.'; msg.className = 'io-msg err'; }
    }
  }

  // ----- tampilan di tab Profil -----
  function renderBackupNotifSettings() {
    const st = $('backup-notif-status'), btn = $('backup-notif-toggle'), tst = $('backup-notif-test');
    if (!st || !btn) return;
    const perm = reminderPermission();
    let text, label = 'Aktifkan notifikasi', canTest = false;
    if (perm === 'unsupported') { text = 'Browser ini tidak mendukung notifikasi. Pengingat tetap muncul sebagai kartu di Ringkasan.'; btn.style.display = 'none'; }
    else if (perm === 'denied') { text = 'Izin notifikasi diblokir di browser. Aktifkan lewat pengaturan situs, lalu buka halaman ini lagi.'; btn.style.display = 'none'; }
    else {
      btn.style.display = '';
      if (reminderEnabled() && perm === 'granted') {
        label = 'Matikan notifikasi'; canTest = true;
        text = reminderBgSupported()
          ? 'Aktif. Kalau cadangan JSON terakhir sudah lewat ' + reminderIntervalDays() + ' hari (dan datamu sudah ' + REMINDER_MIN_TXNS + '+ transaksi), browser akan menampilkan notifikasi walau aplikasi tertutup. Waktu munculnya diatur browser.'
          : 'Aktif, tetapi browser ini belum mendukung pengingat di latar belakang. Pengingat tetap muncul sebagai kartu di Ringkasan saat aplikasi dibuka.';
      } else {
        text = 'Dapatkan notifikasi bila sudah ' + reminderIntervalDays() + ' hari tanpa cadangan JSON. Paling andal di aplikasi yang dipasang ke layar utama (Chrome/Edge); di browser lain pengingat tetap berupa kartu di Ringkasan.';
      }
    }
    st.textContent = text; btn.textContent = label;
    const iv = $('backup-interval-opts');
    if (iv) {
      const cur = reminderIntervalDays();
      iv.innerHTML = REMINDER_INTERVALS.map(d => '<button type="button" class="theme-opt" data-act="setReminderInterval" data-n0="' + d + '" aria-pressed="' + (cur === d) + '">' + d + ' hari</button>').join('');
    }
    if (tst) tst.style.display = canTest ? '' : 'none';
    if (btn.parentNode) btn.parentNode.style.display = (btn.style.display === 'none' && !canTest) ? 'none' : '';   // baris tombol kosong tidak memakan ruang
  }
