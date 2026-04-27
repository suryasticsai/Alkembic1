# Alkembic1
Alkembic PlugnPlay smart is utility tool exclusive for Smart Scrum Master who led their teams and automate mundane tasks

Alkembic Ace Edition 
Version : 0.5.3
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

This version (Ace v0.5.2) builds on Alkembic Core by adding
UX polish, adaptive appearance controls, and executive‑grade
visual clarity — without breaking existing workflows.

------------------------------------------------------------

WHAT’S NEW IN ACE v0.5.3
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
  - “Alkembic Ace” product naming
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
 
