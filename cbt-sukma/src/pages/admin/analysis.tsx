import React, { useMemo, useState } from 'react';
import { UserRole, formatDate } from '../../types';
import storage from '../../services/storageService';
import { Badge, EmptyState, Modal, ProgressBar, SectionHeader, StatCard, useToast } from '../../components/ui';
import { gradeLabel, isAnswered, isCorrect, percentOf } from '../../utils/scoring';
import { SchoolLogo } from '../../components/Brand';
import { themeOfSchool } from '../../theme';
import { scopeOf } from '../../services/authService';
import { downloadXlsx } from '../../services/excelService';

const Analysis: React.FC<{ userRole: UserRole; username: string }> = ({ username }) => {
  const scope = scopeOf(username);
  const scoped = scope !== 'Semua';
  const [version, setVersion] = useState(0);
  const [examId, setExamId] = useState('');
  const [tab, setTab] = useState<'ringkasan' | 'butir' | 'koreksi' | 'rekap'>('ringkasan');
  const [gradeTarget, setGradeTarget] = useState<string | null>(null);
  const { show, node } = useToast();

  const exams = useMemo(() => {
    void version;
    return storage.exams
      .getAll()
      .filter((e) => !scoped || e.school === scope || e.school === 'Semua');
  }, [version, scoped, scope]);

  const results = useMemo(() => {
    void version;
    return storage.results.getAll();
  }, [version]);

  React.useEffect(() => {
    if (!examId && exams.length > 0) setExamId(exams[0].id);
  }, [exams, examId]);

  const exam = exams.find((e) => e.id === examId);
  const questions = exam ? storage.getExamQuestions(exam) : [];
  const examResults = results
    .filter((r) => r.examId === examId && r.status === 'submitted')
    .sort((a, b) => percentOf(b) - percentOf(a));

  const scores = examResults.map((r) => percentOf(r));
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const highest = scores.length ? Math.max(...scores) : 0;
  const lowest = scores.length ? Math.min(...scores) : 0;
  const kkm = exam?.kkm ?? 70;
  const passed = scores.filter((s) => s >= kkm).length;
  const passRate = scores.length ? Math.round((passed / scores.length) * 100) : 0;

  const buckets = [
    { label: '0–54', min: 0, max: 54 },
    { label: '55–69', min: 55, max: 69 },
    { label: '70–79', min: 70, max: 79 },
    { label: '80–89', min: 80, max: 89 },
    { label: '90–100', min: 90, max: 100 },
  ].map((b) => ({
    ...b,
    count: scores.filter((s) => s >= b.min && s <= b.max).length,
  }));
  const maxBucket = Math.max(1, ...buckets.map((b) => b.count));

  const perQuestion = questions.map((q) => {
    const answered = examResults.filter((r) => isAnswered(q, r.answers[q.id]?.value || []));
    const correct = examResults.filter((r) => isCorrect(q, r.answers[q.id]?.value || []));
    const pct = examResults.length ? Math.round((correct.length / examResults.length) * 100) : 0;
    const level =
      q.type === 'essay'
        ? { label: 'Uraian', tone: 'amber' as const }
        : pct >= 70
        ? { label: 'Mudah', tone: 'emerald' as const }
        : pct >= 40
        ? { label: 'Sedang', tone: 'amber' as const }
        : { label: 'Sulit', tone: 'rose' as const };
    return { q, answered: answered.length, correct: correct.length, pct, level };
  });

  const needGrading = examResults.filter((r) => r.needsGrading);
  const gradeResult = examResults.find((r) => r.id === gradeTarget);
  const essayQuestions = questions.filter((q) => q.type === 'essay');

  const exportCsv = () => {
    if (!exam) return;
    const header = ['No', 'NIS', 'Nama', 'Kelas', 'Sekolah', 'Nilai', 'Predikat', 'Dikerjakan', 'Dikumpulkan'];
    const rows = examResults.map((r, i) => {
      const g = gradeLabel(percentOf(r));
      return [
        i + 1,
        r.studentNis,
        r.studentName,
        r.className,
        r.school,
        percentOf(r),
        g.label,
        formatDate(r.startedAt),
        formatDate(r.submittedAt),
      ];
    });
    const csv = [header, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `hasil-${exam.title.replace(/\s+/g, '-').toLowerCase()}.csv`;
    link.click();
    show('Rekap nilai berhasil diekspor (CSV).');
  };

  const exportXlsx = () => {
    if (!exam) return;
    const header = ['No', 'NIS', 'Nama', 'Kelas', 'Sekolah', 'Nilai', 'Predikat', 'Dikerjakan', 'Dikumpulkan'];
    const rows: (string | number)[][] = examResults.map((r, i) => [
      i + 1,
      r.studentNis,
      r.studentName,
      r.className,
      r.school,
      percentOf(r),
      gradeLabel(percentOf(r)).label,
      formatDate(r.startedAt),
      formatDate(r.submittedAt),
    ]);
    const sheetName = exam.title.replace(/[\\/?*[\]:]/g, '-').slice(0, 28) || 'Rekap Nilai';
    downloadXlsx(`hasil-${exam.title.replace(/\s+/g, '-').toLowerCase()}.xlsx`, [
      { name: sheetName, rows: [header, ...rows], widths: [5, 14, 28, 10, 18, 8, 12, 20, 20] },
    ]);
    show('Rekap nilai berhasil diekspor ke Excel (.xlsx).');
  };

  const toneMap: Record<string, string> = {
    emerald: 'text-emerald-600',
    teal: 'text-brand-600',
    amber: 'text-amber-600',
    orange: 'text-orange-600',
    rose: 'text-rose-600',
  };

  return (
    <div className="space-y-4" data-theme={themeOfSchool(exam?.school === 'Semua' ? null : exam?.school)}>
      <SectionHeader
        title="Analisis Hasil Ujian"
        subtitle={
          scoped
            ? `Statistik nilai & koreksi uraian — ${scope}`
            : 'Statistik nilai, tingkat kesukaran butir soal, dan koreksi uraian'
        }
        icon="📊"
        actions={
          <>
            {exam && exam.school !== 'Semua' && (
              <div className="hidden sm:flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3 py-1.5">
                <SchoolLogo school={exam.school} height={26} />
                <span className="text-[11px] font-bold text-slate-600">{exam.school}</span>
              </div>
            )}
            <select className="input !w-auto max-w-full text-xs sm:text-sm" value={examId} onChange={(e) => setExamId(e.target.value)}>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
            <button className="btn-secondary" onClick={exportXlsx} disabled={!examResults.length} title="Unduh Excel (.xlsx)">
              ⬇️ Excel
            </button>
            <button className="btn-secondary" onClick={exportCsv} disabled={!examResults.length} title="Unduh CSV">
              ⬇️ CSV
            </button>
          </>
        }
      />

      {!exam ? (
        <div className="card">
          <EmptyState icon="📊" title="Belum ada data" description="Buat jadwal ujian terlebih dahulu." />
        </div>
      ) : examResults.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="📭"
            title="Belum ada siswa yang menyelesaikan ujian"
            description="Data analisis akan muncul setelah siswa mengumpulkan jawaban ujian."
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Rata-rata Nilai" value={avg} icon="📈" tone="teal" hint={`KKM ${kkm}`} />
            <StatCard label="Nilai Tertinggi" value={highest} icon="🏆" tone="blue" hint="Skala 0–100" />
            <StatCard label="Nilai Terendah" value={lowest} icon="📉" tone="rose" hint="Skala 0–100" />
            <StatCard
              label="Ketuntasan"
              value={`${passRate}%`}
              icon="🎯"
              tone="violet"
              hint={`${passed} dari ${scores.length} siswa tuntas`}
            />
          </div>

          <div className="flex gap-1 p-1 bg-white rounded-xl border border-slate-200 w-full sm:w-fit max-w-full overflow-x-auto">
            {[
              { key: 'ringkasan', label: '📈 Ringkasan' },
              { key: 'butir', label: '🧩 Analisis Butir' },
              { key: 'koreksi', label: `✍️ Koreksi Uraian${needGrading.length ? ` (${needGrading.length})` : ''}` },
              { key: 'rekap', label: '📋 Rekap Nilai' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as any)}
                className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  tab === t.key ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'ringkasan' && (
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="card p-5">
                <h3 className="font-bold text-slate-800 mb-4">Distribusi Nilai</h3>
                <div className="space-y-3">
                  {buckets.map((b) => (
                    <div key={b.label} className="flex items-center gap-3">
                      <span className="w-16 shrink-0 text-xs font-semibold text-slate-500">{b.label}</span>
                      <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-lg flex items-center justify-end pr-2 text-[10px] font-bold text-white transition-all"
                          style={{ width: `${(b.count / maxBucket) * 100}%` }}
                        >
                          {b.count > 0 && b.count}
                        </div>
                      </div>
                      <span className="w-16 shrink-0 text-right text-xs text-slate-500">{b.count} siswa</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-5">
                <h3 className="font-bold text-slate-800 mb-4">Peringkat 10 Besar</h3>
                <div className="space-y-2">
                  {examResults.slice(0, 10).map((r, i) => {
                    const g = gradeLabel(percentOf(r));
                    return (
                      <div key={r.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-slate-50">
                        <span
                          className={`w-6 h-6 rounded-md text-[11px] font-extrabold flex items-center justify-center ${
                            i === 0
                              ? 'bg-amber-100 text-amber-700'
                              : i === 1
                              ? 'bg-slate-200 text-slate-600'
                              : i === 2
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 truncate">{r.studentName}</p>
                          <p className="text-[11px] text-slate-400">
                            {r.className} · {r.school}
                          </p>
                        </div>
                        <span className={`text-sm font-extrabold ${toneMap[g.color]}`}>{percentOf(r)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'butir' && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Tingkat Kesukaran Butir Soal</h3>
                <p className="text-xs text-slate-500">
                  Berdasarkan {examResults.length} jawaban siswa · total {questions.length} butir
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead className="bg-slate-50/80 border-b border-slate-100">
                    <tr>
                      <th className="th w-12">No</th>
                      <th className="th">Butir Soal</th>
                      <th className="th">Tipe</th>
                      <th className="th w-40">Benar</th>
                      <th className="th">Kategori</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {perQuestion.map((row, i) => (
                      <tr key={row.q.id} className="hover:bg-slate-50/60">
                        <td className="td text-slate-400">{i + 1}</td>
                        <td className="td max-w-[380px]">
                          <p className="font-semibold text-slate-800 line-clamp-2">{row.q.text}</p>
                        </td>
                        <td className="td text-xs text-slate-500">
                          {row.q.type === 'multiple_choice'
                            ? 'PG'
                            : row.q.type === 'complex_mc'
                            ? 'PG Kompleks'
                            : row.q.type === 'true_false'
                            ? 'B/S'
                            : 'Uraian'}
                        </td>
                        <td className="td">
                          <div className="space-y-1">
                            <ProgressBar
                              value={row.pct}
                              tone={row.pct >= 70 ? 'bg-emerald-500' : row.pct >= 40 ? 'bg-amber-500' : 'bg-rose-500'}
                            />
                            <span className="text-[11px] text-slate-500">
                              {row.correct}/{examResults.length} ({row.pct}%)
                            </span>
                          </div>
                        </td>
                        <td className="td">
                          <Badge tone={row.level.tone}>{row.level.label}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'koreksi' && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Koreksi Jawaban Uraian</h3>
                <p className="text-xs text-slate-500">
                  {needGrading.length} jawaban menunggu penilaian · {essayQuestions.length} soal uraian
                </p>
              </div>
              {needGrading.length === 0 ? (
                <EmptyState icon="✅" title="Semua jawaban uraian sudah dikoreksi" description="Nilai siswa sudah final." />
              ) : (
                <div className="divide-y divide-slate-100">
                  {needGrading.map((r) => (
                    <div key={r.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/60">
                      <div>
                        <p className="font-semibold text-slate-800">{r.studentName}</p>
                        <p className="text-xs text-slate-500">
                          {r.className} · {r.school} · dikumpulkan {formatDate(r.submittedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-700">Nilai: {percentOf(r)}</span>
                        <button className="btn-primary !py-1.5 text-xs" onClick={() => setGradeTarget(r.id)}>
                          ✍️ Beri Nilai
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'rekap' && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Rekap Nilai Siswa</h3>
                <span className="text-xs text-slate-500">{examResults.length} siswa</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px]">
                  <thead className="bg-slate-50/80 border-b border-slate-100">
                    <tr>
                      <th className="th w-12">No</th>
                      <th className="th">Nama Siswa</th>
                      <th className="th">Kelas</th>
                      <th className="th">Benar</th>
                      <th className="th">Nilai</th>
                      <th className="th">Predikat</th>
                      <th className="th">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {examResults.map((r, i) => {
                      const g = gradeLabel(percentOf(r));
                      const lulus = percentOf(r) >= kkm;
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/60">
                          <td className="td text-slate-400">{i + 1}</td>
                          <td className="td font-semibold text-slate-800">
                            {r.studentName}
                            <div className="text-[11px] font-mono text-slate-400">{r.studentNis}</div>
                          </td>
                          <td className="td">{r.className}</td>
                          <td className="td">
                            {r.autoScore + r.manualScore}/{r.maxScore}
                          </td>
                          <td className="td">
                            <span className={`font-extrabold ${toneMap[g.color]}`}>{percentOf(r)}</span>
                          </td>
                          <td className="td">
                            <Badge tone={g.color as any}>{g.label}</Badge>
                          </td>
                          <td className="td">
                            <Badge tone={lulus ? 'emerald' : 'rose'}>{lulus ? 'Tuntas' : 'Belum Tuntas'}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal koreksi */}
      <Modal
        open={!!gradeResult}
        onClose={() => setGradeTarget(null)}
        title={`Koreksi Uraian — ${gradeResult?.studentName || ''}`}
        subtitle={exam?.title}
        size="lg"
        footer={
          <button className="btn-primary" onClick={() => setGradeTarget(null)}>
            Selesai
          </button>
        }
      >
        {gradeResult && (
          <div className="space-y-4">
            {essayQuestions.length === 0 && (
              <p className="text-sm text-slate-500">Paket soal ini tidak memiliki soal uraian.</p>
            )}
            {essayQuestions.map((q, i) => {
              const entry = gradeResult.answers[q.id];
              return (
                <div key={q.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-bold text-slate-800">
                      {i + 1}. {q.text}
                    </p>
                    <Badge tone="amber">Maks {q.score}</Badge>
                  </div>
                  <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Jawaban siswa
                    </span>
                    {entry?.value?.[0] || <span className="italic text-slate-400">Tidak dijawab</span>}
                  </div>
                  {q.explanation && (
                    <p className="mt-2 text-xs text-brand-800 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
                      <b>Kunci/pedoman:</b> {q.explanation}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Nilai:</span>
                    <input
                      type="number"
                      min={0}
                      max={q.score}
                      className="input !w-24"
                      defaultValue={entry?.score ?? ''}
                      onChange={(e) =>
                        storage.gradeEssay(gradeResult.id, q.id, Number(e.target.value) || 0)
                      }
                    />
                    <span className="text-xs text-slate-400">dari {q.score}</span>
                    <span className="ml-auto text-xs text-slate-400">
                      Nilai sementara: <b className="text-slate-700">{percentOf(gradeResult)}</b>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
      {node}
    </div>
  );
};

export default Analysis;
