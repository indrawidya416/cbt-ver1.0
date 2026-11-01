import React, { useEffect, useMemo, useState } from 'react';
import {
  CATEGORIES,
  Category,
  Question,
  QuestionOption,
  QuestionType,
  SCHOOLS,
  SchoolName,
  uid,
  Packet,
  UserRole,
} from '../../types';
import storage from '../../services/storageService';
import { scopeOf } from '../../services/authService';
import { Badge, EmptyState, Field, Modal, SectionHeader, useToast } from '../../components/ui';
import ImagePicker from '../../components/ImagePicker';
import { totalChars } from '../../services/imageService';

const typeLabel: Record<QuestionType, string> = {
  multiple_choice: 'Pilihan Ganda',
  complex_mc: 'Pilihan Ganda Kompleks',
  true_false: 'Benar / Salah',
  essay: 'Uraian',
};

const typeTone: Record<QuestionType, 'teal' | 'violet' | 'blue' | 'amber'> = {
  multiple_choice: 'teal',
  complex_mc: 'violet',
  true_false: 'blue',
  essay: 'amber',
};

const defaultOptions = (): QuestionOption[] => [
  { id: 'A', text: '' },
  { id: 'B', text: '' },
  { id: 'C', text: '' },
  { id: 'D', text: '' },
];

const emptyQuestion = {
  type: 'multiple_choice' as QuestionType,
  text: '',
  stimulus: '',
  images: [] as string[],
  options: defaultOptions(),
  answerKey: [] as string[],
  score: 1,
  explanation: '',
};

const catTone: Record<string, 'teal' | 'blue' | 'violet' | 'amber'> = {
  Literasi: 'teal',
  Numerasi: 'amber',
  Sains: 'blue',
  Mapel: 'violet',
};

const QuestionBank: React.FC<{ userRole: UserRole; username: string }> = ({ username }) => {
  const scope = scopeOf(username);
  const scoped = scope !== 'Semua';
  const [version, setVersion] = useState(0);
  const [selectedPacket, setSelectedPacket] = useState<string | null>(null);
  const [packetModal, setPacketModal] = useState(false);
  const [editingPacket, setEditingPacket] = useState<Packet | null>(null);
  const [questionModal, setQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [form, setForm] = useState({ ...emptyQuestion });
  const [packetForm, setPacketForm] = useState({
    name: '',
    category: 'Literasi' as Category,
    subject: '',
    school: 'MI Islamiyah' as SchoolName | 'Semua',
    level: '',
    description: '',
  });
  const [filterCategory, setFilterCategory] = useState<'Semua' | Category>('Semua');
  const { show, node } = useToast();

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

  useEffect(() => {
    if (!selectedPacket && packets.length > 0) setSelectedPacket(packets[0].id);
    if (selectedPacket && !packets.some((p) => p.id === selectedPacket)) {
      setSelectedPacket(packets[0]?.id ?? null);
    }
  }, [packets, selectedPacket]);

  const visiblePackets = packets.filter(
    (p) => filterCategory === 'Semua' || p.category === filterCategory,
  );
  const currentPacket = packets.find((p) => p.id === selectedPacket) || null;
  const currentQuestions = questions.filter((q) => q.packetId === selectedPacket);
  const totalScore = currentQuestions.reduce((a, q) => a + (q.score || 0), 0);

  /* ------------------------- Paket soal ------------------------- */
  const openPacketModal = (packet?: Packet) => {
    if (packet) {
      setEditingPacket(packet);
      setPacketForm({
        name: packet.name,
        category: packet.category,
        subject: packet.subject,
        school: packet.school,
        level: packet.level,
        description: packet.description || '',
      });
    } else {
      setEditingPacket(null);
      setPacketForm({
        name: '',
        category: 'Literasi',
        subject: '',
        school: scoped ? (scope as SchoolName) : 'MI Islamiyah',
        level: '',
        description: '',
      });
    }
    setPacketModal(true);
  };

  const savePacket = () => {
    if (!packetForm.name.trim()) {
      show('Nama paket soal wajib diisi.', 'error');
      return;
    }
    const packetPayload = { ...packetForm, school: scoped ? (scope as SchoolName) : packetForm.school };
    if (editingPacket) {
      storage.packets.update(editingPacket.id, packetPayload);
      show('Paket soal diperbarui.');
    } else {
      const id = uid('pkt');
      storage.packets.add({ id, createdAt: new Date().toISOString(), ...packetPayload });
      setSelectedPacket(id);
      show('Paket soal baru dibuat.');
    }
    setPacketModal(false);
    setVersion((v) => v + 1);
  };

  const deletePacket = (p: Packet) => {
    const count = questions.filter((q) => q.packetId === p.id).length;
    if (
      !window.confirm(
        `Hapus paket "${p.name}" beserta ${count} soal di dalamnya? Ujian yang memakai paket ini akan kehilangan soal.`,
      )
    )
      return;
    storage.questions.saveAll(questions.filter((q) => q.packetId !== p.id));
    storage.packets.remove(p.id);
    setVersion((v) => v + 1);
    show('Paket soal dihapus.');
  };

  /* ------------------------- Soal ------------------------- */
  const openQuestionModal = (q?: Question) => {
    if (!selectedPacket) {
      show('Pilih atau buat paket soal terlebih dahulu.', 'error');
      return;
    }
    if (q) {
      setEditingQuestion(q);
      setForm({
        type: q.type,
        text: q.text,
        stimulus: q.stimulus || '',
        images: q.images ? [...q.images] : [],
        options: q.options.length ? q.options : defaultOptions(),
        answerKey: q.answerKey,
        score: q.score,
        explanation: q.explanation || '',
      });
    } else {
      setEditingQuestion(null);
      setForm({ ...emptyQuestion, options: defaultOptions() });
    }
    setQuestionModal(true);
  };

  const changeType = (type: QuestionType) => {
    if (type === 'true_false') {
      setForm({
        ...form,
        type,
        options: [
          { id: 'true', text: 'Benar' },
          { id: 'false', text: 'Salah' },
        ],
        answerKey: [],
        score: 1,
      });
      return;
    }
    if (type === 'essay') {
      setForm({ ...form, type, options: [], answerKey: [], score: form.score > 1 ? form.score : 4 });
      return;
    }
    setForm({
      ...form,
      type,
      options: form.options.length ? form.options : defaultOptions(),
      answerKey: form.type === 'essay' ? [] : form.answerKey,
      score: type === 'complex_mc' ? 2 : 1,
    });
  };

  const toggleAnswer = (id: string) => {
    if (form.type === 'multiple_choice' || form.type === 'true_false') {
      setForm({ ...form, answerKey: [id] });
      return;
    }
    setForm({
      ...form,
      answerKey: form.answerKey.includes(id)
        ? form.answerKey.filter((k) => k !== id)
        : [...form.answerKey, id],
    });
  };

  const saveQuestion = () => {
    if (!form.text.trim() && !(form.images?.length ?? 0)) {
      show('Teks soal (atau gambar soal) wajib diisi.', 'error');
      return;
    }
    if (form.type !== 'essay' && form.answerKey.length === 0) {
      show('Tentukan kunci jawaban terlebih dahulu.', 'error');
      return;
    }
    if (form.type !== 'essay' && form.options.some((o) => !o.text.trim() && !o.image)) {
      show('Semua pilihan jawaban harus diisi (teks atau gambar).', 'error');
      return;
    }
    const imageChars =
      totalChars(form.images || []) +
      form.options.reduce((a, o) => a + (o.image?.length || 0), 0);
    if (imageChars > 36000) {
      show(
        `Gambar soal ini terlalu besar (${Math.round(imageChars / 1000)} ribu karakter, maksimal 36 ribu). Kurangi jumlah gambar atau gunakan gambar yang lebih kecil.`,
        'error',
      );
      return;
    }
    const payload = {
      packetId: selectedPacket!,
      type: form.type,
      text: form.text,
      stimulus: form.stimulus,
      images: form.images || [],
      options: form.options,
      answerKey: form.answerKey,
      score: Number(form.score) || 1,
      explanation: form.explanation,
    };
    if (editingQuestion) {
      storage.questions.update(editingQuestion.id, payload);
      show('Soal diperbarui.');
    } else {
      storage.questions.add({ id: uid('q'), createdAt: new Date().toISOString(), ...payload });
      show('Soal ditambahkan ke bank soal.');
    }
    setQuestionModal(false);
    setVersion((v) => v + 1);
  };

  const duplicateQuestion = (q: Question) => {
    storage.questions.add({ ...q, id: uid('q'), createdAt: new Date().toISOString() });
    setVersion((v) => v + 1);
    show('Soal diduplikasi.');
  };

  const deleteQuestion = (q: Question) => {
    if (!window.confirm('Hapus soal ini dari bank soal?')) return;
    storage.questions.remove(q.id);
    setVersion((v) => v + 1);
    show('Soal dihapus.');
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Bank Soal"
        subtitle={
          scoped
            ? `Paket soal Literasi, Numerasi, Sains & Mapel — ${scope}`
            : 'Kelola paket soal Literasi, Numerasi, Sains, dan mata pelajaran'
        }
        icon="📚"
        actions={
          <button className="btn-primary" onClick={() => openPacketModal()}>
            + Paket Soal Baru
          </button>
        }
      />

      <div className="grid gap-4 items-start lg:grid-cols-[320px_1fr]">
        {/* Daftar paket */}
        <div className="card p-3 min-w-0">
          <div className="flex items-center justify-between px-1 pb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Paket Soal</p>
            <span className="text-xs text-slate-400">{packets.length}</span>
          </div>
          <select
            className="input mb-2 !py-2 text-xs"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as any)}
          >
            <option value="Semua">Semua Kategori</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
            {visiblePackets.map((p) => {
              const count = questions.filter((q) => q.packetId === p.id).length;
              const active = p.id === selectedPacket;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPacket(p.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition ${
                    active
                      ? 'bg-brand-50 border-brand-300 shadow-sm'
                      : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-800 truncate">{p.name}</span>
                    <Badge tone={catTone[p.category]}>{p.category}</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 truncate">
                    {p.school} · {p.level} · {count} soal
                  </p>
                </button>
              );
            })}
            {visiblePackets.length === 0 && (
              <p className="text-xs text-slate-500 px-2 py-6 text-center">
                Belum ada paket soal pada kategori ini.
              </p>
            )}
          </div>
        </div>

        {/* Daftar soal */}
        <div className="card overflow-hidden min-w-0">
          {currentPacket ? (
            <>
              <div className="p-4 border-b border-slate-100 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-slate-800">{currentPacket.name}</h3>
                    <Badge tone={catTone[currentPacket.category]}>{currentPacket.category}</Badge>
                    <Badge tone="slate">{currentPacket.school}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {currentPacket.subject} · {currentPacket.level} · {currentQuestions.length} soal ·
                    total skor {totalScore}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-secondary !py-2 text-xs" onClick={() => openPacketModal(currentPacket)}>
                    ✏️ Edit Paket
                  </button>
                  <button className="btn-secondary !py-2 text-xs !text-rose-600" onClick={() => deletePacket(currentPacket)}>
                    🗑️ Hapus
                  </button>
                  <button className="btn-primary !py-2 text-xs" onClick={() => openQuestionModal()}>
                    + Soal
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {currentQuestions.map((q, idx) => (
                  <div key={q.id} className="p-4 hover:bg-slate-50/60 transition">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 shrink-0 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <Badge tone={typeTone[q.type]}>{typeLabel[q.type]}</Badge>
                          <Badge tone="slate">Skor {q.score}</Badge>
                        </div>
                        {q.stimulus && (
                          <p className="text-xs text-slate-500 bg-slate-50 border-l-2 border-slate-300 pl-2 py-1 mb-2 line-clamp-2 italic">
                            {q.stimulus}
                          </p>
                        )}
                        <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap">{q.text}</p>
                        {(q.images?.length ?? 0) > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {q.images!.map((img, idx) => (
                              <img
                                key={idx}
                                src={img}
                                alt={`Gambar soal ${idx + 1}`}
                                className="h-20 w-auto max-w-[190px] object-contain rounded-lg border border-slate-200 bg-white"
                              />
                            ))}
                          </div>
                        )}
                        {q.type !== 'essay' && (
                          <div className="mt-2 grid sm:grid-cols-2 gap-1.5">
                            {q.options.map((o) => {
                              const correct = q.answerKey.includes(o.id);
                              return (
                                <div
                                  key={o.id}
                                  className={`text-xs px-2.5 py-1.5 rounded-lg border ${
                                    correct
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                                      : 'bg-white border-slate-200 text-slate-600'
                                  }`}
                                >
                                  <span className="font-mono mr-1">{o.id}.</span>
                                  {o.text}
                                  {correct && ' ✓'}
                                  {o.image && (
                                    <img
                                      src={o.image}
                                      alt={`Gambar pilihan ${o.id}`}
                                      className="mt-1 h-12 w-12 object-cover rounded border border-slate-200 bg-white"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {q.type === 'essay' && (
                          <div className="mt-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-2.5 py-1.5">
                            Soal uraian — dikoreksi manual oleh guru pada menu Analisis.
                          </div>
                        )}
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => openQuestionModal(q)}>
                            ✏️ Edit
                          </button>
                          <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => duplicateQuestion(q)}>
                            ⧉ Duplikat
                          </button>
                          <button
                            className="btn-ghost !px-2 !py-1 text-xs !text-rose-600 hover:!bg-rose-50"
                            onClick={() => deleteQuestion(q)}
                          >
                            🗑️ Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {currentQuestions.length === 0 && (
                <EmptyState
                  icon="📝"
                  title="Paket ini belum memiliki soal"
                  description="Tambahkan soal pilihan ganda, pilihan ganda kompleks, benar/salah, atau uraian."
                  action={
                    <button className="btn-primary" onClick={() => openQuestionModal()}>
                      + Tambah Soal Pertama
                    </button>
                  }
                />
              )}
            </>
          ) : (
            <EmptyState
              icon="📚"
              title="Belum ada paket soal"
              description="Buat paket soal pertama, misalnya 'AKM Literasi Kelas 5 MI'."
              action={
                <button className="btn-primary" onClick={() => openPacketModal()}>
                  + Paket Soal Baru
                </button>
              }
            />
          )}
        </div>
      </div>

      {/* Modal paket */}
      <Modal
        open={packetModal}
        onClose={() => setPacketModal(false)}
        title={editingPacket ? 'Edit Paket Soal' : 'Paket Soal Baru'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setPacketModal(false)}>
              Batal
            </button>
            <button className="btn-primary" onClick={savePacket}>
              Simpan
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nama Paket">
            <input
              className="input"
              value={packetForm.name}
              onChange={(e) => setPacketForm({ ...packetForm, name: e.target.value })}
              placeholder="AKM Literasi — Kelas 5 MI"
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Kategori">
              <select
                className="input"
                value={packetForm.category}
                onChange={(e) => setPacketForm({ ...packetForm, category: e.target.value as Category })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Mata Pelajaran">
              <input
                className="input"
                value={packetForm.subject}
                onChange={(e) => setPacketForm({ ...packetForm, subject: e.target.value })}
                placeholder="Bahasa Indonesia"
              />
            </Field>
            <Field label="Sekolah" hint={scoped ? 'Dikunci sesuai sekolah akun Anda.' : undefined}>
              <select
                className="input disabled:bg-slate-100"
                disabled={scoped}
                value={scoped ? (scope as SchoolName) : packetForm.school}
                onChange={(e) =>
                  setPacketForm({ ...packetForm, school: e.target.value as SchoolName | 'Semua' })
                }
              >
                <option value="Semua">Semua Sekolah</option>
                {SCHOOLS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tingkat / Kelas">
              <input
                className="input"
                value={packetForm.level}
                onChange={(e) => setPacketForm({ ...packetForm, level: e.target.value })}
                placeholder="Kelas 5"
              />
            </Field>
          </div>
          <Field label="Deskripsi">
            <textarea
              className="input min-h-[80px]"
              value={packetForm.description}
              onChange={(e) => setPacketForm({ ...packetForm, description: e.target.value })}
              placeholder="Cakupan materi paket soal..."
            />
          </Field>
        </div>
      </Modal>

      {/* Modal soal */}
      <Modal
        open={questionModal}
        onClose={() => setQuestionModal(false)}
        title={editingQuestion ? 'Edit Soal' : 'Tambah Soal'}
        subtitle={currentPacket?.name}
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setQuestionModal(false)}>
              Batal
            </button>
            <button className="btn-primary" onClick={saveQuestion}>
              Simpan Soal
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Tipe Soal">
              <select
                className="input"
                value={form.type}
                onChange={(e) => changeType(e.target.value as QuestionType)}
              >
                {(Object.keys(typeLabel) as QuestionType[]).map((t) => (
                  <option key={t} value={t}>
                    {typeLabel[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Skor Maksimal">
              <input
                type="number"
                min={1}
                className="input"
                value={form.score}
                onChange={(e) => setForm({ ...form, score: Number(e.target.value) })}
              />
            </Field>
          </div>

          <Field label="Stimulus / Teks Bacaan (opsional)">
            <textarea
              className="input min-h-[90px]"
              value={form.stimulus}
              onChange={(e) => setForm({ ...form, stimulus: e.target.value })}
              placeholder="Tempel teks bacaan, tabel, atau konteks soal di sini..."
            />
          </Field>

          <Field label="Pertanyaan">
            <textarea
              className="input min-h-[80px]"
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              placeholder="Tulis pertanyaan..."
            />
          </Field>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <ImagePicker
              images={form.images || []}
              onChange={(images) => setForm({ ...form, images })}
              max={3}
              label="Gambar Soal (opsional)"
              hint="Bisa diagram, grafik, foto, atau ilustrasi. Maksimal 3 gambar per soal; otomatis dikompres agar hemat ruang & tetap tersinkron."
            />
          </div>

          {form.type !== 'essay' && (
            <div>
              <span className="label">
                Pilihan Jawaban{' '}
                <span className="normal-case font-medium text-slate-400">
                  — klik tombol huruf untuk menandai kunci jawaban
                </span>
              </span>
              <div className="space-y-2">
                {form.options.map((opt, i) => {
                  const isKey = form.answerKey.includes(opt.id);
                  return (
                    <div key={opt.id} className="rounded-xl border border-slate-100 bg-slate-50/40 p-1.5">
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => toggleAnswer(opt.id)}
                        className={`w-9 h-9 shrink-0 rounded-lg text-xs font-bold border transition ${
                          isKey
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-400'
                        }`}
                        title="Tandai sebagai kunci"
                      >
                        {form.type === 'true_false' ? (opt.id === 'true' ? 'B' : 'S') : opt.id}
                      </button>
                      <input
                        className="input"
                        value={opt.text}
                        onChange={(e) => {
                          const options = [...form.options];
                          options[i] = { ...opt, text: e.target.value };
                          setForm({ ...form, options });
                        }}
                        placeholder={`Pilihan ${opt.id}`}
                      />
                      {form.type === 'multiple_choice' && form.options.length > 2 && (
                        <button
                          type="button"
                          className="w-9 h-9 shrink-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          onClick={() =>
                            setForm({
                              ...form,
                              options: form.options.filter((o) => o.id !== opt.id),
                              answerKey: form.answerKey.filter((k) => k !== opt.id),
                            })
                          }
                          title="Hapus pilihan"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="pl-11 pr-1">
                      <ImagePicker
                        compact
                        images={opt.image ? [opt.image] : []}
                        onChange={(imgs) => {
                          const options = [...form.options];
                          options[i] = { ...opt, image: imgs[0] };
                          setForm({ ...form, options });
                        }}
                        max={1}
                        budget={12000}
                        label={`Gambar pilihan ${form.type === 'true_false' ? (opt.id === 'true' ? 'Benar' : 'Salah') : opt.id}`}
                      />
                    </div>
                    </div>
                  );
                })}
              </div>
              {form.type === 'multiple_choice' && form.options.length < 6 && (
                <button
                  type="button"
                  className="btn-ghost mt-2 text-xs"
                  onClick={() =>
                    setForm({
                      ...form,
                      options: [
                        ...form.options,
                        { id: String.fromCharCode(65 + form.options.length), text: '' },
                      ],
                    })
                  }
                >
                  + Tambah pilihan
                </button>
              )}
              <p className="text-[11px] text-slate-400 mt-2">
                Kunci terpilih:{' '}
                <b className="text-emerald-700">{form.answerKey.join(', ') || 'belum dipilih'}</b>
              </p>
            </div>
          )}

          <Field label="Pembahasan (opsional)">
            <textarea
              className="input min-h-[70px]"
              value={form.explanation}
              onChange={(e) => setForm({ ...form, explanation: e.target.value })}
              placeholder="Penjelasan jawaban benar untuk guru..."
            />
          </Field>
        </div>
      </Modal>
      {node}
    </div>
  );
};

export default QuestionBank;
