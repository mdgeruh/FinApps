  // ============================================================
  // KALKULATOR UNTUK KOLOM NOMINAL
  // 1) Rumus langsung di kolom: ketik 25000+15000*2 (atau 150000/3, (1000+500)*2, 200000+10%) lalu pindah kolom/Enter:
  //    isinya jadi hasil hitungan. Nilai kolom asli ikut hasil sementara, jadi form tetap bisa disimpan tanpa pindah kolom dulu.
  // 2) Tombol "Kalkulator" muncul di bawah kolom yang sedang fokus: papan hitung di layar (untuk HP yang papan angkanya
  //    tanpa tanda operasi), hasilnya diisikan ke kolom lewat "Pakai hasil".
  // Titik = pemisah ribuan (diabaikan), koma = desimal, sama seperti kolom nominal biasa. Memakai parser sendiri, bukan fungsi evaluasi JS.
  // ============================================================
  function calcNormalize(s) {
    return String(s == null ? '' : s).replace(/\s+/g, '').replace(/\./g, '').replace(/[×xX*]/g, '*').replace(/[÷:]/g, '/').replace(/[−–]/g, '-');
  }
  // Rumus (ada operator di tengah, tanda kurung, atau persen)? Tanda minus di depan saja bukan rumus.
  function calcLooksLikeExpr(text) {
    const s = calcNormalize(text).replace(/^-/, '');
    return /[+\-*/()%]/.test(s);
  }
  // -> angka, atau null bila rumus tidak lengkap/tidak sah (bagi nol, karakter asing).
  function calcEval(text) {
    const s = calcNormalize(text);
    if (!s || /[^0-9,+\-*/()%]/.test(s)) return null;
    let i = 0;
    const peek = () => s.charAt(i);
    function number() {
      const m = /^\d*(?:,\d*)?/.exec(s.slice(i))[0];
      if (!m || m === ',' ) return null;
      i += m.length;
      return parseFloat(m.replace(',', '.'));
    }
    function factor() {            // -> {v, pct}
      let neg = false;
      while (peek() === '-' || peek() === '+') { if (peek() === '-') neg = !neg; i++; }
      let v;
      if (peek() === '(') { i++; v = additive(); if (v === null || peek() !== ')') return null; i++; }
      else { v = number(); if (v === null) return null; }
      let pct = false;
      while (peek() === '%') { v = v / 100; pct = true; i++; }
      return { v: neg ? -v : v, pct };
    }
    function term() {
      let l = factor(); if (!l) return null;
      let isPct = l.pct, acc = l.v;
      while (peek() === '*' || peek() === '/') {
        const op = s.charAt(i++); const r = factor(); if (!r) return null;
        if (op === '/' && r.v === 0) return null;
        acc = op === '*' ? acc * r.v : acc / r.v; isPct = false;
      }
      return { v: acc, pct: isPct };
    }
    function additive() {
      let l = term(); if (!l) return null;
      let acc = l.v;
      while (peek() === '+' || peek() === '-') {
        const op = s.charAt(i++); const r = term(); if (!r) return null;
        const rv = r.pct ? acc * r.v : r.v;      // 200000+10% = 220000 (persen dari angka di kirinya)
        acc = op === '+' ? acc + rv : acc - rv;
      }
      return acc;
    }
    const out = additive();
    if (out === null || i !== s.length || !isFinite(out)) return null;
    return out;
  }
  // Hasil sesuai aturan kolom: tanpa desimal -> dibulatkan, tanpa minus -> negatif ditolak.
  function calcResultFor(text, opts) {
    const v = calcEval(text);
    if (v === null) return null;
    const r = opts && opts.dec ? Math.round(v * 10000) / 10000 : Math.round(v);
    if (r < 0 && !(opts && opts.neg)) return null;
    if (Math.abs(r) >= 1e13) return null;
    return r;
  }

  // ---------- papan kalkulator ----------
  const calc = { open: false, expr: '', field: null, fresh: false };   // fresh: isi awal dari kolom; angka pertama menggantikan, operator melanjutkan
  const CALC_KEYS = [['C', 'calcClear'], ['⌫', 'calcBack'], ['%', 'calcKey', '%'], ['÷', 'calcKey', '/'],
    ['7'], ['8'], ['9'], ['×', 'calcKey', '*'], ['4'], ['5'], ['6'], ['−', 'calcKey', '-'],
    ['1'], ['2'], ['3'], ['+', 'calcKey', '+'], ['0'], ['000'], [','], ['=', 'calcEquals']];

  function calcEnsureDom() {
    if (document.getElementById('calc-panel')) return;
    const bar = document.createElement('div');
    bar.id = 'calc-bar'; bar.className = 'calc-bar';
    bar.innerHTML = '<span id="calc-bar-result" class="calc-bar-result" aria-live="polite"></span><button type="button" class="calc-bar-btn" data-act="calcOpen">Kalkulator</button>';
    bar.addEventListener('mousedown', e => e.preventDefault());       // jangan merebut fokus dari kolom
    bar.addEventListener('touchstart', e => { if (e.target.closest('button')) e.preventDefault(); }, { passive: false });
    document.body.appendChild(bar);
    const keys = CALC_KEYS.map(k => {
      const act = k[1] || 'calcKey', arg = k.length > 2 ? k[2] : (k[1] ? '' : k[0]);
      const cls = 'calc-key' + (/[÷×−+%=]/.test(k[0]) ? ' calc-op' : '') + (k[0] === 'C' || k[0] === '⌫' ? ' calc-fn' : '');
      return '<button type="button" class="' + cls + '" data-act="' + act + '"' + (arg !== '' ? ' data-a0="' + arg + '"' : '') + ' aria-label="' + ({ '÷': 'bagi', '×': 'kali', '−': 'kurang', '+': 'tambah', '=': 'sama dengan', '⌫': 'hapus satu', 'C': 'bersihkan', '%': 'persen', ',': 'koma' }[k[0]] || k[0]) + '">' + k[0] + '</button>';
    }).join('');
    const panel = document.createElement('div');
    panel.id = 'calc-panel'; panel.className = 'calc-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', 'Kalkulator');
    panel.innerHTML = '<div class="calc-backdrop" data-act="calcClose"></div><div class="calc-card"><div class="calc-head"><span>Kalkulator</span><button type="button" class="sheet-close" data-act="calcClose" aria-label="Tutup kalkulator">×</button></div>'
      + '<div class="calc-expr" id="calc-expr" aria-live="polite"></div><div class="calc-result" id="calc-result"></div>'
      + '<div class="calc-pad">' + keys + '</div><button type="button" class="submit-btn calc-apply" data-act="calcApply">Pakai hasil</button></div>';
    document.body.appendChild(panel);
  }

  function calcFmt(v) { return v === null ? '' : moneyFromValue(String(Math.round(v * 10000) / 10000)); }
  function calcShowExpr(s) {   // ekspresi tampil dengan simbol yang enak dibaca
    return String(s).replace(/\*/g, ' × ').replace(/\//g, ' ÷ ').replace(/([0-9)%])-/g, '$1 − ').replace(/\+/g, ' + ').trim();
  }
  function calcRefresh() {
    const o = calc.field ? calc.field._cm.opts : { dec: true, neg: true };
    $('calc-expr').textContent = calcShowExpr(calc.expr) || '0';
    const v = calc.expr ? calcResultFor(calc.expr, o) : null;
    $('calc-result').textContent = calc.expr ? (v === null ? '…' : '= ' + calcFmt(v)) : '';
  }
  function calcOpen() {
    const f = calc.field; if (!f || !f._cm) return;
    calcEnsureDom();
    const cur = f._cm.native.value;
    calc.expr = cur && cur !== '' ? String(cur).replace('.', ',') : '';
    calc.fresh = calc.expr !== '';
    calc.open = true;
    $('calc-panel').classList.add('open');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    calcHideBar(true);
    calcRefresh();
    const a = $('calc-panel').querySelector('.calc-apply'); if (a) a.focus();
  }
  // Dari tombol kalkulator di dalam kolom: sama dengan membuka papan untuk kolom itu
  function calcOpenFor(text) { if (!text || !text._cm) return; calc.field = text; calcOpen(); }
  function calcClose() { calc.open = false; const p = document.getElementById('calc-panel'); if (p) p.classList.remove('open'); }
  function calcKey(k) {
    if (!calc.open) return;
    k = String(k);
    if (calc.expr.length >= 80) return;
    if (calc.fresh) { calc.fresh = false; if (/^[0-9,]/.test(k)) calc.expr = ''; }
    if (/^[+\-*/]$/.test(k) && /[+\-*/]$/.test(calc.expr)) calc.expr = calc.expr.slice(0, -1);   // ganti operator, tidak menumpuk
    if (k === ',' ) { const last = /[0-9,]*$/.exec(calc.expr)[0]; if (last.indexOf(',') >= 0) return; if (!last) k = '0,'; }
    if (k === '%' && !/[\d)%]$/.test(calc.expr)) return;
    calc.expr += k; calcRefresh();
  }
  function calcClear() { calc.fresh = false; calc.expr = ''; calcRefresh(); }
  function calcBack() { calc.fresh = false; calc.expr = calc.expr.slice(0, -1); calcRefresh(); }
  function calcEquals() {
    const o = calc.field ? calc.field._cm.opts : { dec: true, neg: true };
    const v = calcResultFor(calc.expr, o); if (v === null) return;
    calc.expr = String(v).replace('.', ','); calcRefresh();
  }
  function calcApply() {
    const f = calc.field; if (!f || !f._cm) { calcClose(); return; }
    const v = calc.expr ? calcResultFor(calc.expr, f._cm.opts) : null;
    if (v === null) { showToast('Rumus belum lengkap atau hasilnya tidak sah untuk kolom ini.', 'error'); return; }
    f._cm.commit(v);
    calcClose();
  }

  // ---------- bar kecil di bawah kolom yang fokus ----------
  function calcHideBar(force) { const b = document.getElementById('calc-bar'); if (b) b.classList.remove('show'); if (force) calc.barFor = null; }
  function calcPlaceBar(text) {
    calcEnsureDom();
    const bar = $('calc-bar'), r = text.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) { bar.classList.remove('show'); return; }
    bar.style.top = Math.min(window.innerHeight - 34, r.bottom + 3) + 'px';
    bar.style.left = Math.max(8, r.left) + 'px';
    bar.style.width = Math.min(r.width, window.innerWidth - 16) + 'px';
    bar.classList.add('show');
  }
  function calcUpdateBarResult(text) {
    const el = document.getElementById('calc-bar-result'); if (!el || !text._cm) return;
    if (!calcLooksLikeExpr(text.value)) { el.textContent = ''; return; }
    const v = calcResultFor(text.value, text._cm.opts);
    el.textContent = v === null ? 'Rumus belum lengkap' : '= ' + calcFmt(v);
    el.classList.toggle('bad', v === null);
  }
  document.addEventListener('focusin', (e) => {
    const t = e.target;
    if (t && t.classList && t.classList.contains('cmoney') && t._cm) { calc.field = t; calc.barFor = t; calcPlaceBar(t); calcUpdateBarResult(t); }
  });
  document.addEventListener('focusout', (e) => {
    const t = e.target;
    if (t && t.classList && t.classList.contains('cmoney')) setTimeout(() => { if (!(document.activeElement && document.activeElement.classList.contains('cmoney'))) calcHideBar(); }, 120);
  });
  document.addEventListener('input', (e) => { const t = e.target; if (t && t.classList && t.classList.contains('cmoney') && t._cm) calcUpdateBarResult(t); }, true);
  window.addEventListener('scroll', () => { const f = calc.barFor; if (f && document.activeElement === f) calcPlaceBar(f); }, true);
  window.addEventListener('resize', () => { const f = calc.barFor; if (f && document.activeElement === f) calcPlaceBar(f); });
  document.addEventListener('keydown', (e) => {
    if (!calc.open) return;
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); calcKey(e.key); }
    else if (/^[+\-*/]$/.test(e.key) || e.key === ',' || e.key === '%') { e.preventDefault(); calcKey(e.key); }
    else if (e.key === '.') { e.preventDefault(); }
    else if (e.key === 'Backspace') { e.preventDefault(); calcBack(); }
    else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); if (e.key === 'Enter' && document.activeElement && document.activeElement.classList.contains('calc-apply')) calcApply(); else calcEquals(); }
    else if (e.key === 'Escape') { e.preventDefault(); calcClose(); }
  }, true);
