  // ============================================================
  // RUTE WEB: alamat (URL) mengikuti tab dan detail akun yang terbuka
  // Memakai hash (#/akun, #/akun/<id>) supaya jalan di hosting statis mana pun tanpa pengaturan server
  // dan tetap jalan saat dibuka dari file:// atau sebagai PWA. Tombol Kembali/Maju browser dan HP
  // menutup detail akun lalu pindah tab sebelumnya, tautan bisa dibagikan/di-bookmark.
  // ============================================================
  const ROUTE_BASE_TITLE = 'Keuangan Pribadi';
  let routeApplying = false;        // true saat alamat diterapkan ke layar: jangan tulis balik ke alamat

  // '#/akun/abc' -> { tab:'akun', accId:'abc' }; tidak dikenal -> null
  function parseRoute(hash) {
    const m = /^#\/([a-z]+)(?:\/([^/?#]+))?\/?$/.exec(String(hash || ''));
    if (!m || TAB_NAMES.indexOf(m[1]) < 0) return null;
    let id = null;
    if (m[2]) { if (m[1] !== 'akun') return null; try { id = decodeURIComponent(m[2]); } catch (e) { return null; } }
    return { tab: m[1], accId: id };
  }

  function buildRoute(tab, accId) {
    return '#/' + tab + (tab === 'akun' && accId ? '/' + encodeURIComponent(accId) : '');
  }

  function routeTitle(tab, accId) {
    let name = TAB_TITLES[tab] || '';
    if (accId) { try { const a = loadData().accounts.find(x => x.id === accId); if (a) name = a.name; } catch (e) { /* abaikan */ } }
    return (name && tab !== 'ringkasan' ? name + ' · ' : '') + ROUTE_BASE_TITLE;
  }

  // Tulis alamat saat ini. push=true menambah riwayat (pindah tab/buka detail), false mengganti (mis. tutup detail dari tombol).
  function writeRoute(tab, accId, push) {
    if (routeApplying) return;
    const hash = buildRoute(tab, accId);
    try {
      document.title = routeTitle(tab, accId);
      if (location.hash === hash) return;
      const st = { kp: 1, detail: !!accId };
      if (push) history.pushState(st, '', hash); else history.replaceState(st, '', hash);
    } catch (e) { /* file:// atau iframe tertentu menolak history API: app tetap jalan tanpa rute */ }
  }

  function routeOnTabChange(name) { writeRoute(name, null, true); }
  function routeOnDetailOpen(id) { writeRoute('akun', id, true); }
  // Tutup detail lewat tombol/backdrop: bila entri riwayat itu kita yang buat, mundur satu langkah (tidak menumpuk riwayat).
  function routeOnDetailClose() {
    if (routeApplying) return;
    // Ditunda satu putaran: banyak alur menutup detail lalu langsung membuka form; history.back() langsung
    // akan menutup form yang baru dibuka. Bila sheet sudah terbuka, entri detail dibiarkan (Kembali dari form kembali ke detail).
    setTimeout(() => {
      try {
        if (detailAccountId !== null || sheetStack.length) return;
        if (history.state && history.state.kp && history.state.detail) { history.back(); return; }
      } catch (e) { /* abaikan */ }
      writeRoute('akun', null, false);
    }, 0);
  }

  // Terapkan alamat ke layar (saat dibuka, Kembali/Maju, atau hash diubah manual).
  function applyRoute() {
    const r = parseRoute(location.hash);
    routeApplying = true;
    try {
      if (!r) {
        if (location.hash) { try { history.replaceState({ kp: 1 }, '', buildRoute('ringkasan')); } catch (e) { /* abaikan */ } }
        if (currentTabName() !== 'ringkasan') setTab('ringkasan');
        if (detailAccountId) closeAccountDetail();
        document.title = routeTitle('ringkasan');
        return;
      }
      if (currentTabName() !== r.tab) setTab(r.tab);
      if (r.accId) {
        if (detailAccountId !== r.accId) {
          openAccountDetail(r.accId);
          if (detailAccountId !== r.accId) { try { history.replaceState({ kp: 1 }, '', buildRoute('akun')); } catch (e) { /* abaikan */ } }   // akun tidak ada: kembali ke daftar
        }
      } else if (detailAccountId) {
        closeAccountDetail();
      }
      document.title = routeTitle(r.tab, detailAccountId);
    } finally { routeApplying = false; }
  }

  window.addEventListener('hashchange', applyRoute);   // hash diubah manual di bilah alamat

  // ---------- Tombol Kembali menutup form/sheet (selain detail akun, yang punya rute sendiri di atas) ----------
  // Tiap sheet yang terbuka menambah satu entri riwayat (alamat sama); Kembali menutup sheet paling atas
  // alih-alih keluar dari app/halaman. Ditutup lewat tombol/latar: mundur satu entri supaya riwayat tidak menumpuk.
  const sheetStack = [];                       // id sheet yang sedang terbuka, yang terakhir = paling atas
  const SHEET_NO_ROUTE = 'acc-detail';

  function sheetBackdropFn(id) {
    const el = document.getElementById(id);
    const name = el && el.getAttribute('data-backdrop');
    return name && typeof window[name] === 'function' ? window[name] : null;
  }

  function onSheetOpened(id) {
    if (sheetStack.indexOf(id) >= 0) return;
    sheetStack.push(id);
    try { history.pushState({ kp: 1, sheet: id, detail: !!(history.state && history.state.detail) }, '', location.href); } catch (e) { /* abaikan */ }
  }

  // Jumlah history.back() yang dipicu app sendiri (menutup sheet) dan popstate-nya belum tiba. Popstate semacam itu tidak boleh
  // menutup sheet lain yang sempat dibuka di antaranya (mis. Edit transaksi: detail ditutup, form edit langsung dibuka).
  let selfBacks = 0;

  function onSheetClosed(id) {
    const i = sheetStack.indexOf(id);
    if (i < 0) return;                         // sudah dikeluarkan oleh tombol Kembali
    sheetStack.splice(i, 1);
    try { if (history.state && history.state.sheet === id) { selfBacks++; history.back(); } } catch (e) { /* abaikan */ }
  }

  // true bila popstate ini dipakai untuk menutup sheet
  function closeTopSheetOnBack() {
    if (!sheetStack.length) return false;
    const top = sheetStack[sheetStack.length - 1];
    if (history.state && history.state.sheet === top) return false;   // masih di entri sheet itu sendiri
    sheetStack.pop();
    const fn = sheetBackdropFn(top);
    if (fn) { try { fn(); } catch (e) { /* abaikan */ } }
    const el = document.getElementById(top);
    if (el && el.classList.contains('open')) {  // penutupan ditolak/ditunda (mis. konfirmasi buang perubahan): kembalikan entri riwayat
      sheetStack.push(top);
      try { history.pushState({ kp: 1, sheet: top, detail: !!(history.state && history.state.detail) }, '', location.href); } catch (e) { /* abaikan */ }
    }
    return true;
  }

  window.addEventListener('popstate', () => {
    if (selfBacks > 0) { selfBacks--; applyRoute(); return; }
    closeTopSheetOnBack(); applyRoute();
  });

  (function watchSheets() {
    if (typeof MutationObserver === 'undefined') return;
    const mo = new MutationObserver(muts => {
      for (const m of muts) {
        const el = m.target;
        if (!el.id || el.id === SHEET_NO_ROUTE) continue;
        if (el.classList.contains('open')) onSheetOpened(el.id); else onSheetClosed(el.id);
      }
    });
    document.querySelectorAll('.sheet-overlay').forEach(el => mo.observe(el, { attributes: true, attributeFilter: ['class'] }));
  })();
