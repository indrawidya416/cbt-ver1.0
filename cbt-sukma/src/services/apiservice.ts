/**
 * Layanan koneksi ke backend Google Sheets (Apps Script Web App).
 *
 * Prinsip: aplikasi tetap JALAN OFFLINE. Semua data disimpan lokal lebih dulu,
 * baru dikirim ke server bila URL + kunci API diisi pada menu Pengaturan.
 *
 * - GET  dipakai untuk menarik data (`action=getAll`), cek sesi, dan ping.
 * - POST dipakai untuk mengirim hasil ujian & sesi.
 *   Body dikirim sebagai `text/plain` agar browser TIDAK melakukan preflight
 *   OPTIONS (Apps Script tidak mendukung preflight → request akan gagal).
 */
import storage, { getApiUrl } from './storageService';
import type { ExamResult, Settings } from '../types';

const PENDING_KEY = 'sukma_pending_results';
const TIMEOUT_MS = 15000;

/* ------------------------- penyimpanan kecil aman ------------------------ */
const memoryStore: Record<string, string> = {};
const store = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memoryStore[key] ?? null;
    }
  },
  set(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      memoryStore[key] = value;
    }
  },
};

/* ------------------------------ konfigurasi ----------------------------- */
export const getApiKey = (): string => (storage.getSettings() as Settings).apiKey || '';
export const apiConfigured = (): boolean => !!getApiUrl().trim();

const endpoint = (): string => {
  const url = getApiUrl().trim();
  if (!url) throw new Error('URL database/API belum diatur pada menu Pengaturan.');
  return url;
};

const withKey = (params: Record<string, string>): string => {
  const q = new URLSearchParams(params);
  const key = getApiKey().trim();
  if (key) q.set('key', key);
  return q.toString();
};

const request = async (init: RequestInit & { url: string }) => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(init.url, {
      method: init.method,
      headers: init.headers,
      body: init.body,
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.ok === false && data.error) throw new Error(String(data.error));
    return data;
  } finally {
    window.clearTimeout(timer);
  }
};

export const apiGet = (params: Record<string, string>) => {
  const url = endpoint();
  const sep = url.includes('?') ? '&' : '?';
  return request({ url: `${url}${sep}${withKey(params)}`, method: 'GET' });
};

export const apiPost = (payload: Record<string, unknown>) => {
  const url = endpoint();
  return request({
    url,
    method: 'POST',
    // WAJIB text/plain → tanpa preflight CORS
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...payload, key: getApiKey().trim() }),
  });
};

/* --------------------------------- ping -------------------------------- */
export const pingServer = async (): Promise<{ ok: boolean; message: string }> => {
  try {
    const data = await apiGet({ action: 'ping' });
    return { ok: true, message: `Terhubung · server ${data.time || ''}`.trim() };
  } catch (e) {
    return { ok: false, message: `Gagal terhubung: ${(e as Error).message}` };
  }
};

/* ---------------------------- hasil ujian ------------------------------ */
type PendingItem = { result: ExamResult; queuedAt: string };

const readPending = (): PendingItem[] => {
  const raw = store.get(PENDING_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingItem[]) : [];
  } catch {
    return [];
  }
};

const writePending = (items: PendingItem[]) => store.set(PENDING_KEY, JSON.stringify(items));

export const pendingResultCount = (): number => readPending().length;

const queueResult = (result: ExamResult) => {
  const items = readPending().filter((x) => x.result.id !== result.id);
  items.push({ result, queuedAt: new Date().toISOString() });
  writePending(items);
};

/** Kirim satu hasil ujian ke server. Melempar error bila gagal. */
export const pushResult = async (result: ExamResult) => {
  const exam = storage.exams.getById(result.examId);
  const payload = {
    action: 'submitResult',
    result: { ...result, examTitle: exam?.title || '' },
  };
  return apiPost(payload);
};

/**
 * Kirim hasil ujian setelah dikumpulkan.
 * Bila server belum diatur / gagal, hasil dimasukkan ke antrean untuk
 * dikirim ulang otomatis nanti (data lokal tidak pernah hilang).
 */
export const sendResultToServer = async (resultId: string): Promise<'sent' | 'queued' | 'skipped'> => {
  if (!apiConfigured()) return 'skipped';
  const result = storage.results.getById(resultId);
  if (!result) return 'skipped';
  try {
    await pushResult(result);
    writePending(readPending().filter((x) => x.result.id !== resultId));
    return 'sent';
  } catch {
    queueResult(result);
    return 'queued';
  }
};

/** Coba kirim ulang semua hasil yang masih mengantre. */
export const flushPendingResults = async (): Promise<{ sent: number; failed: number }> => {
  if (!apiConfigured()) return { sent: 0, failed: 0 };
  const items = readPending();
  if (!items.length) return { sent: 0, failed: 0 };
  let sent = 0;
  let failed = 0;
  const rest: PendingItem[] = [];
  for (const item of items) {
    try {
      await pushResult(item.result);
      sent += 1;
    } catch {
      failed += 1;
      rest.push(item);
    }
  }
  writePending(rest);
  return { sent, failed };
};

/* -------------------------------- sesi --------------------------------- */
export interface RemoteSessionInfo {
  nis: string;
  sessionId: string;
  deviceId: string;
  deviceLabel: string;
  startedAt?: string;
  lastSeen?: number;
  examId?: string | null;
  status?: string;
}

export const remoteCheckSession = async (
  nis: string,
  deviceId: string,
): Promise<{ blocked: boolean; blockedBy?: RemoteSessionInfo }> => {
  if (!apiConfigured()) return { blocked: false };
  try {
    const data = await apiGet({ action: 'session', type: 'check', nis, deviceId });
    return { blocked: !!data.blocked, blockedBy: data.blockedBy };
  } catch {
    // server tidak terjangkau → biarkan proteksi lokal yang bekerja
    return { blocked: false };
  }
};

export const remoteStartSession = async (session: RemoteSessionInfo) => {
  if (!apiConfigured()) return;
  try {
    await apiPost({ action: 'session', type: 'start', session });
  } catch {
    /* offline → abaikan */
  }
};

/** Mengembalikan true bila server menyatakan sesi sudah dilepas guru. */
export const remoteHeartbeat = async (session: RemoteSessionInfo): Promise<{ released: boolean }> => {
  if (!apiConfigured()) return { released: false };
  try {
    const data = await apiPost({ action: 'session', type: 'heartbeat', session });
    return { released: !!data.released };
  } catch {
    return { released: false };
  }
};

export const remoteEndSession = async (session: RemoteSessionInfo) => {
  if (!apiConfigured()) return;
  try {
    await apiPost({ action: 'session', type: 'end', session });
  } catch {
    /* abaikan */
  }
};

export const remoteListSessions = async (): Promise<RemoteSessionInfo[]> => {
  if (!apiConfigured()) return [];
  try {
    const data = await apiGet({ action: 'getAllSessions' });
    return Array.isArray(data.sessions) ? (data.sessions as RemoteSessionInfo[]) : [];
  } catch {
    return [];
  }
};

export const remoteReleaseSession = async (nis: string) => {
  if (!apiConfigured()) return false;
  try {
    await apiPost({ action: 'releaseSession', nis });
    return true;
  } catch {
    return false;
  }
};
