import React, { useEffect, useMemo, useRef, useState } from 'react';
import storage from '../../services/storageService';
import { apiConfigured, sendResultToServer } from '../../services/apiService';
import { AnswerMap, formatTime } from '../../types';
import { Badge, Modal } from '../../components/ui';
import { gradeLabel, isAnswered, percentOf } from '../../utils/scoring';
import { SchoolLogo, SukmaMark } from '../../components/Brand';
import { themeOfSchool } from '../../theme';

const ExamInterface: React.FC<{
  examId: string;
  username: string;
  onFinish: () => void;
}> = ({ examId, username, onFinish }) => {
  const exam = storage.exams.getById(examId);
  const student = storage.findStudentByNis(username);
  const questions = useMemo(() => (exam ? storage.getExamQuestions(exam) : []), [examId]);
  const settings = storage.getSettings();

  const [resultId] = useState(() => {
    if (!exam || !student) return '';
    return storage.startResult(exam, student).id;
  });

  const [answers, setAnswers] = useState<AnswerMap>(() => {
    return resultId ? storage.getAllAnswersOfResult(resultId) : {};
  });
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(() => {
    if (!exam || !resultId) return 0;
    const start = new Date(storage.results.getById(resultId)?.startedAt || Date.now()).getTime();
    return Math.max(0, (start + exam.duration * 60000 - Date.now()) / 1000);
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [violations, setViolations] = useState(
    () => (resultId ? storage.results.getById(resultId)?.violationCount || 0 : 0),
  );
  const [warning, setWarning] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [syncState, setSyncState] = useState<'idle' | 'sending' | 'sent' | 'queued'>('idle');
  const submittedRef = useRef(false);

  const current = questions[index];
  const answeredCount = questions.filter((q) => isAnswered(q, answers[q.id]?.value || [])).length;
  const flaggedCount = questions.filter((q) => answers[q.id]?.flagged).length;

  /* --------------------------- Timer --------------------------- */
  useEffect(() => {
    if (submitted) return;
    const tick = () => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          doSubmit(true);
          return 0;
        }
        return next;
      });
    };
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [submitted]);

  /* ---------------------- Anti kecurangan ---------------------- */
  useEffect(() => {
    if (!settings.antiCheat || submitted) return;
    const onVisibility = () => {
      if (document.hidden && !submittedRef.current) {
        if (resultId) storage.addViolation(resultId);
        setViolations((v) => v + 1);
        setWarning(true);
      }
    };
    const onBlur = () => {
      if (!submittedRef.current && document.hasFocus && !document.hasFocus()) {
        // cadangan bila visibility API tidak tersedia
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!submittedRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [settings.antiCheat, submitted, resultId]);

  /* --------------------- Keyboard shortcut --------------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(questions.length - 1, i + 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [questions.length]);

  /* --------------------------- Aksi --------------------------- */
  const setAnswer = (questionId: string, value: string[]) => {
    if (!resultId) return;
    storage.saveAnswer(resultId, questionId, value);
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        value,
        flagged: prev[questionId]?.flagged,
        score: prev[questionId]?.score,
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  const pickOption = (questionId: string, optionId: string, multi: boolean) => {
    const prev = answers[questionId]?.value || [];
    if (multi) {
      setAnswer(
        questionId,
        prev.includes(optionId) ? prev.filter((v) => v !== optionId) : [...prev, optionId],
      );
    } else {
      setAnswer(questionId, [optionId]);
    }
  };

  const toggleFlag = () => {
    if (!current || !resultId) return;
    storage.toggleFlag(resultId, current.id);
    setAnswers((prev) => ({
      ...prev,
      [current.id]: {
        value: prev[current.id]?.value || [],
        flagged: !prev[current.id]?.flagged,
        score: prev[current.id]?.score,
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  function doSubmit(auto = false) {
    if (submittedRef.current || !resultId) return;
    submittedRef.current = true;
    storage.submitResult(resultId);
    setSubmitted(true);
    setConfirmOpen(false);
    if (auto) setWarning(false);
    // Kirim ke server pusat (bila URL API diisi). Gagal → masuk antrean otomatis.
    if (apiConfigured()) {
      setSyncState('sending');
      sendResultToServer(resultId).then((status) => {
        setSyncState(status === 'sent' ? 'sent' : status === 'queued' ? 'queued' : 'idle');
      });
    }
  }

  const result = resultId ? storage.results.getById(resultId) : undefined;
  const finalScore = result ? percentOf(result) : 0;

  /* -------------------------- Tampilan -------------------------- */
  if (!exam || !student) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-6 text-center">
        <p className="text-4xl mb-3">🚫</p>
        <h2 className="text-lg font-bold text-slate-800">Ujian tidak ditemukan</h2>
        <button className="btn-primary mt-4" onClick={onFinish}>
          Kembali
        </button>
      </div>
    );
  }

  if (submitted) {
    const g = gradeLabel(finalScore);
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-brand-700 via-brand-800 to-slate-900 flex items-center justify-center p-5"
        data-theme={themeOfSchool(exam.school)}
      >
        <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 text-center animate-slideUp">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 text-emerald-600 text-4xl flex items-center justify-center mb-4">
            ✓
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800">Jawaban Terkumpul!</h2>
          <p className="text-sm text-slate-500 mt-1">
            {exam.title} · {student.name}
          </p>

          {syncState !== 'idle' && (
            <div
              className={`mt-4 rounded-xl px-3 py-2 text-xs font-semibold ${
                syncState === 'sent'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : syncState === 'queued'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-slate-50 text-slate-600 border border-slate-200'
              }`}
            >
              {syncState === 'sending' && '⏳ Mengirim nilai ke server sekolah...'}
              {syncState === 'sent' && '✅ Nilai sudah terkirim ke server sekolah.'}
              {syncState === 'queued' &&
                '📶 Server belum terjangkau. Nilai tersimpan di perangkat ini dan akan dikirim otomatis saat online (atau lewat Pengaturan → Kirim Hasil Tertunda).'}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="rounded-xl bg-slate-50 px-3 py-3">
              <p className="text-[10px] font-bold uppercase text-slate-400">Terjawab</p>
              <p className="text-xl font-extrabold text-slate-800">
                {answeredCount}/{questions.length}
              </p>
            </div>
            <div className="rounded-xl bg-brand-50 px-3 py-3">
              <p className="text-[10px] font-bold uppercase text-brand-500">Nilai</p>
              <p className="text-xl font-extrabold text-brand-700">{finalScore}</p>
            </div>
            <div className="rounded-xl bg-violet-50 px-3 py-3">
              <p className="text-[10px] font-bold uppercase text-violet-500">Predikat</p>
              <p className="text-sm font-extrabold text-violet-700 leading-tight mt-1">{g.label}</p>
            </div>
          </div>

          {result?.needsGrading && (
            <p className="mt-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              ℹ️ Sebagian soal uraian masih menunggu koreksi guru, nilai dapat berubah.
            </p>
          )}
          {violations > 0 && (
            <p className="mt-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              ⚠️ Tercatat {violations} kali keluar dari layar ujian.
            </p>
          )}

          <button className="btn-primary w-full mt-6 !py-3" onClick={onFinish}>
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  const lowTime = remaining < 300;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col" data-theme={themeOfSchool(exam.school)}>
      {/* Header ujian */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-lg" data-theme={themeOfSchool(exam.school)}>
        <div className="px-3 sm:px-6 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/95 flex items-center justify-center p-1 shrink-0 shadow">
            <SchoolLogo school={student.school} height={30} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm truncate">{exam.title}</p>
            <p className="text-[11px] text-slate-400 truncate">
              {student.name} · {student.school} · Kelas {student.className}
            </p>
          </div>
          <div className="hidden md:flex items-center rounded-lg bg-white/95 px-2 py-1">
            <SukmaMark height={18} />
          </div>
          <div
            className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-2 font-mono font-extrabold text-base sm:text-lg tabular-nums ${
              lowTime ? 'bg-rose-600 text-white animate-pulseSlow' : 'bg-white/10 text-brand-300'
            }`}
          >
            <span className="text-sm">⏱</span>
            {formatTime(remaining)}
          </div>
          <button
            className="hidden sm:inline-flex btn bg-brand-600 hover:bg-brand-700 text-white !py-2.5 text-sm font-bold"
            onClick={() => setConfirmOpen(true)}
          >
            Kumpulkan
          </button>
        </div>
        {violations > 0 && (
          <div className="bg-rose-600 text-white text-[11px] font-semibold px-4 py-1.5">
            ⚠️ Terdeteksi {violations} kali keluar dari layar ujian — aktivitas ini dilaporkan ke proktor.
          </div>
        )}
      </header>

      <div className="flex-1 grid lg:grid-cols-[1fr_320px] gap-4 p-3 sm:p-6 pb-24 lg:pb-6 max-w-[1400px] w-full mx-auto items-start">
        {/* Kartu soal */}
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-slate-100 bg-white/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Soal</span>
              <span className="text-lg font-extrabold text-brand-700">
                {index + 1}
                <span className="text-sm text-slate-400 font-bold"> / {questions.length}</span>
              </span>
              <Badge tone={current?.type === 'essay' ? 'amber' : current?.type === 'complex_mc' ? 'violet' : 'teal'}>
                {current?.type === 'multiple_choice'
                  ? 'Pilihan Ganda'
                  : current?.type === 'complex_mc'
                  ? 'PG Kompleks'
                  : current?.type === 'true_false'
                  ? 'Benar / Salah'
                  : 'Uraian'}
              </Badge>
              <Badge tone="slate">Skor {current?.score}</Badge>
            </div>
            <button
              onClick={toggleFlag}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                answers[current?.id || '']?.flagged
                  ? 'bg-amber-100 border-amber-300 text-amber-800'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-amber-300'
              }`}
            >
              🚩 {answers[current?.id || '']?.flagged ? 'Ditandai ragu-ragu' : 'Tandai ragu-ragu'}
            </button>
          </div>

          <div className="p-4 sm:p-7">
            {current?.stimulus && (
              <div className="mb-5 rounded-xl bg-slate-50 border-l-4 border-brand-400 p-4 max-h-72 overflow-y-auto">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Stimulus / Bacaan
                </p>
                <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                  {current.stimulus}
                </p>
              </div>
            )}

            <p className="text-base sm:text-lg font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap">
              {current?.text}
            </p>

            {(current?.images?.length ?? 0) > 0 && (
              <div className="mt-4 space-y-2.5">
                {current!.images!.map((img, i) => (
                  <a
                    key={i}
                    href={img}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-slate-200 bg-white p-1.5"
                    title="Klik untuk memperbesar gambar"
                  >
                    <img
                      src={img}
                      alt={`Gambar soal ${i + 1}`}
                      className="w-full max-h-[420px] object-contain rounded-lg"
                    />
                  </a>
                ))}
              </div>
            )}

            {current?.type === 'essay' ? (
              <div className="mt-5">
                <textarea
                  className="input min-h-[180px] text-sm leading-relaxed"
                  placeholder="Tuliskan jawaban uraian Anda di sini..."
                  value={answers[current.id]?.value?.[0] || ''}
                  onChange={(e) => setAnswer(current.id, [e.target.value])}
                />
                <p className="text-[11px] text-slate-400 mt-2">
                  {(answers[current.id]?.value?.[0] || '').trim().split(/\s+/).filter(Boolean).length} kata ·
                  jawaban tersimpan otomatis
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-2.5">
                {current?.options.map((opt) => {
                  const selected = (answers[current.id]?.value || []).includes(opt.id);
                  const multi = current.type === 'complex_mc';
                  return (
                    <button
                      key={opt.id}
                      onClick={() => pickOption(current.id, opt.id, multi)}
                      className={`w-full flex items-start gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                        selected
                          ? 'border-brand-500 bg-brand-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/40'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 shrink-0 rounded-lg text-xs font-extrabold flex items-center justify-center ${
                          selected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
                        } ${multi ? 'rounded-md' : 'rounded-full'}`}
                      >
                        {current.type === 'true_false' ? (opt.id === 'true' ? '✓' : '✕') : opt.id}
                      </span>
                      <span className={`text-sm leading-snug ${selected ? 'font-semibold text-brand-900' : 'text-slate-700'}`}>
                        {opt.text}
                        {opt.image && (
                          <img
                            src={opt.image}
                            alt={`Gambar pilihan ${opt.id}`}
                            className="mt-2 max-h-40 w-auto max-w-full rounded-lg border border-slate-200 bg-white object-contain"
                          />
                        )}
                      </span>
                    </button>
                  );
                })}
                {current?.type === 'complex_mc' && (
                  <p className="text-[11px] text-slate-400 pt-1">
                    Soal ini memiliki lebih dari satu jawaban benar.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="hidden lg:flex items-center justify-between gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/70">
            <button
              className="btn-secondary"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
            >
              ← Sebelumnya
            </button>
            <span className="text-xs text-slate-400 hidden sm:block">
              Jawaban tersimpan otomatis
            </span>
            {index === questions.length - 1 ? (
              <button className="btn-primary" onClick={() => setConfirmOpen(true)}>
                Selesai &amp; Kumpulkan →
              </button>
            ) : (
              <button className="btn-primary" onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}>
                Selanjutnya →
              </button>
            )}
          </div>
        </div>

        {/* Panel navigasi */}
        <aside className="hidden lg:block space-y-3 lg:sticky lg:top-24">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Navigasi Soal</p>
              <span className="text-[11px] font-bold text-brand-700">
                {answeredCount}/{questions.length}
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {questions.map((q, i) => {
                const isAns = isAnswered(q, answers[q.id]?.value || []);
                const isFlag = answers[q.id]?.flagged;
                const active = i === index;
                return (
                  <button
                    key={q.id}
                    onClick={() => setIndex(i)}
                    className={`h-9 rounded-lg text-xs font-extrabold transition border-2 ${
                      active
                        ? 'border-brand-600 ring-2 ring-brand-200'
                        : 'border-transparent'
                    } ${
                      isFlag
                        ? 'bg-amber-400 text-amber-900'
                        : isAns
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 space-y-1.5 text-[11px] text-slate-500">
              <p className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-brand-600" /> Sudah dijawab ({answeredCount})
              </p>
              <p className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-400" /> Ragu-ragu ({flaggedCount})
              </p>
              <p className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-slate-200" /> Belum dijawab (
                {questions.length - answeredCount})
              </p>
            </div>
            <button
              className="btn-primary w-full mt-4 !py-2.5"
              onClick={() => setConfirmOpen(true)}
            >
              📤 Kumpulkan Jawaban
            </button>
          </div>

          <div className="card p-4 text-[11px] text-slate-500 leading-relaxed">
            <p className="font-bold text-slate-700 mb-1">Petunjuk</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Waktu berjalan otomatis dan tidak dapat dijeda.</li>
              <li>Jangan menutup atau berpindah tab saat ujian.</li>
              <li>Jawaban tersimpan setiap kali Anda memilih.</li>
              <li>Bila waktu habis, jawaban dikumpulkan otomatis.</li>
            </ul>
          </div>
        </aside>
      </div>

      {/* Bar aksi bawah (mobile) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] flex items-center gap-2 no-print">
        <button
          className="w-11 h-11 shrink-0 rounded-xl bg-slate-100 text-slate-700 font-bold disabled:opacity-40"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          aria-label="Soal sebelumnya"
        >
          ←
        </button>
        <button
          className="flex-1 min-w-0 h-11 rounded-xl bg-slate-100 px-3 flex flex-col items-start justify-center"
          onClick={() => setNavOpen(true)}
        >
          <span className="text-[11px] font-extrabold text-slate-800 leading-none">
            Soal {index + 1} / {questions.length}
          </span>
          <span className="text-[10px] text-slate-500 leading-none mt-1">
            {answeredCount} terjawab · {flaggedCount} ragu
          </span>
        </button>
        {index === questions.length - 1 ? (
          <button
            className="h-11 px-4 rounded-xl bg-brand-600 text-white text-xs font-bold shrink-0"
            onClick={() => setConfirmOpen(true)}
          >
            Kumpulkan
          </button>
        ) : (
          <button
            className="w-11 h-11 shrink-0 rounded-xl bg-brand-600 text-white font-bold"
            onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
            aria-label="Soal berikutnya"
          >
            →
          </button>
        )}
      </div>

      {/* Navigasi soal (bottom sheet mobile) */}
      {navOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex items-end">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setNavOpen(false)}
          />
          <div className="relative w-full bg-white rounded-t-3xl p-5 pb-8 animate-slideUp max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-extrabold text-slate-800">Navigasi Soal</p>
              <button
                className="text-slate-400 text-lg leading-none"
                onClick={() => setNavOpen(false)}
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {questions.map((q, i) => {
                const isAns = isAnswered(q, answers[q.id]?.value || []);
                const isFlag = answers[q.id]?.flagged;
                const active = i === index;
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setIndex(i);
                      setNavOpen(false);
                    }}
                    className={`h-10 rounded-lg text-xs font-extrabold border-2 ${
                      active ? 'border-brand-600 ring-2 ring-brand-200' : 'border-transparent'
                    } ${
                      isFlag
                        ? 'bg-amber-400 text-amber-900'
                        : isAns
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-brand-600" /> Dijawab ({answeredCount})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-amber-400" /> Ragu-ragu ({flaggedCount})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-slate-200" /> Kosong (
                {questions.length - answeredCount})
              </span>
            </div>
            <button className="btn-primary w-full mt-4" onClick={() => setConfirmOpen(true)}>
              📤 Kumpulkan Jawaban
            </button>
          </div>
        </div>
      )}

      {/* Konfirmasi kumpul */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Kumpulkan Jawaban?"
        subtitle="Periksa kembali sebelum mengumpulkan"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmOpen(false)}>
              Periksa Lagi
            </button>
            <button className="btn-primary" onClick={() => doSubmit(false)}>
              Ya, Kumpulkan
            </button>
          </>
        }
      >
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-brand-50 px-2 py-3">
            <p className="text-xl font-extrabold text-brand-700">{answeredCount}</p>
            <p className="text-[10px] font-bold uppercase text-brand-600">Terjawab</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-2 py-3">
            <p className="text-xl font-extrabold text-slate-700">{questions.length - answeredCount}</p>
            <p className="text-[10px] font-bold uppercase text-slate-500">Kosong</p>
          </div>
          <div className="rounded-xl bg-amber-50 px-2 py-3">
            <p className="text-xl font-extrabold text-amber-700">{flaggedCount}</p>
            <p className="text-[10px] font-bold uppercase text-amber-600">Ragu</p>
          </div>
        </div>
        {questions.length - answeredCount > 0 && (
          <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Masih ada {questions.length - answeredCount} soal belum dijawab. Soal kosong dinilai 0.
          </p>
        )}
      </Modal>

      {/* Peringatan anti kecurangan */}
      <Modal
        open={warning}
        onClose={() => setWarning(false)}
        title="Peringatan!"
        size="sm"
        footer={
          <button className="btn-danger" onClick={() => setWarning(false)}>
            Saya Mengerti
          </button>
        }
      >
        <div className="text-center py-2">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-sm text-slate-700 leading-relaxed">
            Anda terdeteksi keluar dari layar ujian. Aktivitas ini <b>dicatat dan dilaporkan</b> kepada
            guru/proktor.
          </p>
          <p className="mt-2 text-xs text-rose-600 font-bold">Pelanggaran: {violations} kali</p>
        </div>
      </Modal>
    </div>
  );
};

export default ExamInterface;
