  // ============================================================
  // KUNCI APP (PIN 6 angka): layar kunci saat app dibuka dan saat kembali dari latar >1 menit.
  // PIN hanya tersimpan di perangkat ini (tidak masuk ekspor/backup/sinkron). Ini penghalang akses
  // sekilas (HP dipinjam/hilang sebentar), BUKAN enkripsi data: data tetap tersimpan biasa di browser.
  // ============================================================
  const PIN_KEY = 'kp_pin';              // { v, salt, hash, kdf }
  const PIN_FAIL_KEY = 'kp_pin_fail';    // { n, until }
  const PIN_LEN = 6;
  const LOCK_AFTER_HIDDEN_MS = 60 * 1000;
  const PIN_ITER = 100000;

  const lock = { open: false, mode: 'unlock', buf: '', temp: '', busy: false, hiddenAt: 0, timer: null };

  function pinValid(s) { return /^\d{6}$/.test(String(s)); }

  // Jeda sesudah salah PIN: tiap kelipatan 5 kali salah berturut-turut, 30 dtk, 60, 120, ... maks 15 menit.
  function lockDelayMs(failCount) {
    if (failCount <= 0 || failCount % 5 !== 0) return 0;
    return Math.min(15 * 60 * 1000, 30 * 1000 * Math.pow(2, failCount / 5 - 1));
  }

  function lockLoad(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } }
  function lockSave(key, val) { try { if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } }
  function lockEnabled() { const p = lockLoad(PIN_KEY); return !!(p && p.hash && p.salt); }

  const toHex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  function randomSalt() {
    const a = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(a); else for (let i = 0; i < 16; i++) a[i] = Math.floor(Math.random() * 256);
    return toHex(a);
  }
  // PBKDF2-SHA256 bila Web Crypto tersedia (https/localhost/file); jika tidak, hash sederhana (lebih lemah, tetap cukup untuk penghalang sekilas).
  async function pinHash(pin, salt) {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: PIN_ITER, hash: 'SHA-256' }, key, 256);
      return { kdf: 'pbkdf2', hash: toHex(bits) };
    }
    let h = 2166136261; const s = salt + ':' + pin;
    for (let r = 0; r < 2000; r++) for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return { kdf: 'fnv', hash: h.toString(16) };
  }
  async function pinVerify(pin) {
    const p = lockLoad(PIN_KEY);
    if (!p) return false;
    const r = await pinHash(pin, p.salt);
    return r.kdf === p.kdf && r.hash === p.hash;
  }
  async function pinStore(pin) {
    const salt = randomSalt(); const r = await pinHash(pin, salt);
    return lockSave(PIN_KEY, { v: 1, salt, hash: r.hash, kdf: r.kdf });
  }

  // ---------- tampilan layar kunci ----------
  const LOCK_TEXT = {
    unlock: ['Masukkan PIN', 'Keuangan Pribadi terkunci'],
    set1: ['Buat PIN baru', PIN_LEN + ' angka'],
    set2: ['Ulangi PIN', 'Masukkan PIN yang sama sekali lagi'],
    'old-change': ['PIN lama', 'Masukkan PIN lama untuk mengganti'],
    'old-disable': ['PIN saat ini', 'Masukkan PIN untuk mematikan kunci']
  };

  function lockRender(msg, bad) {
    const t = LOCK_TEXT[lock.mode] || LOCK_TEXT.unlock;
    if ($('lock-title')) $('lock-title').textContent = t[0];
    if ($('lock-sub')) $('lock-sub').textContent = msg || t[1];
    const sub = $('lock-sub'); if (sub) sub.classList.toggle('lock-bad', !!bad);
    const dots = $('lock-dots');
    if (dots) {
      dots.innerHTML = Array.from({ length: PIN_LEN }, (_, i) => '<i class="' + (i < lock.buf.length ? 'on' : '') + '"></i>').join('');
      dots.setAttribute('aria-label', lock.buf.length + ' dari ' + PIN_LEN + ' angka dimasukkan');
    }
    const unlock = lock.mode === 'unlock';
    if ($('lock-forgot')) $('lock-forgot').style.display = unlock ? '' : 'none';
    if ($('lock-cancel')) $('lock-cancel').style.display = unlock ? 'none' : '';
  }

  function lockShow(mode) {
    lock.mode = mode; lock.buf = ''; lock.temp = ''; lock.busy = false; lock.open = true;
    const el = $('lock-screen'); if (!el) return;
    el.classList.add('open');
    document.documentElement.classList.add('is-locked');
    lockRender(); lockTick();
  }
  function lockHide() {
    lock.open = false; lock.buf = ''; lock.temp = '';
    const el = $('lock-screen'); if (el) el.classList.remove('open');
    document.documentElement.classList.remove('is-locked');
    if (lock.timer) { clearInterval(lock.timer); lock.timer = null; }
  }

  // hitung mundur bila sedang dijeda karena terlalu banyak salah
  function lockTick() {
    if (lock.timer) { clearInterval(lock.timer); lock.timer = null; }
    const f = lockLoad(PIN_FAIL_KEY);
    if (!f || !f.until || f.until <= Date.now() || lock.mode !== 'unlock') return;
    const upd = () => {
      const left = Math.ceil((f.until - Date.now()) / 1000);
      if (left <= 0) { clearInterval(lock.timer); lock.timer = null; lockRender(); return; }
      lockRender('Terlalu banyak salah. Coba lagi dalam ' + (left >= 60 ? Math.ceil(left / 60) + ' menit' : left + ' detik'), true);
    };
    upd(); lock.timer = setInterval(upd, 1000);
  }
  function lockIsDelayed() { const f = lockLoad(PIN_FAIL_KEY); return !!(f && f.until && f.until > Date.now()); }

  async function lockComplete() {
    const pin = lock.buf; lock.busy = true;
    try {
      if (lock.mode === 'unlock') {
        if (lockIsDelayed()) { lock.buf = ''; lockRender(); lockTick(); return; }
        if (await pinVerify(pin)) { lockSave(PIN_FAIL_KEY, null); lockHide(); return; }
        const f = lockLoad(PIN_FAIL_KEY) || { n: 0, until: 0 };
        f.n += 1; f.until = lockDelayMs(f.n) ? Date.now() + lockDelayMs(f.n) : 0; lockSave(PIN_FAIL_KEY, f);
        lock.buf = ''; lockRender('PIN salah', true); if (f.until) lockTick();
      } else if (lock.mode === 'old-change' || lock.mode === 'old-disable') {
        if (!(await pinVerify(pin))) { lock.buf = ''; lockRender('PIN salah', true); return; }
        if (lock.mode === 'old-disable') { lockSave(PIN_KEY, null); lockSave(PIN_FAIL_KEY, null); lockHide(); lockUpdateProfil(); showToast('Kunci app dimatikan'); return; }
        lock.mode = 'set1'; lock.buf = ''; lockRender();
      } else if (lock.mode === 'set1') {
        lock.temp = pin; lock.mode = 'set2'; lock.buf = ''; lockRender();
      } else if (lock.mode === 'set2') {
        if (pin !== lock.temp) { lock.mode = 'set1'; lock.temp = ''; lock.buf = ''; lockRender('PIN tidak sama, ulangi dari awal', true); return; }
        if (!(await pinStore(pin))) { lockHide(); showToast('Gagal menyimpan PIN (penyimpanan browser diblokir)', 'error'); return; }
        lockSave(PIN_FAIL_KEY, null); lockHide(); lockUpdateProfil(); showToast('Kunci app aktif');
      }
    } finally { lock.busy = false; }
  }

  // ---------- pengendali (data-act) ----------
  function lockKey(d) {
    if (!lock.open || lock.busy || !/^\d$/.test(String(d))) return;
    if (lock.mode === 'unlock' && lockIsDelayed()) return;
    if (lock.buf.length >= PIN_LEN) return;
    lock.buf += String(d); lockRender();
    if (lock.buf.length === PIN_LEN) lockComplete();
  }
  function lockBackspace() { if (!lock.open || lock.busy || !lock.buf) return; lock.buf = lock.buf.slice(0, -1); lockRender(); }
  function lockCancel() { if (lock.mode !== 'unlock') lockHide(); }
  function lockSetupStart() { lockShow('set1'); }
  function lockChangeStart() { lockShow('old-change'); }
  function lockDisableStart() { lockShow('old-disable'); }
  function lockNow() { if (lockEnabled()) lockShow('unlock'); }

  // Lupa PIN: satu-satunya jalan adalah menghapus data di perangkat ini. Tanpa backup otomatis (backup akan membuka
  // data tanpa PIN); data bisa dipulihkan dari akun sinkron atau file backup yang sudah disimpan.
  async function lockForgot() {
    const ok = await showConfirm('Lupa PIN?\n\nSatu-satunya cara masuk lagi adalah MENGHAPUS SEMUA data di perangkat ini dan mematikan kunci. Tidak ada backup otomatis (supaya data tidak bisa diambil tanpa PIN).\n\nData bisa dipulihkan dari akun sinkron atau file backup yang pernah kamu simpan.\n\nHapus data dan reset kunci?');
    if (!ok) return;
    saveData({ accounts: [], txns: [] });
    lockSave(PIN_KEY, null); lockSave(PIN_FAIL_KEY, null);
    lockHide(); render(); lockUpdateProfil();
    showToast('Data dan kunci direset');
  }

  function lockUpdateProfil() {
    const on = lockEnabled();
    const st = $('lock-status'); if (st) st.textContent = on ? 'Kunci app aktif (PIN ' + PIN_LEN + ' angka). Terkunci otomatis setelah app di latar lebih dari 1 menit.' : 'Kunci app belum aktif.';
    const show = (id, v) => { const e = $(id); if (e) e.style.display = v ? '' : 'none'; };
    show('lock-btn-enable', !on); show('lock-btn-change', on); show('lock-btn-disable', on); show('lock-btn-now', on);
  }

  // Papan ketik fisik: angka, Backspace, Escape (batal pada mode pengaturan)
  document.addEventListener('keydown', (e) => {
    if (!lock.open) return;
    if (/^\d$/.test(e.key)) { e.preventDefault(); lockKey(e.key); }
    else if (e.key === 'Backspace') { e.preventDefault(); lockBackspace(); }
    else if (e.key === 'Escape') { e.preventDefault(); lockCancel(); }
  });

  // Kunci lagi bila app kembali dari latar setelah >1 menit
  document.addEventListener('visibilitychange', () => {
    if (!lockEnabled()) return;
    if (document.visibilityState === 'hidden') { lock.hiddenAt = Date.now(); return; }
    if (lock.hiddenAt && Date.now() - lock.hiddenAt >= LOCK_AFTER_HIDDEN_MS && !(lock.open && lock.mode === 'unlock')) lockShow('unlock');
    lock.hiddenAt = 0;
  });

  // Dipanggil dari 15-startup.js sebelum render pertama
  function initLock() { if (lockEnabled()) lockShow('unlock'); lockUpdateProfil(); }
