import React, { useMemo, useState } from 'react';
import { SCHOOLS, SchoolName, UserRole } from '../types';
import storage from '../services/storageService';
import { authenticateStaff, listStaffAccounts } from '../services/authService';
import { SCHOOL_STYLE, themeOfSchool } from '../theme';
import { LpiMark, SchoolLogo, SukmaMark } from '../components/Brand';
import { LOGIN_BG } from '../assets/logos';

const Login: React.FC<{
  onLogin: (role: UserRole, username: string) => void;
}> = ({ onLogin }) => {
  const [mode, setMode] = useState<'student' | 'staff'>('student');
  const [school, setSchool] = useState<SchoolName>('MI Islamiyah');
  const [nis, setNis] = useState('');
  const [password, setPassword] = useState('');
  const [staffUser, setStaffUser] = useState('');
  const [staffPass, setStaffPass] = useState('');
  const [error, setError] = useState('');
  const [showDemo, setShowDemo] = useState(false);

  const staffList = useMemo(() => listStaffAccounts(), [showDemo]);
  const students = useMemo(() => storage.students.getAll(), []);
  const demoStudents = useMemo(
    () => students.filter((s) => s.school === school).slice(0, 4),
    [students, school],
  );

  const handleStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const student = storage.findStudentByNis(nis);
    if (!student) {
      setError('NIS tidak ditemukan. Periksa kembali nomor induk siswa Anda.');
      return;
    }
    if (student.school !== school) {
      setError(`NIS ini terdaftar di ${student.school}. Silakan pilih sekolah yang sesuai.`);
      return;
    }
    if (student.password && password && student.password !== password) {
      setError('Kata sandi salah.');
      return;
    }
    onLogin(UserRole.STUDENT, student.nis);
  };

  const handleStaff = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const account = authenticateStaff(staffUser, staffPass);
    if (!account) {
      setError('Username atau kata sandi salah. Gunakan akun yang tertera di bawah.');
      return;
    }
    onLogin(account.role, account.username);
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-slate-950"
      data-theme={mode === 'student' ? themeOfSchool(school) : 'tosca'}
    >
      {/* Latar depan: poster Sekolah Para Juara */}
      <div className="pointer-events-none absolute inset-0">
        <img
          src={LOGIN_BG}
          alt="Sekolah Para Juara — MI Islamiyah & SMP Al Hidayah Malang"
          className="absolute inset-0 w-full h-full object-cover object-[38%_20%] sm:object-[50%_35%]"
        />
        {/* Hanya bayangan netral di sisi teks — foto tetap tampil dengan warna aslinya */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/55 to-slate-950/20 sm:from-slate-950/85 sm:via-slate-950/35 sm:to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-5xl grid lg:grid-cols-[1fr_430px] gap-10 lg:gap-16 items-center">
          {/* Branding */}
          <div className="text-white animate-fadeIn">
            <div className="flex items-center gap-4 mb-8">
              <div className="relative shrink-0">
                {/* halo lembut agar logo kontras tanpa kartu */}
                <div className="absolute inset-0 -m-4 rounded-full bg-white/25 blur-2xl" />
                <SukmaMark
                  height={56}
                  className="relative drop-shadow-[0_3px_10px_rgba(0,0,0,0.45)]"
                />
              </div>
              <div>
                <p className="font-extrabold text-lg leading-tight">Sekolah Sukma</p>
                <p className="text-brand-200/80 text-xs">Sekolah Unggulan Kebonsari Malang</p>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight max-w-lg">
              Computer Based Test
              <br />
              <span className="bg-gradient-to-r from-brand-200 to-brand-50 bg-clip-text text-transparent">
                Modern, Cepat, dan Terpercaya
              </span>
            </h1>
            <p className="text-brand-50/70 mt-4 max-w-md text-sm leading-relaxed">
              Platform ujian berbasis komputer untuk Asesmen Kompetensi Literasi &amp; Numerasi,
              ulangan harian, hingga ujian semester — lengkap dengan bank soal, token, monitoring
              langsung, dan analisis hasil.
            </p>

            {/* Logo sekolah */}
            <div className="mt-9 grid grid-cols-2 gap-3 max-w-md">
              {SCHOOLS.map((s) => {
                const st = SCHOOL_STYLE[s];
                const active = s === school;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setMode('student');
                      setSchool(s);
                    }}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-3 border transition text-left backdrop-blur-sm ${
                      active
                        ? 'bg-white/95 border-white shadow-xl'
                        : 'bg-slate-950/45 border-white/30 hover:bg-slate-950/60'
                    }`}
                  >
                    <SchoolLogo school={s} height={32} className="shrink-0" />
                    <div className="min-w-0">
                      <p
                        className={`text-[11px] sm:text-xs font-extrabold leading-tight ${
                          active ? 'text-slate-800' : 'text-white'
                        }`}
                      >
                        {s}
                      </p>
                      <p
                        className="text-[10px] font-bold uppercase tracking-wide flex items-center gap-1"
                        style={{ color: active ? st.hex : undefined }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: active ? st.hex : '#ffffffaa' }}
                        />
                        Malang
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kartu login semi transparan */}
          <div className="animate-slideUp">
            <div className="rounded-3xl bg-white/85 backdrop-blur-2xl backdrop-saturate-150 border border-white/60 ring-1 ring-white/30 shadow-2xl shadow-black/25 p-6 sm:p-7">
              <div className="flex gap-2 p-1 bg-slate-900/5 rounded-xl mb-6">
                {[
                  { key: 'student', label: '👨‍🎓 Siswa' },
                  { key: 'staff', label: '🧑‍🏫 Guru / Admin' },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => {
                      setMode(t.key as 'student' | 'staff');
                      setError('');
                    }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${
                      mode === t.key
                        ? 'bg-white text-brand-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {mode === 'student' ? (
                <form onSubmit={handleStudent} className="space-y-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-800">Masuk Ujian</h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Gunakan NIS yang terdaftar pada sekolah Anda.
                    </p>
                  </div>

                  <div>
                    <span className="label">Pilih Sekolah</span>
                    <div className="grid grid-cols-2 gap-2">
                      {SCHOOLS.map((sc) => {
                        const st = SCHOOL_STYLE[sc];
                        const active = school === sc;
                        return (
                          <button
                            type="button"
                            key={sc}
                            onClick={() => setSchool(sc)}
                            className={`flex items-center justify-center gap-2 px-2 py-2.5 rounded-xl text-[11px] font-extrabold border transition ${
                              active
                                ? 'text-white shadow-sm'
                                : 'bg-white/80 text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                            style={
                              active ? { backgroundColor: st.hex, borderColor: st.hex } : undefined
                            }
                          >
                            <SchoolLogo school={sc} height={22} />
                            <span className="truncate">{sc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="block">
                    <span className="label">NIS (Nomor Induk Siswa)</span>
                    <input
                      className="input tracking-wide"
                      placeholder="Contoh: 2510001"
                      value={nis}
                      onChange={(e) => setNis(e.target.value)}
                      inputMode="numeric"
                    />
                  </label>

                  <label className="block">
                    <span className="label">Kata Sandi (opsional)</span>
                    <input
                      type="password"
                      className="input"
                      placeholder="••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>

                  {error && (
                    <div className="rounded-xl bg-rose-50/90 border border-rose-200 text-rose-700 text-xs font-semibold px-3 py-2.5">
                      ⚠️ {error}
                    </div>
                  )}

                  <button type="submit" className="btn-primary w-full !py-3">
                    Masuk Ujian →
                  </button>

                  <div className="rounded-xl bg-white/60 border border-slate-200/80 p-3">
                    <button
                      type="button"
                      onClick={() => setShowDemo((v) => !v)}
                      className="w-full text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between"
                    >
                      Akun demo siswa {showDemo ? '▲' : '▼'}
                    </button>
                    {showDemo && (
                      <div className="mt-2 space-y-1.5">
                        {demoStudents.length === 0 && (
                          <p className="text-xs text-slate-500">
                            Belum ada data siswa. Masuk sebagai admin lalu isi data contoh.
                          </p>
                        )}
                        {demoStudents.map((s) => (
                          <button
                            type="button"
                            key={s.id}
                            onClick={() => {
                              setNis(s.nis);
                              setPassword(s.password || '');
                            }}
                            className="w-full flex items-center justify-between gap-2 text-xs px-2.5 py-2 rounded-lg bg-white border border-slate-200 hover:border-brand-400 transition"
                          >
                            <span className="font-semibold text-slate-700 truncate">{s.name}</span>
                            <span className="font-mono text-[11px] text-slate-500">{s.nis}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </form>
              ) : (
                <form onSubmit={handleStaff} className="space-y-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-800">Portal Guru &amp; Admin</h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Kelola bank soal, jadwal ujian, monitoring, dan analisis hasil.
                    </p>
                  </div>

                  <label className="block">
                    <span className="label">Username</span>
                    <input
                      className="input"
                      placeholder="guru.mi · guru.mi2 … guru.smp5 · guru · admin"
                      value={staffUser}
                      onChange={(e) => setStaffUser(e.target.value)}
                    />
                  </label>

                  <label className="block">
                    <span className="label">Kata Sandi</span>
                    <input
                      type="password"
                      className="input"
                      placeholder="••••••••"
                      value={staffPass}
                      onChange={(e) => setStaffPass(e.target.value)}
                    />
                  </label>

                  {error && (
                    <div className="rounded-xl bg-rose-50/90 border border-rose-200 text-rose-700 text-xs font-semibold px-3 py-2.5">
                      ⚠️ {error}
                    </div>
                  )}

                  <button type="submit" className="btn-primary w-full !py-3">
                    Masuk Portal
                  </button>

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Akun demo — guru, proktor &amp; admin ({staffList.length} akun)
                    </p>
                    <div className="max-h-52 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {staffList.map((acc) => (
                        <button
                          key={acc.id || acc.username}
                          type="button"
                          onClick={() => {
                            setStaffUser(acc.username);
                            setStaffPass(acc.password);
                          }}
                          className="btn-secondary !py-2 text-[11px] flex-col !items-start gap-0.5 !bg-white/80 text-left"
                        >
                          <span
                            className="font-extrabold leading-tight"
                            style={{
                              color:
                                acc.scope === 'MI Islamiyah'
                                  ? '#c2410c'
                                  : acc.scope === 'SMP Al Hidayah'
                                  ? '#1e40af'
                                  : '#0f766e',
                            }}
                          >
                            {acc.label}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-700 leading-tight truncate w-full">
                            {acc.name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {acc.username} / {acc.password}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </form>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 mt-4 text-[11px] text-white/80">
              <LpiMark height={22} className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]" />
              <span className="font-semibold">
                © {new Date().getFullYear()} LPI Kebonsari - Malang
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
