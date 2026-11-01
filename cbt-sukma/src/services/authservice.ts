import { SchoolName, StaffAccount, UserRole, uid } from '../types';
import storage from './storageService';
import { DEFAULT_STAFF_ACCOUNTS } from './staffData';

/**
 * Akun guru / proktor / admin.
 *
 * Disimpan di `sukma_staff` (localStorage) sehingga admin dapat menambah,
 * mengubah, dan menghapus akun dari menu **Pengguna** tanpa membangun ulang
 * aplikasi. Bila data kosong, dipakai akun bawaan dari `staffData.ts`.
 */

const normalize = (u?: string) => (u || '').trim().toLowerCase();

/** Seluruh akun staf (selalu ada minimal akun bawaan). */
export const listStaffAccounts = (): StaffAccount[] => {
  const stored = storage.staff.getAll();
  if (stored.length) return stored;
  // pertama kali: tanam akun bawaan
  DEFAULT_STAFF_ACCOUNTS.forEach((acc) => storage.staff.add({ ...acc }));
  return DEFAULT_STAFF_ACCOUNTS;
};

/** Pastikan akun bawaan sudah ditanam (dipanggil saat aplikasi dibuka). */
export const ensureStaffSeeded = () => {
  if (storage.staff.getAll().length === 0) {
    DEFAULT_STAFF_ACCOUNTS.forEach((acc) => storage.staff.add({ ...acc }));
  }
};

export const authenticateStaff = (
  username: string,
  password: string,
): StaffAccount | null => {
  const u = normalize(username);
  const p = (password || '').trim();
  return listStaffAccounts().find((acc) => normalize(acc.username) === u && acc.password === p) || null;
};

export const staffAccount = (username?: string): StaffAccount | null =>
  listStaffAccounts().find((acc) => normalize(acc.username) === normalize(username)) || null;

/** Cakupan data (sekolah) untuk sebuah akun staf */
export const scopeOf = (username?: string): SchoolName | 'Semua' =>
  staffAccount(username)?.scope || 'Semua';

/** Apakah data dengan sekolah tertentu boleh diakses akun ini */
export const inScope = (
  scope: SchoolName | 'Semua',
  school: SchoolName | 'Semua' | undefined,
): boolean => scope === 'Semua' || school === scope || school === 'Semua';

/* ------------------------------------------------------------------ */
/*  Kelola akun (khusus admin)                                        */
/* ------------------------------------------------------------------ */
export interface StaffDraft {
  username: string;
  password: string;
  name: string;
  role: UserRole;
  scope: SchoolName | 'Semua';
  label: string;
}

export const validateStaffDraft = (
  draft: StaffDraft,
  editingUsername?: string,
): string | null => {
  const username = normalize(draft.username);
  if (!username) return 'Username wajib diisi.';
  if (!/^[a-z0-9._-]{3,}$/.test(username)) {
    return 'Username minimal 3 karakter, hanya huruf kecil, angka, titik, garis bawah, atau strip.';
  }
  if (!draft.name.trim()) return 'Nama guru/petugas wajib diisi.';
  if ((draft.password || '').length < 5) return 'Kata sandi minimal 5 karakter.';
  const duplicate = listStaffAccounts().some(
    (acc) => normalize(acc.username) === username && normalize(acc.username) !== normalize(editingUsername),
  );
  if (duplicate) return `Username "${username}" sudah dipakai akun lain.`;
  return null;
};

export const createStaffAccount = (draft: StaffDraft): StaffAccount => {
  const account: StaffAccount = {
    id: uid('stf'),
    username: normalize(draft.username),
    password: draft.password.trim(),
    name: draft.name.trim(),
    role: draft.role,
    scope: draft.scope,
    label: draft.label.trim() || draft.name.trim(),
  };
  storage.staff.add(account);
  return account;
};

export const updateStaffAccount = (username: string, draft: StaffDraft): void => {
  const all = listStaffAccounts();
  const target = all.find((acc) => normalize(acc.username) === normalize(username));
  if (!target) return;
  const next: StaffAccount = {
    ...target,
    ...draft,
    id: target.id,
    username: normalize(draft.username),
    password: draft.password.trim(),
    name: draft.name.trim(),
    label: draft.label.trim() || draft.name.trim(),
  };
  storage.staff.update(target.id, next);
};

export const deleteStaffAccount = (username: string): { ok: boolean; reason?: string } => {
  const all = listStaffAccounts();
  const target = all.find((acc) => normalize(acc.username) === normalize(username));
  if (!target) return { ok: false, reason: 'Akun tidak ditemukan.' };

  if (normalize(target.username) === 'admin') {
    return { ok: false, reason: 'Akun "admin" utama tidak boleh dihapus.' };
  }
  const admins = all.filter((acc) => acc.role === UserRole.ADMIN);
  if (target.role === UserRole.ADMIN && admins.length <= 1) {
    return { ok: false, reason: 'Minimal harus ada satu akun Administrator.' };
  }
  storage.staff.remove(target.id);
  return { ok: true };
};

export const resetStaffAccounts = (): void => {
  storage.staff.getAll().forEach((acc) => storage.staff.remove(acc.id));
  DEFAULT_STAFF_ACCOUNTS.forEach((acc) => storage.staff.add({ ...acc }));
};
