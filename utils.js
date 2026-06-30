// ============================== UTILITIES ==============================
const IDB_NAME = 'alkembic_handles', IDB_STORE = 'handles';

function defaultSettings() {
  return { theme: 'dark', font: 'Inter', tokenEnabled: true, tokenOffset: 0, autosave: true, accentColor: '#f0a500', tableLocked: false };
}

function blankWorkspace() {
  return {
    name: '', password: '', token: '',
    cards: [], events: [], importedData: [], dashDatasets: [],
    settings: defaultSettings(),
    consoleHistory: [], macros: {}, commandAliases: {}
  };
}

function slug(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_'); }

function escapeHTML(s) {
  return String(s || '').replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m));
}

function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer') || document.body;
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `margin-top:8px; background:${type === 'error' ? 'var(--rd)' : 'var(--am)'}; color:#000; padding:8px 16px; border-radius:8px; font-weight:600; box-shadow:0 2px 8px rgba(0,0,0,0.2); animation:slideInRight 0.3s ease-out; z-index:10002;`;
  container.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

async function showConfirm(msg) {
  return new Promise(resolve => {
    const d = document.createElement('div');
    d.className = 'modal-overlay';
    d.innerHTML = `<div class="modal-content"><p>${escapeHTML(msg)}</p><div style="display:flex;gap:8px;margin-top:12px;"><button class="btn" id="cfYes">Yes</button><button class="btn btn-ghost" id="cfNo">No</button></div></div>`;
    document.body.appendChild(d);
    d.querySelector('#cfYes').onclick = () => { d.remove(); resolve(true); };
    d.querySelector('#cfNo').onclick = () => { d.remove(); resolve(false); };
  });
}

function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// IndexedDB Helpers
function openIDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function idbPut(k, v) {
  const db = await openIDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(v, k);
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });
}

async function idbGet(k) {
  const db = await openIDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(k);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function writeJSON(fn, data) { localStorage.setItem(fn, JSON.stringify(data)); }
async function readJSON(fn) { const d = localStorage.getItem(fn); return d ? JSON.parse(d) : null; }

// Token helper
function getCurrentToken(offset = 0) {
  const now = new Date();
  const tokenTime = new Date(now.getTime() + offset * 60000);
  const hours = tokenTime.getHours() % 12 || 12;
  const mins = tokenTime.getMinutes();
  return `${String(hours).padStart(2, '0')}${String(mins).padStart(2, '0')}`;
}

// Global variables – will be populated by app.js
let workspace, trashItems, activityLog, currentUser, workspaceMode;
let timelineMonth, timelineYear, rangeStart;
let dashboardChart, dashChartInstances, autosaveInterval;
let editingCardId, viewingCardId, activeFilter, multiSelectMode, selectedCardIds;
let floatingConsole, tableLocked, currentMultiSheetData, currentSheetColumns;
let consoleCommandHistory = [], consoleHistoryIndex = -1, consoleAutocompleteIndex = -1, consoleAutocompleteResults = [], consoleClockInterval = null; 