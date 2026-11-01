/**
 * Membuat src/assets/logos.ts berisi logo dalam bentuk data-URI base64,
 * sehingga versi standalone (satu file HTML) tetap menampilkan logo.
 *
 * Jalankan: node scripts/gen-logos.mjs
 */
import fs from 'fs';
import path from 'path';

const dir = path.resolve('src/assets');
const files = {
  SUKMA_MARK: 'logo-sukma.png',
  SUKMA_MARK_LIGHT: 'logo-sukma-light.png',
  LOGO_SUKMA_FULL: 'logo-sukma-full.png',
  LOGO_MI: 'logo-mi.png',
  LOGO_MI_CREST: 'logo-mi-crest.png',
  LOGO_SMP: 'logo-smp.png',
  LOGO_SMP_CREST: 'logo-smp-crest.png',
  LOGO_LPI: 'logo-lpi.png',
  LOGO_LPI_MARK: 'logo-lpi-mark.png',
  LOGIN_BG: 'login-bg.jpg',
};

const mimeOf = (file) => {
  if (/\.jpe?g$/i.test(file)) return 'image/jpeg';
  if (/\.webp$/i.test(file)) return 'image/webp';
  return 'image/png';
};

let out = `/* AUTO-GENERATED oleh scripts/gen-logos.mjs — jangan diedit manual */\n\n`;

for (const [name, file] of Object.entries(files)) {
  const full = path.join(dir, file);
  if (!fs.existsSync(full)) {
    console.warn(`! ${file} tidak ditemukan, dilewati`);
    continue;
  }
  const b64 = fs.readFileSync(full).toString('base64');
  out += `export const ${name} = 'data:${mimeOf(file)};base64,${b64}';\n`;
}

fs.writeFileSync(path.join(dir, 'logos.ts'), out);
console.log(`✅ src/assets/logos.ts dibuat (${(out.length / 1024).toFixed(0)} KB)`);
