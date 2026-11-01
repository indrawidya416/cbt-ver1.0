import React, { useEffect, useMemo, useState } from 'react';
import { Exam, UserRole, formatTime } from '../../types';
import storage from '../../services/storageService';
import { Badge, EmptyState, ProgressBar, SectionHeader, StatCard, useToast } from '../../components/ui';
import { isAnswered, percentOf } from '../../utils/scoring';
import { SchoolLogo } from '../../components/Brand';
import { themeOfSchool } from '../../theme';
import { scopeOf } from '../../services/authService';
import { listActiveSessions, releaseSession } from '../../services/securityService';
import {
  apiConfigured,
  remoteListSessions,
  remoteReleaseSession,
  type RemoteSessionInfo,
} from '../../services/apiService';

const Monitoring: React.FC<{ userRole: UserRole; username: string }> = ({ username }) => {
  const scope = scopeOf(username);
  const scoped = scope !== 'Semua';
  const [version, setVersion] = useState(0);
  const [examId, setExamId] = useState('');
  const [now, setNow] = useState(Date.now());
  const [remoteSessions, setRemoteSessions] = useState<RemoteSessionInfo[]>([]);
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

  useEffect(() => {
    if (!examId && exams.length > 0) setExamId(exams[0].id);
  }, [exams, examId]);

  // Ambil sesi aktif dari server (bila URL API diisi) agar guru bisa melepas
  // sesi siswa yang login dari perangkat lain.
  useEffect(() => {
    if (!apiConfigured()) return;
    let alive = true;
    const load = () => {
      remoteListSessions().then((list) => {
        if (alive) setRemoteSessions(list);
      });
    };
    load();
    const t = window.setInterval(load, 10000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);

  // refresh otomatis tiap 5 detik
  useEffect(() => {
    const t = window.setInterval(() => {
      setNow(Date.now());
      setVersion((v) => v + 1);
    }, 5000);
    return () => window.clearInterval(t);
  }, []);

  const exam: Exam | undefined = exams.find((e) => e.id === examId);
  const examQuestions = exam ? storage.getExamQuestions(exam) : [];
  const participants = exam
    ? storage.students
        .getAll()
        .filter(
          (s) =>
            (exam.school === 'Semua' || s.school === exam.school) &&
            exam.classes.includes(s.className),
        )
    : [];

  // Sesi lokal digabung dengan sesi dari server (hindari duplikat NIS)
  const localSessions = listActiveSessions();
  const activeSessions = [
    ...localSessions,
    ...remoteSessions
      .filter((r) => !localSessions.some((l) => l.nis.toLowerCase() === String(r.nis).toLowerCase()))
      .map((r) => ({
        nis: String(r.nis),
        sessionId: String(r.sessionId),
        deviceId: String(r.deviceId || ''),
        deviceLabel: String(r.deviceLabel || 'Perangkat lain'),
        startedAt: String(r.startedAt || new Date().toISOString()),
        lastSeen: Number(r.lastSeen || Date.now()),
        examId: r.examId || null,
      })),
  ];

  const rows = participants.map((student) => {
    const result = results.find((r) => r.examId === examId && r.studentNis === student.nis);
    const answered = result
      ? examQuestions.filter((q) => isAnswered(q, result.answers[q.id]?.value || [])).length
      : 0;
    let remaining = 0;
    if (result && result.status === 'in_progress') {
      const end = new Date(result.startedAt).getTime() + (exam!.duration || 0) * 60000;
      remaining = Math.max(0, (end - now) / 1000);
    }
    const session = activeSessions.find((x) => x.nis === student.nis);
    return { student, result, answered, remaining, session };
  });

  const inProgress = rows.filter((r) => r.result?.status === 'in_progress');
  const submitted = rows.filter((r) => r.result?.status === 'submitted');
  const notStarted = rows.filter((r) => !r.result);
  const avg =
    submitted.length > 0
      ? Math.round(submitted.reduce((a, r) => a + percentOf(r.result!), 0) / submitted.length)
      : 0;

  const forceSubmit = (resultId: string, name: string) => {
    if (!window.confirm(`Kirim paksa jawaban ${name}? Siswa tidak dapat melanjutkan ujian.`)) return;
    storage.submitResult(resultId);
    setVersion((v) => v + 1);
    show(`Jawaban ${name} berhasil dikirim.`);
  };

  const resetStudent = (resultId: string, name: string) => {
    if (!window.confirm(`Reset ujian ${name}? Seluruh jawaban siswa akan dihapus dan siswa dapat mengulang.`))
      return;
    storage.results.remove(resultId);
    setVersion((v) => v + 1);
    show(`Ujian ${name} direset.`);
  };

  return (
    <div className="space-y-4" data-theme={themeOfSchool(exam?.school === 'Semua' ? null : exam?.school)}>
      <SectionHeader
        title="Monitoring Ujian"
        subtitle={
          scoped
            ? `Peserta ujian ${scope} — pembaruan otomatis tiap 5 detik`
            : 'Pantau peserta ujian secara langsung (refresh otomatis tiap 5 detik)'
        }
        icon="📡"
        actions={
          <>
          <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-full">
            🔒 1 akun = 1 perangkat
          </span>
          {exam && exam.school !== 'Semua' && (
            <div className="hidden sm:flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3 py-1.5">
              <SchoolLogo school={exam.school} height={26} />
              <span className="text-[11px] font-bold text-slate-600">{exam.school}</span>
            </div>
          )}
          <select className="input !w-auto max-w-full text-xs sm:text-sm" value={examId} onChange={(e) => setExamId(e.target.value)}>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} — {e.school}
              </option>
            ))}
          </select>
          </>
        }
      />

      {!exam ? (
        <div className="card">
          <EmptyState icon="📡" title="Belum ada ujian" description="Buat jadwal ujian terlebih dahulu." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Total Peserta" value={participants.length} icon="👥" tone="blue" hint={`Kelas ${exam.classes.join(', ')}`} />
            <StatCard label="Sedang Mengerjakan" value={inProgress.length} icon="✍️" tone="amber" hint="Status realtime" />
            <StatCard label="Sudah Selesai" value={`${submitted.length}`} icon="✅" tone="teal" hint={`${notStarted.length} siswa belum mulai`} />
            <StatCard label="Rata-rata Nilai" value={avg} icon="📊" tone="violet" hint={`KKM ${exam.kkm}`} />
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-700">
                {exam.title}{' '}
                <span className="font-normal text-slate-400">
                  · {exam.duration} menit · token {exam.token}
                </span>
              </p>
              <Badge tone={exam.isActive ? 'emerald' : 'slate'}>
                {exam.isActive ? 'Ujian Aktif' : 'Nonaktif'}
              </Badge>
            </div>
            {/* Tampilan kartu pada HP */}
            <div className="lg:hidden divide-y divide-slate-100">
              {rows.map(({ student, result, answered, remaining, session }) => {
                const total = examQuestions.length || 1;
                return (
                  <div key={student.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{student.name}</p>
                        <p className="text-[11px] font-mono text-slate-400">
                          {student.nis} · Kelas {student.className}
                        </p>
                      </div>
                      {!result && <Badge tone="slate">Belum Mulai</Badge>}
                      {result?.status === 'in_progress' && <Badge tone="amber">Mengerjakan</Badge>}
                      {result?.status === 'submitted' && <Badge tone="emerald">Selesai</Badge>}
                    </div>

                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Progres</p>
                        <p className="text-xs font-semibold text-slate-700">
                          {result ? `${answered}/${total} soal` : '——'}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Sisa Waktu</p>
                        <p
                          className={`text-xs font-mono font-bold ${
                            result?.status === 'in_progress' && remaining < 300
                              ? 'text-rose-600'
                              : 'text-slate-700'
                          }`}
                        >
                          {result?.status === 'in_progress' ? formatTime(remaining) : '——'}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Nilai</p>
                        <p className="text-xs font-extrabold text-slate-800">
                          {result?.status === 'submitted' ? percentOf(result) : '——'}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Perangkat</p>
                        <p className="text-[11px] font-semibold text-slate-700 truncate">
                          {session ? session.deviceLabel : result?.deviceLabel || '——'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {session && (
                        <button
                          className="btn-secondary !py-1.5 text-xs"
                          onClick={() => {
                            releaseSession(student.nis);
                            if (apiConfigured()) remoteReleaseSession(student.nis);
                            setVersion((v) => v + 1);
                            show(`Sesi ${student.name} diakhiri.`);
                          }}
                        >
                          🔓 Akhiri Sesi
                        </button>
                      )}
                      {result?.status === 'in_progress' && (
                        <button
                          className="btn-secondary !py-1.5 text-xs"
                          onClick={() => forceSubmit(result.id, student.name)}
                        >
                          ⏹️ Kirim Paksa
                        </button>
                      )}
                      {result && (
                        <button
                          className="btn-ghost !py-1.5 text-xs !text-rose-600"
                          onClick={() => resetStudent(result.id, student.name)}
                        >
                          ↺ Reset
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full min-w-[960px]">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    <th className="th w-12">No</th>
                    <th className="th">Nama Siswa</th>
                    <th className="th">Kelas</th>
                    <th className="th">Status</th>
                    <th className="th w-52">Progres</th>
                    <th className="th">Sisa Waktu</th>
                    <th className="th">Perangkat</th>
                    <th className="th">Nilai</th>
                    <th className="th text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map(({ student, result, answered, remaining, session }, i) => {
                    const total = examQuestions.length || 1;
                    return (
                      <tr key={student.id} className="hover:bg-slate-50/60">
                        <td className="td text-slate-400">{i + 1}</td>
                        <td className="td font-semibold text-slate-800">
                          {student.name}
                          {result && result.violationCount > 0 && (
                            <span className="ml-2 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                              {result.violationCount}× keluar layar
                            </span>
                          )}
                          <div className="text-[11px] font-mono text-slate-400">{student.nis}</div>
                        </td>
                        <td className="td">{student.className}</td>
                        <td className="td">
                          {!result && <Badge tone="slate">Belum Mulai</Badge>}
                          {result?.status === 'in_progress' && <Badge tone="amber">Mengerjakan</Badge>}
                          {result?.status === 'submitted' && <Badge tone="emerald">Selesai</Badge>}
                        </td>
                        <td className="td">
                          {result ? (
                            <div className="space-y-1">
                              <ProgressBar
                                value={(answered / total) * 100}
                                tone={result.status === 'submitted' ? 'bg-emerald-500' : 'bg-brand-500'}
                              />
                              <span className="text-[11px] text-slate-500">
                                {answered}/{total} soal terjawab
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="td">
                          {result?.status === 'in_progress' ? (
                            <span
                              className={`font-mono text-sm font-bold ${
                                remaining < 300 ? 'text-rose-600' : 'text-slate-700'
                              }`}
                            >
                              {formatTime(remaining)}
                            </span>
                          ) : result ? (
                            <span className="text-xs text-slate-400">—</span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="td">
                          {session ? (
                            <div className="min-w-[130px]">
                              <span className="badge bg-emerald-100 text-emerald-700 mb-1">
                                ● Aktif
                              </span>
                              <p className="text-[11px] text-slate-600">{session.deviceLabel}</p>
                              <button
                                className="text-[10px] font-bold text-rose-600 hover:underline mt-0.5"
                                onClick={() => {
                                  releaseSession(student.nis);
                                  if (apiConfigured()) remoteReleaseSession(student.nis);
                                  setVersion((v) => v + 1);
                                  show(`Sesi ${student.name} diakhiri.`);
                                }}
                              >
                                Akhiri Sesi
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              {result?.deviceLabel || '—'}
                            </span>
                          )}
                        </td>
                        <td className="td">
                          {result?.status === 'submitted' ? (
                            <span className="font-extrabold text-slate-800">{percentOf(result)}</span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="td text-right whitespace-nowrap">
                          {result?.status === 'in_progress' && (
                            <button
                              className="btn-secondary !py-1.5 !px-2.5 text-xs"
                              onClick={() => forceSubmit(result.id, student.name)}
                            >
                              ⏹️ Kirim Paksa
                            </button>
                          )}
                          {result && (
                            <button
                              className="btn-ghost !py-1.5 !px-2 text-xs !text-rose-600 hover:!bg-rose-50"
                              onClick={() => resetStudent(result.id, student.name)}
                            >
                              ↺ Reset
                            </button>
                          )}
                          {!result && <span className="text-xs text-slate-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {rows.length === 0 && (
              <EmptyState
                icon="🧑‍🎓"
                title="Tidak ada peserta"
                description={`Belum ada siswa terdaftar pada kelas ${exam.classes.join(', ')} di ${exam.school}.`}
              />
            )}
          </div>
        </>
      )}
      {node}
    </div>
  );
};

export default Monitoring;
