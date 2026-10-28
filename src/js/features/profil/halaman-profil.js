  // ============================================================
  // HALAMAN BAGIAN PROFIL (v1.1.179): Preferensi dan Alat jadi halaman sendiri di dalam tab Profil,
  // alurnya sama dengan Kelola kategori & label: tombol di Profil membuka halaman, tombol Kembali / Esc / Kembali perangkat menutup,
  // alamat #/profil/pref dan #/profil/alat, posisi gulir Profil dikembalikan. Isi halaman memakai elemen (id) yang sama seperti
  // dulu, jadi semua fungsi pengaturan tidak berubah. Kelola kategori & label (kelola-kategori.js) memakai pola yang sama.
  // ============================================================
  const PROFIL_PAGES = { pref: 'Preferensi', alat: 'Alat' };
  let profilPageName = '';     // '' bila tidak ada halaman Preferensi/Alat yang terbuka
  let profilPageScrollY = 0;

  // Nama halaman bagian Profil yang sedang terbuka: 'kelola' | 'pref' | 'alat' | ''.
  function currentProfilSub() { return kelola.open ? 'kelola' : profilPageName; }
  function openProfilSub(sub) { if (currentProfilSub() && currentProfilSub() !== sub) hideProfilSub(); if (sub === 'kelola') openKelolaPage('kategori'); else openProfilPage(sub); }
  function closeProfilSub() { if (kelola.open) closeKelolaPage(); else closeProfilPage(); }
  function hideProfilSub() { if (kelola.open) hideKelolaPage(); else hideProfilPage(); }

  function openProfilPage(name) {
    if (!Object.prototype.hasOwnProperty.call(PROFIL_PAGES, name) || profilPageName === name) return;
    const wasOpen = !!profilPageName;
    let tabChanged = false;
    if (currentTabName() !== 'profil') { setTab('profil', true); tabChanged = true; }
    if (wasOpen) hideProfilPage();
    else profilPageScrollY = tabChanged ? 0 : (window.scrollY || 0);
    profilPageName = name;
    $('profil-page-' + name).classList.add('open');
    $('tab-profil').classList.add('sub-open');
    try { window.scrollTo(0, 0); const h = $('profil-title-' + name); if (h) h.focus({ preventScroll: true }); } catch (e) { /* abaikan */ }
    routeOnSubOpen(name, wasOpen);   // src/js/core/rute.js
  }
  // Sembunyikan tanpa menyentuh alamat/riwayat (dipakai closeProfilPage dan setTab saat pindah tab).
  function hideProfilPage() {
    if (!profilPageName) return;
    const p = $('profil-page-' + profilPageName), t = $('tab-profil');
    profilPageName = '';
    if (p) p.classList.remove('open');
    if (t) t.classList.remove('sub-open');
  }
  function closeProfilPage() {
    if (!profilPageName) return;
    hideProfilPage();
    const y = profilPageScrollY;
    const restore = () => { if (!currentProfilSub() && currentTabName() === 'profil') window.scrollTo(0, y); };
    try { requestAnimationFrame(restore); setTimeout(restore, 90); } catch (e) { /* abaikan */ }
    routeOnSubClose();   // src/js/core/rute.js
  }
