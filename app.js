// ============================== ALKEMBIC ACE v2.1 – APP LOGIC (FULL) ==============================
// This file contains all core functions: Dashboard, Kanban, Timeline, Analytics, Trash, Card View, etc.

// ----- Global State (already declared in utils.js, but we ensure it's accessible) -----
// workspace, trashItems, activityLog, currentUser, workspaceMode, etc. are already defined in utils.js.
// The following functions assume those globals exist.

// ==================== HELPER FUNCTIONS (already in utils.js – but here for completeness) ====================
function updateFooterStats() {
  const cards = workspace.cards;
  document.getElementById('fCards').innerText = cards.length;
  document.getElementById('fDone').innerText = cards.filter(c => c.column === 'done').length;
  document.getElementById('fImports').innerText = workspace.importedData.length;
  document.getElementById('statCards').innerText = cards.length;
  document.getElementById('statDone').innerText = cards.filter(c => c.column === 'done').length;
  document.getElementById('statTrash').innerText = trashItems.length;
  document.getElementById('statImports').innerText = workspace.importedData.length;
}

function logActivity(type, msg) {
  activityLog.unshift({ type, msg, time: new Date().toISOString() });
  if (activityLog.length > 100) activityLog.pop();
  saveAllData();
  renderActivityFeed();
}

// ==================== DASHBOARD & DATA TABLE ====================
function renderDashboard() {
  updateFooterStats();
  renderImportedTable();
  renderActivityFeed();
  if (dashboardChart) dashboardChart.destroy();
  const ctx = document.getElementById('overviewChart')?.getContext('2d');
  if (!ctx) return;
  const data = workspace.importedData.length ? workspace.importedData : [
    { label: 'TODO', value: workspace.cards.filter(c => c.column === 'todo').length },
    { label: 'IN PROGRESS', value: workspace.cards.filter(c => c.column === 'in-progress').length },
    { label: 'DONE', value: workspace.cards.filter(c => c.column === 'done').length }
  ];
  dashboardChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: data.map(d => d.label), datasets: [{ data: data.map(d => d.value), backgroundColor: '#f0a500', borderRadius: 6 }] },
    options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#7a8fa8' } }, y: { ticks: { color: '#7a8fa8' } } } }
  });
}

function renderImportedTable() {
  const tbody = document.querySelector('#importedTable tbody');
  if (!tbody) return;
  tbody.innerHTML = workspace.importedData.map((item, i) => `
    <tr>
      <td ${!tableLocked ? 'contenteditable="true"' : ''} onblur="updateImported(${i},'label',this.innerText)">${escapeHTML(item.label)}</td>
      <td ${!tableLocked ? 'contenteditable="true"' : ''} onblur="updateImported(${i},'value',this.innerText)">${item.value}</td>
    </tr>`).join('') || '<tr><td colspan="2">No data</td></tr>';
  const lockBtn = document.getElementById('toggleTableLockBtn');
  if (lockBtn) lockBtn.innerText = tableLocked ? '🔓 Unlock Edits' : '🔒 Lock Edits';
}

function toggleTableLock() { tableLocked = !tableLocked; workspace.settings.tableLocked = tableLocked; renderImportedTable(); saveAllData(); }
function updateImported(idx, field, val) { if (tableLocked) return; if (field === 'value') workspace.importedData[idx].value = parseFloat(val) || 0; else workspace.importedData[idx].label = val; saveAllData(); renderDashboard(); }
function saveEditableTable() { saveAllData(); showToast('Table saved'); }
function refreshImportedTable() { renderImportedTable(); }
function exportImportedDataCSV() {
  let csv = 'Label,Value\n' + workspace.importedData.map(d => `"${d.label}",${d.value}`).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'imported-data.csv';
  a.click();
}

function handleFileImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    let data = [];
    if (file.name.match(/\.xlsx?$/i)) {
      const wb = XLSX.read(ev.target.result, { type: 'binary' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(sheet, { header: 1 }).slice(1).filter(r => r.length).map(r => ({ label: r[0]?.toString() || '', value: parseFloat(r[1]) || 0 }));
    } else {
      const lines = ev.target.result.split('\n');
      data = lines.map(l => { const p = l.split(/[,\t]/); return { label: p[0]?.trim() || '', value: parseFloat(p[1]) || 0 }; }).filter(d => d.label);
    }
    workspace.importedData = data;
    saveAllData();
    renderDashboard();
    showToast(`Imported ${data.length} rows`);
  };
  if (file.name.match(/\.xlsx?$/i)) reader.readAsBinaryString(file);
  else reader.readAsText(file);
  e.target.value = '';
}

function renderActivityFeed() {
  const feed = document.getElementById('activityFeed');
  if (!feed) return;
  if (!activityLog.length) { feed.innerHTML = '<div style="color:var(--mu); text-align:center;">No activity yet</div>'; return; }
  feed.innerHTML = activityLog.slice(0, 20).map(a => `
    <div style="border-bottom:1px solid var(--bd); padding:6px 0; display:flex; justify-content:space-between;">
      <span><small>${new Date(a.time).toLocaleString()}</small> — ${escapeHTML(a.msg)}</span>
      <button class="btn btn-sm btn-ghost" onclick="recoverSpecificActivity('${a.time}')" style="padding:2px 6px;">↩</button>
    </div>`).join('');
}
function recoverSpecificActivity(timestamp) {
  const entry = activityLog.find(a => a.time === timestamp);
  if (!entry) return;
  showToast(`Last action: ${entry.msg}`, 'info');
}
function recoverLastActivity() { if (activityLog.length) showToast(`Last action: ${activityLog[0].msg}`, 'info'); }
function clearActivityLog() { if (confirm('Clear all activity log?')) { activityLog = []; renderActivityFeed(); saveAllData(); showToast('Activity cleared'); } }
function exportActivityLog() {
  const blob = new Blob([JSON.stringify(activityLog, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'activity-log.json';
  a.click();
}
function exportTilesTable() { exportWorkspaceCSV(); }

// ==================== KANBAN BOARD ====================
function renderKanban() {
  const search = document.getElementById('kanbanSearch')?.value.toLowerCase() || '';
  const sortBy = document.getElementById('sortBy')?.value || 'priority';
  const columns = ['todo', 'in-progress', 'done'];
  const board = document.getElementById('kanbanBoard');
  if (!board) return;
  board.innerHTML = columns.map(col => {
    let cards = workspace.cards.filter(c => c.column === col);
    if (activeFilter !== 'all') cards = cards.filter(c => c.priority === activeFilter);
    if (search) cards = cards.filter(c => c.subject.toLowerCase().includes(search) || (c.description || '').toLowerCase().includes(search));
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    if (sortBy === 'priority') cards.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    else if (sortBy === 'date') cards.sort((a, b) => (a.endDate || '').localeCompare(b.endDate || ''));
    else if (sortBy === 'alpha') cards.sort((a, b) => a.subject.localeCompare(b.subject));
    return `<div class="kanban-col" data-col="${col}" ondragover="event.preventDefault();" ondrop="dropCard(event,'${col}')">
      <div class="col-header"><span class="col-title"><div class="col-dot"></div> ${col.toUpperCase()}</span><span class="col-count">${cards.length}</span></div>
      ${cards.length === 0 ? `<div class="drop-zone-empty" onclick="openCreateCardInColumn('${col}')">+ Drop or click</div>` : ''}
      ${cards.map(card => `
        <div class="kanban-card ${multiSelectMode ? 'multi-select-active' : ''}" draggable="true" data-priority="${card.priority}" ondragstart="dragCard(event,${card.id})" ondblclick="openCardView(${card.id})">
          ${multiSelectMode ? `<input type="checkbox" class="card-checkbox" ${selectedCardIds.has(card.id) ? 'checked' : ''} onclick="event.stopPropagation();toggleCardSelection(${card.id})">` : ''}
          <div style="font-weight:700; margin-bottom:4px;">${escapeHTML(card.subject)}</div>
          <div style="font-size:0.7rem;">${card.endDate ? `📅 ${card.endDate}` : ''}</div>
          <div style="margin-top:6px;"><span style="font-size:0.65rem; background:var(--card); padding:2px 6px; border-radius:10px;">${card.priority}</span></div>
          <div style="margin-top:8px; display:flex; gap:4px;">
            <button class="card-action-btn" onclick="event.stopPropagation();openEditCard(${card.id})" ${workspace.settings.viewOnly ? 'disabled' : ''}>✏️</button>
            <button class="card-action-btn" onclick="event.stopPropagation();cloneCard(${card.id})" ${workspace.settings.viewOnly ? 'disabled' : ''}>📋</button>
            <button class="card-action-btn" onclick="event.stopPropagation();deleteCard(${card.id})" ${workspace.settings.viewOnly ? 'disabled' : ''}>🗑</button>
          </div>
        </div>`).join('')}
    </div>`;
  }).join('');
  updateBulkPanel();
}
function dragCard(e, id) { e.dataTransfer.setData('text/plain', id); }
function dropCard(e, newCol) {
  const id = parseInt(e.dataTransfer.getData('text/plain'));
  const card = workspace.cards.find(c => c.id === id);
  if (card) { card.column = newCol; saveAllData(); renderKanban(); logActivity('move', `Moved "${card.subject}" to ${newCol}`); }
}
function openCreateCardInColumn(col) { openCreateCard(); setTimeout(() => document.getElementById('cardStatus').value = col, 60); }
function openCreateCard() {
  editingCardId = null;
  resetCardForm();
  document.getElementById('cardModalTitle').innerText = 'New Card';
  document.getElementById('cardSaveBtn').innerText = 'Create';
  document.getElementById('createCardModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('cardSubject').focus(), 60);
}
function closeCreateCard() { document.getElementById('createCardModal').classList.add('hidden'); }
function resetCardForm() {
  document.getElementById('cardSubject').value = '';
  document.getElementById('cardDesc').value = '';
  document.getElementById('cardPeople').value = '';
  document.getElementById('cardLabels').value = '';
  document.getElementById('cardPoints').value = 3;
  document.getElementById('cardProgress').value = 0;
  document.getElementById('cardStart').value = '';
  document.getElementById('cardEnd').value = '';
  document.getElementById('cardStatus').value = 'todo';
  document.getElementById('cardPriority').value = 'medium';
}
function openEditCard(id) {
  const card = workspace.cards.find(c => c.id === id);
  if (!card) return;
  editingCardId = id;
  document.getElementById('cardSubject').value = card.subject;
  document.getElementById('cardDesc').value = card.description || '';
  document.getElementById('cardPeople').value = (card.people || []).map(p => `${p.name} ${p.role}`).join(', ');
  document.getElementById('cardLabels').value = (card.labels || []).join(', ');
  document.getElementById('cardPoints').value = card.storyPoints || 3;
  document.getElementById('cardProgress').value = card.progress || 0;
  document.getElementById('cardStart').value = card.startDate || '';
  document.getElementById('cardEnd').value = card.endDate || '';
  document.getElementById('cardStatus').value = card.column;
  document.getElementById('cardPriority').value = card.priority;
  document.getElementById('cardModalTitle').innerText = 'Edit Card';
  document.getElementById('createCardModal').classList.remove('hidden');
}
function saveKanbanCard() {
  const subject = document.getElementById('cardSubject').value.trim();
  if (!subject) { showToast('Subject required', 'error'); return; }
  const desc = document.getElementById('cardDesc').value;
  const peopleRaw = document.getElementById('cardPeople').value;
  const labelsRaw = document.getElementById('cardLabels').value;
  const storyPoints = parseInt(document.getElementById('cardPoints').value) || 3;
  const progress = parseInt(document.getElementById('cardProgress').value) || 0;
  const start = document.getElementById('cardStart').value;
  const end = document.getElementById('cardEnd').value;
  const status = document.getElementById('cardStatus').value;
  const priority = document.getElementById('cardPriority').value;
  const people = peopleRaw.split(',').map(p => p.trim()).filter(Boolean).map(p => {
    const parts = p.split(/\s+/);
    return parts.length >= 2 ? { name: parts[0], role: parts.slice(1).join(' ') } : { name: parts[0], role: 'Member' };
  });
  const labels = labelsRaw.split(',').map(l => l.trim()).filter(Boolean);
  if (editingCardId) {
    const card = workspace.cards.find(c => c.id === editingCardId);
    if (card) {
      Object.assign(card, { subject, description: desc, people, labels, storyPoints, progress, startDate: start, endDate: end, column: status, priority });
      logActivity('card', `Edited "${subject}"`);
      showToast('Card updated');
    }
  } else {
    workspace.cards.push({ id: Date.now() + Math.floor(Math.random() * 1000), subject, description: desc, people, labels, storyPoints, progress, startDate: start, endDate: end, column: status, priority, comments: [] });
    logActivity('card', `Created "${subject}"`);
    showToast('Card created');
  }
  closeCreateCard();
  renderKanban();
  saveAllData();
}
function cloneCard(id) {
  const card = workspace.cards.find(c => c.id === id);
  if (!card) return;
  const copy = JSON.parse(JSON.stringify(card));
  copy.id = Date.now() + Math.floor(Math.random() * 1000);
  copy.subject = card.subject + ' (Copy)';
  copy.comments = [];
  workspace.cards.push(copy);
  logActivity('card', `Cloned "${card.subject}"`);
  showToast('Card cloned');
  renderKanban();
  saveAllData();
}
async function deleteCard(id) {
  const card = workspace.cards.find(c => c.id === id);
  if (!card) return;
  if (await showConfirm(`Move "${card.subject}" to trash?`)) {
    trashItems.push({ type: 'card', content: card, deletedAt: new Date().toISOString() });
    workspace.cards = workspace.cards.filter(c => c.id !== id);
    renderKanban();
    renderTrash();
    saveAllData();
    logActivity('delete', `Deleted "${card.subject}"`);
  }
}
function setFilter(el) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  activeFilter = el.dataset.filter;
  renderKanban();
}
function toggleMultiSelect() { multiSelectMode = !multiSelectMode; if (!multiSelectMode) selectedCardIds.clear(); renderKanban(); document.getElementById('multiSelectToggle')?.setAttribute('data-mode', multiSelectMode ? 'on' : 'off'); }
function toggleCardSelection(id) { if (selectedCardIds.has(id)) selectedCardIds.delete(id); else selectedCardIds.add(id); renderKanban(); }
function updateBulkPanel() {
  const panel = document.getElementById('bulkMovePanel');
  if (multiSelectMode && selectedCardIds.size > 0) { panel.classList.remove('hidden'); panel.querySelector('.selected-count').innerText = `${selectedCardIds.size} selected`; }
  else { panel.classList.add('hidden'); }
}
function bulkMoveCards() {
  const target = document.getElementById('bulkMoveTarget').value;
  workspace.cards.forEach(c => { if (selectedCardIds.has(c.id)) c.column = target; });
  selectedCardIds.clear();
  renderKanban();
  saveAllData();
  showToast('Cards moved');
}
function exportSelectedJSON() {
  const selected = workspace.cards.filter(c => selectedCardIds.has(c.id));
  const blob = new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'selected-cards.json';
  a.click();
}
function exportSelectedICS() {
  const selected = workspace.cards.filter(c => selectedCardIds.has(c.id) && c.startDate && c.endDate);
  if (!selected.length) { showToast('No cards with dates selected', 'error'); return; }
  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\n';
  selected.forEach(c => {
    const start = c.startDate.replace(/-/g, '');
    const endDate = new Date(c.endDate);
    endDate.setDate(endDate.getDate() + 1);
    const end = endDate.toISOString().slice(0, 10).replace(/-/g, '');
    ics += `BEGIN:VEVENT\r\nSUMMARY:${c.subject}\r\nDTSTART;VALUE=DATE:${start}\r\nDTEND;VALUE=DATE:${end}\r\nEND:VEVENT\r\n`;
  });
  ics += 'END:VCALENDAR';
  const blob = new Blob([ics], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'selected-cards.ics';
  a.click();
}
async function bulkDeleteSelected() {
  if (await showConfirm(`Delete ${selectedCardIds.size} cards permanently?`)) {
    workspace.cards = workspace.cards.filter(c => !selectedCardIds.has(c.id));
    selectedCardIds.clear();
    renderKanban();
    saveAllData();
    showToast('Deleted');
  }
}
function quickMoveCard(id) {
  const card = workspace.cards.find(c => c.id === id);
  if (!card) return;
  const next = { todo: 'in-progress', 'in-progress': 'done', done: 'todo' };
  card.column = next[card.column];
  logActivity('move', `Moved "${card.subject}" → ${card.column}`);
  renderKanban();
  updateFooterStats();
  saveAllData();
}

// ==================== CARD VIEW & COMMENTS ====================
function openCardView(id) {
  const card = workspace.cards.find(c => c.id === id);
  if (!card) return;
  viewingCardId = id;
  document.getElementById('viewCardTitle').innerText = card.subject;
  document.getElementById('viewCardContent').innerHTML = `
    <div><strong>Priority:</strong> ${card.priority}</div>
    <div><strong>Status:</strong> ${card.column}</div>
    <div><strong>Dates:</strong> ${card.startDate || '-'} → ${card.endDate || '-'}</div>
    <div><strong>Progress:</strong> ${card.progress || 0}%</div>
    <div><strong>Labels:</strong> ${(card.labels || []).join(', ')}</div>
    <div><strong>People:</strong> ${(card.people || []).map(p => `${p.name} (${p.role})`).join(', ')}</div>
    <p>${escapeHTML(card.description || '')}</p>`;
  renderComments(id);
  document.getElementById('viewCardModal').classList.remove('hidden');
  document.getElementById('viewEditBtn').onclick = () => { closeViewCard(); openEditCard(id); };
  document.getElementById('viewCloneBtn').onclick = () => { cloneCard(id); closeViewCard(); };
  document.getElementById('viewDeleteBtn').onclick = () => { closeViewCard(); deleteCard(id); };
}
function closeViewCard() { document.getElementById('viewCardModal').classList.add('hidden'); viewingCardId = null; }
function addComment() {
  if (!viewingCardId) return;
  const text = document.getElementById('commentInput').value.trim();
  if (!text) return;
  const card = workspace.cards.find(c => c.id === viewingCardId);
  if (!card) return;
  if (!card.comments) card.comments = [];
  card.comments.push({ text, time: new Date().toISOString(), author: currentUser });
  saveAllData();
  renderComments(viewingCardId);
  document.getElementById('commentInput').value = '';
  showToast('Comment added');
}
function renderComments(cardId) {
  const card = workspace.cards.find(c => c.id === cardId);
  const comments = card.comments || [];
  document.getElementById('commentsList').innerHTML = comments.map(c => `
    <div class="comment-item"><div class="comment-author">${escapeHTML(c.author || 'User')}</div><div>${escapeHTML(c.text)}</div><div class="comment-time">${new Date(c.time).toLocaleString()}</div></div>
  `).join('') || '<div>No comments</div>';
}

// ==================== TIMELINE & GANTT ====================
function renderTimeline() {
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  document.getElementById('timelineMonth').innerText = `${monthNames[timelineMonth]} ${timelineYear}`;
  const filter = document.getElementById('timelineFilter')?.value.toLowerCase() || '';
  const firstDay = new Date(timelineYear, timelineMonth, 1).getDay();
  const daysInMonth = new Date(timelineYear, timelineMonth + 1, 0).getDate();
  const today = new Date().toISOString().slice(0,10);
  let html = '';
  ['SUN','MON','TUE','WED','THU','FRI','SAT'].forEach(d => html += `<div class="cal-header">${d}</div>`);
  for (let i=0; i<firstDay; i++) html += '<div class="cal-day empty"></div>';
  for (let d=1; d<=daysInMonth; d++) {
    const dateStr = `${timelineYear}-${String(timelineMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    let dayCards = workspace.cards.filter(c => c.startDate && c.endDate && dateStr >= c.startDate && dateStr <= c.endDate);
    if (filter) dayCards = dayCards.filter(c => c.subject.toLowerCase().includes(filter));
    let cls = 'cal-day';
    if (dateStr === today) cls += ' today';
    if (rangeStart === dateStr) cls += ' range-start';
    const ribbonColor = (p) => p === 'critical' ? 'var(--rd)' : p === 'high' ? 'var(--or)' : p === 'medium' ? 'var(--am)' : 'var(--gr)';
    html += `<div class="${cls}" onclick="handleDayClick('${dateStr}')">
      <div class="day-num">${d}</div>
      ${dayCards.slice(0,3).map(c => `<div class="day-ribbon" style="background:${ribbonColor(c.priority)}" title="${c.subject}"></div>`).join('')}
      ${dayCards.length > 3 ? `<div class="day-ribbon-label">+${dayCards.length-3}</div>` : ''}
    </div>`;
  }
  document.getElementById('timelineCalendar').innerHTML = html;
  renderGantt();
}
function renderGantt() {
  const ganttDiv = document.getElementById('ganttView');
  const filter = document.getElementById('timelineFilter')?.value.toLowerCase() || '';
  let cards = workspace.cards.filter(c => c.startDate && c.endDate && (!filter || c.subject.toLowerCase().includes(filter)));
  if (!cards.length) { ganttDiv.innerHTML = '<div>No cards with dates</div>'; return; }
  const daysInMonth = new Date(timelineYear, timelineMonth+1, 0).getDate();
  const mStart = new Date(timelineYear, timelineMonth, 1);
  let html = '<div style="display:grid; grid-template-columns:150px 1fr; gap:8px;">';
  cards.forEach(card => {
    const cStart = new Date(Math.max(new Date(card.startDate), mStart));
    const cEnd = new Date(Math.min(new Date(card.endDate), new Date(timelineYear, timelineMonth, daysInMonth)));
    const startDay = Math.floor((cStart - mStart) / 86400000);
    const duration = Math.floor((cEnd - cStart) / 86400000) + 1;
    const leftPct = (startDay / daysInMonth) * 100;
    const widthPct = Math.max((duration / daysInMonth) * 100, 2);
    const color = card.priority === 'critical' ? 'var(--rd)' : card.priority === 'high' ? 'var(--or)' : card.priority === 'medium' ? 'var(--am)' : 'var(--gr)';
    html += `<div style="font-size:0.78rem;">${escapeHTML(card.subject)}</div>
             <div style="background:var(--bd); border-radius:4px; position:relative; height:24px;">
               <div class="gantt-bar" style="position:absolute; left:${leftPct}%; width:${widthPct}%; background:${color}; height:100%; border-radius:4px; cursor:pointer;" onclick="openCardView(${card.id})" title="${card.startDate} → ${card.endDate}"></div>
             </div>`;
  });
  html += '</div>';
  ganttDiv.innerHTML = html;
}
function changeTimelineMonth(delta) { timelineMonth += delta; if (timelineMonth < 0) { timelineMonth = 11; timelineYear--; } else if (timelineMonth > 11) { timelineMonth = 0; timelineYear++; } renderTimeline(); }
function clearDateRange() { rangeStart = null; document.getElementById('rangeHint').classList.add('hidden'); renderTimeline(); }
function handleDayClick(dateStr) {
  if (!rangeStart) {
    rangeStart = dateStr;
    document.getElementById('rangeHint').classList.remove('hidden');
    document.getElementById('rangeHint').innerHTML = `📍 Range start: ${dateStr} — click end date to create card`;
    renderTimeline();
  } else {
    const start = rangeStart < dateStr ? rangeStart : dateStr;
    const end = rangeStart < dateStr ? dateStr : rangeStart;
    openCreateCardWithDates(start, end);
    clearDateRange();
  }
}
function openCreateCardWithDates(s, e) { openCreateCard(); setTimeout(() => { document.getElementById('cardStart').value = s; document.getElementById('cardEnd').value = e; }, 100); }
function exportICS() {
  const cards = workspace.cards.filter(c => c.startDate && c.endDate);
  if (!cards.length) { showToast('No cards with dates', 'error'); return; }
  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\n';
  cards.forEach(c => {
    const start = c.startDate.replace(/-/g, '');
    const endDate = new Date(c.endDate);
    endDate.setDate(endDate.getDate() + 1);
    const end = endDate.toISOString().slice(0,10).replace(/-/g,'');
    ics += `BEGIN:VEVENT\r\nSUMMARY:${c.subject}\r\nDTSTART;VALUE=DATE:${start}\r\nDTEND;VALUE=DATE:${end}\r\nEND:VEVENT\r\n`;
  });
  ics += 'END:VCALENDAR';
  const blob = new Blob([ics], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `alkembic-${timelineYear}-${String(timelineMonth+1).padStart(2,'0')}.ics`;
  a.click();
  showToast('ICS exported');
}

// ==================== ANALYTICS (Multi‑column Charts) ====================
function renderAnalytics() {
  const container = document.getElementById('dashChartsContainer');
  if (!container) return;
  container.innerHTML = '';
  dashChartInstances.forEach(ch => ch.destroy());
  dashChartInstances = [];
  if (!workspace.dashDatasets.length) { container.innerHTML = '<div class="section-card">Import Excel/CSV to create charts</div>'; return; }
  workspace.dashDatasets.forEach((ds, idx) => {
    const div = document.createElement('div');
    div.className = 'section-card';
    div.innerHTML = `<div style="display:flex; justify-content:space-between;"><h4>${escapeHTML(ds.name)}</h4><button class="btn btn-sm btn-danger" onclick="deleteDashDataset(${idx})">🗑</button></div><canvas id="chart_${idx}" height="150"></canvas>`;
    container.appendChild(div);
    const ctx = document.getElementById(`chart_${idx}`).getContext('2d');
    const chart = new Chart(ctx, { type: ds.type || 'bar', data: { labels: ds.data.map(d => d.label), datasets: [{ data: ds.data.map(d => d.value), backgroundColor: '#f0a500' }] } });
    dashChartInstances.push(chart);
  });
}
function handleDashImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const wb = XLSX.read(ev.target.result, { type: 'binary' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (rows.length < 2) return;
    const headers = rows[0];
    const dataRows = rows.slice(1).filter(r => r.some(c => c));
    currentSheetColumns = headers;
    currentMultiSheetData = { headers, dataRows, fileName: file.name };
    const selectX = document.getElementById('xAxisColumn');
    const selectY = document.getElementById('yAxisColumns');
    selectX.innerHTML = '<option value="">Select X-axis</option>';
    selectY.innerHTML = '<option value="">Select Y-axis (multiple)</option>';
    headers.forEach((h,i) => {
      selectX.innerHTML += `<option value="${i}">${h}</option>`;
      selectY.innerHTML += `<option value="${i}">${h}</option>`;
    });
    showToast('Sheet loaded. Choose columns and click Generate Chart');
  };
  if (file.name.match(/\.xlsx?$/i)) reader.readAsBinaryString(file);
  else reader.readAsText(file);
}
function applyChartConfig() {
  if (!currentMultiSheetData) return;
  const xIdx = document.getElementById('xAxisColumn').value;
  const yIdxs = [...document.getElementById('yAxisColumns').selectedOptions].map(o => o.value).filter(v => v !== '');
  if (xIdx === '' || yIdxs.length === 0) { showToast('Select X and at least one Y column', 'error'); return; }
  const labels = currentMultiSheetData.dataRows.map(row => row[xIdx] || '');
  const chartData = labels.map((l,i) => ({ label: l, value: parseFloat(currentMultiSheetData.dataRows[i][yIdxs[0]]) || 0 }));
  const newDs = { name: currentMultiSheetData.fileName, type: document.getElementById('chartType').value, data: chartData };
  workspace.dashDatasets.push(newDs);
  saveAllData();
  renderAnalytics();
  showToast('Chart added');
}
function deleteDashDataset(idx) { workspace.dashDatasets.splice(idx,1); saveAllData(); renderAnalytics(); }
function resetAnalytics() { workspace.dashDatasets = []; saveAllData(); renderAnalytics(); }
function applyChartTypeToLast() { if (workspace.dashDatasets.length) { workspace.dashDatasets[workspace.dashDatasets.length-1].type = document.getElementById('chartType').value; renderAnalytics(); saveAllData(); } }

// ==================== TRASH ====================
function renderTrash() {
  const container = document.getElementById('trashContent');
  if (!container) return;
  if (!trashItems.length) { container.innerHTML = '<div class="section-card">Trash is empty</div>'; return; }
  container.innerHTML = `<tr><thead><tr><th>Type</th><th>Content</th><th>Deleted</th><th></th></tr></thead><tbody>${trashItems.map((item,i) => `
    <tr><td>${item.type}</td><td>${item.type === 'card' ? escapeHTML(item.content.subject) : 'Event'}</td><td>${new Date(item.deletedAt).toLocaleString()}</td>
    <td><button class="btn btn-sm btn-outline" onclick="restoreTrashItem(${i})">Restore</button> <button class="btn btn-sm btn-danger" onclick="permanentDelete(${i})">Perm Delete</button></td>
    </tr>`).join('')}</tbody></table>`;
}
function restoreTrashItem(idx) {
  const item = trashItems[idx];
  if (item.type === 'card') workspace.cards.push(item.content);
  trashItems.splice(idx,1);
  saveAllData();
  renderKanban();
  renderTrash();
  showToast('Restored');
}
async function permanentDelete(idx) {
  if (await showConfirm('Permanently delete this item?')) {
    trashItems.splice(idx,1);
    saveAllData();
    renderTrash();
  }
}
async function emptyTrash() {
  if (await showConfirm('Empty all trash?')) {
    trashItems = [];
    saveAllData();
    renderTrash();
  }
}
async function restoreAllTrash() {
  if (await showConfirm('Restore all items?')) {
    trashItems.forEach(item => { if (item.type === 'card') workspace.cards.push(item.content); });
    trashItems = [];
    saveAllData();
    renderKanban();
    renderTrash();
    showToast('All restored');
  }
}

// ==================== MISCELLANEOUS ====================
function startFooterClock() {
  setInterval(() => {
    const d = new Date();
    document.getElementById('footerClock').innerText = d.toLocaleTimeString();
  }, 1000);
}
function showShortcuts() { document.getElementById('shortcutsModal').classList.remove('hidden'); }

// Expose essential functions globally
window.switchView = switchView;
window.openCreateCard = openCreateCard;
window.saveKanbanCard = saveKanbanCard;
window.openSettings = openSettings;
window.toggleTheme = toggleTheme;
window.logout = logout;
window.renderDashboard = renderDashboard;
window.renderKanban = renderKanban;
window.renderTimeline = renderTimeline;
window.renderAnalytics = renderAnalytics;
window.renderTrash = renderTrash;
window.exportAllCardsJSON = exportAllCardsJSON;
window.exportWorkspace = exportWorkspace;
window.exportWorkspaceCSV = exportWorkspaceCSV;
window.toggleSidebar = toggleSidebar;
window.closeModal = closeModal;
window.toggleTableLock = toggleTableLock;
window.updateImported = updateImported;
window.saveEditableTable = saveEditableTable;
window.handleFileImport = handleFileImport;
window.handleDashImport = handleDashImport;
window.exportImportedDataCSV = exportImportedDataCSV;
window.applyChartTypeToLast = applyChartTypeToLast;
window.exportActivityLog = exportActivityLog;
window.clearActivityLog = clearActivityLog;
window.recoverLastActivity = recoverLastActivity;
window.setFilter = setFilter;
window.changeTimelineMonth = changeTimelineMonth;
window.clearDateRange = clearDateRange;
window.exportICS = exportICS;
window.emptyTrash = emptyTrash;
window.restoreAllTrash = restoreAllTrash;
window.openCardView = openCardView;
window.closeViewCard = closeViewCard;
window.addComment = addComment;
window.cloneCard = cloneCard;
window.deleteCard = deleteCard;
window.openEditCard = openEditCard;
window.quickMoveCard = quickMoveCard;
window.toggleMultiSelect = toggleMultiSelect;
window.bulkMoveCards = bulkMoveCards;
window.exportSelectedJSON = exportSelectedJSON;
window.exportSelectedICS = exportSelectedICS;
window.bulkDeleteSelected = bulkDeleteSelected;
window.showShortcuts = showShortcuts;
