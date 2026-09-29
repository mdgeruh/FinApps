  // ============================================================
  // STRIP "PERLU PERHATIAN" DI RINGKASAN (v1.1.068, todo R1)
  // Maksimal 3 baris, urut prioritas: tagihan telat > tagihan <=7 hari > anggaran >=80% > dana darurat kurang.
  // Strip menghilang sendiri kalau tidak ada apa-apa. Pengingat cadangan (backup) tidak diulang di sini
  // karena sudah punya kartu sendiri dengan tombol aksi (renderBackupReminder).
  // Fungsi hitung murni: computeAttentionItems. Tiap item: { kind, level: 'red'|'amber', title, sub, act, arg }.
  // ============================================================
  const ATTENTION_MAX = 3;
  const ATTENTION_DUE_DAYS = 7;

  function computeAttentionItems(data, balances, monthKey) {
    const out = [];
    const dues = computeUpcomingDues(data, balances, ATTENTION_DUE_DAYS);
    const late = dues.filter(d => d.days < 0), soon = dues.filter(d => d.days >= 0);
    const sum = arr => roundMoney(arr.reduce((s, d) => s + d.amount, 0));
    const dueRow = (kind, arr, level, plural, whenOf) => {
      if (!arr.length) return;
      if (arr.length === 1) {
        const d = arr[0];
        out.push({ kind, level, title: d.name + ' · ' + d.label, sub: whenOf(d) + ' · ' + formatRp(d.amount), act: 'openAccountDetail', arg: d.id });
      } else {
        out.push({ kind, level, title: arr.length + ' tagihan ' + plural, sub: 'Total ' + formatRp(sum(arr)), act: 'setTab', arg: 'tagihan' });
      }
    };
    dueRow('telat', late, 'red', 'sudah lewat jatuh tempo', d => 'Lewat ' + (-d.days) + ' hari');
    dueRow('jatuh-tempo', soon, 'amber', 'jatuh tempo dalam ' + ATTENTION_DUE_DAYS + ' hari', d => d.days === 0 ? 'Hari ini' : (d.days === 1 ? 'Besok' : d.days + ' hari lagi'));

    if (!monthKey) { const n = todayGmt8(); monthKey = n.getFullYear() + '-' + padMonth(n.getMonth() + 1); }
    const bad = computeBudgetStatus(data, monthKey).filter(b => b.status !== 'ok');
    if (bad.length) {
      const w = bad[0], over = bad.filter(b => b.status === 'over').length;
      const more = bad.length > 1 ? ' (+' + (bad.length - 1) + ' lainnya)' : '';
      out.push({
        kind: 'anggaran', level: over ? 'red' : 'amber',
        title: 'Anggaran ' + w.category + (w.status === 'over' ? ' terlampaui' : ' hampir habis') + more,
        sub: Math.round(w.pct) + '% · ' + formatRp(w.spent) + ' / ' + formatRp(w.limit),
        act: 'scrollToRingkasanCard', arg: 'budget-card'
      });
    }

    const ef = computeEmergencyFund(data, balances);
    if (ef && ef.status !== 'nodata' && ef.status !== 'ok') {
      out.push({
        kind: 'dana-darurat', level: ef.status === 'low' ? 'red' : 'amber',
        title: 'Dana darurat kurang ' + formatRp(ef.target - ef.liquid),
        sub: Math.round(ef.pct) + '% dari target ' + ef.months + ' bulan',
        act: 'scrollToRingkasanCard', arg: 'emergency-card'
      });
    }
    return out.slice(0, ATTENTION_MAX);
  }

  function renderAttentionStrip(data, balances) {
    const el = $('attention-card');
    if (!el) return;
    const items = computeAttentionItems(data, balances);
    if (!items.length) { el.style.display = 'none'; el.innerHTML = ''; return; }
    el.style.display = 'block';
    el.innerHTML = '<div class="section-title" style="margin-bottom:6px;">Perlu perhatian</div>' + items.map(it => {
      const color = it.level === 'red' ? 'var(--red)' : 'var(--amber)';
      return `<div class="txn-row clickable" role="button" tabindex="0" data-act="${it.act}" data-a0="${escapeHtml(it.arg)}" data-keydown-act="${it.act}" data-keydown-a0="${escapeHtml(it.arg)}" data-keydown-keys="Enter| ">
        <div class="txn-left">
          <span class="dot" style="background:${color};"></span>
          <div class="txn-text">
            <div class="txn-desc txn-desc-wrap">${it.level === 'red' ? '<span style="color:var(--red);" aria-hidden="true">▲</span> ' : ''}${escapeHtml(it.title)}</div>
            <div class="txn-meta" style="color:${color}; font-weight:600;">${escapeHtml(it.sub)}</div>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  // Gulir ke kartu lain di Ringkasan (kalau kartu disembunyikan pengguna, tidak terjadi apa-apa).
  function scrollToRingkasanCard(id) {
    const c = $(id);
    if (c && c.offsetParent !== null && c.scrollIntoView) c.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ============================================================
  // KARTU AJAKAN RENCANA (v1.1.071, todo R7)
  // Anggaran, Langganan, dan Dana darurat yang belum dipakai tidak lagi tampil sebagai kartu kosong penuh
  // (computeRingkasanVisibility menandainya kosong -> tersembunyi otomatis). Sebagai gantinya satu kartu ringkas
  // dengan satu baris ajakan per fitur yang belum dipakai; kartu hilang sendiri kalau semuanya sudah dipakai.
  // Fungsi hitung murni: computePlanUsage (09-grafik.js).
  // ============================================================
  const PLAN_CTAS = [
    { key: 'budget', title: 'Anggaran', text: 'Batasi pengeluaran per kategori tiap bulan', act: 'openBudgetForm' },
    { key: 'sub', title: 'Langganan', text: 'Catat tagihan rutin agar otomatis tiap bulan', act: 'openSubForm' },
    { key: 'emergency', title: 'Dana darurat', text: 'Tentukan target cadangan dalam bulan pengeluaran', act: 'openEmergencyForm' }
  ];
  function renderPlanCta(data) {
    const el = $('plan-cta-card');
    if (!el) return;
    const used = computePlanUsage(data);
    const todo = PLAN_CTAS.filter(c => !used[c.key]);
    if (!todo.length) { el.innerHTML = ''; return; }
    el.innerHTML = '<div class="section-title" style="margin-bottom:6px;">Atur rencana keuanganmu</div>' + todo.map(c => `
      <div class="txn-row" style="align-items:center;">
        <div class="txn-left"><div class="txn-text"><div class="txn-desc txn-desc-wrap">${escapeHtml(c.title)}</div><div class="txn-meta">${escapeHtml(c.text)}</div></div></div>
        <div class="txn-right"><button type="button" class="see-all-btn" data-act="${c.act}">Atur ›</button></div>
      </div>`).join('');
  }
