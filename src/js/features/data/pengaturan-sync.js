  // ============================================================
  // PENGATURAN IKUT SINKRON (v1.1.180)
  // Pengaturan tampilan dan preferensi (tema, palet, aksen, kaca, nama profil, cegah saldo minus, kata kunci kategori otomatis,
  // kartu Ringkasan, ambang perbandingan, dll.) tetap dibaca dari localStorage seperti biasa (cepat, jalan offline), lalu
  // disalin ke dalam data (data.settings) setiap kali berubah. Karena seluruh data dikirim ke Supabase, pengaturan ikut terkirim
  // dan terpakai di perangkat lain; tabel cloud tidak berubah. Ikut juga di cadangan/ekspor JSON.
  // Sengaja TIDAK disinkronkan (khusus perangkat atau sensitif): menu samping, PIN, izin notifikasi, jadwal tunda cadangan, info sinkron.
  // Kategori buatan sendiri sudah ada di dalam data (data.categories) sehingga ikut sinkron tanpa langkah ini.
  // ============================================================
  const SYNCED_SETTING_KEYS = ['kp_theme', 'kp_palette', 'kp_accent', 'kp_glass', 'kp_owner_name', 'keuangan-cegah-minus-v1', 'keuangan-kata-kunci-v1',
    'keuangan-ringkasan-hidden-v1', 'keuangan-ringkasan-order-v1', 'keuangan-ringkasan-segmen-v1', 'keuangan-ambang-bandingkan-v1',
    'keuangan-jarak-cadangan-v1', 'keuangan-periode-grafik-mini-v1', 'kp_acc_layout', 'kp_acc_collapsed'];
  const SETTING_VALUE_MAX = 20000;   // karakter per pengaturan
  let settingsTimer = null;

  // Murni: bentuk { v: 1, items: { kunci: 'nilai mentah' } }; kunci tak dikenal, nilai bukan teks atau terlalu panjang dibuang. Tidak valid -> null.
  function sanitizeSettings(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !raw.items || typeof raw.items !== 'object' || Array.isArray(raw.items)) return null;
    const items = {};
    SYNCED_SETTING_KEYS.forEach(k => {
      const v = raw.items[k];
      if (typeof v === 'string' && v.length <= SETTING_VALUE_MAX) items[k] = v;
    });
    return { v: 1, items: items };
  }
  // Pengaturan di perangkat ini sekarang (hanya yang pernah diubah dari bawaan).
  function settingsSnapshot() {
    const items = {};
    SYNCED_SETTING_KEYS.forEach(k => {
      let v = null;
      try { v = localStorage.getItem(k); } catch (e) { /* abaikan */ }
      if (typeof v === 'string' && v.length <= SETTING_VALUE_MAX) items[k] = v;
    });
    return { v: 1, items: items };
  }

  // Ganti localStorage.setItem/removeItem untuk pengaturan yang disinkronkan; lempar galat seperti aslinya (pemanggil sudah try/catch).
  function settingSet(key, value) { localStorage.setItem(key, value); settingsScheduleMirror(); }
  function settingRemove(key) { localStorage.removeItem(key); settingsScheduleMirror(); }

  function settingsSyncActive() { return typeof sync !== 'undefined' && !!sync && !!sync.ready; }
  function settingsScheduleMirror() {
    if (!settingsSyncActive()) return;   // belum masuk akun: disalin saat sesi sinkron dimulai (syncStartSession)
    clearTimeout(settingsTimer);
    settingsTimer = setTimeout(settingsMirror, 800);   // beberapa perubahan beruntun jadi satu penyimpanan
  }
  // Salin pengaturan perangkat ke data bila berbeda. Mengembalikan true kalau data diubah (dan karenanya akan terkirim).
  function settingsMirror() {
    clearTimeout(settingsTimer);
    const data = loadData();
    const snap = settingsSnapshot();
    const cur = sanitizeSettings(data.settings);
    if (cur && JSON.stringify(cur) === JSON.stringify(snap)) return false;
    data.settings = snap;
    return saveData(data);
  }
  // Terapkan pengaturan dari data cloud/berkas ke perangkat ini. Kunci yang tidak ada di sana kembali ke bawaan. Mengembalikan true bila diterapkan.
  function settingsApply(raw) {
    const s = sanitizeSettings(raw);
    if (!s) return false;
    SYNCED_SETTING_KEYS.forEach(k => {
      try { if (Object.prototype.hasOwnProperty.call(s.items, k)) localStorage.setItem(k, s.items[k]); else localStorage.removeItem(k); } catch (e) { /* abaikan */ }
    });
    settingsReapplyUi();
    return true;
  }
  // Tampilan yang dibentuk dari pengaturan (tema, palet, aksen, kaca) dipasang ulang setelah pengaturan berganti dari luar.
  function settingsReapplyUi() {
    try {
      if (typeof applyTheme === 'function') applyTheme(localStorage.getItem('kp_theme') || 'system');
      if (typeof applyPalette === 'function') applyPalette(currentPalette());
      if (typeof applyGlass === 'function') applyGlass(currentGlass());
      if (typeof renderThemeSettings === 'function') renderThemeSettings();
    } catch (e) { /* abaikan */ }
  }
