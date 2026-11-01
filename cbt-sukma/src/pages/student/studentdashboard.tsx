import React, { useMemo } from 'react';
import storage from '../../services/storageService';
import { Badge, SectionHeader, StatCard } from '../../components/ui';
import { formatDate } from '../../types';
import { gradeLabel, percentOf } from '../../utils/scoring';
import { SchoolLogo, SukmaMark } from '../../components/Brand';

const StudentDashboard: React.FC<{ username: string }> = ({ username }) => {
  const student = storage.findStudentByNis(username);
  const results = useMemo(
    () => storage.results.getAll().filter((r) => r.studentNis === username && r.status === 'submitted'),
    [username],
  );
  const exams = storage.exams.getAll();
  const myExams = exams.filter(
    (e) =>
      e.isActive &&
      student &&
      (e.school === 'Semua' || e.school === student.school) &&
      e.classes.includes(student!.className),
  );
  const doneIds = results.map((r) => r.examId);
  const pending = myExams.filter((e) => !doneIds.includes(e.id));
  const avg = results.length
    ? Math.round(results.reduce((a, r) => a + percentOf(r), 0) / results.length)
    : 0;

  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-brand-600 via-brand-600 to-brand-700 px-6 py-7 text-white relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
          {student && (
            <div className="absolute right-5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-xl">
              <SchoolLogo school={student.school} height={52} />
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>
                  Peserta Ujian
                </p>
                <p className="text-xs font-extrabold text-slate-800">{student.school}</p>
                <p className="text-[10px] text-slate-500">Kelas {student.className}</p>
              </div>
            </div>
          )}
          <p className="text-brand-100 text-sm">{greeting},</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold mt-1">{student?.name || 'Siswa'}</h2>
          <p className="text-brand-100/90 text-sm mt-1">
            {student?.school || '-'} · Kelas {student?.className || '-'} · NIS {student?.nis || username}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/15 border border-white/20 px-3 py-1 text-xs font-semibold">
              🎓 Tahun Pelajaran {storage.getSettings().academicYear}
            </span>
            <span className="rounded-full bg-white/15 border border-white/20 px-3 py-1 text-xs font-semibold">
              📝 {results.length} ujian selesai
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="Ujian Menunggu" value={pending.length} icon="🗓️" tone="amber" hint="Belum dikerjakan" />
        <StatCard label="Ujian Selesai" value={results.length} icon="✅" tone="teal" hint="Sudah dikumpulkan" />
        <StatCard
          label="Rata-rata Nilai"
          value={avg}
          icon="📈"
          tone="violet"
          hint={results.length ? gradeLabel(avg).label : 'Belum ada nilai'}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-3 sm:gap-4 [&>*]:min-w-0">
        <div className="card p-5 min-w-0">
          <h3 className="font-bold text-slate-800 mb-3">Ujian yang Tersedia</h3>
          {pending.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              Tidak ada ujian aktif untuk kelas Anda saat ini. 🎉
            </p>
          ) : (
            <div className="space-y-2">
              {pending.slice(0, 4).map((e) => {
                const packet = storage.packets.getById(e.packetId);
                return (
                  <div key={e.id} className="rounded-xl border border-slate-200 px-3 py-2.5 hover:border-brand-300 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{e.title}</p>
                        <p className="text-[11px] text-slate-500">
                          {packet?.category} · {e.duration} menit · {e.date} {e.startTime}
                        </p>
                      </div>
                      <Badge tone="amber">Belum</Badge>
                    </div>
                  </div>
                );
              })}
              <p className="text-[11px] text-slate-400 pt-1">
                Buka menu <b>Ujian Saya</b> untuk memasukkan token dan mulai mengerjakan.
              </p>
            </div>
          )}
        </div>

        <div className="card p-5 min-w-0">
          <h3 className="font-bold text-slate-800 mb-3">Hasil Terakhir</h3>
          {results.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">Belum ada hasil ujian.</p>
          ) : (
            <div className="space-y-2">
              {results
                .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''))
                .slice(0, 4)
                .map((r) => {
                  const exam = storage.exams.getById(r.examId);
                  const g = gradeLabel(percentOf(r));
                  return (
                    <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {exam?.title || 'Ujian'}
                        </p>
                        <p className="text-[11px] text-slate-500">{formatDate(r.submittedAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-extrabold text-slate-800 leading-none">{percentOf(r)}</p>
                        <p className="text-[10px] font-bold uppercase text-slate-400">{g.label}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
