/**
 * Menggabungkan hasil build Vite menjadi SATU file HTML mandiri
 * (CSS + JS di-inline) sehingga dapat dibuka langsung lewat file://
 * tanpa server, cocok untuk lab komputer sekolah.
 *
 * Jalankan: npm run build && npm run standalone
 * Hasil: dist/cbt-sukma-standalone.html
 */
import fs from 'fs';
import path from 'path';

const dist = path.resolve('dist');
const indexHtml = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

const assets = fs.readdirSync(path.join(dist, 'assets'));
const jsFile = assets.find((f) => f.endsWith('.js'));
const cssFile = assets.find((f) => f.endsWith('.css'));

const js = jsFile ? fs.readFileSync(path.join(dist, 'assets', jsFile), 'utf8') : '';
const css = cssFile ? fs.readFileSync(path.join(dist, 'assets', cssFile), 'utf8') : '';

let html = indexHtml
  .replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, '')
  .replace(/<link[^>]*rel="stylesheet"[^>]*>/g, '');

html = html.replace(
  '</head>',
  `  <style>\n${css}\n  </style>\n</head>`,
);
html = html.replace(
  '</body>',
  `  <script type="module">\n${js}\n  </script>\n</body>`,
);

const out = path.join(dist, 'cbt-sukma-standalone.html');
fs.writeFileSync(out, html);
console.log(`✅ Standalone dibuat: ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
