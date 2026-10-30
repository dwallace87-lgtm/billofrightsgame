const SPREADSHEET_ID = '1twLy2YkNRSSEW3TS3baUusN1pF-WXcUqXfEUcNqYuUk';
const ALLOWED_DOMAINS = ['northsidechs.org', 'students.northsidechs.org'];
const GAME_SOURCE_BASE = 'https://raw.githubusercontent.com/dwallace87-lgtm/billofrightsgame/main/chunks/game.part.';
const GAME_PART_COUNT = 40;
const PROGRESS_SHEET = 'Student Progress';
const ATTEMPT_SHEET = 'Attempt Log';
const STATE_SHEET = 'State Store';
const STATE_CHUNK_SIZE = 40000;
const STATE_CHUNK_COUNT = 10;

function doGet() {
  try {
    const user = requireSchoolUser_();
    const html = fetchGameSource_();
    return HtmlService.createHtmlOutput(html)
      .setTitle('The Rights Protocol — Mr. Wallace’s U.S. History')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (error) {
    return HtmlService.createHtmlOutput(
      '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<body style="font:16px system-ui;background:#070a18;color:#e6ecff;padding:48px;max-width:760px;margin:auto">' +
      '<h1 style="color:#38e8ff">The Rights Protocol</h1><p>' + escapeHtml_(error.message) +
      '</p><p>Sign in with your Northside school Google account, then reload this page.</p></body>'
    ).setTitle('The Rights Protocol');
  }
}

function fetchGameSource_() {
  const requests = [];
  for (let i = 0; i < GAME_PART_COUNT; i++) {
    requests.push({
      url: GAME_SOURCE_BASE + String(i).padStart(3, '0'),
      followRedirects: true,
      muteHttpExceptions: true,
    });
  }
  const responses = UrlFetchApp.fetchAll(requests);
  const html = responses.map((response, i) => {
    if (response.getResponseCode() !== 200) throw new Error('Game source part ' + i + ' is unavailable.');
    return response.getContentText();
  }).join('');
  return html;
}

function loadStudentProgress() {
  const user = requireSchoolUser_();
  const sheet = getSheet_(STATE_SHEET);
  const row = findEmailRow_(sheet, user.email, 2);
  let stateJson = '';
  if (row) {
    stateJson = sheet.getRange(row, 3, 1, STATE_CHUNK_COUNT).getDisplayValues()[0].join('');
  }
  return { email: user.email, name: displayName_(user.email, stateJson), stateJson: stateJson };
}

function saveStudentProgress(stateJson, clientTime) {
  const user = requireSchoolUser_();
  if (typeof stateJson !== 'string' || !stateJson || stateJson.length > STATE_CHUNK_SIZE * STATE_CHUNK_COUNT) {
    throw new Error('Progress data is missing or too large.');
  }
  const state = JSON.parse(stateJson);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const now = new Date();
    const name = String(state.name || displayName_(user.email, '')).slice(0, 120);
    const stateSheet = getSheet_(STATE_SHEET);
    const stateRow = findEmailRow_(stateSheet, user.email, 2) || Math.max(2, stateSheet.getLastRow() + 1);
    const chunks = [];
    for (let i = 0; i < STATE_CHUNK_COUNT; i++) {
      chunks.push(stateJson.slice(i * STATE_CHUNK_SIZE, (i + 1) * STATE_CHUNK_SIZE));
    }
    stateSheet.getRange(stateRow, 1, 1, 2 + STATE_CHUNK_COUNT).setValues([[user.email, now].concat(chunks)]);

    const stats = state.stats || {};
    const incorrect = Object.keys(stats).reduce((sum, key) => sum + Number((stats[key] || {}).t || 0), 0);
    const hints = Object.keys(stats).reduce((sum, key) => sum + Number((stats[key] || {}).h || 0), 0);
    const files = Array.isArray(state.files) ? state.files.length : 0;
    const completedSteps = state.steps ? Object.keys(state.steps).filter(key => state.steps[key]).length : 0;
    const progress = state.done ? 1 : Math.min(0.99, files / 10);
    const progressSheet = getSheet_(PROGRESS_SHEET);
    const progressRow = findEmailRow_(progressSheet, user.email, 3) || Math.max(3, progressSheet.getLastRow() + 1);
    progressSheet.getRange(progressRow, 1, 1, 12).setValues([[
      user.email,
      name,
      now,
      state.started ? new Date(Number(state.started)) : '',
      state.doneAt ? new Date(Number(state.doneAt)) : '',
      String(state.loc || 'hq'),
      files,
      completedSteps,
      incorrect,
      hints,
      progress,
      String(clientTime || ''),
    ]]);
    const reviewSteps = Object.keys(stats).filter(key => Number((stats[key] || {}).t || 0) >= 3 || Number((stats[key] || {}).r || 0) > 0);
    const resets = Object.keys(stats).reduce((sum, key) => sum + Number((stats[key] || {}).r || 0), 0);
    const arcade = state.miniGames || {};
    const arcadeStatus = [1, 2, 4].map(n => 'A' + n + ': ' + (arcade[n] && arcade[n].completed ? 'complete' : arcade[n] && arcade[n].lastPlayed ? 'in progress' : 'not started')).join(' | ');
    const reviewHeaders = ['Review Needed', 'Case Resets', 'Review Steps', 'Arcade Status'];
    const currentHeaders = progressSheet.getRange(2, 1, 1, Math.max(16, progressSheet.getLastColumn())).getDisplayValues()[0];
    const reviewColumns = reviewHeaders.map(header => {
      let col = currentHeaders.findIndex(value => value === header) + 1;
      if (!col) {
        col = currentHeaders.findIndex((value, i) => i >= 12 && !value) + 1 || currentHeaders.length + 1;
        currentHeaders[col - 1] = header;
        progressSheet.getRange(2, col).setValue(header);
      }
      return col;
    });
    [reviewSteps.length ? 'REVIEW NEEDED' : '', resets, reviewSteps.join('; '), arcadeStatus].forEach((value, i) => progressSheet.getRange(progressRow, reviewColumns[i]).setValue(value));
    SpreadsheetApp.flush();
    return { ok: true, savedAt: now.toISOString() };
  } finally {
    lock.releaseLock();
  }
}

function recordAttempts(events) {
  const user = requireSchoolUser_();
  if (!Array.isArray(events) || events.length > 50) throw new Error('Invalid attempt batch.');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet_(ATTEMPT_SHEET);
    const lastRow = sheet.getLastRow();
    const start = Math.max(3, lastRow - 999);
    const existing = new Set(lastRow >= start ? sheet.getRange(start, 1, lastRow - start + 1, 1).getDisplayValues().flat() : []);
    const rows = [];
    events.forEach(event => {
      if (!event || !event.eventId || existing.has(String(event.eventId))) return;
      existing.add(String(event.eventId));
      rows.push([
        String(event.eventId).slice(0, 100),
        new Date(),
        user.email,
        String(event.studentName || displayName_(user.email, '')).slice(0, 120),
        String(event.sessionId || '').slice(0, 120),
        String(event.mission || '').slice(0, 160),
        String(event.puzzle || '').slice(0, 240),
        Number(event.step || 0),
        String(event.questionType || '').slice(0, 80),
        String(event.response || '').slice(0, 5000),
        Boolean(event.correct),
        String(event.feedback || '').slice(0, 5000),
        Number(event.missesBefore || 0),
        Number(event.hintsSeen || 0),
        String(event.clientTime || '').slice(0, 80),
      ]);
    });
    if (rows.length) sheet.getRange(Math.max(3, sheet.getLastRow() + 1), 1, rows.length, 15).setValues(rows);
    SpreadsheetApp.flush();
    return { ok: true, accepted: rows.length };
  } finally {
    lock.releaseLock();
  }
}

function requireSchoolUser_() {
  const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const domain = email.split('@')[1] || '';
  if (!ALLOWED_DOMAINS.includes(domain)) {
    throw new Error('Sign in with your Northside staff or student Google account.');
  }
  return { email: email };
}

function getSheet_(name) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
  if (!sheet) throw new Error('Missing sheet: ' + name);
  return sheet;
}

function findEmailRow_(sheet, email, firstDataRow) {
  const lastRow = sheet.getLastRow();
  if (lastRow < firstDataRow) return 0;
  const found = sheet.getRange(firstDataRow, 1, lastRow - firstDataRow + 1, 1)
    .createTextFinder(email).matchEntireCell(true).findNext();
  return found ? found.getRow() : 0;
}

function displayName_(email, stateJson) {
  if (stateJson) {
    try {
      const value = String((JSON.parse(stateJson) || {}).name || '').trim();
      if (value) return value;
    } catch (error) {}
  }
  return email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function escapeHtml_(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
