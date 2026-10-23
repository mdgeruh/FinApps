// Kunci versi supabase-js dan hitung hash SRI-nya. Jalankan dari folder proyek (butuh internet):
//   node tools/pin-supabase.js            -> pakai versi terbaru 2.x
//   node tools/pin-supabase.js 2.45.4     -> pakai versi tertentu
// Mengisi SUPABASE_JS_VERSION dan SUPABASE_JS_SRI di src/js/features/data/sync.js. Setelah itu naikkan versi app seperti biasa.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const file = path.join(__dirname, '..', 'src/js/features/data/sync.js');
async function get(url) { const r = await fetch(url); if (!r.ok) throw new Error(url + ' -> ' + r.status); return r; }
(async () => {
  let ver = process.argv[2];
  if (!ver) { const j = await (await get('https://data.jsdelivr.com/v1/package/npm/@supabase/supabase-js/resolved?specifier=2')).json(); ver = j.version; }
  if (!/^\d+\.\d+\.\d+$/.test(ver)) throw new Error('versi tidak valid: ' + ver);
  const buf = Buffer.from(await (await get('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@' + ver + '/dist/umd/supabase.js')).arrayBuffer());
  const sri = 'sha384-' + crypto.createHash('sha384').update(buf).digest('base64');
  let s = fs.readFileSync(file, 'utf8');
  s = s.replace(/const SUPABASE_JS_VERSION = '[^']*';/, "const SUPABASE_JS_VERSION = '" + ver + "';")
       .replace(/const SUPABASE_JS_SRI = '[^']*';/, "const SUPABASE_JS_SRI = '" + sri + "';");
  fs.writeFileSync(file, s);
  console.log('Terkunci: supabase-js ' + ver + '\n' + sri);
})().catch(e => { console.error('GAGAL: ' + e.message); process.exit(1); });
