import React, { useMemo, useState } from 'react';
import storage from '../../services/storageService';
import { Badge, EmptyState, Modal, SectionHeader, StatCard } from '../../components/ui';
import { formatDate } from '../../types';
import { gradeLabel, isAnswered, isCorrect, percentOf } from '../../utils/scoring';

const StudentResults: React.FC<{ username: string }> = ({ username }) => {
  const [detailId, setDetailId] = useState<string | null>(null);
  const results = useMemo(
    () =>
      storage.results
        .getAll()
        .filter((r) => r.studentNis === username && r.status === 'submitted')
        .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || '')),
    [username],
  );

  const avg = results.length
    ? Math.round(results.reduce((a, r) => a + percentOf(r), 0) / results.length)
    : 0;
  const best = results.length ? Math.max(...results.map((r) => percentOf(r))) : 0;
  const detail = results.find((r) => r.id === detailId);
  const exam = detail ? storage.exams.getById(detail.examId) : undefined;
  const questions = exam ? storage.getExamQuestions(exam) : [];

  return (
    <div className="space-y-4">
      <SectionHeader title="Hasil Ujian" subtitle="Rekap nilai dan pembahasan jawaban Anda" icon="📊" />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="Ujian Selesai" value={results.length} icon="✅" tone="teal" hint="Sudah dikumpulkan" />
        <StatCard label="Rata-rata Nilai" value={avg} icon="📈" tone="blue" hint={gradeLabel(avg).label} />
        <StatCard label="Nilai Terbaik" value={best} icon="🏆" tone="violet" hint="Skala 0–100" />
      </div>

      {results.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="📭"
            title="Belum ada hasil ujian"
            description="Hasil akan muncul setelah Anda mengumpulkan jawaban ujian."
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="th w-12">No</th>
                  <th className="th">Ujian</th>
                  <th className="th">Dikumpulkan</th>
                  <th className="th">Nilai</th>
                  <th className="th">Predikat</th>
                  <th className="th text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((r, i) => {
                  const e = storage.exams.getById(r.examId);
                  const g = gradeLabel(percentOf(r));
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="td text-slate-400">{i + 1}</td>
                      <td className="td">
                        <p className="font-semibold text-slate-800">{e?.title || 'Ujian'}</p>
                        <p className="text-[11px] text-slate-400">
                          {storage.packets.getById(e?.packetId || '')?.category || '-'}
                        </p>
                      </td>
                      <td className="td text-xs text-slate-500">{formatDate(r.submittedAt)}</td>
                      <td className="td">
                        <span className="text-lg font-extrabold text-slate-800">{percentOf(r)}</span>
                      </td>
                      <td className="td">
                        <Badge tone={g.color as any}>{g.label}</Badge>
                      </td>
                      <td className="td text-right">
                        <button className="btn-secondary !py-1.5 text-xs" onClick={() => setDetailId(r.id)}>
                          🔍 Lihat Pembahasan
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={!!detail}
        onClose={() => setDetailId(null)}
        title={exam?.title || 'Pembahasan Ujian'}
        subtitle={
          detail
            ? `${detail.studentName} · dikumpulkan ${formatDate(detail.submittedAt)}`
            : undefined
        }
        size="xl"
        footer={
          <button className="btn-primary" onClick={() => setDetailId(null)}>
            Tutup
          </button>
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-brand-50 px-3 py-3 text-center">
                <p className="text-2xl font-extrabold text-brand-700">{percentOf(detail)}</p>
                <p className="text-[10px] font-bold uppercase text-brand-600">Nilai</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
                <p className="text-2xl font-extrabold text-slate-700">
                  {detail.autoScore + detail.manualScore}/{detail.maxScore}
                </p>
                <p className="text-[10px] font-bold uppercase text-slate-500">Skor</p>
              </div>
              <div className="rounded-xl bg-violet-50 px-3 py-3 text-center">
                <p className="text-sm font-extrabold text-violet-700 mt-1.5">
                  {gradeLabel(percentOf(detail)).label}
                </p>
                <p className="text-[10px] font-bold uppercase text-violet-500">Predikat</p>
              </div>
            </div>

            {detail.needsGrading && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ℹ️ Beberapa soal uraian masih menunggu koreksi guru.
              </p>
            )}

            <div className="space-y-3">
              {questions.map((q, i) => {
                const entry = detail.answers[q.id];
                const value = entry?.value || [];
                const correct = isCorrect(q, value);
                const answered = isAnswered(q, value);
                return (
                  <div
                    key={q.id}
                    className={`rounded-xl border p-4 ${
                      q.type === 'essay'
                        ? 'border-amber-200 bg-amber-50/40'
                        : correct
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : answered
                        ? 'border-rose-200 bg-rose-50/40'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-slate-800">
                        {i + 1}. {q.text}
                      </p>
                      <Badge tone={q.type === 'essay' ? 'amber' : correct ? 'emerald' : answered ? 'rose' : 'slate'}>
                        {q.type === 'essay'
                          ? entry?.score !== undefined
                            ? `${entry.score}/${q.score}`
                            : 'Menunggu koreksi'
                          : correct
                          ? `+${q.score}`
                          : '0'}
                      </Badge>
                    </div>

                    <div className="mt-2 grid sm:grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">
                          Jawaban Anda
                        </p>
                        {answered ? (
                          <p className="text-slate-700">
                            {q.type === 'essay'
                              ? value[0]
                              : value
                                  .map(
                                    (v) =>
                                      q.options.find((o) => o.id === v)?.text ||
                                      (v === 'true' ? 'Benar' : v === 'false' ? 'Salah' : v),
                                  )
                                  .join(', ')}
                          </p>
                        ) : (
                          <p className="italic text-slate-400">Tidak dijawab</p>
                        )}
                      </div>
                      {q.type !== 'essay' && (
                        <div className="rounded-lg bg-white border border-emerald-200 px-3 py-2">
                          <p className="text-[10px] font-bold uppercase text-emerald-500 mb-0.5">
                            Kunci Jawaban
                          </p>
                          <p className="text-emerald-800 font-semibold">
                            {q.answerKey
                              .map(
                                (k) =>
                                  q.options.find((o) => o.id === k)?.text ||
                                  (k === 'true' ? 'Benar' : k === 'false' ? 'Salah' : k),
                              )
                              .join(', ')}
                          </p>
                        </div>
                      )}
                    </div>

                    {q.explanation && (
                      <p className="mt-2 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                        <b>Pembahasan:</b> {q.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StudentResults;
