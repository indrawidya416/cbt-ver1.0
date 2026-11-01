import React, { useState } from 'react';
import { UserRole } from '../types';
import storage from '../services/storageService';
import { themeOfSchool } from '../theme';
import { staffAccount } from '../services/authService';
import { LpiLogo, SchoolLogo, SukmaMark } from './Brand';

interface NavItem {
  key: string;
  label: string;
  icon: string;
  roles: UserRole[];
}

const NAV: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '🏠', roles: [UserRole.ADMIN, UserRole.TEACHER] },
  { key: 'students', label: 'Data Siswa', icon: '👥', roles: [UserRole.ADMIN, UserRole.TEACHER] },
  { key: 'bank_soal', label: 'Bank Soal', icon: '📚', roles: [UserRole.ADMIN, UserRole.TEACHER] },
  { key: 'schedule', label: 'Jadwal Ujian', icon: '🗓️', roles: [UserRole.ADMIN, UserRole.TEACHER] },
  { key: 'monitoring', label: 'Monitoring', icon: '📡', roles: [UserRole.ADMIN, UserRole.TEACHER] },
  { key: 'analysis', label: 'Analisis Hasil', icon: '📊', roles: [UserRole.ADMIN, UserRole.TEACHER] },
  { key: 'users', label: 'Akun Login', icon: '🔑', roles: [UserRole.ADMIN] },
  { key: 'settings', label: 'Pengaturan', icon: '⚙️', roles: [UserRole.ADMIN] },
  { key: 'dashboard', label: 'Beranda', icon: '🏠', roles: [UserRole.STUDENT] },
  { key: 'exam_list', label: 'Ujian Saya', icon: '📝', roles: [UserRole.STUDENT] },
  { key: 'results', label: 'Hasil Ujian', icon: '📊', roles: [UserRole.STUDENT] },
];

const roleLabel: Record<string, string> = {
  [UserRole.ADMIN]: 'Administrator',
  [UserRole.TEACHER]: 'Guru / Proktor',
  [UserRole.STUDENT]: 'Siswa',
};

const Layout: React.FC<{
  role: UserRole;
  user: { name: string; school?: string };
  onLogout: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
  children: React.ReactNode;
}> = ({ role, user, onLogout, currentPage, onNavigate, children }) => {
  const [open, setOpen] = useState(false);
  const items = NAV.filter(
    (n, i, arr) => n.roles.includes(role) && arr.findIndex((x) => x.key === n.key && x.roles.includes(role)) === i,
  );

  const student = role === UserRole.STUDENT ? storage.findStudentByNis(user.name) : undefined;
  const staff = role !== UserRole.STUDENT ? staffAccount(user.name) : null;
  const displayName = student?.name || staff?.name || user.name || 'Pengguna';
  const avatarInitial = (displayName || 'S').trim().charAt(0).toUpperCase();
  // Cakupan sekolah: siswa → sekolahnya, guru sekolah → sekolahnya, admin → semua (tosca)
  const scopeSchool = student?.school || (staff && staff.scope !== 'Semua' ? staff.scope : undefined);
  const activeTheme = themeOfSchool(scopeSchool);
  const scopeLabel =
    scopeSchool ||
    (student ? '-' : staff && staff.scope === 'Semua' ? 'MI Islamiyah · SMP Al Hidayah' : 'MI Islamiyah · SMP Al Hidayah');
  const roleText = student
    ? `${student.school} · ${student.className}`
    : staff
    ? staff.label
    : roleLabel[role];

  const Sidebar = (
    <div className="h-full flex flex-col w-[280px] sm:w-[304px] shrink-0 bg-gradient-to-b from-white via-white to-brand-50 text-slate-600 border-r border-slate-200/80">
      {/* Logo menempel langsung pada latar sidebar */}
      <div className="px-5 pt-6 pb-5 flex items-center gap-3 border-b border-slate-200/70">
        <SukmaMark height={38} className="shrink-0 drop-shadow-sm" />
        <div className="min-w-0">
          <p className="text-[15px] font-extrabold text-slate-900 leading-tight truncate">
            CBT Sekolah Sukma
          </p>
          <p className="text-[11px] font-medium text-slate-500 truncate">{scopeLabel}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Menu Utama
        </p>
        {items.map((item) => {
          const active = currentPage === item.key;
          return (
            <button
              key={item.key}
              onClick={() => {
                onNavigate(item.key);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                active
                  ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-md shadow-brand-600/25'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span className="truncate">{item.label}</span>
              {active && <span className="ml-auto text-[10px]">●</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-200/70">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-slate-100/70">
          {student ? (
            <SchoolLogo school={student.school} height={30} className="shrink-0" />
          ) : (
            <div className="w-9 h-9 shrink-0 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-sm">
              {avatarInitial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
            <p className="text-[11px] text-slate-500 truncate">{roleText}</p>
          </div>
          <button
            onClick={onLogout}
            title="Keluar"
            className="w-8 h-8 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition flex items-center justify-center"
          >
            ⎋
          </button>
        </div>
        <p className="mt-2 px-2 text-[10px] text-slate-400 flex items-center gap-1.5">
          <SukmaMark height={12} />
          Sekolah Sukma · Kebonsari Malang
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-100" data-theme={activeTheme}>
      {/* Sidebar desktop */}
      <aside className="hidden lg:block sticky top-0 h-screen">{Sidebar}</aside>

      {/* Drawer mobile */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative animate-slideUp">{Sidebar}</div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/70 no-print">
          <div className="px-4 sm:px-6 h-16 flex items-center gap-3">
            <button
              className="lg:hidden w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center"
              onClick={() => setOpen(true)}
              aria-label="Buka menu"
            >
              ☰
            </button>
            {student && <SchoolLogo school={student.school} height={34} className="shrink-0" />}
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">
                {items.find((i) => i.key === currentPage)?.label ?? 'Dashboard'}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                Tahun Pelajaran 2025/2026 · Sistem Computer Based Test
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Terhubung
              </span>
              <button onClick={onLogout} className="btn-secondary !py-2 !px-3 text-xs">
                Keluar
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 animate-fadeIn">{children}</main>

        <footer className="px-6 py-4 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 sm:gap-3 text-[11px] text-slate-500 no-print">
          <LpiLogo height={30} />
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="font-semibold text-slate-600">
            © {new Date().getFullYear()} LPI Kebonsari - Malang
          </span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <SukmaMark height={14} /> Aplikasi CBT Sekolah Sukma
          </span>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
