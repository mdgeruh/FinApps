// Test unit ringan untuk kalkulasi inti (tanpa browser, tanpa dependensi).
// Jalankan dari folder proyek:  node tests/run.js
// Memuat src/js/core/data.js, src/js/core/util-ui.js, 07 dan 09 ke sandbox dengan DOM/localStorage palsu.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');

function makeSandbox(now) {
  const store = {};
  const ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const el = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, appendChild() {}, remove() {}, setAttribute() {}, dataset: {} });
  const doc = { getElementById: () => null, createElement: el, body: el(), addEventListener() {}, visibilityState: 'visible' };
  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...a) { if (a.length === 0 && now) super(now); else super(...a); }
    static now() { return now ? new RealDate(now).getTime() : RealDate.now(); }
  }
  const sb = { localStorage: ls, document: doc, window: {}, console, Date: FakeDate, Math, JSON, Map, Set, Array, Object, Number, String, RegExp, isFinite, isNaN, parseFloat, parseInt, setTimeout, clearTimeout, Intl };
  sb.window = sb;
  vm.createContext(sb);
  for (const f of ['src/js/core/data.js', 'src/js/features/transaksi/label.js', 'src/js/features/transaksi/pecah.js', 'src/js/features/transaksi/kategori-otomatis.js', 'src/js/features/transaksi/foto-struk.js', 'src/js/features/laporan/bandingkan.js', 'src/js/features/profil/pengingat-cadangan.js', 'src/js/core/util-ui.js', 'src/js/features/akun/render-akun-transaksi.js', 'src/js/features/laporan/grafik.js', 'src/js/features/perencanaan/anggaran.js', 'src/js/features/perencanaan/langganan.js', 'src/js/features/perencanaan/dana-darurat.js', 'src/js/features/perencanaan/target.js', 'src/js/features/profil/changelog.js', 'src/js/features/akun/tren-utang.js', 'src/js/features/akun/denda-telat.js', 'src/js/features/akun/ics-tagihan.js', 'src/js/features/akun/rekonsiliasi.js', 'src/js/features/beranda/perhatian.js', 'src/js/features/akun/akun-aset-tagihan.js', 'src/js/features/data/import-export.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sb, { filename: f });
  return { sb, store };
}
const run = (sb, code) => vm.runInContext(code, sb);

let pass = 0, fail = 0;
// Semua berkas JS aplikasi di src/js (rekursif), sebagai jalur relatif dari akar proyek, urut abjad.
function listAppJs(dir) {
  dir = dir || 'src/js';
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(e => e.isDirectory() ? listAppJs(dir + '/' + e.name) : (e.name.endsWith('.js') ? [dir + '/' + e.name] : [])).sort();
}
function test(name, fn) { try { fn(); pass++; console.log('  ok   ' + name); } catch (e) { fail++; console.log('  GAGAL ' + name + '\n        ' + e.message); } }
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'tidak sama') + ': ' + JSON.stringify(a) + ' != ' + JSON.stringify(b)); };
const ok = (c, m) => { if (!c) throw new Error(m || 'kondisi salah'); };

// Tanggal tetap: 15 Sep 2026 12:00 GMT+8 (= 04:00 UTC)
const NOW = '2026-09-15T04:00:00Z';

console.log('escapeHtml');
{
  const { sb } = makeSandbox(NOW);
  test('meng-escape kutip dan tag', () => eq(run(sb, `escapeHtml('a"b\\'c<d>&')`), 'a&quot;b&#39;c&lt;d&gt;&amp;'));
  test('null/undefined jadi string kosong', () => eq(run(sb, `escapeHtml(null) + escapeHtml(undefined)`), ''));
  test('angka jadi teks', () => eq(run(sb, `escapeHtml(5)`), '5'));
}

console.log('saldo & nominal');
{
  const { sb } = makeSandbox(NOW);
  test('saldo akun kas = saldo awal + masuk - keluar', () => {
    run(sb, `var D = { accounts: [{ id: 'k1', name: 'Kas', type: 'kas', initialBalance: 1000 }], txns: [
      { id: 't1', date: '2026-09-01', type: 'masuk', desc: 'x', amount: 500, accountId: 'k1' },
      { id: 't2', date: '2026-09-02', type: 'keluar', desc: 'y', amount: 200, accountId: 'k1' } ] };`);
    eq(run(sb, `accountBalance(D, 'k1')`), 1300);
  });
  test('transfer memindahkan saldo antar akun', () => {
    run(sb, `var D2 = { accounts: [{ id: 'a', name: 'A', type: 'bank', initialBalance: 1000 }, { id: 'b', name: 'B', type: 'kas', initialBalance: 0 }],
      txns: [{ id: 't', date: '2026-09-01', type: 'transfer', desc: 'p', amount: 300, accountId: 'a', toAccountId: 'b' }] };`);
    eq(run(sb, `[accountBalance(D2,'a'), accountBalance(D2,'b')]`), [700, 300]);
  });
  test('roundMoney merapikan artefak floating point', () => eq(run(sb, `roundMoney(0.1 + 0.2)`), 0.3));
  test('saveData membulatkan nominal pecahan ke 2 desimal, bunga bank tetap utuh', () => {
    run(sb, `saveData({ accounts: [{ id:'k', name:'K', type:'kas', initialBalance:0 }], txns: [
      { id:'a', date:'2026-09-01', type:'masuk', desc:'b', amount: 9363.98, accountId:'k' },
      { id:'b', date:'2026-09-01', type:'masuk', desc:'c', amount: 0.1+0.2, accountId:'k' } ] })`);
    eq(run(sb, `loadData().txns.map(t => t.amount)`), [9363.98, 0.3]);
  });
  test('formatRp membulatkan ke rupiah', () => eq(run(sb, `formatRp(1234.6)`), 'Rp1.235'));
}

console.log('biaya bulanan otomatis (applyRecurringFees)');
{
  const mk = () => {
    const { sb } = makeSandbox(NOW);
    run(sb, `var K = { accounts: [
      { id: 'kas1', name: 'Kas', type: 'kas', initialBalance: 5000000 },
      { id: 'kk1', name: 'Kartu', type: 'kartu_kredit', initialBalance: 0, limit: 10000000, feeAmount: 50000, feeDay: 10, feeType: 'nominal', feePeriod: 'bulanan', lastFeeAppliedMonth: '2026-07' } ],
      txns: [ { id: 'p1', date: '2026-07-05', type: 'keluar', desc: 'belanja', amount: 1000000, accountId: 'kk1' } ] };`);
    return sb;
  };
  test('membuat biaya untuk bulan yang terlewat dengan ID deterministik', () => {
    const sb = mk();
    run(sb, `applyRecurringFees(K)`);
    const ids = run(sb, `K.txns.filter(t => t.id.indexOf('fee-') === 0).map(t => t.id).sort()`);
    eq(ids, ['fee-kk1-2026-08-admin', 'fee-kk1-2026-09-admin']);
  });
  test('idempoten: dijalankan lagi tidak menambah transaksi', () => {
    const sb = mk();
    run(sb, `applyRecurringFees(K)`);
    const n1 = run(sb, `K.txns.length`);
    run(sb, `applyRecurringFees(K)`);
    eq(run(sb, `K.txns.length`), n1);
  });
  test('dua perangkat menerapkan bulan yang sama -> ID sama, tidak ada transaksi ganda saat digabung', () => {
    const a = mk(), b = mk();
    run(a, `applyRecurringFees(K)`); run(b, `applyRecurringFees(K)`);
    const idsA = run(a, `K.txns.map(t => t.id)`), idsB = run(b, `K.txns.map(t => t.id)`);
    eq(new Set([...idsA, ...idsB]).size, idsA.length, 'gabungan ID harus sama dengan salah satu sisi');
  });
  test('sebelum tanggal jatuh tempo bulan ini tidak dikenakan', () => {
    const { sb } = makeSandbox('2026-09-05T04:00:00Z');   // tanggal 5 < feeDay 10
    run(sb, `var K = { accounts: [{ id:'kk1', name:'Kartu', type:'kartu_kredit', initialBalance:0, feeAmount:50000, feeDay:10, feePeriod:'bulanan', lastFeeAppliedMonth:'2026-08' }], txns: [] }; applyRecurringFees(K);`);
    eq(run(sb, `K.txns.length`), 0);
  });
}

console.log('pinjaman & PayLater');
{
  const { sb } = makeSandbox(NOW);
  test('computeFlatCicilan: pokok 1,2 jt, 6 bulan, 2%/bln -> bunga 144.000, cicilan 224.000', () => {
    const r = run(sb, `computeFlatCicilan(1200000, 6, 2, 0)`);
    eq([r.bunga, r.monthly, r.total], [144000, 224000, 1344000]);
  });
  test('loanAnnuityPMT: pokok 12 juta, 12 bulan, bunga 1%/bulan ≈ 1.066.185', () => {
    const v = run(sb, `loanAnnuityPMT(12000000, 1, 12)`);
    ok(Math.abs(v - 1066185) < 5, 'PMT = ' + v);
  });
  test('loanAnnuityPMT tanpa bunga = pokok / tenor', () => eq(Math.round(run(sb, `loanAnnuityPMT(1200000, 0, 12)`)), 100000));
  test('assetBalance memakai penilaian terbaru + transaksi sesudahnya', () => {
    run(sb, `var A = { id: 'as', name: 'Emas', type: 'aset', initialBalance: 0, valuations: [{ date: '2026-08-01', value: 1000 }, { date: '2026-09-01', value: 1500 }] };`);
    eq(run(sb, `assetBalance(A, [{ id:'t', date:'2026-09-10', type:'transfer', desc:'', amount: 200, accountId:'k', toAccountId:'as' }], '2026-09-15')`), 1700);
  });
}

console.log('kalender tagihan');
{
  const { sb } = makeSandbox(NOW);
  test('tagihan kartu kredit muncul di kalender bulan jatuh temponya', () => {
    run(sb, `var C = { accounts: [
      { id: 'kas1', name: 'Kas', type: 'kas', initialBalance: 9000000 },
      { id: 'kk1', name: 'Kartu', type: 'kartu_kredit', initialBalance: 0, limit: 10000000, cardStatementDay: 1, feeDay: 20 } ],
      txns: [ { id: 'p1', date: '2026-08-10', type: 'keluar', desc: 'belanja', amount: 750000, accountId: 'kk1' } ] };
      var CB = computeAllBalances(C); var CAL = computeBillCalendar(C, CB, 6);`);
    ok(run(sb, `CAL.length`) > 0, 'kalender kosong');
    const total = run(sb, `CAL.reduce((s, m) => s + m.total, 0)`);
    ok(total >= 750000, 'total tagihan kalender = ' + total + ', harus memuat utang kartu 750.000');
  });
}


console.log('anggaran per kategori');
{
  const { sb } = makeSandbox(NOW);
  const mk = (id, cat, amt, date, extra) => Object.assign({ id, type: 'keluar', category: cat, amount: amt, date, accountId: 'a' }, extra || {});
  const data = { accounts: [{ id: 'a', name: 'Kas', type: 'kas', initialBalance: 0 }],
    budgets: { 'Makan & minum': 1000000, 'Hiburan': 200000, 'Cicilan/utang': 500000, 'Kategori Ngawur': 5, 'Kesehatan': -3 },
    txns: [ mk(1, 'Makan & minum', 850000, '2026-09-03'), mk(2, 'Makan & minum', 100000.5, '2026-09-10'),
            mk(3, 'Hiburan', 250000, '2026-09-11'), mk(4, 'Makan & minum', 999999, '2026-08-30'),
            mk(5, 'Transportasi', 70000, '2026-09-12') ] };
  sb.__d = data;
  test('sanitizeBudgets membuang kategori tidak dikenal, nominal <= 0, dan Cicilan/utang', () =>
    eq(run(sb, 'sanitizeBudgets(__d.budgets)'), { 'Makan & minum': 1000000, 'Hiburan': 200000 }));
  test('sanitizeBudgets aman untuk null/array/teks', () => eq(run(sb, '[null, [], "x", 5].map(v => Object.keys(sanitizeBudgets(v)).length)'), [0, 0, 0, 0]));
  test('realisasi hanya bulan itu; kategori tanpa anggaran diabaikan', () => {
    const r = run(sb, "computeBudgetStatus(__d, '2026-09')");
    eq(r.map(x => x.category), ['Hiburan', 'Makan & minum']);
    eq(r.map(x => x.spent), [250000, 950000.5]);
  });
  test('status: over > 100%, warn 80-100%, ok di bawah 80%', () => {
    const r = run(sb, "computeBudgetStatus(__d, '2026-09')");
    eq(r.map(x => x.status), ['over', 'warn']);
    eq(run(sb, "computeBudgetStatus({txns: [], budgets: {'Hiburan': 100}}, '2026-09')[0].status"), 'ok');
  });
  test('tepat 100% masih warn (belum over), tepat 80% sudah warn', () => {
    eq(run(sb, "computeBudgetStatus({txns:[{type:'keluar',category:'Hiburan',amount:100,date:'2026-09-01'}], budgets:{'Hiburan':100}}, '2026-09')[0].status"), 'warn');
    eq(run(sb, "computeBudgetStatus({txns:[{type:'keluar',category:'Hiburan',amount:80,date:'2026-09-01'}], budgets:{'Hiburan':100}}, '2026-09')[0].status"), 'warn');
  });
  test('data tanpa budgets tidak error', () => eq(run(sb, "computeBudgetStatus({txns: []}, '2026-09')"), []));
  test('mergeImportedBudgets tidak menimpa yang sudah diatur', () => {
    const r = run(sb, "(() => { const d = { budgets: { 'Hiburan': 1 } }; mergeImportedBudgets(d, { budgets: { 'Hiburan': 999, 'Kesehatan': 50 } }); return d.budgets; })()");
    eq(r, { 'Hiburan': 1, 'Kesehatan': 50 });
  });
}


console.log('langganan berulang');
{
  const { sb } = makeSandbox(NOW); // 15 Sep 2026
  const mkData = (subs) => ({ accounts: [{ id: 'a', name: 'Bank', type: 'bank', initialBalance: 0 }], txns: [], subscriptions: subs });
  const sub = (o) => Object.assign({ id: 's1', name: 'Netflix', amount: 54000, accountId: 'a', day: 5, active: true, lastAppliedMonth: '2026-07' }, o || {});
  const apply = (d) => { sb.__d = d; return run(sb, 'applySubscriptions(__d).txns.map(t => [t.id, t.date, t.amount, t.category])'); };
  test('sanitizeSubscriptions membuang data tidak valid', () => {
    sb.__r = [null, 5, { name: '', amount: 1, accountId: 'a', day: 1 }, { name: 'x', amount: -1, accountId: 'a', day: 1 }, { name: 'x', amount: 1, accountId: 'a', day: 32 }, { name: 'ok', amount: 10, accountId: 'a', day: 3 }];
    eq(run(sb, 'sanitizeSubscriptions(__r).map(s => s.name)'), ['ok']);
    eq(run(sb, 'sanitizeSubscriptions("x").length'), 0);
  });
  test('langganan baru: bulan ini dilewati kalau tanggal tagih sudah lewat, dicatat saat jatuh tempo kalau belum/tepat hari ini', () => {
    eq(run(sb, 'subInitialLastApplied(10)'), '2026-09');
    eq(run(sb, 'subInitialLastApplied(20)'), '2026-08');
    eq(run(sb, 'subInitialLastApplied(15)'), '2026-08');
  });
  test('mengejar bulan yang terlewat dan berID deterministik', () => {
    eq(apply(mkData([sub()])), [['sub-s1-2026-08', '2026-08-05', 54000, 'Tagihan & langganan'], ['sub-s1-2026-09', '2026-09-05', 54000, 'Tagihan & langganan']]);
  });
  test('idempoten: dijalankan lagi tidak menambah transaksi', () => {
    const d = mkData([sub()]); apply(d); const n = d.txns.length; apply(d); eq(d.txns.length, n);
  });
  test('dua perangkat menghasilkan ID yang sama', () => eq(apply(mkData([sub()])).map(t => t[0]), apply(mkData([sub()])).map(t => t[0])));
  test('belum jatuh tempo bulan ini: tidak dibuat dan lastAppliedMonth tidak maju', () => {
    const d = mkData([sub({ day: 20, lastApplied: undefined, lastAppliedMonth: '2026-08' })]);
    eq(apply(d), []); eq(d.subscriptions[0].lastAppliedMonth, '2026-08');
  });
  test('tanggal 31 di bulan 30 hari dipatok ke tanggal 30', () => {
    eq(apply(mkData([sub({ day: 31, lastAppliedMonth: '2026-07' })])).map(t => t[1]), ['2026-08-31']);
  });
  test('dijeda atau akun hilang: tidak membuat transaksi', () => {
    eq(apply(mkData([sub({ active: false })])), []);
    eq(apply(mkData([sub({ accountId: 'hilang' })])), []);
  });
  test('pengejaran dibatasi 12 bulan', () => eq(apply(mkData([sub({ lastAppliedMonth: '2020-01' })])).length, 12));
  test('total bulanan hanya menghitung yang aktif', () => {
    sb.__s = [sub({ amount: 100 }), sub({ id: 's2', amount: 50.5 }), sub({ id: 's3', amount: 999, active: false })];
    eq(run(sb, 'subMonthlyTotal(__s)'), 150.5);
  });
  test('import: akun dipetakan lewat idMap, duplikat dilewati, akun tak dikenal dibuang', () => {
    sb.__p = { subscriptions: [sub({ accountId: 'old' }), sub({ id: 'x', name: 'Spotify', accountId: 'zzz' })] };
    sb.__ex = [];
    const r = run(sb, "importSubscriptions(__ex, __p, { old: 'a' }, ['a'])");
    eq(r.map(x => [x.name, x.accountId]), [['Netflix', 'a']]);
    sb.__ex = r;
    eq(run(sb, "importSubscriptions(__ex, __p, { old: 'a' }, ['a'])").length, 1);
  });
}

console.log('dana darurat');
{
  const { sb } = makeSandbox(NOW);
  const mk = (start, extra) => ({ accounts: [{ id: 'k', name: 'Kas', type: 'kas', initialBalance: start }], txns: [
    { id: 'a', date: '2026-01-01', type: 'masuk', amount: 100, accountId: 'k', category: 'Gaji' },
    { id: 'b', date: '2026-06-20', type: 'keluar', amount: 3000000, accountId: 'k', category: 'Makan & minum' },
    { id: 'c', date: '2026-08-10', type: 'keluar', amount: 3000000, accountId: 'k', category: 'Belanja harian' },
    { id: 'd', date: '2026-09-10', type: 'keluar', amount: 3000000, accountId: 'k', category: 'Transportasi' }].concat(extra || []), emergencyMonths: 6 });
  const calc = d => { sb.__d = d; return run(sb, 'computeEmergencyFund(__d, computeAllBalances(__d))'); };
  test('sanitizeEmergencyMonths: 1-24 bulat, selain itu 0', () => {
    eq([5, '6', 6.4, 0, 25, -1, 'x', null].map(v => { sb.__v = v; return run(sb, 'sanitizeEmergencyMonths(__v)'); }), [5, 6, 6, 0, 0, 0, 0, 0]);
  });
  test('rata-rata pengeluaran 90 hari dibagi 3 bulan; target = rata-rata x bulan', () => {
    const r = calc(mk(20000000));
    eq(r.avg, 3000000); eq(r.target, 18000000); eq(r.status, 'warn');
  });
  test('arus utang (cicilan) tidak ikut rata-rata', () => {
    const r = calc(mk(20000000, [{ id: 'e', date: '2026-09-01', type: 'keluar', amount: 5000000, accountId: 'k', category: 'Cicilan/utang' }]));
    eq(r.avg, 3000000);
  });
  test('ambang status: ok >= 100%, warn >= 50%, low di bawahnya', () => {
    eq(calc(mk(40000000)).status, 'ok');
    eq(calc(mk(20000000)).status, 'warn');
    eq(calc(mk(10000000)).status, 'low');
  });
  test('target belum diatur: null; tanpa pengeluaran: nodata', () => {
    const d = mk(1000); delete d.emergencyMonths;
    eq(calc(d), null);
    const e = mk(1000); e.txns = []; eq(calc(e).status, 'nodata');
  });
  test('import gabung: tidak menimpa target yang sudah ada', () => {
    sb.__p = { emergencyMonths: 12 };
    sb.__d = { emergencyMonths: 3 }; run(sb, 'mergeImportedEmergency(__d, __p)'); eq(sb.__d.emergencyMonths, 3);
    sb.__d = {}; run(sb, 'mergeImportedEmergency(__d, __p)'); eq(sb.__d.emergencyMonths, 12);
  });
}

console.log('riwayat perubahan');
{
  const { sb } = makeSandbox(NOW);
  test('per tanggal hanya entri terbaru; tanggal lain tetap ikut', () => {
    sb.__e = [{ v: '3', d: 'B' }, { v: '2', d: 'A' }, { v: '1', d: 'A' }];
    eq(run(sb, 'changelogLatestPerDate(__e)').map(x => x.v), ['3', '2']);
  });
  test('data riwayat asli: tiap tanggal tampil sekali, versi terbaru = APP_VERSION', () => {
    const r = run(sb, 'changelogLatestPerDate(CHANGELOG_ENTRIES)');
    eq(new Set(r.map(x => x.d)).size, r.length);
    eq(run(sb, 'CHANGELOG_ENTRIES[0].v'), fs.readFileSync(path.join(root, 'src/js/core/render-utama.js'), 'utf8').match(/APP_VERSION = '([^']+)'/)[1]);
  });
}

console.log('tren total utang');
{
  const { sb } = makeSandbox(NOW);
  const mk = extra => ({ accounts: [{ id: 'k', name: 'Kas', type: 'kas', initialBalance: 10000000 }, { id: 'cc', name: 'Kartu', type: 'kartu_kredit', initialBalance: 0, limit: 5000000 }], txns: [
    { id: '1', date: '2026-07-10', type: 'keluar', amount: 1000000, accountId: 'cc', category: 'Belanja harian' },
    { id: '2', date: '2026-08-15', type: 'transfer', amount: 600000, accountId: 'k', toAccountId: 'cc' },
    { id: '3', date: '2026-09-05', type: 'keluar', amount: 500000, accountId: 'cc', category: 'Belanja harian' }].concat(extra || []) });
  const calc = d => { sb.__d = d; return run(sb, "computeDebtTrend(__d, '2026-09-15')"); };
  test('total utang akhir tiap bulan, 6 bulan, bulan berjalan sampai hari ini', () => {
    const r = calc(mk());
    eq(r.map(x => x.key), ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']);
    eq(r.map(x => x.total), [0, 0, 0, 1000000, 400000, 900000]);
  });
  test('transaksi setelah hari ini tidak dihitung', () => {
    eq(calc(mk([{ id: '4', date: '2026-09-20', type: 'keluar', amount: 700000, accountId: 'cc', category: 'Belanja harian' }])).pop().total, 900000);
  });
  test('saldo kartu positif (kelebihan bayar) dan akun bukan utang dihitung 0', () => {
    const d = mk(); d.txns = [{ id: '9', date: '2026-08-01', type: 'transfer', amount: 300000, accountId: 'k', toAccountId: 'cc' }];
    eq(calc(d).map(x => x.total), [0, 0, 0, 0, 0, 0]);
  });
}

console.log('denda keterlambatan');
{
  const { sb } = makeSandbox(NOW);
  const sch = { rows: [
    { no: 1, due: '2026-08-05', total: 1000000, status: 'lunas' },
    { no: 2, due: '2026-09-05', total: 1000000, status: 'telat' },
    { no: 3, due: '2026-10-05', total: 1000000, status: 'belum' }] };
  const calc = acc => { sb.__a = acc; sb.__s = sch; return run(sb, "computeLateFees(__a, __s, '2026-09-15')"); };
  test('sanitize persen denda dan batas', () => {
    eq([0.5, '1.25', 0, -1, 101, 'x'].map(v => { sb.__v = v; return run(sb, 'sanitizeLateFeePct(__v)'); }), [0.5, 1.25, 0, 0, 0, 0]);
    eq([50, 0, 1001, '30'].map(v => { sb.__v = v; return run(sb, 'sanitizeLateFeeCap(__v)'); }), [50, 0, 0, 30]);
  });
  test('denda = angsuran x persen x hari telat; hanya angsuran telat', () => {
    const r = calc({ loanLateFeePercent: 0.5 });
    eq(r.items.map(x => [x.no, x.days, x.fee]), [[2, 10, 50000]]);
    eq(r.total, 50000);
  });
  test('batas maksimal denda per angsuran', () => eq(calc({ loanLateFeePercent: 0.5, loanLateFeeCapPercent: 3 }).total, 30000));
  test('persen denda belum diisi: null', () => eq(calc({}), null));
}

console.log('ekspor kalender .ics');
{
  const { sb } = makeSandbox(NOW);
  const months = [{ monthKey: '2026-10', total: 1500000, items: [
    { accId: 'a1', accName: 'Pinjol, Shopee; "X"', label: 'Angsuran ke-1/9', amount: 1000000, due: '2026-10-31' },
    { accId: 'a2', accName: 'KK', label: 'Tagihan kartu', amount: 500000, due: '2026-10-05' }] }];
  const r = run(sb, 'buildBillsIcs(' + JSON.stringify(months) + ", '20260929T000000Z')");
  test('jumlah event dan pembungkus VCALENDAR', () => {
    eq(r.count, 2);
    ok(r.text.startsWith('BEGIN:VCALENDAR') && r.text.trimEnd().endsWith('END:VCALENDAR'));
    eq((r.text.match(/BEGIN:VEVENT/g) || []).length, 2);
  });
  test('akhir bulan: DTEND = hari berikutnya (lintas bulan/tahun)', () => {
    ok(r.text.includes('DTSTART;VALUE=DATE:20261031') && r.text.includes('DTEND;VALUE=DATE:20261101'));
    eq(run(sb, "icsNextDay('2026-12-31')"), '20270101');
  });
  test('koma, titik koma, dan baris baru di-escape; baris dilipat maks 75 karakter', () => {
    ok(r.text.includes('Pinjol\\, Shopee\\; "X"'));
    ok(r.text.split('\r\n').every(l => l.length <= 75));
  });
  test('UID unik per event; daftar kosong = 0 event', () => {
    const uids = r.text.match(/UID:.*/g); eq(new Set(uids).size, 2);
    eq(run(sb, "buildBillsIcs([], 'x')").count, 0);
  });
}

console.log('rekonsiliasi saldo');
{
  const { sb } = makeSandbox(NOW);
  test('selisih = saldo asli - saldo app, 2 desimal', () => {
    eq(run(sb, 'computeReconcileDiff(100000, 125000.556)'), 25000.56);
    eq(run(sb, 'computeReconcileDiff(100000, 90000)'), -10000);
    eq(run(sb, 'computeReconcileDiff(50000, 50000)'), 0);
  });
  test('hanya kas/bank/e-wallet yang bisa direkonsiliasi', () => eq(run(sb, "['kas','bank','ewallet','aset','kartu_kredit','pinjaman','titipan'].map(t => !!RECONCILE_TYPES[t])"), [true, true, true, false, false, false, false]));
  test('penyesuaian dikecualikan dari arus operasional tapi bukan arus utang', () => {
    ok(run(sb, "isNonOperatingTxn({ type: 'keluar', category: 'Penyesuaian saldo', amount: 1 })"));
    ok(run(sb, "isNonOperatingTxn({ type: 'keluar', category: 'Cicilan/utang', amount: 1 })"));
    ok(!run(sb, "isNonOperatingTxn({ type: 'keluar', category: 'Makan & minum', amount: 1 })"));
    ok(!run(sb, "isDebtFlowTxn({ type: 'keluar', category: 'Penyesuaian saldo', amount: 1 })"));
  });
  test('kategori penyesuaian ada di masuk & keluar, tidak bisa dianggarkan', () => {
    ok(run(sb, "CATEGORIES.masuk.includes('Penyesuaian saldo') && CATEGORIES.keluar.includes('Penyesuaian saldo')"));
    ok(!run(sb, "budgetCategories().includes('Penyesuaian saldo')"));
  });
}

console.log('strip perlu perhatian');
{
  const { sb } = makeSandbox(NOW);
  const setup = (extra) => run(sb, `var A = { emergencyMonths: 0, budgets: {}, accounts: [
    { id: 'k1', name: 'Kas', type: 'kas', initialBalance: 1000000 },
    { id: 'p1', name: 'Pinjaman A', type: 'pinjaman', initialBalance: -1200000, loanTenorMonths: 12, loanStartDate: '2026-07-10', loanDueDay: 10, loanInterestType: 'flat', loanRatePercent: 0 },
    { id: 'c2', name: 'Kartu B', type: 'kartu_kredit', initialBalance: -300000, feeDay: 16 } ], txns: [] }; ${extra || ''}`);
  test('tidak ada apa-apa = daftar kosong', () => {
    run(sb, `var A = { emergencyMonths: 0, budgets: {}, accounts: [{ id: 'k1', name: 'Kas', type: 'kas', initialBalance: 1000 }], txns: [] };`);
    eq(run(sb, `computeAttentionItems(A, computeAllBalances(A), '2026-09')`), []);
  });
  test('tagihan telat (merah) mendahului tagihan mendekat; satu item = buka akun', () => {
    setup();
    const r = run(sb, `computeAttentionItems(A, computeAllBalances(A), '2026-09')`);
    ok(r.length >= 1 && r.length <= 3);
    eq(r[0].kind, 'telat'); eq(r[0].level, 'red'); eq(r[0].act, 'openAccountDetail'); eq(r[0].arg, 'p1');
    eq(r[1].kind, 'jatuh-tempo'); eq(r[1].arg, 'c2');
  });
  test('kartu kredit yang minimumnya sudah dibayar tidak memicu peringatan (walau lewat jatuh tempo)', () => {
    run(sb, `var A = { emergencyMonths: 0, budgets: {}, accounts: [
      { id: 'k1', name: 'Kas', type: 'kas', initialBalance: 5000000 },
      { id: 'c1', name: 'Kartu C', type: 'kartu_kredit', initialBalance: -1000000, cardStatementDay: 1, feeDay: 10 } ], txns: [] };`);
    let r = run(sb, `computeAttentionItems(A, computeAllBalances(A), '2026-09')`);
    eq(r.length, 1); eq(r[0].kind, 'telat');
    run(sb, `A.txns.push({ id: 't1', type: 'transfer', amount: 50000, accountId: 'k1', toAccountId: 'c1', date: '2026-09-05', category: 'Bayar tagihan/utang', desc: 'Bayar KK - Minimal' });`);
    r = run(sb, `computeAttentionItems(A, computeAllBalances(A), '2026-09')`);
    eq(r.length, 0);
    const dues = run(sb, `computeUpcomingDues(A, computeAllBalances(A), 365)`);
    eq(dues.length, 1); eq(dues[0].minMet, true);
  });
  test('kalender tagihan kartu kredit ikut turun setelah bayar minimum/nominal/penuh; tanpa tanggal cetak tetap tampil', () => {
    run(sb, `var A = { emergencyMonths: 0, budgets: {}, accounts: [
      { id: 'k1', name: 'Kas', type: 'kas', initialBalance: 5000000 },
      { id: 'c1', name: 'Kartu C', type: 'kartu_kredit', initialBalance: -1000000, cardStatementDay: 1, feeDay: 20 },
      { id: 'c2', name: 'Kartu D', type: 'kartu_kredit', initialBalance: -400000, feeDay: 25 } ], txns: [] };
      var cal = () => computeBillCalendar(A, computeAllBalances(A), 12).flatMap(m => m.items);
      var item = id => cal().find(i => i.accId === id);`);
    eq(run(sb, `item('c1').amount`), 1000000); eq(run(sb, `item('c2').amount`), 400000);
    run(sb, `A.txns.push({ id: 'p1', type: 'transfer', amount: 50000, accountId: 'k1', toAccountId: 'c1', date: '2026-09-05', category: 'x', desc: 'min' });`);
    eq(run(sb, `item('c1').amount`), 950000); ok(/minimum terbayar/.test(run(sb, `item('c1').label`)));
    run(sb, `A.txns.push({ id: 'p2', type: 'transfer', amount: 950000, accountId: 'k1', toAccountId: 'c1', date: '2026-09-06', category: 'x', desc: 'penuh' });`);
    eq(run(sb, `item('c1')`), undefined);
    run(sb, `A.txns.push({ id: 'p3', type: 'transfer', amount: 100000, accountId: 'k1', toAccountId: 'c2', date: '2026-09-07', category: 'x', desc: 'sebagian' });`);
    eq(run(sb, `item('c2').amount`), 300000);
  });
  test('lebih dari satu tagihan digabung jadi satu baris menuju tab Tagihan', () => {
    setup(`A.accounts.push({ id: 'p2', name: 'Pinjaman B', type: 'pinjaman', initialBalance: -600000, loanTenorMonths: 6, loanStartDate: '2026-07-05', loanDueDay: 5, loanInterestType: 'flat', loanRatePercent: 0 });`);
    const r = run(sb, `computeAttentionItems(A, computeAllBalances(A), '2026-09')`);
    const late = r.find(x => x.kind === 'telat');
    eq(late.act, 'setTab'); eq(late.arg, 'tagihan'); ok(/^2 tagihan/.test(late.title), late.title);
  });
  test('anggaran >=80% masuk; terlampaui = merah dengan penanda jumlah lainnya', () => {
    run(sb, `var A = { emergencyMonths: 0, budgets: { 'Makan & minum': 100000, 'Transportasi': 100000 }, accounts: [{ id: 'k1', name: 'Kas', type: 'kas', initialBalance: 1000000 }], txns: [
      { id: 't1', date: '2026-09-02', type: 'keluar', desc: 'x', amount: 150000, accountId: 'k1', category: 'Makan & minum' },
      { id: 't2', date: '2026-09-03', type: 'keluar', desc: 'y', amount: 85000, accountId: 'k1', category: 'Transportasi' } ] };`);
    const r = run(sb, `computeAttentionItems(A, computeAllBalances(A), '2026-09')`);
    eq(r.length, 1); eq(r[0].kind, 'anggaran'); eq(r[0].level, 'red');
    ok(/terlampaui/.test(r[0].title) && /\+1 lainnya/.test(r[0].title), r[0].title);
  });
  test('dana darurat kurang muncul; maksimal 3 baris', () => {
    setup(`A.emergencyMonths = 6; A.budgets = { 'Makan & minum': 100000 };
      A.txns = [{ id: 't1', date: '2026-09-02', type: 'keluar', desc: 'x', amount: 95000, accountId: 'k1', category: 'Makan & minum' }];`);
    const r = run(sb, `computeAttentionItems(A, computeAllBalances(A), '2026-09')`);
    eq(r.length, 3);
    ok(!r.some(x => x.kind === 'dana-darurat'), 'baris ke-4 terpotong oleh batas 3');
    run(sb, `A.accounts = [{ id: 'k1', name: 'Kas', type: 'kas', initialBalance: 100000 }]; A.budgets = {};`);
    const r2 = run(sb, `computeAttentionItems(A, computeAllBalances(A), '2026-09')`);
    eq(r2.length, 1); eq(r2[0].kind, 'dana-darurat');
  });
}

console.log('segmen grafik Ringkasan');
{
  const { sb } = makeSandbox(NOW);
  test('segmen yang diminta dipakai kalau tersedia', () => eq(run(sb, "pickChartSegment('tren', () => false).cur.id"), 'tren'));
  test('segmen disembunyikan/kosong tidak tersedia; jatuh ke segmen pertama yang tersedia', () => {
    eq(run(sb, "pickChartSegment('utang', id => id === 'debt-trend-card').avail.map(s => s.id)"), ['kekayaan', 'cashflow', 'tren']);
    eq(run(sb, "pickChartSegment('utang', id => id === 'debt-trend-card' || id === 'networth-chart-card').cur.id"), 'cashflow');
  });
  test('semua segmen mati = tidak ada segmen aktif', () => eq(run(sb, "pickChartSegment('kekayaan', () => true).cur"), null));
  test('semua segmen grafik (kekayaan, cashflow, tren, utang) memakai pemilih periode; kategori bukan segmen lagi', () => {
    eq(run(sb, "CHART_SEGMENTS.filter(s => s.period).map(s => s.id)"), ['kekayaan', 'cashflow', 'tren', 'utang']);
    eq(run(sb, "CHART_SEGMENTS.some(s => s.id === 'kategori')"), false);
  });
  test('computeRingkasanVisibility: data kosong = grafik kekayaan/cashflow/utang kosong', () => {
    run(sb, "var E = { accounts: [{ id: 'k1', name: 'Kas', type: 'kas', initialBalance: 1000 }], txns: [] };");
    eq(run(sb, "(() => { const v = computeRingkasanVisibility(E); return ['networth-chart-card','cashflow-chart-card','debt-trend-card'].every(v.off); })()"), true);
  });
}

console.log('urutan kartu Ringkasan');
{
  const { sb } = makeSandbox(NOW);
  const DEF = ['month-insight-card','budget-card','sub-card','emergency-card','goal-card','plan-cta-card','account-values-card','recent-txn-card','chart-group','category-chart-card','tag-chart-card'];
  test('tanpa data tersimpan = urutan bawaan', () => { eq(run(sb, 'sanitizeRingkasanOrder([])'), DEF); eq(run(sb, 'sanitizeRingkasanOrder(null)'), DEF); });
  test('urutan tersimpan dipertahankan; id asing dan duplikat dibuang; yang hilang disisipkan setelah pendahulunya', () => {
    eq(run(sb, "sanitizeRingkasanOrder(['recent-txn-card','xxx','recent-txn-card','month-insight-card'])"),
      ['recent-txn-card','chart-group','category-chart-card','tag-chart-card','month-insight-card','budget-card','sub-card','emergency-card','goal-card','plan-cta-card','account-values-card']);
  });
  test('urutan lama tanpa kartu ajakan: kartu baru masuk tepat setelah Dana darurat, bukan di ujung', () => {
    eq(run(sb, "sanitizeRingkasanOrder(['recent-txn-card','month-insight-card','budget-card','sub-card','emergency-card','account-values-card','chart-group'])"),
      ['recent-txn-card','month-insight-card','budget-card','sub-card','emergency-card','goal-card','plan-cta-card','account-values-card','chart-group','category-chart-card','tag-chart-card']);
  });
  test('moveInOrder: naik, turun, dan tidak berubah di ujung', () => {
    eq(run(sb, "moveInOrder(['a','b','c'], 'b', -1)"), ['b','a','c']);
    eq(run(sb, "moveInOrder(['a','b','c'], 'b', 1)"), ['a','c','b']);
    eq(run(sb, "moveInOrder(['a','b','c'], 'a', -1)"), ['a','b','c']);
    eq(run(sb, "moveInOrder(['a','b','c'], 'c', 1)"), ['a','b','c']);
    eq(run(sb, "moveInOrder(['a','b','c'], 'zz', 1)"), ['a','b','c']);
  });
  test('kartu Insight lain & Beban cicilan sudah menyatu ke Bulan ini; anggaran & langganan bisa disembunyikan', () => {
    const ids = run(sb, 'RINGKASAN_CARDS.map(c => c.id)');
    ok(!ids.includes('more-insight-card') && !ids.includes('debt-burden-card'));
    ok(ids.includes('budget-card') && ids.includes('sub-card'));
  });
}

console.log('kartu rencana belum dipakai (R7)');
{
  const { sb } = makeSandbox(NOW);
  const U = (extra) => run(sb, `(() => { const d = Object.assign({ accounts: [{ id: 'k1', name: 'Kas', type: 'kas', initialBalance: 1000 }], txns: [], budgets: {}, subscriptions: [], emergencyMonths: 0 }, ${extra}); return { u: computePlanUsage(d), v: (() => { const v = computeRingkasanVisibility(d); return ['budget-card','sub-card','emergency-card','goal-card','plan-cta-card'].map(i => v.off(i)); })() }; })()`);
  test('belum ada yang dipakai: tiga kartu tersembunyi, kartu ajakan tampil', () => {
    const r = U('{}'); eq(r.u, { budget: false, sub: false, emergency: false, goal: false }); eq(r.v, [true, true, true, true, false]);
  });
  test('anggaran dipakai: kartu anggaran tampil, kartu ajakan tetap tampil untuk sisanya', () => {
    const r = U("{ budgets: { 'Makan & minum': 100000 } }"); eq(r.u.budget, true); eq(r.v, [false, true, true, true, false]);
  });
  test('semua sudah dipakai: kartu ajakan hilang, tiga kartu tampil', () => {
    const r = U("{ budgets: { 'Makan & minum': 1 }, emergencyMonths: 6, goals: [{ id: 'g1', name: 'Motor', target: 5000000, accountId: '', deadline: '', saved: 0 }], subscriptions: [{ id: 's1', name: 'Netflix', amount: 50000, day: 5, accountId: 'k1', active: true, startMonth: '2026-09' }] }");
    eq(r.u, { budget: true, sub: true, emergency: true, goal: true }); eq(r.v, [false, false, false, false, true]);
  });
  test('nilai tidak valid dianggap belum dipakai', () => eq(U("{ budgets: { x: -5 }, emergencyMonths: 99, subscriptions: 'x', goals: 'x' }").u, { budget: false, sub: false, emergency: false, goal: false }));
}

console.log('aksesibilitas grafik (R6)');
{
  const { sb } = makeSandbox(NOW);
  const G2 = "{ days: ['2026-05', '2026-06'], series: [{ label: 'Pemasukan', values: [1000, 2000] }, { label: 'Pengeluaran', values: [500, 700] }], formatDate: k => 'bln ' + k, formatValue: v => 'R' + v }";
  const G1 = "{ days: ['2026-09-01', '2026-09-02', '2026-09-03'], points: [10, 20, 30], formatDate: k => k, formatValue: v => 'R' + v }";
  test('trendArrow: naik ▲, turun ▼, sama kosong', () => eq(run(sb, "[trendArrow(5), trendArrow(-5), trendArrow(0)]"), ['▲ ', '▼ ', '']));
  test('describeChartPoint seri ganda menyebut tiap seri', () => eq(run(sb, `describeChartPoint(${G2}, 1)`), 'bln 2026-06: Pemasukan R2000, Pengeluaran R700'));
  test('describeChartPoint seri tunggal; indeks di luar rentang kosong', () => {
    eq(run(sb, `describeChartPoint(${G1}, 2)`), '2026-09-03: R30');
    eq(run(sb, `describeChartPoint(${G1}, 9)`), '');
  });
  test('chartAriaLabel memuat judul, jumlah titik, rentang, nilai terakhir, dan petunjuk panah', () => {
    const t = run(sb, `chartAriaLabel('Judul', ${G1})`);
    ok(t.startsWith('Judul. 3 titik data, dari 2026-09-01 sampai 2026-09-03. Terakhir, 2026-09-03: R30.'), t);
    ok(t.includes('panah kiri dan kanan'), t);
  });
  test('chartAriaLabel tanpa data', () => eq(run(sb, "chartAriaLabel('Judul', null)"), 'Judul. Belum ada data.'));
  test('describePieChart: kosong, lima terbesar, total', () => {
    eq(run(sb, "describePieChart([], 0, 'Pengeluaran')"), 'Pengeluaran bulan ini: belum ada transaksi.');
    const items = "[{category:'A',amount:50},{category:'B',amount:30},{category:'C',amount:10},{category:'D',amount:5},{category:'E',amount:3},{category:'F',amount:2}]";
    const t = run(sb, `describePieChart(${items}, 100, 'Pengeluaran')`);
    ok(t.includes('Lima terbesar: A 50 persen, B 30 persen, C 10 persen, D 5 persen, E 3 persen.'), t);
    ok(!t.includes('F 2'), t);
  });
  test('setiap grafik punya judul untuk label', () => run(sb, "['networth-chart','cashflow-chart','trend-chart','debt-trend-chart','laporan-trend-chart'].every(id => chartTitleFor(id).length > 3)") || (() => { throw new Error('judul kosong'); })());
}

console.log('proyeksi akhir bulan (R8)');
{
  const { sb } = makeSandbox(NOW);
  const D = (extra) => `{ accounts: [{ id: 'k', name: 'K', type: 'kas', initialBalance: 0 }], ${extra} txns: [
    { id: 'a', date: '2026-09-03', type: 'keluar', desc: 'x', amount: 300000, accountId: 'k', category: 'Makan & minum' },
    { id: 'b', date: '2026-09-10', type: 'keluar', desc: 'y', amount: 150000, accountId: 'k', category: 'Transportasi' },
    { id: 'c', date: '2026-08-20', type: 'keluar', desc: 'lama', amount: 999999, accountId: 'k', category: 'Makan & minum' },
    { id: 'd', date: '2026-09-11', type: 'masuk', desc: 'gaji', amount: 5000000, accountId: 'k', category: 'Gaji' } ] }`;
  const P = (extra, day, dim) => run(sb, `computeMonthProjection(${D(extra)}, '2026-09', ${day}, ${dim})`);
  test('rata-rata harian x jumlah hari: 450.000 di hari ke-15 dari 30 = 900.000', () => { const r = P('', 15, 30); eq(r.projected, 900000); eq(r.spent, 450000); eq(r.remaining, 15); eq(r.rough, false); eq(r.budget, null); });
  test('awal bulan ditandai perkiraan kasar', () => eq(P('', 3, 30).rough, true));
  test('tanpa pengeluaran bulan ini: null (pemasukan dan bulan lain diabaikan)', () => eq(run(sb, "computeMonthProjection({ accounts: [], txns: [{ id: 'z', date: '2026-09-02', type: 'masuk', desc: 'g', amount: 5, accountId: 'k' }, { id: 'y', date: '2026-08-02', type: 'keluar', desc: 'l', amount: 5, accountId: 'k' }] }, '2026-09', 15, 30)"), null));
  test('hari tidak valid: null', () => { eq(P('', 0, 30), null); eq(P('', 31, 30), null); });
  test('anggaran: hanya kategori beranggaran yang dibandingkan; lebih dari batas = over', () => {
    const r = P("budgets: { 'Makan & minum': 500000 },", 15, 30);
    eq(r.budget.limit, 500000); eq(r.budget.spent, 300000); eq(r.budget.projected, 600000); eq(r.budget.diff, 100000); eq(r.budget.status, 'over');
  });
  test('anggaran: di bawah batas = ok atau warn menurut ambang 80%', () => {
    eq(P("budgets: { 'Makan & minum': 1000000 },", 15, 30).budget.status, 'ok');
    eq(P("budgets: { 'Makan & minum': 700000 },", 15, 30).budget.status, 'warn');
  });
}

console.log('tren utang satu lintasan (R9)');
{
  const { sb } = makeSandbox(NOW);
  // Referensi: cara lama (accountBalanceAsOf per akun per bulan).
  run(sb, `function oldDebtTrend(data, today) {
    const [y, m] = today.split('-').map(Number); const p2 = n => String(n).padStart(2, '0');
    const debtAccs = data.accounts.filter(a => TYPE_DEBT[a.type]); const out = [];
    for (let i = DEBT_TREND_MONTHS - 1; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1); const key = d.getFullYear() + '-' + p2(d.getMonth() + 1);
      const date = i === 0 ? today : key + '-' + p2(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate());
      let total = 0; debtAccs.forEach(a => { const bal = accountBalanceAsOf(data, a.id, date); if (bal < 0) total += -bal; });
      out.push({ key, date, total: roundMoney(total) });
    } return out; }`);
  test('identik dengan cara lama pada 300 data acak (kartu, pinjaman, kas, transfer, saldo awal, kelebihan bayar)', () => {
    run(sb, `var __seed = 12345; function __rnd() { __seed = (__seed * 1103515245 + 12345) % 2147483648; return __seed / 2147483648; }
      function __mk() {
        const types = ['kartu_kredit', 'paylater', 'pinjaman', 'kas', 'bank'];
        const accs = []; for (let i = 0; i < 6; i++) accs.push({ id: 'a' + i, name: 'A' + i, type: types[Math.floor(__rnd() * types.length)], initialBalance: Math.round((__rnd() - 0.7) * 1000000) });
        const txns = []; for (let i = 0; i < 300; i++) {
          const mo = 1 + Math.floor(__rnd() * 9), dy = 1 + Math.floor(__rnd() * 28), r = __rnd(), a = accs[Math.floor(__rnd() * 6)], b = accs[Math.floor(__rnd() * 6)];
          txns.push({ id: 't' + i, date: '2026-' + String(mo).padStart(2, '0') + '-' + String(dy).padStart(2, '0'), type: r < 0.4 ? 'keluar' : (r < 0.7 ? 'masuk' : 'transfer'), amount: Math.round(__rnd() * 500000) + 1, accountId: a.id, toAccountId: b.id, desc: 'x' });
        } return { accounts: accs, txns }; }
      var __bad = 0; for (let k = 0; k < 300; k++) { const d = __mk(); if (JSON.stringify(computeDebtTrend(d, '2026-09-15')) !== JSON.stringify(oldDebtTrend(d, '2026-09-15'))) __bad++; }`);
    eq(run(sb, '__bad'), 0);
  });
  test('tanpa akun utang dan tanpa transaksi: semua nol, 6 bulan', () => {
    const r = run(sb, "computeDebtTrend({ accounts: [], txns: [] }, '2026-09-15')");
    eq(r.length, 6); eq(r.every(x => x.total === 0), true);
  });
  test('transaksi bertanggal setelah akhir bulan tidak ikut bulan itu', () => {
    const r = run(sb, "computeDebtTrend({ accounts: [{ id: 'c', name: 'C', type: 'kartu_kredit', initialBalance: 0 }], txns: [{ id: 't', date: '2026-08-10', type: 'keluar', amount: 1000, accountId: 'c', desc: 'x' }] }, '2026-09-15')");
    eq(r.map(x => x.total), [0, 0, 0, 0, 1000, 1000]);
  });
}

console.log('definisi utang tab Akun (A1a)');
{
  const { sb } = makeSandbox(NOW);
  const mk = `({ accounts: [
      { id: 'k', name: 'Kas', type: 'kas', initialBalance: 5000000 },
      { id: 'c', name: 'Kartu', type: 'kartu_kredit', initialBalance: 0 },
      { id: 'p', name: 'Pinjaman', type: 'pinjaman', initialBalance: -10000000, originalPrincipal: 10000000, loanRatePercent: 1, loanRateUnit: 'bulan', loanInterestType: 'flat', loanTenorMonths: 10, loanStartDate: '2026-09-01' } ],
    txns: [
      { id: 't1', date: '2026-09-02', type: 'keluar', amount: 700000, accountId: 'c', desc: 'belanja' } ] })`;
  test('loanDebtParts: pokok dari saldo buku, bunga terpisah', () => {
    sb.__d = run(sb, mk);
    const r = run(sb, "(() => { const b = computeAllBalances(__d); const acc = __d.accounts[2]; return { bal: b.p, parts: loanDebtParts(__d, acc, b.p) }; })()");
    eq(r.parts.pokok, Math.max(0, -r.bal), 'pokok = -saldo buku');
    eq(r.parts.pokok, 10000000, 'pokok Rp10 juta');
    eq(r.parts.bunga, 1000000, 'bunga tetap 1%/bln x 10 bln = Rp1 juta');
  });
  test('loanDebtParts: akun non-pinjaman mengembalikan null', () => {
    eq(run(sb, "loanDebtParts(__d, __d.accounts[1], -700000)"), null);
  });
  test('loanBungaNote: kosong kalau lunas atau tanpa bunga, terisi kalau ada bunga terjadwal', () => {
    eq(run(sb, "loanBungaNote({ pokok: 0, bunga: 500 })"), '');
    eq(run(sb, "loanBungaNote({ pokok: 1000, bunga: 0 })"), '');
    eq(run(sb, "loanBungaNote(null)"), '');
    ok(/bunga terjadwal/.test(run(sb, "loanBungaNote({ pokok: 1000, bunga: 500 })")));
  });
  test('header Total utang = jumlah pokok semua akun utang (kartu + pinjaman), bukan pokok + bunga', () => {
    const r = run(sb, "(() => { const b = computeAllBalances(__d); const ad = computeAssetDebt(__d, b); let sum = 0; __d.accounts.forEach(a => { if (a.type === 'kartu_kredit') sum += Math.max(0, -b[a.id]); const p = loanDebtParts(__d, a, b[a.id]); if (p) sum += p.pokok; }); return { utang: ad.utang, sum }; })()");
    eq(r.utang, r.sum);
  });
}

console.log('teks kartu dan detail akun satu fungsi (A2)');
{
  const { sb } = makeSandbox(NOW);
  run(sb, "var feeAdminMetaText = function () { return ''; };");
  sb.__d = run(sb, `({ accounts: [
      { id: 'k', name: 'Kas', type: 'kas', initialBalance: 5000000 },
      { id: 'c', name: 'Kartu', type: 'kartu_kredit', initialBalance: 0, limit: 5000000 },
      { id: 'p', name: 'Pinjaman', type: 'pinjaman', initialBalance: -10000000, originalPrincipal: 10000000, loanRatePercent: 1, loanRateUnit: 'bulan', loanInterestType: 'flat', loanTenorMonths: 10, loanStartDate: '2026-09-01' },
      { id: 'o', name: 'Pinjol', type: 'pinjaman_online', initialBalance: -2000000, originalPrincipal: 2000000, loanInstallment: 250000, loanTenorMonths: 10, loanStartDate: '2026-09-01' },
      { id: 't', name: 'Titipan', type: 'titipan', initialBalance: 0 } ],
    txns: [{ id: 't1', date: '2026-09-02', type: 'keluar', amount: 700000, accountId: 'c', desc: 'x' }] })`);
  const info = (id, detail) => { sb.__id = id; sb.__det = detail; return run(sb, "(() => { const b = computeAllBalances(__d); const a = __d.accounts.find(x => x.id === __id); return accountDisplayInfo(__d, a, b[a.id], { detail: __det }); })()"); };
  test('pinjaman: nilai = sisa pokok, sortVal/groupVal = pokok, bunga hanya keterangan', () => {
    const r = info('p', false);
    eq(r.valueText, 'Sisa pokok Rp10.000.000'); eq(r.sortVal, 10000000); eq(r.groupVal, 10000000);
    ok(/\+ bunga terjadwal Rp1\.000\.000/.test(r.metaExtra)); ok(!/total sampai lunas/.test(r.metaExtra), 'kartu tanpa total sampai lunas');
  });
  test('detail pinjaman menambah "total sampai lunas", kartu tidak', () => {
    ok(/total sampai lunas Rp11\.000\.000/.test(info('p', true).metaExtra));
  });
  test('kartu punya Terbayar/Angsuran dan bar; detail tidak (jadwal dirender terpisah di detail)', () => {
    const k = info('p', false), d = info('p', true);
    ok(/Terbayar 0%/.test(k.metaExtra) && /Angsuran 0\/10/.test(k.metaExtra)); ok(k.bar && k.bar.color === '--green');
    ok(!/Terbayar/.test(d.metaExtra) && !/Angsuran/.test(d.metaExtra)); eq(d.bar, null);
  });
  test('bunga efektif pinjol hanya di detail', () => {
    ok(/bunga efektif/.test(info('o', true).metaExtra)); ok(!/bunga efektif/.test(info('o', false).metaExtra));
  });
  test('kartu kredit: Terpakai, sisa limit, bar pemakaian limit, bisa dibayar', () => {
    const r = info('c', false);
    eq(r.valueText, 'Terpakai Rp700.000'); ok(/Sisa limit Rp4\.300\.000/.test(r.metaExtra)); eq(r.pct, 14); eq(r.bar.pct, 14); eq(r.canPay, true);
  });
  test('kas dan titipan lunas', () => {
    eq(info('k', false).valueText, 'Rp5.000.000'); eq(info('t', false).valueText, 'Lunas'); eq(info('t', false).sortVal, 0);
  });
  test('header Total utang = jumlah groupVal semua akun utang (kartu, pinjaman, pinjol)', () => {
    const r = run(sb, "(() => { const b = computeAllBalances(__d); const ad = computeAssetDebt(__d, b); let s = 0; __d.accounts.forEach(a => { if (TYPE_DEBT[a.type]) s += accountDisplayInfo(__d, a, b[a.id]).groupVal; }); return { u: ad.utang, s }; })()");
    eq(r.u, r.s); eq(r.u, 12700000);
  });
}

console.log('kartu akun dua baris prioritas (A3)');
{
  const { sb } = makeSandbox(NOW);   // 15 Sep 2026
  run(sb, "var feeAdminMetaText = function () { return ''; };");
  sb.__d = run(sb, `({ accounts: [
      { id: 'k', name: 'Kas', type: 'kas', initialBalance: 5000000 },
      { id: 'c', name: 'Kartu', type: 'kartu_kredit', initialBalance: 0, limit: 5000000, cardStatementDay: 1, feeDay: 20 },
      { id: 'c0', name: 'Kartu kosong', type: 'kartu_kredit', initialBalance: 0, limit: 5000000 },
      { id: 'pt', name: 'Pinjaman telat', type: 'pinjaman', initialBalance: -10000000, originalPrincipal: 10000000, loanRatePercent: 1, loanRateUnit: 'bulan', loanInterestType: 'flat', loanTenorMonths: 10, loanStartDate: '2026-06-01' },
      { id: 'pb', name: 'Pinjaman baru', type: 'pinjaman', initialBalance: -10000000, originalPrincipal: 10000000, loanRatePercent: 1, loanRateUnit: 'bulan', loanInterestType: 'flat', loanTenorMonths: 10, loanStartDate: '2026-08-20' },
      { id: 'pl', name: 'PayLater', type: 'paylater', initialBalance: -950000, limit: 1000000, feeDay: 25 } ],
    txns: [{ id: 't1', date: '2026-08-25', type: 'keluar', amount: 700000, accountId: 'c', desc: 'x' }] })`);
  const L = id => { sb.__id = id; return run(sb, "(() => { const b = computeAllBalances(__d); const a = __d.accounts.find(x => x.id === __id); return accountDisplayInfo(__d, a, b[a.id]).lines; })()"); };
  test('semua jenis akun: maksimal 2 baris', () => { ['k', 'c', 'c0', 'pt', 'pb', 'pl'].forEach(id => ok(L(id).length <= 2, id)); });
  test('kartu kredit: sisa tagihan cetak + jatuh tempo (5 hari lagi = warn), lalu limit', () => {
    const r = L('c');
    ok(/Sisa tagihan cetak Rp700\.000 · jatuh tempo .* \(5 hari lagi\)/.test(r[0].text), r[0].text); eq(r[0].tone, 'warn');
    ok(/Limit terpakai 14% · sisa Rp4\.300\.000/.test(r[1].text)); eq(r[1].tone, '');
  });
  test('kartu kredit tanpa pemakaian: "Tidak ada tagihan"', () => { eq(L('c0')[0].text, 'Tidak ada tagihan'); });
  test('pinjaman telat: baris merah diawali ▲ dengan jumlah hari', () => {
    const r = L('pt');
    ok(/^▲ Telat \d+ hari · Angsuran ke-1 /.test(r[0].text), r[0].text); eq(r[0].tone, 'late');
    ok(/Terbayar 0% · angsuran 0\/10 · \+ bunga terjadwal Rp1\.000\.000/.test(r[1].text), r[1].text);
  });
  test('pinjaman belum jatuh tempo: angsuran berikutnya + tanggal, tanpa ▲', () => {
    const r = L('pb'); ok(!/▲/.test(r[0].text)); eq(r[0].tone, 'warn'); ok(/\(5 hari lagi\)/.test(r[0].text), r[0].text);
  });
  test('PayLater limit >= 90%: ▲ merah, baris kedua jatuh tempo', () => {
    const r = L('pl'); ok(/^▲ Limit terpakai 95%/.test(r[0].text), r[0].text); eq(r[0].tone, 'late'); ok(/Jatuh tempo tgl 25/.test(r[1].text));
  });
  test('kas: satu baris keterangan atau kosong', () => { ok(L('k').length <= 1); });
}

console.log('ringkasan atas tab Akun dan aksi cepat (A5, A6)');
{
  const { sb } = makeSandbox(NOW);
  run(sb, "var feeAdminMetaText = function () { return ''; };");
  sb.__d = run(sb, `({ accounts: [
      { id: 'k', name: 'Kas', type: 'kas', initialBalance: 5000000 },
      { id: 'a', name: 'Emas', type: 'aset', initialBalance: 1000000 },
      { id: 'c', name: 'Kartu', type: 'kartu_kredit', initialBalance: 0, limit: 5000000 },
      { id: 'pl', name: 'PayLater', type: 'paylater', initialBalance: -950000, limit: 1000000 },
      { id: 'cn', name: 'Kartu tanpa limit', type: 'kartu_kredit', initialBalance: -100000 },
      { id: 'p', name: 'Pinjaman', type: 'pinjaman', initialBalance: -10000000, originalPrincipal: 10000000, loanTenorMonths: 10, loanStartDate: '2026-09-01' },
      { id: 'tt', name: 'Titipan', type: 'titipan', initialBalance: 0 } ],
    txns: [{ id: 't1', date: '2026-08-25', type: 'keluar', amount: 700000, accountId: 'c', desc: 'x' }] })`);
  test('computeLimitUsage: kartu + PayLater berlimit; kartu tanpa limit tidak ikut', () => {
    const r = run(sb, "computeLimitUsage(__d, computeAllBalances(__d))");
    eq(r.limit, 6000000); eq(r.used, 700000 + 950000); eq(r.count, 2); eq(r.pct, 28);
  });
  test('computeLimitUsage: tanpa akun berlimit = null', () => {
    eq(run(sb, "computeLimitUsage({ accounts: [{ id: 'k', type: 'kas', initialBalance: 1 }], txns: [] }, { k: 1 })"), null);
  });
  test('computeLimitUsage: pct >= 90 untuk PayLater hampir penuh', () => {
    eq(run(sb, "computeLimitUsage({ accounts: [__d.accounts[3]], txns: [] }, { pl: -950000 })").pct, 95);
  });
  test('accountQuickActions: kas boleh keduanya; aset hanya transfer; kartu/pinjaman hanya catat; titipan tidak ada', () => {
    const q = id => run(sb, "accountQuickActions(__d.accounts.find(x => x.id === '" + id + "'))");
    eq(q('k'), { catat: true, transfer: true }); eq(q('a'), { catat: false, transfer: true });
    eq(q('c'), { catat: true, transfer: false }); eq(q('p'), { catat: true, transfer: false }); eq(q('tt'), { catat: false, transfer: false });
  });
  test('tombol Bayar di kartu: kartu kredit terpakai, PayLater, pinjaman; tidak untuk kas', () => {
    const d = id => { sb.__id = id; return run(sb, "(() => { const b = computeAllBalances(__d); const a = __d.accounts.find(x => x.id === __id); const i = accountDisplayInfo(__d, a, b[a.id]); return { canPay: i.canPay, label: i.payLabel, act: i.payAct }; })()"); };
    eq(d('c').canPay, true); eq(d('c').act, 'payCardFromDetail'); eq(d('cn').canPay, true); eq(d('cn').act, 'payCardFromDetail'); eq(d('cn').label, 'Bayar tagihan');
    eq(d('pl').canPay, true); eq(d('pl').act, 'payDueFromRingkasan');
    eq(d('p').canPay, true); eq(d('p').label, 'Bayar angsuran'); eq(d('k').canPay, false);
  });
}

// ---- Keamanan v1.1.079 ----
section_keamanan();
function section_keamanan() {
  console.log('\nkeamanan: escape atribut, CSP, loader SRI (v1.1.079)');
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  const jsFiles = listAppJs();
  test('semua atribut data-aN dari template di-escape (tidak ada ${...} mentah)', () => {
    const bad = [];
    for (const f of jsFiles) for (const m of rd(f).matchAll(/data-a\d="\$\{(?!escapeHtml\()[^}]*\}"/g)) bad.push(f + ': ' + m[0]);
    eq(bad, [], 'masih ada atribut mentah');
  });
  test('index.html punya CSP tanpa unsafe-eval, object-src none, dan hanya origin yang dibutuhkan', () => {
    const h = rd('index.html'); const m = h.match(/http-equiv="Content-Security-Policy" content="([^"]*)"/);
    ok(m, 'CSP tidak ada'); const c = m[1];
    ok(!/unsafe-eval/.test(c), 'unsafe-eval'); ok(/object-src 'none'/.test(c)); ok(/base-uri 'self'/.test(c));
    ok(/connect-src[^;]*https:\/\/\*\.supabase\.co/.test(c), 'connect-src supabase');
    ok(/script-src 'self' https:\/\/cdn\.jsdelivr\.net(;|$)/.test(c), 'script-src');
  });
  test('index.html tidak punya <script> inline maupun handler on*= (CSP script-src tanpa unsafe-inline)', () => {
    const h = rd('index.html');
    ok(!/<script(?![^>]*\ssrc=)[^>]*>/.test(h), 'script inline'); ok(!/\son(click|load|change|input|keydown|submit)=/.test(h), 'handler inline');
  });
  test('loader supabase: SRI hanya dipasang bila hash diisi; hash berformat sha384 bila ada', () => {
    const s = rd('src/js/features/data/sync.js');
    ok(/if \(SUPABASE_JS_SRI\) \{ s\.integrity = SUPABASE_JS_SRI; s\.crossOrigin = 'anonymous'; \}/.test(s), 'integrity tidak dipasang');
    const m = s.match(/const SUPABASE_JS_SRI = '([^']*)';/); ok(m, 'konstanta tidak ada');
    ok(m[1] === '' || /^sha384-[A-Za-z0-9+/]{64}$/.test(m[1]), 'format SRI salah');
    const v = s.match(/const SUPABASE_JS_VERSION = '([^']*)';/)[1];
    ok(m[1] === '' ? v === '2' : /^\d+\.\d+\.\d+$/.test(v), 'versi harus persis bila SRI diisi');
  });
}

console.log('arsip akun (A4, v1.1.080)');
{
  const mk = (extra) => {
    const { sb } = makeSandbox(NOW);
    run(sb, `var K = { accounts: [
      { id: 'kas1', name: 'Kas', type: 'kas', initialBalance: 0 },
      { id: 'kas2', name: 'Kas lama', type: 'kas', initialBalance: 0 },
      { id: 'bank1', name: 'Bank', type: 'bank', initialBalance: 1000000 },
      { id: 'kk1', name: 'Kartu', type: 'kartu_kredit', initialBalance: 0, limit: 5000000, feeAmount: 50000, feeDay: 10, feePeriod: 'bulanan', lastFeeAppliedMonth: '2026-07' },
      { id: 'tt1', name: 'Budi', type: 'titipan', initialBalance: 0 } ],
      txns: [ { id: 'a1', date: '2026-07-05', type: 'masuk', desc: 'gaji', amount: 100000, accountId: 'kas2' }, { id: 'a2', date: '2026-07-06', type: 'keluar', desc: 'beli', amount: 100000, accountId: 'kas2' } ],
      subscriptions: [] }; ${extra || ''}`);
    return sb;
  };
  const why = (sb, id) => run(sb, `archiveBlockReason(K, K.accounts.find(a => a.id === '${id}'))`);
  test('akun bersaldo 0 boleh diarsipkan (riwayat transaksi tidak menghalangi)', () => eq(why(mk(), 'kas2'), ''));
  test('akun bersaldo tidak boleh diarsipkan', () => ok(/Rp0/.test(why(mk(), 'bank1')), why(mk(), 'bank1')));
  test('titipan tidak boleh diarsipkan', () => ok(/titipan/i.test(why(mk(), 'tt1'))));
  test('kartu kredit yang masih ada tagihan tidak boleh; yang sudah 0 boleh', () => {
    const sb = mk(`K.txns.push({ id: 'k1', date: '2026-08-01', type: 'keluar', desc: 'belanja', amount: 300000, accountId: 'kk1' });`);
    ok(/utang/i.test(why(sb, 'kk1')), why(sb, 'kk1'));
    eq(why(mk(), 'kk1'), '');
  });
  test('langganan aktif pada akun menghalangi arsip; langganan nonaktif tidak', () => {
    eq(/langganan/i.test(why(mk(`K.subscriptions.push({ id:'s1', name:'Netflix', amount:50000, accountId:'kas2', day:5, active:true });`), 'kas2')), true);
    eq(why(mk(`K.subscriptions.push({ id:'s1', name:'Netflix', amount:50000, accountId:'kas2', day:5, active:false });`), 'kas2'), '');
  });
  test('pinjaman bertenor: lunas (pokok 0) boleh diarsipkan; masih ada sisa pokok tidak boleh', () => {
    const sb = mk(`K.accounts.push({ id: 'pj1', name: 'Pinjaman', type: 'pinjaman', initialBalance: 0, originalPrincipal: 10000000, loanRatePercent: 1, loanRateUnit: 'bulan', loanInterestType: 'flat', loanTenorMonths: 10, loanStartDate: '2026-06-01' });
      K.accounts.push({ id: 'pj2', name: 'Pinjaman aktif', type: 'pinjaman', initialBalance: -5000000, originalPrincipal: 10000000, loanRatePercent: 1, loanRateUnit: 'bulan', loanInterestType: 'flat', loanTenorMonths: 10, loanStartDate: '2026-06-01' });`);
    eq(why(sb, 'pj1'), ''); ok(/utang/i.test(why(sb, 'pj2')), why(sb, 'pj2'));
  });
  test('tidak boleh mengarsipkan akun aktif terakhir', () => {
    const sb = mk(`K.accounts = [K.accounts[0], K.accounts[4]]; `);
    ok(/minimal satu/.test(why(sb, 'kas1')), why(sb, 'kas1'));
  });
  test('activeAccounts menyaring akun arsip; akun arsip tidak punya aksi cepat', () => {
    const sb = mk(`K.accounts[1].archived = true;`);
    eq(run(sb, `activeAccounts(K).map(a => a.id)`), ['kas1', 'bank1', 'kk1', 'tt1']);
    eq(run(sb, `accountQuickActions(K.accounts[1])`), { catat: false, transfer: false });
  });
  test('biaya bulanan tidak dikenakan pada kartu yang diarsipkan', () => {
    const sb = mk(`K.accounts[3].archived = true; applyRecurringFees(K);`);
    eq(run(sb, `K.txns.filter(t => t.id.indexOf('fee-') === 0).length`), 0);
    const sb2 = mk(`applyRecurringFees(K);`);
    ok(run(sb2, `K.txns.filter(t => t.id.indexOf('fee-') === 0).length`) > 0, 'kontrol: kartu aktif tetap kena biaya');
  });
  test('impor mempertahankan archived: true dan mengabaikan nilai lain', () => {
    const sb = mk();
    eq(run(sb, `buildAccountFromImport({ name: 'X', type: 'kas', initialBalance: 0, archived: true }, 'n1').archived`), true);
    eq(run(sb, `'archived' in buildAccountFromImport({ name: 'X', type: 'kas', initialBalance: 0, archived: 'ya' }, 'n2')`), false);
    eq(run(sb, `'archived' in buildAccountFromImport({ name: 'X', type: 'kas', initialBalance: 0 }, 'n3')`), false);
  });
  test('limit kartu yang diarsipkan tidak ikut Limit kartu terpakai', () => {
    const sb = mk(`K.accounts[3].archived = true;`);
    eq(run(sb, `computeLimitUsage(K, computeAllBalances(K))`), null);
    ok(run(sb, `(K.accounts[3].archived = false, computeLimitUsage(K, computeAllBalances(K)))`) !== null, 'kontrol: kartu aktif ikut');
  });
  test('saldo historis tetap utuh setelah diarsipkan', () => {
    const sb = mk();
    const before = run(sb, `JSON.stringify(computeAllBalances(K))`);
    run(sb, `K.accounts[1].archived = true;`);
    eq(run(sb, `JSON.stringify(computeAllBalances(K))`), before);
  });
}

console.log('kartu grafik tunggal (v1.1.081)');
{
  const css = fs.readFileSync(path.join(root, 'src/css/app.css'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  test('#chart-group berbingkai kartu dan kartu di dalamnya tanpa bingkai sendiri', () => {
    ok(/#chart-group \{[^}]*border: 1px solid var\(--line\)/.test(css), 'bingkai grup');
    ok(/#tab-ringkasan #chart-group > \.chart-card \{[^}]*border: 0[^}]*margin: 0 !important/.test(css), 'kartu dalam tanpa bingkai');
  });
  test('selector grafik dan semua kartu grafik berada di dalam #chart-group', () => {
    const g = html.slice(html.indexOf('<div id="chart-group">'));
    const inner = g.slice(0, g.indexOf('<div class="tab-panel" id="tab-akun">'));
    ['chart-period-card', 'networth-chart-card', 'cashflow-chart-card', 'category-chart-card', 'trend-chart-card', 'debt-trend-card'].forEach(id => ok(inner.indexOf('id="' + id + '"') > 0, id + ' di luar grup'));
  });
}

console.log('cari akun + chip filter (A7, v1.1.082)');
{
  const { sb } = makeSandbox(NOW);
  run(sb, `var A = [
    { acc: { id: 'k', name: 'Dompet Harian', type: 'kas' }, groupVal: 500000, isDebt: false },
    { acc: { id: 'b', name: 'BCA Tabungan', type: 'bank' }, groupVal: 0, isDebt: false },
    { acc: { id: 'kk', name: 'Kartu BCA', type: 'kartu_kredit' }, groupVal: 700000, isDebt: true },
    { acc: { id: 'kl', name: 'Kartu Lama', type: 'kartu_kredit' }, groupVal: 0, isDebt: true },
    { acc: { id: 'p', name: 'KUR BRI', type: 'pinjaman', archived: true }, groupVal: 0, isDebt: true },
    { acc: { id: 't0', name: 'Budi', type: 'titipan' }, groupVal: 0, isDebt: false },
    { acc: { id: 't1', name: 'Sinta', type: 'titipan' }, groupVal: 50000, isDebt: false } ];
    var F = (f, q) => A.filter(it => accountFilterMatch(it.acc, it.groupVal, it.isDebt, f, q || '')).map(it => it.acc.id);`);
  test('Semua: semua akun (aktif dan arsip)', () => eq(run(sb, `F('all')`), ['k', 'b', 'kk', 'kl', 'p', 't0', 't1']));
  test('Ada tagihan: hanya akun utang yang masih ada sisa', () => eq(run(sb, `F('tagihan')`), ['kk']));
  test('Lunas: akun utang lunas (bukan arsip) dan titipan bersaldo 0', () => eq(run(sb, `F('lunas')`), ['kl', 't0']));
  test('Diarsipkan: hanya akun arsip', () => eq(run(sb, `F('arsip')`), ['p']));
  test('pencarian cocok ke nama, tanpa membedakan huruf besar/kecil', () => eq(run(sb, `F('all', 'bca')`), ['b', 'kk']));
  test('pencarian juga cocok ke jenis akun', () => eq(run(sb, `F('all', 'kartu kredit')`), ['kk', 'kl']));
  test('pencarian digabung dengan filter', () => { eq(run(sb, `F('tagihan', 'bca')`), ['kk']); eq(run(sb, `F('lunas', 'bca')`), []); });
  test('accountFilterCounts: jumlah per chip, Semua tidak menghitung arsip', () => eq(run(sb, `accountFilterCounts(A)`), { all: 6, tagihan: 1, lunas: 2, arsip: 1 }));
}

console.log('sematkan dan urutkan manual (A8, v1.1.083)');
{
  const { sb } = makeSandbox(NOW);
  run(sb, `var G = [ { acc: { id: 'a', type: 'kas' }, sortVal: 100 }, { acc: { id: 'b', type: 'kas' }, sortVal: 300 }, { acc: { id: 'c', type: 'kas' }, sortVal: 200 } ];
    var ids = L => sortAccountGroup(G, L).map(it => it.acc.id);`);
  test('tanpa tata letak: urutan bawaan (nilai terbesar dulu)', () => eq(run(sb, `ids({})`), ['b', 'c', 'a']));
  test('akun tersemat di puncak kelompok', () => eq(run(sb, `ids({ pins: ['a'] })`), ['a', 'b', 'c']));
  test('urutan manual dipakai; akun yang belum tercatat mengikuti setelahnya', () => {
    eq(run(sb, `ids({ order: { kas: ['a', 'c', 'b'] } })`), ['a', 'c', 'b']);
    eq(run(sb, `ids({ order: { kas: ['c'] } })`), ['c', 'b', 'a']);
  });
  test('tersemat mengalahkan urutan manual', () => eq(run(sb, `ids({ pins: ['b'], order: { kas: ['a', 'c', 'b'] } })`), ['b', 'a', 'c']));
  test('moveAccountInGroup: geser turun dan naik, dan tidak mengubah layout lama', () => {
    eq(run(sb, `moveAccountInGroup({}, 'kas', ['b', 'c', 'a'], 'b', 1).order.kas`), ['c', 'b', 'a']);
    eq(run(sb, `moveAccountInGroup({}, 'kas', ['b', 'c', 'a'], 'a', -1).order.kas`), ['b', 'a', 'c']);
    eq(run(sb, `(function () { var l = { pins: [], order: {} }; moveAccountInGroup(l, 'kas', ['b', 'c'], 'b', 1); return l.order; })()`), {});
  });
  test('moveAccountInGroup: di ujung daftar atau melewati batas tersemat tidak menukar', () => {
    eq(run(sb, `moveAccountInGroup({}, 'kas', ['b', 'c', 'a'], 'b', -1).order.kas`), ['b', 'c', 'a']);
    eq(run(sb, `moveAccountInGroup({ pins: ['b'] }, 'kas', ['b', 'c', 'a'], 'b', 1).order.kas`), ['b', 'c', 'a']);
  });
  test('toggleAccountPin menyematkan dan melepas', () => {
    eq(run(sb, `toggleAccountPin({ pins: [] }, 'x').pins`), ['x']);
    eq(run(sb, `toggleAccountPin({ pins: ['x'] }, 'x').pins`), []);
  });
  test('cleanAccountLayout membuang id yang tak ada dan data tak valid', () => {
    eq(run(sb, `cleanAccountLayout({ pins: ['a', 'zzz', 5], order: { kas: ['b', 'zzz'], bank: 'x' } }, { accounts: [{ id: 'a' }, { id: 'b' }] })`), { pins: ['a'], order: { kas: ['b'] } });
    eq(run(sb, `cleanAccountLayout('rusak', { accounts: [] })`), { pins: [], order: {} });
  });
}

console.log('pesan galat form akun dan toast (A9a, v1.1.084)');
{
  const src = f => fs.readFileSync(path.join(root, f), 'utf8');
  test('showIoMsg: target tidak terlihat -> toast (galat), target terlihat -> teks inline tanpa toast', () => {
    const { sb } = makeSandbox(NOW);
    run(sb, `var made = []; document.createElement = () => { const e = { style: {}, classList: { add() {}, remove() {} }, setAttribute() {}, appendChild() {} }; made.push(e); return e; };
      showIoMsg('Galat uji', 'error', 'tidak-ada');`);
    eq(run(sb, `made.length`), 1); eq(run(sb, `made[0].textContent`), 'Galat uji'); ok(/error/.test(run(sb, `made[0].className`)), 'kelas error');
    run(sb, `var vis = { offsetParent: {}, textContent: '', className: '' }; document.getElementById = () => vis; made.length = 0; showIoMsg('Berhasil', 'ok', 'x');`);
    eq(run(sb, `vis.textContent`), 'Berhasil'); eq(run(sb, `made.length`), 0, 'tidak boleh ada toast');
  });
  test('showIoMsg dengan teks kosong hanya membersihkan, tanpa toast', () => {
    const { sb } = makeSandbox(NOW);
    run(sb, `var made = []; document.createElement = () => { const e = { style: {}, classList: { add() {}, remove() {} }, setAttribute() {}, appendChild() {} }; made.push(e); return e; }; showIoMsg('', '', 'tidak-ada');`);
    eq(run(sb, `made.length`), 0);
  });
  test('validasi saveAccount tidak lagi memakai showIoMsg bawaan (#io-msg tab lain); nama kosong punya pesan', () => {
    const s = src('src/js/features/akun/akun.js'); const a = s.indexOf('function saveAccount()'), b = s.indexOf('const initialBalance = isDebt');
    const blk = s.slice(a, b);
    ok(a > 0 && b > a, 'blok tidak ketemu'); ok(!/showIoMsg\((?!'', '', 'acc-form-msg')/.test(blk), 'masih ada showIoMsg bawaan di saveAccount');
    ok(/if \(!name\) \{[^}]*accFormMsg\(/.test(blk), 'nama kosong tanpa pesan');
  });
  test('index.html punya #acc-form-msg di dalam sheet #acc-form', () => {
    const h = src('index.html'); const a = h.indexOf('id="acc-form"'), m = h.indexOf('id="acc-form-msg"');
    ok(m > a && m < h.indexOf('id="acc-submit-btn"'), 'posisi pesan');
  });
}

console.log('label tampak form akun (A9b, v1.1.085)');
{
  const src = f => fs.readFileSync(path.join(root, f), 'utf8');
  test('form akun: Nama, Jenis, Saldo punya label tampak yang terhubung (for)', () => {
    const h = src('index.html');
    for (const id of ['acc-name-input', 'acc-type-input', 'acc-balance-input']) ok(h.includes('<label class="field-label"') && new RegExp('<label[^>]*for="' + id + '"').test(h), 'label ' + id);
  });
  test('Saldo awal tepat setelah Jenis akun, sebelum baris khusus jenis', () => {
    const h = src('index.html'); const t = h.indexOf('id="acc-type-input"'), b = h.indexOf('id="acc-balance-row"');
    ok(b > t && b < h.indexOf('id="acc-limit-row"'), 'urutan'); ok(h.indexOf('id="acc-balance-input"') < h.indexOf('id="acc-limit-row"'), 'input saldo');
  });
  test('judul saldo disetel per jenis akun di updateAccFormFields', () => {
    const s = src('src/js/features/akun/akun.js');
    for (const t of ['Sisa pokok sekarang', 'Sudah terpakai saat ini', 'Nilai awal / harga beli', "'Saldo awal'"]) ok(s.includes(t), t);
    ok(s.includes("$('acc-balance-label').textContent"), 'set label');
  });
}

console.log('pinjaman: isian opsional terlipat (A9c, v1.1.086)');
{
  const src = f => fs.readFileSync(path.join(root, f), 'utf8');
  test('isian opsional pinjaman berada di dalam <details id="acc-loan-more">; isian inti di luar', () => {
    const h = src('index.html'); const a = h.indexOf('<details id="acc-loan-more"'), b = h.indexOf('</details>', a);
    ok(a > 0 && b > a, 'details'); const blk = h.slice(a, b);
    for (const id of ['acc-loan-admin-input', 'acc-loan-stamp-input', 'acc-loan-savings-input', 'acc-loan-latefee-input', 'acc-loan-latefee-cap-input', 'acc-loan-insurance-input', 'acc-loan-admin-pct-input']) ok(blk.includes('id="' + id + '"'), id + ' harus di dalam');
    for (const id of ['acc-loan-tenor-input', 'acc-loan-start-input', 'acc-loan-installment-input', 'acc-loan-rate-input']) ok(!blk.includes('id="' + id + '"'), id + ' harus di luar');
  });
  test('semua id isian pinjaman masih ada tepat satu kali', () => {
    const h = src('index.html');
    for (const id of ['acc-loan-admin-input', 'acc-loan-stamp-input', 'acc-loan-savings-input', 'acc-loan-latefee-input', 'acc-loan-latefee-cap-input', 'acc-loan-tenor-input', 'acc-loan-start-input', 'acc-loan-dueday-input', 'acc-loan-installment-input', 'acc-loan-disburse-input']) eq(h.split('id="' + id + '"').length - 1, 1, id);
  });
  test('validasi membuka bagian terlipat sebelum fokus; sinkron dipanggil', () => {
    const s = src('src/js/features/akun/akun.js');
    ok(/openLoanMore\(\);\s*\$\('acc-loan-latefee-input'\)\.focus\(\)/.test(s), 'denda'); ok(/openLoanMore\(\);\s*loanAdminEl\.focus\(\)/.test(s), 'admin');
    ok(s.includes('syncLoanMore(true)') && s.includes('syncLoanMore(false)'), 'sinkron');
  });
}

console.log('sembunyi saldo di tab Akun (v1.1.088)');
{
  const src = f => fs.readFileSync(path.join(root, f), 'utf8');
  test('maskRpText mengganti semua nominal Rupiah, termasuk negatif, dan membiarkan teks lain', () => {
    const { sb } = makeSandbox(NOW);
    eq(run(sb, `maskRpText('Sisa tagihan cetak Rp700.000 · jatuh tempo 5 hari')`), 'Sisa tagihan cetak ••••••• · jatuh tempo 5 hari');
    eq(run(sb, `maskRpText('Limit terpakai 14% · sisa Rp4.300.000 dari Rp5.000.000')`), 'Limit terpakai 14% · sisa ••••••• dari •••••••');
    eq(run(sb, `maskRpText('-Rp1.500')`), '•••••••'); eq(run(sb, `maskRpText('Lunas')`), 'Lunas'); eq(run(sb, `maskRpText(null)`), '');
  });
  test('tab Akun memakai mode sembunyi: ringkasan, total kelompok, kartu; tombol mata merender ulang Akun', () => {
    const s = src('src/js/features/akun/render-akun-transaksi.js');
    ok(/state\.balanceHidden/.test(s) && /HIDDEN_RP/.test(s) && /maskRpText/.test(s), 'render akun');
    ok(/renderAccounts\(data, bal\)/.test(src('src/js/core/navigasi.js')), 'toggle render ulang');
  });
}

console.log('konsistensi versi dan impor/ekspor (Fase 3, v1.1.089)');
{
  const src = f => fs.readFileSync(path.join(root, f), 'utf8');
  test('versi konsisten: APP_VERSION, CACHE_VERSION sw.js, README, CHANGELOG.md teratas, riwayat tombol ?', () => {
    const v = /APP_VERSION = '(v[\d.]+)'/.exec(src('src/js/core/render-utama.js'))[1];
    eq(/CACHE_VERSION = 'kp-(v[\d.]+)'/.exec(src('sw.js'))[1], v, 'sw.js');
    eq(/Versi app: \*\*(v[\d.]+)\*\*/.exec(src('README.md'))[1], v, 'README');
    eq(/^## (v[\d.]+) /m.exec(src('CHANGELOG.md'))[1], v, 'CHANGELOG.md');
    eq(/CHANGELOG_ENTRIES = \[\s*\{ v: '(v[\d.]+)'/.exec(src('src/js/features/profil/changelog.js'))[1], v, 'src/js/features/profil/changelog.js');
  });
  const mk = () => makeSandbox(NOW).sb;
  test('isValidDateStr: tanggal nyata saja', () => {
    const sb = mk();
    eq(run(sb, `isValidDateStr('2026-02-28')`), true); eq(run(sb, `isValidDateStr('2028-02-29')`), true);
    for (const bad of ["'2026-02-30'", "'2026-13-01'", "'2026-1-1'", "'26-01-01'", '20260101', 'null', "''"]) eq(run(sb, `isValidDateStr(${bad})`), false, bad);
  });
  test('importFileTooBig: > 5 MB ditolak, ≤ 5 MB dan null lolos', () => {
    const sb = mk();
    eq(run(sb, `importFileTooBig({ size: 5 * 1024 * 1024 + 1 })`), true); eq(run(sb, `importFileTooBig({ size: 1024 })`), false); eq(run(sb, `importFileTooBig(null)`), false);
  });
  test('buildTxnFromImport: ID selalu baru, nominal non-negatif dan terbatas, tanggal tak valid jadi hari ini, akun tak dikenal jatuh ke akun cadangan', () => {
    const sb = mk();
    run(sb, `var T = buildTxnFromImport({ id: 'lama', date: '2026-02-30', type: 'keluar', desc: 'x', amount: -1500, accountId: 'hantu' }, { a: 'baru' }, 'cad');`);
    ok(run(sb, `T.id`) !== 'lama', 'id baru'); eq(run(sb, `T.amount`), 1500); eq(run(sb, `T.date`), run(sb, `todayStr()`)); eq(run(sb, `T.accountId`), 'cad');
    eq(run(sb, `buildTxnFromImport({ date: '2026-03-01', type: 'aneh', amount: 10, accountId: 'a' }, { a: 'baru' }, 'cad').type`), 'masuk');
    const nan = run(sb, `buildTxnFromImport({ date: '2026-03-01', type: 'masuk', amount: 'abc', accountId: 'a' }, { a: 'baru' }, 'cad').amount`);
    eq(nan, 0, 'nominal bukan angka harus 0, bukan NaN');
  });
  test('isValidDateStr tidak bergantung zona waktu (regresi: UTC+ menolak semua tanggal)', () => {
    const { execFileSync } = require('child_process');
    for (const tz of ['UTC', 'Asia/Makassar', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
      const out = execFileSync(process.execPath, ['-e', `const src=require('fs').readFileSync(${JSON.stringify(path.join(root, 'src/js/features/data/import-export.js'))},'utf8');const m=/function isValidDateStr[\\s\\S]*?\\n  }\\n/.exec(src)[0];eval(m);console.log([isValidDateStr('2026-02-28'),isValidDateStr('2028-02-29'),isValidDateStr('2026-02-30'),isValidDateStr('2026-12-31')].join())`], { env: { ...process.env, TZ: tz } }).toString().trim();
      eq(out, 'true,true,false,true', tz);
    }
  });
}

console.log('integritas modul (Fase 3, v1.1.090)');
{
  const src = f => fs.readFileSync(path.join(root, f), 'utf8');
  const files = [...src('index.html').matchAll(/<script src="([^"]+\.js)"/g)].map(m => m[1]);
  test('index.html memuat 39 file JS dan semuanya ada di disk dan di daftar cache sw.js', () => {
    eq(files.length, 39); const sw = src('sw.js');
    for (const f of files) { ok(fs.existsSync(path.join(root, f)), f + ' tidak ada'); ok(sw.includes("'" + f + "'") || sw.includes('"' + f + '"'), f + ' belum di cache sw.js'); }
  });
  test('semua file JS (kecuali src/js/core/startup.js, yang menjalankan app) bisa dimuat berurutan ke sandbox tanpa galat', () => {
    const store = {}; const ls = { getItem: k => (k in store ? store[k] : null), setItem(k, v) { store[k] = String(v); }, removeItem(k) { delete store[k]; } };
    const el = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, appendChild() {}, remove() {}, setAttribute() {}, removeAttribute() {}, addEventListener() {}, dataset: {} });
    const doc = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], createElement: el, body: el(), head: el(), documentElement: el(), addEventListener() {}, visibilityState: 'visible' };
    const sb = { localStorage: ls, document: doc, console, Date, Math, JSON, Map, Set, Array, Object, Number, String, RegExp, isFinite, isNaN, parseFloat, parseInt, setTimeout, clearTimeout, Intl, navigator: {}, location: { href: '' }, matchMedia: () => ({ matches: false, addEventListener() {} }), addEventListener() {} };
    sb.window = sb; vm.createContext(sb);
    for (const f of files) { if (f === 'src/js/core/startup.js') continue; try { vm.runInContext(src(f), sb, { filename: f }); } catch (e) { throw new Error(f + ': ' + e.message); } }
  });
  test('tidak ada nama fungsi atau konstanta tingkat atas yang dideklarasikan di dua file (scope global bersama)', () => {
    const seen = {};
    for (const f of files) {
      const s = src(f);
      for (const m of s.matchAll(/^  (?:async )?function\s+([A-Za-z_$][\w$]*)/gm)) (seen[m[1]] = seen[m[1]] || []).push(f);
      for (const m of s.matchAll(/^  (?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm)) (seen[m[1]] = seen[m[1]] || []).push(f);
    }
    const dup = Object.keys(seen).filter(k => new Set(seen[k]).size > 1).map(k => k + ' di ' + [...new Set(seen[k])].join(', '));
    eq(dup, [], 'duplikat: ' + dup.join('; '));
  });
  test('setiap data-act / data-change-act / data-input-act / data-keydown-act menunjuk fungsi global yang ada', () => {
    let code = ''; for (const f of files) code += src(f);
    const def = new Set([...code.matchAll(/function\s+([A-Za-z_$][\w$]*)/g)].map(m => m[1]));
    const IGNORE = new Set(['namaFungsi']);   // contoh di komentar src/js/core/util-ui.js
    const missing = new Set();
    for (const f of ['index.html', ...files]) for (const m of src(f).matchAll(/data-(?:[a-z]+-)?act="([A-Za-z_$][\w$]*)"/g)) if (!def.has(m[1]) && !IGNORE.has(m[1])) missing.add(m[1] + ' (' + f + ')');
    eq([...missing], [], 'pengendali hilang: ' + [...missing].join(', '));
  });
}

console.log('jumlah per penilaian aset, mis. equity forex (v1.1.091)');
{
  const src = f => fs.readFileSync(path.join(root, f), 'utf8');
  const mk = () => makeSandbox(NOW).sb;
  test('assetQtyNow: pakai jumlah penilaian terbaru yang mencatat jumlah, kalau tidak jumlah awal; penilaian masa depan diabaikan', () => {
    const sb = mk();
    run(sb, `var A = { id: 'f', type: 'aset', assetQty: 100, assetUnit: 'USD', initialBalance: 1600000, valuations: [] };`);
    eq(run(sb, `assetQtyNow(A)`), 100);
    run(sb, `A.valuations = [{ date: '2026-09-01', value: 1900000, price: 16000, qty: 120 }, { date: '2026-09-20', value: 1000000 }, { date: '2099-01-01', value: 9, qty: 999 }];`);
    eq(run(sb, `assetQtyNow(A)`), 120, 'penilaian tanpa jumlah tidak menimpa'); eq(run(sb, `assetQtyNow(A, '2026-08-01')`), 100);
    eq(run(sb, `assetMetaText(A)`), ' · 120 USD'.replace(' · ', ' · '), 'meta');
  });
  test('sanitizeValuations menyimpan qty yang valid dan membuang yang tidak', () => {
    const sb = mk();
    const r = run(sb, `sanitizeValuations([{ date: '2026-09-01', value: 10, qty: 5 }, { date: '2026-09-02', value: 10, qty: -1 }, { date: '2026-09-03', value: 10, qty: 'x' }]).map(v => v.qty)`);
    eq(r, [5, undefined, undefined]);
  });
  test('form penilaian punya input jumlah dan simpan mencatat qty', () => {
    const h = src('index.html'), s = src('src/js/features/akun/akun-aset-tagihan.js');
    ok(h.includes('id="asset-val-qty-input"') && h.includes('data-input-act="onAssetQtyInput"'), 'input');
    ok(/entry\.qty = qtyUse/.test(s), 'simpan qty');
  });
}

console.log('data contoh (dummy) baru (v1.1.092)');
{
  const mk = () => makeSandbox(NOW).sb;
  test('buildDummyData: akun lengkap (aset berjumlah, kredit bertenor, arsip), langganan dan anggaran lolos sanitasi tanpa kehilangan isi', () => {
    const sb = mk();
    run(sb, `var D = buildDummyData();`);
    const ids = run(sb, `D.accounts.map(a => a.id)`);
    for (const id of ['dm-emas', 'dm-forex', 'dm-motor', 'dm-kredit-motor', 'dm-lama']) ok(ids.includes(id), id);
    eq(run(sb, `new Set(D.accounts.map(a => a.id)).size`), run(sb, `D.accounts.length`), 'id akun unik');
    eq(run(sb, `new Set(D.txns.map(t => t.id)).size`), run(sb, `D.txns.length`), 'id transaksi unik');
    eq(run(sb, `sanitizeSubscriptions(D.subscriptions).length`), 2); eq(run(sb, `Object.keys(sanitizeBudgets(D.budgets)).length`), 3);
    eq(run(sb, `D.accounts.every(a => D.txns.every(t => t.accountId !== a.id) || true)`), true);
    eq(run(sb, `D.txns.every(t => D.accounts.some(a => a.id === t.accountId))`), true, 'transaksi menunjuk akun yang ada');
  });
  test('buildDummyData: tanggal valid, penilaian tidak di masa depan, jumlah forex terbaru, saldo non-utang tidak negatif, akun arsip bisa diarsipkan', () => {
    const sb = mk();
    run(sb, `var D = buildDummyData(); var BAL = computeAllBalances(D);`);
    eq(run(sb, `D.txns.every(t => isValidDateStr(t.date))`), true);
    eq(run(sb, `D.accounts.filter(a => a.valuations).every(a => a.valuations.every(v => v.date <= todayStr()))`), true);
    eq(run(sb, `assetQtyNow(D.accounts.find(a => a.id === 'dm-forex'))`), 125);
    eq(run(sb, `D.accounts.filter(a => ['kas', 'bank', 'ewallet', 'aset'].includes(a.type) && BAL[a.id] < 0).map(a => a.id + ':' + BAL[a.id]).join()`), '', 'saldo non-utang negatif');
    eq(run(sb, `archiveBlockReason(D, D.accounts.find(a => a.id === 'dm-lama'))`), '');
    eq(run(sb, `BAL['dm-lama']`), 0);
  });
}

console.log('label tampak form transaksi (v1.1.093)');
{
  const src = f => fs.readFileSync(path.join(root, f), 'utf8');
  test('form transaksi: tiap isian utama punya <label for> yang terlihat', () => {
    const h = src('index.html'); const a = h.indexOf('id="txn-form"'), b = h.indexOf('id="txn-submit-btn"');
    const blk = h.slice(a, b);
    for (const id of ['date-input', 'category-select', 'desc-input', 'account-select', 'to-account-select', 'amount-input', 'paylater-method', 'paylater-tenor', 'paylater-rate', 'paylater-admin'])
      ok(new RegExp('<label[^>]*for="' + id + '"').test(blk), 'label untuk ' + id);
  });
  test('judul akun mengikuti jenis transaksi (Masuk ke akun / Dibayar dari akun / Dari akun)', () => {
    const s = src('src/js/features/transaksi/form-transaksi.js');
    for (const t of ['Masuk ke akun', 'Dibayar dari akun', 'Dari akun']) ok(s.includes(t), t);
    ok(src('index.html').includes('id="account-label"'), 'elemen label');
  });
}

console.log('label tampak form titipan, langganan, bayar pinjaman (v1.1.094)');
{
  const src = f => fs.readFileSync(path.join(root, f), 'utf8');
  test('form titipan, langganan, dan bayar pinjaman: tiap isian punya <label for> yang terlihat', () => {
    const h = src('index.html');
    for (const id of ['titipan-person-select', 'titipan-fund-select', 'titipan-desc-input', 'titipan-amount-input', 'titipan-date-input', 'sub-name-input', 'sub-amount-input', 'sub-day-input', 'sub-account-input', 'loan-pay-mode-input', 'loan-pay-source-input', 'loan-pay-date-input', 'loan-pay-amount-input'])
      ok(new RegExp('<label[^>]*for="' + id + '"').test(h), 'label untuk ' + id);
  });
  test('judul akun titipan mengikuti mode (Dibayar dari akun / Diterima ke akun)', () => {
    const s = src('src/js/features/titipan/form-titipan.js'); ok(s.includes('Dibayar dari akun') && s.includes('Diterima ke akun'), 'teks'); ok(src('index.html').includes('id="titipan-fund-label"'), 'elemen');
  });
  test('setiap <label for> di index.html menunjuk id yang ada (tidak yatim)', () => {
    const h = src('index.html'); const ids = new Set([...h.matchAll(/\bid="([^"]+)"/g)].map(m => m[1])); const bad = [];
    for (const m of h.matchAll(/<label[^>]*\bfor="([^"]+)"/g)) if (!ids.has(m[1])) bad.push(m[1]);
    eq(bad, [], 'label yatim: ' + bad.join(','));
  });
}

console.log('select kustom form langganan (v1.1.095)');
{
  test('semua <select> di form (kecuali yang disengaja) masuk daftar enhanceSelect: akun langganan ikut', () => {
    const u = fs.readFileSync(path.join(root, 'src/js/core/util-ui.js'), 'utf8'); ok(u.includes("'sub-account-input'"), 'sub-account-input');
    const h = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const listed = new Set([...u.slice(u.indexOf("'category-select'"), u.indexOf(".forEach(enhanceSelect)")).matchAll(/'([a-z0-9-]+)'/g)].map(m => m[1]));
    const inSheets = [...h.matchAll(/<select[^>]*\bid="([^"]+)"/g)].map(m => m[1]);
    const missing = inSheets.filter(id => !listed.has(id));
    eq(missing, [], 'select belum kustom: ' + missing.join(','));
  });
}

console.log('pinjaman bank: bayar bunga saja, pokok tetap, jadwal lanjut (v1.1.096)');
{
  const mk = (extra) => {
    const { sb } = makeSandbox(NOW);   // hari ini 2026-09-15
    run(sb, `var K = { accounts: [ { id: 'b', name: 'Bank', type: 'bank', initialBalance: 50000000 },
        { id: 'p', name: 'Kredit', type: 'pinjaman', initialBalance: -12000000, originalPrincipal: 12000000, loanRatePercent: 1, loanRateUnit: 'bulan', loanInterestType: 'tetap', loanTenorMonths: 12, loanStartDate: '2026-06-10' } ],
      txns: [], subscriptions: [] };
      var bunga = (ym) => K.txns.push({ id: 'bg' + ym, date: ym + '-10', type: 'keluar', desc: 'Bunga', category: 'Bunga & biaya bank', amount: 120000, accountId: 'b', loanId: 'p' });
      var pokok = (ym, amt) => K.txns.push({ id: 'pk' + ym, date: ym + '-10', type: 'transfer', desc: 'Pokok', amount: amt, accountId: 'b', toAccountId: 'p' }); ${extra || ''}`);
    return sb;
  };
  test('tanpa pembayaran: angsuran ke-1 telat sejak 10 Jul, tidak ada penundaan', () => {
    const sb = mk(); const r = JSON.parse(run(sb, `JSON.stringify((s => ({ d: s.deferred, st: s.rows[0].status, due: s.rows[0].due, paid: s.paid }))(computeLoanSchedule(K, K.accounts[1])))`));
    eq(r, { d: 0, st: 'telat', due: '2026-07-10', paid: 0 });
  });
  test('bayar bunga saja tiap bulan (Jul-Sep): pokok tetap, jadwal bergeser 3 bulan, angsuran ke-1 jadi 10 Okt dan tidak telat', () => {
    const sb = mk(`bunga('2026-07'); bunga('2026-08'); bunga('2026-09');`);
    const r = JSON.parse(run(sb, `JSON.stringify((s => ({ d: s.deferred, st: s.rows[0].status, due: s.rows[0].due, paid: s.paid, next: s.next.no, sisa: Math.round(-accountBalance(K, 'p')) }))(computeLoanSchedule(K, K.accounts[1])))`));
    eq(r, { d: 3, st: 'belum', due: '2026-10-10', paid: 0, next: 1, sisa: 12000000 });
  });
  test('bulan yang juga ada pembayaran pokok tidak dihitung ditunda', () => {
    const sb = mk(`bunga('2026-07'); bunga('2026-08'); pokok('2026-08', 1000000); bunga('2026-09');`);
    eq(run(sb, `computeLoanSchedule(K, K.accounts[1]).deferred`), 2);
    eq(run(sb, `loanInterestOnlyMonths(K, K.accounts[1], '2026-06-10', '2026-09-15')`), ['2026-07', '2026-09']);
  });
  test('bunga kurang dari 90% bunga bulanan, atau sebelum/di bulan pencairan, tidak dihitung', () => {
    const sb = mk(`K.txns.push({ id: 'x1', date: '2026-07-10', type: 'keluar', desc: 'Bunga', category: 'Bunga & biaya bank', amount: 50000, accountId: 'b', loanId: 'p' }); bunga('2026-06');`);
    eq(run(sb, `computeLoanSchedule(K, K.accounts[1]).deferred`), 0);
  });
  test('pinjaman bunga menurun: bayar bunga saja juga menggeser jadwal; lunas tidak menunda', () => {
    const sb = mk(`K.accounts[1].loanInterestType = 'menurun'; K.accounts[1].loanRatePercent = 1; bunga('2026-07'); bunga('2026-08');`);
    const r = JSON.parse(run(sb, `JSON.stringify((s => ({ d: s.deferred, due: s.rows[0].due }))(computeLoanSchedule(K, K.accounts[1])))`));
    eq(r.d, 2); eq(r.due, '2026-09-10');
  });
  test('jadwal mengembalikan daftar bulan bunga saja', () => { const sb = mk(`bunga('2026-07'); bunga('2026-08');`); eq(run(sb, `computeLoanSchedule(K, K.accounts[1]).deferredYm`), ['2026-07', '2026-08']); });
  test('teks kartu akun menyebut pokok ditunda', () => {
    const sb = mk(`bunga('2026-07'); bunga('2026-08');`);
    run(sb, 'var feeAdminMetaText = function () { return ""; };');
    ok(/pokok ditunda 2 bln/.test(run(sb, `accountDisplayInfo(K, K.accounts[1], accountBalance(K, 'p'), { detail: false }).metaExtra`)), 'meta');
  });
}

console.log('pemilih tanggal kustom (v1.1.100)');
{
  const src = fs.readFileSync(path.join(root, 'src/js/core/util-ui.js'), 'utf8');
  const h = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(src.slice(src.indexOf('const CDATE_MONTHS'), src.indexOf('function enhanceDate')), ctx);
  test('calendarCells: Okt 2026 mulai Kamis (3 kosong di depan), 31 hari, kelipatan 7', () => {
    const c = vm.runInContext("calendarCells(2026, 9)", ctx);
    eq(c.length % 7, 0); eq(c.slice(0, 3), [null, null, null]); eq(c[3], '2026-10-01'); eq(c.filter(Boolean).length, 31); eq(c.filter(Boolean).pop(), '2026-10-31');
  });
  test('calendarCells: Feb 2028 (kabisat) 29 hari; Feb 2027 28 hari; awal Senin tanpa kosong (Mei 2023)', () => {
    eq(vm.runInContext("calendarCells(2028, 1).filter(Boolean).length", ctx), 29);
    eq(vm.runInContext("calendarCells(2027, 1).filter(Boolean).length", ctx), 28);
    eq(vm.runInContext("calendarCells(2023, 4)[0]", ctx), '2023-05-01');
  });
  test('cdateText memformat tanggal Indonesia dan kosong untuk nilai tidak valid', () => {
    eq(vm.runInContext("cdateText('2026-10-02')", ctx), '2 Okt 2026'); eq(vm.runInContext("cdateText('')", ctx), ''); eq(vm.runInContext("cdateText('abc')", ctx), '');
  });
  test('semua <input type="date"> di index.html masuk daftar enhanceDate', () => {
    const ids = [...h.matchAll(/<input[^>]*type="date"[^>]*\bid="([^"]+)"/g)].map(m => m[1]);
    ok(ids.length >= 7, 'jumlah input tanggal');
    const missing = ids.filter(id => !src.includes("'" + id + "'"));
    eq(missing, [], 'tanggal belum kustom: ' + missing.join(','));
  });
}

console.log('laporan: ringkasan per kategori (v1.1.101)');
{
  const src = fs.readFileSync(path.join(root, 'src/js/features/laporan/laporan.js'), 'utf8');
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(src.slice(src.indexOf('const CAT_TOP_N'), src.indexOf('function renderLaporanCatCard')), ctx);
  test('formatCatPct: <1% untuk porsi kecil (bukan 0%), pembulatan biasa, 100%', () => {
    eq(vm.runInContext("formatCatPct(47000, 17927000)", ctx), '<1%'); eq(vm.runInContext("formatCatPct(500000, 17927000)", ctx), '3%');
    eq(vm.runInContext("formatCatPct(10, 10)", ctx), '100%'); eq(vm.runInContext("formatCatPct(0, 10)", ctx), '0%'); eq(vm.runInContext("formatCatPct(5, 0)", ctx), '0%');
  });
  test('summarizeCategories: jumlah dan banyak transaksi per kategori, urut nominal terbesar, kosong jadi Tanpa kategori', () => {
    const r = vm.runInContext("JSON.stringify(summarizeCategories([{category:'A',amount:100},{category:'B',amount:300},{category:'A',amount:50},{amount:20}]))", ctx);
    eq(JSON.parse(r), [{ category: 'B', amount: 300, count: 1 }, { category: 'A', amount: 150, count: 2 }, { category: 'Tanpa kategori', amount: 20, count: 1 }]);
  });
  test('baris kategori memakai data-act terdaftar dan tombol lipat tersedia', () => {
    ok(/data-act="toggleLaporanCat"/.test(src) && /function toggleLaporanCat\(/.test(src), 'toggleLaporanCat');
    ok(/data-act="toggleLaporanCatMore"/.test(src) && /function toggleLaporanCatMore\(/.test(src), 'toggleLaporanCatMore');
  });
}

console.log('input nominal dengan titik ribuan (v1.1.104)');
{
  const src = fs.readFileSync(path.join(root, 'src/js/core/util-ui.js'), 'utf8');
  const h = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(src.slice(src.indexOf('function moneyGroup'), src.indexOf('function enhanceMoney(')), ctx);
  const fm = (t, o) => JSON.parse(vm.runInContext('JSON.stringify(moneyFormat(' + JSON.stringify(t) + ', ' + JSON.stringify(o || {}) + '))', ctx));
  test('moneyFormat: titik ribuan, nol di depan dibuang, kosong tetap kosong', () => {
    eq(fm('1500000'), { display: '1.500.000', value: '1500000' }); eq(fm('000'), { display: '0', value: '0' }); eq(fm('0007'), { display: '7', value: '7' });
    eq(fm(''), { display: '', value: '' }); eq(fm('abc'), { display: '', value: '' }); eq(fm('1.250.000'), { display: '1.250.000', value: '1250000' });
  });
  test('moneyFormat: koma desimal hanya bila diizinkan, minus hanya bila diizinkan', () => {
    eq(fm('12,5'), { display: '125', value: '125' }); eq(fm('16.250,5', { dec: true }), { display: '16.250,5', value: '16250.5' });
    eq(fm('1,', { dec: true }), { display: '1,', value: '1' }); eq(fm(',5', { dec: true }), { display: '0,5', value: '0.5' });
    eq(fm('-500000'), { display: '500.000', value: '500000' }); eq(fm('-500000', { neg: true }), { display: '-500.000', value: '-500000' });
    eq(fm('-', { neg: true }), { display: '-', value: '' }); eq(fm('1,23456789', { dec: true }).value, '1.2345');
  });
  test('moneyFromValue: nilai input asli ke teks tampilan', () => {
    eq(vm.runInContext("moneyFromValue('1234.5')", ctx), '1.234,5'); eq(vm.runInContext("moneyFromValue('-2500000')", ctx), '-2.500.000'); eq(vm.runInContext("moneyFromValue('')", ctx), '');
  });
  test('semua input angka berlabel Rupiah di index.html bertanda data-money', () => {
    const tags = [...h.matchAll(/<input[^>]*type="number"[^>]*>/g)].map(m => m[0]);
    const rp = tags.filter(t => /\(Rp\)|placeholder="Rp"|placeholder="Rp,|Rp, /.test(t) && !/%/.test((t.match(/placeholder="[^"]*"/) || [''])[0]) && !/id="acc-fee-amount-input"/.test(t));
    ok(rp.length >= 14, 'jumlah input Rupiah: ' + rp.length);
    const missing = rp.filter(t => !/data-money=/.test(t)).map(t => (t.match(/id="([^"]+)"/) || [])[1]);
    eq(missing, [], 'belum data-money: ' + missing.join(','));
  });
}

console.log('audit kontrol bawaan dan kode usang (v1.1.105)');
{
  const files = listAppJs();
  const js = files.map(n => [n, fs.readFileSync(path.join(root, n), 'utf8')]);
  const css = fs.readFileSync(path.join(root, 'src/css/app.css'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  test('tidak ada dialog bawaan browser (alert/confirm/prompt) dan API usang di kode aplikasi', () => {
    const bad = [];
    js.forEach(([n, t]) => { const code = t.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''); if (/(^|[^\w.$])(alert|confirm|prompt)\(/.test(code) || /execCommand|\.substr\(|keyCode|document\.write\(/.test(code)) bad.push(n); });
    eq(bad, [], 'berisi API bawaan/usang: ' + bad.join(','));
  });
  test('tidak ada <select>, <textarea>, <datalist>, radio, atau tipe tanggal/bulan/jam/warna bawaan yang tak dikustomkan', () => {
    const tags = [...html.matchAll(/<input[^>]*>/g)].map(m => m[0]);
    const nativeTypes = tags.filter(t => /type="(radio|month|time|datetime-local|week|color|range)"/.test(t));
    eq(nativeTypes, [], 'tipe input bawaan');
    ok(!/<textarea|<datalist|<dialog/.test(html), 'textarea/datalist/dialog');
  });
  test('CSS: spinner angka dan centang bawaan dimatikan, tanpa awalan vendor usang', () => {
    ok(/input\[type="number"\]::-webkit-inner-spin-button/.test(css), 'spinner angka');
    ok(/input\[type="checkbox"\]\s*\{[^}]*appearance: none/.test(css), 'checkbox kustom');
    ok(!/-webkit-overflow-scrolling/.test(css), 'overflow-scrolling usang');
    ok(!/#tab-data/.test(css), 'selektor #tab-data sisa');
  });
  test('fungsi yang sudah tak dipakai tidak kembali (goToAddTxn, toggleAccForm, setNetWorthPeriod, setCashflowPeriod)', () => {
    const all = js.map(x => x[1]).join('\n');
    ['goToAddTxn', 'toggleAccForm', 'setNetWorthPeriod', 'setCashflowPeriod'].forEach(n => ok(!new RegExp('function ' + n + '\\b').test(all), n));
  });
}

console.log('cetak laporan (v1.1.106)');
{
  const css = fs.readFileSync(path.join(root, 'src/css/app.css'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const lap = fs.readFileSync(path.join(root, 'src/js/features/laporan/laporan.js'), 'utf8');
  const printCss = css.slice(css.indexOf('@page'));
  test('CSS cetak: ukuran A4 + nomor halaman, selalu terang, warna bilah ikut tercetak', () => {
    ok(/@page\s*\{[^}]*size: A4/.test(css), '@page A4'); ok(/counter\(page\)/.test(css), 'nomor halaman');
    ok(/@media print[\s\S]*?:root\[data-theme="dark"\][\s\S]*?--paper: #FFFFFF/.test(printCss), 'tema terang saat cetak');
    ok(/print-color-adjust: exact/.test(printCss), 'print-color-adjust');
  });
  test('kepala cetak laporan ada di HTML, tersembunyi di layar, dan terisi dari renderLaporan', () => {
    ok(/id="laporan-print-head"/.test(html), 'elemen kepala'); ok(/\.print-only \{ display: none; \}/.test(css), 'print-only tersembunyi');
    ok(/renderLaporanPrintHead\(data, labelEl\.textContent\)/.test(lap), 'dipanggil dari renderLaporan');
  });
  test('urutan cetak: ringkasan, kategori, lalu analisis tambahan; kurva tren tidak ikut tercetak', () => {
    ok(/\.laporan-summary \{ order: 1; \}/.test(printCss), 'order ringkasan');
    ok(/#laporan-extra \{ order: 4/.test(printCss), 'order extra');
    ok(/class="chart-card laporan-trend no-print"/.test(html), 'kartu tren disembunyikan saat cetak');
  });
  test('cetak tanpa kartu: kotak, latar, dan sudut membulat dimatikan di @media print', () => {
    ok(/\.chart-card, \.cat-list, \.acc-card, \.list-section \{[^}]*border: 0 !important[^}]*border-radius: 0 !important/.test(printCss), 'aturan tanpa kartu');
    ok(/\.chart-card > \.section-title \{[^}]*border-bottom: 1\.5px solid/.test(printCss), 'judul bagian bergaris');
  });
  test('tombol cetak: label jelas + petunjuk, judul berkas aman, tanpa data tidak mencetak, cetak terblokir ditangani', () => {
    ok(/id="laporan-export-btn"[^>]*>[\s\S]*?Cetak \/ simpan PDF/.test(html) && /id="laporan-export-hint"/.test(html), 'tombol dan petunjuk');
    ok(!/Export PDF/.test(html), 'label lama');
    const ctx = {}; vm.createContext(ctx);
    vm.runInContext(lap.slice(lap.indexOf('function laporanPdfTitle'), lap.indexOf('// Ada transaksi pada periode')), ctx);
    eq(vm.runInContext("laporanPdfTitle('1 Agu – 6 Okt 2026')", ctx), 'Laporan Keuangan - 1 Agu – 6 Okt 2026');
    eq(vm.runInContext("laporanPdfTitle('a/b:c?')", ctx), 'Laporan Keuangan - a-b-c-'); eq(vm.runInContext("laporanPdfTitle('')", ctx), 'Laporan Keuangan');
    ok(/laporanHasData\(data, getLaporanRange\(data\)\)/.test(lap), 'cek data sebelum cetak');
    ok(/try \{[\s\S]*?window\.print\(\);[\s\S]*?\} catch/.test(lap), 'print dibungkus try/catch');
  });
  test('isi <details> dibuka saat cetak lalu dikembalikan (beforeprint/afterprint)', () => {
    ok(/addEventListener\('beforeprint'/.test(lap) && /addEventListener\('afterprint'/.test(lap), 'listener cetak');
  });
}

// ---------- v1.1.111: build sebar (dist) ----------
{
  test('tools/build-dist.js: 1 file JS, sw.js dan index.html menunjuk app.js, semua fungsi global tetap ada', () => {
    const os = require('os'), { execFileSync } = require('child_process');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kp-dist-'));
    execFileSync(process.execPath, [path.join(root, 'tools', 'build-dist.js'), tmp]);
    const idx = fs.readFileSync(path.join(tmp, 'index.html'), 'utf8');
    eq((idx.match(/<script src=/g) || []).length >= 1, true);
    ok(!/<script src="\d\d[a-z]?-/.test(idx), 'tag script modul tersisa');
    ok(/<script src="app\.js\?v=v\d/.test(idx), 'tag app.js');
    const sw = fs.readFileSync(path.join(tmp, 'sw.js'), 'utf8');
    ok(/'app\.js'/.test(sw) && !/01-data\.js/.test(sw), 'daftar cache sw');
    const bundle = fs.readFileSync(path.join(tmp, 'app.js'), 'utf8');
    for (const fn of ['exportLaporanPdf', 'computeLoanSchedule', 'enhanceMoney', 'renderLaporan']) ok(bundle.includes('function ' + fn), 'hilang: ' + fn);
    new vm.Script(bundle);   // sintaks valid
    ok(fs.statSync(path.join(tmp, 'style.css')).size < fs.statSync(path.join(root, 'src/css/app.css')).size, 'CSS tidak lebih kecil');
    fs.rmSync(tmp, { recursive: true, force: true });
  });
}

// ---------- v1.1.113: kontras teks ----------
{
  test('warna teks memakai varian *-ink (kontras ≥ 4.5:1), tidak lagi warna dasar', () => {
    const css = fs.readFileSync(path.join(root, 'src/css/app.css'), 'utf8');
    for (const k of ['teal', 'green', 'red', 'blue', 'amber', 'rust']) ok(new RegExp('--' + k + '-ink:').test(css), 'variabel --' + k + '-ink');
    ok(!/(^|[^-\w])color:\s*var\(--(red|green|teal|blue|amber)\)/.test(css), 'color: var(--warna-dasar) tersisa di CSS');
    const lum = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const cr = (a, b) => { const A = lum(a), B = lum(b); return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05); };
    const root1 = css.slice(css.indexOf(':root {'), css.indexOf(':root:not([data-theme="light"])'));
    for (const k of ['teal', 'green', 'red', 'blue', 'amber', 'rust']) { const h = root1.match(new RegExp('--' + k + '-ink:\\s*(#[0-9A-Fa-f]{6})'))[1]; ok(cr(h, '#E7ECE9') >= 4.5, k + '-ink kurang kontras di kertas redup: ' + cr(h, '#E7ECE9').toFixed(2)); }
  });
}

console.log('transaksi berulang: pemasukan (v1.1.117)');
{
  const { sb } = makeSandbox(NOW); // 15 Sep 2026
  const mkData = (subs) => ({ accounts: [{ id: 'a', name: 'Bank', type: 'bank', initialBalance: 0 }], txns: [], subscriptions: subs });
  const inc = (o) => Object.assign({ id: 'g1', name: 'Gaji', amount: 5000000, accountId: 'a', day: 25, active: true, lastAppliedMonth: '2026-07', type: 'masuk', category: 'Gaji' }, o || {});
  const apply = (d) => { sb.__d = d; return run(sb, 'applySubscriptions(__d).txns.map(t => [t.id, t.date, t.type, t.amount, t.category])'); };
  test('data lama tanpa type/category: jadi pengeluaran "Tagihan & langganan"', () => {
    sb.__r = [{ id: 's1', name: 'Netflix', amount: 1, accountId: 'a', day: 1 }];
    eq(run(sb, 'sanitizeSubscriptions(__r).map(s => [s.type, s.category])'), [['keluar', 'Tagihan & langganan']]);
  });
  test('sanitize: type tak dikenal -> keluar; kategori di luar daftar atau khusus sistem -> bawaan jenisnya', () => {
    sb.__r = [{ name: 'a', amount: 1, accountId: 'a', day: 1, type: 'bogus', category: 'Gaji' }, { name: 'b', amount: 1, accountId: 'a', day: 1, type: 'masuk', category: 'Penyesuaian saldo' }, { name: 'c', amount: 1, accountId: 'a', day: 1, type: 'masuk', category: 'Bonus/THR' }, { name: 'd', amount: 1, accountId: 'a', day: 1, type: 'masuk', category: 'Makan & minum' }];
    eq(run(sb, 'sanitizeSubscriptions(__r).map(s => s.type + ":" + s.category)'), ['keluar:Tagihan & langganan', 'masuk:Gaji', 'masuk:Bonus/THR', 'masuk:Gaji']);
  });
  test('pemasukan berulang: dicatat sebagai transaksi masuk berkategori, idempoten, dengan ID deterministik', () => {
    const d = mkData([inc()]);
    eq(apply(d), [['sub-g1-2026-08', '2026-08-25', 'masuk', 5000000, 'Gaji']]);   // Sep 25 belum jatuh tempo (hari ini 15)
    const n = d.txns.length; apply(d); eq(d.txns.length, n);
  });
  test('kategori pilihan dipakai pada transaksi yang dibuat', () => {
    eq(apply(mkData([inc({ category: 'Hasil usaha', lastAppliedMonth: '2026-08', day: 10 })])), [['sub-g1-2026-09', '2026-09-10', 'masuk', 5000000, 'Hasil usaha']]);
  });
  test('total bulanan pengeluaran tidak menghitung pemasukan; pemasukan dihitung terpisah', () => {
    sb.__s = [inc(), { id: 's', name: 'Net', amount: 54000, accountId: 'a', day: 5, active: true, type: 'keluar' }, inc({ id: 'g2', amount: 1000, active: false })];
    eq(run(sb, 'subMonthlyTotal(__s)'), 54000); eq(run(sb, 'subMonthlyIncome(__s)'), 5000000);
  });
  test('impor: pemasukan dan pengeluaran bernama sama di akun & tanggal sama tidak dianggap duplikat', () => {
    sb.__e = [{ id: 'x', name: 'Gaji', amount: 1, accountId: 'a', day: 25, active: true, type: 'keluar', category: 'Tagihan & langganan' }]; sb.__p = { subscriptions: [inc()] };
    eq(run(sb, "importSubscriptions(__e, __p, {}, ['a']).map(s => s.type)"), ['keluar', 'masuk']);
  });
  test('form: pilihan jenis, kategori, label akun, dan select kustom terpasang', () => {
    const h = fs.readFileSync(path.join(root, 'index.html'), 'utf8'); const u = fs.readFileSync(path.join(root, 'src/js/core/util-ui.js'), 'utf8');
    for (const id of ['sub-type-input', 'sub-category-input', 'sub-account-label', 'sub-name-label', 'sub-submit-btn']) ok(h.includes('id="' + id + '"'), id);
    ok(/<label[^>]*for="sub-type-input"/.test(h) && /<label[^>]*for="sub-category-input"/.test(h), 'label for');
    ok(u.includes("'sub-type-input'") && u.includes("'sub-category-input'"), 'enhanceSelect');
    ok(h.includes('data-change-act="onSubTypeChange"'), 'handler');
  });
}

console.log('ekspor CSV (v1.1.118)');
{
  const { sb } = makeSandbox(NOW);
  const cell = v => { sb.__v = v; return run(sb, 'csvCell(__v)'); };
  test('csvCell: angka dengan desimal koma, teks dikutip bila perlu', () => {
    eq([1500000, 12.5, -300, 0, NaN, null].map(cell), ['1500000', '12,5', '-300', '0', '', '']);
    eq(cell('a;b'), '"a;b"'); eq(cell('say "hi"'), '"say ""hi"""'); eq(cell('baris\nbaru'), '"baris\nbaru"'); eq(cell('biasa'), 'biasa');
  });
  test('csvCell: teks berawalan rumus diberi apostrof (CSV injection)', () => {
    eq(['=1+1', '+62', '-x', '@SUM(A1)'].map(cell), ["'=1+1", "'+62", "'-x", "'@SUM(A1)"]);
    eq(cell('2026-09-01'), '2026-09-01');
  });
  test('buildTxnCsv: BOM, pemisah ;, urut tanggal stabil, akun tujuan hanya untuk transfer', () => {
    sb.__d = { accounts: [{ id: 'a', name: 'Kas', type: 'kas' }, { id: 'b', name: 'Bank;BCA', type: 'bank' }], txns: [
      { id: '2', date: '2026-09-02', type: 'keluar', desc: '=HYPERLINK("x")', amount: 1500.5, accountId: 'a', category: 'Hiburan' },
      { id: '1', date: '2026-09-01', type: 'transfer', desc: 'Top up', amount: 100000, accountId: 'a', toAccountId: 'b', category: 'Top up saldo' },
      { id: '3', date: '2026-09-02', type: 'masuk', desc: 'Gaji', amount: 5000000, accountId: 'b', category: 'Gaji' }] };
    const csv = run(sb, 'buildTxnCsv(__d, __d.txns)');
    ok(csv.charCodeAt(0) === 0xFEFF, 'BOM');
    const lines = csv.slice(1).split('\r\n');
    eq(lines[0], 'Tanggal;Jenis;Kategori;Deskripsi;Jumlah;Akun;Akun Tujuan;Label');
    eq(lines[1], '2026-09-01;Transfer;Top up saldo;Top up;100000;Kas;"Bank;BCA";');
    eq(lines[2], '2026-09-02;Keluar;Hiburan;"\'=HYPERLINK(""x"")";1500,5;Kas;;');
    eq(lines[3], '2026-09-02;Masuk;Gaji;Gaji;5000000;"Bank;BCA";;');
  });
  test('buildAccountsCsv: nama, jenis, saldo, status, limit', () => {
    sb.__d = { accounts: [{ id: 'a', name: 'Kas', type: 'kas', initialBalance: 100 }, { id: 'k', name: 'KK', type: 'kartu_kredit', initialBalance: 0, limit: 5000000, archived: true }], txns: [] };
    const lines = run(sb, 'buildAccountsCsv(__d)').slice(1).split('\r\n');
    eq(lines[0], 'Akun;Jenis;Saldo;Status;Limit'); eq(lines[1].split(';').slice(2).join(';'), '100;Aktif;'); ok(/;Diarsipkan;5000000$/.test(lines[2]), lines[2]);
  });
  test('tombol dan pengendali CSV transaksi, akun, laporan; laporan memakai filter yang sama dengan cetak', () => {
    const h = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), lap = fs.readFileSync(path.join(root, 'src/js/features/laporan/laporan.js'), 'utf8');
    for (const a of ['exportCsv', 'exportAccountsCsv', 'exportLaporanCsv']) ok(h.includes('data-act="' + a + '"'), a);
    ok(lap.includes('function laporanHasData(data, range) { return laporanTxns(data, range).length > 0; }'), 'satu sumber filter');
    ok(lap.includes('buildTxnCsv(data, txns)'), 'laporan memakai buildTxnCsv');
  });
}

console.log('kalkulator kolom nominal (v1.1.119)');
{
  const sb = vm.createContext({});
  { const k = fs.readFileSync(path.join(root, 'src/js/features/profil/kalkulator.js'), 'utf8'); vm.runInContext(k.slice(k.indexOf('function calcNormalize'), k.indexOf('// ---------- papan kalkulator')), sb); }
  const ev = (s, o) => { sb.__s = s; sb.__o = o || { dec: false, neg: false }; return vm.runInContext('calcResultFor(__s, __o)', sb); };
  test('calcEval: empat operasi, prioritas, kurung, minus unary, kali/bagi simbol lain, titik ribuan diabaikan', () => {
    eq(ev('25000+15000*2'), 55000); eq(ev('150000/3'), 50000); eq(ev('(1000+500)*2'), 3000); eq(ev('10-2-3'), 5); eq(ev('2*3+4*5'), 26);
    eq(ev('5×4'), 20); eq(ev('20÷4'), 5); eq(ev('9−4'), 5); eq(ev('12x3'), 36); eq(ev('1.500+500'), 2000); eq(ev('-5+8', { neg: true }), 3);
    eq(ev('2*-3', { neg: true }), -6); eq(ev('--4'), 4);
  });
  test('calcEval: persen (dari angka di kirinya untuk + dan -), desimal koma', () => {
    eq(ev('200000+10%'), 220000); eq(ev('200000-25%'), 150000); eq(ev('50%*200'), 100); eq(ev('200000*10%'), 20000);
    eq(ev('10,5*2', { dec: true }), 21); eq(ev('1/3', { dec: true }), 0.3333); eq(ev('10/4'), 3);   // tanpa desimal dibulatkan (2,5 -> 3)
  });
  test('calcEval: rumus tidak sah -> null (tanpa eval, tanpa melempar galat)', () => {
    for (const s of ['', '+', '5+', '*5', '5**2', '(5+3', '5+3)', '10/0', '1,2,3', 'abc', '5+a', 'alert(1)', ',', '()', '1e5', '5%%x'])
      eq(ev(s, { dec: true, neg: true }), null, 'harus null: ' + s);
  });
  test('calcResultFor: negatif ditolak bila kolom tak boleh minus; di atas batas ditolak', () => {
    eq(ev('3-5'), null); eq(ev('3-5', { neg: true }), -2); eq(ev('9999999999999+1'), null);
  });
  test('calcLooksLikeExpr: minus di depan bukan rumus; operator di tengah, kurung, persen = rumus', () => {
    const l = s => { sb.__s = s; return vm.runInContext('calcLooksLikeExpr(__s)', sb); };
    eq([l('-5000'), l('5000'), l('5.000,5'), l('5+3'), l('5-3'), l('(5)'), l('10%'), l('5x3'), l('')], [false, false, false, true, true, true, true, true, false]);
  });
  test('terpasang: kolom nominal memakai rumus, papan kalkulator punya pengendali, file masuk cache', () => {
    const u = fs.readFileSync(path.join(root, 'src/js/core/util-ui.js'), 'utf8'), k = fs.readFileSync(path.join(root, 'src/js/features/profil/kalkulator.js'), 'utf8');
    ok(u.includes('calcLooksLikeExpr(text.value)') && u.includes('commitExpr'), 'enhanceMoney');
    for (const fn of ['calcOpen', 'calcClose', 'calcKey', 'calcClear', 'calcBack', 'calcEquals', 'calcApply']) ok(new RegExp('function ' + fn + '\\(').test(k), fn);
    ok(!/\beval\s*\(|new Function/.test(k), 'tanpa eval');
  });
}

// ---------- v1.1.114: rute web (hash) ----------
{
  const src = f => fs.readFileSync(path.join(root, f), 'utf8');
  const rt = src('src/js/core/rute.js');
  const ctx = {}; vm.createContext(ctx);
  ctx.TAB_NAMES = ['ringkasan', 'akun', 'transaksi', 'titipan', 'tagihan', 'laporan', 'profil'];
  vm.runInContext(rt.slice(rt.indexOf('function parseRoute'), rt.indexOf('function routeTitle')), ctx);
  const P = h => JSON.stringify(vm.runInContext('parseRoute(' + JSON.stringify(h) + ')', ctx));
  test('parseRoute: tab dikenal, detail akun, dan alamat tidak sah', () => {
    eq(P('#/akun'), '{"tab":"akun","accId":null}');
    eq(P('#/laporan/'), '{"tab":"laporan","accId":null}');
    eq(P('#/akun/a1'), '{"tab":"akun","accId":"a1"}');
    eq(P('#/akun/a%20b%2Fc'), '{"tab":"akun","accId":"a b/c"}');
    eq(P(''), 'null'); eq(P('#'), 'null'); eq(P('#/ngawur'), 'null'); eq(P('#/laporan/a1'), 'null'); eq(P('#/akun/%E0%A4%A'), 'null'); eq(P('akun'), 'null');
  });
  test('buildRoute: bolak-balik dengan parseRoute, id di-encode', () => {
    eq(vm.runInContext("buildRoute('akun', 'x y/1')", ctx), '#/akun/x%20y%2F1');
    eq(vm.runInContext("buildRoute('laporan', 'abaikan')", ctx), '#/laporan');
    eq(P(vm.runInContext("buildRoute('akun', 'x y/1')", ctx)), '{"tab":"akun","accId":"x y/1"}');
  });
  test('rute terpasang: setTab, buka/tutup detail akun, dan startup memanggilnya', () => {
    ok(/routeOnTabChange\(name\)/.test(src('src/js/core/navigasi.js')), 'setTab');
    ok(/routeOnDetailOpen\(id\)/.test(src('src/js/features/akun/akun-detail.js')) && /routeOnDetailClose\(\)/.test(src('src/js/features/akun/akun-detail.js')), 'detail akun');
    ok(/applyRoute\(\);/.test(src('src/js/core/startup.js')), 'startup');
    ok(rt.includes("addEventListener('popstate'") && rt.includes('closeTopSheetOnBack(); applyRoute();'), 'popstate');
    ok(/MutationObserver/.test(rt) && /attributeFilter: \['class'\]/.test(rt), 'pengamat sheet');
  });
}

// ---------- v1.1.116: kunci app (PIN) ----------
{
  const src = f => fs.readFileSync(path.join(root, f), 'utf8');
  const kc = src('src/js/features/profil/kunci-aplikasi.js');
  const store = {};
  const ctx = { crypto: require('crypto').webcrypto, TextEncoder, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } }, Date, Math, JSON, console };
  vm.createContext(ctx);
  vm.runInContext(kc.slice(kc.indexOf('const PIN_KEY'), kc.indexOf('// ---------- tampilan layar kunci')), ctx);
  const R = code => vm.runInContext(code, ctx);
  test('pinValid: tepat 6 angka', () => {
    eq(R("[pinValid('123456'), pinValid('12345'), pinValid('1234567'), pinValid('12a456'), pinValid(''), pinValid(' 123456')].join()"), 'true,false,false,false,false,false');
  });
  test('lockDelayMs: jeda tiap kelipatan 5 salah, berlipat dua, maks 15 menit', () => {
    eq(R("[0,1,4,5,6,9,10,15,20,25,30,100].map(lockDelayMs).join()"), '0,0,0,30000,0,0,60000,120000,240000,480000,900000,900000');
  });
  test('pinStore/pinVerify: PIN benar lolos, salah ditolak, hash berbeda per salt dan tidak menyimpan PIN polos', () => {
    const { execFileSync } = require('child_process');
    const script = `
      const fs = require('fs'), vm = require('vm'), assert = require('assert');
      const kc = fs.readFileSync(${JSON.stringify(path.join(root, 'src/js/features/profil/kunci-aplikasi.js'))}, 'utf8');
      const store = {};
      const ctx = { crypto: require('crypto').webcrypto, TextEncoder, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } }, Date, Math, JSON };
      vm.createContext(ctx);
      vm.runInContext(kc.slice(kc.indexOf('const PIN_KEY'), kc.indexOf('// ---------- tampilan layar kunci')), ctx);
      (async () => {
        assert.ok(await vm.runInContext("pinStore('135790')", ctx), 'tersimpan');
        assert.ok(await vm.runInContext("pinVerify('135790')", ctx), 'PIN benar');
        assert.ok(!(await vm.runInContext("pinVerify('135791')", ctx)), 'PIN salah');
        const raw = store['kp_pin']; assert.ok(raw && !raw.includes('135790'), 'PIN polos tersimpan'); assert.strictEqual(JSON.parse(raw).kdf, 'pbkdf2');
        const h1 = await vm.runInContext("pinHash('111111', 'aa')", ctx), h2 = await vm.runInContext("pinHash('111111', 'bb')", ctx); assert.notStrictEqual(h1.hash, h2.hash);
        assert.strictEqual(vm.runInContext('lockEnabled()', ctx), true);
        console.log('OK');
      })().catch(e => { console.error(e.message); process.exit(1); });`;
    eq(execFileSync(process.execPath, ['-e', script]).toString().trim(), 'OK');
  });
  test('kunci terpasang: startup, handler data-act, tombol Profil, dan Lupa PIN tidak membuat backup', () => {
    ok(/initLock\(\);/.test(src('src/js/core/startup.js')), 'startup');
    const html = src('index.html');
    for (const a of ['lockKey', 'lockBackspace', 'lockForgot', 'lockCancel', 'lockSetupStart', 'lockChangeStart', 'lockDisableStart', 'lockNow']) ok(html.includes('data-act="' + a + '"'), a);
    ok(!/autoBackupBeforeReset/.test(kc.slice(kc.indexOf('async function lockForgot'), kc.indexOf('function lockUpdateProfil'))), 'lupa PIN memanggil backup');
    ok(/role="dialog" aria-modal="true"/.test(html.slice(html.indexOf('id="lock-screen"') - 60, html.indexOf('id="lock-screen"') + 120)), 'dialog aksesibel');
  });
}

console.log('target tabungan (v1.1.120)');
{
  const { sb } = makeSandbox(NOW);
  test('sanitizeGoals: buang yang rusak, tenggat/akun dirapikan, manual saja yang punya saved', () => {
    sb.__r = [null, { name: '', target: 5 }, { name: 'x', target: -1 }, { name: 'Motor', target: 12000000, deadline: '2027-03-31', accountId: 'a1', saved: 999 },
      { name: 'Modal', target: 5e6, deadline: 'besok', accountId: '', saved: 1e6 }];
    const r = run(sb, 'sanitizeGoals(__r)');
    eq(r.length, 2); eq(r[0].saved, 0); eq(r[0].deadline, '2027-03-31'); eq(r[1].deadline, ''); eq(r[1].saved, 1000000);
    eq(run(sb, 'sanitizeGoals("x")'), []);
  });
  test('goalMonthsLeft: tanpa tenggat null, lewat/hari ini 0, selain itu dibulatkan ke atas min 1', () => {
    eq(run(sb, "[goalMonthsLeft('', '2026-09-15'), goalMonthsLeft('2026-09-15', '2026-09-15'), goalMonthsLeft('2026-09-01', '2026-09-15'), goalMonthsLeft('2026-09-20', '2026-09-15'), goalMonthsLeft('2026-12-14', '2026-09-15'), goalMonthsLeft('2026-12-15', '2026-09-15'), goalMonthsLeft('2027-01-09', '2026-10-09'), goalMonthsLeft('2026-03-31', '2026-01-31'), goalMonthsLeft('2026-12-16', '2026-09-15')]"),
      [null, 0, 0, 1, 3, 3, 3, 2, 4]);
  });
  test('computeGoal: akun terhubung pakai saldo, saran setoran per bulan, selesai, lewat tenggat, akun hilang', () => {
    const c = (g, b) => { sb.__g = g; sb.__b = b; return run(sb, "computeGoal(__g, __b, '2026-09-15')"); };
    let r = c({ target: 12000000, deadline: '2026-12-14', accountId: 'a1', saved: 0 }, { a1: 3000000 });
    eq(r.saved, 3000000); eq(r.remaining, 9000000); eq(r.monthsLeft, 3); eq(r.perMonth, 3000000); eq(Math.round(r.pct), 25);
    r = c({ target: 1000000, deadline: '', accountId: '', saved: 250000 }, {});
    eq(r.saved, 250000); eq(r.perMonth, 0); eq(r.overdue, false);
    r = c({ target: 1000000, deadline: '2026-09-01', accountId: '', saved: 0 }, {}); eq(r.overdue, true); eq(r.perMonth, 0);
    r = c({ target: 1000000, deadline: '', accountId: 'a1', saved: 0 }, { a1: 1500000 }); eq(r.done, true); eq(r.pct, 100); eq(r.remaining, 0);
    r = c({ target: 1000000, deadline: '', accountId: 'zz', saved: 0 }, { a1: 5 }); eq(r.accountMissing, true); eq(r.saved, 0);
    r = c({ target: 100000, deadline: '2026-10-20', accountId: '', saved: 0 }, {}); eq(r.monthsLeft, 2); eq(r.perMonth, 50000);
    r = c({ target: 1000000, deadline: '', accountId: 'a1', saved: 0 }, { a1: -500 }); eq(r.saved, 0);
  });
  test('mergeImportedGoals: lewati yang sama, petakan akun, akun tak dikenal jadi manual', () => {
    sb.__d = { accounts: [{ id: 'n1' }], goals: [{ name: 'Motor', target: 12000000, deadline: '', accountId: '', saved: 0 }] };
    sb.__p = { goals: [{ name: 'Motor', target: 12000000 }, { name: 'Liburan', target: 3000000, accountId: 'old', saved: 5 }, { name: 'Modal', target: 2000000, accountId: 'gone', saved: 700000 }] };
    sb.__m = { old: 'n1' };
    run(sb, 'mergeImportedGoals(__d, __p, __m)');
    eq(sb.__d.goals.length, 3); eq(sb.__d.goals[1].accountId, 'n1'); eq(sb.__d.goals[1].saved, 0);
    eq(sb.__d.goals[2].accountId, ''); eq(sb.__d.goals[2].saved, 0);
  });
  test('target terpasang: kartu, form, setoran, ekspor, dan penyimpanan di index.html/src/js/features/data/import-export.js', () => {
    const src = f => fs.readFileSync(path.join(root, f), 'utf8'); const html = src('index.html'), ie = src('src/js/features/data/import-export.js');
    ['goal-card', 'goal-list', 'goal-form', 'goal-deposit-form', 'goal-account-input'].forEach(id => ok(html.indexOf('id="' + id + '"') >= 0, id));
    ok(/goals: sanitizeGoals\(data\.goals\)/.test(ie), 'ekspor memuat goals');
    ok(/mergeImportedGoals\(goalsHolder/.test(ie), 'impor ganti-semua memuat goals');
    ['openGoalForm', 'saveGoalForm', 'deleteGoal', 'openGoalDeposit', 'saveGoalDeposit', 'onGoalAccountChange'].forEach(fn => ok(typeof sb[fn] === 'function' || run(sb, 'typeof ' + fn) === 'function', fn));
  });
}

console.log('label transaksi (v1.1.121)');
{
  const { sb } = makeSandbox(NOW);
  test('sanitizeTags: rapikan, buang kembar (huruf besar/kecil), maksimal 5, 24 huruf', () => {
    eq(run(sb, "sanitizeTags(' #Kebun , kebun;  Lebaran  baru ,, ')"), ['Kebun', 'Lebaran baru']);
    eq(run(sb, "sanitizeTags(['a','b','c','d','e','f'])"), ['a', 'b', 'c', 'd', 'e']);
    eq(run(sb, "sanitizeTags(['x'.repeat(40)])")[0].length, 24);
    eq(run(sb, "sanitizeTags([1, null, {}, 'ok'])"), ['ok']); eq(run(sb, 'sanitizeTags(5)'), []);
    eq(run(sb, "parseTagsInput('a, b')"), ['a', 'b']);
  });
  test('applyTags: set bila ada, hapus bila kosong; tagsText', () => {
    eq(run(sb, "applyTags({ id: 1 }, ['a'])"), { id: 1, tags: ['a'] });
    eq(run(sb, "applyTags({ id: 1, tags: ['a'] }, [])"), { id: 1 });
    eq(run(sb, "tagsText(['a', 'b c'])"), '#a #b c');
  });
  test('collectTags dan summarizeTags: gabung huruf besar/kecil, hitung per jenis, transfer diabaikan', () => {
    sb.__t = [{ type: 'keluar', amount: 100, tags: ['Kebun', 'bibit'] }, { type: 'keluar', amount: 50, tags: ['kebun'] }, { type: 'masuk', amount: 400, tags: ['KEBUN'] },
      { type: 'transfer', amount: 999, tags: ['kebun'] }, { type: 'keluar', amount: 5 }];
    const c = run(sb, 'collectTags(__t)'); eq(c[0].key, 'kebun'); eq(c[0].tag, 'Kebun'); eq(c[0].count, 4); eq(c[1].tag, 'bibit');
    const s = run(sb, 'summarizeTags(__t)');
    eq(s.length, 2); eq(s[0].tag, 'Kebun'); eq(s[0].keluar, 150); eq(s[0].masuk, 400); eq(s[0].count, 3); eq(s[1].keluar, 100);
  });
  test('buildTxnCsv memuat kolom Label; buildTxnFromImport menjaga label yang valid', () => {
    sb.__d = { accounts: [{ id: 'a', name: 'Kas', type: 'kas' }], txns: [{ id: 't', date: '2026-09-01', type: 'keluar', amount: 5, accountId: 'a', desc: 'x', category: 'Lainnya', tags: ['kebun', 'bibit'] }] };
    const line = run(sb, 'buildTxnCsv(__d, __d.txns)').slice(1).split('\r\n')[1];
    ok(/;kebun, bibit$/.test(line), line);
    const r = run(sb, "buildTxnFromImport({ date: '2026-09-01', type: 'keluar', amount: 5, accountId: 'a', desc: 'x', tags: [' #Kebun ', 'kebun', 7] }, { a: 'n1' }, 'n1')");
    eq(r.tags, ['Kebun']);
    eq(run(sb, "buildTxnFromImport({ date: '2026-09-01', type: 'keluar', amount: 5, accountId: 'a', desc: 'x' }, { a: 'n1' }, 'n1')").tags, undefined);
  });
  test('label terpasang: form, filter, laporan, simpan, pencarian, detail', () => {
    const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
    const html = rd('index.html');
    ['tags-input', 'tags-suggest', 'tag-filter-row', 'laporan-tag-list'].forEach(id => ok(html.indexOf('id="' + id + '"') >= 0, id));
    ok(/parseTagsInput\(\$\('tags-input'\)\.value\)/.test(rd('src/js/features/akun/akun-aset-tagihan.js')), 'addTxn membaca label');
    ok((rd('src/js/features/akun/akun-aset-tagihan.js').match(/applyTags\(/g) || []).length >= 5, 'semua jalur simpan memakai applyTags');
    ok(/activeTagFilter/.test(rd('src/js/core/render-utama.js')) && /tagsText\(txnTags\(t\)\)\.toLowerCase/.test(rd('src/js/core/render-utama.js')), 'filter dan pencarian');
    ok(/renderLaporanTagCard/.test(rd('src/js/features/laporan/laporan.js')) && /renderTagFilters/.test(rd('src/js/core/navigasi.js')) && /setTagsInput/.test(rd('src/js/features/transaksi/form-transaksi.js')), 'laporan, tab, form');
    ['toggleTagSuggest', 'renderTagSuggest'].forEach(fn => eq(run(sb, 'typeof ' + fn), 'function'));
  });
}

console.log('tombol kalkulator di kolom nominal (v1.1.122)');
{
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  test('enhanceMoney memasang tombol kalkulator permanen yang memanggil calcOpenFor; bungkus ikut disembunyikan', () => {
    const u = rd('src/js/core/util-ui.js'), k = rd('src/js/features/profil/kalkulator.js'), css = rd('src/css/app.css');
    ok(/className = 'cmoney-calc no-print'/.test(u) && /calcOpenFor\(text\)/.test(u), 'tombol dan panggilan');
    ok(/aria-label', 'Buka kalkulator'/.test(u), 'label aksesibel');
    ok(/wrap\.hidden = native\.hidden/.test(u), 'bungkus mengikuti native');
    ok(/function calcOpenFor\(text\)/.test(k), 'calcOpenFor');
    ok(/\.cmoney-calc \{/.test(css) && /\.cmoney-wrap > input\.cmoney/.test(css), 'gaya tombol dan kolom');
  });
}

console.log('perbaikan edit transaksi (v1.1.123)');
{
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  test('Kembali buatan app sendiri (tutup detail lalu buka form Edit) tidak menutup form yang baru dibuka', () => {
    const r = rd('src/js/core/rute.js');
    ok(/let selfBacks = 0/.test(r) && /selfBacks\+\+; history\.back\(\)/.test(r), 'penghitung back sendiri');
    ok(/if \(selfBacks > 0\) \{ selfBacks--; applyRoute\(\); return; \}/.test(r), 'popstate sendiri dilewati');
  });
  test('kategori "Lainnya" (sama dengan penanda kategori buatan) tetap bisa disimpan: nama kosong = Lainnya', () => {
    const a = rd('src/js/features/akun/akun-aset-tagihan.js');
    ok(/catCustomEl\.value\.trim\(\) \|\| CATEGORY_CUSTOM/.test(a), 'fallback ke Lainnya');
    ok(a.indexOf('Isi nama kategorinya dulu') < 0, 'penolakan lama dihapus');
  });
}

console.log('grafik tren/utang berupa garis dan kartu nilai akun seragam (v1.1.124)');
{
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  test('monotonePathD: kurva tidak melampaui titik data (tanpa overshoot) dan melewati semua titik', () => {
    const g = rd('src/js/features/laporan/grafik.js');
    const s = g.indexOf('  function smoothPathD'), e = g.indexOf('  function monotonePathD'), e2 = g.indexOf('  // Satu pemilih periode');
    const ctx = vm.createContext({}); vm.runInContext(g.slice(s, e2), ctx);
    const xs = [0, 10, 20, 30, 40, 50], ys = [100, 40, 40, 90, 10, 10];
    const d = vm.runInContext('monotonePathD(' + JSON.stringify(xs) + ',' + JSON.stringify(ys) + ')', ctx);
    const nums = d.replace(/[MC]/g, ' ').trim().split(/[\s,]+/).map(Number);
    ok(nums.length === 2 + 5 * 6, 'jumlah titik');
    for (let i = 0; i < 5; i++) {
      const seg = nums.slice(2 + i * 6, 8 + i * 6), lo = Math.min(ys[i], ys[i + 1]) - 1e-6, hi = Math.max(ys[i], ys[i + 1]) + 1e-6;
      ok(seg[1] >= lo && seg[1] <= hi && seg[3] >= lo && seg[3] <= hi, 'segmen ' + i + ' melampaui: ' + seg.join(','));
      eq(seg[4], xs[i + 1]); eq(seg[5], ys[i + 1]);
    }
    eq(vm.runInContext('monotonePathD([0,10],[1,2])', ctx), 'M0.00,1.00 L10.00,2.00');
  });
  test('grafik Tren dan Utang digambar sebagai garis (tanpa batang), ada ringkasan seperti Cashflow', () => {
    const g = rd('src/js/features/laporan/grafik.js'), d = rd('src/js/features/akun/tren-utang.js'), h = rd('index.html');
    const tr = g.slice(g.indexOf('  function renderTrendChart'), g.indexOf('  function dayShortLabel'));
    ok(tr.indexOf('<rect') < 0 && /monotonePathD\(xs, ys\)/.test(tr) && /<circle/.test(tr), 'tren: garis dan titik');
    const dt = d.slice(d.indexOf('  function renderDebtTrendChart'));
    ok(dt.indexOf('<rect') < 0 && /monotonePathD\(xs, ys\)/.test(dt) && /debt-trend-chart-perm-labels/.test(dt), 'utang: garis dan label');
    ok(/id="trend-summary"/.test(h) && /id="debt-trend-summary" style="font-size:13px/.test(h), 'ringkasan di atas grafik');
  });
  test('kartu Nilai akun memakai baris yang sama dengan Transaksi terbaru (titik warna + nama + jenis), tanpa garis aksen kiri', () => {
    const g = rd('src/js/features/laporan/grafik.js');
    const f = g.slice(g.indexOf('  function renderAccountValues'));
    ok(f.indexOf('acc-accent') < 0 && /<div class="txn-row">/.test(f) && /txn-meta">\$\{escapeHtml\(TYPE_LABELS\[acc\.type\]/.test(f), 'baris seragam');
  });
}

console.log('kartu terpisah Kategori + Label, Tren/Utang mengikuti periode (v1.1.125)');
{
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  const g = rd('src/js/features/laporan/grafik.js');
  const bctx = vm.createContext({}); vm.runInContext(g.slice(g.indexOf('  function chartBuckets'), g.indexOf('  function bucketAxisLabel')), bctx);
  const B = (d, t) => JSON.parse(vm.runInContext('JSON.stringify(chartBuckets(' + d + ', "' + t + '"))', bctx));
  test('chartBuckets: 1H dan 7H harian, 30H per 5 hari berurutan tanpa celah, 180H/360H bulanan sampai hari ini', () => {
    eq(B(1, '2026-10-11').map(b => b.key), ['2026-10-10', '2026-10-11']);
    const w = B(7, '2026-10-11'); eq(w.length, 7); eq(w[0].from, '2026-10-05'); eq(w[6].to, '2026-10-11');
    const s = B(30, '2026-10-11'); eq(s.length, 6); eq(s[0].from, '2026-09-12'); eq(s[5].to, '2026-10-11'); eq(s[5].from, '2026-10-07');
    for (let i = 1; i < s.length; i++) { const nxt = new Date(s[i - 1].to + 'T12:00:00Z'); nxt.setUTCDate(nxt.getUTCDate() + 1); eq(nxt.toISOString().slice(0, 10), s[i].from); }
    const m6 = B(180, '2026-10-11'); eq(m6.map(b => b.key), ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    eq(m6[0].from, '2026-05-01'); eq(m6[0].to, '2026-05-31'); eq(m6[5].to, '2026-10-11');
    const m12 = B(360, '2026-10-11'); eq(m12.length, 12); eq(m12[0].key, '2025-11');
    eq(B(0, '2026-10-11').length, 6);
  });
  test('computeDebtAtDates sama dengan computeDebtTrend pada tanggal akhir bulan', () => {
    const { sb } = makeSandbox(NOW);
    sb.__d = { accounts: [{ id: 'cc', name: 'KK', type: 'kartu_kredit', initialBalance: -1000 }, { id: 'k', name: 'Kas', type: 'kas', initialBalance: 0 }],
      txns: [{ id: 'a', date: '2026-08-10', type: 'keluar', amount: 500, accountId: 'cc' }, { id: 'b', date: '2026-09-05', type: 'transfer', amount: 300, accountId: 'k', toAccountId: 'cc' }] };
    const tr = run(sb, "computeDebtTrend(__d, '2026-10-11')");
    sb.__dates = tr.map(t => t.date);
    eq(run(sb, 'computeDebtAtDates(__d, __dates)'), tr.map(t => t.total));
    eq(run(sb, "computeDebtAtDates(__d, ['2026-08-09', '2026-08-10', '2026-09-05'])"), [1000, 1500, 1200]);
  });
  test('tagChartItems: per jenis, terbesar dulu, di atas 8 label digabung jadi "Label lain" yang tak bisa diketuk', () => {
    const { sb } = makeSandbox(NOW);
    sb.__t = [{ type: 'keluar', amount: 100, tags: ['a', 'b'] }, { type: 'keluar', amount: 300, tags: ['b'] }, { type: 'masuk', amount: 50, tags: ['a'] }, { type: 'transfer', amount: 9, tags: ['a'] }];
    const k = run(sb, "tagChartItems(__t, 'keluar')"); eq(k.map(x => [x.category, x.amount]), [['#b', 400], ['#a', 100]]);
    eq(run(sb, "tagChartItems(__t, 'masuk')").map(x => x.category), ['#a']);
    sb.__many = Array.from({ length: 10 }, (_, i) => ({ type: 'keluar', amount: 100 + i, tags: ['t' + i] }));
    const many = run(sb, "tagChartItems(__many, 'keluar')"); eq(many.length, 8); eq(many[7].category, 'Label lain'); eq(many[7].noPick, true);
    eq(many.reduce((s, x) => s + x.amount, 0), 1045);
  });
  test('terpasang: kartu Kategori dan Label di luar grup grafik, Tren/Utang tanpa judul 6 bulan, pie bersama', () => {
    const html = rd('index.html'), nav = rd('src/js/core/navigasi.js');
    const i = html.indexOf('<div id="chart-group">'); let depth = 0, end = -1;
    for (const m of html.slice(i).matchAll(/<div|<\/div/g)) { depth += m[0] === '<div' ? 1 : -1; if (depth === 0) { end = i + m.index; break; } }
    const grp = html.slice(i, end);
    ok(grp.indexOf('id="category-chart-card"') < 0 && grp.indexOf('id="tag-chart-card"') < 0, 'kartu di luar grup');
    ok(html.indexOf('id="category-chart-card"') > end && html.indexOf('id="tag-chart-card"') > end, 'kartu setelah grup');
    ok(/id="trend-title"/.test(html) && /id="debt-trend-title"/.test(html) && html.indexOf('6 bulan terakhir)</div>') < 0, 'judul dinamis');
    ok(/renderCategoryChart\(data\)/.test(nav) && /renderTagChart\(data\)/.test(nav), 'dirender dari tab Ringkasan');
    ok((g.match(/drawPieChart\(/g) || []).length >= 2 && /drawPieChart\(svg, legend, tagChartItems/.test(rd('src/js/features/transaksi/label.js')), 'pie bersama');
    ok(/trendPeriodDays = days/.test(g), 'setChartPeriod mengisi periode tren');
  });
  test('dasbor desktop: kotak cari, kartu angka, panel Akun terpasang dan ids unik', () => {
    const html = rd('index.html'), nav = rd('src/js/core/navigasi.js'), css = rd('src/css/app.css');
    ['desk-search-input', 'desk-stats', 'ds-net', 'ds-aset', 'ds-utang', 'desk-accounts', 'desk-accounts-list', 'desk-eye-icon'].forEach(id => ok((html.match(new RegExp('id="' + id + '"', 'g')) || []).length === 1, id));
    ok(/renderDeskDash\(data, balances, totalBalance, ad\)/.test(nav) && /function deskSearchSubmit/.test(nav), 'fungsi terpasang');
    ok(/\.desk-search, \.desk-stats, \.desk-accounts, \.sb-toggle \{ display: none; \}/.test(css), 'tersembunyi di layar kecil');
  });
  test('menu samping bisa diciutkan: tombol, fungsi, dan kelas CSS terpasang', () => {
    const html = rd('index.html'), nav = rd('src/js/core/navigasi.js'), css = rd('src/css/app.css');
    ok((html.match(/id="sb-toggle"/g) || []).length === 1 && /data-act="toggleSidebar"/.test(html), 'tombol');
    ok(/function toggleSidebar/.test(nav) && /kp_sidebar/.test(nav) && /sb-collapsed/.test(nav), 'fungsi');
    ok(/\.sb-collapsed body \{ padding-left: 72px; \}/.test(css) && /\.sb-toggle \{ display: none; \}/.test(css), 'css');
  });
  test('grafik desktop: chartDims dipakai empat grafik, netWorthSeries dibagi, kartu angka punya delta dan garis mini', () => {
    const g = rd('src/js/features/laporan/grafik.js'), d = rd('src/js/features/akun/tren-utang.js'), html = rd('index.html');
    ok((g.match(/= chartDims\(svg,/g) || []).length === 3 && /chartDims\(svg, 170, 230\), padBottom/.test(d), 'empat grafik');
    ok(!/const W = 320, H = 1[57]0/.test(g + d), 'tanpa ukuran tetap');
    ok(/function netWorthSeries/.test(g) && /netWorthSeries\(data, DAYS\)/.test(g), 'deret dibagi');
    ['ds-net-d', 'ds-net-s', 'ds-aset-d', 'ds-aset-s', 'ds-utang-d', 'ds-utang-s'].forEach(id => ok((html.match(new RegExp('id="' + id + '"', 'g')) || []).length === 1, id));
  });
  test('tabel Transaksi desktop: judul kolom, sortTxnBy, sel baris, CSS', () => {
    const html = rd('index.html'), nav = rd('src/js/features/akun/render-akun-transaksi.js'), r = rd('src/js/core/render-utama.js'), css = rd('src/css/app.css');
    ok((html.match(/id="txn-thead"/g) || []).length === 1 && (html.match(/data-act="sortTxnBy"/g) || []).length === 3, 'judul kolom');
    ok(/function sortTxnBy/.test(nav) && /function updateTxnHead/.test(nav) && /updateTxnHead\(\);/.test(r), 'fungsi terpasang');
    ok(/class="tc tc-date"/.test(r) && /class="tc tc-cat"/.test(r) && /class="tc tc-acc"/.test(r) && /txn-extra x-both/.test(r), 'sel baris');
    ok(/\.txn-thead, \.tc, \.txn-extra \{ display: none; \}/.test(css), 'tersembunyi di layar kecil');
  });
  // ---- v1.1.133: roadmap desktop D4 s.d. D8 ----
  test('D4 deskAccountGroups: kelompok Aset/Utang, titipan dan arsip tidak ikut, subtotal dan pemakaian limit', () => {
    const { sb } = makeSandbox(NOW);
    run(sb, `var __g = { accounts: [
      { id: 'k', name: 'Kas', type: 'kas', initialBalance: 1000000 },
      { id: 'b', name: 'Bank', type: 'bank', initialBalance: 5000000 },
      { id: 'x', name: 'Lama', type: 'bank', initialBalance: 0, archived: true },
      { id: 'tt', name: 'Titipan', type: 'titipan', initialBalance: 300000 },
      { id: 'c', name: 'Kartu', type: 'kartu_kredit', initialBalance: -4500000, limit: 5000000 },
      { id: 'cn', name: 'Kartu bebas', type: 'kartu_kredit', initialBalance: -100000 },
      { id: 'pl', name: 'PayLater', type: 'paylater', initialBalance: -800000, limit: 2000000 } ], txns: [] };`);
    const g = run(sb, 'deskAccountGroups(__g, computeAllBalances(__g), 8)');
    eq(g.map(x => x.key), ['aset', 'utang']);
    eq(g[0].rows.map(r => r.id), ['b', 'k']); eq(g[0].total, 6000000);
    eq(g[1].rows.map(r => r.id), ['c', 'pl', 'cn']); eq(g[1].total, 4500000 + 800000 + 100000);
    eq(g[1].rows[0].usage, { used: 4500000, limit: 5000000, pct: 90 });
    eq(g[1].rows[1].usage.pct, 40); eq(g[1].rows[2].usage, null); eq(g[0].rows[0].usage, null);
    ok(g.every(x => x.rows.every(r => r.id !== 'x' && r.id !== 'tt')), 'arsip/titipan tidak ikut');
  });
  test('D4 deskAccountGroups: batas per kelompok dan jumlah "lebih"; kelompok kosong disembunyikan', () => {
    const { sb } = makeSandbox(NOW);
    const g = run(sb, `(function () { const d = { accounts: [], txns: [] }; for (let i = 1; i <= 5; i++) d.accounts.push({ id: 'a' + i, name: 'A' + i, type: 'kas', initialBalance: i * 1000 });
      return deskAccountGroups(d, computeAllBalances(d), 3); })()`);
    eq(g.length, 1); eq(g[0].rows.length, 3); eq(g[0].lebih, 2); eq(g[0].rows[0].id, 'a5');
  });
  test('D4 panel Akun: ikon untuk semua jenis akun, kelompok, bar limit, dan CSS terpasang', () => {
    const nav = rd('src/js/core/navigasi.js'), css = rd('src/css/app.css');
    const types = run(makeSandbox(NOW).sb, 'Object.keys(TYPE_LABELS)').filter(t => t !== 'titipan');
    types.forEach(t => ok(new RegExp('\\b' + t + ': \'<').test(nav), 'ikon ' + t));
    ok(/deskAccountGroups\(data, balances, 8\)/.test(nav) && /class="da-group"/.test(nav) && /class="da-bar"/.test(nav) && /class="da-more"/.test(nav), 'render');
    ['\\.da-group \\{', '\\.da-ico \\{', '\\.da-bar-fill\\.hi', '\\.da-more \\{'].forEach(r => ok(new RegExp(r).test(css), r));
  });
  test('D5 bar atas menempel: header sticky satu baris di >=1280 px, offset sticky lain lewat --desk-top', () => {
    const css = rd('src/css/app.css'), i = css.indexOf('@media screen and (min-width: 1280px)'), blk = css.slice(i);
    ok(/header \{ position: sticky; top: 0; z-index: 60; display: flex; align-items: center;/.test(blk), 'header sticky');
    ok(/header h1 \{ order: -1; margin: 0;/.test(blk) && /:root \{ --desk-top: 84px; \}/.test(blk), 'judul sebaris, --desk-top');
    ok(!/top: 24px; max-height: calc\(100vh - 48px\)/.test(css), 'offset lama diganti');
    ok((css.match(/var\(--desk-top, 24px\)/g) || []).length >= 4, 'panel sticky memakai --desk-top');
  });
  test('D6 form sebagai panel samping: txn-form dan acc-form meluncur dari kanan di >=1280 px', () => {
    const css = rd('src/css/app.css'), blk = css.slice(css.indexOf('@media screen and (min-width: 1280px)'));
    ok(/#txn-form\.sheet-overlay, #acc-form\.sheet-overlay \{ align-items: stretch; justify-content: flex-end; \}/.test(blk), 'overlay ke kanan');
    ok(/#txn-form \.sheet-panel, #acc-form \.sheet-panel \{ width: 460px;/.test(blk) && /@keyframes deskPanelIn/.test(blk) && /prefers-reduced-motion: reduce\) \{ #txn-form/.test(blk), 'panel, animasi, reduced-motion');
  });
  test('D7 pintasan keyboard: "/" cari, N catat, [ sidebar; mati saat mengetik, ada dialog, atau layar sempit', () => {
    const src = rd('src/js/core/navigasi.js'), m = src.match(/function deskShortcutAction[\s\S]*?\n  \}\n/);
    ok(m, 'fungsi ada');
    const f = new Function(m[0] + '; return deskShortcutAction;')();
    const base = { wide: true, typing: false, mod: false, overlay: false };
    eq([f('/', base), f('n', base), f('N', base), f('[', base), f('x', base)], ['cari', 'catat', 'catat', 'sidebar', '']);
    ['typing', 'mod', 'overlay'].forEach(k => eq(f('n', Object.assign({}, base, { [k]: true })), '', k));
    eq(f('/', Object.assign({}, base, { wide: false })), '', 'layar sempit');
    ok(/addEventListener\('keydown', onDeskShortcut\)/.test(src) && /class="desk-kbd"/.test(rd('index.html')), 'terpasang');
  });
  test('D8 tema gelap: aturan desktop baru hanya memakai variabel warna (tanpa hex), bayangan boleh rgba', () => {
    const css = rd('src/css/app.css'), a = css.indexOf('.da-group {'), b = css.indexOf('@media (prefers-reduced-motion: reduce) { #txn-form');
    ok(a > 0 && b > a, 'blok ada');
    css.slice(a, b).split('\n').forEach(l => { const decl = l.slice(l.indexOf('{') + 1); ok(!/#[0-9A-Fa-f]{3,8}\b/.test(decl), 'hex di: ' + l.trim().slice(0, 60)); if (/rgba?\(/.test(l)) ok(/box-shadow/.test(l), 'rgba bukan bayangan: ' + l.trim().slice(0, 60)); });
  });
  // ---- v1.1.134: perapian desktop D9 s.d. D11 ----
  test('D9 Ringkasan: dua kolom kartu mulai 1440 px, kartu Nilai akun disembunyikan di desktop (dobel dengan panel Akun)', () => {
    const css = rd('src/css/app.css');
    ok(/@media screen and \(min-width: 1440px\) \{\s*#tab-ringkasan\.active \{ grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\) 340px; \}/.test(css), 'tiga kolom grid di 1440');
    ok(!/@media screen and \(min-width: 1600px\) \{\s*#tab-ringkasan\.active/.test(css), 'aturan 1600 lama dipindah');
    ok(/#account-values-card \{ display: none !important; \}/.test(css), 'Nilai akun tersembunyi');
  });
  test('D10 Tagihan: kalender bulanan dua kolom mulai 1440 px', () => {
    ok(/#tagihan-calendar-list \{ display: grid; grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\);/.test(rd('src/css/app.css')), 'grid dua kolom');
  });
  test('D11 catatan proyeksi ada di dalam baris (tidak margin negatif) dan tanggal build mengikuti rilis', () => {
    const html = rd('index.html'), r = rd('src/js/core/render-utama.js');
    ok(/<div class="acc-sub" id="month-projection-note"><\/div><\/div>\s*<\/div>\s*<div class="txn-right"><span class="txn-amount keluar" id="month-projection">/.test(html), 'catatan di dalam txn-text');
    ok(!/id="month-projection-note" style="margin:-4px/.test(html), 'tanpa margin negatif');
    ok(/APP_VERSION = 'v1\.1\.169'/.test(r) && /APP_BUILD = '14 Okt 2026'/.test(r), 'versi dan tanggal build');
  });
  test('cetak laporan: blok rata dengan kepala laporan, panah dan "Tampilkan N lagi" disembunyikan', () => {
    const css = rd('src/css/app.css'), u = rd('src/js/features/laporan/laporan-utang.js');
    const pr = css.slice(css.indexOf('@media print {'), css.indexOf('/* ===== Sinkron cloud'));
    ok(/#tab-laporan \.chart-card \{ padding: 0; \}/.test(pr), 'kartu laporan tanpa padding di cetak');
    ok(/\.laporan-cats \.cat-list \{ padding: 0; \}/.test(pr), 'daftar kategori tanpa padding di cetak');
    ok(/\.adv-chev, \.adv-more-toggle \{ display: none !important; \}/.test(pr), 'panah dan tombol lipat tersembunyi');
    ok((u.match(/adv-more-toggle/g) || []).length === 2, 'kelas dipasang di dua tempat');
  });
}

console.log('grafik kecil kartu akun (v1.1.137)');
{
  const { sb } = makeSandbox(NOW);
  run(sb, `var S = { accounts: [
    { id: 'k', name: 'Kas', type: 'kas', initialBalance: 100000 },
    { id: 'b', name: 'Bank', type: 'bank', initialBalance: 0 },
    { id: 'c', name: 'Kartu', type: 'kartu_kredit', initialBalance: -500000 },
    { id: 't', name: 'Budi', type: 'titipan', initialBalance: 0 },
    { id: 'z', name: 'Lama', type: 'bank', initialBalance: 5, archived: true } ], txns: [
    { id: '1', type: 'masuk', amount: 50000, accountId: 'k', date: '2026-08-01' },
    { id: '2', type: 'keluar', amount: 30000, accountId: 'k', date: '2026-09-10' },
    { id: '3', type: 'transfer', amount: 20000, accountId: 'k', toAccountId: 'b', date: '2026-09-12' },
    { id: '4', type: 'transfer', amount: 100000, accountId: 'b', toAccountId: 'c', date: '2026-09-14' } ] };`);
  test('sparkDates: tanggal berjarak sama, terakhir = hari ini', () => {
    eq(run(sb, `sparkDates('2026-09-15', 30, 16)`), run(sb, `Array.from({length: 16}, (_, i) => new Date(Date.UTC(2026, 8, 15) - Math.round(30 * (15 - i) / 15) * 86400000).toISOString().slice(0, 10))`));
    eq(run(sb, `sparkDates('2026-09-15', 30, 16)[15]`), '2026-09-15');
    eq(run(sb, `sparkDates('2026-09-15', 30, 16)[0]`), '2026-08-16');
  });
  test('computeAccountSparklines: saldo per tanggal, titipan dan arsip dilewati, akhir = saldo kini', () => {
    const r = run(sb, `computeAccountSparklines(S, '2026-09-15', 30, 16)`);
    eq(Object.keys(r).sort(), ['b', 'c', 'k']);
    eq(r.k[0], 150000); eq(r.k[15], 100000);
    eq(r.b[0], 0); eq(r.b[15], -80000 + 0);
    eq(r.c[0], -500000); eq(r.c[15], -400000);
    const bal = run(sb, `computeAllBalances(S)`);
    eq(r.k[15], bal.k); eq(r.b[15], bal.b); eq(r.c[15], bal.c);
  });
  test('computeSummarySparklines: aset, utang, kekayaan bersih sama dengan computeAssetDebt di titik terakhir; limit diskalakan', () => {
    run(sb, `var S2 = JSON.parse(JSON.stringify(S)); S2.accounts[2].limit = 1000000; S2.accounts.push({ id: 'tt', name: 'Budi2', type: 'titipan', initialBalance: 25000 });`);
    const r = run(sb, `computeSummarySparklines(S2, '2026-09-15', 30, 16)`);
    const ad = run(sb, `computeAssetDebt(S2, computeAllBalances(S2))`);
    eq(r.aset.length, 16);
    eq(r.aset[15], ad.aset); eq(r.utang[15], ad.utang); eq(r.net[15], ad.aset - ad.utang);
    eq(r.net[0], r.aset[0] - r.utang[0]);
    eq(r.utang[0], 500000); eq(r.utang[15], 480000);
    ok(r.limit && r.limit.length === 16 && r.limit[15] === 40 && r.limit[0] === 50, JSON.stringify(r.limit));
    eq(run(sb, `computeSummarySparklines(S, '2026-09-15', 30, 16).limit`), null);
  });
  test('assetDebtOf: kartu lebih bayar = aset, titipan negatif = utang', () => {
    eq(run(sb, `assetDebtOf({ type: 'kartu_kredit' }, 5)`), { aset: 5, utang: 0 });
    eq(run(sb, `assetDebtOf({ type: 'titipan' }, -7)`), { aset: 0, utang: 7 });
    eq(run(sb, `assetDebtOf({ type: 'bank' }, -3)`), { aset: 0, utang: 3 });
  });
  test('sparkHtml: datar = kosong; utang digambar sebagai jumlah utang; label menyebut arah', () => {
    eq(run(sb, `sparkHtml([5, 5, 5], false)`), '');
    eq(run(sb, `sparkHtml([1], false)`), '');
    const h = run(sb, `sparkHtml([-500000, -400000], true)`);
    ok(/<svg class="acc-spark"/.test(h) && /Utang turun Rp100\.000/.test(h), h);
    ok(/Saldo naik/.test(run(sb, `sparkHtml([1, 5], false)`)));
  });
}
console.log('pecah transaksi per keterangan (v1.1.139, v1.1.141)');
{
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  const { sb } = makeSandbox(NOW);
  test('validateSplitParts: tiap baris wajib keterangan dan jumlah > 0, minimal dua, maksimal lima; total otomatis', () => {
    let r = run(sb, `validateSplitParts([{ desc: ' Telur  ', amount: '60000' }, { desc: 'Sabun', amount: 40000 }])`);
    ok(r.ok); eq(r.total, 100000); eq(r.parts[0].desc, 'Telur'); eq(r.parts[0].amount, 60000);
    ok(!run(sb, `validateSplitParts([{ desc: '', amount: 5 }, { desc: 'B', amount: 5 }])`).ok);
    ok(!run(sb, `validateSplitParts([{ desc: 'A', amount: 0 }, { desc: 'B', amount: 5 }])`).ok);
    r = run(sb, `validateSplitParts([{ desc: 'A', amount: 5 }])`);
    ok(!r.ok && /minimal dua/.test(r.error), r.error);
    ok(!run(sb, `validateSplitParts([1,2,3,4,5,6].map(i => ({ desc: 'x' + i, amount: 1 })))`).ok);
    r = run(sb, `validateSplitParts([{ desc: 'Telur', amount: 5 }, { desc: 'Telur', amount: 7 }])`);
    ok(r.ok && r.parts.length === 2 && r.total === 12, 'keterangan sama boleh, tidak digabung');
  });
  test('splitTotalOf: total struk otomatis = jumlah baris; kosong/tidak valid dihitung 0', () => {
    eq(run(sb, `splitTotalOf([{ amount: '60000' }, { amount: 40000 }])`), 100000);
    eq(run(sb, `splitTotalOf([{ amount: '' }, { amount: 'abc' }, { amount: -5 }, { amount: 1500.5 }])`), 1500.5);
    eq(run(sb, `splitTotalOf([])`), 0);
  });
  test('buildSplitTxns: satu transaksi per keterangan, satu kategori, berbagi splitId, tanggal, akun, label', () => {
    const r = run(sb, `(function () { let n = 0; return buildSplitTxns({ date: '2026-09-15', type: 'keluar', accountId: 'k', category: 'Belanja harian' }, [{ desc: 'Telur', amount: 60000 }, { desc: 'Sabun', amount: 40000 }], 'split-1', ['kebun'], p => p + '-' + (++n)); })()`);
    eq(r.length, 2); eq(r[0].id, 'txn-1'); eq(r[1].splitId, 'split-1'); eq(r[0].tags, ['kebun']);
    eq(r.reduce((s, t) => s + t.amount, 0), 100000); eq(r[1].desc, 'Sabun'); eq(r[0].category, 'Belanja harian'); eq(r[1].category, 'Belanja harian'); eq(r[0].accountId, 'k');
  });
  test('splitSiblings: hanya bila lebih dari satu; cleanSplitId menolak karakter aneh; saldo dan anggaran ikut benar', () => {
    run(sb, `var SP = { accounts: [{ id: 'k', name: 'Kas', type: 'kas', initialBalance: 200000 }], budgets: { 'Belanja harian': 50000 }, txns: [
      { id: 'a', type: 'keluar', amount: 60000, accountId: 'k', date: '2026-09-10', category: 'Belanja harian', desc: 'Telur', splitId: 's1' },
      { id: 'b', type: 'keluar', amount: 40000, accountId: 'k', date: '2026-09-10', category: 'Belanja harian', desc: 'Sabun', splitId: 's1' },
      { id: 'c', type: 'keluar', amount: 5000, accountId: 'k', date: '2026-09-11', category: 'Hiburan', splitId: 's2' } ] };`);
    eq(run(sb, `splitSiblings(SP.txns, SP.txns[1]).map(t => t.id)`), ['a', 'b']);
    eq(run(sb, `splitSiblings(SP.txns, SP.txns[2])`), []);
    eq(run(sb, `cleanSplitId('x y')`), ''); eq(run(sb, `cleanSplitId('split-ab_1')`), 'split-ab_1');
    eq(run(sb, `computeAllBalances(SP).k`), 95000);
    const bs = run(sb, `computeBudgetStatus(SP, '2026-09')`);
    ok(bs.some(b => b.category === 'Belanja harian' && b.spent === 100000 && b.status === 'over'), JSON.stringify(bs));
  });
  test('terpasang: form pecah per keterangan, hook simpan, penanda Pecahan, detail, impor membawa splitId', () => {
    const html = rd('index.html'), f = rd('src/js/features/transaksi/form-transaksi.js'), a = rd('src/js/features/akun/akun-aset-tagihan.js'), imp = rd('src/js/features/data/import-export.js');
    ok(/id="split-box"/.test(html) && /id="split-desc-4"/.test(html) && /id="split-amt-4"/.test(html) && /id="split-cat-4"/.test(html), 'markup lima baris keterangan + kategori per baris');
    ok(/saveSplitTxn\(category, tags\)/.test(a), 'addTxn memanggil saveSplitTxn');
    ok(/splitSiblings\(data\.txns, t\)/.test(f) && /resetSplitUI\(\)/.test(f), 'detail dan reset form');
    ok(/cleanSplitId\(t\.splitId\)/.test(imp), 'impor membawa splitId');
    ok(/' · Pecahan'/.test(rd('src/js/core/render-utama.js')), 'penanda di daftar');
  });
}
console.log('kategori otomatis dari keterangan (v1.1.142)');
{
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  const { sb } = makeSandbox(NOW);
  const sug = (d, ty, tx) => run(sb, `suggestCategory(${JSON.stringify(d)}, ${JSON.stringify(ty)}, ${JSON.stringify(tx || [])})`);
  test('normalizeDescTokens: huruf kecil, buang tanda baca, angka, dan kata umum', () => {
    eq(run(sb, `normalizeDescTokens('Bayar Listrik, PLN 2026!')`), ['listrik', 'pln']);
    eq(run(sb, `normalizeDescTokens('Beli telur 1 kg')`), ['telur']);
    eq(run(sb, `normalizeDescTokens('')`), []);
  });
  test('kata kunci bawaan memilih kategori yang tepat; tanpa kecocokan = null', () => {
    eq(sug('Beli bensin motor', 'keluar').category, 'Transportasi');
    eq(sug('Token listrik PLN', 'keluar').category, 'Tagihan & langganan');
    eq(sug('beras 5 kg', 'keluar').category, 'Belanja harian');
    eq(sug('Nasi goreng warung', 'keluar').category, 'Makan & minum');
    eq(sug('Obat batuk', 'keluar').category, 'Kesehatan');
    eq(sug('Gaji Oktober', 'masuk').category, 'Gaji');
    eq(sug('Jual motor lama', 'masuk').category, 'Jual barang');
    eq(sug('xyz asdf', 'keluar'), null);
    eq(sug('bensin', 'transfer'), null);
    eq(sug('bensin', 'keluar').source, 'kata kunci');
  });
  test('riwayat mengalahkan kata kunci dan memilih kategori terbanyak; kategori sistem tidak disarankan', () => {
    const h = [
      { type: 'keluar', desc: 'Telur', category: 'Makan & minum', date: '2026-09-01' },
      { type: 'keluar', desc: 'Telur ayam', category: 'Makan & minum', date: '2026-09-05' },
      { type: 'keluar', desc: 'Telur', category: 'Belanja harian', date: '2026-08-01' },
      { type: 'keluar', desc: 'Servis motor', category: 'Bunga & biaya bank', date: '2026-09-02' } ];
    const r = sug('Telur 1 kg', 'keluar', h);
    eq(r.category, 'Makan & minum'); eq(r.source, 'riwayat');
    eq(sug('Servis motor', 'keluar', h).category, 'Transportasi');   // kategori sistem diabaikan, jatuh ke kata kunci
    eq(sug('Telur', 'masuk', h), null);   // jenis lain tidak ikut
  });
  test('terpasang: hint, kolom keterangan, pilihan manual menang', () => {
    const html = rd('index.html'), f = rd('src/js/features/transaksi/form-transaksi.js');
    ok(/id="cat-auto-hint"/.test(html) && /id="desc-input"[^>]*data-input-act="onDescInput"/.test(html), 'hint dan handler');
    ok((html.match(/data-input-act="onSplitDescInput"/g) || []).length === 5, 'lima baris pecah');
    ok(/this && this\.id === 'category-select'\) \{ state\.catManual = true/.test(f), 'pilihan manual');
  });
}
console.log('perbandingan bulan per kategori (v1.1.143)');
{
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  const { sb } = makeSandbox(NOW);
  const J = JSON.stringify;
  test('rentang: bulan digeser per kalender, bulan berjalan dipotong ke jumlah hari yang sama', () => {
    const full = run(sb, `laporanCompareRanges('bulanan', {start:'2026-09-01', end:'2026-09-30'}, '2026-10-14')`);
    eq(full.prev, { start: '2026-08-01', end: '2026-08-31' }); eq(full.partial, false);
    const part = run(sb, `laporanCompareRanges('bulanan', {start:'2026-10-01', end:'2026-10-31'}, '2026-10-14')`);
    eq(part.cur, { start: '2026-10-01', end: '2026-10-14' }); eq(part.prev, { start: '2026-09-01', end: '2026-09-14' }); eq(part.partial, true);
    const mar = run(sb, `laporanCompareRanges('bulanan', {start:'2026-03-01', end:'2026-03-31'}, '2026-10-14')`);
    eq(mar.prev, { start: '2026-02-01', end: '2026-02-28' });
    const jan = run(sb, `laporanCompareRanges('bulanan', {start:'2026-01-01', end:'2026-01-31'}, '2026-10-14')`);
    eq(jan.prev, { start: '2025-12-01', end: '2025-12-31' });
    const w = run(sb, `laporanCompareRanges('mingguan', {start:'2026-10-05', end:'2026-10-11'}, '2026-10-14')`);
    eq(w.prev, { start: '2026-09-28', end: '2026-10-04' });
    eq(run(sb, `laporanCompareRanges('alltime', {start:'2026-01-01', end:'2026-10-01'}, '2026-10-14')`), null);
    eq(run(sb, `laporanCompareRanges('bulanan', {start:'2026-11-01', end:'2026-11-30'}, '2026-10-14')`), null);
  });
  const T = [
    { type: 'keluar', category: 'Makan & minum', amount: 1000000, date: '2026-09-05' },
    { type: 'keluar', category: 'Makan & minum', amount: 1320000, date: '2026-10-05' },
    { type: 'keluar', category: 'Transportasi', amount: 400000, date: '2026-09-06' },
    { type: 'keluar', category: 'Transportasi', amount: 410000, date: '2026-10-06' },
    { type: 'keluar', category: 'Hiburan', amount: 200000, date: '2026-09-07' },
    { type: 'keluar', category: 'Kesehatan', amount: 300000, date: '2026-10-07' },
    { type: 'keluar', category: 'Jajan', amount: 10000, date: '2026-09-08' },
    { type: 'masuk', category: 'Gaji', amount: 5000000, date: '2026-09-02' },
    { type: 'masuk', category: 'Gaji', amount: 3000000, date: '2026-10-02' } ];
  const cur = { start: '2026-10-01', end: '2026-10-14' }, prev = { start: '2026-09-01', end: '2026-09-14' };
  test('computeCategoryComparison: selisih, persen, urut dari selisih terbesar; utang & penyesuaian tidak dihitung', () => {
    const tx = T.concat([{ type: 'keluar', category: 'Bunga & biaya bank', amount: 999, date: '2026-10-03', isDebtPayment: true }, { type: 'keluar', category: 'Penyesuaian saldo', amount: 777777, date: '2026-10-03' }]);
    const rows = run(sb, `computeCategoryComparison(${J(tx)}, 'keluar', ${J(cur)}, ${J(prev)})`);
    eq(rows[0].category, 'Makan & minum'); eq(rows[0].diff, 320000); eq(rows[0].pct, 32);
    ok(!rows.some(r => r.category === 'Penyesuaian saldo'), 'penyesuaian saldo ikut terhitung');
    const kes = rows.find(r => r.category === 'Kesehatan'); eq(kes.prev, 0); eq(kes.pct, null);
  });
  test('catatan otomatis: naik/turun >=20% dan >=Rp50.000, kategori baru/hilang, ambang kecil diabaikan', () => {
    const rows = run(sb, `computeCategoryComparison(${J(T)}, 'keluar', ${J(cur)}, ${J(prev)})`);
    const n = run(sb, `buildComparisonNotes(${J(rows)}, 'keluar', '')`);
    const txt = n.map(x => x.text).join('|');
    ok(/Makan & minum naik 32%/.test(txt), 'naik 32%');
    ok(/Kesehatan baru muncul/.test(txt), 'baru');
    ok(/Hiburan tidak ada/.test(txt), 'hilang');
    ok(!/Transportasi/.test(txt), 'perubahan 2,5% tidak jadi catatan');
    ok(!/Jajan/.test(txt), 'selisih Rp10.000 diabaikan');
    eq(n.find(x => /Makan/.test(x.text)).tone, 'bad'); eq(n.find(x => /Hiburan/.test(x.text)).tone, 'good');
    const m = run(sb, `buildComparisonNotes(computeCategoryComparison(${J(T)}, 'masuk', ${J(cur)}, ${J(prev)}), 'masuk', 'Pemasukan ')`);
    ok(/Pemasukan Gaji turun 40%/.test(m[0].text), 'gaji turun'); eq(m[0].tone, 'bad');
  });
  test('terpasang: modul di index.html, kartu dipanggil dari Laporan, tidak ada fungsi ganda', () => {
    ok(/laporanCategoryCompareHtml\(data, range\)/.test(rd('src/js/features/laporan/laporan-proyeksi.js')), 'dipanggil');
    ok(/Perubahan per kategori/.test(rd('src/js/features/laporan/bandingkan.js')), 'judul kartu');
  });
}
console.log('foto struk (v1.1.144)');
{
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  const { sb } = makeSandbox(NOW);
  const J = JSON.stringify;
  test('photoScaleSize: sisi terpanjang dibatasi, rasio terjaga, gambar kecil tidak dibesarkan', () => {
    eq(run(sb, `photoScaleSize(4000, 3000, 1280)`), { w: 1280, h: 960 });
    eq(run(sb, `photoScaleSize(3000, 4000, 1280)`), { w: 960, h: 1280 });
    eq(run(sb, `photoScaleSize(800, 600, 1280)`), { w: 800, h: 600 });
    eq(run(sb, `photoScaleSize(0, 10, 1280)`), { w: 0, h: 0 });
  });
  test('photoDataUrlBytes dan kuota: batas total dihormati, foto yang diganti tidak dihitung dua kali', () => {
    eq(run(sb, `photoDataUrlBytes('data:image/jpeg;base64,QUJD')`), 3);
    eq(run(sb, `photoDataUrlBytes('data:image/jpeg;base64,QUI=')`), 2);
    eq(run(sb, `photoDataUrlBytes('')`), 0);
    const L = 60 * 1024 * 1024;
    eq(run(sb, `photoQuotaOk(${L - 100}, 100, 0)`), true);
    eq(run(sb, `photoQuotaOk(${L - 100}, 101, 0)`), false);
    eq(run(sb, `photoQuotaOk(${L}, 500, 500)`), true);
  });
  test('kunci foto: splitId dipakai bersama, kunci yatim dibuang, label ukuran', () => {
    eq(run(sb, `photoKeyOf({id:'a', splitId:'s1'})`), 's1');
    eq(run(sb, `photoKeyOf({id:'a'})`), 'a');
    eq(run(sb, `photoOrphanKeys(['a','s1','zz'], ${J([{ id: 'a' }, { id: 'b', splitId: 's1' }])})`), ['zz']);
    eq(run(sb, `photoSizeLabel(2048)`), '2 KB');
    eq(run(sb, `photoSizeLabel(1572864)`), '1,5 MB');
  });
  test('tanpa IndexedDB: app tidak error, foto dianggap tidak didukung', () => {
    eq(run(sb, `photoSupported()`), false);
    eq(run(sb, `txnHasPhoto({id:'x'})`), false);
  });
  test('terpasang: kotak foto di detail, input file, penanda Foto, startup, dan foto tidak ikut data utama', () => {
    const h = rd('index.html');
    ok(/id="txn-photo-box"/.test(h) && /id="txn-photo-file"/.test(h) && /id="photo-view"/.test(h), 'elemen');
    ok(/renderTxnPhotoBox\(t\)/.test(rd('src/js/features/transaksi/form-transaksi.js')), 'detail');
    ok(/txnHasPhoto\(t\)/.test(rd('src/js/core/render-utama.js')), 'penanda');
    ok(/photoLoadMeta\(\)/.test(rd('src/js/core/startup.js')), 'startup');
    ok(!/photo/i.test(rd('src/js/features/data/sync.js')) && !/photo/i.test(rd('src/js/features/data/import-export.js')), 'tidak ikut sinkron/ekspor');
  });
}
console.log('pengingat cadangan lewat notifikasi (v1.1.146)');
{
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  const { sb } = makeSandbox(NOW);
  const J = JSON.stringify;
  const DAY = 86400000, now = Date.parse('2026-10-14T03:00:00Z');
  const due = (info) => run(sb, `backupDueState(${J(info)}, ${now})`);
  test('backupDueState: perlu cadangan bila >=10 transaksi dan (belum pernah atau >=14 hari), kecuali sedang ditunda', () => {
    eq(due({ last: null, snooze: 0, txnCount: 10 }), { need: true, days: null });
    eq(due({ last: null, snooze: 0, txnCount: 9 }).need, false);
    eq(due({ last: new Date(now - 14 * DAY).toISOString(), snooze: 0, txnCount: 50 }), { need: true, days: 14 });
    eq(due({ last: new Date(now - 13 * DAY).toISOString(), snooze: 0, txnCount: 50 }).need, false);
    eq(due({ last: new Date(now - 30 * DAY).toISOString(), snooze: now + DAY, txnCount: 50 }).need, false);
    eq(due({ last: new Date(now - 30 * DAY).toISOString(), snooze: now - 1, txnCount: 50 }).need, true);
    eq(due({ last: 'bukan tanggal', snooze: 0, txnCount: 20 }), { need: true, days: null });
  });
  test('backupNotifBody: kalimat berbeda untuk belum pernah dan sudah N hari', () => {
    ok(/belum pernah/.test(run(sb, `backupNotifBody(null)`)), 'belum pernah');
    ok(/21 hari lalu/.test(run(sb, `backupNotifBody(21)`)), 'N hari');
  });
  test('sw.js memakai fungsi murni yang sama dengan aplikasi (hasil identik untuk banyak masukan)', () => {
    const sw = rd('sw.js');
    const seg = sw.slice(sw.indexOf('// <pengingat-murni>'), sw.indexOf('// </pengingat-murni>'));
    ok(seg.length > 100, 'penanda ada');
    const ctx = {}; vm.createContext(ctx); vm.runInContext(seg + '\nthis.f = backupDueState; this.g = backupNotifBody;', ctx);
    const cases = [];
    [null, new Date(now - 3 * DAY).toISOString(), new Date(now - 14 * DAY).toISOString(), new Date(now - 90 * DAY).toISOString(), 'x'].forEach(l =>
      [0, now + DAY, now - 1].forEach(sn => [0, 9, 10, 500].forEach(n => cases.push({ last: l, snooze: sn, txnCount: n }))));
    cases.forEach(c => eq(JSON.parse(J(ctx.f(c, now))), due(c)));
    [null, 0, 14, 40].forEach(d => eq(ctx.g(d), run(sb, `backupNotifBody(${J(d)})`)));
  });
  test('tanpa dukungan notifikasi di sandbox: status unsupported, tidak error', () => {
    eq(run(sb, `reminderPermission()`), 'unsupported');
    eq(run(sb, `reminderBgSupported()`), false);
    eq(run(sb, `reminderEnabled()`), false);
  });
  test('terpasang: blok Profil, handler sw.js, kartu Ringkasan memakai backupDueState, sinkron keadaan saat ekspor/tunda', () => {
    const h = rd('index.html'), sw = rd('sw.js'), ie = rd('src/js/features/data/import-export.js');
    ok(/id="backup-notif-toggle"/.test(h) && /data-act="toggleBackupNotif"/.test(h) && /data-act="testBackupNotif"/.test(h), 'html');
    ok(/addEventListener\('periodicsync'/.test(sw) && /addEventListener\('notificationclick'/.test(sw), 'sw');
    ok(/backupDueState\(/.test(ie) && (ie.match(/reminderSyncState\(\)/g) || []).length >= 2, 'ekspor dan tunda menyalin keadaan');
    ok(/renderBackupNotifSettings/.test(rd('src/js/core/navigasi.js')) && /reminderSyncState/.test(rd('src/js/core/startup.js')), 'profil dan startup');
  });
}
console.log('kelola label: ubah nama, gabung, hapus (v1.1.147)');
{
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  const { sb } = makeSandbox(NOW);
  const J = JSON.stringify;
  const mk = () => [{ id: 1, type: 'keluar', amount: 10, tags: ['Kebun', 'lebaran'] }, { id: 2, type: 'keluar', amount: 5, tags: ['kebun'] }, { id: 3, type: 'masuk', amount: 7, tags: ['Panen', 'kebun2'] }, { id: 4, type: 'keluar', amount: 1 }];
  const go = (code) => run(sb, `(function(){ const t = ${J(mk())}; const r = ${code}; return { r: r, t: t }; })()`);
  test('ubah nama: semua transaksi berlabel itu ikut, huruf besar/kecil sama dianggap satu', () => {
    const o = go(`renameTagInTxns(t, 'kebun', 'Ladang')`);
    eq(o.r.changed, 2); eq(o.r.merged, false); eq(o.r.to, 'Ladang');
    eq(o.t[0].tags, ['Ladang', 'lebaran']); eq(o.t[1].tags, ['Ladang']); eq(o.t[2].tags, ['Panen', 'kebun2']); eq(o.t[3].tags, undefined);
  });
  test('gabung: nama baru = label lain yang sudah ada; ejaan yang ada dipakai, tanpa label kembar, maksimal 5', () => {
    const o = go(`renameTagInTxns(t, 'kebun', 'PANEN')`);
    eq(o.r.merged, true); eq(o.r.to, 'Panen'); eq(o.t[0].tags, ['Panen', 'lebaran']); eq(o.t[1].tags, ['Panen']);
    const dup = run(sb, `(function(){ const t=[{tags:['a','b']}]; renameTagInTxns(t,'a','B'); return t[0].tags; })()`);
    eq(dup, ['b']);
    const cap = run(sb, `(function(){ const t=[{tags:['a','b','c','d','e']}]; renameTagInTxns(t,'a','z'); return t[0].tags.length; })()`);
    eq(cap, 5);
  });
  test('nama kosong ditolak; ganti huruf besar/kecil label sendiri jalan; hapus label hanya melepasnya', () => {
    const e = go(`renameTagInTxns(t, 'kebun', '  ##  ')`);
    ok(e.r.error, 'ada pesan'); eq(e.r.changed, 0); eq(e.t[0].tags, ['Kebun', 'lebaran']);
    const c = go(`renameTagInTxns(t, 'kebun', 'KEBUN')`);
    eq(c.r.merged, false); eq(c.t[0].tags, ['KEBUN', 'lebaran']);
    const d = go(`deleteTagInTxns(t, 'kebun')`);
    eq(d.r.changed, 2); eq(d.t[0].tags, ['lebaran']); eq(d.t[1].tags, undefined); eq(d.t.length, 4);
  });
  test('terpasang: sheet Kelola label, chip di filter, handler global', () => {
    const h = rd('index.html'), l = rd('src/js/features/transaksi/label.js');
    ok(/id="tag-manager"/.test(h) && /id="tag-manager-list"/.test(h) && /data-act="closeTagManager"/.test(h), 'html');
    ok(!/\$\('tag-rename-input'\)/.test(l), 'elemen dinamis diambil dengan getElementById, bukan $() yang menyimpan hasil lama');
    ok(/openTagManager/.test(l) && /saveTagRenameFromInput/.test(l) && /deleteTagEverywhere/.test(l) && /'data-act', 'openTagManager'/.test(l), 'js');
  });
}
console.log('label di transaksi berulang (v1.1.148)');
{
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  const { sb } = makeSandbox(NOW); // 15 Sep 2026
  const mk = (subs) => ({ accounts: [{ id: 'a', name: 'Bank', type: 'bank', initialBalance: 0 }], txns: [], subscriptions: subs });
  const s0 = (o) => Object.assign({ id: 's1', name: 'Listrik', amount: 100000, accountId: 'a', day: 5, active: true, lastAppliedMonth: '2026-08' }, o || {});
  test('sanitizeSubscriptions menjaga label: dirapikan, tanpa kembar, maksimal 5; tanpa label = tidak ada kunci tags', () => {
    sb.__r = [s0({ tags: ['rumah', 'Rumah', '#bulanan', 'a', 'b', 'c', 'd'] }), s0({ id: 's2', name: 'Gaji' })];
    eq(run(sb, 'sanitizeSubscriptions(__r)[0].tags'), ['rumah', 'bulanan', 'a', 'b', 'c']);
    eq(run(sb, "'tags' in sanitizeSubscriptions(__r)[1]"), false);
  });
  test('transaksi yang dibuat otomatis membawa label langganan (salinan, bukan rujukan yang sama)', () => {
    sb.__d = mk([s0({ tags: ['rumah', 'bulanan'] })]);
    const txs = run(sb, 'applySubscriptions(__d).txns.map(t => [t.id, t.tags])');
    eq(txs.length, 1); eq(txs[0][1], ['rumah', 'bulanan']);
    sb.__d = mk([s0()]);
    eq(run(sb, 'applySubscriptions(__d).txns.map(t => "tags" in t)'), [false]);
  });
  test('ubah nama/hapus label ikut ke transaksi berulang', () => {
    sb.__s = [{ tags: ['Rumah'] }, { tags: ['rumah', 'x'] }, {}];
    run(sb, "renameTagInTxns(__s, 'rumah', 'Kantor')");
    eq(run(sb, '__s.map(s => s.tags)'), [['Kantor'], ['Kantor', 'x'], undefined]);
    run(sb, "deleteTagInTxns(__s, 'kantor')");
    eq(run(sb, '__s.map(s => s.tags)'), [undefined, ['x'], undefined]);
  });
  test('terpasang: isian label di form langganan, simpan, daftar kelola label memuat langganan', () => {
    const h = rd('index.html'), c = rd('src/js/features/perencanaan/langganan.js'), l = rd('src/js/features/transaksi/label.js');
    ok(/id="sub-tags-input"/.test(h) && /sub-tags-input/.test(c), 'form');
    ok(/data\.subscriptions/.test(l), 'kelola label memuat langganan');
  });
}
console.log('ubah target tabungan (v1.1.149)');
{
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  test('terpasang: tombol Ubah per target, mode ubah di formulir yang sama, tenggat lama boleh tetap', () => {
    const h = rd('index.html'), g = rd('src/js/features/perencanaan/target.js');
    ok(/id="goal-submit-btn"/.test(h) && /id="goal-cancel-edit-btn"/.test(h) && /id="goal-form-heading"/.test(h), 'html');
    ok(/data-act="startGoalEdit"/.test(g) && /function startGoalEdit/.test(g) && /function cancelGoalEdit/.test(g), 'fungsi');
    ok(/orig && orig\.deadline === deadline/.test(g) && /Object\.assign\(orig,/.test(g), 'ubah di tempat, id tetap');
  });
}
console.log('hapus seluruh struk pecahan (v1.1.150)');
{
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  test('terpasang: tombol Hapus seluruh struk di detail, tampil hanya bila ada pecahan, fungsi menghapus semua baris dan membersihkan foto', () => {
    const h = rd('index.html'), f = rd('src/js/features/transaksi/form-transaksi.js'), p = rd('src/js/features/transaksi/pecah.js');
    ok(/id="txn-detail-delall"/.test(h) && /data-act="deleteSplitFromDetail"/.test(h), 'html');
    ok(/da\.style\.display = sibs\.length \? '' : 'none'/.test(f), 'tampil bersyarat');
    ok(/async function deleteSplitFromDetail/.test(p) && /ids\.has\(x\.id\)/.test(p) && /photoCleanup/.test(p), 'fungsi');
  });
}
console.log('foto struk dari form Tambah transaksi (v1.1.151)');
{
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  test('terpasang: baris foto di form, pemilih/hapus/ganti, simpan bersama transaksi biasa, pecahan, dan cicilan; direset saat buka/tutup form', () => {
    const h = rd('index.html'), f = rd('src/js/features/transaksi/foto-struk.js'), a = rd('src/js/features/akun/akun-aset-tagihan.js'), p = rd('src/js/features/transaksi/pecah.js'), t = rd('src/js/features/transaksi/form-transaksi.js');
    ok(/id="form-photo-row"/.test(h) && /data-act="pickFormPhoto"/.test(h) && /data-change-act="onFormPhotoPicked"/.test(h) && /data-act="removeFormPhoto"/.test(h), 'html');
    ok(/function commitPendingPhoto/.test(f) && /function updateFormPhotoRow/.test(f) && /!state\.editingTxnId && !state\.editingSplitId && state\.currentType !== 'transfer'/.test(f), 'fungsi dan syarat tampil');
    ok(/commitPendingPhoto\(photoKey\)/.test(a) && /commitPendingPhoto\(cicTxn\.id\)/.test(a), 'transaksi biasa dan cicilan');
    ok(/commitPendingPhoto\(splitKey\)/.test(p), 'pecahan memakai splitId');
    ok((t.match(/resetFormPhoto\(\)/g) || []).length >= 3 && /updateFormPhotoRow\(\)/.test(t), 'reset dan sinkron tampilan');
  });
}
console.log('ambang catatan perbandingan bisa diatur (v1.1.152)');
{
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  const { sb } = makeSandbox(NOW);
  const J = JSON.stringify;
  test('sanitizeCmpThresholds: bawaan 20% / Rp50.000; nilai valid dibulatkan; di luar batas atau bukan angka kembali ke bawaan', () => {
    eq(run(sb, `sanitizeCmpThresholds(null)`), { minPct: 20, minAmount: 50000 });
    eq(run(sb, `sanitizeCmpThresholds({minPct: 10.4, minAmount: '100000'})`), { minPct: 10, minAmount: 100000 });
    eq(run(sb, `sanitizeCmpThresholds({minPct: 0, minAmount: -5})`), { minPct: 20, minAmount: 50000 });
    eq(run(sb, `sanitizeCmpThresholds({minPct: 9999, minAmount: 5e12})`), { minPct: 20, minAmount: 50000 });
    eq(run(sb, `sanitizeCmpThresholds({minPct: 'abc', minAmount: 0})`), { minPct: 20, minAmount: 0 });
  });
  test('buildComparisonNotes memakai ambang yang diberikan (lebih longgar = lebih banyak catatan, lebih ketat = lebih sedikit)', () => {
    const rows = [{ category: 'A', cur: 110000, prev: 100000, diff: 10000, pct: 10 }, { category: 'B', cur: 160000, prev: 100000, diff: 60000, pct: 60 }];
    const n = (o) => run(sb, `buildComparisonNotes(${J(rows)}, 'keluar', '', ${J(o)})`).map(x => x.text.split(' ')[0]);
    eq(n({ minPct: 20, minAmount: 50000 }), ['B']);
    eq(n({ minPct: 5, minAmount: 5000 }).sort(), ['A', 'B']);
    eq(n({ minPct: 20, minAmount: 100000 }), []);
    eq(run(sb, `buildComparisonNotes(${J(rows)}, 'keluar', '').length`), 1);
  });
  test('terpasang: bagian Atur ambang di kartu, simpan/kembalikan, dibaca dari localStorage perangkat', () => {
    const c = rd('src/js/features/laporan/bandingkan.js');
    ok(/Atur ambang catatan/.test(c) && /data-act="saveCmpThresholds"/.test(c) && /data-act="resetCmpThresholds"/.test(c), 'ui');
    ok(/cmpThresholds\(\)/.test(c) && /keuangan-ambang-bandingkan-v1/.test(c) && /no-print/.test(c), 'penyimpanan dan tidak ikut cetak');
  });
}
console.log('kategori per baris pecah transaksi (v1.1.153)');
{
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  const { sb } = makeSandbox(NOW);
  const J = JSON.stringify;
  test('validateSplitParts: kategori baris dirapikan, kosong tidak ditulis', () => {
    const r = run(sb, `validateSplitParts(${J([{ desc: 'telur', amount: 20000, category: '  Makanan ' }, { desc: 'sabun', amount: 5000, category: '' }])})`);
    eq(r.ok, true); eq(r.parts[0].category, 'Makanan'); eq('category' in r.parts[1], false);
  });
  test('buildSplitTxns: baris dengan kategori sendiri menimpa kategori utama, lainnya ikut utama', () => {
    const out = run(sb, `(() => { let n = 0; return buildSplitTxns({ date: '2026-09-15', type: 'keluar', accountId: 'a', category: 'Belanja' }, ${J([{ desc: 'telur', amount: 20000, category: 'Makanan' }, { desc: 'sabun', amount: 5000 }])}, 'split-1', [], () => 'id' + (++n)); })()`);
    eq(out.map(t => t.category), ['Makanan', 'Belanja']);
    eq(out.map(t => t.splitId), ['split-1', 'split-1']);
  });
  test('terpasang: select kategori per baris, dibaca saat simpan, detail menandai kategori berbeda', () => {
    const h = rd('index.html'), c = rd('src/js/features/transaksi/pecah.js');
    ok(/id="split-cat-0"/.test(h) && /split-cat-/.test(c) && /populateSplitCats/.test(c), 'form');
    ok(/mixedCat/.test(rd('src/js/features/transaksi/form-transaksi.js')), 'detail');
  });
}
console.log('kategori otomatis per baris pecah transaksi (v1.1.154)');
{
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  test('terpasang: baris ditebak dari keterangan, pilihan manual dihormati, ikut berubah bersama kategori utama', () => {
    const c = rd('src/js/features/transaksi/pecah.js'), k = rd('src/js/features/transaksi/kategori-otomatis.js'), f = rd('src/js/features/transaksi/form-transaksi.js'), h = rd('index.html');
    ok(/function autoSplitCats/.test(c) && /suggestCategory\(d, type, txns\)/.test(c) && /splitCatManual/.test(c), 'autoSplitCats');
    ok(/autoSplitCats/.test(k) && /autoSplitCats/.test(f), 'dipanggil dari input keterangan dan perubahan kategori utama');
    ok(/id="split-cat-3"[^>]*data-change-act="onSplitCatChange"/.test(h), 'tanda manual');
  });
}
console.log('cegah saldo minus (v1.1.155)');
{
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  const { sb } = makeSandbox(NOW);
  const J = JSON.stringify;
  const D = { accounts: [{ id: 'k', name: 'Kas', type: 'kas', initialBalance: 100000 }, { id: 'cc', name: 'Kartu', type: 'kartu_kredit', initialBalance: 0 }, { id: 'old', name: 'Lama', type: 'bank', initialBalance: -20000 }], txns: [{ id: 't1', type: 'keluar', amount: 30000, accountId: 'k', date: '2026-09-01' }] };
  const chk = (add, rm) => run(sb, `overdraftCheck(${J(D)}, ${J(add)}, ${J(rm || [])}).map(x => x.accountId)`);
  test('overdraftCheck: kas/bank/e-wallet yang jadi minus ditandai; kartu kredit tidak', () => {
    eq(chk([{ type: 'keluar', amount: 70000, accountId: 'k' }]), []);
    eq(chk([{ type: 'keluar', amount: 70001, accountId: 'k' }]), ['k']);
    eq(chk([{ type: 'keluar', amount: 9e6, accountId: 'cc' }]), []);
    eq(chk([{ type: 'transfer', amount: 80000, accountId: 'k', toAccountId: 'cc' }]), ['k']);
  });
  test('overdraftCheck: Edit membuang transaksi lama; akun yang sudah minus hanya ditolak bila makin dalam; pemasukan aman', () => {
    eq(chk([{ type: 'keluar', amount: 100000, accountId: 'k' }], ['t1']), []);
    eq(chk([{ type: 'keluar', amount: 1, accountId: 'old' }]), ['old']);
    eq(chk([{ type: 'masuk', amount: 5000, accountId: 'old' }]), []);
  });
  test('terpasang: dicek di transaksi biasa, transfer, dan pecah; pengaturan di Profil', () => {
    ok(/overdraftMessage/.test(rd('src/js/features/akun/akun-aset-tagihan.js')) && /overdraftMessage/.test(rd('src/js/features/transaksi/pecah.js')), 'hook');
    ok(/id="overdraft-toggle"/.test(rd('index.html')) && /toggleOverdraftGuard/.test(rd('src/js/features/transaksi/form-transaksi.js')), 'pengaturan');
  });
}
console.log('cegah saldo minus: bayar pinjaman dan titipan (v1.1.156)');
{
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  test('terpasang: pembayaran bunga+pokok pinjaman dan belanja titipan memeriksa saldo sumber sebelum konfirmasi', () => {
    const a = rd('src/js/features/akun/akun-aset-tagihan.js'), t = rd('src/js/features/titipan/form-titipan.js');
    ok(/overdraftMessage\(data, \[\{ type: 'keluar', amount: bunga[^\n]*\{ type: 'transfer', amount: pokok/.test(a) && a.indexOf('odL') < a.indexOf('const ok = await showConfirm(confirmMsg)', a.indexOf('odL')), 'pinjaman sebelum konfirmasi');
    ok(/overdraftMessage\(data, \[\{ type: 'transfer', amount, accountId: fundSel\.value/.test(t) && t.indexOf('odB') < t.indexOf('Belanjakan'), 'titipan');
  });
}
console.log('halaman Profil dirapikan (v1.1.157)');
{
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  const h = rd('index.html');
  const profil = h.slice(h.indexOf('id="tab-profil"'), h.indexOf('id="app-footer"'));
  test('Profil: kartu status di atas, empat grup lipat, hanya Keamanan & data terbuka bawaan', () => {
    ok(/id="profil-status"/.test(profil) && /id="profil-status-list"/.test(profil) && /id="profil-backup-now"[^>]*data-act="exportJson"/.test(profil), 'kartu status');
    const groups = [...profil.matchAll(/<details class="adv-item profil-group[^"]*" id="(profil-g-[a-z]+)"( open)?>/g)].map(m => [m[1], !!m[2]]);
    eq(groups, [['profil-g-aman', true], ['profil-g-pref', false], ['profil-g-alat', false], ['profil-g-bahaya', false]]);
  });
  test('Profil: id dan aksi lama tetap ada (tidak ada fungsi yang hilang)', () => {
    for (const id of ['profil-name-input', 'overdraft-toggle', 'backup-notif-toggle', 'lock-btn-enable', 'sync-menu-login-btn', 'profil-sync-section', 'import-file', 'reset-import-file', 'ringkasan-cards-config', 'io-msg']) ok(profil.includes('id="' + id + '"'), id);
    for (const a of ['exportJson', 'exportCsv', 'exportAccountsCsv', 'loadDummyData', 'resetAllData', 'resetRingkasanCards', 'syncLogout', 'lockSetupStart']) ok(profil.includes('data-act="' + a + '"'), a);
  });
  test('Profil: saklar seragam dan status diperbarui saat ekspor dan kunci berubah', () => {
    ok(/class="switch" id="overdraft-toggle"/.test(profil) && /class="switch"/.test(rd('src/js/features/laporan/grafik.js')), 'saklar');
    ok(/function renderProfilStatus/.test(rd('src/js/core/navigasi.js')) && /renderProfilStatus/.test(rd('src/js/features/data/import-export.js')) && /renderProfilStatus/.test(rd('src/js/features/profil/kunci-aplikasi.js')), 'pembaruan status');
    ok(/input\[type="checkbox"\]\.switch/.test(rd('src/css/app.css')), 'css menimpa gaya checkbox global');
  });
}
console.log('cetak laporan polos (v1.1.158)');
{
  const css = fs.readFileSync(path.join(root, 'src/css/app.css'), 'utf8');
  const pr = css.slice(css.indexOf('@media print {'), css.indexOf('/* ===== Sinkron cloud'));
  test('cetak Laporan hitam putih: teks hitam, batang warna dan grafik disembunyikan, hemat tinta', () => {
    ok(/#tab-laporan \*[^{]*\{[^}]*color: #000 !important/.test(pr), 'teks hitam');
    ok(/#tab-laporan \.cat-bar[^{]*\{ display: none !important/.test(pr) && /#laporan-trend-chart/.test(pr), 'tanpa batang dan grafik');
    ok(/print-color-adjust: economy/.test(pr), 'tanpa paksa cetak latar');
  });
}
console.log('warna aksen dan mode tampilan di Profil (v1.1.159)');
{
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  test('lima warna aksen: tiap aksen punya aturan terang, gelap manual, dan gelap otomatis; hijau bawaan tanpa atribut', () => {
    const css = rd('src/css/app.css'), nav = rd('src/js/core/navigasi.js');
    for (const n of ['biru', 'ungu', 'oranye', 'mawar']) {
      ok(new RegExp(':root\\[data-accent="' + n + '"\\] \\{ --teal').test(css), n + ' terang');
      ok(new RegExp(':root\\[data-accent="' + n + '"\\]\\[data-theme="dark"\\]').test(css), n + ' gelap manual');
      ok(new RegExp('prefers-color-scheme: dark\\) \\{ :root\\[data-accent="' + n + '"\\]:not').test(css), n + ' gelap otomatis');
      ok(nav.includes("id: '" + n + "'"), n + ' di daftar');
    }
    ok(/id: 'hijau'/.test(nav) && /removeAttribute\('data-accent'\)/.test(nav), 'hijau bawaan');
  });
  test('warna ink tiap aksen terang kontras >= 4.5:1 di atas kertas dan kartu', () => {
    const css = rd('src/css/app.css');
    const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    for (const n of ['biru', 'ungu', 'oranye', 'mawar']) {
      const ink = css.match(new RegExp(':root\\[data-accent="' + n + '"\\] \\{[^}]*--teal-ink: (#[0-9A-Fa-f]{6})'))[1];
      ok(cr(ink, '#F3F6F4') >= 4.5 && cr(ink, '#FFFFFF') >= 4.5, n + ' ' + ink);
    }
  });
  test('Profil: pilihan mode dan warna terpasang, tersimpan di perangkat, diterapkan saat start', () => {
    const h = rd('index.html'), nav = rd('src/js/core/navigasi.js');
    ok(/id="theme-mode-opts"/.test(h) && /id="accent-opts"/.test(h), 'markup');
    ok(/function setAccent/.test(nav) && /function setThemeMode/.test(nav) && /kp_accent/.test(nav) && /applyPalette\(pal\)/.test(nav), 'logika');
  });
}
console.log('palet warna (v1.1.160)');
{
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  const css = rd('src/css/app.css');
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const grab = (re) => { const m = css.match(re); if (!m) return null; const o = {}; for (const x of m[1].matchAll(/--([a-z-]+): (#[0-9A-Fa-f]{6});/g)) o[x[1]] = x[2]; return o; };
  const NAMES = ['laut', 'senja', 'anggur', 'kopi', 'grafit'];
  test('lima palet punya aturan terang, gelap manual, dan gelap otomatis yang sama', () => {
    for (const n of NAMES) {
      const l = grab(new RegExp(':root\\[data-palette="' + n + '"\\] \\{([^}]*)\\}'));
      const d = grab(new RegExp(':root\\[data-palette="' + n + '"\\]\\[data-theme="dark"\\] \\{([^}]*)\\}'));
      const a = grab(new RegExp('prefers-color-scheme: dark\\) \\{ :root\\[data-palette="' + n + '"\\]:not\\(\\[data-theme="light"\\]\\) \\{([^}]*)\\}'));
      ok(l && d && a, n + ' aturan'); eq(d, a, n + ' gelap manual = otomatis');
      for (const k of ['paper', 'paper-dim', 'ink', 'ink-soft', 'line', 'card', 'teal', 'teal-soft', 'teal-ink']) ok(l[k] && d[k], n + ' ' + k);
    }
  });
  test('kontras tiap palet: teks 7:1, teks lembut dan aksen 4,5:1 di atas kertas dan kartu (terang dan gelap)', () => {
    for (const n of NAMES) {
      const l = grab(new RegExp(':root\\[data-palette="' + n + '"\\] \\{([^}]*)\\}')), d = grab(new RegExp(':root\\[data-palette="' + n + '"\\]\\[data-theme="dark"\\] \\{([^}]*)\\}'));
      for (const [mode, t] of [['terang', l], ['gelap', d]]) {
        ok(cr(t.ink, t.paper) >= 7 && cr(t.ink, t.card) >= 7, n + ' ' + mode + ' ink');
        ok(cr(t['ink-soft'], t.paper) >= 4.5 && cr(t['ink-soft'], t.card) >= 4.5, n + ' ' + mode + ' ink-soft');
        ok(cr(t['teal-ink'], t.paper) >= 4.5 && cr(t['teal-ink'], t.card) >= 4.5, n + ' ' + mode + ' teal-ink');
      }
    }
  });
  test('terpasang: pilihan palet di Profil, disimpan, aksen dibuat setelah palet, cetak tidak ikut palet', () => {
    const nav = rd('src/js/core/navigasi.js'), h = rd('index.html');
    ok(/id="palette-opts"/.test(h) && /function setPalette/.test(nav) && /kp_palette/.test(nav) && /PALETTES = \[/.test(nav), 'logika');
    ok(css.indexOf('Palet warna (v1.1.160)') < css.indexOf('Warna aksen (v1.1.159)'), 'urutan CSS: palet lalu aksen');
    const pr = css.slice(css.indexOf('@media print {'));
    ok(/:root\[data-palette\]/.test(pr) && /--paper: #FFFFFF !important/.test(pr), 'cetak selalu putih');
  });
}
console.log('pengingat tenggat target dan jarak cadangan (v1.1.161)');
{
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  const { sb } = makeSandbox(NOW);
  const J = JSON.stringify;
  const mk = (goals, accs) => ({ accounts: accs || [{ id: 'k', name: 'Kas', type: 'kas', initialBalance: 0 }], txns: [], goals });
  const att = (goals) => run(sb, `computeAttentionItems(${J(mk(goals))}, {k: 0}, '2026-09').filter(x => x.kind === 'target')`);
  test('target: tenggat <= 30 hari kuning, lewat tenggat merah, jauh/tercapai/tanpa tenggat diam', () => {
    const g = (o) => Object.assign({ id: 'g1', name: 'Motor', target: 1000000, saved: 200000, deadline: '2026-09-30' }, o);
    const a = att([g({})]); eq(a.length, 1); eq(a[0].level, 'amber'); ok(/15 hari lagi/.test(a[0].title), a[0].title);
    const b = att([g({ deadline: '2026-09-10' })]); eq(b[0].level, 'red'); ok(/lewat tenggat/.test(b[0].title), 'lewat');
    eq(att([g({ deadline: '2026-12-31' })]).length, 0); eq(att([g({ deadline: '' })]).length, 0); eq(att([g({ saved: 1000000 })]).length, 0);
  });
  test('target: beberapa target, yang paling mendesak tampil dengan penanda lainnya', () => {
    const a = att([{ id: 'a', name: 'A', target: 5e5, saved: 0, deadline: '2026-10-05' }, { id: 'b', name: 'B', target: 5e5, saved: 0, deadline: '2026-09-20' }]);
    eq(a.length, 1); ok(/Target B/.test(a[0].title) && /\+1 lainnya/.test(a[0].title), a[0].title);
  });
  test('backupDueState: intervalDays mengganti 14 hari bawaan (7 dan 30), nilai tak valid kembali 14', () => {
    const T = new Date('2026-09-15T12:00:00Z').getTime();
    const due = (iv, d) => run(sb, `backupDueState({ last: ${J(new Date(T - d * 86400000).toISOString())}, snooze: 0, txnCount: 20, intervalDays: ${J(iv)} }, ${T}).need`);
    eq(due(7, 8), true); eq(due(7, 6), false); eq(due(30, 20), false); eq(due(30, 31), true); eq(due(undefined, 15), true); eq(due('x', 10), false); eq(due(-5, 10), false);
  });
  test('terpasang: pilihan 7/14/30 hari di Profil, dipakai kartu Ringkasan, status Profil, dan disalin ke sw.js', () => {
    const h = rd('index.html'), l = rd('src/js/features/profil/pengingat-cadangan.js');
    ok(/id="backup-interval-opts"/.test(h) && /setReminderInterval/.test(l), 'ui');
    ok(/intervalDays: reminderIntervalDays\(\)/.test(rd('src/js/features/data/import-export.js')) && /intervalDays: reminderIntervalDays\(\)/.test(rd('src/js/core/navigasi.js')) && /intervalDays: reminderIntervalDays\(\)/.test(l), 'pemakai');
  });
}
// ---------- v1.1.162: transfer berulang + frekuensi mingguan/tahunan ----------
{
  const { sb } = makeSandbox('2026-10-23T05:00:00Z');
  const mk = (o) => Object.assign({ id: 'w1', name: 'Tabung', amount: 100000, accountId: 'a', toAccountId: 'b', day: 1, active: true, type: 'transfer', category: 'Pindah dana antar akun', freq: 'mingguan', weekday: 1, lastAppliedMonth: '' }, o || {});
  const accs = [{ id: 'a', name: 'Kas', type: 'kas', balance: 0 }, { id: 'b', name: 'Bank', type: 'bank', balance: 0 }];
  const apply = (subs) => { sb.__d = { accounts: JSON.parse(JSON.stringify(accs)), txns: [], subscriptions: subs }; return run(sb, 'applySubscriptions(__d).txns.map(t => [t.id, t.date, t.type, t.accountId, t.toAccountId || null])'); };
  test('mingguan: Senin jatuh 12 minggu terakhir saat lastAppliedDate lama; id memuat tanggal', () => {
    const r = apply([mk({ lastAppliedDate: '2020-01-01' })]);
    eq(r.length, 12); eq(r[11][0], 'sub-w1-2026-10-19'); eq(r[11][2], 'transfer'); eq(r[11][4], 'b');
  });
  test('mingguan: tidak ganda saat dijalankan dua kali', () => {
    sb.__d = { accounts: JSON.parse(JSON.stringify(accs)), txns: [], subscriptions: [mk({ lastAppliedDate: '2026-10-05' })] };
    eq(run(sb, 'applySubscriptions(__d).txns.length'), 2);
    eq(run(sb, 'applySubscriptions(__d).txns.length'), 2);
  });
  test('tahunan: 17 Agu sudah lewat tahun ini -> tercatat 1x; tanggal 31 Feb menyesuaikan', () => {
    const r = apply([mk({ freq: 'tahunan', month: 8, day: 17, weekday: 0, lastAppliedDate: '2025-08-17' })]);
    eq(r.map(x => x[0]), ['sub-w1-2026']);
    eq(r[0][1], '2026-08-17');
  });
  test('sanitize: transfer harus punya tujuan berbeda; mingguan butuh hari valid', () => {
    sb.__r = [mk({ toAccountId: 'a' }), mk({ id: 'x', toAccountId: '' }), mk({ id: 'y', weekday: 9 }), mk({ id: 'z' })];
    eq(run(sb, 'sanitizeSubscriptions(__r).map(s => s.id)'), ['z']);
  });
  test('total bulanan: mingguan x52/12, tahunan /12, transfer tidak dihitung', () => {
    sb.__s = [mk({ type: 'keluar', amount: 1200, freq: 'mingguan' }), mk({ id: 'k', type: 'keluar', amount: 1200, freq: 'tahunan', month: 1 }), mk({ id: 't' })];
    eq(run(sb, 'subMonthlyTotal(__s)'), 5300);
  });
  test('akun tujuan transfer berulang ikut menghalangi pengarsipan', () => {
    sb.__d = { accounts: JSON.parse(JSON.stringify(accs)), txns: [], subscriptions: [mk()] };
    eq(!!run(sb, 'archiveBlockReason(__d, __d.accounts[1])'), true);
  });
}

// ---------- v1.1.163: kata kunci kategori sendiri ----------
{
  const { sb } = makeSandbox('2026-10-23T05:00:00Z');
  test('sanitizeCustomKeywords: kategori tak valid/sistem dibuang, kata dinormalkan dan unik', () => {
    sb.__r = { keluar: { 'Belanja harian': ['Pupuk', ' pupuk ', 'x', 'Benih!!'], 'Lainnya': ['abc'], 'Gaji': ['gaji'] }, masuk: { 'Gaji': ['Upah Harian'] }, aneh: 1 };
    eq(run(sb, 'JSON.stringify(sanitizeCustomKeywords(__r))'), JSON.stringify({ keluar: { 'Belanja harian': ['pupuk', 'benih'] }, masuk: { 'Gaji': ['upah harian'] } }));
    eq(run(sb, 'JSON.stringify(sanitizeCustomKeywords("x"))'), JSON.stringify({ keluar: {}, masuk: {} }));
  });
  test('suggestCategory: kata kunci sendiri menang atas riwayat dan kata bawaan', () => {
    sb.__t = [{ type: 'keluar', category: 'Hiburan', desc: 'pupuk urea', date: '2026-10-01' }];
    sb.__c = { keluar: { 'Belanja harian': ['pupuk'] }, masuk: {} };
    eq(run(sb, 'suggestCategory("beli pupuk urea", "keluar", __t, null, __c)').category, 'Belanja harian');
    eq(run(sb, 'suggestCategory("beli pupuk urea", "keluar", __t, null, __c)').source, 'kata kunci sendiri');
    eq(run(sb, 'suggestCategory("beli pupuk urea", "keluar", __t, null, {keluar:{},masuk:{}})').category, 'Hiburan');
  });
}

// ---------- v1.1.164: periode grafik mini ----------
{
  const { sb } = makeSandbox('2026-10-23T05:00:00Z');
  test('periode grafik mini: bawaan 30, hanya 7/30/90, titik <= 16', () => {
    eq(run(sb, 'sparkDays()'), 30);
    eq(run(sb, 'sparkPoints(7)'), 8); eq(run(sb, 'sparkPoints(90)'), 16);
    eq(run(sb, 'SPARK_PERIODS.join()'), '7,30,90');
  });
  test('sparkDates 7 hari/8 titik: tanggal berurutan tanpa ganda', () => {
    eq(run(sb, 'sparkDates("2026-10-23", 7, 8).join()'), '2026-10-16,2026-10-17,2026-10-18,2026-10-19,2026-10-20,2026-10-21,2026-10-22,2026-10-23');
  });
}

// ---------- v1.1.165: cadangan foto struk ----------
{
  const { sb } = makeSandbox('2026-10-23T05:00:00Z');
  const jpg = 'data:image/jpeg;base64,' + Buffer.from('x'.repeat(300)).toString('base64');
  const txns = [{ id: 't1' }, { id: 't2', splitId: 'sp1' }];
  test('photoParseBackup: format salah -> null', () => {
    sb.__r = { format: 'lain', photos: [] }; eq(run(sb, 'photoParseBackup(__r, [], {})'), null);
    eq(run(sb, 'photoParseBackup(null, [], {})'), null);
  });
  test('photoParseBackup: terima yang valid; yatim, bukan gambar, ganda dan terlalu besar dilewati', () => {
    sb.__r = { format: 'keuangan-foto-v1', photos: [{ id: 't1', data: jpg }, { id: 'sp1', data: jpg }, { id: 'zzz', data: jpg }, { id: 't1', data: jpg }, { id: 't1', data: 'data:text/html;base64,AAAA' }, { id: 'sp1', data: 'data:image/jpeg;base64,' + 'A'.repeat(3 * 1024 * 1024) }] };
    sb.__t = txns;
    eq(run(sb, 'JSON.stringify(photoParseBackup(__r, __t, {}).skipped)'), JSON.stringify({ invalid: 3, orphan: 1, quota: 0 }));
    eq(run(sb, 'photoParseBackup(__r, __t, {}).accept.map(a => a.id).join()'), 't1,sp1');
  });
  test('photoParseBackup: kuota total dihormati (foto lama yang diganti tidak dihitung dua kali)', () => {
    sb.__r = { format: 'keuangan-foto-v1', photos: [{ id: 't1', data: jpg }] };
    sb.__t = txns;
    sb.__m = { t1: 60 * 1024 * 1024 };           // sudah penuh, tapi t1 diganti -> boleh
    eq(run(sb, 'photoParseBackup(__r, __t, __m).accept.length'), 1);
    sb.__m = { lain: 60 * 1024 * 1024 };         // penuh oleh foto lain -> ditolak
    eq(run(sb, 'photoParseBackup(__r, __t, __m).skipped.quota'), 1);
  });
}

// ---------- v1.1.166: edit seluruh struk ----------
{
  const { sb } = makeSandbox('2026-10-23T05:00:00Z');
  const sibs = [{ id: 'a', date: '2026-10-01', type: 'keluar', accountId: 'k', category: 'Belanja harian', desc: 'Telur', amount: 30000, splitId: 's1', tags: ['rumah'] },
    { id: 'b', date: '2026-10-01', type: 'keluar', accountId: 'k', category: 'Belanja harian', desc: 'Gula', amount: 15000, splitId: 's1' },
    { id: 'c', date: '2026-10-01', type: 'keluar', accountId: 'k', category: 'Kesehatan', desc: 'Obat', amount: 20000, splitId: 's1' }];
  test('splitFormFromSiblings: kategori utama = terbanyak, baris lain tetap berkategori sendiri', () => {
    sb.__s = sibs;
    eq(run(sb, 'JSON.stringify(splitFormFromSiblings(__s))'), JSON.stringify({ category: 'Belanja harian', date: '2026-10-01', accountId: 'k', type: 'keluar', method: '', tags: ['rumah'],
      parts: [{ desc: 'Telur', amount: 30000, category: '' }, { desc: 'Gula', amount: 15000, category: '' }, { desc: 'Obat', amount: 20000, category: 'Kesehatan' }] }));
    eq(run(sb, 'splitFormFromSiblings([])'), null);
  });
  test('replaceSplitTxns: ganti semua baris, ID lama dipakai ulang per posisi, transaksi lain utuh', () => {
    sb.__all = sibs.concat([{ id: 'z', date: '2026-10-02', type: 'masuk', accountId: 'k', amount: 1 }]);
    sb.__n = [{ id: 'n1', desc: 'A', amount: 1, splitId: 's1' }, { id: 'n2', desc: 'B', amount: 2, splitId: 's1' }];
    eq(run(sb, 'replaceSplitTxns(__all, "s1", __n).map(t => t.id + ":" + (t.desc || "")).join()'), 'z:,a:A,b:B');
  });
}

// ---------- v1.1.167: CSV, import, foto pasca-import ----------
{
  const { sb } = makeSandbox('2026-10-23T05:00:00Z');
  test('csvCell: angka desimal koma, sel berawalan rumus diberi apostrof, tanda kutip/titik koma dikutip', () => {
    eq(run(sb, 'csvCell(1234.5)'), '1234,5');
    eq(run(sb, 'csvCell("=1+1")'), "'=1+1");
    eq(run(sb, 'csvCell("a;b")'), '"a;b"');
    eq(run(sb, 'csvCell("a\\"b")'), '"a""b"');
    eq(run(sb, 'csvCell(null)'), '');
  });
  test('buildTxnCsv: BOM, urut tanggal naik, transfer memuat akun tujuan, label digabung', () => {
    sb.__d = { accounts: [{ id: 'a', name: 'Kas' }, { id: 'b', name: 'Bank' }] };
    sb.__t = [{ date: '2026-10-02', type: 'keluar', category: 'Makan & minum', desc: 'Soto', amount: 15000, accountId: 'a', tags: ['x', 'y'] }, { date: '2026-10-01', type: 'transfer', desc: 'Tabung', amount: 50000, accountId: 'a', toAccountId: 'b' }];
    const csv = run(sb, 'buildTxnCsv(__d, __t)');
    const lines = csv.replace(/^\uFEFF/, '').split('\r\n');
    eq(csv.charCodeAt(0), 0xFEFF);
    eq(lines[0], 'Tanggal;Jenis;Kategori;Deskripsi;Jumlah;Akun;Akun Tujuan;Label');
    eq(lines[1], '2026-10-01;Transfer;;Tabung;50000;Kas;Bank;');
    eq(lines[2], '2026-10-02;Keluar;Makan & minum;Soto;15000;Kas;;x, y');
  });
  test('buildTxnFromImport: ID baru, splitId tetap, tanggal rusak -> hari ini, jumlah mutlak, akun tak dikenal -> cadangan', () => {
    sb.__i = { id: 'lama', date: '2026-13-45', type: 'keluar', amount: -500, accountId: 'zzz', desc: 'Roti', splitId: 'sp-1' };
    const t = JSON.parse(run(sb, 'JSON.stringify(buildTxnFromImport(__i, {}, "fb"))'));
    eq(t.id === 'lama', false); eq(t.splitId, 'sp-1'); eq(t.amount, 500); eq(t.accountId, 'fb'); eq(t.date, '2026-10-23');
  });
  test('photoParseBackup: foto transaksi tunggal dipulihkan lewat tanda tangan setelah ID berubah', () => {
    const jpg = 'data:image/jpeg;base64,' + Buffer.from('x'.repeat(300)).toString('base64');
    sb.__r = { format: 'keuangan-foto-v1', photos: [{ id: 'idLama', data: jpg, sig: ['2026-10-01', 'keluar', 'Roti', 500, 'Kas'] }] };
    sb.__t = [{ id: 'idBaru', date: '2026-10-01', type: 'keluar', desc: 'Roti', amount: 500, accountId: 'a' }];
    sb.__ac = [{ id: 'a', name: 'Kas' }];
    eq(run(sb, 'photoParseBackup(__r, __t, {}, __ac).accept.map(x => x.id).join()'), 'idBaru');
    sb.__t.push({ id: 'kembar', date: '2026-10-01', type: 'keluar', desc: 'Roti', amount: 500, accountId: 'a' });
    eq(run(sb, 'photoParseBackup(__r, __t, {}, __ac).skipped.orphan'), 1);   // dua kandidat: ambigu, dilewati
  });
}

// ---------- v1.1.168: ubah transaksi berulang ----------
{
  const { sb } = makeSandbox('2026-10-23T05:00:00Z');
  test('ubah transaksi berulang: fungsi, tombol Ubah di daftar kelola, simpan memperbarui di tempat', () => {
    const c = fs.readFileSync(path.join(root, 'src/js/features/perencanaan/langganan.js'), 'utf8');
    ok(/function startEditSub\(id\)/.test(c) && /data-act="startEditSub"/.test(c) && /subs\[subs\.indexOf\(editing\)\] = ns/.test(c), 'startEditSub terpasang');
    eq(run(sb, 'typeof startEditSub'), 'function');
  });
}

console.log(`\n${pass} lulus, ${fail} gagal`);
process.exit(fail ? 1 : 0);
