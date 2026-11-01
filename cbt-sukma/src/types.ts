export enum UserRole {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
}

export type SchoolName = 'MI Islamiyah' | 'SMP Al Hidayah';

export const SCHOOLS: SchoolName[] = ['MI Islamiyah', 'SMP Al Hidayah'];

export type QuestionType = 'multiple_choice' | 'complex_mc' | 'true_false' | 'essay';

export type Category = 'Literasi' | 'Numerasi' | 'Sains' | 'Mapel';

export const CATEGORIES: Category[] = ['Literasi', 'Numerasi', 'Sains', 'Mapel'];

export interface QuestionOption {
  id: string; // A, B, C, D, E
  text: string;
  /// Gambar pilihan jawaban (data-URL terkompresi, opsional)
  image?: string;
}

export interface Question {
  id: string;
  packetId: string;
  type: QuestionType;
  stimulus?: string; // teks bacaan / konteks
  /// Gambar soal (data-URL terkompresi, urutan tampil dari atas)
  images?: string[];
  text: string;
  options: QuestionOption[];
  answerKey: string[]; // untuk MC: 1 item, complex: banyak, true_false: 'true'/'false', essay: []
  score: number;
  explanation?: string;
  createdAt: string;
}

export interface Packet {
  id: string;
  name: string;
  category: Category;
  subject: string;
  school: SchoolName | 'Semua';
  level: string; // kelas/fase
  description?: string;
  createdAt: string;
}

export interface Student {
  id: string;
  nis: string;
  name: string;
  school: SchoolName;
  className: string;
  gender: 'L' | 'P';
  password?: string;
  createdAt: string;
}

export interface Exam {
  id: string;
  title: string;
  packetId: string;
  school: SchoolName | 'Semua';
  classes: string[];
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  duration: number; // menit
  token: string;
  isActive: boolean;
  shuffle: boolean;
  kkm: number;
  createdAt: string;
}

export type ResultStatus = 'in_progress' | 'submitted';

export interface AnswerMap {
  [questionId: string]: {
    value: string[];
    score?: number; // nilai manual (uraian)
    flagged?: boolean;
    updatedAt: string;
  };
}

export interface ExamResult {
  id: string;
  examId: string;
  studentNis: string;
  studentName: string;
  school: SchoolName;
  className: string;
  startedAt: string;
  submittedAt?: string | null;
  status: ResultStatus;
  answers: AnswerMap;
  autoScore: number;
  manualScore: number;
  maxScore: number;
  needsGrading: boolean;
  violationCount: number;
  /** Perangkat yang dipakai mengerjakan (proteksi 1 akun 1 perangkat) */
  deviceId?: string;
  deviceLabel?: string;
}

export interface StaffAccount {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  /** Cakupan data: satu sekolah, atau semua sekolah (admin/proktor global) */
  scope: SchoolName | 'Semua';
  label: string;
}

export interface AppUser {
  role: UserRole;
  username: string;
  name: string;
  school?: SchoolName | 'Semua';
}

export interface Settings {
  apiUrl: string;
  apiKey?: string;
  appName: string;
  kkm: number;
  antiCheat: boolean;
  lastSync?: string;
  academicYear: string;
}

export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const formatDate = (iso?: string | null) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatTime = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
};
