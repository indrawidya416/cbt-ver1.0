import { StaffAccount, UserRole } from '../types';

/**
 * Akun bawaan (seed) guru/proktor/admin.
 * Daftar ini hanya dipakai saat pertama kali aplikasi dijalankan;
 * setelah itu akun dikelola lewat menu **Pengguna** (admin) dan disimpan
 * di localStorage (`sukma_staff`) serta bisa disinkronkan ke Google Sheet.
 */
export const DEFAULT_STAFF_ACCOUNTS: StaffAccount[] = [
  /* ---------------- MI Islamiyah — 5 akun guru ---------------- */
  { id: 'stf_guru_mi', username: 'guru.mi', password: 'guru123', name: 'Ust. Ahmad Fauzi, S.Pd.I', role: UserRole.TEACHER, scope: 'MI Islamiyah', label: 'Guru MI Islamiyah 1' },
  { id: 'stf_guru_mi2', username: 'guru.mi2', password: 'guru123', name: 'Ustzh. Siti Aminah, S.Pd', role: UserRole.TEACHER, scope: 'MI Islamiyah', label: 'Guru MI Islamiyah 2' },
  { id: 'stf_guru_mi3', username: 'guru.mi3', password: 'guru123', name: 'Ust. Muhammad Ridwan, S.Pd.I', role: UserRole.TEACHER, scope: 'MI Islamiyah', label: 'Guru MI Islamiyah 3' },
  { id: 'stf_guru_mi4', username: 'guru.mi4', password: 'guru123', name: 'Ustzh. Nur Hidayah, S.Ag', role: UserRole.TEACHER, scope: 'MI Islamiyah', label: 'Guru MI Islamiyah 4' },
  { id: 'stf_guru_mi5', username: 'guru.mi5', password: 'guru123', name: 'Ust. Zainal Abidin, S.Pd', role: UserRole.TEACHER, scope: 'MI Islamiyah', label: 'Guru MI Islamiyah 5' },

  /* ---------------- SMP Al Hidayah — 5 akun guru ---------------- */
  { id: 'stf_guru_smp', username: 'guru.smp', password: 'guru123', name: 'Bpk. Bambang Setiawan, S.Pd', role: UserRole.TEACHER, scope: 'SMP Al Hidayah', label: 'Guru SMP Al Hidayah 1' },
  { id: 'stf_guru_smp2', username: 'guru.smp2', password: 'guru123', name: 'Ibu Retno Wulandari, S.Pd', role: UserRole.TEACHER, scope: 'SMP Al Hidayah', label: 'Guru SMP Al Hidayah 2' },
  { id: 'stf_guru_smp3', username: 'guru.smp3', password: 'guru123', name: 'Bpk. Agus Prasetyo, M.Pd', role: UserRole.TEACHER, scope: 'SMP Al Hidayah', label: 'Guru SMP Al Hidayah 3' },
  { id: 'stf_guru_smp4', username: 'guru.smp4', password: 'guru123', name: 'Ibu Dwi Lestari, S.Pd', role: UserRole.TEACHER, scope: 'SMP Al Hidayah', label: 'Guru SMP Al Hidayah 4' },
  { id: 'stf_guru_smp5', username: 'guru.smp5', password: 'guru123', name: 'Bpk. Hendra Kusuma, S.Kom', role: UserRole.TEACHER, scope: 'SMP Al Hidayah', label: 'Guru SMP Al Hidayah 5' },

  /* ---------------- Proktor & Administrator ---------------- */
  { id: 'stf_guru', username: 'guru', password: 'guru123', name: 'Proktor Sekolah Sukma', role: UserRole.TEACHER, scope: 'Semua', label: 'Proktor (semua sekolah)' },
  { id: 'stf_admin', username: 'admin', password: 'admin123', name: 'Administrator', role: UserRole.ADMIN, scope: 'Semua', label: 'Administrator (semua sekolah)' },
];
