/**
 * Hapus data siswa contoh (NIS berawalan 253) dari Google Sheets.
 *
 *   node scripts/clean-demo.mjs --push --url "https://…/exec" --key "KUNCI"
 *   node scripts/clean-demo.mjs --check --url "…" --key "KUNCI"
 *
 * PENTING: butuh Code.gs v2.1 (action: deleteStudents) yang sudah di-DEPLOY ulang.
 */
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const value = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : null; };
const url = value('url');
const key = value('key');
const prefix = value('prefix') || '253';

if (!url || !key) {
  console.log('Pemakaian: node scripts/clean-demo.mjs --push --url "<URL /exec>" --key "<KUNCI>" [--prefix 253]');
  process.exit(0);
}

const getJson = async (q) => (await fetch(`${url}?${new URLSearchParams({ key, ...q })}`)).json();

const ping = await getJson({ action: 'ping' });
console.log('🔌 ping:', JSON.stringify(ping));
if (ping.version !== '2.1') {
  console.log('⚠️  Server masih versi ' + ping.version + '. Deploy ulang Code.gs (Deploy → Manage deployments → Edit → New version) dulu.');
}

if (flag('check')) {
  const all = await getJson({ action: 'getAll' });
  const st = all.data?.students || [];
  const demo = st.filter((s) => String(s.nis).startsWith(prefix));
  console.log(`📊 siswa: ${st.length} · contoh (${prefix}…): ${demo.length}`);
  process.exit(0);
}

if (flag('push')) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ key, action: 'deleteStudents', prefixes: [prefix] }),
    redirect: 'follow',
  });
  console.log('🧹 hasil:', JSON.stringify(await res.json()));
  const all = await getJson({ action: 'getAll' });
  const st = all.data?.students || [];
  const bySchool = {};
  const byClass = {};
  st.forEach((s) => {
    bySchool[s.school] = (bySchool[s.school] || 0) + 1;
    byClass[`${s.school === 'MI Islamiyah' ? 'MI' : 'SMP'}-${s.className}`] = (byClass[`${s.school === 'MI Islamiyah' ? 'MI' : 'SMP'}-${s.className}`] || 0) + 1;
  });
  console.log(`📊 siswa sekarang: ${st.length}`, JSON.stringify(bySchool));
  console.log('   per kelas:', JSON.stringify(byClass));
}
