import React, { useMemo, useState } from 'react';
import { Exam, SCHOOLS, SchoolName, UserRole, uid } from '../../types';
import storage from '../../services/storageService';
import { Badge, EmptyState, Field, Modal, SectionHeader, useToast } from '../../components/ui';
import { SchoolBadge, SchoolLogo } from '../../components/Brand';
import { themeOfSchool } from '../../theme';
import { scopeOf } from '../../services/authService';

const todayStr = () => new Date().toISOString().slice(0, 10);

const randomToken = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const emptyExam = () => ({
  title: '',
  packetId: '',
  school: 'MI Islamiyah' as SchoolName | 'Semua',
  classes: [] as string[],
  date: todayStr(),
  startTime: '08:00',
  duration: 90,
  token: randomToken(),
  isActive: true,
  shuffle: false,
  kkm: 70,
});

const ExamSchedule: React.FC<{ userRole: UserRole; username: string }> = ({ username }) => {
  const scope = scopeOf(username);
  const scoped = scope !== 'Semua';
  const [version, setVersion] = useState(0);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [form, setForm] = useState(emptyExam());
  const { show, node } = useToast();

  const exams = useMemo(() => {
    void version;
    return storage.exams
      .getAll()
      .filter((e) => !scoped || e.school === scope || e.school === 'Semua')
      .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  }, [version, scoped, scope]);
  const packets = useMemo(() => {
    void version;
    return storage.packets
      .getAll()
      .filter((p) => !scoped || p.school === scope || p.school === 'Semua');
  }, [version, scoped, scope]);
  const questions = useMemo(() => {
    void version;
    return storage.questions.getAll();
  }, [version]);
  const students = useMemo(() => {
    void version;
    return storage.students
      .getAll()
      .filter((st) => !scoped || st.school === scope);
  }, [version, scoped, scope]);

  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    students
      .filter((s) => form.school === 'Semua' || s.school === form.school)
      .forEach((s) => set.add(s.className));
    return Array.from(set).sort();
  }, [students, form.school]);

  const openModal = (exam?: Exam) => {
    if (exam) {
      setEditing(exam);
      setForm({
        title: exam.title,
        packetId: exam.packetId,
        school: exam.school,
        classes: exam.classes,
        date: exam.date,
        startTime: exam.startTime,
        duration: exam.duration,
        token: exam.token,
        isActive: exam.isActive,
        shuffle: exam.shuffle,
        kkm: exam.kkm,
      });
    } else {
      setEditing(null);
      setForm({
        ...emptyExam(),
        packetId: packets[0]?.id || '',
        school: scoped ? (scope as SchoolName) : 'MI Islamiyah',
      });
    }
    setModal(true);
  };

  const save = () => {
    if (!form.title.trim()) return show('Judul ujian wajib diisi.', 'error');
    if (!form.packetId) return show('Pilih paket soal terlebih dahulu.', 'error');
    if (form.classes.length === 0) return show('Pilih minimal satu kelas peserta.', 'error');
    const payload = { ...form, school: scoped ? (scope as SchoolName) : form.school };
    if (editing) {
      storage.exams.update(editing.id, payload);
      show('Jadwal ujian diperbarui.');
    } else {
      storage.exams.add({ id: uid('exm'), createdAt: new Date().toISOString(), ...payload });
      show('Jadwal ujian baru dibuat.');
    }
    setModal(false);
    setVersion((v) => v + 1);
  };

  const remove = (exam: Exam) => {
    if (!window.confirm(`Hapus ujian "${exam.title}"? Hasil ujian siswa juga akan terhapus.`)) return;
    storage.exams.remove(exam.id);
    storage.results.saveAll(storage.results.getAll().filter((r) => r.examId !== exam.id));
    setVersion((v) => v + 1);
    show('Ujian dihapus.');
  };

  const toggleActive = (exam: Exam) => {
    storage.exams.update(exam.id, { isActive: !exam.isActive });
    setVersion((v) => v + 1);
    show(exam.isActive ? 'Ujian dinonaktifkan.' : 'Ujian diaktifkan.');
  };

  const duplicate = (exam: Exam) => {
    storage.exams.add({
      ...exam,
      id: uid('exm'),
      title: `${exam.title} (Copy)`,
      token: randomToken(),
      createdAt: new Date().toISOString(),
    });
    setVersion((v) => v + 1);
    show('Ujian diduplikasi.');
  };

  const toggleClass = (cls: string) => {
    setForm({
      ...form,
      classes: form.classes.includes(cls)
        ? form.classes.filter((c) => c !== cls)
        : [...form.classes, cls],
    });
  };

  const examStatus = (exam: Exam) => {
    const now = new Date();
    const start = new Date(`${exam.date}T${exam.startTime}:00`);
    const end = new Date(start.getTime() + exam.duration * 60000);
    if (!exam.isActive) return { label: 'Nonaktif', tone: 'slate' as const };
    const endOfDay = new Date(`${exam.date}T23:59:59`);
    if (now > endOfDay) return { label: 'Selesai', tone: 'blue' as const };
    if (now < start) return { label: 'Terjadwal', tone: 'amber' as const };
    if (now <= end) return { label: 'Berlangsung', tone: 'emerald' as const };
    return { label: 'Terbuka (susulan)', tone: 'violet' as const };
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Jadwal Ujian"
        subtitle={
          scoped
            ? `Jadwal, token, dan kelas peserta — ${scope}`
            : 'Atur jadwal, token, durasi, dan kelas peserta'
        }
        icon="🗓️"
        actions={
          <button className="btn-primary" onClick={() => openModal()}>
            + Buat Ujian
          </button>
        }
      />

      {exams.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🗓️"
            title="Belum ada jadwal ujian"
            description="Buat jadwal ujian dengan memilih paket soal, kelas peserta, tanggal, dan token."
            action={
              <button className="btn-primary" onClick={() => openModal()}>
                + Buat Ujian
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {exams.map((exam) => {
            const packet = packets.find((p) => p.id === exam.packetId);
            const qCount = questions.filter((q) => q.packetId === exam.packetId).length;
            const submissions = storage.results.getAll().filter((r) => r.examId === exam.id);
            const done = submissions.filter((r) => r.status === 'submitted').length;
            const status = examStatus(exam);
            return (
              <div
                key={exam.id}
                data-theme={themeOfSchool(exam.school === 'Semua' ? null : exam.school)}
                className="card p-5 flex flex-col hover:-translate-y-0.5 hover:shadow-lg transition-all border-t-4 border-t-brand-500"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge tone={status.tone}>{status.label}</Badge>
                  <SchoolBadge school={exam.school} />
                </div>
                <h3 className="font-extrabold text-slate-800 leading-snug min-h-[44px]">{exam.title}</h3>
                <p className="text-xs text-slate-500 mt-1 mb-1 line-clamp-1">{packet?.name || 'Paket tidak ditemukan'}</p>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Tanggal</p>
                    <p className="font-semibold text-slate-700">
                      {new Date(exam.date).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Waktu</p>
                    <p className="font-semibold text-slate-700">
                      {exam.startTime} · {exam.duration} mnt
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Soal</p>
                    <p className="font-semibold text-slate-700">{qCount} butir</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Peserta Selesai</p>
                    <p className="font-semibold text-slate-700">
                      {done}/{submissions.length || 0}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {exam.classes.map((c) => (
                    <span key={c} className="badge bg-brand-50 text-brand-700">
                      Kelas {c}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 px-3 py-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Token
                  </span>
                  <span className="font-mono font-extrabold tracking-[0.2em] text-brand-300">
                    {exam.token}
                  </span>
                </div>

                <div className="mt-auto pt-3 flex flex-wrap gap-1.5 border-t border-slate-100">
                  <button className="btn-secondary !py-1.5 !px-2.5 text-xs" onClick={() => openModal(exam)}>
                    ✏️ Edit
                  </button>
                  <button className="btn-secondary !py-1.5 !px-2.5 text-xs" onClick={() => toggleActive(exam)}>
                    {exam.isActive ? '⏸️ Nonaktifkan' : '▶️ Aktifkan'}
                  </button>
                  <button className="btn-ghost !py-1.5 !px-2 text-xs" onClick={() => duplicate(exam)}>
                    ⧉
                  </button>
                  <button
                    className="btn-ghost !py-1.5 !px-2 text-xs !text-rose-600 hover:!bg-rose-50 ml-auto"
                    onClick={() => remove(exam)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Edit Jadwal Ujian' : 'Buat Jadwal Ujian'}
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModal(false)}>
              Batal
            </button>
            <button className="btn-primary" onClick={save}>
              Simpan Jadwal
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Judul Ujian">
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Asesmen Literasi Semester Ganjil"
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Paket Soal">
              <select
                className="input"
                value={form.packetId}
                onChange={(e) => setForm({ ...form, packetId: e.target.value })}
              >
                <option value="">— Pilih paket —</option>
                {packets
                  .filter((p) => form.school === 'Semua' || p.school === form.school || p.school === 'Semua')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category})
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Sekolah" hint={scoped ? 'Dikunci sesuai sekolah akun Anda.' : undefined}>
              <select
                className="input disabled:bg-slate-100"
                disabled={scoped}
                value={scoped ? (scope as SchoolName) : form.school}
                onChange={(e) =>
                  setForm({ ...form, school: e.target.value as SchoolName | 'Semua', classes: [] })
                }
              >
                {SCHOOLS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                {!scoped && <option value="Semua">Semua Sekolah</option>}
              </select>
            </Field>
          </div>

          <div>
            <span className="label">Kelas Peserta</span>
            <div className="flex flex-wrap gap-2">
              {availableClasses.length === 0 && (
                <p className="text-xs text-slate-500">
                  Belum ada kelas pada sekolah ini — tambahkan data siswa terlebih dahulu.
                </p>
              )}
              {availableClasses.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleClass(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                    form.classes.includes(c)
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-brand-400'
                  }`}
                >
                  Kelas {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Tanggal">
              <input
                type="date"
                className="input"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
            <Field label="Jam Mulai">
              <input
                type="time"
                className="input"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
            </Field>
            <Field label="Durasi (menit)">
              <input
                type="number"
                min={5}
                className="input"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
              />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Token Ujian">
              <div className="flex gap-2">
                <input
                  className="input font-mono tracking-widest uppercase"
                  value={form.token}
                  onChange={(e) => setForm({ ...form, token: e.target.value.toUpperCase() })}
                />
                <button
                  type="button"
                  className="btn-secondary shrink-0"
                  onClick={() => setForm({ ...form, token: randomToken() })}
                >
                  🎲
                </button>
              </div>
            </Field>
            <Field label="KKM / Nilai Minimal">
              <input
                type="number"
                className="input"
                value={form.kkm}
                onChange={(e) => setForm({ ...form, kkm: Number(e.target.value) })}
              />
            </Field>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5 flex-1 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 accent-brand-600"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <span className="text-xs font-semibold text-slate-700">
                Aktifkan ujian (dapat diakses siswa)
              </span>
            </label>
            <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5 flex-1 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 accent-brand-600"
                checked={form.shuffle}
                onChange={(e) => setForm({ ...form, shuffle: e.target.checked })}
              />
              <span className="text-xs font-semibold text-slate-700">Acak urutan soal</span>
            </label>
          </div>
        </div>
      </Modal>
      {node}
    </div>
  );
};

export default ExamSchedule;
