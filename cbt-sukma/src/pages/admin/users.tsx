import React, { useEffect, useMemo, useState } from 'react';
import { SCHOOLS, SchoolName, StaffAccount, UserRole } from '../../types';
import storage from '../../services/storageService';
import {
  createStaffAccount,
  deleteStaffAccount,
  listStaffAccounts,
  resetStaffAccounts,
  updateStaffAccount,
  validateStaffDraft,
  StaffDraft,
} from '../../services/authService';
import { DEFAULT_STAFF_ACCOUNTS } from '../../services/staffData';
import { Badge, Card, EmptyState, Field, Modal, SectionHeader, useToast } from '../../components/ui';

const emptyDraft = (): StaffDraft => ({
  username: '',
  password: '',
  name: '',
  role: UserRole.TEACHER,
  scope: 'MI Islamiyah',
  label: '',
});

const scopeTone = (scope: string): 'amber' | 'blue' | 'teal' =>
  scope === 'MI Islamiyah' ? 'amber' : scope === 'SMP Al Hidayah' ? 'blue' : 'teal';

const scopeColor = (scope: string) =>
  scope === 'MI Islamiyah' ? '#c2410c' : scope === 'SMP Al Hidayah' ? '#1e40af' : '#0f766e';

const Users: React.FC<{ username: string }> = ({ username }) => {
  const [version, setVersion] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [filterScope, setFilterScope] = useState<'Semua' | SchoolName>('Semua');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffAccount | null>(null);
  const [draft, setDraft] = useState<StaffDraft>(emptyDraft());
  const [formError, setFormError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<StaffAccount | null>(null);
  const toast = useToast();

  useEffect(() => {
    const unsub = storage.subscribe(() => setVersion((v) => v + 1));
    return () => {
      unsub();
    };
  }, []);
  const accounts = useMemo(() => listStaffAccounts(), [version]);

  const visible = accounts.filter((acc) => {
    const matchScope = filterScope === 'Semua' || acc.scope === filterScope;
    const k = keyword.trim().toLowerCase();
    const matchKey =
      !k ||
      acc.username.toLowerCase().includes(k) ||
      acc.name.toLowerCase().includes(k) ||
      acc.label.toLowerCase().includes(k);
    return matchScope && matchKey;
  });

  const openAdd = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setFormError('');
    setShowPass(false);
    setFormOpen(true);
  };

  const openEdit = (acc: StaffAccount) => {
    setEditing(acc);
    setDraft({
      username: acc.username,
      password: acc.password,
      name: acc.name,
      role: acc.role,
      scope: acc.scope,
      label: acc.label,
    });
    setFormError('');
    setShowPass(false);
    setFormOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateStaffDraft(draft, editing?.username);
    if (err) {
      setFormError(err);
      return;
    }
    if (editing) {
      updateStaffAccount(editing.username, draft);
      toast.show(`Akun "${draft.username.trim().toLowerCase()}" diperbarui.`);
    } else {
      const acc = createStaffAccount(draft);
      toast.show(`Akun "${acc.username}" berhasil dibuat & bisa dipakai login.`);
    }
    setFormOpen(false);
  };

  const doDelete = () => {
    if (!confirmDelete) return;
    const res = deleteStaffAccount(confirmDelete.username);
    if (!res.ok) {
      toast.show(res.reason || 'Akun gagal dihapus.', 'error');
    } else {
      toast.show(`Akun "${confirmDelete.username}" dihapus.`);
    }
    setConfirmDelete(null);
  };

  const isSelf = (acc: StaffAccount) => acc.username.toLowerCase() === username.toLowerCase();
  const isProtected = (acc: StaffAccount) => acc.username.toLowerCase() === 'admin';

  const counts = {
    total: accounts.length,
    mi: accounts.filter((a) => a.scope === 'MI Islamiyah').length,
    smp: accounts.filter((a) => a.scope === 'SMP Al Hidayah').length,
    admin: accounts.filter((a) => a.role === UserRole.ADMIN).length,
  };

  return (
    <div>
      <SectionHeader
        icon="🔑"
        title="Akun Login"
        subtitle="Tambah, ubah, dan hapus akun guru, proktor, serta administrator yang boleh masuk ke aplikasi."
        actions={
          <>
            <button className="btn-secondary" onClick={() => { resetStaffAccounts(); toast.show('Akun bawaan dipulihkan (12 akun).'); }}>
              ♻️ Pulihkan Akun Bawaan
            </button>
            <button className="btn-primary" onClick={openAdd}>
              + Tambah Akun
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total akun', value: counts.total, icon: '🔑', tone: 'bg-brand-100 text-brand-700' },
          { label: 'Guru MI', value: counts.mi, icon: '🟠', tone: 'bg-amber-100 text-amber-700' },
          { label: 'Guru SMP', value: counts.smp, icon: '🔵', tone: 'bg-sky-100 text-sky-700' },
          { label: 'Administrator', value: counts.admin, icon: '🛡️', tone: 'bg-violet-100 text-violet-700' },
        ].map((s) => (
          <div key={s.label} className="card p-3 sm:p-4 flex items-center gap-3">
            <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-base sm:text-lg ${s.tone}`}>
              {s.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">{s.label}</p>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-800 leading-tight">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between mb-4">
          <div className="flex flex-wrap gap-1.5">
            {(['Semua', ...SCHOOLS] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterScope(s as 'Semua' | SchoolName)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filterScope === s
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s === 'Semua' ? 'Semua cakupan' : s}
              </button>
            ))}
          </div>
          <input
            className="input sm:max-w-xs"
            placeholder="Cari username / nama…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon="🔑"
            title="Belum ada akun yang cocok"
            description="Ubah kata kunci pencarian atau tambahkan akun baru untuk guru dan proktor."
            action={<button className="btn-primary" onClick={openAdd}>+ Tambah Akun</button>}
          />
        ) : (
          <>
            {/* Tabel (layar sedang ke atas) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <th className="py-2.5 pr-3">Nama / Label</th>
                    <th className="py-2.5 pr-3">Username</th>
                    <th className="py-2.5 pr-3">Kata Sandi</th>
                    <th className="py-2.5 pr-3">Peran</th>
                    <th className="py-2.5 pr-3">Cakupan</th>
                    <th className="py-2.5 pr-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((acc) => (
                    <tr key={acc.id || acc.username} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                      <td className="py-3 pr-3">
                        <p className="font-bold text-slate-800 leading-tight">{acc.name}</p>
                        <p className="text-[11px] font-semibold" style={{ color: scopeColor(acc.scope) }}>
                          {acc.label}
                        </p>
                      </td>
                      <td className="py-3 pr-3 font-mono text-xs text-slate-700">{acc.username}</td>
                      <td className="py-3 pr-3 font-mono text-xs text-slate-500">
                        {showPass ? acc.password : '••••••••'}
                      </td>
                      <td className="py-3 pr-3">
                        <Badge tone={acc.role === UserRole.ADMIN ? 'violet' : 'slate'}>
                          {acc.role === UserRole.ADMIN ? 'Administrator' : 'Guru / Proktor'}
                        </Badge>
                      </td>
                      <td className="py-3 pr-3">
                        <Badge tone={scopeTone(acc.scope)}>{acc.scope}</Badge>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                            onClick={() => openEdit(acc)}
                          >
                            ✏️ Ubah
                          </button>
                          <button
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed"
                            disabled={isProtected(acc) || isSelf(acc)}
                            title={
                              isProtected(acc)
                                ? 'Akun admin utama tidak boleh dihapus'
                                : isSelf(acc)
                                ? 'Akun yang sedang dipakai tidak bisa dihapus'
                                : 'Hapus akun'
                            }
                            onClick={() => setConfirmDelete(acc)}
                          >
                            🗑️ Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Kartu (HP) */}
            <div className="md:hidden space-y-2.5">
              {visible.map((acc) => (
                <div key={acc.id || acc.username} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm leading-tight">{acc.name}</p>
                      <p className="text-[11px] font-semibold" style={{ color: scopeColor(acc.scope) }}>
                        {acc.label}
                      </p>
                    </div>
                    <span className="shrink-0">
                      <Badge tone={scopeTone(acc.scope)}>{acc.scope}</Badge>
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] font-mono text-slate-600 space-y-0.5">
                    <p>👤 {acc.username}</p>
                    <p>🔑 {showPass ? acc.password : '••••••••'}</p>
                  </div>
                  <div className="mt-2.5 flex gap-1.5">
                    <button
                      className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700"
                      onClick={() => openEdit(acc)}
                    >
                      ✏️ Ubah
                    </button>
                    <button
                      className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-600 disabled:opacity-40"
                      disabled={isProtected(acc) || isSelf(acc)}
                      onClick={() => setConfirmDelete(acc)}
                    >
                      🗑️ Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-slate-500">
              <button
                className="self-start px-2.5 py-1 rounded-lg font-bold bg-slate-100 text-slate-600"
                onClick={() => setShowPass((v) => !v)}
              >
                {showPass ? '🙈 Sembunyikan sandi' : '👁️ Tampilkan sandi'}
              </button>
              <p>
                {visible.length} dari {accounts.length} akun · akun baru langsung bisa dipakai login &
                tampil di daftar akun demo halaman login.
              </p>
            </div>
          </>
        )}
      </Card>

      <p className="text-[11px] text-slate-400 mt-3">
        Catatan: akun login disimpan di perangkat ini (localStorage) dan tidak ikut tersinkron ke Google
        Sheets. Akun bawaan: {DEFAULT_STAFF_ACCOUNTS.length} akun (sandi guru <span className="font-mono">guru123</span>,
        admin <span className="font-mono">admin123</span>).
      </p>

      {/* ---------- Form tambah / ubah ---------- */}
      <Modal
        open={formOpen}
        title={editing ? 'Ubah Akun Login' : 'Tambah Akun Login'}
        subtitle={editing ? `Memperbarui akun ${editing.username}` : 'Akun baru langsung aktif setelah disimpan.'}
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setFormOpen(false)}>
              Batal
            </button>
            <button className="btn-primary" form="staff-form" type="submit">
              {editing ? 'Simpan Perubahan' : 'Tambah Akun'}
            </button>
          </>
        }
      >
        <form id="staff-form" className="space-y-3.5" onSubmit={submit}>
          <div className="grid sm:grid-cols-2 gap-3.5">
            <Field label="Username" hint="Huruf kecil/angka/titik, minimal 3 karakter.">
              <input
                className="input font-mono"
                placeholder="guru.mi6"
                value={draft.username}
                onChange={(e) => {
                  setDraft({ ...draft, username: e.target.value });
                  setFormError('');
                }}
                autoFocus
              />
            </Field>
            <Field label="Kata Sandi" hint="Minimal 5 karakter.">
              <div className="relative">
                <input
                  className="input pr-16 font-mono"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={draft.password}
                  onChange={(e) => {
                    setDraft({ ...draft, password: e.target.value });
                    setFormError('');
                  }}
                />
                <button
                  type="button"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 bg-slate-100 rounded-md px-2 py-1"
                  onClick={() => setShowPass((v) => !v)}
                >
                  {showPass ? 'SEMBUNYI' : 'LIHAT'}
                </button>
              </div>
            </Field>
          </div>

          <Field label="Nama Lengkap">
            <input
              className="input"
              placeholder="Ust. Abdullah Hakim, S.Pd"
              value={draft.name}
              onChange={(e) => {
                setDraft({ ...draft, name: e.target.value });
                setFormError('');
              }}
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-3.5">
            <Field label="Peran" hint="Administrator bisa membuka menu Pengaturan & Akun Login.">
              <select
                className="input"
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value as UserRole })}
              >
                <option value={UserRole.TEACHER}>Guru / Proktor</option>
                <option value={UserRole.ADMIN}>Administrator</option>
              </select>
            </Field>
            <Field label="Cakupan Sekolah" hint="Guru hanya melihat data sekolahnya sendiri.">
              <select
                className="input"
                value={draft.scope}
                onChange={(e) => setDraft({ ...draft, scope: e.target.value as SchoolName | 'Semua' })}
              >
                <option value="MI Islamiyah">MI Islamiyah</option>
                <option value="SMP Al Hidayah">SMP Al Hidayah</option>
                <option value="Semua">Semua sekolah</option>
              </select>
            </Field>
          </div>

          <Field label="Label Tampilan" hint="Teks kecil di sidebar & daftar akun demo, mis. “Guru MI Islamiyah 6”.">
            <input
              className="input"
              placeholder="Guru MI Islamiyah 6"
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            />
          </Field>

          {formError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold px-3 py-2.5">
              ⚠️ {formError}
            </div>
          )}
        </form>
      </Modal>

      {/* ---------- Konfirmasi hapus ---------- */}
      <Modal
        open={!!confirmDelete}
        title="Hapus akun login?"
        subtitle={confirmDelete ? `${confirmDelete.name} · ${confirmDelete.username}` : ''}
        size="sm"
        onClose={() => setConfirmDelete(null)}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>
              Batal
            </button>
            <button className="btn-primary !bg-rose-600 hover:!bg-rose-700" onClick={doDelete}>
              Ya, Hapus
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Akun ini tidak akan bisa dipakai login lagi dan hilang dari daftar akun demo. Data siswa, soal,
          dan hasil ujian <strong>tidak</strong> terhapus. Anda dapat memulihkan akun bawaan lewat tombol
          “Pulihkan Akun Bawaan”.
        </p>
      </Modal>

      {toast.node}
    </div>
  );
};

export default Users;
