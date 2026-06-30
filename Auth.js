// ============================== AUTH, BOOTSTRAP & PERSISTENCE ==============================
// This file was missing from the original build. It provides:
//  - the first-run / login-by-name setup screen (renderSetupScreen)
//  - workspace creation, unlock (password check), and storage in IndexedDB
//  - saveAllData() / autosave, which every other file calls but never existed
//  - applySettings() (theme/font/accent application)
//  - importWorkspaceFile() referenced by the hidden <input> in index.html

const IDB_INDEX_KEY = '__workspace_index__';

// ---------- index of known workspace names (so we can list them on the login screen) ----------
async function getWorkspaceIndex() {
  try { return (await idbGet(IDB_INDEX_KEY)) || []; }
  catch { return []; }
}
async function addToWorkspaceIndex(name) {
  const idx = await getWorkspaceIndex();
  if (!idx.includes(name)) { idx.push(name); await idbPut(IDB_INDEX_KEY, idx); }
}

// ---------- setup / login screen ----------
async function renderSetupScreen() {
  const el = document.getElementById('setupContent');
  if (!el) return;
  const names = await getWorkspaceIndex();

  el.innerHTML = `
    <div style="text-align:center;margin-bottom:20px;">
      <div style="font-family:'Syne',sans-serif;font-size:1.6rem;font-weight:800;color:var(--am);">⚗ Alkembic Ace</div>
      <div style="color:var(--mu);font-size:0.8rem;margin-top:4px;">Offline-first leadership &amp; knowledge board</div>
    </div>
    <div id="setupTabs" style="display:flex;gap:8px;margin-bottom:16px;">
      <button class="btn btn-sm" id="tabLoginBtn" onclick="setupSwitchTab('login')">Sign In</button>
      <button class="btn btn-sm btn-ghost" id="tabSignupBtn" onclick="setupSwitchTab('signup')">New Workspace</button>
    </div>

    <div id="setupLoginPane">
      ${names.length ? `
        <label style="font-size:0.74rem;color:var(--mu);">Choose your workspace</label>
        <select id="loginNameSelect" class="form-input" style="margin-bottom:10px;" onchange="setupOnNameSelect()">
          <option value="">— select —</option>
          ${names.map(n => `<option value="${escapeHTML(n)}">${escapeHTML(n)}</option>`).join('')}
        </select>
      ` : `<div style="color:var(--mu);font-size:0.82rem;margin-bottom:10px;">No workspace found yet on this device. Create one in the "New Workspace" tab.</div>`}
      <div id="loginPasswordWrap" class="hidden">
        <label style="font-size:0.74rem;color:var(--mu);">Password</label>
        <input type="password" id="loginPasswordInput" class="form-input" placeholder="Enter password" style="margin-bottom:10px;" onkeydown="if(event.key==='Enter')attemptLogin()">
      </div>
      <button class="btn" style="width:100%;" onclick="attemptLogin()">🔓 Enter Workspace</button>
      <div id="loginError" style="color:var(--rd);font-size:0.78rem;margin-top:8px;"></div>
    </div>

    <div id="setupSignupPane" class="hidden">
      <label style="font-size:0.74rem;color:var(--mu);">Your name / workspace name</label>
      <input type="text" id="signupNameInput" class="form-input" placeholder="e.g. Priya" style="margin-bottom:10px;">
      <label style="font-size:0.74rem;color:var(--mu);">Password (optional, min 6 chars)</label>
      <input type="password" id="signupPasswordInput" class="form-input" placeholder="Leave blank for no password" style="margin-bottom:10px;">
      <button class="btn" style="width:100%;" onclick="attemptSignup()">✨ Create Workspace</button>
      <div id="signupError" style="color:var(--rd);font-size:0.78rem;margin-top:8px;"></div>
    </div>
  `;
}

function setupSwitchTab(tab) {
  document.getElementById('setupLoginPane').classList.toggle('hidden', tab !== 'login');
  document.getElementById('setupSignupPane').classList.toggle('hidden', tab !== 'signup');
  document.getElementById('tabLoginBtn').className = tab === 'login' ? 'btn btn-sm' : 'btn btn-sm btn-ghost';
  document.getElementById('tabSignupBtn').className = tab === 'signup' ? 'btn btn-sm' : 'btn btn-sm btn-ghost';
}

async function setupOnNameSelect() {
  const name = document.getElementById('loginNameSelect').value;
  const wrap = document.getElementById('loginPasswordWrap');
  if (!name) { wrap.classList.add('hidden'); return; }
  const rec = await idbGet('ws_' + name);
  if (rec && rec.password) wrap.classList.remove('hidden');
  else wrap.classList.add('hidden');
}

async function attemptLogin() {
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  const select = document.getElementById('loginNameSelect');
  const name = select ? select.value : '';
  if (!name) { errEl.textContent = 'Select a workspace first.'; return; }
  const rec = await idbGet('ws_' + name);
  if (!rec) { errEl.textContent = 'Workspace not found on this device.'; return; }
  if (rec.password) {
    const pwd = document.getElementById('loginPasswordInput').value;
    if (pwd !== rec.password) { errEl.textContent = 'Incorrect password.'; return; }
  }
  await enterWorkspace(rec);
}

async function attemptSignup() {
  const errEl = document.getElementById('signupError');
  errEl.textContent = '';
  const name = document.getElementById('signupNameInput').value.trim();
  const pwd = document.getElementById('signupPasswordInput').value;
  if (!name) { errEl.textContent = 'Please enter a name.'; return; }
  if (pwd && pwd.length < 6) { errEl.textContent = 'Password must be at least 6 characters (or leave blank).'; return; }
  const existing = await idbGet('ws_' + name);
  if (existing) { errEl.textContent = 'That name is already taken on this device. Use Sign In instead.'; return; }

  const fresh = blankWorkspace();
  fresh.name = name;
  fresh.password = pwd || '';
  fresh.token = getCurrentToken(0);

  await idbPut('ws_' + name, fresh);
  await addToWorkspaceIndex(name);
  await enterWorkspace(fresh);
}

// ---------- enter the app once a workspace record is resolved ----------
async function enterWorkspace(rec) {
  workspace = Object.assign(blankWorkspace(), rec);
  workspace.settings = Object.assign(defaultSettings(), rec.settings || {});
  trashItems = rec._trashItems || [];
  activityLog = rec._activityLog || [];
  currentUser = workspace.name;
  workspaceMode = 'browser';

  tableLocked = !!workspace.settings.tableLocked;
  editingCardId = null;
  viewingCardId = null;
  activeFilter = 'all';
  multiSelectMode = false;
  selectedCardIds = new Set();
  dashChartInstances = Array.isArray(dashChartInstances) ? dashChartInstances : [];
  currentMultiSheetData = null;
  currentSheetColumns = null;

  const now = new Date();
  timelineMonth = now.getMonth();
  timelineYear = now.getFullYear();
  rangeStart = null;

  document.getElementById('setupScreen').style.display = 'none';
  document.getElementById('appContainer').style.display = 'flex';
  document.getElementById('userNameDisplay').textContent = workspace.name;

  applySettings();
  if (typeof renderAllViews === 'function') renderAllViews();
  switchView('dashboard');
  startFooterClock();
  if (workspace.settings.autosave) startAutosave();

  logActivity('session', `${workspace.name} signed in`);
  showToast(`Welcome back, ${workspace.name}`);
}

// ---------- persistence ----------
async function saveAllData() {
  if (!workspace || !workspace.name) return;
  workspace.consoleHistory = (typeof consoleCommandHistory !== 'undefined') ? consoleCommandHistory.slice(-200) : workspace.consoleHistory;
  const record = Object.assign({}, workspace, {
    _trashItems: trashItems,
    _activityLog: activityLog
  });
  try {
    await idbPut('ws_' + workspace.name, record);
    flashAutosaveIndicator();
  } catch (e) {
    console.error('saveAllData failed', e);
    showToast('Save failed — see console', 'error');
  }
}

function flashAutosaveIndicator() {
  const ind = document.getElementById('autosaveIndicator');
  if (!ind) return;
  ind.style.opacity = '1';
  clearTimeout(flashAutosaveIndicator._t);
  flashAutosaveIndicator._t = setTimeout(() => { ind.style.opacity = '0.55'; }, 600);
}

function startAutosave() {
  stopAutosave();
  autosaveInterval = setInterval(() => { saveAllData(); }, 30000);
}
function stopAutosave() {
  if (autosaveInterval) { clearInterval(autosaveInterval); autosaveInterval = null; }
}

// ---------- settings application ----------
function applySettings() {
  if (!workspace || !workspace.settings) return;
  const s = workspace.settings;
  document.documentElement.setAttribute('data-theme', s.theme || 'dark');
  document.documentElement.style.setProperty('--am', s.accentColor || '#f0a500');
  document.body.style.fontFamily = `'${s.font || 'Inter'}', sans-serif`;
  tableLocked = !!s.tableLocked;
}

// ---------- import a full workspace backup JSON (hooked from index.html's hidden input) ----------
function importWorkspaceFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.workspace || !data.workspace.name) throw new Error('Invalid backup file');
      await idbPut('ws_' + data.workspace.name, Object.assign({}, data.workspace, {
        _trashItems: data.trashItems || [],
        _activityLog: data.activityLog || []
      }));
      await addToWorkspaceIndex(data.workspace.name);
      showToast(`Imported workspace "${data.workspace.name}". Select it under Sign In.`);
      renderSetupScreen();
    } catch (err) {
      showToast('Import failed: invalid file', 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ---------- expose globally ----------
window.renderSetupScreen = renderSetupScreen;
window.setupSwitchTab = setupSwitchTab;
window.setupOnNameSelect = setupOnNameSelect;
window.attemptLogin = attemptLogin;
window.attemptSignup = attemptSignup;
window.saveAllData = saveAllData;
window.startAutosave = startAutosave;
window.stopAutosave = stopAutosave;
window.applySettings = applySettings;
window.importWorkspaceFile = importWorkspaceFile;