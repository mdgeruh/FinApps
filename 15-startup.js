  // ============================================================
  // STARTUP: dijalankan terakhir, setelah semua file js/ selesai dimuat
  // (kode yang memanggil fungsi dari file lain harus ada di sini, bukan di file asalnya)
  // ============================================================
  updateGreeting();
  $('today-date').textContent = todayGmt8().toLocaleDateString('id-ID', { weekday:'short', day:'numeric', month:'short', year:'numeric' });

  (async function start() {
    // Kalau perangkat ini sudah punya data, gambar dulu dari data lokal (tidak perlu menunggu
    // pustaka Supabase / jaringan). Aman: loadData() tidak mengisi data contoh kalau data sudah ada.
    // Kalau belum ada data sama sekali, render pertama ditunda sampai sinkron selesai supaya
    // akun cloud tidak tertimpa data contoh.
    let hasLocalData = false;
    try { hasLocalData = !!localStorage.getItem(STORAGE_KEY); } catch (e) { /* abaikan */ }
    if (hasLocalData) { populateCategorySelect(); render(); }

    // Sinkron cloud (muat pustaka + login + tarik data). Kalau tidak aktif / gagal, app jalan dengan data lokal.
    try { await syncBoot(); } catch (e) { console.error('sinkron gagal, lanjut mode lokal', e); }

    runRecurringFees();     // bunga/biaya bulanan otomatis: setelah sinkron, bukan di dalam render()
    populateCategorySelect();
    render();
  })();

  // Tab dibiarkan terbuka lintas hari: saat kembali terlihat dan tanggal sudah ganti,
  // perbarui sapaan, terapkan biaya bulanan yang jatuh tempo, dan gambar ulang.
  (function watchDayChange() {
    let lastDay = todayStr();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || todayStr() === lastDay) return;
      lastDay = todayStr();
      $('today-date').textContent = todayGmt8().toLocaleDateString('id-ID', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
      updateGreeting();
      runRecurringFees();
      render();
    });
  })();

  // Service worker: app shell tersimpan supaya bisa dibuka tanpa internet. Hanya di http(s)
  // (file:// tidak mendukung service worker) dan gagal daftar tidak mengganggu app.
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(e => console.warn('service worker gagal daftar', e));
    });
  }
