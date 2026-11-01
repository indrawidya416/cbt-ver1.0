/**
 * Proteksi sesi: satu akun siswa hanya boleh aktif pada satu perangkat/tab.
 *
 * Cara kerja (offline-first):
 * - Setiap perangkat punya `deviceId`, setiap login punya `sessionId`.
 * - Sesi aktif disimpan di localStorage + heartbeat tiap 15 detik.
 * - Jika ada login lain untuk NIS yang sama, login baru ditolak dan sesi lama
 *   (pada perangkat/tab lain di browser yang sama) otomatis terkunci.
 * - Bila URL database/API diisi pada Pengaturan, sesi juga dicatat ke server
 *   (`action=session`) sehingga berlaku antar perangkat.
 */

export const SESSION_TTL_MS = 60_000; // sesi dianggap mati bila tanpa heartbeat 60 detik
const SESSION_KEY = 'sukma_active_sessions';
const DEVICE_KEY = 'sukma_device_id';

export interface ActiveSession {
  nis: string;
  sessionId: string;
  deviceId: string;
  deviceLabel: string;
  startedAt: string;
  lastSeen: number;
  examId?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Identitas perangkat                                                */
/* ------------------------------------------------------------------ */
const randomId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const deviceLabel = (): string => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const os = /Android/i.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/i.test(ua)
    ? 'iOS'
    : /Windows/i.test(ua)
    ? 'Windows'
    : /Mac OS X/i.test(ua)
    ? 'macOS'
    : /Linux/i.test(ua)
    ? 'Linux'
    : 'Perangkat';
  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /OPR\//i.test(ua)
    ? 'Opera'
    : /Chrome\//i.test(ua)
    ? 'Chrome'
    : /Firefox\//i.test(ua)
    ? 'Firefox'
    : /Safari\//i.test(ua)
    ? 'Safari'
    : 'Browser';
  const mobile = /Mobile|Android|iPhone|iPad/i.test(ua) ? ' 📱' : ' 💻';
  return `${browser} · ${os}${mobile}`;
};

export const getDeviceId = (): string => {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = randomId('dev');
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return memoryDeviceId;
  }
};
let memoryDeviceId = randomId('dev');

/* ------------------------------------------------------------------ */
/*  Penyimpanan sesi                                                   */
/* ------------------------------------------------------------------ */
const readSessions = (): ActiveSession[] => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const list = raw ? (JSON.parse(raw) as ActiveSession[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

const writeSessions = (list: ActiveSession[]) => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
};

const isFresh = (s: ActiveSession) => Date.now() - s.lastSeen < SESSION_TTL_MS;

/** Daftar sesi yang masih aktif (yang sudah kedaluwarsa dibersihkan) */
export const listActiveSessions = (): ActiveSession[] => {
  const fresh = readSessions().filter(isFresh);
  writeSessions(fresh);
  return fresh;
};

export const activeSessionFor = (nis: string): ActiveSession | undefined => {
  const target = (nis || '').trim().toLowerCase();
  return listActiveSessions().find((s) => s.nis.toLowerCase() === target);
};

/* ------------------------------------------------------------------ */
/*  Aksi sesi                                                          */
/* ------------------------------------------------------------------ */
export interface StartSessionResult {
  ok: boolean;
  session?: ActiveSession;
  blockedBy?: ActiveSession;
  reason?: string;
}

/** Coba mulai sesi baru untuk NIS. Gagal bila sudah aktif di sesi lain. */
export const startSession = (nis: string, examId?: string | null): StartSessionResult => {
  const session: ActiveSession = {
    nis: nis.trim(),
    sessionId: randomId('ses'),
    deviceId: getDeviceId(),
    deviceLabel: deviceLabel(),
    startedAt: new Date().toISOString(),
    lastSeen: Date.now(),
    examId: examId ?? null,
  };

  const existing = activeSessionFor(nis);
  if (existing) {
    return {
      ok: false,
      blockedBy: existing,
      reason: `Akun ini sedang aktif di ${existing.deviceLabel}. Satu akun hanya boleh digunakan pada satu perangkat/tab.`,
    };
  }

  const list = listActiveSessions().filter((s) => s.sessionId !== session.sessionId);
  list.push(session);
  writeSessions(list);
  // Pencatatan sesi ke server ditangani apiService.remoteStartSession()
  // (memakai text/plain agar tidak memicu preflight CORS di Apps Script).
  return { ok: true, session };
};

/** Perbarui tanda hidup sesi. Mengembalikan false bila sesi sudah diambil alih. */
export const heartbeat = (sessionId: string): 'ok' | 'lost' => {
  const list = listActiveSessions();
  const own = list.find((s) => s.sessionId === sessionId);
  if (!own) return 'lost';
  own.lastSeen = Date.now();
  writeSessions(list);
  return 'ok';
};

export const setSessionExam = (sessionId: string, examId: string | null) => {
  const list = listActiveSessions();
  const own = list.find((s) => s.sessionId === sessionId);
  if (!own) return;
  own.examId = examId;
  own.lastSeen = Date.now();
  writeSessions(list);
};

export const endSession = (sessionId: string) => {
  writeSessions(listActiveSessions().filter((s) => s.sessionId !== sessionId));
};

/** Dipakai guru/proktor untuk melepas sesi siswa (mis. HP siswa mati) */
export const releaseSession = (nis: string) => {
  const target = nis.trim().toLowerCase();
  writeSessions(listActiveSessions().filter((s) => s.nis.toLowerCase() !== target));
};

export const releaseAllSessions = () => writeSessions([]);
