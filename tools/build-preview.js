// Bangun pratinjau satu-halaman (HTML tunggal, berisi CSS + semua JS + data contoh) untuk dipublikasikan sebagai artefak.
// Jalankan dari folder proyek:  node tools/build-preview.js [file-keluaran]   (bawaan: preview/keuangan-pribadi.html)
// Perbedaan dengan app asli: mode lokal 100% (kunci Supabase dikosongkan, tanpa login), tanpa service worker/manifest/CSP meta.
// Data contoh dimuat otomatis dan hanya tersimpan di browser pemirsa.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const html = rd('index.html');
const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
const bodyNoScripts = body.replace(/<script\s+src="[^"]*"><\/script>\s*/g, '');
const fonts = (html.match(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/) || [''])[0];
const files = [...html.matchAll(/<script\s+src="([^"]+)"><\/script>/g)].map(m => m[1]);
let js = files.map(f => {
  let s = rd(f);
  if (f === 'src/js/core/config.js') s = s.replace(/const SUPABASE_ANON_KEY = '[^']*';/, "const SUPABASE_ANON_KEY = '';   // pratinjau: mode lokal");
  if (f === 'src/js/core/startup.js') s = s.replace(/if \('serviceWorker' in navigator[\s\S]*?\n  \}\s*$/, '');
  if (f === 'src/js/core/startup.js') s = s.replace('updateGreeting();', `// pratinjau: isi data contoh (3 bulan) + satu akun yang sudah diarsipkan, hanya bila belum ada data di browser ini
  try {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const d = buildDummyData();
      const iso = n => { const x = new Date(Date.now() - n * 86400000); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
      saveData(d);
    }
  } catch (e) { /* abaikan */ }
  updateGreeting();`);
  return '// ===== ' + f + ' =====\n' + s;
}).join('\n');
if (/<\/script/i.test(js)) throw new Error('JS mengandung </script');
const ver = (rd('src/js/core/render-utama.js').match(/APP_VERSION = '([^']+)'/) || [])[1] || '';
const out = '<title>Keuangan Pribadi</title>\n' + fonts + '\n<style>\n' + rd('src/css/app.css') + '\n</style>\n' + bodyNoScripts + '\n<script>\n' + js + '\n</script>\n';
const dest = path.resolve(process.argv[2] || path.join(root, 'preview', 'keuangan-pribadi.html'));
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, out);
console.log('Pratinjau ' + ver + ' -> ' + dest + ' (' + Math.round(out.length / 1024) + ' KB, ' + files.length + ' file JS)');
