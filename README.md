# Alkembic
Alkembic PlugnPlay smart is utility tool exclusive for Smart Scrum Master who led their teams and automate mundane tasks

Web : http://suryasticsai.github.io/Alkembic1/

Alkembic Ace Edition 
Version : 2.1
Standard Release : April 2026
OVERVIEW
--------
Alkembic Ace is an offline‑first leadership and knowledge
management tool designed primarily for Scrum Masters,
Agile Leaders, and Delivery Managers.

It enables structured thinking, people‑aware tracking,
and zero‑cloud personal data control through a Kanban-
centric experience enriched with dashboards, timelines,
and exports.

This version (Ace v2.1) builds on Ace v0.5.3 by fixing the
broken first-run experience — sign-up/login, data persistence,
and board rendering now work end-to-end — without changing
any of the existing UX or feature set.

------------------------------------------------------------

WHAT'S NEW IN ACE v2.1
-----------------------

🛠️ STABILITY FIXES (Critical)
• Sign-Up / Login now actually works (New file: auth.js)
  - The first-run "Login by name" screen referenced since v0.2
    was never implemented in code — the app loaded to a blank
    screen with no way to create or open a workspace
  - auth.js adds the full setup screen: name + optional password,
    multi-workspace support (multiple people can use the same
    browser, each with their own saved board), and a proper
    "wrong password" / "workspace not found" error flow
  - Workspaces are stored per-name in IndexedDB, so your data
    survives closing the tab, refreshing, and logging out/in
• Data saving now actually works (saveAllData)
  - Every card, comment, trash action, and setting change called
    a save function that didn't exist in the shipped build, so
    nothing ever persisted between sessions
  - Now wired to IndexedDB with autosave every 30s plus an
    on-screen "AUTO" indicator that flashes on each save
• Kanban board no longer crashes on load
  - A missing bulk-actions panel in the HTML caused every board
    render to throw silently, so cards never appeared
  - Added the missing panel + a "☑ Select" toggle button, so
    multi-select, bulk move, bulk export, and bulk delete are
    now reachable from the UI for the first time
• Fixed broken table markup in two places
  - The "Imported Data (editable)" table and the Trash table were
    both built with invalid HTML (`<td><td>` / `<td><thead>`
    instead of `<tr>`/`<table>`), which silently failed to render
    in most browsers
• Fixed a duplicate variable declaration in console.js
  - console.js redeclared globals already defined in utils.js,
    which is a hard syntax error and could prevent the Super
    Console script from parsing at all depending on browser/engine
• Settings (theme, accent color, font, autosave toggle, password
  change) are now actually applied to the page instead of being
  silently no-ops
• Verified via full end-to-end automated testing (real DOM +
  IndexedDB, not manual spot-checks): sign-up, login with correct/
  incorrect password, card create/edit/delete, delete→trash→restore,
  table edits, theme toggling, all five views, and Super Console
  command execution all run with zero runtime errors

------------------------------------------------------------

WHAT'S NEW IN ACE v0.5.3
-----------------------

🆕 ACE FEATURES (Additive)
• Login by name (New)
  - Stores your username and creates new account if new user
• Brightness Slider (New)
  - Fine‑grained brightness control layered over themes
  - Non‑intrusive CSS filter approach
  - Persists user preference in localStorage
  - Does NOT modify existing theme logic

• Glassmorphism Footer Tile (New)
  - Floating glass‑effect footer
  - Golden mono typography (JetBrains Mono)
  - Branding + documentation link
  - Dark‑mode friendly with backdrop blur

• Identity Branding Updates
  - "Alkembic Ace" product naming
  - Version badge clarity across login, topbar, footer

Alkembic Version 0.3
👥 People Involved Field
In the create/edit modal:
Type a person's name → select one or more roles using the role chips → click + Add Person
Roles available with emoji: 💻 Developer, 🧪 QA/Test, 🎯 Product Owner, 🔄 Scrum Master, 🎨 Designer, 🏗 Architect, ⚙️ DevOps, 📊 Business Analyst, 🤝 Stakeholder, 📋 Manager
A person can hold multiple roles simultaneously (Robert tagged to both Dev + PO, for example)
Reorder people by dragging the ⠿ handle, or using ↑ ↓ arrows — this sets the priority chain (1 → 2 → 3)
On the Kanban Card
Compact chain: avatar initials with role emoji → arrow → next person
Multi-role persons show +N badge
Truncates at 3 and shows +N more
In the Detail Modal — Tree Diagram
Full visual chain: circular avatar with numbered priority badge (1, 2, 3...), name below, role tags with emoji and color
Colored connector arrows between each person
Multi-role persons get a "Multi-role" badge
Hides the section entirely if no people are added
Cards are draggable between all 4 columns. People list inside the form is also drag-reorderable.

Version :0.2
First Run
Name setup screen — enter your name once, it's saved and shown as a badge in the top bar on every session.
Create Tile Modal
Title, Category (dropdown + inline "Add new category" button), Labels (click to select, create new with color picker), Priority (Low / Medium / High / Critical), Status / Column selector, Content textarea
Two save buttons: "Save Tile" (localStorage only) and "Save + Export File" (triggers File System Access API → creates a YYYY-MM-DD/ folder and saves as JSON — Chrome/Edge only, falls back to download on other browsers)
Kanban Board (Jira-style)
4 columns: Backlog, In Progress, In Review, Done
Cards show: category, priority dot + left border color, title, content preview, labels, date, assignee initials
Drag and drop between columns (status auto-updates)
"Add tile" shortcut button at bottom of each column
Press N anywhere to open the New Tile modal
Timeline View
Chronological, grouped by month
Each card shows status chip, priority chip, labels, content preview, and creator name
Trash System
Delete moves tiles to Trash (not permanent)
Trash view shows all deleted tiles with date
Restore or Delete Forever per tile
Empty Trash button
Optional: also saves to _trash/ folder via File System API
Search — MiniSearch fuzzy search across title, content, tags, and category — live filtered on both Board and Timeline views.

------------------------------------------------------------

FILE STRUCTURE
--------------
index.html    — main app shell, view containers, modals
auth.js       — sign-up / login, IndexedDB persistence, settings application (added in v2.1)
app.js        — dashboard, kanban board, timeline/gantt, analytics, trash, settings UI
console.js    — Super Console (50+ command registry) and its floating UI
utils.js      — shared helpers, IndexedDB primitives, global state declarations
styles.css    — all visual styling, dark/light theme variables

Load order matters: utils.js → auth.js → app.js → console.js.
auth.js depends on globals declared in utils.js, and app.js/console.js
depend on functions defined in auth.js (saveAllData, applySettings).
 


<!-- VISCARMA:START -->
## 🤖 VisCarMa Change Log
> Auto-maintained by [VisCarMa](https://viscarma.onrender.com) · Author: [@suryasticsai](https://github.com/suryasticsai)

| Type | Files | Summary | PR | Date | Author |
|------|-------|---------|-----|------|--------|
| 🔧 Fix | `Alkembic-Ace-V0.5.2.html`, `Alkembic-Ace-v.1.0.html`, `Alkembic-Ace-v0.5.4.html`, `Alkembic-Version0.4.html`, `Alkembic-ace-v1.2.html`, `Alkembic-v1.0.html`, `alkembic-v04.html`, `alkembic-v2.html`, `alkembic.html`, `app.js`, `console.js`, `index.html`, `styles.css`, `utils.js` | Added meta description; Added meta description; Added meta description; Added meta description; Added meta description; Added meta description; Added meta description; Added meta description; Added meta description; reviewed; reviewed; Added meta description; reviewed; reviewed | [PR #1](https://github.com/suryasticsai/Alkembic1/pull/1) | Tue, 30 


Jun 2026 01:18:28 GMT | [@suryasticsai](https://github.com/suryasticsai) |
<!-- VISCARMA:END -->