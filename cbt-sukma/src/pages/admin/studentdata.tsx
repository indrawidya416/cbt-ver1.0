import React, { useMemo, useRef, useState } from 'react';
import { SCHOOLS, SchoolName, Student, uid } from '../../types';
import storage from '../../services/storageService';
import { Badge, EmptyState, Field, Modal, SectionHeader, useToast } from '../../components/ui';
import { SchoolBadge } from '../../components/Brand';
import { scopeOf } from '../../services/authService';
import { downloadXlsx, readAnyTableFile, rowsToText } from '../../services/excelService';

const emptyForm = {
  nis: '',
  name: '',
  school: 'MI Islamiyah' as SchoolName,
  className: '',
  gender: 'L' as 'L' | 'P',
  password: '12345',
};

const StudentData: React.FC<{ username?: string }> = ({ username }) => {
  const scope = scopeOf(username);
  const scoped = scope !== 'Semua';
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState('');
  const [filterSchool, setFilterSchool] = useState<'Semua' | SchoolName>('Semua');
  const [filterClass, setFilterClass] = useState('Semua');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [importRowCount, setImportRowCount] = useState(0);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { show, node } = useToast();

  const students = useMemo(() => {
    void version;
    return storage.students
      .getAll()
      .filter((s) => !scoped || s.school === scope);
  }, [version, scoped, scope]);

  const classes = useMemo(() => {
    const set = new Set<string>();
    students
      .filter((s) => filterSchool === 'Semua' || s.school === filterSchool)
      .forEach((s) => set.add(s.className));
    return Array.from(set).sort();
  }, [students, filterSchool]);

  const filtered = students.filter((s) => {
    const matchSchool = filterSchool === 'Semua' || s.school === filterSchool;
    const matchClass = filterClass === 'Semua' || s.className === filterClass;
    const q = search.trim().toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.nis.includes(q);
    return matchSchool && matchClass && matchSearch;
  });

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      school: scoped ? (scope as SchoolName) : filterSchool === 'Semua' ? 'MI Islamiyah' : filterSchool,
    });
    setModalOpen(true);
  };

  const openEdit = (s: Student) => {
    setEditing(s);
    setForm({
      nis: s.nis,
      name: s.name,
      school: s.school,
      className: s.className,
      gender: s.gender,
      password: s.password || '',
    });
    setModalOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nis.trim() || !form.name.trim() || !form.className.trim()) {
      show('NIS, nama, dan kelas wajib diisi.', 'error');
      return;
    }
    const duplicate = students.find(
      (s) => s.nis.trim() === form.nis.trim() && s.id !== editing?.id,
    );
    if (duplicate) {
      show(`NIS ${form.nis} sudah dipakai oleh ${duplicate.name}.`, 'error');
      return;
    }
    const payload = { ...form, school: scoped ? (scope as SchoolName) : form.school };
    if (editing) {
      storage.students.update(editing.id, payload);
      show('Data siswa berhasil diperbarui.');
    } else {
      storage.students.add({ id: uid('std'), createdAt: new Date().toISOString(), ...payload });
      show('Siswa baru berhasil ditambahkan.');
    }
    setModalOpen(false);
    setVersion((v) => v + 1);
  };

  const remove = (s: Student) => {
    if (!window.confirm(`Hapus data siswa "${s.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    storage.students.remove(s.id);
    setVersion((v) => v + 1);
    show('Data siswa dihapus.');
  };

  const exportCsv = () => {
    const rows = [
      ['NIS', 'Nama', 'Sekolah', 'Kelas', 'JK', 'Password'],
      ...filtered.map((s) => [s.nis, s.name, s.school, s.className, s.gender, s.password || '']),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `data-siswa-sukma-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    show(`${filtered.length} data siswa diekspor (CSV).`);
  };

  const exportXlsx = () => {
    const rows: (string | number)[][] = [
      ['NIS', 'Nama', 'Sekolah', 'Kelas', 'JK', 'Password'],
      ...filtered.map((s) => [s.nis, s.name, s.school, s.className, s.gender, s.password || '']),
    ];
    downloadXlsx(`data-siswa-sukma-${new Date().toISOString().slice(0, 10)}.xlsx`, [
      { name: scoped ? scope.slice(0, 28) : 'Data Siswa', rows, widths: [14, 30, 18, 10, 6, 12] },
    ]);
    show(`${filtered.length} data siswa diekspor ke Excel (.xlsx).`);
  };

  const downloadTemplate = () => {
    downloadXlsx('template-import-siswa.xlsx', [
      {
        name: 'Data Siswa',
        rows: [
          ['NIS', 'Nama', 'Sekolah', 'Kelas', 'JK', 'Password'],
          ['2510021', 'Ahmad Subarjo', 'MI Islamiyah', '5A', 'L', '12345'],
          ['2511024', 'Nadia Salsabila', 'SMP Al Hidayah', '8B', 'P', '12345'],
        ],
        widths: [14, 30, 18, 10, 6, 12],
      },
    ]);
    show('Template Excel diunduh. Isi datanya lalu unggah kembali di sini.');
  };

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const rows = await readAnyTableFile(file);
      const filled = rows.filter((r) => r.some((c) => c !== ''));
      setImportFileName(file.name);
      setImportRowCount(filled.length);
      setImportText(rowsToText(filled));
      show(`File "${file.name}" terbaca: ${filled.length} baris. Periksa lalu klik Import Sekarang.`);
    } catch {
      show('Gagal membaca file. Pastikan file .xlsx / .xls / .csv tidak rusak.');
    }
  };

  const doImport = () => {
    const lines = importText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    let added = 0;
    let skipped = 0;
    lines.forEach((line) => {
      const parts = line.split(/[,;\t]/).map((p) => p.trim());
      // lewati baris judul kolom (mis. "NIS, Nama, Sekolah, ...")
      if (/^nis$/i.test(parts[0] || '') || /^no\.?$/i.test(parts[0] || '')) return;
      if (parts.length < 4) {
        skipped += 1;
        return;
      }
      const [nis, name, school, className, gender, pass] = parts;
      if (students.some((s) => s.nis === nis) || !nis || !name) {
        skipped += 1;
        return;
      }
      const schoolName: SchoolName = school.toLowerCase().includes('smp')
        ? 'SMP Al Hidayah'
        : 'MI Islamiyah';
      // guru sekolah tertentu hanya boleh menambah siswa sekolahnya sendiri
      if (scoped && schoolName !== scope) {
        skipped += 1;
        return;
      }
      storage.students.add({
        id: uid('std'),
        nis,
        name,
        school: schoolName,
        className: className || '-',
        gender: /^p|^f|perempuan|wanita/i.test(gender || '') ? 'P' : 'L',
        password: pass && pass.length >= 4 ? pass : '12345',
        createdAt: new Date().toISOString(),
      });
      added += 1;
    });
    setImportOpen(false);
    setImportText('');
    setVersion((v) => v + 1);
    show(`${added} siswa ditambahkan${skipped ? `, ${skipped} baris dilewati` : ''}.`);
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Data Siswa"
        subtitle={scoped ? `Peserta ujian ${scope}` : 'Kelola peserta ujian MI Islamiyah & SMP Al Hidayah'}
        icon="👥"
        actions={
          <>
            <button className="btn-secondary" onClick={() => setImportOpen(true)}>
              ⬆️ Import
            </button>
            <button className="btn-secondary" onClick={exportXlsx} title="Unduh Excel (.xlsx)">
              ⬇️ Excel
            </button>
            <button className="btn-secondary" onClick={exportCsv} title="Unduh CSV">
              ⬇️ CSV
            </button>
            <button className="btn-primary" onClick={openAdd}>
              + Tambah Siswa
            </button>
          </>
        }
      />

      <div className="card p-4 grid gap-3 sm:grid-cols-3">
        <input
          className="input"
          placeholder="🔍 Cari nama atau NIS..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {!scoped && (
          <select
            className="input"
            value={filterSchool}
            onChange={(e) => {
              setFilterSchool(e.target.value as any);
              setFilterClass('Semua');
            }}
          >
            <option value="Semua">Semua Sekolah</option>
            {SCHOOLS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
        <select className="input" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
          <option value="Semua">Semua Kelas</option>
          {classes.map((c) => (
            <option key={c} value={c}>
              Kelas {c}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="th w-12">No</th>
                <th className="th">NIS</th>
                <th className="th">Nama Siswa</th>
                <th className="th">Sekolah</th>
                <th className="th">Kelas</th>
                <th className="th">JK</th>
                <th className="th text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s, i) => (
                <tr key={s.id} className="hover:bg-brand-50/40 transition">
                  <td className="td text-slate-400">{i + 1}</td>
                  <td className="td font-mono text-xs">{s.nis}</td>
                  <td className="td font-semibold text-slate-800">{s.name}</td>
                  <td className="td">
                    <SchoolBadge school={s.school} />
                  </td>
                  <td className="td">{s.className}</td>
                  <td className="td">{s.gender}</td>
                  <td className="td text-right whitespace-nowrap">
                    <button className="btn-ghost !px-2 !py-1.5 text-xs" onClick={() => openEdit(s)}>
                      ✏️ Edit
                    </button>
                    <button
                      className="btn-ghost !px-2 !py-1.5 text-xs !text-rose-600 hover:!bg-rose-50"
                      onClick={() => remove(s)}
                    >
                      🗑️ Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <EmptyState
            icon="🧑‍🎓"
            title="Belum ada data siswa"
            description="Tambahkan siswa satu per satu, import dari file Excel (.xlsx/.xls) atau CSV, atau isi data contoh dari menu Pengaturan."
            action={
              <button className="btn-primary" onClick={openAdd}>
                + Tambah Siswa
              </button>
            }
          />
        )}
        {filtered.length > 0 && (
          <div className="px-4 py-3 bg-slate-50/60 text-xs text-slate-500 font-medium">
            Menampilkan {filtered.length} dari {students.length} siswa
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
        subtitle="Pastikan NIS unik untuk setiap siswa."
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>
              Batal
            </button>
            <button className="btn-primary" onClick={submit}>
              {editing ? 'Simpan Perubahan' : 'Tambah Siswa'}
            </button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="NIS">
              <input
                className="input"
                value={form.nis}
                onChange={(e) => setForm({ ...form, nis: e.target.value })}
                placeholder="2510009"
              />
            </Field>
            <Field label="Kelas">
              <input
                className="input"
                value={form.className}
                onChange={(e) => setForm({ ...form, className: e.target.value })}
                placeholder="5A / 8B"
              />
            </Field>
          </div>
          <Field label="Nama Lengkap">
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nama sesuai rapor"
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Sekolah" hint={scoped ? 'Dikunci sesuai sekolah akun Anda.' : undefined}>
              <select
                className="input disabled:bg-slate-100"
                disabled={scoped}
                value={scoped ? (scope as SchoolName) : form.school}
                onChange={(e) => setForm({ ...form, school: e.target.value as SchoolName })}
              >
                {SCHOOLS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Jenis Kelamin">
              <select
                className="input"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value as 'L' | 'P' })}
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </Field>
          </div>
          <Field label="Kata Sandi" hint="Kosongkan bila siswa cukup login dengan NIS.">
            <input
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="12345"
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Data Siswa"
        subtitle="Unggah file Excel (.xlsx/.xls) atau CSV, atau tempel data manual. Kolom: NIS, Nama, Sekolah, Kelas, JK, Password"
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setImportOpen(false)}>
              Batal
            </button>
            <button className="btn-primary" onClick={doImport}>
              Import Sekarang
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/70 p-4">
            <p className="text-sm font-bold text-slate-800">📄 Unggah file Excel / CSV</p>
            <p className="text-xs text-slate-500 mt-1">
              Pilih file <b>.xlsx</b>, <b>.xls</b>, atau <b>.csv</b> hasil unduhan/template di bawah.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <button type="button" className="btn-primary" onClick={() => fileRef.current?.click()}>
                Pilih File
              </button>
              <button type="button" className="btn-secondary" onClick={downloadTemplate}>
                ⬇️ Template Excel
              </button>
            </div>
            {importFileName && (
              <p className="mt-2 text-[11px] font-semibold text-brand-700">
                ✅ {importFileName} — {importRowCount} baris terbaca, sudah diisikan ke kolom di bawah.
              </p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={pickFile}
            />
          </div>

          <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            <span className="flex-1 h-px bg-slate-200" />
            atau tempel manual
            <span className="flex-1 h-px bg-slate-200" />
          </div>

          <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 text-xs text-brand-800 space-y-1">
            <p className="font-bold">Contoh baris yang dapat ditempel:</p>
            <pre className="font-mono text-[11px] whitespace-pre-wrap">
{`2510021, Ahmad Subarjo, MI Islamiyah, 5A, L
2511024, Nadia Salsabila, SMP Al Hidayah, 8B, P`}
            </pre>
          </div>
          <textarea
            className="input min-h-[200px] font-mono text-xs"
            placeholder="Tempel data di sini (satu siswa per baris)..."
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
        </div>
      </Modal>
      {node}
    </div>
  );
};

export default StudentData;
