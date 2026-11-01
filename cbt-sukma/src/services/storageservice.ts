import {
  AnswerMap,
  Exam,
  ExamResult,
  Packet,
  Question,
  Settings,
  StaffAccount,
  Student,
  uid,
} from '../types';
import { buildSeed } from './seedData';
import { deviceLabel, getDeviceId } from './securityService';
import { scoreAnswers } from '../utils/scoring';

const K = {
  students: 'sukma_students',
  packets: 'sukma_packets',
  questions: 'sukma_questions',
  exams: 'sukma_exams',
  results: 'sukma_results',
  staff: 'sukma_staff',
  settings: 'sukma_settings',
  meta: 'sukma_meta',
};

const DEFAULT_SETTINGS: Settings = {
  // Nilai awal bisa "dibakar" saat build lewat Netlify Environment Variables
  // (VITE_API_URL / VITE_API_KEY). Bila kosong, guru mengisinya sekali di menu Pengaturan.
  apiUrl: (import.meta.env?.VITE_API_URL || '').trim(),
  apiKey: (import.meta.env?.VITE_API_KEY || '').trim(),
  appName: 'CBT Sekolah Sukma',
  kkm: 70,
  antiCheat: true,
  academicYear: '2025/2026',
  lastSync: undefined,
};

/* ------------------------------------------------------------------ */
/*  Penyimpanan: localStorage, dengan fallback memori                  */
/*  (mis. saat aplikasi dibuka di iframe/preview yang memblokir storage)*/
/* ------------------------------------------------------------------ */
const memory = new Map<string, string>();

const storageAvailable = (() => {
  try {
    const probe = '__sukma_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
})();

const driver = {
  isPersistent: () => storageAvailable,
  getItem(key: string): string | null {
    if (storageAvailable) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return memory.get(key) ?? null;
      }
    }
    return memory.get(key) ?? null;
  },
  setItem(key: string, value: string) {
    if (storageAvailable) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch {
        /* quota / private mode → fallback memori */
      }
    }
    memory.set(key, value);
  },
  removeItem(key: string) {
    if (storageAvailable) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
    memory.delete(key);
  },
  keys(): string[] {
    if (!storageAvailable) return Array.from(memory.keys());
    try {
      return Object.keys(window.localStorage);
    } catch {
      return Array.from(memory.keys());
    }
  },
  usageBytes(): number {
    return driver.keys().reduce((total, key) => total + (driver.getItem(key) || '').length, 0);
  },
};

/* ------------------------------------------------------------------ */
/*  Low level helpers                                                  */
/* ------------------------------------------------------------------ */
const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = driver.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const write = <T,>(key: string, value: T) => {
  try {
    driver.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Gagal menyimpan data', e);
  }
  notify();
};

/* Pub/sub sederhana supaya UI bisa re-render saat data berubah */
type Listener = () => void;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((l) => l());

/* ------------------------------------------------------------------ */
/*  Collection factory                                                 */
/* ------------------------------------------------------------------ */
const collection = <T extends { id: string }>(key: string) => ({
  getAll: (): T[] => read<T[]>(key, []),
  getById: (id: string): T | undefined => read<T[]>(key, []).find((x) => x.id === id),
  saveAll: (rows: T[]) => write(key, rows),
  add: (row: T) => {
    const rows = read<T[]>(key, []);
    rows.push(row);
    write(key, rows);
    return row;
  },
  update: (id: string, patch: Partial<T>) => {
    const rows = read<T[]>(key, []);
    const next = rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
    write(key, next);
    return next.find((r) => r.id === id);
  },
  remove: (id: string) => {
    const rows = read<T[]>(key, []).filter((r) => r.id !== id);
    write(key, rows);
  },
  bulkAdd: (rows: T[]) => {
    const existing = read<T[]>(key, []);
    write(key, [...existing, ...rows]);
  },
});

/* ------------------------------------------------------------------ */
/*  Storage API                                                        */
/* ------------------------------------------------------------------ */
export const storage = {
  students: collection<Student>(K.students),
  packets: collection<Packet>(K.packets),
  questions: collection<Question>(K.questions),
  exams: collection<Exam>(K.exams),
  results: collection<ExamResult>(K.results),
  staff: collection<StaffAccount>(K.staff),

  subscribe(cb: Listener) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },

  /* -------- questions helper -------- */
  getQuestionsByPacket(packetId: string): Question[] {
    return storage.questions.getAll().filter((q) => q.packetId === packetId);
  },

  getExamQuestions(exam: Exam): Question[] {
    const qs = storage.getQuestionsByPacket(exam.packetId);
    if (!exam.shuffle) return qs;
    // Shuffle deterministik per exam supaya urutan stabil
    const arr = [...qs];
    let seedNum = exam.id.split('').reduce((a, c) => a + c.charCodeAt(0), 7);
    for (let i = arr.length - 1; i > 0; i--) {
      seedNum = (seedNum * 9301 + 49297) % 233280;
      const j = Math.floor((seedNum / 233280) * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  /* -------- settings -------- */
  getSettings(): Settings {
    return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(K.settings, {}) };
  },
  saveSettings(patch: Partial<Settings>) {
    const next = { ...storage.getSettings(), ...patch };
    write(K.settings, next);
    return next;
  },

  /* -------- students -------- */
  findStudentByNis(nis: string): Student | undefined {
    return storage.students
      .getAll()
      .find((s) => s.nis.trim().toLowerCase() === nis.trim().toLowerCase());
  },

  /* -------- results -------- */
  getResult(examId: string, nis: string): ExamResult | undefined {
    return storage.results
      .getAll()
      .find((r) => r.examId === examId && r.studentNis === nis);
  },

  startResult(exam: Exam, student: Student): ExamResult {
    const existing = storage.getResult(exam.id, student.nis);
    if (existing) return existing;
    const questions = storage.getExamQuestions(exam);
    const maxScore = questions.reduce((a, q) => a + (q.score || 1), 0);
    const result: ExamResult = {
      id: uid('res'),
      examId: exam.id,
      studentNis: student.nis,
      studentName: student.name,
      school: student.school,
      className: student.className,
      startedAt: new Date().toISOString(),
      submittedAt: null,
      status: 'in_progress',
      answers: {},
      autoScore: 0,
      manualScore: 0,
      maxScore,
      needsGrading: questions.some((q) => q.type === 'essay'),
      violationCount: 0,
      deviceId: getDeviceId(),
      deviceLabel: deviceLabel(),
    };
    storage.results.add(result);
    return result;
  },

  saveAnswer(resultId: string, questionId: string, value: string[], flagged?: boolean) {
    const result = storage.results.getById(resultId);
    if (!result) return;
    result.answers[questionId] = {
      value,
      flagged: flagged ?? result.answers[questionId]?.flagged ?? false,
      score: result.answers[questionId]?.score,
      updatedAt: new Date().toISOString(),
    };
    storage.results.update(resultId, { answers: result.answers });
  },

  toggleFlag(resultId: string, questionId: string) {
    const result = storage.results.getById(resultId);
    if (!result) return;
    const prev = result.answers[questionId];
    result.answers[questionId] = {
      value: prev?.value || [],
      flagged: !prev?.flagged,
      score: prev?.score,
      updatedAt: new Date().toISOString(),
    };
    storage.results.update(resultId, { answers: result.answers });
  },

  submitResult(resultId: string) {
    const result = storage.results.getById(resultId);
    if (!result) return;
    const exam = storage.exams.getById(result.examId);
    if (!exam) return;
    const questions = storage.getExamQuestions(exam);
    const summary = scoreAnswers(questions, result.answers);
    storage.results.update(resultId, {
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      autoScore: summary.autoScore,
      manualScore: summary.manualScore,
      maxScore: summary.maxScore,
      needsGrading: summary.needsGrading,
    });
  },

  gradeEssay(resultId: string, questionId: string, score: number) {
    const result = storage.results.getById(resultId);
    if (!result) return;
    const exam = storage.exams.getById(result.examId);
    if (!exam) return;
    const questions = storage.getExamQuestions(exam);
    const q = questions.find((x) => x.id === questionId);
    const entry = result.answers[questionId] || {
      value: [],
      updatedAt: new Date().toISOString(),
    };
    entry.score = Math.max(0, Math.min(score, q?.score || 0));
    result.answers[questionId] = entry;
    const summary = scoreAnswers(questions, result.answers);
    storage.results.update(resultId, {
      answers: result.answers,
      manualScore: summary.manualScore,
      needsGrading: summary.needsGrading,
    });
  },

  addViolation(resultId: string) {
    const result = storage.results.getById(resultId);
    if (!result) return;
    storage.results.update(resultId, { violationCount: (result.violationCount || 0) + 1 });
  },

  getAllAnswersOfResult(resultId: string): AnswerMap {
    return storage.results.getById(resultId)?.answers || {};
  },

  /* -------- database utilities -------- */
  /** "Perbaiki Database" — pastikan semua koleksi ada & struktur valid */
  isPersistent() {
    return driver.isPersistent();
  },

  /** Apakah aplikasi sudah pernah diinisialisasi/diisi data */
  isInitialized() {
    return driver.getItem(K.meta) !== null;
  },

  usageBytes() {
    return driver.usageBytes();
  },

  initializeDatabase() {
    const created: string[] = [];
    if (!driver.getItem(K.students)) {
      write(K.students, []);
      created.push('Siswa');
    }
    if (!driver.getItem(K.packets)) {
      write(K.packets, []);
      created.push('Paket Soal');
    }
    if (!driver.getItem(K.questions)) {
      write(K.questions, []);
      created.push('Bank Soal');
    }
    if (!driver.getItem(K.exams)) {
      write(K.exams, []);
      created.push('Jadwal Ujian');
    }
    if (!driver.getItem(K.results)) {
      write(K.results, []);
      created.push('Hasil Ujian');
    }
    if (!driver.getItem(K.settings)) {
      write(K.settings, DEFAULT_SETTINGS);
      created.push('Pengaturan');
    }
    write(K.meta, { initializedAt: new Date().toISOString() });
    return created;
  },

  /** Isi data contoh/demo lengkap beserta hasil ujian untuk analisis */
  seedDemo() {
    const seed = buildSeed();
    write(K.packets, seed.packets);
    write(K.questions, seed.questions);
    write(K.students, seed.students);
    write(K.exams, seed.exams);
    if (!driver.getItem(K.settings)) write(K.settings, DEFAULT_SETTINGS);

    /* ---- simulasi hasil ujian supaya menu Analisis & Monitoring berisi ---- */
    const results: ExamResult[] = [];
    const simulate = (exam: Exam, student: Student, quality: number) => {
      const questions = storage.getExamQuestions(exam);
      const answers: AnswerMap = {};
      let needsGrading = false;
      questions.forEach((q) => {
        const correct = Math.random() < quality;
        const value: string[] = [];
        if (q.type === 'multiple_choice') {
          value.push(correct ? q.answerKey[0] : (q.options.find((o) => !q.answerKey.includes(o.id))?.id ?? 'A'));
        } else if (q.type === 'true_false') {
          value.push(correct ? q.answerKey[0] : q.answerKey[0] === 'true' ? 'false' : 'true');
        } else if (q.type === 'complex_mc') {
          const keys = q.options.map((o) => o.id);
          if (correct) value.push(...q.answerKey);
          else value.push(keys.filter((k) => !q.answerKey.includes(k))[0] || keys[0]);
        } else if (q.type === 'essay') {
          value.push(
            'Jawaban siswa: proses perhitungan dilakukan bertahap sesuai langkah yang diajarkan guru.',
          );
        }
        answers[q.id] = {
          value,
          flagged: false,
          score: q.type === 'essay' ? (Math.random() < 0.6 ? Math.round((q.score || 4) * (0.6 + Math.random() * 0.4)) : undefined) : undefined,
          updatedAt: new Date().toISOString(),
        };
      });
      const summary = scoreAnswers(questions, answers);
      if (summary.needsGrading) needsGrading = true;
      const started = new Date();
      started.setMinutes(started.getMinutes() - exam.duration - 15);
      const submitted = new Date(started);
      submitted.setMinutes(submitted.getMinutes() + exam.duration - Math.floor(Math.random() * 20));

      results.push({
        id: uid('res'),
        examId: exam.id,
        studentNis: student.nis,
        studentName: student.name,
        school: student.school,
        className: student.className,
        startedAt: started.toISOString(),
        submittedAt: submitted.toISOString(),
        status: 'submitted',
        answers,
        autoScore: summary.autoScore,
        manualScore: summary.manualScore,
        maxScore: summary.maxScore,
        needsGrading,
        violationCount: Math.random() < 0.15 ? 1 : 0,
      });
    };

    seed.exams.forEach((exam) => {
      const eligible = seed.students.filter(
        (s) =>
          (exam.school === 'Semua' || s.school === exam.school) &&
          (exam.classes.length === 0 || exam.classes.includes(s.className)),
      );
      eligible.forEach((student, idx) => {
        // setiap siswa ke-4 sengaja belum mengerjakan agar demo ujian tetap bisa dicoba
        if (idx % 4 === 3) return;
        const quality = 0.45 + Math.random() * 0.5;
        simulate(exam, student, quality);
      });
    });
    write(K.results, results);
    write(K.meta, { initializedAt: new Date().toISOString(), seeded: true });

    return {
      students: seed.students.length,
      packets: seed.packets.length,
      questions: seed.questions.length,
      exams: seed.exams.length,
      results: results.length,
    };
  },

  resetAll() {
    Object.values(K).forEach((key) => driver.removeItem(key));
    notify();
  },

  stats() {
    return {
      students: storage.students.getAll().length,
      packets: storage.packets.getAll().length,
      questions: storage.questions.getAll().length,
      exams: storage.exams.getAll().length,
      results: storage.results.getAll().length,
    };
  },

  /* -------- sinkronisasi server (Google Apps Script / REST) -------- */
  async sync(): Promise<boolean> {
    const url = getApiUrl();
    if (!url) return false;
    try {
      // Kunci API wajib ikut dikirim (sama seperti ping & kirim hasil)
      const params = new URLSearchParams({ action: 'getAll' });
      const key = storage.getSettings().apiKey || '';
      if (key) params.set('key', key);
      const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}${params.toString()}`, {
        method: 'GET',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && data.ok === false && data.error) throw new Error(String(data.error));
      // Penting: array kosong TIDAK menimpa data lokal (mencegah data terhapus
      // saat sheet server masih kosong / baru dipasang).
      const payload = (data && data.data) || data || {};
      const pull = (key: string, storageKey: string) => {
        const incoming = payload[key];
        if (Array.isArray(incoming) && incoming.length > 0) write(storageKey, incoming);
      };
      pull('students', K.students);
      pull('packets', K.packets);
      pull('questions', K.questions);
      pull('exams', K.exams);
      pull('results', K.results);
      storage.saveSettings({ lastSync: new Date().toISOString() });
      return true;
    } catch (e) {
      console.warn('Sinkronisasi gagal:', e);
      return false;
    }
  },
};

export const getApiUrl = (): string => storage.getSettings().apiUrl || '';
export const setApiUrl = (url: string) => storage.saveSettings({ apiUrl: url });

export default storage;
