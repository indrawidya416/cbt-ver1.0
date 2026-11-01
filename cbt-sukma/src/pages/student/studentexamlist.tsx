import React, { useMemo, useState } from 'react';
import storage from '../../services/storageService';
import { Badge, EmptyState, Modal, SectionHeader, useToast } from '../../components/ui';
import { percentOf } from '../../utils/scoring';

type Availability = {
  canStart: boolean;
  label: string;
  tone: 'emerald' | 'amber' | 'slate' | 'rose' | 'blue';
  note: string;
};

const StudentExamList: React.FC<{
  username: string;
  onStartExam: (examId: string) => void;
}> = ({ username, onStartExam }) => {
  const [version, setVersion] = useState(0);
  const [tokenModal, setTokenModal] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const { show, node } = useToast();

  const student = storage.findStudentByNis(username);
  const exams = useMemo(() => {
    void version;
    return storage.exams.getAll().sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  }, [version]);
  const results = useMemo(() => {
    void version;
    return storage.results.getAll().filter((r) => r.studentNis === username);
  }, [version, username]);

  const myExams = exams.filter(
    (e) =>
      student &&
      (e.school === 'Semua' || e.school === student.school) &&
      e.classes.includes(student.className),
  );

  const availability = (examId: string): Availability => {
    const exam = exams.find((e) => e.id === examId)!;
    const result = results.find((r) => r.examId === examId);
    if (result?.status === 'submitted')
      return {
        canStart: false,
        label: 'Sudah Dikumpulkan',
        tone: 'blue',
        note: `Nilai Anda ${percentOf(result)}`,
      };
    if (!exam.isActive)
      return { canStart: false, label: 'Dinonaktifkan', tone: 'slate', note: 'Ujian belum dibuka guru.' };

    const start = new Date(`${exam.date}T${exam.startTime}:00`);
    const endOfDay = new Date(`${exam.date}T23:59:59`);
    const now = new Date();
    if (now > endOfDay)
      return {
        canStart: false,
        label: 'Berakhir',
        tone: 'slate',
        note: 'Jadwal ujian telah berakhir. Hubungi guru untuk ujian susulan.',
      };
    if (result?.status === 'in_progress')
      return { canStart: true, label: 'Lanjutkan', tone: 'amber', note: 'Anda memiliki ujian yang belum selesai.' };
    return {
      canStart: true,
      label: now < start ? 'Siap Dikerjakan' : 'Tersedia',
      tone: 'emerald',
      note: `Durasi ${exam.duration} menit`,
    };
  };

  const openToken = (examId: string) => {
    setToken('');
    setError('');
    setTokenModal(examId);
  };

  const startExam = () => {
    if (!tokenModal || !student) return;
    const exam = exams.find((e) => e.id === tokenModal)!;
    const existing = results.find((r) => r.examId === tokenModal);

    if (!existing || existing.status !== 'in_progress') {
      if (token.trim().toUpperCase() !== exam.token.toUpperCase()) {
        setError('Token ujian salah. Minta token terbaru kepada guru/proktor.');
        return;
      }
    }
    const questions = storage.getExamQuestions(exam);
    if (questions.length === 0) {
      setError('Paket soal ujian ini belum memiliki soal. Hubungi guru Anda.');
      return;
    }
    storage.startResult(exam, student);
    setTokenModal(null);
    show('Token benar. Selamat mengerjakan!');
    setTimeout(() => onStartExam(exam.id), 300);
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Ujian Saya"
        subtitle={`Daftar ujian untuk ${student?.school || '-'} · Kelas ${student?.className || '-'}`}
        icon="🗓️"
      />

      {myExams.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🗓️"
            title="Belum ada ujian untuk Anda"
            description="Ujian akan muncul setelah guru membuat jadwal untuk kelas Anda."
          />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {myExams.map((exam) => {
            const packet = storage.packets.getById(exam.packetId);
            const qCount = storage.getQuestionsByPacket(exam.packetId).length;
            const state = availability(exam.id);
            const result = results.find((r) => r.examId === exam.id);
            return (
              <div key={exam.id} className="card p-5 flex flex-col hover:-translate-y-0.5 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge tone={state.tone}>{state.label}</Badge>
                  <Badge tone="slate">{packet?.category || 'Ujian'}</Badge>
                </div>
                <h3 className="font-extrabold text-slate-800 leading-snug">{exam.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{packet?.subject}</p>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <p className="flex items-center gap-2">
                    <span className="text-slate-400">📅</span>
                    {new Date(exam.date).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-slate-400">⏰</span> {exam.startTime} · {exam.duration} menit
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-slate-400">📝</span> {qCount} butir soal · KKM {exam.kkm}
                  </p>
                </div>

                <p className="mt-3 text-[11px] text-slate-500">{state.note}</p>

                {state.canStart ? (
                  <button
                    className={`mt-4 w-full ${result?.status === 'in_progress' ? 'btn-secondary' : 'btn-primary'} !py-2.5`}
                    onClick={() => openToken(exam.id)}
                  >
                    {result?.status === 'in_progress' ? '▶️ Lanjutkan Ujian' : '🔑 Masukkan Token'}
                  </button>
                ) : (
                  <button className="mt-4 w-full btn-secondary !py-2.5" disabled>
                    {state.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={!!tokenModal}
        onClose={() => setTokenModal(null)}
        title="Masukkan Token Ujian"
        subtitle="Token diberikan oleh guru / proktor di ruang ujian"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setTokenModal(null)}>
              Batal
            </button>
            <button className="btn-primary" onClick={startExam}>
              Mulai Ujian
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2.5 leading-relaxed">
            ⚠️ Pastikan Anda sudah siap. Setelah dimulai, waktu ujian berjalan otomatis dan tidak dapat
            dijeda.
          </div>
          <input
            autoFocus
            className="input text-center text-2xl font-mono font-extrabold tracking-[0.4em] uppercase"
            placeholder="XXXXXX"
            maxLength={8}
            value={token}
            onChange={(e) => {
              setToken(e.target.value.toUpperCase());
              setError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && startExam()}
          />
          {error && (
            <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              ⚠️ {error}
            </p>
          )}
        </div>
      </Modal>
      {node}
    </div>
  );
};

export default StudentExamList;
