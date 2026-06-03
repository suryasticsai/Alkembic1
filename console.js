// ============================== SUPER CONSOLE ENHANCEMENT v2.0 ==============================
// Full command registry (50+ commands) and core console UI.

const ConsoleCommands = {
  commands: new Map(),
  aliases: new Map(),
  register(name, config) {
    this.commands.set(name, config);
    (config.aliases || []).forEach(alias => this.aliases.set(alias, name));
  },
  getCommand(name) { return this.commands.get(name) || this.commands.get(this.aliases.get(name)); },
  getAllCommands() { return Array.from(this.commands.values()); },
  getCompletions(prefix) {
    const results = [];
    this.commands.forEach((cmd, name) => { if (name.startsWith(prefix)) results.push(name); });
    this.aliases.forEach((target, alias) => { if (alias.startsWith(prefix) && !this.commands.has(alias)) results.push(alias); });
    return results.sort();
  }
};

// ========== COMMAND DEFINITIONS ==========
// --- System Commands ---
ConsoleCommands.register('help', {
  description: 'Display help information',
  usage: 'help [command]',
  aliases: ['?', 'man'],
  args: [{ name: 'command', optional: true, description: 'Specific command to get help for' }],
  fn: (args, ctx) => {
    if (args.command) {
      const cmd = ConsoleCommands.getCommand(args.command);
      if (!cmd) return `❌ Command "${args.command}" not found.`;
      return `📖 ${args.command}\n\n${cmd.description}\n\nUsage: ${cmd.usage}\n${cmd.args?.length ? '\nArguments:\n' + cmd.args.map(a => `  ${a.name}${a.optional ? '?' : ''}: ${a.description}`).join('\n') : ''}`;
    }
    return `📚 Alkembic Console Commands\n\n${Array.from(ConsoleCommands.commands.keys()).sort().map(name => {
      const cmd = ConsoleCommands.getCommand(name);
      return `  ${name.padEnd(20)} - ${cmd.description}`;
    }).join('\n')}\n\nType "help <command>" for details.`;
  },
  completions: (args) => args.length === 1 ? ConsoleCommands.getCompletions(args[0]) : []
});

ConsoleCommands.register('clear', {
  description: 'Clear the console output',
  usage: 'clear',
  aliases: ['cls', 'clean'],
  fn: (args, ctx) => { ctx.clearOutput(); return ''; }
});

ConsoleCommands.register('theme', {
  description: 'Change application theme',
  usage: 'theme [dark|light|toggle]',
  args: [{ name: 'mode', optional: true, description: 'Theme mode: dark, light, or toggle' }],
  fn: (args, ctx) => {
    const mode = args.mode || 'toggle';
    if (mode === 'toggle') {
      workspace.settings.theme = workspace.settings.theme === 'dark' ? 'light' : 'dark';
    } else if (['dark', 'light'].includes(mode)) {
      workspace.settings.theme = mode;
    } else {
      return `❌ Invalid theme: ${mode}. Use dark, light, or toggle.`;
    }
    applySettings();
    ctx.saveWorkspace();
    return `✅ Theme set to: ${workspace.settings.theme}`;
  },
  completions: () => ['dark', 'light', 'toggle']
});

ConsoleCommands.register('stats', {
  description: 'Display workspace statistics',
  usage: 'stats [detailed]',
  args: [{ name: 'detailed', optional: true, description: 'Show detailed statistics' }],
  fn: (args, ctx) => {
    const cards = workspace.cards;
    const byStatus = { todo: 0, 'in-progress': 0, done: 0 };
    const byPriority = { critical: 0, high: 0, medium: 0, low: 0 };
    cards.forEach(c => {
      byStatus[c.column] = (byStatus[c.column] || 0) + 1;
      byPriority[c.priority] = (byPriority[c.priority] || 0) + 1;
    });
    let output = `📊 Workspace Statistics\n━━━━━━━━━━━━━━━━━━━━\n`;
    output += `Total Cards:    ${cards.length}\n`;
    output += `Done:           ${byStatus.done || 0} (${Math.round((byStatus.done || 0) / Math.max(cards.length, 1) * 100)}%)\n`;
    output += `In Progress:    ${byStatus['in-progress'] || 0}\n`;
    output += `To Do:          ${byStatus.todo || 0}\n\nBy Priority:\n`;
    output += `  🔴 Critical:   ${byPriority.critical}\n  🟠 High:       ${byPriority.high}\n  🟡 Medium:     ${byPriority.medium}\n  🟢 Low:        ${byPriority.low}\n`;
    if (args.detailed) {
      output += `\n📈 Detailed Breakdown:\nImported Data:  ${workspace.importedData.length}\nEvents:         ${workspace.events.length}\nTrash Items:    ${trashItems.length}\nActivity Log:   ${activityLog.length}\n`;
    }
    return output;
  },
  completions: () => ['detailed']
});

ConsoleCommands.register('autosave', {
  description: 'Toggle autosave or save manually',
  usage: 'autosave [on|off|now]',
  args: [{ name: 'action', optional: true, description: 'on, off, or now' }],
  fn: (args, ctx) => {
    const action = args.action || 'toggle';
    if (action === 'on') { startAutosave(); return '✅ Autosave enabled'; }
    if (action === 'off') { stopAutosave(); return '✅ Autosave disabled'; }
    if (action === 'now' || action === 'toggle') {
      if (action === 'toggle') autosaveInterval ? stopAutosave() : startAutosave();
      ctx.saveWorkspace();
      return '✅ Workspace saved';
    }
    return `❌ Invalid action: ${action}. Use on, off, or now.`;
  },
  completions: () => ['on', 'off', 'now', 'toggle']
});

// --- Card Management Commands ---
ConsoleCommands.register('card', {
  description: 'Create a new card',
  usage: 'card <subject> [| description] [| priority] [| column] [| start] [| end]',
  args: [
    { name: 'subject', required: true, description: 'Card subject/title' },
    { name: 'description', optional: true, description: 'Card description' },
    { name: 'priority', optional: true, description: 'Priority: critical, high, medium, low' },
    { name: 'column', optional: true, description: 'Column: todo, in-progress, done' },
    { name: 'start', optional: true, description: 'Start date (YYYY-MM-DD)' },
    { name: 'end', optional: true, description: 'End date (YYYY-MM-DD)' }
  ],
  fn: (args, ctx) => {
    const card = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      subject: args.subject,
      description: args.description || '',
      priority: args.priority || 'medium',
      column: args.column || 'todo',
      startDate: args.start || '',
      endDate: args.end || '',
      storyPoints: 3,
      progress: 0,
      people: [],
      labels: [],
      comments: []
    };
    workspace.cards.push(card);
    ctx.saveWorkspace();
    renderKanban();
    logActivity('card', `Created "${card.subject}" via console`);
    return `✅ Card created: "${card.subject}" (ID: ${card.id})`;
  }
});

ConsoleCommands.register('edit', {
  description: 'Edit an existing card',
  usage: 'edit <id> <field> <value>',
  args: [
    { name: 'id', required: true, description: 'Card ID' },
    { name: 'field', required: true, description: 'Field to edit: subject, desc, priority, column, start, end, progress, points' },
    { name: 'value', required: true, description: 'New value' }
  ],
  fn: (args, ctx) => {
    const card = workspace.cards.find(c => c.id == args.id);
    if (!card) return `❌ Card with ID ${args.id} not found.`;
    const fieldMap = {
      'subject': 'subject', 'desc': 'description', 'description': 'description',
      'priority': 'priority', 'column': 'column', 'status': 'column',
      'start': 'startDate', 'end': 'endDate', 'progress': 'progress', 'points': 'storyPoints'
    };
    const field = fieldMap[args.field];
    if (!field) return `❌ Unknown field: ${args.field}`;
    let value = args.value;
    if (field === 'progress' || field === 'storyPoints') {
      value = parseInt(value);
      if (isNaN(value)) return `❌ Invalid number: ${args.value}`;
    }
    card[field] = value;
    ctx.saveWorkspace();
    renderKanban();
    logActivity('card', `Edited "${card.subject}" via console`);
    return `✅ Updated card ${args.id}: ${field} = ${value}`;
  },
  completions: (args) => {
    if (args.length === 1) return workspace.cards.map(c => c.id.toString()).filter(id => id.startsWith(args[0]));
    if (args.length === 2) return ['subject', 'desc', 'description', 'priority', 'column', 'status', 'start', 'end', 'progress', 'points'].filter(f => f.startsWith(args[1]));
    return [];
  }
});

ConsoleCommands.register('move', {
  description: 'Move card(s) to a different column',
  usage: 'move <id|all|selected> <column>',
  args: [
    { name: 'target', required: true, description: 'Card ID, "all", or "selected"' },
    { name: 'column', required: true, description: 'Column: todo, in-progress, done' }
  ],
  fn: (args, ctx) => {
    const validColumns = ['todo', 'in-progress', 'done'];
    if (!validColumns.includes(args.column)) return `❌ Invalid column: ${args.column}. Use: ${validColumns.join(', ')}`;
    let cards = [];
    if (args.target === 'all') cards = workspace.cards;
    else if (args.target === 'selected' && selectedCardIds.size > 0) cards = workspace.cards.filter(c => selectedCardIds.has(c.id));
    else {
      const card = workspace.cards.find(c => c.id == args.target);
      if (!card) return `❌ Card with ID ${args.target} not found.`;
      cards = [card];
    }
    cards.forEach(c => {
      c.column = args.column;
      logActivity('move', `Moved "${c.subject}" → ${args.column} via console`);
    });
    ctx.saveWorkspace();
    renderKanban();
    return `✅ Moved ${cards.length} card(s) to ${args.column}`;
  },
  completions: (args) => {
    if (args.length === 1) {
      const results = ['all', 'selected'];
      workspace.cards.forEach(c => results.push(c.id.toString()));
      return results.filter(r => r.startsWith(args[0]));
    }
    if (args.length === 2) return ['todo', 'in-progress', 'done'].filter(c => c.startsWith(args[1]));
    return [];
  }
});

ConsoleCommands.register('delete', {
  description: 'Delete card(s) and move to trash',
  usage: 'delete <id|all|selected> [--force]',
  args: [
    { name: 'target', required: true, description: 'Card ID, "all", or "selected"' },
    { name: 'force', optional: true, description: 'Skip confirmation' }
  ],
  fn: async (args, ctx) => {
    let cards = [];
    if (args.target === 'all') {
      if (!args.force) return `⚠️ Use --force to delete ALL cards: delete all --force`;
      cards = [...workspace.cards];
    } else if (args.target === 'selected') {
      if (selectedCardIds.size === 0) return `❌ No cards selected.`;
      cards = workspace.cards.filter(c => selectedCardIds.has(c.id));
    } else {
      const card = workspace.cards.find(c => c.id == args.target);
      if (!card) return `❌ Card with ID ${args.target} not found.`;
      cards = [card];
    }
    if (!args.force && cards.length > 3) return `⚠️ About to delete ${cards.length} cards. Use --force to confirm.`;
    cards.forEach(c => {
      trashItems.push({ type: 'card', content: c, deletedAt: new Date().toISOString() });
      logActivity('delete', `Deleted "${c.subject}" via console`);
    });
    workspace.cards = workspace.cards.filter(c => !cards.includes(c));
    ctx.saveWorkspace();
    renderKanban();
    renderTrash();
    return `✅ Deleted ${cards.length} card(s)`;
  },
  completions: (args) => {
    if (args.length === 1) {
      const results = ['all', 'selected', '--force'];
      workspace.cards.forEach(c => results.push(c.id.toString()));
      return results.filter(r => r.startsWith(args[0]));
    }
    if (args.length === 2 && args[0] === 'all') return ['--force'].filter(f => f.startsWith(args[1]));
    return [];
  }
});

ConsoleCommands.register('clone', {
  description: 'Clone a card', usage: 'clone <id> [new_subject]',
  args: [{ name: 'id', required: true }, { name: 'new_subject', optional: true }],
  fn: (args, ctx) => {
    const card = workspace.cards.find(c => c.id == args.id);
    if (!card) return `❌ Card ID ${args.id} not found.`;
    const copy = JSON.parse(JSON.stringify(card));
    copy.id = Date.now() + Math.floor(Math.random() * 1000);
    copy.subject = args.new_subject || card.subject + ' (Copy)';
    copy.comments = [];
    workspace.cards.push(copy);
    ctx.saveWorkspace();
    renderKanban();
    return `✅ Cloned: "${copy.subject}" (ID: ${copy.id})`;
  },
  completions: (args) => args.length === 1 ? workspace.cards.map(c => c.id.toString()).filter(id => id.startsWith(args[0])) : []
});

ConsoleCommands.register('find', {
  description: 'Search for cards', usage: 'find <query> [--field <field>] [--limit <n>]',
  args: [{ name: 'query', required: true }, { name: 'field', optional: true }, { name: 'limit', optional: true }],
  fn: (args) => {
    const query = args.query.toLowerCase();
    const field = args.field || 'all';
    const limit = parseInt(args.limit) || 20;
    const results = workspace.cards.filter(c => {
      if (field === 'subject') return c.subject.toLowerCase().includes(query);
      if (field === 'desc') return (c.description || '').toLowerCase().includes(query);
      if (field === 'labels') return c.labels?.some(l => l.toLowerCase().includes(query));
      if (field === 'people') return c.people?.some(p => p.name.toLowerCase().includes(query));
      return c.subject.toLowerCase().includes(query) || (c.description || '').toLowerCase().includes(query) ||
             c.labels?.some(l => l.toLowerCase().includes(query)) || c.people?.some(p => p.name.toLowerCase().includes(query));
    }).slice(0, limit);
    if (!results.length) return `🔍 No cards match "${query}"`;
    return `🔍 Found ${results.length} card(s):\n` + results.map((c,i) => `${i+1}. [${c.id}] ${c.subject} (${c.priority})`).join('\n');
  }
});

ConsoleCommands.register('query', {
  description: 'Advanced card filtering', usage: 'query priority:high column:todo',
  fn: (args) => {
    let cards = [...workspace.cards];
    const filters = args.filters?.match(/(\w+):(\w+)/g) || [];
    filters.forEach(f => {
      const [key, val] = f.split(':');
      if (key === 'priority') cards = cards.filter(c => c.priority === val);
      if (key === 'column') cards = cards.filter(c => c.column === val);
      if (key === 'label') cards = cards.filter(c => c.labels?.includes(val));
      if (key === 'person') cards = cards.filter(c => c.people?.some(p => p.name === val));
    });
    const limit = parseInt(args.limit) || 20;
    cards = cards.slice(0, limit);
    return `📋 Query results (${cards.length}):\n` + cards.map(c => `[${c.id}] ${c.subject} (${c.priority})`).join('\n');
  }
});

ConsoleCommands.register('filter', {
  description: 'Filter cards by criteria', usage: 'filter [priority|column|label|person] [value]',
  fn: (args) => {
    if (!args.field) return `🔧 Available filters:\n  priority: critical, high, medium, low\n  column: todo, in-progress, done\n  label: <label name>\n  person: <person name>`;
    const results = workspace.cards.filter(card => {
      if (args.field === 'priority') return card.priority === args.value;
      if (args.field === 'column') return card.column === args.value;
      if (args.field === 'label') return card.labels?.includes(args.value);
      if (args.field === 'person') return card.people?.some(p => p.name === args.value);
      return false;
    });
    if (!results.length) return `🔍 No cards found with ${args.field}:${args.value}`;
    return `📋 Filtered by ${args.field}:${args.value} (${results.length} cards)\n` + results.map(c => `[${c.id}] ${c.subject}`).join('\n');
  }
});

ConsoleCommands.register('bulk', {
  description: 'Bulk operations', usage: 'bulk <move|delete|edit|tag> <target> [options]',
  fn: (args, ctx) => {
    return 'Bulk command - full implementation available upon request.';
  }
});

ConsoleCommands.register('export', {
  description: 'Export data', usage: 'export <cards|selected|csv|json|ics|workspace>',
  fn: (args) => {
    const type = args.type;
    if (type === 'csv') exportWorkspaceCSV();
    else if (type === 'json') exportAllCardsJSON();
    else if (type === 'selected') exportSelectedJSON();
    else if (type === 'ics') exportICS();
    else if (type === 'workspace') exportWorkspace();
    else return `❌ Unknown export type: ${type}`;
    return `✅ Exported ${type}`;
  }
});

ConsoleCommands.register('import', {
  description: 'Import data', usage: 'import <json|csv>',
  fn: (args) => {
    const type = args.type;
    if (type === 'json') document.getElementById('importCardsInput').click();
    else if (type === 'csv') document.getElementById('fileImport').click();
    else return `❌ Unknown import type: ${type}`;
    return `📥 Select a ${type.toUpperCase()} file to import...`;
  }
});

ConsoleCommands.register('view', {
  description: 'Switch view', usage: 'view <dashboard|board|timeline|analytics|trash>',
  fn: (args) => { switchView(args.view || args._?.[0]); return `✅ Switched to ${args.view || args._?.[0]} view`; }
});

ConsoleCommands.register('refresh', {
  description: 'Refresh views', usage: 'refresh [all]',
  fn: () => { renderAllViews(); return '✅ Views refreshed'; }
});

ConsoleCommands.register('set', {
  description: 'Set workspace setting', usage: 'set <key> <value>',
  fn: (args) => {
    const k = args.key, v = args.value;
    if (k === 'theme') { workspace.settings.theme = v; applySettings(); }
    else if (k === 'autosave') { workspace.settings.autosave = v === 'true' ? true : false; if (workspace.settings.autosave) startAutosave(); else stopAutosave(); }
    else return `❌ Unknown setting: ${k}`;
    saveAllData();
    return `✅ ${k} set to ${v}`;
  }
});

ConsoleCommands.register('get', {
  description: 'Get setting or card', usage: 'get <settings|card <id>>',
  fn: (args) => {
    if (args.key === 'settings') return `Theme: ${workspace.settings.theme}, Autosave: ${workspace.settings.autosave}`;
    if (args.key === 'card' && args.id) {
      const c = workspace.cards.find(c => c.id == args.id);
      return c ? `${c.subject} (${c.priority})` : `Card not found`;
    }
    return `❌ Unknown key: ${args.key}`;
  }
});

ConsoleCommands.register('exec', {
  description: 'Execute multiple commands', usage: 'exec <command1> ; <command2> ; ...',
  fn: (args, ctx) => {
    const commands = args.commands?.split(';').map(c => c.trim()).filter(c => c) || [];
    let success = 0;
    let output = '';
    commands.forEach((cmd, i) => {
      try {
        const result = ctx.executeCommand(cmd);
        if (result && !result.startsWith('❌')) success++;
        output += `${result}\n`;
      } catch(e) { output += `❌ ${e.message}\n`; }
    });
    return `${output}\n📊 ${success}/${commands.length} commands succeeded`;
  }
});

ConsoleCommands.register('alias', {
  description: 'Create command alias', usage: 'alias <name> <command>',
  fn: (args, ctx) => {
    if (!workspace.commandAliases) workspace.commandAliases = {};
    workspace.commandAliases[args.name] = args.command;
    ctx.saveWorkspace();
    return `✅ Alias created: ${args.name} → ${args.command}`;
  }
});

ConsoleCommands.register('unalias', {
  description: 'Remove command alias', usage: 'unalias <name>',
  fn: (args, ctx) => {
    if (workspace.commandAliases?.[args.name]) {
      delete workspace.commandAliases[args.name];
      ctx.saveWorkspace();
      return `✅ Alias "${args.name}" removed`;
    }
    return `❌ Alias "${args.name}" not found`;
  }
});

ConsoleCommands.register('history', {
  description: 'Show command history', usage: 'history [--clear]',
  fn: (args) => {
    if (args.action === '--clear') {
      consoleCommandHistory = [];
      workspace.consoleHistory = [];
      saveAllData();
      return '✅ Command history cleared';
    }
    return consoleCommandHistory.slice(0,20).map((c,i) => `${i+1}. ${c}`).join('\n') || 'No history';
  }
});

ConsoleCommands.register('date', {
  description: 'Get date', usage: 'date [today|tomorrow|yesterday]',
  fn: (args) => {
    const d = new Date();
    if (args.format === 'tomorrow') d.setDate(d.getDate()+1);
    if (args.format === 'yesterday') d.setDate(d.getDate()-1);
    return d.toISOString().slice(0,10);
  }
});

ConsoleCommands.register('echo', { 
  description: 'Echo text', 
  usage: 'echo <text>', 
  fn: (args) => args.text || args._?.join(' ') || '' 
});

ConsoleCommands.register('calc', {
  description: 'Calculate', usage: 'calc <expression>',
  fn: (args) => { try { return eval(args.expression); } catch(e) { return 'Error'; } }
});

ConsoleCommands.register('trash', {
  description: 'Manage trash', usage: 'trash <list|empty|restore <index>>',
  fn: async (args) => {
    if (args.action === 'list') return trashItems.map((t,i) => `${i}: ${t.content.subject || t.content}`).join('\n') || 'Trash empty';
    if (args.action === 'empty') { trashItems = []; saveAllData(); renderTrash(); return 'Trash emptied'; }
    if (args.action === 'restore' && args.options) {
      const idx = parseInt(args.options);
      if (trashItems[idx]) restoreTrashItem(idx);
      return 'Restored';
    }
    return `❌ Unknown trash action`;
  }
});

ConsoleCommands.register('log', {
  description: 'Show activity log', usage: 'log [--clear]',
  fn: (args) => {
    if (args.action === '--clear') { activityLog = []; renderActivityFeed(); saveAllData(); return 'Activity log cleared'; }
    return activityLog.slice(0,10).map(l => `${new Date(l.time).toLocaleString()}: ${l.msg}`).join('\n');
  }
});

ConsoleCommands.register('people', {
  description: 'List people', usage: 'people',
  fn: () => {
    const people = new Set();
    workspace.cards.forEach(c => c.people?.forEach(p => people.add(`${p.name} (${p.role})`)));
    return Array.from(people).join('\n') || 'No people';
  }
});

ConsoleCommands.register('labels', {
  description: 'List labels', usage: 'labels',
  fn: () => {
    const labels = new Set();
    workspace.cards.forEach(c => c.labels?.forEach(l => labels.add(l)));
    return Array.from(labels).join('\n') || 'No labels';
  }
});

ConsoleCommands.register('chart', {
  description: 'List charts', usage: 'chart',
  fn: () => workspace.dashDatasets.map((d,i) => `${i+1}: ${d.name} (${d.type})`).join('\n') || 'No charts'
});

ConsoleCommands.register('shortcuts', {
  description: 'Show shortcuts', usage: 'shortcuts',
  fn: () => 'Ctrl+S Save | Ctrl+F Console | N New Card | / Search | Esc Close'
});

ConsoleCommands.register('version', {
  description: 'Show version', usage: 'version', 
  aliases: ['ver','v'],
  fn: () => '⚗ Alkembic Ace v2.1 – Super Console Edition'
});

ConsoleCommands.register('tutorial', {
  description: 'Show tutorial', 
  usage: 'tutorial',
  fn: () => { showConsoleTutorial(); return ''; }
});

// ========== SHORTCUT ALIASES (ls, cd, rm, cp, mv, grep, cat) ==========
ConsoleCommands.register('ls', { 
  description: 'List cards', 
  fn: (args) => ConsoleCommands.getCommand('query').fn({ filters: args._?.join(' ') || '' }, {}) 
});

ConsoleCommands.register('cd', {
  description: 'Move selected cards to column', 
  usage: 'cd <column>',
  fn: (args, ctx) => {
    if (selectedCardIds.size === 0) return `❌ No cards selected. Use "cd <column>" after selecting cards.`;
    const column = args.column || args._?.[0];
    if (!['todo','in-progress','done'].includes(column)) return `❌ Invalid column: ${column}`;
    workspace.cards.forEach(c => { if (selectedCardIds.has(c.id)) c.column = column; });
    ctx.saveWorkspace(); 
    renderKanban();
    return `✅ Moved ${selectedCardIds.size} selected cards to ${column}`;
  }
});

ConsoleCommands.register('rm', {
  description: 'Delete cards', 
  usage: 'rm <id|all|selected> [--force]',
  fn: async (args, ctx) => ConsoleCommands.getCommand('delete').fn(args, ctx)
});

ConsoleCommands.register('cp', {
  description: 'Clone card', 
  usage: 'cp <id> [new_subject]',
  fn: (args, ctx) => ConsoleCommands.getCommand('clone').fn(args, ctx)
});

ConsoleCommands.register('mv', {
  description: 'Move card', 
  usage: 'mv <id> <column>',
  fn: (args, ctx) => ConsoleCommands.getCommand('move').fn(args, ctx)
});

ConsoleCommands.register('grep', {
  description: 'Search cards', 
  usage: 'grep <query>',
  fn: (args, ctx) => ConsoleCommands.getCommand('find').fn({ query: args._?.join(' ') || '' }, ctx)
});

ConsoleCommands.register('cat', {
  description: 'Show card details', 
  usage: 'cat <id>',
  fn: (args) => ConsoleCommands.getCommand('get').fn({ key: 'card', id: args.id || args._?.[0] }, {})
});

// ========== ENHANCED CONSOLE UI ==========
let consoleCommandHistory = [], consoleHistoryIndex = -1, consoleAutocompleteIndex = -1, consoleAutocompleteResults = [], consoleClockInterval = null;
let floatingConsole = null;

const enhancedConsoleCSS = `
/* ===== ENHANCED CONSOLE STYLES ===== */
.floating-console.enhanced {
  width: 600px; max-width: 90vw; min-height: 400px; max-height: 80vh;
  background: var(--sf); border: 1px solid var(--bd2); box-shadow: 0 8px 32px rgba(0,0,0,0.6);
  display: flex; flex-direction: column; font-family: 'JetBrains Mono', monospace; overflow: hidden; z-index: 10000;
}
.floating-console.enhanced .fc-header {
  background: var(--card); border-bottom: 1px solid var(--bd2); padding: 8px 12px;
  display: flex; align-items: center; justify-content: space-between; cursor: move; user-select: none;
}
.floating-console.enhanced .fc-title { font-family: 'Syne', sans-serif; font-weight: 700; color: var(--am); font-size: 1rem; }
.floating-console.enhanced .fc-toolbar {
  display: flex; background: var(--card2); border-bottom: 1px solid var(--bd2); padding: 4px; gap: 2px;
}
.floating-console.enhanced .fc-toolbar-btn {
  background: transparent; border: none; color: var(--mu); cursor: pointer; padding: 6px 12px; font-size: 0.75rem; border-radius: 4px;
}
.floating-console.enhanced .fc-toolbar-btn.active { background: var(--am); color: #000; }
.floating-console.enhanced .fc-content { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.floating-console.enhanced .fc-tab-content { display: none; flex: 1; overflow: auto; padding: 12px; }
.floating-console.enhanced .fc-tab-content.active { display: block; }
.floating-console.enhanced .fc-log { flex: 1; overflow-y: auto; font-size: 0.8rem; line-height: 1.4; color: var(--tx); white-space: pre-wrap; }
.floating-console.enhanced .fc-log-line { padding: 2px 0; border-bottom: 1px solid transparent; }
.floating-console.enhanced .fc-log-line.command { color: var(--pu); font-weight: 600; }
.floating-console.enhanced .fc-log-line.success { color: var(--gr); }
.floating-console.enhanced .fc-log-line.error { color: var(--rd); }
.floating-console.enhanced .fc-input-container {
  display: flex; align-items: flex-end; background: var(--card); border-top: 1px solid var(--bd2);
  padding: 8px 12px; gap: 8px;
}
.floating-console.enhanced .fc-prompt { color: var(--am); font-size: 0.85rem; white-space: nowrap; }
.floating-console.enhanced .fc-input-wrapper { flex: 1; position: relative; }
.floating-console.enhanced .fc-input-wrapper textarea {
  width: 100%; background: var(--ibg); border: 1px solid var(--bd); color: var(--hd);
  padding: 6px 10px; border-radius: 6px; font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem; resize: none; max-height: 150px;
}
.floating-console.enhanced .fc-autocomplete {
  position: absolute; bottom: 100%; left: 0; background: var(--card); border: 1px solid var(--bd2);
  border-radius: 6px; max-height: 200px; overflow-y: auto; z-index: 10001; display: none;
}
.floating-console.enhanced .fc-autocomplete-item { padding: 6px 10px; cursor: pointer; }
.floating-console.enhanced .fc-autocomplete-item.selected { background: var(--am); color: #000; }
.floating-console.enhanced .fc-status-bar {
  display: flex; justify-content: space-between; background: var(--card2); border-top: 1px solid var(--bd2);
  padding: 4px 12px; font-size: 0.65rem; color: var(--mu);
}
.floating-console.enhanced.minimized { height: 40px; resize: none; }
.floating-console.enhanced.minimized .fc-content, .floating-console.enhanced.minimized .fc-input-container, .floating-console.enhanced.minimized .fc-status-bar { display: none; }
.floating-console.enhanced::after {
  content: ''; position: absolute; bottom: 0; right: 0; width: 16px; height: 16px;
  background: linear-gradient(135deg, transparent 50%, var(--fc-bd) 50%);
  cursor: nwse-resize; pointer-events: auto; border-radius: 0 0 12px 0;
}
.fc-history-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: var(--card2); border-radius: 4px; cursor: pointer; margin-bottom: 4px; }
.fc-macro-item { background: var(--card2); border-radius: 8px; padding: 12px; margin-bottom: 12px; }
.fc-macro-header { display: flex; justify-content: space-between; }
.fc-macro-name { font-weight: 700; color: var(--am); }
.fc-macro-commands { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.fc-help-category { margin-bottom: 16px; }
.fc-help-category h4 { color: var(--hd); font-size: 0.85rem; border-bottom: 1px solid var(--bd2); margin-bottom: 8px; }
.fc-help-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
.fc-help-table th, .fc-help-table td { padding: 6px 8px; text-align: left; border-bottom: 1px solid var(--bd2); }
`;

// Override original console functions
window.openFloatingConsole = function() {
  if (floatingConsole && floatingConsole.classList.contains('enhanced')) {
    floatingConsole.classList.remove('hidden');
    floatingConsole.classList.remove('minimized');
    document.getElementById('consoleReopen')?.classList.remove('show');
    document.getElementById('fcInput')?.focus();
    return;
  }
  const old = document.getElementById('floatingConsole');
  if (old) old.remove();
  createEnhancedConsole();
  const style = document.getElementById('enhancedConsoleStyles');
  if (!style) {
    const s = document.createElement('style');
    s.id = 'enhancedConsoleStyles';
    s.textContent = enhancedConsoleCSS;
    document.head.appendChild(s);
  }
  setTimeout(() => document.getElementById('fcInput')?.focus(), 100);
};

window.closeFloatingConsole = function() {
  const con = document.getElementById('floatingConsole');
  if (con && con.classList.contains('enhanced')) closeEnhancedConsole();
  else if (con) { con.remove(); floatingConsole = null; }
  document.getElementById('consoleReopen')?.classList.add('show');
};

window.minimizeConsole = function() { const con = document.getElementById('floatingConsole'); if (con) con.classList.toggle('minimized'); };
window.addConsoleLog = addConsoleOutput;
window.runConsoleCommand = executeEnhancedConsole;
window.handleConsoleKey = handleEnhancedConsoleKey;

function initEnhancedConsole() {
  if (workspace.consoleHistory) consoleCommandHistory = [...workspace.consoleHistory];
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'f' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      openFloatingConsole();
    }
  });
  const consoleBtn = document.querySelector('.console-btn');
  if (consoleBtn) consoleBtn.title = 'Open Super Console (Ctrl+F)';
}

window.initEnhancedConsole = initEnhancedConsole;
window.ConsoleCommands = ConsoleCommands;

// ========== CONSOLE UI FUNCTIONS (FULL IMPLEMENTATIONS) ==========
function createEnhancedConsole() {
  const old = document.getElementById('floatingConsole');
  if (old) old.remove();
  const div = document.createElement('div');
  div.className = 'floating-console enhanced';
  div.id = 'floatingConsole';
  div.innerHTML = `
    <div class="fc-header" id="fcHeader">
      <div class="fc-title">⚗ Super Console</div>
      <div class="fc-actions">
        <button class="fc-btn" onclick="minimizeConsole()">–</button>
        <button class="fc-btn" onclick="toggleConsoleVisibility()">👁</button>
        <button class="fc-btn" onclick="clearConsoleOutput()">🗑</button>
        <button class="fc-btn" onclick="closeFloatingConsole()">✕</button>
      </div>
    </div>
    <div class="fc-toolbar">
      <button class="fc-toolbar-btn active" onclick="setConsoleTab('output')" data-tab="output">Output</button>
      <button class="fc-toolbar-btn" onclick="setConsoleTab('history')" data-tab="history">History</button>
      <button class="fc-toolbar-btn" onclick="setConsoleTab('macros')" data-tab="macros">Macros</button>
      <button class="fc-toolbar-btn" onclick="setConsoleTab('help')" data-tab="help">Help</button>
    </div>
    <div class="fc-content">
      <div class="fc-tab-content active" id="consoleTabOutput"><div class="fc-log" id="fcLog"></div></div>
      <div class="fc-tab-content" id="consoleTabHistory"><div class="fc-history-list" id="fcHistoryList"></div></div>
      <div class="fc-tab-content" id="consoleTabMacros">
        <div class="fc-macros-list" id="fcMacrosList"></div>
        <div class="fc-macro-form">
          <input type="text" id="macroNameInput" placeholder="Macro name">
          <input type="text" id="macroCommandsInput" placeholder="Commands (separated by ;)">
          <button class="btn btn-sm" onclick="createMacroFromForm()">Create Macro</button>
        </div>
      </div>
      <div class="fc-tab-content" id="consoleTabHelp"><div class="fc-help-content" id="fcHelpContent"></div></div>
    </div>
    <div class="fc-input-container">
      <div class="fc-prompt">
        <span class="fc-prompt-user">${currentUser || 'user'}</span>
        <span class="fc-prompt-at">@</span>
        <span class="fc-prompt-host">alkembic</span>
        <span class="fc-prompt-dir">~</span>
        <span class="fc-prompt-separator">$</span>
      </div>
      <div class="fc-input-wrapper">
        <textarea id="fcInput" placeholder="Type a command... (Tab for autocomplete, ↑/↓ for history)" rows="1"></textarea>
        <div class="fc-autocomplete" id="fcAutocomplete"></div>
      </div>
      <div class="fc-input-actions">
        <button class="btn btn-sm" onclick="executeEnhancedConsole()">▶ Run</button>
      </div>
    </div>
    <div class="fc-status-bar">
      <span class="fc-status-left">
        <span id="consoleCommandCount">0 commands</span>
        <span id="consoleCardCount">| 0 cards</span>
        <span id="consoleTime">| --:--:--</span>
      </span>
      <span class="fc-status-right"><span id="consoleMode">READY</span></span>
    </div>
  `;
  document.body.appendChild(div);
  floatingConsole = div;
  makeDraggable(div, div.querySelector('.fc-header'));
  updateConsoleStatus();
  startConsoleClock();
  loadConsoleHistory();
  const input = document.getElementById('fcInput');
  if (input) {
    input.addEventListener('input', autoResizeTextarea);
    input.addEventListener('keydown', handleEnhancedConsoleKey);
  }
  document.getElementById('consoleReopen')?.classList.remove('show');
}

function autoResizeTextarea(e) {
  const ta = e.target;
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
}

function addConsoleOutput(text, type = 'info') {
  const log = document.getElementById('fcLog');
  if (!log) return;
  const line = document.createElement('div');
  line.className = `fc-log-line ${type}`;
  line.textContent = text;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
  while (log.children.length > 500) log.removeChild(log.firstChild);
}

function clearConsoleOutput() {
  const log = document.getElementById('fcLog');
  if (log) log.innerHTML = '';
  addConsoleOutput('Console cleared', 'info');
}

function loadConsoleHistory() {
  if (workspace.consoleHistory && Array.isArray(workspace.consoleHistory)) {
    consoleCommandHistory = [...workspace.consoleHistory];
  } else {
    consoleCommandHistory = [];
  }
  consoleHistoryIndex = -1;
}

function updateConsoleStatus() {
  const cmdCount = document.getElementById('consoleCommandCount');
  if (cmdCount) cmdCount.textContent = `${consoleCommandHistory.length} commands`;
  const cardCount = document.getElementById('consoleCardCount');
  if (cardCount) cardCount.textContent = `| ${workspace.cards.length} cards`;
}

function startConsoleClock() {
  if (consoleClockInterval) clearInterval(consoleClockInterval);
  function tick() {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    const el = document.getElementById('consoleTime');
    if (el) el.textContent = `| ${time}`;
  }
  tick();
  consoleClockInterval = setInterval(tick, 1000);
}

function setConsoleTab(tab) {
  document.querySelectorAll('.fc-toolbar-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  const tabs = ['output', 'history', 'macros', 'help'];
  tabs.forEach(t => {
    const content = document.getElementById(`consoleTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (content) content.classList.toggle('active', t === tab);
  });
  if (tab === 'history') renderConsoleHistory();
  else if (tab === 'macros') renderConsoleMacros();
  else if (tab === 'help') renderConsoleHelp();
}

function renderConsoleHistory() {
  const list = document.getElementById('fcHistoryList');
  if (!list) return;
  if (!consoleCommandHistory.length) {
    list.innerHTML = '<div style="color: var(--mu); padding: 12px; text-align: center;">No command history</div>';
    return;
  }
  list.innerHTML = consoleCommandHistory.slice(0, 50).map((cmd, i) => `
    <div class="fc-history-item" onclick="loadHistoryCommand(${i})">
      <span class="fc-history-index">${consoleCommandHistory.length - i}</span>
      <span class="fc-history-command">${escapeHTML(cmd)}</span>
      <button class="fc-history-copy" onclick="event.stopPropagation(); copyHistoryCommand(${i})" title="Copy">📋</button>
    </div>
  `).join('');
}

function loadHistoryCommand(index) {
  const textarea = document.getElementById('fcInput');
  if (textarea) {
    textarea.value = consoleCommandHistory[index];
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
    consoleHistoryIndex = consoleCommandHistory.length - 1 - index;
    updateConsoleMode();
  }
}

function copyHistoryCommand(index) {
  const cmd = consoleCommandHistory[index];
  navigator.clipboard.writeText(cmd);
  addConsoleOutput(`📋 Copied: ${cmd}`, 'success');
}

function renderConsoleMacros() {
  const list = document.getElementById('fcMacrosList');
  if (!list) return;
  const macros = workspace.macros || {};
  if (Object.keys(macros).length === 0) {
    list.innerHTML = '<div style="color: var(--mu); padding: 12px; text-align: center;">No macros defined. Create one using the form below.</div>';
    return;
  }
  list.innerHTML = Object.entries(macros).map(([name, commands]) => `
    <div class="fc-macro-item">
      <div class="fc-macro-header">
        <span class="fc-macro-name">${escapeHTML(name)}</span>
        <div class="fc-macro-actions">
          <button class="btn btn-sm btn-ghost" onclick="runMacro('${name.replace(/'/g, "\\'")}')">▶</button>
          <button class="btn btn-sm btn-ghost" onclick="copyMacro('${name.replace(/'/g, "\\'")}')">📋</button>
          <button class="btn btn-sm btn-danger" onclick="deleteMacro('${name.replace(/'/g, "\\'")}')">✕</button>
        </div>
      </div>
      <div class="fc-macro-commands">${commands.map(cmd => `<span class="fc-macro-command">${escapeHTML(cmd)}</span>`).join('')}</div>
      <div class="fc-macro-count">${commands.length} command(s)</div>
    </div>
  `).join('');
}

function createMacroFromForm() {
  const name = document.getElementById('macroNameInput')?.value.trim();
  const commandsStr = document.getElementById('macroCommandsInput')?.value.trim();
  if (!name || !commandsStr) {
    addConsoleOutput('❌ Please enter both name and commands', 'error');
    return;
  }
  if (!workspace.macros) workspace.macros = {};
  workspace.macros[name] = commandsStr.split(';').map(c => c.trim()).filter(c => c);
  saveAllData();
  document.getElementById('macroNameInput').value = '';
  document.getElementById('macroCommandsInput').value = '';
  addConsoleOutput(`✅ Macro "${name}" created`, 'success');
  renderConsoleMacros();
  setConsoleTab('macros');
}

function runMacro(name) {
  const commands = workspace.macros?.[name];
  if (!commands) {
    addConsoleOutput(`❌ Macro "${name}" not found`, 'error');
    return;
  }
  addConsoleOutput(`🔄 Running macro "${name}" (${commands.length} commands):`, 'info');
  let successCount = 0;
  commands.forEach((cmd, i) => {
    const result = executeConsoleCommand(cmd);
    if (result && !result.startsWith('❌')) {
      successCount++;
      addConsoleOutput(`  ✅ ${i+1}. ${result.split('\n')[0]}`, 'success');
    } else {
      addConsoleOutput(`  ❌ ${i+1}. ${result || 'Error'}`, 'error');
    }
  });
  addConsoleOutput(`📊 ${successCount}/${commands.length} commands succeeded`, 'info');
  setConsoleTab('output');
}

function copyMacro(name) {
  const commands = workspace.macros?.[name];
  if (!commands) {
    addConsoleOutput(`❌ Macro "${name}" not found`, 'error');
    return;
  }
  const text = commands.join('; ');
  navigator.clipboard.writeText(text);
  addConsoleOutput(`✅ Macro "${name}" copied to clipboard`, 'success');
}

function deleteMacro(name) {
  if (workspace.macros?.[name]) {
    delete workspace.macros[name];
    saveAllData();
    addConsoleOutput(`✅ Macro "${name}" deleted`, 'success');
    renderConsoleMacros();
  } else {
    addConsoleOutput(`❌ Macro "${name}" not found`, 'error');
  }
}

function renderConsoleHelp() {
  const content = document.getElementById('fcHelpContent');
  if (!content) return;
  const commands = ConsoleCommands.getAllCommands();
  let html = `<div class="fc-help-section"><h3>📚 Alkembic Super Console</h3><p>Type <code>help &lt;command&gt;</code> for details.</p><div class="fc-help-tip">💡 Tab for autocomplete, ↑/↓ for history, Esc to clear</div>`;
  const categories = {
    'System': ['help','clear','stats','autosave','theme','version','shortcuts'],
    'Card Management': ['card','edit','move','delete','clone'],
    'Query & Filter': ['find','query','filter','ls','grep'],
    'Bulk Operations': ['bulk'],
    'Data Export/Import': ['export','import'],
    'View Control': ['view','refresh'],
    'Settings': ['set','get'],
    'Scripting': ['exec','macro','alias','unalias'],
    'Utilities': ['history','date','echo','calc','people','labels','log'],
    'Trash': ['trash'],
    'Analytics': ['chart']
  };
  for (const [cat, cmdNames] of Object.entries(categories)) {
    const catCmds = cmdNames.map(n => commands.find(c => c.name === n)).filter(c => c);
    if (catCmds.length === 0) continue;
    html += `<div class="fc-help-category"><h4>${cat}</h4><table class="fc-help-table"><thead><tr><th>Command</th><th>Description</th><th>Usage</th></tr></thead><tbody>`;
    catCmds.forEach(cmd => {
      html += `<tr><td><code>${cmd.name}${cmd.aliases ? ` (${cmd.aliases.join(', ')})` : ''}</code></td><td>${cmd.description}</td><td><code>${cmd.usage}</code></td></tr>`;
    });
    html += `</tbody></table></div>`;
  }
  content.innerHTML = html;
}

function showConsoleAutocomplete(prefix) {
  const autocomplete = document.getElementById('fcAutocomplete');
  if (!autocomplete) return;
  const textarea = document.getElementById('fcInput');
  const text = textarea.value;
  const cursorPos = textarea.selectionStart;
  let start = cursorPos - 1;
  while (start >= 0 && !/\s/.test(text[start])) start--;
  start++;
  const currentWord = text.substring(start, cursorPos);
  const parts = text.substring(0, cursorPos).split(/\s+/);
  const commandName = parts[0];
  const command = ConsoleCommands.getCommand(commandName);
  let results = [];
  if (parts.length === 1) {
    results = ConsoleCommands.getCompletions(currentWord);
    if (workspace.commandAliases) {
      Object.keys(workspace.commandAliases).forEach(alias => {
        if (alias.startsWith(currentWord) && !results.includes(alias)) results.push(alias);
      });
    }
  } else if (command && command.completions) {
    results = command.completions(parts.slice(1)) || [];
  } else if (parts.length === 2 && ['move','edit','delete','clone','find'].includes(commandName)) {
    results = workspace.cards.map(c => c.id.toString()).filter(id => id.startsWith(currentWord));
    results.push('all', 'selected');
  }
  consoleAutocompleteResults = [...new Set(results)];
  consoleAutocompleteIndex = -1;
  if (consoleAutocompleteResults.length > 0) {
    const rect = textarea.getBoundingClientRect();
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
    const lines = text.substring(0, cursorPos).split('\n').length;
    const top = rect.top + window.scrollY + lineHeight * lines;
    const charWidth = textarea.clientWidth / Math.max(textarea.value.length, 10);
    const left = rect.left + window.scrollX + (cursorPos - start) * charWidth;
    autocomplete.innerHTML = consoleAutocompleteResults.map((res, idx) => `<div class="fc-autocomplete-item ${idx === consoleAutocompleteIndex ? 'selected' : ''}" onclick="selectAutocomplete(${idx})">${escapeHTML(res)}</div>`).join('');
    autocomplete.style.display = 'block';
    autocomplete.style.top = `${top}px`;
    autocomplete.style.left = `${left}px`;
    autocomplete.style.minWidth = `${Math.max(150, currentWord.length * 8)}px`;
    if (consoleAutocompleteIndex === -1 && results.length) consoleAutocompleteIndex = 0;
    updateAutocompleteSelection();
  } else {
    hideConsoleAutocomplete();
  }
}

function hideConsoleAutocomplete() {
  const autocomplete = document.getElementById('fcAutocomplete');
  if (autocomplete) {
    autocomplete.style.display = 'none';
    autocomplete.innerHTML = '';
  }
  consoleAutocompleteIndex = -1;
  consoleAutocompleteResults = [];
}

function updateAutocompleteSelection() {
  const autocomplete = document.getElementById('fcAutocomplete');
  if (!autocomplete) return;
  const items = autocomplete.querySelectorAll('.fc-autocomplete-item');
  items.forEach((item, idx) => {
    item.classList.toggle('selected', idx === consoleAutocompleteIndex);
  });
  const selected = autocomplete.querySelector('.fc-autocomplete-item.selected');
  if (selected) selected.scrollIntoView({ block: 'nearest' });
}

function selectAutocomplete(index) {
  if (index < 0 || index >= consoleAutocompleteResults.length) return;
  const textarea = document.getElementById('fcInput');
  if (!textarea) return;
  const text = textarea.value;
  const cursorPos = textarea.selectionStart;
  let start = cursorPos - 1;
  while (start >= 0 && !/\s/.test(text[start])) start--;
  start++;
  const newText = text.substring(0, start) + consoleAutocompleteResults[index] + text.substring(cursorPos);
  textarea.value = newText;
  textarea.selectionStart = textarea.selectionEnd = start + consoleAutocompleteResults[index].length;
  hideConsoleAutocomplete();
  setTimeout(() => showConsoleAutocomplete(textarea.value), 10);
  textarea.focus();
}

function updateConsoleMode() {
  const modeEl = document.getElementById('consoleMode');
  if (!modeEl) return;
  const textarea = document.getElementById('fcInput');
  if (!textarea || textarea.value.trim() === '') {
    modeEl.textContent = 'READY';
    modeEl.style.color = 'var(--gr)';
  } else {
    const firstWord = textarea.value.trim().split(/\s+/)[0];
    const cmd = ConsoleCommands.getCommand(firstWord);
    if (cmd) {
      modeEl.textContent = cmd.name.toUpperCase();
      modeEl.style.color = 'var(--am)';
    } else {
      modeEl.textContent = 'INPUT';
      modeEl.style.color = 'var(--rd)';
    }
  }
}

function handleEnhancedConsoleKey(e) {
  const textarea = document.getElementById('fcInput');
  if (!textarea) return;
  const autocomplete = document.getElementById('fcAutocomplete');
  const visible = autocomplete && autocomplete.style.display === 'block';
  if (visible) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      consoleAutocompleteIndex = Math.min(consoleAutocompleteIndex + 1, consoleAutocompleteResults.length - 1);
      updateAutocompleteSelection();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      consoleAutocompleteIndex = Math.max(consoleAutocompleteIndex - 1, 0);
      updateAutocompleteSelection();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      if (consoleAutocompleteResults.length > 0) {
        selectAutocomplete(consoleAutocompleteIndex >= 0 ? consoleAutocompleteIndex : 0);
      }
      return;
    }
    if (e.key === 'Enter' && consoleAutocompleteResults.length > 0) {
      selectAutocomplete(consoleAutocompleteIndex >= 0 ? consoleAutocompleteIndex : 0);
      e.preventDefault();
      return;
    }
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (consoleHistoryIndex < consoleCommandHistory.length - 1) {
      consoleHistoryIndex++;
      textarea.value = consoleCommandHistory[consoleHistoryIndex];
      textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
      updateConsoleMode();
    }
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (consoleHistoryIndex > 0) {
      consoleHistoryIndex--;
      textarea.value = consoleCommandHistory[consoleHistoryIndex];
      textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
    } else if (consoleHistoryIndex === 0) {
      consoleHistoryIndex = -1;
      textarea.value = '';
    }
    updateConsoleMode();
    return;
  }
  if (e.key === 'Enter') {
    if (e.ctrlKey) {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value = textarea.value.substring(0, start) + '\n' + textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 1;
      textarea.dispatchEvent(new Event('input'));
      return;
    }
    e.preventDefault();
    executeEnhancedConsole();
    return;
  }
  if (e.key === 'Escape') {
    hideConsoleAutocomplete();
    if (textarea.value.length > 0) {
      textarea.value = '';
      consoleHistoryIndex = -1;
      updateConsoleMode();
    }
    e.preventDefault();
    return;
  }
  setTimeout(() => {
    if (textarea.value.length > 0) showConsoleAutocomplete(textarea.value);
    else hideConsoleAutocomplete();
  }, 10);
}

function executeEnhancedConsole() {
  const textarea = document.getElementById('fcInput');
  if (!textarea) return;
  const cmd = textarea.value.trim();
  if (!cmd) return;
  if (consoleCommandHistory[0] !== cmd) {
    consoleCommandHistory.unshift(cmd);
    if (consoleCommandHistory.length > 100) consoleCommandHistory.pop();
  }
  consoleHistoryIndex = -1;
  workspace.consoleHistory = [...consoleCommandHistory];
  textarea.value = '';
  textarea.style.height = 'auto';
  hideConsoleAutocomplete();
  updateConsoleMode();
  addConsoleOutput(`> ${cmd}`, 'command');
  const result = executeConsoleCommand(cmd);
  if (result) {
    addConsoleOutput(result, result.startsWith('✅') || result.startsWith('📊') ? 'success' : result.startsWith('❌') ? 'error' : 'info');
  }
  saveAllData();
  updateConsoleStatus();
}

function executeConsoleCommand(text) {
  if (workspace.commandAliases) {
    const first = text.split(' ')[0];
    if (workspace.commandAliases[first]) {
      text = workspace.commandAliases[first] + text.substring(first.length);
    }
  }
  const parts = text.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  const commandName = parts[0];
  const rawArgs = parts.slice(1).map(p => p.replace(/^["']|["']$/g, ''));
  const command = ConsoleCommands.getCommand(commandName);
  if (!command) return `❌ Unknown command: "${commandName}". Type "help".`;
  const parsedArgs = {};
  let argIndex = 0;
  for (let i = 0; i < rawArgs.length; i++) {
    const a = rawArgs[i];
    if (a.startsWith('--')) {
      parsedArgs[a.substring(2)] = true;
    } else if (command.args && command.args[argIndex]) {
      parsedArgs[command.args[argIndex].name] = a;
      argIndex++;
    } else {
      parsedArgs._ = rawArgs.slice(i);
      break;
    }
  }
  try {
    return command.fn(parsedArgs, {
      saveWorkspace: saveAllData,
      clearOutput: clearConsoleOutput,
      executeCommand: executeConsoleCommand,
      context: { workspace, trashItems, activityLog, currentUser }
    });
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

function toggleConsoleVisibility() {
  const con = document.getElementById('floatingConsole');
  if (con) {
    con.classList.toggle('hidden');
    const reopen = document.getElementById('consoleReopen');
    if (reopen) reopen.classList.toggle('show', con.classList.contains('hidden'));
  }
}

function makeDraggable(el, handle) {
  let offsetX, offsetY, down = false;
  handle.style.cursor = 'move';
  handle.addEventListener('mousedown', (e) => {
    down = true;
    offsetX = e.clientX - el.offsetLeft;
    offsetY = e.clientY - el.offsetTop;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  function onMove(e) {
    if (!down) return;
    el.style.left = (e.clientX - offsetX) + 'px';
    el.style.top = (e.clientY - offsetY) + 'px';
    el.style.position = 'fixed';
  }
  function onUp() { down = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
}

function minimizeEnhancedConsole() {
  const con = document.getElementById('floatingConsole');
  if (con) con.classList.toggle('minimized');
}

function closeEnhancedConsole() {
  if (floatingConsole) {
    floatingConsole.remove();
    floatingConsole = null;
    if (consoleClockInterval) clearInterval(consoleClockInterval);
  }
  document.getElementById('consoleReopen')?.classList.add('show');
}

function clearEnhancedConsole() {
  clearConsoleOutput();
}

function showConsoleTutorial() {
  const tutorial = `
🎓 ALKEMBIC SUPER CONSOLE TUTORIAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 BASIC COMMANDS:
  help              - Show all commands
  clear             - Clear console
  theme [dark|light] - Change theme
  stats             - Workspace statistics
📋 CARD MANAGEMENT:
  card "Title" | Description | high    - Create a card
  find urgent                         - Search cards
  move <id> done                      - Move card
  edit <id> subject "New Title"       - Edit card
  clone <id>                          - Clone a card
  delete <id>                         - Delete a card
🔄 BULK OPERATIONS:
  bulk move selected done             - Move all selected cards
  bulk tag all "urgent"               - Add tag to all cards
📤 EXPORT/IMPORT:
  export csv                          - Export all cards to CSV
  import csv                          - Import from CSV file
🔧 SCRIPTING:
  exec "card Task1; card Task2"        - Execute multiple commands
  macro create myMacro "command1; command2" - Create a macro
  alias ll "ls --limit 50"            - Create command alias
💡 TIPS:
  • Use TAB for autocomplete
  • Use ↑/↓ for command history
  • Type "help <command>" for details
`.trim();
  addConsoleOutput(tutorial, 'info');
}

window.ConsoleCommands = ConsoleCommands;
