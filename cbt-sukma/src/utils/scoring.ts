import { AnswerMap, ExamResult, Question } from '../types';

const norm = (s: string) => (s || '').trim().toLowerCase();

/** Cek apakah jawaban siswa benar untuk soal objektif */
export const isCorrect = (question: Question, value: string[] = []): boolean => {
  const key = (question.answerKey || []).map(norm).sort();
  const ans = (value || []).map(norm).sort();
  if (key.length === 0) return false;
  if (question.type === 'essay') return false;
  if (key.length !== ans.length) return false;
  return key.every((k, i) => k === ans[i]);
};

export const isAnswered = (question: Question, value: string[] = []): boolean => {
  if (question.type === 'essay') return norm(value[0] || '').length > 0;
  return (value || []).filter((v) => norm(v).length > 0).length > 0;
};

export interface ScoreSummary {
  autoScore: number;
  manualScore: number;
  maxScore: number;
  needsGrading: boolean;
  correctCount: number;
  answeredCount: number;
}

/** Hitung skor dari daftar soal + jawaban */
export const scoreAnswers = (
  questions: Question[],
  answers: AnswerMap,
): ScoreSummary => {
  let autoScore = 0;
  let manualScore = 0;
  let maxScore = 0;
  let needsGrading = false;
  let correctCount = 0;
  let answeredCount = 0;

  questions.forEach((q) => {
    const entry = answers[q.id];
    const value = entry?.value || [];
    maxScore += q.score || 1;
    if (isAnswered(q, value)) answeredCount += 1;

    if (q.type === 'essay') {
      const manual = typeof entry?.score === 'number' ? entry.score : undefined;
      if (manual === undefined) {
        needsGrading = true;
      } else {
        manualScore += Math.min(manual, q.score || 1);
      }
      return;
    }

    if (isCorrect(q, value)) {
      autoScore += q.score || 1;
      correctCount += 1;
    }
  });

  return { autoScore, manualScore, maxScore, needsGrading, correctCount, answeredCount };
};

/** Nilai persentase 0-100 */
export const percentOf = (result: Pick<ExamResult, 'autoScore' | 'manualScore' | 'maxScore'>) => {
  if (!result.maxScore) return 0;
  return Math.round(((result.autoScore + result.manualScore) / result.maxScore) * 100);
};

export const gradeLabel = (score: number) => {
  if (score >= 90) return { label: 'Sangat Baik', color: 'emerald' };
  if (score >= 80) return { label: 'Baik', color: 'teal' };
  if (score >= 70) return { label: 'Cukup', color: 'amber' };
  if (score >= 55) return { label: 'Perlu Bimbingan', color: 'orange' };
  return { label: 'Remedial', color: 'rose' };
};
