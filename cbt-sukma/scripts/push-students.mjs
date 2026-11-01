/**
 * Kirim data siswa MI Islamiyah (kelas 4A–6B, 197 siswa) ke Google Sheets.
 *
 * Pemakaian:
 *   node scripts/push-students.mjs --push --url "https://script.google.com/macros/s/…/exec" --key "KUNCI"
 *   node scripts/push-students.mjs --check --url "…" --key "KUNCI"
 *
 * Data dibaca dari: ../data-siswa/siswa-mi-4-6.json (bisa diganti dengan --file)
 *
 * Catatan: pushAll bersifat UPSERT berdasarkan NIS — data siswa lain di sheet
 * (mis. siswa contoh 2530001–2530020) TIDAK terhapus. Hapus manual di sheet
 * Students bila sudah tidak dipakai.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : null;
};

const file = value('file') || path.join(here, '..', '..', 'data-siswa', 'siswa-mi-4-6.json');
const url = value('url');
const key = value('key');

if (!fs.existsSync(file)) {
  console.error('❌ File data tidak ditemukan:', file);
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
const students = payload.students || [];
console.log(`📄 ${path.basename(file)} → ${students.length} siswa`);

const perClass = {};
students.forEach((s) => {
  perClass[s.className] = (perClass[s.className] || 0) + 1;
});
console.log('   per kelas:', JSON.stringify(perClass));

if (!url || !key) {
  console.log('\nPemakaian:');
  console.log('  node scripts/push-students.mjs --push --url "<URL /exec>" --key "<KUNCI API>"');
  process.exit(0);
}

const getJson = async (query) =>
  (await fetch(`${url}?${new URLSearchParams({ key, ...query })}`)).json();

if (flag('check')) {
  const ping = await getJson({ action: 'ping' });
  console.log('🔌 ping:', JSON.stringify(ping));
  const all = await getJson({ action: 'getAll' });
  console.log(`📊 sheet sekarang → siswa: ${all.data?.students?.length ?? '?'}`);
  process.exit(0);
}

if (flag('push')) {
  const before = await getJson({ action: 'getAll' });
  const beforeCount = before.data?.students?.length ?? 0;
  console.log(`\n📤 Mengirim ${students.length} siswa (sebelumnya ${beforeCount} baris)…`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ key, action: 'pushAll', data: { students } }),
    redirect: 'follow',
  });
  const out = await res.json();
  console.log('   hasil:', JSON.stringify(out));
  const after = await getJson({ action: 'getAll' });
  console.log(`📊 sheet sekarang → siswa: ${after.data?.students?.length ?? '?'}`);
} else {
  console.log('\nTambahkan --push untuk mengirim, atau --check untuk memeriksa koneksi.');
}
