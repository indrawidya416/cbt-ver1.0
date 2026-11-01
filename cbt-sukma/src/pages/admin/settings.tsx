import React, { useEffect, useRef, useState } from 'react';
import storage, { getApiUrl } from '../../services/storageService';
import { Field, SectionHeader, useToast } from '../../components/ui';
import { formatDate } from '../../types';
import { SCHOOL_STYLE, THEMES, themeOfSchool } from '../../theme';
import { SchoolLogo, SukmaMark } from '../../components/Brand';
import { flushPendingResults, pendingResultCount, pingServer } from '../../services/apiService';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState(storage.getSettings());
  const [stats, setStats] = useState(storage.stats());
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [checking, setChecking] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { show, node } = useToast();

  useEffect(() => {
    setSettings(storage.getSettings());
    setStats(storage.stats());
    setPendingCount(pendingResultCount());
  }, []);

  const saveGeneral = () => {
    storage.saveSettings({
      appName: settings.appName,
      academicYear: settings.academicYear,
      kkm: Number(settings.kkm) || 70,
      antiCheat: settings.antiCheat,
    });
    show('Pengaturan aplikasi disimpan.');
  };

  const saveServer = async () => {
    storage.saveSettings({
      apiUrl: settings.apiUrl.trim(),
      apiKey: (settings.apiKey || '').trim(),
    });
    show('URL database & kunci API disimpan.');
    await doSync();
  };

  const testConnection = async () => {
    if (!settings.apiUrl.trim()) {
      setSyncMsg('Isi URL database terlebih dahulu.');
      show('URL database belum diatur.', 'error');
      return;
    }
    // simpan dulu agar kunci/URL yang baru diketik ikut dipakai
    storage.saveSettings({ apiUrl: settings.apiUrl.trim(), apiKey: (settings.apiKey || '').trim() });
    setChecking(true);
    setSyncMsg('Menguji koneksi ke server...');
    const res = await pingServer();
    setChecking(false);
    setSyncMsg(res.ok ? `Koneksi berhasil — ${res.message}` : res.message);
    show(res.ok ? 'Server terhubung.' : 'Koneksi gagal.', res.ok ? 'success' : 'error');
  };

  const flushResults = async () => {
    if (!settings.apiUrl.trim()) {
      show('URL database belum diatur.', 'error');
      return;
    }
    storage.saveSettings({ apiUrl: settings.apiUrl.trim(), apiKey: (settings.apiKey || '').trim() });
    setSyncing(true);
    const res = await flushPendingResults();
    setSyncing(false);
    setPendingCount(pendingResultCount());
    setSyncMsg(
      res.sent === 0 && res.failed === 0
        ? 'Tidak ada hasil yang menunggu pengiriman.'
        : `Terkirim ${res.sent} hasil${res.failed ? `, ${res.failed} masih gagal (dicoba lagi nanti)` : ''}.`,
    );
    show(res.failed ? 'Sebagian hasil belum terkirim.' : 'Hasil terkirim ke server.', res.failed ? 'error' : 'success');
  };

  const doSync = async () => {
    if (!getApiUrl()) {
      setSyncMsg('URL database belum diatur.');
      show('Isi URL database terlebih dahulu.', 'error');
      return;
    }
    setSyncing(true);
    setSyncMsg('Menghubungi server...');
    const ok = await storage.sync();
    setSyncing(false);
    setSyncMsg(
      ok
        ? `Sinkronisasi berhasil · ${formatDate(new Date().toISOString())}`
        : 'Gagal terhubung ke server. Periksa URL & koneksi internet.',
    );
    setStats(storage.stats());
    show(ok ? 'Data berhasil disinkronkan.' : 'Sinkronisasi gagal.', ok ? 'success' : 'error');
  };

  const repairDb = () => {
    const created = storage.initializeDatabase();
    setStats(storage.stats());
    show(
      created.length
        ? `Database diperbaiki. Koleksi dibuat: ${created.join(', ')}.`
        : 'Struktur database sudah sehat, tidak ada yang perlu diperbaiki.',
    );
  };

  const seed = () => {
    if (!window.confirm('Isi aplikasi dengan data contoh (siswa, paket soal, jadwal, hasil)? Data yang ada akan ditimpa.'))
      return;
    const res = storage.seedDemo();
    setStats(storage.stats());
    show(`Data contoh dimuat: ${res.students} siswa, ${res.questions} soal, ${res.results} hasil ujian.`);
  };

  const reset = () => {
    if (!window.confirm('Hapus SELURUH data aplikasi (siswa, soal, jadwal, hasil)? Tindakan ini permanen.'))
      return;
    storage.resetAll();
    setStats(storage.stats());
    setSettings(storage.getSettings());
    show('Seluruh data aplikasi telah dihapus.');
  };

  const backup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      students: storage.students.getAll(),
      packets: storage.packets.getAll(),
      questions: storage.questions.getAll(),
      exams: storage.exams.getAll(),
      results: storage.results.getAll(),
      settings: storage.getSettings(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `backup-cbt-sukma-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    show('Backup data berhasil diunduh.');
  };

  const restore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data.students) storage.students.saveAll(data.students);
        if (data.packets) storage.packets.saveAll(data.packets);
        if (data.questions) storage.questions.saveAll(data.questions);
        if (data.exams) storage.exams.saveAll(data.exams);
        if (data.results) storage.results.saveAll(data.results);
        if (data.settings) storage.saveSettings(data.settings);
        setStats(storage.stats());
        setSettings(storage.getSettings());
        show('Backup berhasil dipulihkan.');
      } catch {
        show('File backup tidak valid.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const storageSize = `${(storage.usageBytes() / 1024).toFixed(1)} KB`;
  const persistent = storage.isPersistent();

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Pengaturan"
        subtitle="Konfigurasi aplikasi, database, dan pencadangan data"
        icon="⚙️"
      />

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Identitas aplikasi */}
        <div className="card p-5 space-y-4">
          <h3 className="font-bold text-slate-800">Identitas &amp; Kebijakan Ujian</h3>
          <Field label="Nama Aplikasi">
            <input
              className="input"
              value={settings.appName}
              onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Tahun Pelajaran">
              <input
                className="input"
                value={settings.academicYear}
                onChange={(e) => setSettings({ ...settings, academicYear: e.target.value })}
              />
            </Field>
            <Field label="KKM Default">
              <input
                type="number"
                className="input"
                value={settings.kkm}
                onChange={(e) => setSettings({ ...settings, kkm: Number(e.target.value) })}
              />
            </Field>
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 mt-0.5 accent-brand-600"
              checked={settings.antiCheat}
              onChange={(e) => setSettings({ ...settings, antiCheat: e.target.checked })}
            />
            <span>
              <span className="block text-sm font-bold text-slate-800">Mode Anti-Kecurangan</span>
              <span className="text-xs text-slate-500">
                Catat ketika siswa berpindah tab/aplikasi selama ujian berlangsung.
              </span>
            </span>
          </label>
          <button className="btn-primary w-full" onClick={saveGeneral}>
            Simpan Pengaturan
          </button>
        </div>

        {/* Database */}
        <div className="card p-5 space-y-4">
          <h3 className="font-bold text-slate-800">Koneksi Database (Opsional)</h3>
          <p className="text-xs text-slate-500 -mt-2">
            Aplikasi berjalan penuh secara offline dengan penyimpanan lokal. Untuk berbagi data antar
            perangkat, hubungkan URL Google Apps Script / API sekolah. Nilai ujian siswa otomatis dikirim
            ke server saat mereka mengumpulkan; bila internet terputus, hasil masuk antrean dan bisa
            dikirim ulang lewat tombol di bawah. Panduan pemasangan: <b>google-apps-script/README-PANDUAN.md</b>.
          </p>
          <Field
            label="URL Database / API"
            hint="Contoh: https://script.google.com/macros/s/AKfycb.../exec"
          >
            <input
              className="input font-mono text-xs"
              placeholder="https://..."
              value={settings.apiUrl}
              onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
            />
          </Field>
          <Field
            label="Kunci API (key)"
            hint="Samakan dengan API_KEY di file Code.gs pada Google Apps Script"
          >
            <input
              className="input font-mono text-xs"
              placeholder="mis. sukma-kunci-rahasia-2026"
              value={settings.apiKey || ''}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={saveServer} disabled={syncing || checking}>
              {syncing ? 'Menyinkronkan...' : '💾 Simpan & Tarik Data'}
            </button>
            <button className="btn-secondary" onClick={doSync} disabled={syncing || checking}>
              🔄 Tarik Data
            </button>
            <button className="btn-secondary" onClick={testConnection} disabled={checking || syncing}>
              {checking ? 'Menguji...' : '📡 Tes Koneksi'}
            </button>
            <button className="btn-secondary" onClick={flushResults} disabled={syncing || checking}>
              ⬆️ Kirim Hasil Tertunda{pendingCount ? ` (${pendingCount})` : ''}
            </button>
          </div>
          {syncMsg && (
            <p
              className={`text-xs font-semibold rounded-xl px-3 py-2 ${
                syncMsg.includes('Gagal')
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {syncMsg}
            </p>
          )}
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
            <b>Status penyimpanan lokal:</b> {storageSize} · terakhir sinkron:{' '}
            {settings.lastSync ? formatDate(settings.lastSync) : 'belum pernah'}
          </div>
          {!persistent && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              ⚠️ Browser ini memblokir penyimpanan permanen (mode preview/incognito). Aplikasi tetap
              berjalan, tetapi data hanya bertahan selama halaman terbuka.
            </div>
          )}
        </div>
      </div>

      {/* Tema & template warna */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-slate-800">Tema &amp; Template Warna</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Warna dasar aplikasi <b>tosca</b>. Setiap sekolah memiliki template warnanya sendiri yang
              otomatis aktif ketika siswa/guru sekolah tersebut masuk.
            </p>
          </div>
          <div className="hidden sm:flex w-10 h-10 shrink-0 rounded-xl bg-white border border-slate-200 items-center justify-center p-1">
            <SukmaMark height={24} />
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {/* Tosca */}
          <div data-theme="tosca" className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="h-16 bg-gradient-to-br from-brand-500 to-brand-700 flex items-center px-4">
              <div className="w-9 h-9 rounded-lg bg-white/95 flex items-center justify-center p-1">
                <SukmaMark height={22} />
              </div>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm font-extrabold text-slate-800">Tosca</p>
              <p className="text-[11px] text-slate-500">Warna dasar aplikasi (Guru &amp; Admin)</p>
              <div className="flex gap-1 mt-2">
                {['bg-brand-300', 'bg-brand-500', 'bg-brand-700', 'bg-brand-900'].map((c) => (
                  <span key={c} className={`w-5 h-5 rounded ${c}`} />
                ))}
              </div>
            </div>
          </div>
          {/* MI & SMP */}
          {(['MI Islamiyah', 'SMP Al Hidayah'] as const).map((sch) => {
            const st = SCHOOL_STYLE[sch];
            const th = THEMES[themeOfSchool(sch)];
            return (
              <div key={sch} data-theme={themeOfSchool(sch)} className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="h-16 bg-gradient-to-br from-brand-500 to-brand-700 flex items-center px-4">
                  <div className="w-10 h-10 rounded-lg bg-white/95 flex items-center justify-center p-1">
                    <SchoolLogo school={sch} height={30} />
                  </div>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm font-extrabold text-slate-800">{sch}</p>
                  <p className="text-[11px] text-slate-500">Template warna sekolah</p>
                  <div className="flex gap-1 mt-2">
                    {['bg-brand-300', 'bg-brand-500', 'bg-brand-700', 'bg-brand-900'].map((c) => (
                      <span key={c} className={`w-5 h-5 rounded ${c}`} />
                    ))}
                    <span className="ml-auto text-[10px] font-bold" style={{ color: st.hex }}>
                      {st.hex}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Ringkasan data */}
        <div className="card p-5">
          <h3 className="font-bold text-slate-800 mb-4">Ringkasan Data</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              ['Siswa', stats.students, '👥'],
              ['Paket Soal', stats.packets, '📚'],
              ['Butir Soal', stats.questions, '📝'],
              ['Jadwal Ujian', stats.exams, '🗓️'],
              ['Hasil Ujian', stats.results, '📊'],
            ].map(([label, value, icon]) => (
              <div key={String(label)} className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
                <p className="text-[10px] uppercase font-bold text-slate-400">
                  {icon} {label}
                </p>
                <p className="text-xl font-extrabold text-slate-800">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-secondary text-xs" onClick={backup}>
              ⬇️ Backup (JSON)
            </button>
            <button className="btn-secondary text-xs" onClick={() => fileRef.current?.click()}>
              ⬆️ Restore
            </button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={restore} />
          </div>
        </div>

        {/* Alat database */}
        <div className="card p-5 space-y-3">
          <h3 className="font-bold text-slate-800">Alat Database</h3>
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-start gap-3">
              <span className="text-xl">🛠️</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">Perbaiki Database</p>
                <p className="text-xs text-slate-500">
                  Membuat/menyusun ulang struktur koleksi data bila terjadi kerusakan.
                </p>
              </div>
              <button className="btn-secondary !py-1.5 text-xs shrink-0" onClick={repairDb}>
                Jalankan
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-start gap-3">
              <span className="text-xl">✨</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">Isi Data Contoh</p>
                <p className="text-xs text-slate-500">
                  Memuat 16 siswa, 5 paket soal, 25 butir soal, 3 jadwal, dan hasil ujian simulasi.
                </p>
              </div>
              <button className="btn-primary !py-1.5 text-xs shrink-0" onClick={seed}>
                Muat
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3">
            <div className="flex items-start gap-3">
              <span className="text-xl">🗑️</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-rose-700">Reset Seluruh Data</p>
                <p className="text-xs text-rose-600/80">
                  Menghapus semua data dari penyimpanan lokal. Lakukan backup terlebih dahulu.
                </p>
              </div>
              <button className="btn-danger !py-1.5 text-xs shrink-0" onClick={reset}>
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
      {node}
    </div>
  );
};

export default Settings;
