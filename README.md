# Alkembic1
Alkembic PlugnPlay smart is utility tool exclusive for Smart Scrum Master who led their teams and automate mundane tasks


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
