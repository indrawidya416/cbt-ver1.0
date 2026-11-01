import React, { useState, useEffect } from 'react';
import { SCHOOLS, UserRole } from './types';
import { SCHOOL_STYLE, themeOfSchool } from './theme';
import { SchoolLogo, SukmaMark } from './components/Brand';
import { storage, getApiUrl } from './services/storageService'; // Import getApiUrl
import { ensureStaffSeeded, scopeOf } from './services/authService';
import {
  endSession,
  getDeviceId,
  heartbeat,
  listActiveSessions,
  setSessionExam,
  startSession,
} from './services/securityService';
import {
  flushPendingResults,
  remoteCheckSession,
  remoteEndSession,
  remoteHeartbeat,
  remoteStartSession,
} from './services/apiService';
import Login from './pages/Login';
import Layout from './components/Layout';
import StudentData from './pages/admin/StudentData';
import QuestionBank from './pages/admin/QuestionBank';
import ExamSchedule from './pages/admin/ExamSchedule';
import Analysis from './pages/admin/Analysis';
import Settings from './pages/admin/Settings';
import Monitoring from './pages/admin/Monitoring';
import Users from './pages/admin/Users';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentExamList from './pages/student/StudentExamList';
import StudentResults from './pages/student/StudentResults';
import ExamInterface from './pages/student/ExamInterface';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [username, setUsername] = useState<string>('');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<string>('Menyiapkan Aplikasi...');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lockMessage, setLockMessage] = useState<string | null>(null);

  // INITIAL DATA SYNC
  useEffect(() => {
    const initApp = async () => {
        const url = getApiUrl();
        // Pastikan akun login (guru/proktor/admin) sudah tersedia
        ensureStaffSeeded();

        // Kunjungan pertama (belum pernah diinisialisasi) atau mode preview/incognito:
        // muat data contoh otomatis agar aplikasi langsung dapat dicoba.
        // Data contoh dapat dihapus kapan saja via Pengaturan → Reset Seluruh Data.
        const firstRun = !storage.isInitialized();
        if ((firstRun || !storage.isPersistent()) && storage.students.getAll().length === 0) {
            storage.seedDemo();
        }

        
        // Cek apakah data sudah ada di Cache (Local Storage) melalui storageService
        const cachedStudents = storage.students.getAll();
        const hasCache = cachedStudents.length > 0;

        if (hasCache) {
            setSyncStatus('Menggunakan data tersimpan...');
            // Jika ada cache, kita bisa langsung buka aplikasi (loading sebentar)
            // Sambil tetap mencoba sync di background
            storage.sync().then(success => {
                if(success) console.log("Background sync complete");
            });
            // kirim ulang hasil ujian yang sempat gagal terkirim
            flushPendingResults();
            setTimeout(() => setIsLoading(false), 500); // Fast load
        } else {
            // Jika tidak ada cache, harus menunggu sync
            if (url) {
                setSyncStatus('Mengunduh data terbaru dari server...');
                const success = await storage.sync();
                if (success) {
                    setSyncStatus('Data berhasil dimuat.');
                } else {
                    setSyncStatus('Gagal memuat data. Periksa koneksi internet.');
                }
            } else {
                setSyncStatus('URL Database belum diatur.');
            }
            setIsLoading(false);
        }
    };

    initApp();
  }, []);

  const handleLogin = async (selectedRole: UserRole, user: string) => {
    // Proteksi: satu akun siswa = satu perangkat/tab
    if (selectedRole === UserRole.STUDENT) {
      // 1) cek ke server pusat (bila URL API diisi) supaya berlaku lintas perangkat
      const remote = await remoteCheckSession(user, getDeviceId());
      if (remote.blocked) {
        setLockMessage(
          `Akun ini sedang aktif di ${
            remote.blockedBy?.deviceLabel || 'perangkat lain'
          }. Satu akun hanya boleh digunakan pada satu perangkat/tab. Minta guru/proktor menekan "Akhiri Sesi" pada menu Monitoring bila perangkat lama sudah tidak dipakai.`,
        );
        return;
      }
      // 2) proteksi lokal (tab/perangkat yang sama)
      const session = startSession(user);
      if (!session.ok) {
        setLockMessage(
          session.reason ||
            'Akun ini sedang aktif pada perangkat lain. Satu akun hanya boleh digunakan sekali.',
        );
        return;
      }
      setSessionId(session.session?.sessionId ?? null);
      if (session.session) remoteStartSession(session.session);
    }
    setLockMessage(null);
    setRole(selectedRole);
    setUsername(user);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    if (sessionId) {
      const own = listActiveSessions().find((x) => x.sessionId === sessionId);
      if (own) remoteEndSession(own);
      endSession(sessionId);
    }
    setSessionId(null);
    setRole(null);
    setUsername('');
    setActiveExamId(null);
    setCurrentPage('dashboard');
  };

  // Heartbeat sesi siswa: mendeteksi bila akun dipakai di perangkat/tab lain
  useEffect(() => {
    if (role !== UserRole.STUDENT || !sessionId) return;
    let beat = 0;
    const logoutLocal = () => {
      setSessionId(null);
      setRole(null);
      setUsername('');
      setActiveExamId(null);
      setCurrentPage('dashboard');
    };
    const tick = () => {
      beat += 1;
      const own = listActiveSessions().find((x) => x.sessionId === sessionId);
      // cek ke server tiap 30 detik: mendeteksi sesi yang dilepas guru
      if (own && beat % 2 === 0) {
        remoteHeartbeat(own).then((res) => {
          if (res.released) {
            setLockMessage(
              'Sesi Anda diakhiri oleh guru/proktor. Silakan login kembali bila ingin melanjutkan ujian.',
            );
            logoutLocal();
          }
        });
      }
      if (heartbeat(sessionId) === 'lost') {
        setLockMessage(
          'Sesi Anda berakhir karena akun ini dibuka di perangkat/tab lain. Silakan hubungi proktor untuk melepas sesi.',
        );
        setSessionId(null);
        setRole(null);
        setUsername('');
        setActiveExamId(null);
        setCurrentPage('dashboard');
      }
    };
    const timer = window.setInterval(tick, 15000);
    return () => window.clearInterval(timer);
  }, [role, sessionId]);

  // Catat ujian yang sedang dikerjakan pada sesi aktif
  useEffect(() => {
    if (sessionId) setSessionExam(sessionId, activeExamId);
  }, [sessionId, activeExamId]);

  const renderForbidden = () => (
    <div className="card p-10 text-center max-w-lg mx-auto">
      <div className="text-5xl mb-3">🔒</div>
      <h3 className="text-lg font-extrabold text-slate-800">Halaman tidak tersedia</h3>
      <p className="text-sm text-slate-500 mt-1">
        Menu ini hanya dapat diakses oleh Administrator. Akun guru/proktor memiliki akses ke Bank Soal,
        Jadwal Ujian, Monitoring, dan Analisis Hasil.
      </p>
      <button className="btn-primary mt-5" onClick={() => setCurrentPage('dashboard')}>
        Kembali ke Dashboard
      </button>
    </div>
  );

  const renderContent = () => {
    // Pass username to ExamInterface so results are saved correctly
    if (activeExamId && role === UserRole.STUDENT) {
        return <ExamInterface examId={activeExamId} username={username} onFinish={() => { setActiveExamId(null); setCurrentPage('dashboard'); }} />;
    }

    if (role === UserRole.STUDENT) {
        // Student Routes
        switch(currentPage) {
            case 'dashboard': return <StudentDashboard username={username} />;
            case 'exam_list': return <StudentExamList username={username} onStartExam={setActiveExamId} />;
            case 'results': return <StudentResults username={username} />;
            default: return <StudentDashboard username={username} />;
        }
    }

    // Admin & Teacher Routes
    switch (currentPage) {
      case 'dashboard':
        // Calculate Real Stats (dibatasi sesuai sekolah guru)
        const staffScope = scopeOf(username);
        const inScopeData = (school?: string) =>
          staffScope === 'Semua' || school === staffScope || school === 'Semua';
        const studentCount = storage.students.getAll().filter((s) => inScopeData(s.school)).length;
        const activeExamsCount = storage.exams
          .getAll()
          .filter((e) => e.isActive && inScopeData(e.school)).length;
        const packets = storage.packets.getAll().filter((p) => inScopeData(p.school));
        const literasiCount = packets.filter(p => p.category === 'Literasi').length;
        const numerasiCount = packets.filter(p => p.category === 'Numerasi').length;

        return (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-2xl font-bold text-gray-800 drop-shadow-sm mb-6">Dashboard Overview</h2>
            
            {studentCount === 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                    <div className="flex">
                        <div className="flex-shrink-0">⚠️</div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                Data masih kosong. Jika Anda baru pertama kali menggunakan aplikasi:
                                <br/>
                                1. Pergi ke menu <b>Pengaturan</b>.
                                <br/>
                                2. Klik tombol <b>"Perbaiki Database"</b> untuk membuat sheet otomatis.
                                <br/>
                                3. Klik <b>"Isi Data Contoh"</b> untuk melihat simulasi data.
                            </p>
                            <button
                                onClick={() => { storage.seedDemo(); window.location.reload(); }}
                                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-700 transition"
                            >
                                ⚡ Muat Data Contoh Sekarang
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Total Siswa */}
                <div className="bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/50 flex items-center justify-between hover:transform hover:scale-[1.02] transition-all duration-300 group">
                <div>
                    <h3 className="text-gray-500 font-bold uppercase text-xs tracking-wider">Total Siswa</h3>
                    <p className="text-4xl font-extrabold mt-2 text-gray-800 group-hover:text-blue-600 transition-colors">{studentCount}</p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">Data siswa terdaftar</p>
                </div>
                <div className="w-16 h-16 bg-blue-100/50 rounded-2xl flex items-center justify-center text-4xl shadow-inner text-blue-600">👥</div>
                </div>

                {/* Card 2: Ujian Aktif */}
                <div className="bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/50 flex items-center justify-between hover:transform hover:scale-[1.02] transition-all duration-300 group">
                <div>
                    <h3 className="text-gray-500 font-bold uppercase text-xs tracking-wider">Ujian Aktif</h3>
                    <p className="text-4xl font-extrabold mt-2 text-gray-800 group-hover:text-green-600 transition-colors">{activeExamsCount}</p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">Sesuai jadwal ujian</p>
                </div>
                <div className="w-16 h-16 bg-green-100/50 rounded-2xl flex items-center justify-center text-4xl shadow-inner text-green-600">📅</div>
                </div>

                {/* Card 3: Paket Soal (Literasi & Numerasi) */}
                <div className="bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/50 hover:transform hover:scale-[1.02] transition-all duration-300">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-gray-500 font-bold uppercase text-xs tracking-wider">Paket Soal</h3>
                    <div className="text-2xl opacity-50">📚</div>
                </div>
                <div className="flex items-center gap-4 mt-4">
                    <div className="flex-1 bg-purple-100/60 p-3 rounded-xl border border-purple-200/50 text-center shadow-sm">
                        <span className="block text-2xl font-bold text-purple-700">{literasiCount}</span>
                        <span className="text-[10px] text-purple-900/60 uppercase font-bold tracking-wider">Literasi</span>
                    </div>
                    <div className="flex-1 bg-orange-100/60 p-3 rounded-xl border border-orange-200/50 text-center shadow-sm">
                        <span className="block text-2xl font-bold text-orange-700">{numerasiCount}</span>
                        <span className="text-[10px] text-orange-900/60 uppercase font-bold tracking-wider">Numerasi</span>
                    </div>
                </div>
                </div>
            </div>

            {/* Identitas sekolah */}
            <div className={`grid gap-6 ${staffScope === 'Semua' ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
              {SCHOOLS.filter((sch) => staffScope === 'Semua' || sch === staffScope).map((sch) => {
                const st = SCHOOL_STYLE[sch];
                const totalSiswa = storage.students.getAll().filter((x) => x.school === sch).length;
                const totalUjian = storage.exams.getAll().filter((e) => e.school === sch).length;
                const paket = storage.packets.getAll().filter((pk) => pk.school === sch).length;
                return (
                  <div
                    key={sch}
                    data-theme={themeOfSchool(sch)}
                    className="card p-5 flex items-center gap-4 border-l-4 border-l-brand-500 hover:-translate-y-0.5 hover:shadow-lg transition-all"
                  >
                    <div className="w-16 h-16 shrink-0 rounded-2xl bg-white border border-slate-200 flex items-center justify-center p-1.5 shadow-sm">
                      <SchoolLogo school={sch} height={52} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold text-slate-800 truncate">{sch}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-slate-500 font-medium">
                        <span>👥 {totalSiswa} siswa</span>
                        <span>📅 {totalUjian} ujian</span>
                        <span>📚 {paket} paket</span>
                      </div>
                    </div>
                    {role === UserRole.ADMIN || role === UserRole.TEACHER ? (
                      <button
                        onClick={() => setCurrentPage('students')}
                        className="shrink-0 w-9 h-9 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 transition text-sm"
                        title="Lihat data siswa"
                      >
                        ›
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="card p-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <SukmaMark height={28} className="shrink-0" />
              <span className="font-semibold text-slate-700">
                Lembaga Pendidikan Islam Kebonsari - Malang
              </span>
            </div>
          </div>
        );
      case 'students':
        return role === UserRole.ADMIN || role === UserRole.TEACHER ? (
          <StudentData username={username} />
        ) : (
          renderForbidden()
        );
      case 'bank_soal':
        return <QuestionBank userRole={role} username={username} />;
      case 'schedule':
        return <ExamSchedule userRole={role} username={username} />;
      case 'analysis':
        return <Analysis userRole={role} username={username} />;
      case 'users':
        return role === UserRole.ADMIN ? <Users username={username} /> : renderForbidden();
      case 'settings':
        return role === UserRole.ADMIN ? <Settings /> : renderForbidden();
      case 'monitoring':
        return <Monitoring userRole={role} username={username} />;
      default:
        return <div>Page not found</div>;
    }
  };

  if (isLoading) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <h2 className="text-lg font-semibold text-gray-700">Memuat Aplikasi...</h2>
              <p className="text-sm text-gray-500 mt-2">{syncStatus}</p>
          </div>
      );
  }

  if (lockMessage) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-brand-700 via-brand-900 to-slate-950 flex items-center justify-center p-5"
        data-theme="tosca"
      >
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-7 text-center animate-slideUp">
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 text-3xl flex items-center justify-center mx-auto mb-4">
            🔒
          </div>
          <h2 className="text-xl font-extrabold text-slate-800">Akun Sedang Digunakan</h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">{lockMessage}</p>
          <div className="mt-4 text-left text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 leading-relaxed">
            <b>Satu akun = satu perangkat.</b> Jika perangkat sebelumnya mati/tertutup, minta guru
            atau proktor menekan tombol <b>“Akhiri Sesi”</b> pada menu <b>Monitoring</b>.
          </div>
          <button className="btn-primary w-full mt-5" onClick={() => setLockMessage(null)}>
            Kembali ke Halaman Login
          </button>
        </div>
      </div>
    );
  }

  if (!role) {
    return <Login onLogin={handleLogin} />;
  }

  // If taking exam, render without layout wrapper to maximize screen
  if (activeExamId && role === UserRole.STUDENT) {
      return renderContent();
  }

  return (
    <Layout 
      role={role} 
      user={{ name: username }} 
      onLogout={handleLogout}
      currentPage={currentPage}
      onNavigate={setCurrentPage}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;