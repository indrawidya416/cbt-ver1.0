/**
 * ============================================================================
 *  CBT SEKOLAH SUKMA — Backend Google Sheets (Apps Script Web App)
 *  MI Islamiyah & SMP Al Hidayah — LPI Kebonsari Malang
 *  Versi: 2.0  (2026-11-01) — perbaikan: sesi start/heartbeat/end, hapus data uji
 * ============================================================================
 *
 *  PASANG (≈5 menit):
 *   1. Buka Spreadsheet Anda → Extensions → Apps Script.
 *   2. HAPUS semua isi Code.gs, tempel SELURUH file ini.
 *   3. Ganti API_KEY di bawah (lihat catatan keamanan).
 *   4. Simpan (Ctrl+S) → jalankan fungsi `setupSheets` sekali (izinkan akses).
 *   5. Deploy → New deployment → Web app
 *        Execute as      : Me
 *        Who has access  : Anyone
 *      → Deploy → salin URL yang berakhiran /exec.
 *   6. Aplikasi → Pengaturan → URL Database/API + Kunci API → Tes Koneksi.
 *
 *  PENTING: setiap kali file ini diubah, WAJIB
 *  Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy.
 *
 *  ---------------------------------------------------------------------------
 *  ⚠️ API_KEY di bawah masih KUNCI UJI. Setelah pengujian selesai, ganti dengan
 *     kunci rahasia Anda sendiri, Deploy "New version", lalu perbarui juga
 *     Kunci API di menu Pengaturan aplikasi.
 *  ---------------------------------------------------------------------------
 */

const API_KEY = 'uji-cbt-sukma-1f4b7c';       // ← GANTI setelah uji coba selesai
const SPREADSHEET_ID = '';                     // kosong = spreadsheet tempat script dipasang
const SESSION_TTL_MS = 5 * 60 * 1000;          // sesi mati bila 5 menit tanpa heartbeat
const TZ = 'Asia/Jakarta';

/* ============================== SKEMA SHEET ============================== */

const SCHEMA = {
  Students: ['id', 'nis', 'name', 'school', 'className', 'gender', 'password', 'createdAt'],
  Results: [
    'resultId', 'examId', 'examTitle', 'nis', 'studentName', 'className', 'school',
    'status', 'autoScore', 'manualScore', 'maxScore', 'needsGrading', 'violationCount',
    'deviceId', 'deviceLabel', 'startedAt', 'submittedAt', 'updatedAt', 'answersJson',
  ],
  Sessions: ['nis', 'sessionId', 'deviceId', 'deviceLabel', 'startedAt', 'lastSeen', 'examId', 'status'],
  Exams: ['id', 'json', 'updatedAt'],
  Questions: ['id', 'json', 'updatedAt'],
  Packets: ['id', 'json', 'updatedAt'],
};

/* ================================ ENTRY ================================= */

function doGet(e) {
  try {
    const q = (e && e.parameter) || {};
    guard_(q.key);
    const action = String(q.action || 'ping').toLowerCase();

    if (action === 'ping') return json_(pingInfo_());
    if (action === 'getall') return json_({ ok: true, data: readAll_() });
    if (action === 'getallsessions') return json_({ ok: true, sessions: activeSessions_() });
    if (action === 'session') return json_(sessionAction_(q));
    if (action === 'deleteresult') return json_({ ok: true, deleted: deleteResults_(q.resultId, q.nis) });

    return json_({ ok: false, error: 'Aksi GET tidak dikenal: ' + action });
  } catch (err) {
    return json_({ ok: false, error: errMessage_(err) });
  }
}

function doPost(e) {
  try {
    const body = parseBody_(e);
    guard_(body.key);
    const action = String(body.action || '').toLowerCase();

    if (action === 'submitresult') return json_(submitResult_(body.result));
    if (action === 'submitresults') return json_(submitResults_(body.results || []));
    if (action === 'releasesession') return json_({ ok: true, released: releaseSession_(body.nis) });
    if (action === 'deleteresult') return json_({ ok: true, deleted: deleteResults_(body.resultId, body.nis) });
    if (action === 'pushall') return json_(pushAll_(body.data || {}));
    if (action === 'deletestudents') {
      return json_({ ok: true, deleted: deleteStudents_(body.nisList || body.nis || [], body.prefixes || []) });
    }
    if (action === 'session') {
      // `type` bisa berada di level atas body maupun di dalam objek session
      const payload = Object.assign({}, body.session || {}, body);
      if (!payload.type && body.session && body.session.type) payload.type = body.session.type;
      return json_(sessionAction_(payload));
    }

    return json_({ ok: false, error: 'Aksi POST tidak dikenal: ' + action });
  } catch (err) {
    return json_({ ok: false, error: errMessage_(err) });
  }
}

/* =============================== UTILITAS =============================== */

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function errMessage_(err) {
  return String(err && err.message ? err.message : err);
}

function guard_(key) {
  if (String(key || '') !== String(API_KEY)) throw new Error('Kunci API (key) tidak valid.');
}

/** Body JSON bisa datang sebagai text/plain (menghindari preflight CORS). */
function parseBody_(e) {
  if (!e) return {};
  const raw = e.postData && e.postData.contents;
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (err) {
      return e.parameter || {};
    }
  }
  return e.parameter || {};
}

function nowIso_() {
  return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function pingInfo_() {
  return { ok: true, time: nowIso_(), tz: TZ, version: '2.1', sheets: Object.keys(SCHEMA) };
}

function ss_() {
  return SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/* ============================ AKSES SHEET =============================== */

function sheet_(name) {
  const headers = SCHEMA[name];
  if (!headers) throw new Error('Sheet tidak dikenal: ' + name);

  const ss = ss_();
  let sh = ss.getSheetByName(name);

  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
    return sh;
  }

  const lastRow = sh.getLastRow();
  if (lastRow === 0) {
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    return sh;
  }

  const current = sh.getRange(1, 1, 1, headers.length).getValues()[0].map(String);
  if (current.join('|') !== headers.join('|')) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sh;
}

/** Ambil seluruh baris sheet sebagai array of object (header = baris 1). */
function readRows_(name) {
  const sh = sheet_(name);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map((h) => String(h).trim());
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row.some((c) => c !== '' && c !== null)) continue;
    const obj = { __row: i + 1 };
    headers.forEach((h, j) => {
      obj[h] = row[j];
    });
    rows.push(obj);
  }
  return rows;
}

/** Tambah baris baru, atau perbarui bila `keyField` sudah ada (upsert). */
function upsertRow_(name, keyField, obj) {
  const headers = SCHEMA[name];
  const sh = sheet_(name);
  const values = headers.map((h) => (obj[h] === undefined || obj[h] === null ? '' : obj[h]));
  const colIndex = headers.indexOf(keyField);

  const existing = readRows_(name).find((row) => String(row[keyField]) === String(obj[keyField]));
  if (existing) {
    sh.getRange(existing.__row, 1, 1, headers.length).setValues([values]);
    return 'updated';
  }
  sh.appendRow(values);
  return 'inserted';
}

function deleteRowsWhere_(name, predicate) {
  const sh = sheet_(name);
  const rows = readRows_(name).filter(predicate);
  for (let i = rows.length - 1; i >= 0; i--) sh.deleteRow(rows[i].__row);
  return rows.length;
}

/* ============================= DATA MASTER ============================== */

function readAll_() {
  const students = readRows_('Students').map((s) => ({
    id: String(s.id || ''),
    nis: String(s.nis || ''),
    name: String(s.name || ''),
    school: String(s.school || 'MI Islamiyah'),
    className: String(s.className || ''),
    gender: String(s.gender || 'L'),
    password: String(s.password || ''),
    createdAt: String(s.createdAt || ''),
  }));

  const results = readRows_('Results').map((r) => {
    let answers = {};
    try {
      answers = r.answersJson ? JSON.parse(r.answersJson) : {};
    } catch (err) {
      answers = {};
    }
    return {
      id: String(r.resultId || ''),
      examId: String(r.examId || ''),
      studentNis: String(r.nis || ''),
      studentName: String(r.studentName || ''),
      className: String(r.className || ''),
      school: String(r.school || ''),
      status: String(r.status || 'in_progress'),
      autoScore: Number(r.autoScore || 0),
      manualScore: Number(r.manualScore || 0),
      maxScore: Number(r.maxScore || 0),
      needsGrading: String(r.needsGrading) === 'true',
      violationCount: Number(r.violationCount || 0),
      deviceId: String(r.deviceId || ''),
      deviceLabel: String(r.deviceLabel || ''),
      startedAt: String(r.startedAt || ''),
      submittedAt: String(r.submittedAt || ''),
      answers: answers,
    };
  });

  const jsonSheet = (name) =>
    readRows_(name)
      .map((row) => {
        try {
          return JSON.parse(row.json);
        } catch (err) {
          return null;
        }
      })
      .filter(Boolean);

  return {
    students: students,
    results: results,
    exams: jsonSheet('Exams'),
    questions: jsonSheet('Questions'),
    packets: jsonSheet('Packets'),
  };
}

function pushAll_(data) {
  return withLock_(function () {
    const counts = { students: 0, results: 0, exams: 0, questions: 0, packets: 0 };

    (data.students || []).forEach(function (s) {
      upsertRow_('Students', 'nis', {
        id: s.id, nis: s.nis, name: s.name, school: s.school,
        className: s.className, gender: s.gender, password: s.password, createdAt: s.createdAt,
      });
      counts.students++;
    });

    [['exams', 'Exams'], ['questions', 'Questions'], ['packets', 'Packets']].forEach(function (pair) {
      (data[pair[0]] || []).forEach(function (item) {
        upsertRow_(pair[1], 'id', { id: item.id, json: JSON.stringify(item), updatedAt: nowIso_() });
        counts[pair[0]]++;
      });
    });

    (data.results || []).forEach(function (r) {
      writeResult_(r);
      counts.results++;
    });

    return { ok: true, counts: counts };
  });
}

/* ============================= HASIL UJIAN ============================== */

function resultRow_(r) {
  const src = r || {};
  return {
    resultId: src.id || src.resultId || '',
    examId: src.examId || '',
    examTitle: src.examTitle || '',
    nis: src.studentNis || src.nis || '',
    studentName: src.studentName || '',
    className: src.className || '',
    school: src.school || '',
    status: src.status || 'submitted',
    autoScore: Number(src.autoScore || 0),
    manualScore: Number(src.manualScore || 0),
    maxScore: Number(src.maxScore || 0),
    needsGrading: String(!!src.needsGrading),
    violationCount: Number(src.violationCount || 0),
    deviceId: src.deviceId || '',
    deviceLabel: src.deviceLabel || '',
    startedAt: src.startedAt || '',
    submittedAt: src.submittedAt || '',
    updatedAt: nowIso_(),
    answersJson: JSON.stringify(src.answers || {}),
  };
}

function writeResult_(result) {
  const row = resultRow_(result);
  if (!row.resultId) throw new Error('Data hasil tidak valid (resultId kosong).');
  if (row.answersJson.length > 45000) {
    saveOverflow_(row.resultId, row.answersJson);
    row.answersJson = row.answersJson.slice(0, 45000);
  }
  return upsertRow_('Results', 'resultId', row);
}

function saveOverflow_(resultId, json) {
  const ss = ss_();
  let sh = ss.getSheetByName('ResultsOverflow');
  if (!sh) {
    sh = ss.insertSheet('ResultsOverflow');
    sh.appendRow(['resultId', 'part', 'json']);
  }
  for (let i = 0, part = 1; i < json.length; i += 45000, part++) {
    sh.appendRow([resultId, part, json.slice(i, i + 45000)]);
  }
}

function submitResult_(result) {
  return withLock_(function () {
    const mode = writeResult_(result);
    return { ok: true, mode: mode, resultId: (result && (result.id || result.resultId)) || '', savedAt: nowIso_() };
  });
}

function submitResults_(results) {
  let saved = 0;
  const errors = [];
  results.forEach(function (r) {
    try {
      submitResult_(r);
      saved++;
    } catch (err) {
      errors.push(errMessage_(err));
    }
  });
  return { ok: errors.length === 0, saved: saved, errors: errors };
}

/** Hapus hasil berdasarkan resultId atau NIS (untuk bersih-bersih data uji). */
function deleteResults_(resultId, nis) {
  if (!resultId && !nis) throw new Error('Isi resultId atau nis yang akan dihapus.');
  return withLock_(function () {
    return deleteRowsWhere_('Results', function (row) {
      if (resultId && String(row.resultId) === String(resultId)) return true;
      if (!resultId && nis && String(row.nis) === String(nis)) return true;
      return false;
    });
  });
}

/* ====================== HAPUS SISWA (BERSIH-BERSIH) ===================== */

/**
 * Hapus baris Students berdasarkan daftar NIS dan/atau awalan NIS.
 * Contoh: { nisList: ['2530001'], prefixes: ['253'] }
 */
function deleteStudents_(nisList, prefixes) {
  var list = (nisList || []).map(function (n) { return String(n).trim(); });
  var pre = (prefixes || []).map(function (n) { return String(n).trim(); });
  return deleteRowsWhere_('Students', function (row) {
    var nis = String(row.nis || '').trim();
    if (!nis) return false;
    if (list.indexOf(nis) >= 0) return true;
    return pre.some(function (p) { return p && nis.indexOf(p) === 0; });
  });
}

/** Alat editor: hapus 40 siswa contoh (NIS berawalan 253) */
function hapusSiswaContoh() {
  var n = deleteStudents_([], ['253']);
  Logger.log('Dihapus ' + n + ' baris siswa contoh (NIS 253…).');
  return n;
}

/* ================================= SESI ================================= */

function readSessions_() {
  return readRows_('Sessions').map(function (s) {
    return {
      nis: String(s.nis || ''),
      sessionId: String(s.sessionId || ''),
      deviceId: String(s.deviceId || ''),
      deviceLabel: String(s.deviceLabel || ''),
      startedAt: String(s.startedAt || ''),
      lastSeen: Number(s.lastSeen || 0),
      examId: s.examId ? String(s.examId) : '',
      status: String(s.status || 'active'),
    };
  });
}

function activeSessions_() {
  const now = Date.now();
  return readSessions_().filter(function (s) {
    return s.status === 'active' && now - s.lastSeen < SESSION_TTL_MS;
  });
}

/** type: check | start | heartbeat | end | release */
function sessionAction_(payload) {
  const data = payload || {};
  const type = String(data.type || 'check').toLowerCase();
  const session = data.session || data;
  const nis = String(data.nis || session.nis || '').trim();
  if (!nis) throw new Error('NIS wajib diisi.');

  /* --- cek: apakah NIS ini sedang aktif di perangkat LAIN? --- */
  if (type === 'check') {
    const deviceId = String(data.deviceId || '');
    const rows = activeSessions_().filter(function (s) {
      return s.nis.toLowerCase() === nis.toLowerCase();
    });
    const other = rows.filter(function (s) {
      return s.deviceId !== deviceId;
    })[0];
    if (other) return { ok: true, blocked: true, blockedBy: other };
    return { ok: true, blocked: false, active: rows[0] || null };
  }

  /* --- mulai sesi baru --- */
  if (type === 'start') {
    return withLock_(function () {
      const conflict = activeSessions_().filter(function (s) {
        return s.nis.toLowerCase() === nis.toLowerCase() && s.sessionId !== session.sessionId;
      }).filter(function (s) {
        return s.deviceId !== session.deviceId;
      })[0];

      if (conflict) return { ok: false, blocked: true, blockedBy: conflict };

      upsertRow_('Sessions', 'sessionId', {
        nis: session.nis,
        sessionId: session.sessionId,
        deviceId: session.deviceId,
        deviceLabel: session.deviceLabel,
        startedAt: session.startedAt || nowIso_(),
        lastSeen: Date.now(),
        examId: session.examId || '',
        status: 'active',
      });
      return { ok: true, started: true, sessionId: session.sessionId };
    });
  }

  /* --- tanda hidup --- */
  if (type === 'heartbeat') {
    return withLock_(function () {
      const row = readSessions_().filter(function (s) {
        return s.sessionId === String(session.sessionId);
      })[0];

      if (!row) return { ok: false, released: true, reason: 'Sesi tidak ditemukan di server.' };
      if (row.status !== 'active') return { ok: false, released: true, reason: 'Sesi sudah diakhiri.' };

      upsertRow_('Sessions', 'sessionId', {
        nis: row.nis,
        sessionId: row.sessionId,
        deviceId: row.deviceId,
        deviceLabel: row.deviceLabel,
        startedAt: row.startedAt,
        lastSeen: Date.now(),
        examId: row.examId,
        status: 'active',
      });
      return { ok: true, active: true };
    });
  }

  /* --- logout siswa --- */
  if (type === 'end') {
    return withLock_(function () {
      const row = readSessions_().filter(function (s) {
        return s.sessionId === String(session.sessionId);
      })[0];
      if (!row) return { ok: true, ended: false };
      upsertRow_('Sessions', 'sessionId', {
        nis: row.nis,
        sessionId: row.sessionId,
        deviceId: row.deviceId,
        deviceLabel: row.deviceLabel,
        startedAt: row.startedAt,
        lastSeen: Date.now(),
        examId: row.examId,
        status: 'ended',
      });
      return { ok: true, ended: true };
    });
  }

  /* --- guru melepas sesi siswa --- */
  if (type === 'release') return { ok: true, released: releaseSession_(nis) };

  throw new Error('Tipe sesi tidak dikenal: ' + type);
}

function releaseSession_(nis) {
  if (!nis) throw new Error('NIS wajib diisi.');
  return withLock_(function () {
    let n = 0;
    readSessions_().forEach(function (row) {
      if (String(row.nis).toLowerCase() === String(nis).toLowerCase() && row.status === 'active') {
        upsertRow_('Sessions', 'sessionId', {
          nis: row.nis,
          sessionId: row.sessionId,
          deviceId: row.deviceId,
          deviceLabel: row.deviceLabel,
          startedAt: row.startedAt,
          lastSeen: 0,
          examId: row.examId,
          status: 'released',
        });
        n++;
      }
    });
    return n;
  });
}

/* ============================ ALAT BANTU =============================== */

/** Jalankan sekali dari editor: siapkan semua sheet. */
function setupSheets() {
  Object.keys(SCHEMA).forEach(function (name) {
    sheet_(name);
  });
  return 'Sheet siap: ' + Object.keys(SCHEMA).join(', ');
}

/** Tes cepat dari editor Apps Script (tanpa deploy). */
function testPing() {
  Logger.log(doGet({ parameter: { key: API_KEY, action: 'ping' } }).getContent());
}

/** Uji alur sesi lengkap di editor: start → check perangkat lain → release. */
function testSesi() {
  const nis = 'UJI-SESI-EDITOR';
  const deviceId = 'editor-device';
  const sid = 'editor-session-1';
  const now = nowIso_();

  Logger.log('start      : ' + doPost({ postData: { contents: JSON.stringify({
    key: API_KEY, action: 'session', type: 'start',
    session: { nis: nis, sessionId: sid, deviceId: deviceId, deviceLabel: 'Editor', startedAt: now },
  }) } }).getContent());

  Logger.log('check lain : ' + doGet({ parameter: {
    key: API_KEY, action: 'session', type: 'check', nis: nis, deviceId: 'device-lain',
  } }).getContent());

  Logger.log('release    : ' + doPost({ postData: { contents: JSON.stringify({
    key: API_KEY, action: 'releaseSession', nis: nis,
  }) } }).getContent());

  Logger.log('check ulang: ' + doGet({ parameter: {
    key: API_KEY, action: 'session', type: 'check', nis: nis, deviceId: 'device-lain',
  } }).getContent());

  Logger.log('bersihkan  : ' + deleteRowsWhere_('Sessions', function (row) {
    return String(row.nis) === nis;
  }) + ' baris sesi uji dihapus');
}

/** Hapus semua baris uji coba (NIS yang mengandung 'UJI' atau data contoh TEST). */
function bersihkanDataUji() {
  const r = deleteRowsWhere_('Results', function (row) {
    const nis = String(row.nis || '');
    const id = String(row.resultId || '');
    return /^UJI/i.test(nis) || /^TEST/i.test(id) || /^UJI/i.test(id) || nis === '9999999';
  });
  const s = deleteRowsWhere_('Sessions', function (row) {
    return /^UJI/i.test(String(row.nis || '')) || String(row.nis || '') === '9999999';
  });
  Logger.log('Dihapus: ' + r + ' baris Results, ' + s + ' baris Sessions');
  return { results: r, sessions: s };
}
