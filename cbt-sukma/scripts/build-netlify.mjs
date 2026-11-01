/**
 * Siapkan folder siap-unggah untuk Netlify: ../netlify-deploy
 * (isi: index.html, assets/, netlify.toml, _redirects)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const dist = path.join(root, 'dist');
const out = path.join(root, '..', 'netlify-deploy');

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('❌ Jalankan `npm run build` dulu.');
  process.exit(1);
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(path.join(dist, 'index.html'), path.join(out, 'index.html'));
fs.cpSync(path.join(dist, 'assets'), path.join(out, 'assets'), { recursive: true });
fs.copyFileSync(path.join(root, 'netlify.toml'), path.join(out, 'netlify.toml'));
fs.writeFileSync(path.join(out, '_redirects'), '/*  /index.html  200\n');

const size = (p) =>
  fs.readdirSync(p, { withFileTypes: true }).reduce((a, e) => {
    const full = path.join(p, e.name);
    return a + (e.isDirectory() ? size(full) : fs.statSync(full).size);
  }, 0);

console.log('✅ Folder siap unggah:', out, `(${Math.round(size(out) / 1024)} KB)`);
