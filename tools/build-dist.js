// Bangun versi sebar (dist/): semua JS digabung jadi satu app.js, CSS dipadatkan, index.html dan sw.js disesuaikan.
// Sumber modular di folder proyek tetap dipakai untuk pengembangan dan test; dist/ hanya untuk di-hosting.
// Jalankan dari folder proyek:  node tools/build-dist.js [folder-keluaran]   (bawaan: dist)
// Bila paket `terser` terpasang (npm i -D terser), JS ikut diperkecil; tanpanya JS hanya digabung (aman, tanpa ubah isi).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const dest = path.resolve(process.argv[2] || path.join(root, 'dist'));
const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const html = rd('index.html');
const files = [...html.matchAll(/<script\s+src="([^"]+)"><\/script>/g)].map(m => m[1]);
if (!files.length) throw new Error('tidak ada <script src> di index.html');
const ver = (rd('src/js/core/render-utama.js').match(/APP_VERSION = '([^']+)'/) || [])[1] || 'dev';

async function main() {
  let js = files.map(f => '// ===== ' + f + ' =====\n' + rd(f)).join('\n;\n');
  let minified = false;
  try {
    const terser = require('terser');
    const r = await terser.minify(js, { compress: true, mangle: false });   // mangle mati: handler dipanggil lewat nama global dari data-act
    if (r.code) { js = r.code; minified = true; }
  } catch (e) { /* terser tidak ada: pakai gabungan apa adanya */ }

  // CSS: buang komentar dan spasi berlebih (tidak menyentuh isi tanda kutip)
  const css = rd('src/css/app.css')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s*([{};,>])\s*/g, '$1')
    .replace(/:\s+/g, ':')
    .replace(/;}/g, '}')
    .trim();

  const first = html.indexOf('<script src="' + files[0] + '">');
  const lastTag = '<script src="' + files[files.length - 1] + '"></script>';
  const last = html.indexOf(lastTag) + lastTag.length;
  const out = html.slice(0, first) + '<script src="app.js?v=' + ver + '"></script>' + html.slice(last);
  const out2 = out.replace('href="src/css/app.css"', 'href="style.css?v=' + ver + '"');

  let sw = rd('sw.js');
  sw = sw.replace(/const APP_SHELL = \[[\s\S]*?\];/, "const APP_SHELL = [\n  './', 'index.html', 'style.css', 'app.js', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png'\n];");

  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(path.join(dest, 'index.html'), out2);
  fs.writeFileSync(path.join(dest, 'app.js'), js);
  fs.writeFileSync(path.join(dest, 'style.css'), css);
  fs.writeFileSync(path.join(dest, 'sw.js'), sw);
  for (const f of ['manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png']) {
    if (fs.existsSync(path.join(root, f))) fs.copyFileSync(path.join(root, f), path.join(dest, f));
  }
  const kb = n => Math.round(n / 1024) + ' KB';
  const srcJs = files.reduce((n, f) => n + rd(f).length, 0);
  console.log('dist ' + ver + ' -> ' + dest + ' | JS ' + kb(srcJs) + ' -> ' + kb(js.length) + (minified ? ' (terser)' : ' (digabung saja)') + ' | CSS ' + kb(rd('src/css/app.css').length) + ' -> ' + kb(css.length) + ' | ' + files.length + ' request JS -> 1');
}
main().catch(e => { console.error(e); process.exit(1); });
