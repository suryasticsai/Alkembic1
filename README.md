<div align="center">

# ⚗️ Alkembic Ace

**The offline-first Kanban command center, built for people who lead people.**

Alkembic PlugnPlay is a smart utility tool exclusive for Smart Scrum Masters who lead their teams and automate the mundane.

[![Version](https://img.shields.io/badge/version-2.1-f0a500?style=for-the-badge)](https://github.com/suryasticsai/Alkembic1)
[![Release](https://img.shields.io/badge/release-April%202026-0c1220?style=for-the-badge)](https://github.com/suryasticsai/Alkembic1)
[![License](https://img.shields.io/badge/license-Apache--2.0-00e5ff?style=for-the-badge)](LICENSE)
[![Offline First](https://img.shields.io/badge/offline-first-00e676?style=for-the-badge)](#)

[🌐 Live App](http://suryasticsai.github.io/Alkembic1/) · [📋 What's New](#-whats-new-in-ace-v21) · [🗂 File Structure](#-file-structure) · [👤 Creator](#-creator)

</div>

---

## ✨ Overview

**Alkembic Ace** is an offline-first leadership and knowledge management tool designed primarily for **Scrum Masters, Agile Leaders, and Delivery Managers**.

It enables structured thinking, people-aware tracking, and zero-cloud personal data control through a Kanban-centric experience enriched with dashboards, timelines, and exports. No servers. No sign-up forms sent anywhere. Your board lives in your browser.

> **v2.1 builds on v0.5.3** by fixing the broken first-run experience — sign-up/login, data persistence, and board rendering now all work end-to-end — without changing any of the existing UX or feature set you already know.

---

## 🛠️ What's New in Ace v2.1

> The "make it actually work" release. Everything below was either silently broken or entirely missing in prior builds.

<table>
<tr><td width="50%" valign="top">

### 🔐 Sign-Up / Login (new: `auth.js`)
The first-run "Login by name" screen referenced since v0.2 was never actually implemented — the app loaded to a blank screen with no way in. Fixed with:
- Full setup screen — name + optional password
- Multi-workspace support (multiple people, same browser, separate boards)
- Proper "wrong password" / "workspace not found" error states
- Workspaces persist in **IndexedDB** — survive refresh, close, logout

</td><td width="50%" valign="top">

### 💾 Data Saving (`saveAllData`)
Every card, comment, trash action, and setting change called a save function that **didn't exist** in the shipped build — nothing ever persisted.
- Now wired end-to-end to IndexedDB
- Autosave every 30 seconds
- Live "AUTO" indicator flashes on each save

</td></tr>
<tr><td width="50%" valign="top">

### 📋 Kanban Board No Longer Crashes
A missing bulk-actions panel in the HTML caused every board render to throw silently — cards never appeared at all.
- Added the missing panel + a **☑ Select** toggle
- Multi-select, bulk move, bulk export, bulk delete now reachable

</td><td width="50%" valign="top">

### 🧩 Broken Table Markup Fixed
The "Imported Data" table and the Trash table were both built with invalid HTML (`<td><td>` / `<td><thead>` instead of `<tr>`/`<table>`), which silently failed to render in most browsers.

</td></tr>
<tr><td width="50%" valign="top">

### 🧵 Duplicate Variable Crash Fixed
`console.js` redeclared globals already defined in `utils.js` — a hard syntax error that could stop the Super Console script from parsing at all, depending on engine.

</td><td width="50%" valign="top">

### 🎨 Settings Actually Apply Now
Theme, accent color, font, autosave toggle, and password change were silent no-ops. All now correctly applied to the live page.

</td></tr>
</table>

✅ **Verified via full end-to-end automated testing** (real DOM + IndexedDB, not manual spot-checks): sign-up, login with correct/incorrect password, card create/edit/delete, delete→trash→restore, table edits, theme toggling, all five views, and Super Console command execution — **zero runtime errors.**

---

## 🆕 What's New in Ace v0.5.3

<details>
<summary><b>Click to expand — Login, Brightness, Footer, Branding</b></summary>

<br>

| Feature | Details |
|---|---|
| 🔑 **Login by name** | Stores your username and creates a new account if it's a new user |
| 🌗 **Brightness Slider** | Fine-grained brightness control layered over themes, via a non-intrusive CSS filter — persists in localStorage, doesn't touch existing theme logic |
| 🪟 **Glassmorphism Footer Tile** | Floating glass-effect footer, golden JetBrains Mono typography, branding + docs link, dark-mode friendly with backdrop blur |
| 🏷️ **Identity Branding** | "Alkembic Ace" product naming + version badge clarity across login, topbar, and footer |

</details>

---

## 👥 Alkembic v0.3 — People Involved

<details>
<summary><b>Click to expand — Roles, priority chains, tree diagrams</b></summary>

<br>

In the create/edit modal: type a person's name → select one or more roles using the role chips → click **+ Add Person**.

**Roles available:**

| 💻 Developer | 🧪 QA/Test | 🎯 Product Owner | 🔄 Scrum Master | 🎨 Designer |
|---|---|---|---|---|
| 🏗 Architect | ⚙️ DevOps | 📊 Business Analyst | 🤝 Stakeholder | 📋 Manager |

- A person can hold **multiple roles simultaneously** (e.g. Robert tagged to both Dev + PO)
- Reorder people by dragging the **⠿** handle, or with **↑ ↓** arrows — this sets the priority chain (1 → 2 → 3)

**On the Kanban Card:** compact chain of avatar initials with role emoji → arrow → next person. Multi-role persons show a `+N` badge. Truncates at 3 with a `+N more` overflow.

**In the Detail Modal — Tree Diagram:** full visual chain with circular avatar, numbered priority badge (1, 2, 3...), name below, role tags with emoji and color, and colored connector arrows between each person. Multi-role persons get a "Multi-role" badge. The section hides entirely if no people are added.

Cards are draggable between all 4 columns. The people list inside the form is also drag-reorderable.

</details>

---

## 🚀 Version 0.2 — The Foundation

<details>
<summary><b>Click to expand — First run, Kanban, Timeline, Trash, Search</b></summary>

<br>

**🔰 First Run**
Name setup screen — enter your name once, it's saved and shown as a badge in the top bar on every session.

**📝 Create Tile Modal**
Title · Category (dropdown + inline "Add new category") · Labels (click to select, create new with color picker) · Priority (Low / Medium / High / Critical) · Status / Column selector · Content textarea.

Two save buttons: **Save Tile** (localStorage only) and **Save + Export File** (triggers File System Access API → creates a `YYYY-MM-DD/` folder and saves as JSON — Chrome/Edge only, falls back to download elsewhere).

**📋 Kanban Board (Jira-style)**
- 4 columns: Backlog, In Progress, In Review, Done
- Cards show category, priority dot + left border color, title, content preview, labels, date, assignee initials
- Drag and drop between columns (status auto-updates)
- "Add tile" shortcut at the bottom of each column
- Press **N** anywhere to open the New Tile modal

**📅 Timeline View**
Chronological, grouped by month. Each card shows status chip, priority chip, labels, content preview, and creator name.

**🗑 Trash System**
Delete moves tiles to Trash (not permanent). Trash view shows all deleted tiles with date. Restore or Delete Forever per tile. Empty Trash button. Optionally also saves to `_trash/` via File System API.

**🔍 Search**
MiniSearch fuzzy search across title, content, tags, and category — live filtered on both Board and Timeline views.

</details>

---

## 🗂 File Structure

```
index.html    main app shell, view containers, modals
auth.js       sign-up / login, IndexedDB persistence, settings application  (added in v2.1)
app.js        dashboard, kanban board, timeline/gantt, analytics, trash, settings UI
console.js    Super Console (50+ command registry) and its floating UI
utils.js      shared helpers, IndexedDB primitives, global state declarations
styles.css    all visual styling, dark/light theme variables
```

> ⚠️ **Load order matters:** `utils.js` → `auth.js` → `app.js` → `console.js`.
> `auth.js` depends on globals declared in `utils.js`, and `app.js`/`console.js` depend on functions defined in `auth.js` (`saveAllData`, `applySettings`).

---

## 👤 Creator

<div align="center">

### Sai Varakala
**Techno Agilist**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-suryasticsai-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/suryasticsai)
[![Instagram](https://img.shields.io/badge/Instagram-suryasticsai-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://www.instagram.com/suryasticsai)
[![Medium](https://img.shields.io/badge/Medium-suryasticsai-000000?style=for-the-badge&logo=medium&logoColor=white)](https://medium.com/@suryasticsai)
[![GitHub](https://img.shields.io/badge/GitHub-suryasticsai-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/suryasticsai)
[![Hugging Face](https://img.shields.io/badge/Hugging%20Face-suryasticsai-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black)](https://huggingface.co/suryasticsai)
[![X](https://img.shields.io/badge/X-suryasticsaii-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/suryasticsaii)

</div>

---

<!-- VISCARMA:START -->
## 🤖 VisCarMa Change Log
> Auto-maintained by [VisCarMa](https://viscarma.onrender.com) · Author: [@suryasticsai](https://github.com/suryasticsai)

| Type | Files | Summary | PR | Date | Author |
|------|-------|---------|-----|------|--------|
| 🔧 Fix | `Alkembic-Ace-V0.5.2.html`, `Alkembic-Ace-v.1.0.html`, `Alkembic-Ace-v0.5.4.html`, `Alkembic-Version0.4.html`, `Alkembic-ace-v1.2.html`, `Alkembic-v1.0.html`, `alkembic-v04.html`, `alkembic-v2.html`, `alkembic.html`, `app.js`, `console.js`, `index.html`, `styles.css`, `utils.js` | Added meta description; Added meta description; Added meta description; Added meta description; Added meta description; Added meta description; Added meta description; Added meta description; Added meta description; reviewed; reviewed; Added meta description; reviewed; reviewed | [PR #1](https://github.com/suryasticsai/Alkembic1/pull/1) | Tue, 30 Jun 2026 01:18:28 GMT | [@suryasticsai](https://github.com/suryasticsai) |
<!-- VISCARMA:END -->

<div align="center">

*Built offline-first, for the people who keep teams moving.*

</div>