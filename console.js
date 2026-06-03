// =============================================
// ALKEMBIC ACE - SUPER CONSOLE ENHANCEMENT v2.0
// Transforming the console into the USP of the app
// =============================================

/* =============================
   CONSOLE COMMAND REGISTRY
   =============================
   Central registry for all console commands with:
   - Command metadata (name, description, usage, aliases)
   - Argument parsing and validation
   - Help text generation
   - Tab completion support
   ============================= */

const ConsoleCommands = {
  // System commands
  commands: new Map(),
  aliases: new Map(),
  
  register(name, config) {
    this.commands.set(name, config);
    (config.aliases || []).forEach(alias => this.aliases.set(alias, name));
  },
  
  getCommand(name) {
    return this.commands.get(name) || this.commands.get(this.aliases.get(name));
  },
  
  getAllCommands() {
    return Array.from(this.commands.values());
  },
  
  getCompletions(prefix) {
    const results = [];
    this.commands.forEach((cmd, name) => {
      if (name.startsWith(prefix)) results.push(name);
    });
    this.aliases.forEach((target, alias) => {
      if (alias.startsWith(prefix) && !this.commands.has(alias)) {
        results.push(alias);
      }
    });
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
  fn: (args, context) => {
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
  completions: (args) => {
    if (args.length === 1) return ConsoleCommands.getCompletions(args[0]);
    return [];
  }
});

ConsoleCommands.register('clear', {
  description: 'Clear the console output',
  usage: 'clear',
  aliases: ['cls', 'clean'],
  fn: (args, context) => {
    context.clearOutput();
    return '';
  }
});

ConsoleCommands.register('theme', {
  description: 'Change application theme',
  usage: 'theme [dark|light|toggle]',
  args: [{ name: 'mode', optional: true, description: 'Theme mode: dark, light, or toggle' }],
  fn: (args, context) => {
    const mode = args.mode || 'toggle';
    if (mode === 'toggle') {
      workspace.settings.theme = workspace.settings.theme === 'dark' ? 'light' : 'dark';
    } else if (['dark', 'light'].includes(mode)) {
      workspace.settings.theme = mode;
    } else {
      return `❌ Invalid theme: ${mode}. Use dark, light, or toggle.`;
    }
    applySettings();
    context.saveWorkspace();
    return `✅ Theme set to: ${workspace.settings.theme}`;
  },
  completions: () => ['dark', 'light', 'toggle']
});

ConsoleCommands.register('stats', {
  description: 'Display workspace statistics',
  usage: 'stats [detailed]',
  args: [{ name: 'detailed', optional: true, description: 'Show detailed statistics' }],
  fn: (args, context) => {
    const cards = workspace.cards;
    const byStatus = { todo: 0, 'in-progress': 0, done: 0 };
    const byPriority = { critical: 0, high: 0, medium: 0, low: 0 };
    cards.forEach(c => {
      byStatus[c.column] = (byStatus[c.column] || 0) + 1;
      byPriority[c.priority] = (byPriority[c.priority] || 0) + 1;
    });
    
    let output = `📊 Workspace Statistics\n`;
    output += `━━━━━━━━━━━━━━━━━━━━\n`;
    output += `Total Cards:    ${cards.length}\n`;
    output += `Done:           ${byStatus.done || 0} (${Math.round((byStatus.done || 0) / Math.max(cards.length, 1) * 100)}%)\n`;
    output += `In Progress:    ${byStatus['in-progress'] || 0}\n`;
    output += `To Do:          ${byStatus.todo || 0}\n\n`;
    output += `By Priority:\n`;
    output += `  🔴 Critical:   ${byPriority.critical}\n`;
    output += `  🟠 High:       ${byPriority.high}\n`;
    output += `  🟡 Medium:     ${byPriority.medium}\n`;
    output += `  🟢 Low:        ${byPriority.low}\n`;
    
    if (args.detailed) {
      output += `\n📈 Detailed Breakdown:\n`;
      output += `Imported Data:  ${workspace.importedData.length}\n`;
      output += `Events:         ${workspace.events.length}\n`;
      output += `Trash Items:    ${trashItems.length}\n`;
      output += `Activity Log:   ${activityLog.length}\n`;
    }
    
    return output;
  },
  completions: () => ['detailed']
});

ConsoleCommands.register('autosave', {
  description: 'Toggle autosave or save manually',
  usage: 'autosave [on|off|now]',
  args: [{ name: 'action', optional: true, description: 'on, off, or now' }],
  fn: (args, context) => {
    const action = args.action || 'toggle';
    if (action === 'on') {
      startAutosave();
      return '✅ Autosave enabled';
    } else if (action === 'off') {
      stopAutosave();
      return '✅ Autosave disabled';
    } else if (action === 'now' || action === 'toggle') {
      if (action === 'toggle') {
        if (autosaveInterval) stopAutosave();
        else startAutosave();
      }
      context.saveWorkspace();
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
  fn: (args, context) => {
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
    context.saveWorkspace();
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
  fn: (args, context) => {
    const card = workspace.cards.find(c => c.id == args.id);
    if (!card) return `❌ Card with ID ${args.id} not found.`;
    
    const fieldMap = {
      'subject': 'subject',
      'desc': 'description',
      'description': 'description',
      'priority': 'priority',
      'column': 'column',
      'status': 'column',
      'start': 'startDate',
      'end': 'endDate',
      'progress': 'progress',
      'points': 'storyPoints'
    };
    
    const field = fieldMap[args.field];
    if (!field) return `❌ Unknown field: ${args.field}`;
    
    let value = args.value;
    if (field === 'progress' || field === 'storyPoints') {
      value = parseInt(value);
      if (isNaN(value)) return `❌ Invalid number: ${args.value}`;
    }
    
    card[field] = value;
    context.saveWorkspace();
    renderKanban();
    logActivity('card', `Edited "${card.subject}" via console`);
    return `✅ Updated card ${args.id}: ${field} = ${value}`;
  },
  completions: (args) => {
    if (args.length === 1) {
      // Return card IDs
      return workspace.cards.map(c => c.id.toString()).filter(id => id.startsWith(args[0]));
    }
    if (args.length === 2) {
      return ['subject', 'desc', 'description', 'priority', 'column', 'status', 'start', 'end', 'progress', 'points']
        .filter(f => f.startsWith(args[1]));
    }
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
  fn: (args, context) => {
    const validColumns = ['todo', 'in-progress', 'done'];
    if (!validColumns.includes(args.column)) {
      return `❌ Invalid column: ${args.column}. Use: ${validColumns.join(', ')}`;
    }
    
    let cards = [];
    if (args.target === 'all') {
      cards = workspace.cards;
    } else if (args.target === 'selected' && selectedCardIds.size > 0) {
      cards = workspace.cards.filter(c => selectedCardIds.has(c.id));
    } else {
      const card = workspace.cards.find(c => c.id == args.target);
      if (!card) return `❌ Card with ID ${args.target} not found.`;
      cards = [card];
    }
    
    cards.forEach(c => {
      c.column = args.column;
      logActivity('move', `Moved "${c.subject}" → ${args.column} via console`);
    });
    
    context.saveWorkspace();
    renderKanban();
    return `✅ Moved ${cards.length} card(s) to ${args.column}`;
  },
  completions: (args) => {
    if (args.length === 1) {
      const results = ['all', 'selected'];
      workspace.cards.forEach(c => results.push(c.id.toString()));
      return results.filter(r => r.startsWith(args[0]));
    }
    if (args.length === 2) {
      return ['todo', 'in-progress', 'done'].filter(c => c.startsWith(args[1]));
    }
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
  fn: async (args, context) => {
    let cards = [];
    if (args.target === 'all') {
      if (!args.force) {
        return `⚠️  Use --force to delete ALL cards: delete all --force`;
      }
      cards = [...workspace.cards];
    } else if (args.target === 'selected') {
      if (selectedCardIds.size === 0) return `❌ No cards selected.`;
      cards = workspace.cards.filter(c => selectedCardIds.has(c.id));
    } else {
      const card = workspace.cards.find(c => c.id == args.target);
      if (!card) return `❌ Card with ID ${args.target} not found.`;
      cards = [card];
    }
    
    if (!args.force && cards.length > 3) {
      return `⚠️  About to delete ${cards.length} cards. Use --force to confirm.`;
    }
    
    cards.forEach(c => {
      trashItems.push({ type: 'card', content: c, deletedAt: new Date().toISOString() });
      logActivity('delete', `Deleted "${c.subject}" via console`);
    });
    
    workspace.cards = workspace.cards.filter(c => !cards.includes(c));
    context.saveWorkspace();
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
    if (args.length === 2 && args[0] === 'all') {
      return ['--force'].filter(f => f.startsWith(args[1]));
    }
    return [];
  }
});

ConsoleCommands.register('clone', {
  description: 'Clone a card',
  usage: 'clone <id> [new_subject]',
  args: [
    { name: 'id', required: true, description: 'Card ID to clone' },
    { name: 'new_subject', optional: true, description: 'New subject for the clone' }
  ],
  fn: (args, context) => {
    const card = workspace.cards.find(c => c.id == args.id);
    if (!card) return `❌ Card with ID ${args.id} not found.`;
    
    const copy = JSON.parse(JSON.stringify(card));
    copy.id = Date.now() + Math.floor(Math.random() * 1000);
    copy.subject = args.new_subject || card.subject + ' (Copy)';
    copy.comments = [];
    
    workspace.cards.push(copy);
    context.saveWorkspace();
    renderKanban();
    logActivity('card', `Cloned "${card.subject}" via console`);
    
    return `✅ Cloned card: "${copy.subject}" (ID: ${copy.id})`;
  },
  completions: (args) => {
    if (args.length === 1) {
      return workspace.cards.map(c => c.id.toString()).filter(id => id.startsWith(args[0]));
    }
    return [];
  }
});

ConsoleCommands.register('find', {
  description: 'Search for cards',
  usage: 'find <query> [--field <field>] [--limit <n>]',
  args: [
    { name: 'query', required: true, description: 'Search query' },
    { name: 'field', optional: true, description: 'Field to search: subject, desc, labels, people, all' },
    { name: 'limit', optional: true, description: 'Maximum results' }
  ],
  fn: (args, context) => {
    const query = args.query.toLowerCase();
    const field = args.field || 'all';
    const limit = parseInt(args.limit) || 20;
    
    const searchFields = field === 'all' ? ['subject', 'description', 'labels', 'people'] : [field];
    
    const results = workspace.cards.filter(card => {
      return searchFields.some(f => {
        if (f === 'people') {
          return card.people?.some(p => 
            p.name.toLowerCase().includes(query) || 
            p.role?.toLowerCase().includes(query)
          );
        }
        if (f === 'labels') {
          return card.labels?.some(l => l.toLowerCase().includes(query));
        }
        return (card[f] || '').toLowerCase().includes(query);
      });
    }).slice(0, limit);
    
    if (results.length === 0) return `🔍 No cards found matching "${query}"`;
    
    let output = `🔍 Found ${results.length} card(s) for "${query}"\n\n`;
    results.forEach((card, i) => {
      output += `${i + 1}. [${card.id}] ${card.subject}\n`;
      output += `   Priority: ${card.priority} | Column: ${card.column}\n`;
      if (card.description) {
        output += `   Description: ${card.description.slice(0, 60)}${card.description.length > 60 ? '...' : ''}\n`;
      }
      output += `\n`;
    });
    
    if (results.length >= limit) {
      output += `... and ${workspace.cards.length - limit} more. Use --limit to see more.\n`;
    }
    
    return output;
  },
  completions: (args) => {
    if (args.length === 1) return []; // No completions for query
    if (args.length === 2 && args[0] === '--field') {
      return ['subject', 'desc', 'description', 'labels', 'people', 'all'].filter(f => f.startsWith(args[1]));
    }
    if (args.length === 2 && args[0] === '--limit') return [];
    return [];
  }
});

// --- Query Language Commands ---
ConsoleCommands.register('query', {
  description: 'Advanced card querying with filters',
  usage: 'query [filters] [--sort <field>] [--limit <n>]',
  args: [
    { name: 'filters', optional: true, description: 'Filter expression e.g., priority:high column:done' },
    { name: 'sort', optional: true, description: 'Sort field' },
    { name: 'limit', optional: true, description: 'Maximum results' }
  ],
  fn: (args, context) => {
    let cards = [...workspace.cards];
    const limit = parseInt(args.limit) || 20;
    
    // Parse filters
    if (args.filters) {
      const filters = args.filters.match(/(\w+):(\w+)/g) || [];
      filters.forEach(filter => {
        const [key, value] = filter.split(':');
        cards = cards.filter(card => {
          if (key === 'priority') return card.priority === value;
          if (key === 'column') return card.column === value;
          if (key === 'status') return card.column === value;
          if (key === 'label') return card.labels?.includes(value);
          if (key === 'person') return card.people?.some(p => p.name === value);
          return true;
        });
      });
    }
    
    // Sort
    if (args.sort) {
      const sortField = args.sort;
      cards.sort((a, b) => {
        const aVal = a[sortField] || '';
        const bVal = b[sortField] || '';
        return aVal.toString().localeCompare(bVal.toString());
      });
    }
    
    // Limit
    cards = cards.slice(0, limit);
    
    if (cards.length === 0) return `🔍 No cards match the query`;
    
    let output = `📋 Query Results (${cards.length} cards)\n\n`;
    cards.forEach((card, i) => {
      output += `${i + 1}. [${card.id}] ${card.subject}\n`;
      output += `   📌 ${card.priority.padEnd(8)} | ${card.column.padEnd(12)} | SP: ${card.storyPoints} | Progress: ${card.progress}%\n`;
      if (card.startDate || card.endDate) {
        output += `   📅 ${card.startDate || '—'} → ${card.endDate || '—'}\n`;
      }
      output += `\n`;
    });
    
    return output;
  },
  completions: (args) => {
    if (args.length === 1) {
      return ['priority:', 'column:', 'status:', 'label:', 'person:', '--sort', '--limit']
        .filter(f => f.startsWith(args[0]));
    }
    return [];
  }
});

ConsoleCommands.register('filter', {
  description: 'Filter cards by criteria (interactive)',
  usage: 'filter [priority|column|label|person] [value]',
  args: [
    { name: 'field', optional: true, description: 'Field to filter by' },
    { name: 'value', optional: true, description: 'Value to match' }
  ],
  fn: (args, context) => {
    if (!args.field) {
      // Show filter options
      return `🔧 Available filters:\n` +
        `  priority: critical, high, medium, low\n` +
        `  column: todo, in-progress, done\n` +
        `  label: <label name>\n` +
        `  person: <person name>\n` +
        `\nExample: filter priority high`;
    }
    
    const field = args.field;
    const value = args.value;
    
    if (!value) {
      // List possible values
      if (field === 'priority') {
        return `Available priorities: critical, high, medium, low`;
      }
      if (field === 'column') {
        return `Available columns: todo, in-progress, done`;
      }
      if (field === 'label') {
        const labels = new Set();
        workspace.cards.forEach(c => c.labels?.forEach(l => labels.add(l)));
        return `Available labels: ${Array.from(labels).join(', ')}`;
      }
      if (field === 'person') {
        const people = new Set();
        workspace.cards.forEach(c => c.people?.forEach(p => people.add(p.name)));
        return `Available people: ${Array.from(people).join(', ')}`;
      }
    }
    
    // Apply filter
    const results = workspace.cards.filter(card => {
      if (field === 'priority') return card.priority === value;
      if (field === 'column') return card.column === value;
      if (field === 'label') return card.labels?.includes(value);
      if (field === 'person') return card.people?.some(p => p.name === value);
      return false;
    });
    
    if (results.length === 0) return `🔍 No cards found with ${field}:${value}`;
    
    let output = `📋 Filtered by ${field}:${value} (${results.length} cards)\n\n`;
    results.forEach((card, i) => {
      output += `${i + 1}. [${card.id}] ${card.subject}\n`;
    });
    
    return output;
  },
  completions: (args) => {
    if (args.length === 1) {
      return ['priority', 'column', 'label', 'person'].filter(f => f.startsWith(args[0]));
    }
    if (args.length === 2) {
      const field = args[0];
      if (field === 'priority') return ['critical', 'high', 'medium', 'low'].filter(v => v.startsWith(args[1]));
      if (field === 'column') return ['todo', 'in-progress', 'done'].filter(v => v.startsWith(args[1]));
      if (field === 'label') {
        const labels = new Set();
        workspace.cards.forEach(c => c.labels?.forEach(l => labels.add(l)));
        return Array.from(labels).filter(l => l.startsWith(args[1]));
      }
      if (field === 'person') {
        const people = new Set();
        workspace.cards.forEach(c => c.people?.forEach(p => people.add(p.name)));
        return Array.from(people).filter(p => p.startsWith(args[1]));
      }
    }
    return [];
  }
});

// --- Bulk Operations ---
ConsoleCommands.register('bulk', {
  description: 'Bulk operations on cards',
  usage: 'bulk <operation> [options]',
  args: [
    { name: 'operation', required: true, description: 'Operation: move, delete, edit, tag, assign' },
    { name: 'options', optional: true, description: 'Operation-specific options' }
  ],
  fn: (args, context) => {
    const operation = args.operation;
    
    if (operation === 'move') {
      // bulk move all|selected to <column>
      const parts = args.options?.split(/\s+/);
      if (!parts || parts.length < 2) {
        return `❌ Usage: bulk move <target> <column>\n   target: all, selected, or filter expression`;
      }
      const target = parts[0];
      const column = parts[1];
      
      let cards = [];
      if (target === 'all') cards = workspace.cards;
      else if (target === 'selected') cards = workspace.cards.filter(c => selectedCardIds.has(c.id));
      else {
        // Try to parse as filter
        return `⚠️  Filter expressions not yet supported. Use "all" or "selected".`;
      }
      
      if (['todo', 'in-progress', 'done'].includes(column)) {
        cards.forEach(c => c.column = column);
        context.saveWorkspace();
        renderKanban();
        return `✅ Moved ${cards.length} cards to ${column}`;
      }
      return `❌ Invalid column: ${column}`;
    }
    
    if (operation === 'delete') {
      const target = args.options?.split(/\s+/)[0] || 'selected';
      let cards = [];
      if (target === 'all') {
        if (!args.options?.includes('--force')) {
          return `⚠️  Use --force to delete all: bulk delete all --force`;
        }
        cards = [...workspace.cards];
      } else if (target === 'selected') {
        cards = workspace.cards.filter(c => selectedCardIds.has(c.id));
      } else {
        return `❌ Invalid target: ${target}. Use all or selected.`;
      }
      
      cards.forEach(c => {
        trashItems.push({ type: 'card', content: c, deletedAt: new Date().toISOString() });
      });
      workspace.cards = workspace.cards.filter(c => !cards.includes(c));
      context.saveWorkspace();
      renderKanban();
      renderTrash();
      return `✅ Deleted ${cards.length} cards`;
    }
    
    if (operation === 'tag') {
      const parts = args.options?.split(/\s+/);
      if (!parts || parts.length < 2) {
        return `❌ Usage: bulk tag <target> <label> [label2 label3...]`;
      }
      const target = parts[0];
      const labels = parts.slice(1);
      
      let cards = [];
      if (target === 'all') cards = workspace.cards;
      else if (target === 'selected') cards = workspace.cards.filter(c => selectedCardIds.has(c.id));
      else return `❌ Invalid target: ${target}`;
      
      cards.forEach(c => {
        c.labels = [...new Set([...(c.labels || []), ...labels])];
      });
      context.saveWorkspace();
      renderKanban();
      return `✅ Added labels to ${cards.length} cards`;
    }
    
    if (operation === 'edit') {
      const parts = args.options?.split(/\s+/);
      if (!parts || parts.length < 3) {
        return `❌ Usage: bulk edit <target> <field> <value>`;
      }
      const target = parts[0];
      const field = parts[1];
      const value = parts.slice(2).join(' ');
      
      let cards = [];
      if (target === 'all') cards = workspace.cards;
      else if (target === 'selected') cards = workspace.cards.filter(c => selectedCardIds.has(c.id));
      else return `❌ Invalid target: ${target}`;
      
      const fieldMap = {
        'priority': 'priority',
        'column': 'column',
        'status': 'column',
        'progress': 'progress',
        'points': 'storyPoints'
      };
      
      const actualField = fieldMap[field] || field;
      if (!actualField) return `❌ Unknown field: ${field}`;
      
      cards.forEach(c => {
        if (actualField === 'progress' || actualField === 'storyPoints') {
          c[actualField] = parseInt(value);
        } else {
          c[actualField] = value;
        }
      });
      context.saveWorkspace();
      renderKanban();
      return `✅ Updated ${field} for ${cards.length} cards`;
    }
    
    return `❌ Unknown operation: ${operation}`;
  },
  completions: (args) => {
    if (args.length === 1) {
      return ['move', 'delete', 'edit', 'tag', 'assign'].filter(o => o.startsWith(args[0]));
    }
    if (args.length === 2) {
      const op = args[0];
      if (op === 'move' || op === 'delete' || op === 'tag' || op === 'edit') {
        return ['all', 'selected'].filter(t => t.startsWith(args[1]));
      }
    }
    return [];
  }
});

// --- Data Export/Import ---
ConsoleCommands.register('export', {
  description: 'Export data from the workspace',
  usage: 'export <type> [options]',
  args: [
    { name: 'type', required: true, description: 'Type: cards, selected, csv, json, ics' },
    { name: 'options', optional: true, description: 'Export options' }
  ],
  fn: (args, context) => {
    const type = args.type;
    
    if (type === 'cards' || type === 'json') {
      const data = workspace.cards;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `alkembic-cards-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      return `✅ Exported ${data.length} cards to JSON`;
    }
    
    if (type === 'selected') {
      const selected = workspace.cards.filter(c => selectedCardIds.has(c.id));
      if (selected.length === 0) return `❌ No cards selected`;
      const blob = new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `alkembic-selected-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      return `✅ Exported ${selected.length} selected cards`;
    }
    
    if (type === 'csv') {
      let csv = 'id,subject,description,priority,column,startDate,endDate,storyPoints,progress,labels,people\n';
      workspace.cards.forEach(c => {
        const labels = (c.labels || []).join(';');
        const people = (c.people || []).map(p => `${p.name}:${p.role}`).join(';');
        csv += `${c.id},"${(c.subject || '').replace(/"/g, '""')}","${(c.description || '').replace(/"/g, '""')}",${c.priority},${c.column},${c.startDate || ''},${c.endDate || ''},${c.storyPoints || 1},${c.progress || 0},"${labels}","${people}"\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `alkembic-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      return `✅ Exported ${workspace.cards.length} cards to CSV`;
    }
    
    if (type === 'ics') {
      const cards = workspace.cards.filter(c => c.startDate && c.endDate);
      if (cards.length === 0) return `❌ No cards with dates to export`;
      let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Alkembic//EN\r\n';
      cards.forEach(c => {
        const start = c.startDate.replace(/-/g, '');
        const endDate = new Date(c.endDate);
        endDate.setDate(endDate.getDate() + 1);
        const end = endDate.toISOString().slice(0, 10).replace(/-/g, '');
        ics += `BEGIN:VEVENT\r\nUID:${c.id}@alkembic\r\nDTSTART;VALUE=DATE:${start}\r\nDTEND;VALUE=DATE:${end}\r\nSUMMARY:${c.subject.replace(/\n/g, ' ')}\r\nEND:VEVENT\r\n`;
      });
      ics += 'END:VCALENDAR';
      const blob = new Blob([ics], { type: 'text/calendar' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `alkembic-calendar.ics`;
      a.click();
      return `✅ Exported ${cards.length} events to ICS`;
    }
    
    if (type === 'workspace' || type === 'all') {
      const payload = { workspace, trashItems, activityLog };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `alkembic-workspace-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      return `✅ Exported complete workspace`;
    }
    
    return `❌ Unknown export type: ${type}`;
  },
  completions: () => ['cards', 'selected', 'csv', 'json', 'ics', 'workspace', 'all']
});

ConsoleCommands.register('import', {
  description: 'Import data into the workspace',
  usage: 'import <type>',
  args: [{ name: 'type', required: true, description: 'Type: cards, csv, xlsx' }],
  fn: (args, context) => {
    const type = args.type;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'csv' ? '.csv' : type === 'xlsx' ? '.xlsx,.xls' : '.json';
    input.style.display = 'none';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          if (type === 'json') {
            const data = JSON.parse(ev.target.result);
            if (Array.isArray(data)) {
              workspace.cards.push(...data);
              context.saveWorkspace();
              renderKanban();
              addFloatingLog(`✅ Imported ${data.length} cards from JSON`, 'success');
            } else if (data.workspace) {
              // Full workspace import
              workspace = { ...workspace, ...data.workspace };
              trashItems = data.trashItems || [];
              activityLog = data.activityLog || [];
              context.saveWorkspace();
              addFloatingLog(`✅ Imported complete workspace`, 'success');
              location.reload();
            }
          } else if (type === 'csv') {
            const lines = ev.target.result.split('\n').filter(l => l.trim());
            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            const cards = lines.slice(1).map(line => {
              const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, '').replace(/"""/g, '"'));
              const card = {};
              headers.forEach((h, i) => {
                if (i < values.length) {
                  if (h === 'id') card.id = parseInt(values[i]) || Date.now();
                  else if (h === 'storyPoints') card.storyPoints = parseInt(values[i]) || 3;
                  else if (h === 'progress') card.progress = parseInt(values[i]) || 0;
                  else card[h] = values[i];
                }
              });
              return card;
            }).filter(c => c.subject);
            workspace.cards.push(...cards);
            context.saveWorkspace();
            renderKanban();
            addFloatingLog(`✅ Imported ${cards.length} cards from CSV`, 'success');
          }
        } catch (e) {
          addFloatingLog(`❌ Import failed: ${e.message}`, 'error');
        }
      };
      
      if (type === 'xlsx') reader.readAsBinaryString(file);
      else reader.readAsText(file);
    };
    
    document.body.appendChild(input);
    input.click();
    setTimeout(() => input.remove(), 1000);
    
    return `📥 Select a ${type} file to import...`;
  },
  completions: () => ['json', 'csv', 'xlsx']
});

// --- View Control ---
ConsoleCommands.register('view', {
  description: 'Switch or control views',
  usage: 'view <command> [options]',
  args: [{ name: 'command', required: true, description: 'View command: switch, refresh, dashboard, board, timeline, analytics, trash' }],
  fn: (args, context) => {
    const command = args.command;
    const validViews = ['dashboard', 'board', 'timeline', 'analytics', 'trash'];
    
    if (command === 'switch' && args.options) {
      if (validViews.includes(args.options)) {
        switchView(args.options);
        return `✅ Switched to ${args.options} view`;
      }
      return `❌ Invalid view: ${args.options}`;
    }
    
    if (validViews.includes(command)) {
      switchView(command);
      return `✅ Switched to ${command} view`;
    }
    
    if (command === 'refresh') {
      renderAllViews();
      return `✅ All views refreshed`;
    }
    
    return `❌ Unknown view command: ${command}`;
  },
  completions: (args) => {
    if (args.length === 1) {
      return ['switch', 'refresh', 'dashboard', 'board', 'timeline', 'analytics', 'trash']
        .filter(c => c.startsWith(args[0]));
    }
    if (args.length === 2 && args[0] === 'switch') {
      return ['dashboard', 'board', 'timeline', 'analytics', 'trash']
        .filter(v => v.startsWith(args[1]));
    }
    return [];
  }
});

ConsoleCommands.register('refresh', {
  description: 'Refresh the current view or all views',
  usage: 'refresh [all]',
  args: [{ name: 'target', optional: true, description: 'Refresh target: current or all' }],
  fn: (args, context) => {
    if (args.target === 'all') {
      renderAllViews();
      return `✅ All views refreshed`;
    }
    // Refresh current view
    const activeView = document.querySelector('.view.active')?.id.replace('view-', '');
    if (activeView) {
      if (activeView === 'dashboard') renderDashboard();
      else if (activeView === 'board') renderKanban();
      else if (activeView === 'timeline') renderTimeline();
      else if (activeView === 'analytics') renderDashboards();
      else if (activeView === 'trash') renderTrash();
      return `✅ ${activeView} view refreshed`;
    }
    return `❌ No active view found`;
  },
  completions: () => ['all']
});

// --- Settings Commands ---
ConsoleCommands.register('set', {
  description: 'Set workspace settings',
  usage: 'set <key> <value>',
  args: [
    { name: 'key', required: true, description: 'Setting key' },
    { name: 'value', required: true, description: 'Setting value' }
  ],
  fn: (args, context) => {
    const key = args.key;
    const value = args.value;
    
    const settingMap = {
      'theme': () => {
        if (['dark', 'light'].includes(value)) {
          workspace.settings.theme = value;
          applySettings();
          return `✅ Theme set to ${value}`;
        }
        return `❌ Invalid theme: ${value}`;
      },
      'font': () => {
        workspace.settings.font = value;
        applySettings();
        return `✅ Font set to ${value}`;
      },
      'accent': () => {
        workspace.settings.accentColor = value;
        applySettings();
        return `✅ Accent color set to ${value}`;
      },
      'autosave': () => {
        const bool = value.toLowerCase();
        if (bool === 'true' || bool === 'on' || bool === '1') {
          workspace.settings.autosave = true;
          startAutosave();
        } else if (bool === 'false' || bool === 'off' || bool === '0') {
          workspace.settings.autosave = false;
          stopAutosave();
        } else {
          return `❌ Invalid autosave value: ${value}. Use true/false, on/off, or 1/0.`;
        }
        return `✅ Autosave set to ${workspace.settings.autosave}`;
      },
      'token': () => {
        if (value.length === 4 && /\d+/.test(value)) {
          workspace.token = value;
          return `✅ Token set to ${value}`;
        }
        return `❌ Token must be 4 digits`;
      },
      'tokenOffset': () => {
        const offset = parseInt(value);
        if (!isNaN(offset) && offset >= -120 && offset <= 120) {
          workspace.settings.tokenOffset = offset;
          return `✅ Token offset set to ${offset} minutes`;
        }
        return `❌ Invalid offset: ${value}. Use a number between -120 and 120.`;
      }
    };
    
    const setter = settingMap[key];
    if (setter) {
      const result = setter();
      context.saveWorkspace();
      return result;
    }
    
    return `❌ Unknown setting: ${key}`;
  },
  completions: (args) => {
    if (args.length === 1) {
      return ['theme', 'font', 'accent', 'autosave', 'token', 'tokenOffset']
        .filter(k => k.startsWith(args[0]));
    }
    return [];
  }
});

ConsoleCommands.register('get', {
  description: 'Get workspace settings or card properties',
  usage: 'get <key> [id]',
  args: [
    { name: 'key', required: true, description: 'Property to get: settings, card' },
    { name: 'id', optional: true, description: 'Card ID (if key is card)' }
  ],
  fn: (args, context) => {
    const key = args.key;
    
    if (key === 'settings') {
      let output = `🔧 Workspace Settings:\n`;
      output += `Theme: ${workspace.settings.theme}\n`;
      output += `Font: ${workspace.settings.font}\n`;
      output += `Accent Color: ${workspace.settings.accentColor}\n`;
      output += `Autosave: ${workspace.settings.autosave}\n`;
      output += `Token Enabled: ${workspace.settings.tokenEnabled}\n`;
      output += `Token Offset: ${workspace.settings.tokenOffset} minutes\n`;
      return output;
    }
    
    if (key === 'card' && args.id) {
      const card = workspace.cards.find(c => c.id == args.id);
      if (!card) return `❌ Card with ID ${args.id} not found.`;
      
      let output = `📋 Card [${card.id}]\n`;
      output += `Subject: ${card.subject}\n`;
      output += `Description: ${card.description || '—'}\n`;
      output += `Priority: ${card.priority}\n`;
      output += `Column: ${card.column}\n`;
      output += `Progress: ${card.progress}%\n`;
      output += `Story Points: ${card.storyPoints}\n`;
      output += `Start Date: ${card.startDate || '—'}\n`;
      output += `End Date: ${card.endDate || '—'}\n`;
      output += `Labels: ${card.labels?.join(', ') || '—'}\n`;
      output += `People: ${card.people?.map(p => `${p.name} (${p.role})`).join(', ') || '—'}\n`;
      return output;
    }
    
    if (key === 'token') {
      return `🕐 Current Token: ${workspace.token}`;
    }
    
    return `❌ Unknown property: ${key}`;
  },
  completions: (args) => {
    if (args.length === 1) {
      return ['settings', 'card', 'token'].filter(k => k.startsWith(args[0]));
    }
    if (args.length === 2 && args[0] === 'card') {
      return workspace.cards.map(c => c.id.toString()).filter(id => id.startsWith(args[1]));
    }
    return [];
  }
});

// --- Scripting Commands ---
ConsoleCommands.register('exec', {
  description: 'Execute multiple commands',
  usage: 'exec <command1> ; <command2> ; ...',
  args: [{ name: 'commands', required: true, description: 'Commands separated by semicolons' }],
  fn: (args, context) => {
    const commands = args.commands.split(';').map(c => c.trim()).filter(c => c);
    if (commands.length === 0) return `❌ No commands provided`;
    
    let output = `🔄 Executing ${commands.length} command(s):\n\n`;
    let successCount = 0;
    
    commands.forEach((cmd, i) => {
      try {
        const result = context.executeCommand(cmd);
        if (result && !result.startsWith('❌')) {
          successCount++;
          output += `✅ Command ${i + 1}: ${result}\n`;
        } else {
          output += `❌ Command ${i + 1}: ${result || 'Error'}\n`;
        }
      } catch (e) {
        output += `❌ Command ${i + 1}: ${e.message}\n`;
      }
    });
    
    output += `\n📊 ${successCount}/${commands.length} commands succeeded`;
    return output;
  }
});

ConsoleCommands.register('macro', {
  description: 'Manage command macros',
  usage: 'macro <action> [name] [commands]',
  args: [
    { name: 'action', required: true, description: 'Action: list, create, delete, run' },
    { name: 'name', optional: true, description: 'Macro name' },
    { name: 'commands', optional: true, description: 'Commands to record' }
  ],
  fn: (args, context) => {
    // Initialize macros storage if not exists
    if (!workspace.macros) workspace.macros = {};
    
    const action = args.action;
    
    if (action === 'list') {
      if (Object.keys(workspace.macros).length === 0) {
        return `📋 No macros defined`;
      }
      let output = `📋 Available Macros:\n\n`;
      Object.entries(workspace.macros).forEach(([name, commands]) => {
        output += `  ${name}: ${commands.length} command(s)\n`;
        output += `    ${commands.join(' ; ')\n`;
      });
      return output;
    }
    
    if (action === 'create' && args.name && args.commands) {
      workspace.macros[args.name] = args.commands.split(';').map(c => c.trim()).filter(c => c);
      context.saveWorkspace();
      return `✅ Macro "${args.name}" created with ${workspace.macros[args.name].length} commands`;
    }
    
    if (action === 'delete' && args.name) {
      if (workspace.macros[args.name]) {
        delete workspace.macros[args.name];
        context.saveWorkspace();
        return `✅ Macro "${args.name}" deleted`;
      }
      return `❌ Macro "${args.name}" not found`;
    }
    
    if (action === 'run' && args.name) {
      const macro = workspace.macros[args.name];
      if (!macro) return `❌ Macro "${args.name}" not found`;
      
      let output = `🔄 Running macro "${args.name}" (${macro.length} commands):\n\n`;
      let successCount = 0;
      
      macro.forEach((cmd, i) => {
        try {
          const result = context.executeCommand(cmd);
          if (result && !result.startsWith('❌')) {
            successCount++;
            output += `✅ ${i + 1}. ${result}\n`;
          } else {
            output += `❌ ${i + 1}. ${result || 'Error'}\n`;
          }
        } catch (e) {
          output += `❌ ${i + 1}. ${e.message}\n`;
        }
      });
      
      output += `\n📊 ${successCount}/${macro.length} commands succeeded`;
      return output;
    }
    
    return `❌ Invalid macro action: ${action}`;
  },
  completions: (args) => {
    if (args.length === 1) {
      return ['list', 'create', 'delete', 'run'].filter(a => a.startsWith(args[0]));
    }
    if (args.length === 2) {
      const action = args[0];
      if (action === 'create' || action === 'delete' || action === 'run') {
        return Object.keys(workspace.macros || {}).filter(n => n.startsWith(args[1]));
      }
    }
    return [];
  }
});

// --- Time/Date Commands ---
ConsoleCommands.register('date', {
  description: 'Display or work with dates',
  usage: 'date [format]',
  args: [{ name: 'format', optional: true, description: 'Date format: today, tomorrow, yesterday, or ISO date' }],
  fn: (args, context) => {
    const now = new Date();
    
    if (!args.format || args.format === 'today') {
      return now.toISOString().slice(0, 10);
    }
    
    if (args.format === 'tomorrow') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().slice(0, 10);
    }
    
    if (args.format === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().slice(0, 10);
    }
    
    if (args.format === 'now') {
      return now.toISOString();
    }
    
    if (args.format === 'time') {
      return now.toLocaleTimeString();
    }
    
    // Try to parse as date
    const parsed = new Date(args.format);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    
    return `❌ Invalid date format: ${args.format}`;
  },
  completions: () => ['today', 'tomorrow', 'yesterday', 'now', 'time']
});

// --- Utility Commands ---
ConsoleCommands.register('echo', {
  description: 'Echo text back',
  usage: 'echo <text>',
  args: [{ name: 'text', required: true, description: 'Text to echo' }],
  fn: (args, context) => args.text
});

ConsoleCommands.register('calc', {
  description: 'Simple calculator',
  usage: 'calc <expression>',
  args: [{ name: 'expression', required: true, description: 'Mathematical expression' }],
  fn: (args, context) => {
    try {
      // Sanitize expression
      const sanitized = args.expression.replace(/[^0-9+\-*/().x\s]/gi, '');
      if (sanitized !== args.expression) {
        return `⚠️  Expression sanitized. Result: ${Function('"use strict"; return (' + sanitized + ')')()}`;
      }
      const result = Function('"use strict"; return (' + args.expression + ')')();
      return `= ${result}`;
    } catch (e) {
      return `❌ Invalid expression: ${e.message}`;
    }
  }
});

ConsoleCommands.register('alias', {
  description: 'Create command aliases',
  usage: 'alias <name> <command>',
  args: [
    { name: 'name', required: true, description: 'Alias name' },
    { name: 'command', required: true, description: 'Command to alias' }
  ],
  fn: (args, context) => {
    // Initialize aliases storage if not exists
    if (!workspace.commandAliases) workspace.commandAliases = {};
    
    workspace.commandAliases[args.name] = args.command;
    context.saveWorkspace();
    return `✅ Alias created: ${args.name} → ${args.command}`;
  }
});

ConsoleCommands.register('unalias', {
  description: 'Remove a command alias',
  usage: 'unalias <name>',
  args: [{ name: 'name', required: true, description: 'Alias name to remove' }],
  fn: (args, context) => {
    if (workspace.commandAliases && workspace.commandAliases[args.name]) {
      delete workspace.commandAliases[args.name];
      context.saveWorkspace();
      return `✅ Alias "${args.name}" removed`;
    }
    return `❌ Alias "${args.name}" not found`;
  },
  completions: (args) => {
    if (args.length === 1) {
      return Object.keys(workspace.commandAliases || {}).filter(n => n.startsWith(args[0]));
    }
    return [];
  }
});

ConsoleCommands.register('history', {
  description: 'View command history',
  usage: 'history [--clear] [--limit <n>]',
  args: [
    { name: 'action', optional: true, description: 'Action: --clear or --limit' },
    { name: 'limit', optional: true, description: 'Number of entries to show' }
  ],
  fn: (args, context) => {
    if (args.action === '--clear') {
      consoleHistory = [];
      historyIdx = -1;
      return `✅ Command history cleared`;
    }
    
    const limit = args.limit ? parseInt(args.limit) : 20;
    const entries = consoleHistory.slice(0, limit);
    
    if (entries.length === 0) return `📜 No command history`;
    
    let output = `📜 Command History (showing ${Math.min(entries.length, limit)} of ${consoleHistory.length}):\n\n`;
    entries.forEach((cmd, i) => {
      output += `${consoleHistory.length - entries.length + i + 1}. ${cmd}\n`;
    });
    
    return output;
  },
  completions: (args) => {
    if (args.length === 1) {
      return ['--clear', '--limit'].filter(a => a.startsWith(args[0]));
    }
    return [];
  }
});

// --- Trash Commands ---
ConsoleCommands.register('trash', {
  description: 'Manage trash',
  usage: 'trash <action> [options]',
  args: [
    { name: 'action', required: true, description: 'Action: list, restore, empty, delete' },
    { name: 'options', optional: true, description: 'Action-specific options' }
  ],
  fn: (args, context) => {
    const action = args.action;
    
    if (action === 'list') {
      if (trashItems.length === 0) return `🗑 Trash is empty`;
      let output = `🗑 Trash Items (${trashItems.length}):\n\n`;
      trashItems.slice(0, 20).forEach((item, i) => {
        const content = typeof item.content === 'object' ? item.content.subject || 'Unknown' : item.content;
        output += `${i + 1}. [${item.type}] ${content} - ${new Date(item.deletedAt).toLocaleDateString()}\n`;
      });
      if (trashItems.length > 20) {
        output += `... and ${trashItems.length - 20} more\n`;
      }
      return output;
    }
    
    if (action === 'restore') {
      const parts = args.options?.split(/\s+/);
      const target = parts?.[0];
      
      if (target === 'all') {
        trashItems.forEach(item => {
          if (item.type === 'card') workspace.cards.push(item.content);
        });
        trashItems = [];
        context.saveWorkspace();
        renderKanban();
        renderTrash();
        return `✅ Restored all ${trashItems.length} items from trash`;
      }
      
      const index = parseInt(target);
      if (!isNaN(index) && index >= 0 && index < trashItems.length) {
        const item = trashItems[index];
        if (item.type === 'card') workspace.cards.push(item.content);
        trashItems.splice(index, 1);
        context.saveWorkspace();
        renderKanban();
        renderTrash();
        return `✅ Restored item ${index + 1}`;
      }
      
      return `❌ Invalid index: ${target}`;
    }
    
    if (action === 'empty') {
      if (!args.options?.includes('--force')) {
        return `⚠️  Use --force to empty trash: trash empty --force`;
      }
      trashItems = [];
      context.saveWorkspace();
      renderTrash();
      return `✅ Trash emptied`;
    }
    
    if (action === 'delete') {
      const parts = args.options?.split(/\s+/);
      const target = parts?.[0];
      
      if (target === 'all') {
        if (!args.options?.includes('--force')) {
          return `⚠️  Use --force to permanently delete all: trash delete all --force`;
        }
        trashItems = [];
        context.saveWorkspace();
        renderTrash();
        return `✅ Permanently deleted all trash items`;
      }
      
      const index = parseInt(target);
      if (!isNaN(index) && index >= 0 && index < trashItems.length) {
        trashItems.splice(index, 1);
        context.saveWorkspace();
        renderTrash();
        return `✅ Permanently deleted item ${index + 1}`;
      }
      
      return `❌ Invalid index: ${target}`;
    }
    
    return `❌ Unknown trash action: ${action}`;
  },
  completions: (args) => {
    if (args.length === 1) {
      return ['list', 'restore', 'empty', 'delete'].filter(a => a.startsWith(args[0]));
    }
    if (args.length === 2) {
      const action = args[0];
      if (action === 'restore' || action === 'delete') {
        return ['all', '--force', ...Array.from({ length: Math.min(trashItems.length, 20) }, (_, i) => i.toString())]
          .filter(o => o.startsWith(args[1]));
      }
      if (action === 'empty') {
        return ['--force'].filter(o => o.startsWith(args[1]));
      }
    }
    return [];
  }
});

// --- Activity Log Commands ---
ConsoleCommands.register('log', {
  description: 'View or manage activity log',
  usage: 'log [--clear] [--limit <n>]',
  args: [
    { name: 'action', optional: true, description: 'Action: --clear or --limit' },
    { name: 'limit', optional: true, description: 'Number of entries' }
  ],
  fn: (args, context) => {
    if (args.action === '--clear') {
      activityLog = [];
      context.saveWorkspace();
      return `✅ Activity log cleared`;
    }
    
    const limit = args.limit ? parseInt(args.limit) : 10;
    const entries = activityLog.slice(0, limit);
    
    if (entries.length === 0) return `📜 Activity log is empty`;
    
    let output = `📜 Activity Log (showing ${Math.min(entries.length, limit)} of ${activityLog.length}):\n\n`;
    entries.forEach((entry, i) => {
      const time = new Date(entry.time).toLocaleString();
      output += `${i + 1}. [${entry.type.padEnd(8)}] ${time} - ${entry.message}\n`;
    });
    
    return output;
  },
  completions: (args) => {
    if (args.length === 1) {
      return ['--clear', '--limit'].filter(a => a.startsWith(args[0]));
    }
    return [];
  }
});

// --- People/Labels Management ---
ConsoleCommands.register('people', {
  description: 'Manage people across cards',
  usage: 'people <action> [name] [role]',
  args: [
    { name: 'action', required: true, description: 'Action: list, add, remove' },
    { name: 'name', optional: true, description: 'Person name' },
    { name: 'role', optional: true, description: 'Person role' }
  ],
  fn: (args, context) => {
    const action = args.action;
    
    if (action === 'list') {
      const peopleMap = new Map();
      workspace.cards.forEach(card => {
        card.people?.forEach(p => {
          const key = `${p.name}:${p.role}`;
          peopleMap.set(key, (peopleMap.get(key) || 0) + 1);
        });
      });
      
      if (peopleMap.size === 0) return `👥 No people found in cards`;
      
      let output = `👥 People in Workspace:\n\n`;
      Array.from(peopleMap.entries()).sort((a, b) => b[1] - a[1]).forEach(([key, count]) => {
        const [name, role] = key.split(':');
        output += `  ${name.padEnd(20)} (${role.padEnd(12)}) - ${count} card(s)\n`;
      });
      return output;
    }
    
    if (action === 'add' && args.name) {
      const role = args.role || 'Member';
      let count = 0;
      workspace.cards.forEach(card => {
        if (!card.people) card.people = [];
        if (!card.people.some(p => p.name === args.name && p.role === role)) {
          card.people.push({ name: args.name, role });
          count++;
        }
      });
      context.saveWorkspace();
      return `✅ Added ${args.name} (${role}) to ${count} cards`;
    }
    
    if (action === 'remove' && args.name) {
      let count = 0;
      workspace.cards.forEach(card => {
        if (card.people) {
          const initialCount = card.people.length;
          card.people = card.people.filter(p => p.name !== args.name);
          count += initialCount - card.people.length;
        }
      });
      context.saveWorkspace();
      return `✅ Removed ${args.name} from ${count} cards`;
    }
    
    return `❌ Invalid people action: ${action}`;
  },
  completions: (args) => {
    if (args.length === 1) {
      return ['list', 'add', 'remove'].filter(a => a.startsWith(args[0]));
    }
    if (args.length === 2 && args[0] === 'add') {
      const people = new Set();
      workspace.cards.forEach(c => c.people?.forEach(p => people.add(p.name)));
      return Array.from(people).filter(n => n.startsWith(args[1]));
    }
    if (args.length === 2 && args[0] === 'remove') {
      const people = new Set();
      workspace.cards.forEach(c => c.people?.forEach(p => people.add(p.name)));
      return Array.from(people).filter(n => n.startsWith(args[1]));
    }
    if (args.length === 3 && args[0] === 'add') {
      return ['Dev', 'PM', 'Designer', 'QA', 'Member', 'Lead', 'Manager'].filter(r => r.startsWith(args[2]));
    }
    return [];
  }
});

ConsoleCommands.register('labels', {
  description: 'Manage labels across cards',
  usage: 'labels <action> [label]',
  args: [
    { name: 'action', required: true, description: 'Action: list, add, remove, rename' },
    { name: 'label', optional: true, description: 'Label name' },
    { name: 'newLabel', optional: true, description: 'New label name (for rename)' }
  ],
  fn: (args, context) => {
    const action = args.action;
    
    if (action === 'list') {
      const labelMap = new Map();
      workspace.cards.forEach(card => {
        card.labels?.forEach(l => {
          labelMap.set(l, (labelMap.get(l) || 0) + 1);
        });
      });
      
      if (labelMap.size === 0) return `🏷️ No labels found in cards`;
      
      let output = `🏷️ Labels in Workspace:\n\n`;
      Array.from(labelMap.entries()).sort((a, b) => b[1] - a[1]).forEach(([label, count]) => {
        output += `  ${label.padEnd(20)} - ${count} card(s)\n`;
      });
      return output;
    }
    
    if (action === 'add' && args.label) {
      let count = 0;
      workspace.cards.forEach(card => {
        if (!card.labels) card.labels = [];
        if (!card.labels.includes(args.label)) {
          card.labels.push(args.label);
          count++;
        }
      });
      context.saveWorkspace();
      return `✅ Added label "${args.label}" to ${count} cards`;
    }
    
    if (action === 'remove' && args.label) {
      let count = 0;
      workspace.cards.forEach(card => {
        if (card.labels) {
          const initialCount = card.labels.length;
          card.labels = card.labels.filter(l => l !== args.label);
          count += initialCount - card.labels.length;
        }
      });
      context.saveWorkspace();
      return `✅ Removed label "${args.label}" from ${count} cards`;
    }
    
    if (action === 'rename' && args.label && args.newLabel) {
      let count = 0;
      workspace.cards.forEach(card => {
        if (card.labels) {
          const initialCount = card.labels.filter(l => l === args.label).length;
          card.labels = card.labels.map(l => l === args.label ? args.newLabel : l);
          count += initialCount;
        }
      });
      context.saveWorkspace();
      return `✅ Renamed label "${args.label}" to "${args.newLabel}" in ${count} cards`;
    }
    
    return `❌ Invalid labels action: ${action}`;
  },
  completions: (args) => {
    if (args.length === 1) {
      return ['list', 'add', 'remove', 'rename'].filter(a => a.startsWith(args[0]));
    }
    if (args.length === 2) {
      const labels = new Set();
      workspace.cards.forEach(c => c.labels?.forEach(l => labels.add(l)));
      return Array.from(labels).filter(l => l.startsWith(args[1]));
    }
    if (args.length === 3 && args[0] === 'rename') {
      const labels = new Set();
      workspace.cards.forEach(c => c.labels?.forEach(l => labels.add(l)));
      return Array.from(labels).filter(l => l.startsWith(args[2]));
    }
    return [];
  }
});

// --- Analytics Commands ---
ConsoleCommands.register('chart', {
  description: 'Create or manage charts',
  usage: 'chart <action> [options]',
  args: [
    { name: 'action', required: true, description: 'Action: list, create, delete' },
    { name: 'options', optional: true, description: 'Action-specific options' }
  ],
  fn: (args, context) => {
    const action = args.action;
    
    if (action === 'list') {
      if (workspace.dashDatasets.length === 0) return `📊 No charts defined`;
      let output = `📊 Available Charts:\n\n`;
      workspace.dashDatasets.forEach((ds, i) => {
        output += `${i + 1}. ${ds.name} (${ds.type}) - ${ds.data.length} data points\n`;
      });
      return output;
    }
    
    if (action === 'create') {
      const parts = args.options?.split(/\s+/);
      if (!parts || parts.length < 2) {
        return `❌ Usage: chart create <name> <type> [data...]`;
      }
      const name = parts[0];
      const type = parts[1];
      
      if (!['bar', 'line', 'pie', 'doughnut'].includes(type)) {
        return `❌ Invalid chart type: ${type}`;
      }
      
      // For now, create empty chart
      workspace.dashDatasets.push({ name, type, data: [] });
      context.saveWorkspace();
      renderDashboards();
      return `✅ Chart "${name}" created (type: ${type})`;
    }
    
    if (action === 'delete') {
      const index = parseInt(args.options);
      if (isNaN(index) || index < 1 || index > workspace.dashDatasets.length) {
        return `❌ Invalid chart index: ${args.options}`;
      }
      workspace.dashDatasets.splice(index - 1, 1);
      context.saveWorkspace();
      renderDashboards();
      return `✅ Chart ${index} deleted`;
    }
    
    return `❌ Unknown chart action: ${action}`;
  },
  completions: (args) => {
    if (args.length === 1) {
      return ['list', 'create', 'delete'].filter(a => a.startsWith(args[0]));
    }
    if (args.length === 2 && args[0] === 'delete') {
      return Array.from({ length: workspace.dashDatasets.length }, (_, i) => (i + 1).toString())
        .filter(i => i.startsWith(args[1]));
    }
    return [];
  }
});

// --- Shortcut Commands ---
ConsoleCommands.register('shortcuts', {
  description: 'List keyboard shortcuts',
  usage: 'shortcuts',
  fn: () => {
    return `⌨ Keyboard Shortcuts:\n\n` +
      `  /           Focus search\n` +
      `  Esc        Close modal / cancel range\n` +
      `  Ctrl+S     Save workspace\n` +
      `  N          New card (when not in input)\n` +
      `  Ctrl+F     Focus console\n` +
      `  ↑/↓        Navigate command history\n` +
      `  Tab        Autocomplete command\n`;
  }
});

ConsoleCommands.register('version', {
  description: 'Display application version',
  usage: 'version',
  aliases: ['ver', 'v'],
  fn: () => `⚗ Alkembic Ace v2.0.0 - Super Console Edition`
});

// =============================================
// ENHANCED CONSOLE UI & FUNCTIONALITY
// =============================================

/* ---------- ENHANCED CONSOLE STATE ---------- */
let consoleCommandHistory = [];
let consoleHistoryIndex = -1;
let consoleAutocompleteIndex = -1;
let consoleAutocompleteResults = [];
let consoleMultiLineInput = false;
let consoleMultiLineBuffer = '';
let consoleSuggestions = [];
let consoleLastCommand = '';

/* ---------- CONSOLE UI ENHANCEMENTS ---------- */
function createEnhancedConsole() {
  // Remove old console if exists
  const oldConsole = document.getElementById('floatingConsole');
  if (oldConsole) oldConsole.remove();
  
  const div = document.createElement('div');
  div.className = 'floating-console enhanced';
  div.id = 'floatingConsole';
  
  div.innerHTML = `
    <div class="fc-header" id="fcHeader">
      <div class="fc-title">⚗ Super Console</div>
      <div class="fc-actions">
        <button class="fc-btn" onclick="minimizeEnhancedConsole()" title="Minimize">–</button>
        <button class="fc-btn" onclick="toggleConsoleVisibility()" title="Toggle visibility">👁</button>
        <button class="fc-btn" onclick="clearEnhancedConsole()" title="Clear">🗑</button>
        <button class="fc-btn" onclick="closeEnhancedConsole()" title="Close">✕</button>
      </div>
    </div>
    <div class="fc-toolbar">
      <button class="fc-toolbar-btn active" onclick="setConsoleTab('output')" data-tab="output">Output</button>
      <button class="fc-toolbar-btn" onclick="setConsoleTab('history')" data-tab="history">History</button>
      <button class="fc-toolbar-btn" onclick="setConsoleTab('macros')" data-tab="macros">Macros</button>
      <button class="fc-toolbar-btn" onclick="setConsoleTab('help')" data-tab="help">Help</button>
    </div>
    <div class="fc-content">
      <div class="fc-tab-content active" id="consoleTabOutput">
        <div class="fc-log" id="fcLog"></div>
      </div>
      <div class="fc-tab-content" id="consoleTabHistory">
        <div class="fc-history-list" id="fcHistoryList"></div>
      </div>
      <div class="fc-tab-content" id="consoleTabMacros">
        <div class="fc-macros-list" id="fcMacrosList"></div>
        <div class="fc-macro-form">
          <input type="text" id="macroNameInput" placeholder="Macro name">
          <input type="text" id="macroCommandsInput" placeholder="Commands (separated by ;)">
          <button class="btn btn-sm" onclick="createMacroFromForm()">Create Macro</button>
        </div>
      </div>
      <div class="fc-tab-content" id="consoleTabHelp">
        <div class="fc-help-content" id="fcHelpContent"></div>
      </div>
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
        <textarea 
          id="fcInput" 
          placeholder="Type a command... (Tab for autocomplete, ↑/↓ for history)"
          rows="1"
          onkeydown="handleEnhancedConsoleKey(event)"
          oninput="handleConsoleInput(event)"
          onfocus="handleConsoleFocus()"
          onblur="handleConsoleBlur()"
        ></textarea>
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
      <span class="fc-status-right">
        <span id="consoleMode">READY</span>
      </span>
    </div>
  `;
  
  document.body.appendChild(div);
  floatingConsole = div;
  
  // Make draggable
  makeDraggable(div, div.querySelector('.fc-header'));
  
  // Initialize
  updateConsoleStatus();
  startConsoleClock();
  
  // Load history
  loadConsoleHistory();
  
  // Focus input
  setTimeout(() => {
    const input = document.getElementById('fcInput');
    if (input) {
      input.focus();
      // Auto-resize
      input.addEventListener('input', autoResizeTextarea);
    }
  }, 100);
  
  // Hide reopen button
  document.getElementById('consoleReopen')?.classList.remove('show');
  
  return div;
}

function autoResizeTextarea(e) {
  const textarea = e.target;
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
}

function handleConsoleInput(e) {
  const textarea = e.target;
  const text = textarea.value;
  
  // Show/hide autocomplete
  if (text.length > 0) {
    showConsoleAutocomplete(text);
  } else {
    hideConsoleAutocomplete();
  }
  
  // Update multi-line state
  consoleMultiLineInput = text.includes('\n');
  
  // Update status
  updateConsoleMode();
}

function handleConsoleFocus() {
  const textarea = document.getElementById('fcInput');
  if (textarea) {
    // Scroll to end
    textarea.scrollTop = textarea.scrollHeight;
    // Show autocomplete if there's text
    if (textarea.value.length > 0) {
      showConsoleAutocomplete(textarea.value);
    }
  }
}

function handleConsoleBlur() {
  // Hide autocomplete after delay
  setTimeout(() => {
    const textarea = document.getElementById('fcInput');
    if (textarea && document.activeElement !== textarea) {
      hideConsoleAutocomplete();
    }
  }, 200);
}

function showConsoleAutocomplete(prefix) {
  const autocomplete = document.getElementById('fcAutocomplete');
  if (!autocomplete) return;
  
  // Parse current input
  const textarea = document.getElementById('fcInput');
  const text = textarea.value;
  const cursorPos = textarea.selectionStart;
  
  // Find the current word
  let start = cursorPos - 1;
  while (start >= 0 && !/\s/.test(text[start])) start--;
  start++;
  const currentWord = text.substring(start, cursorPos);
  
  // Get completions
  const parts = text.substring(0, cursorPos).split(/\s+/);
  const commandName = parts[0];
  const command = ConsoleCommands.getCommand(commandName);
  
  let results = [];
  if (parts.length === 1) {
    // Complete command name
    results = ConsoleCommands.getCompletions(currentWord);
    // Also include aliases
    Object.keys(workspace.commandAliases || {}).forEach(alias => {
      if (alias.startsWith(currentWord) && !results.includes(alias)) {
        results.push(alias);
      }
    });
  } else if (command && command.completions) {
    // Use command-specific completions
    results = command.completions(parts.slice(1)) || [];
  } else {
    // Generic completions based on context
    if (parts.length === 2) {
      // First argument completions
      if (['move', 'edit', 'delete', 'clone', 'find'].includes(commandName)) {
        results = workspace.cards.map(c => c.id.toString()).filter(id => id.startsWith(currentWord));
        results.push('all', 'selected');
      }
    }
  }
  
  // Add workspace-specific completions
  if (currentWord.startsWith(':')) {
    // Tag completions
    const labels = new Set();
    workspace.cards.forEach(c => c.labels?.forEach(l => labels.add(l)));
    results.push(...Array.from(labels).filter(l => l.startsWith(currentWord.substring(1))).map(l => `:${l}`));
  }
  
  consoleAutocompleteResults = results.filter((r, i, arr) => arr.indexOf(r) === i); // Unique
  consoleAutocompleteIndex = -1;
  
  if (consoleAutocompleteResults.length > 0) {
    showAutocompleteDropdown(consoleAutocompleteResults, start, cursorPos);
  } else {
    hideConsoleAutocomplete();
  }
}

function showAutocompleteDropdown(results, wordStart, cursorPos) {
  const autocomplete = document.getElementById('fcAutocomplete');
  if (!autocomplete) return;
  
  const textarea = document.getElementById('fcInput');
  const rect = textarea.getBoundingClientRect();
  const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
  const top = rect.top + window.scrollY + lineHeight * (textarea.value.substring(0, cursorPos).split('\n').length);
  
  // Calculate position relative to cursor
  const charWidth = textarea.clientWidth / Math.max(textarea.value.length, 10);
  const left = rect.left + window.scrollX + (cursorPos - wordStart) * charWidth;
  
  autocomplete.innerHTML = results.map((result, index) => {
    const isSelected = index === consoleAutocompleteIndex;
    const display = result.replace(/:/g, ':\u200B') // Add zero-width space for colon
      .replace(/--/, '\u200B--\u200B'); // Handle flags
    return `<div class="fc-autocomplete-item ${isSelected ? 'selected' : ''}" 
              onclick="selectAutocomplete(${index})"
              onmouseenter="consoleAutocompleteIndex = ${index}; updateAutocompleteSelection()">
      <span class="fc-autocomplete-text">${escapeHTML(display)}</span>
      ${index < 5 ? '<span class="fc-autocomplete-hint">Tab to complete</span>' : ''}
    </div>`;
  }).join('');
  
  autocomplete.style.display = 'block';
  autocomplete.style.top = `${top}px`;
  autocomplete.style.left = `${left}px`;
  autocomplete.style.minWidth = `${Math.max(results.reduce((max, r) => Math.max(max, r.length * 8), 100), 150)}px`;
  
  // Select first item
  if (consoleAutocompleteIndex === -1 && results.length > 0) {
    consoleAutocompleteIndex = 0;
    updateAutocompleteSelection();
  }
}

function updateAutocompleteSelection() {
  const autocomplete = document.getElementById('fcAutocomplete');
  if (!autocomplete) return;
  
  const items = autocomplete.querySelectorAll('.fc-autocomplete-item');
  items.forEach((item, index) => {
    item.classList.toggle('selected', index === consoleAutocompleteIndex);
  });
  
  // Scroll to selected
  const selected = autocomplete.querySelector('.fc-autocomplete-item.selected');
  if (selected) {
    selected.scrollIntoView({ block: 'neighbor', behavior: 'smooth' });
  }
}

function selectAutocomplete(index) {
  if (index < 0 || index >= consoleAutocompleteResults.length) return;
  
  const textarea = document.getElementById('fcInput');
  if (!textarea) return;
  
  const text = textarea.value;
  const cursorPos = textarea.selectionStart;
  
  // Find word start
  let start = cursorPos - 1;
  while (start >= 0 && !/\s/.test(text[start])) start--;
  start++;
  
  const newText = text.substring(0, start) + consoleAutocompleteResults[index] + text.substring(cursorPos);
  textarea.value = newText;
  textarea.selectionStart = textarea.selectionEnd = start + consoleAutocompleteResults[index].length;
  
  consoleAutocompleteIndex = -1;
  hideConsoleAutocomplete();
  
  // Update autocomplete with new text
  setTimeout(() => showConsoleAutocomplete(newText), 10);
  
  textarea.focus();
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

function handleEnhancedConsoleKey(e) {
  const textarea = document.getElementById('fcInput');
  if (!textarea) return;
  
  const autocomplete = document.getElementById('fcAutocomplete');
  const visible = autocomplete && autocomplete.style.display === 'block';
  
  // Handle autocomplete navigation
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
      // Don't execute yet, just complete the word
      e.preventDefault();
      return;
    }
  }
  
  // Handle command history
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (consoleHistoryIndex < consoleCommandHistory.length - 1) {
      consoleHistoryIndex++;
      const cmd = consoleCommandHistory[consoleHistoryIndex];
      textarea.value = cmd;
      textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
      updateConsoleMode();
    }
    return;
  }
  
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (consoleHistoryIndex > 0) {
      consoleHistoryIndex--;
      const cmd = consoleCommandHistory[consoleHistoryIndex];
      textarea.value = cmd;
      textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
    } else if (consoleHistoryIndex === 0) {
      consoleHistoryIndex = -1;
      textarea.value = '';
    }
    updateConsoleMode();
    return;
  }
  
  // Handle multi-line input
  if (e.key === 'Enter') {
    if (e.ctrlKey) {
      // Insert newline for multi-line
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value = textarea.value.substring(0, start) + '\n' + textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 1;
      autoResizeTextarea(e);
      return;
    }
    
    if (!e.shiftKey) {
      e.preventDefault();
      executeEnhancedConsole();
      return;
    }
  }
  
  // Handle escape
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
  
  // Show autocomplete on other keys
  if (/[a-zA-Z0-9:_,./\-]/.test(e.key) || e.key === 'Backspace' || e.key === 'Delete') {
    setTimeout(() => {
      const text = textarea.value;
      if (text.length > 0) {
        showConsoleAutocomplete(text);
      } else {
        hideConsoleAutocomplete();
      }
    }, 10);
  }
}

function executeEnhancedConsole() {
  const textarea = document.getElementById('fcInput');
  if (!textarea) return;
  
  const text = textarea.value.trim();
  if (!text) return;
  
  // Add to history
  if (consoleCommandHistory[0] !== text) {
    consoleCommandHistory.unshift(text);
    if (consoleCommandHistory.length > 100) consoleCommandHistory.pop();
  }
  consoleHistoryIndex = -1;
  
  // Save to workspace
  if (!workspace.consoleHistory) workspace.consoleHistory = [];
  workspace.consoleHistory = consoleCommandHistory.slice(0, 50);
  
  // Clear input
  textarea.value = '';
  textarea.style.height = 'auto';
  hideConsoleAutocomplete();
  updateConsoleMode();
  
  // Execute
  const result = executeConsoleCommand(text);
  
  // Add to output
  addConsoleOutput(`> ${text}`, 'command');
  if (result) {
    addConsoleOutput(result, result.startsWith('✅') || result.startsWith('📊') || result.startsWith('📋') ? 'success' : 
                      result.startsWith('❌') || result.startsWith('⚠️') ? 'error' : 'info');
  }
  
  // Save workspace
  saveAllData();
  
  // Update command count
  updateConsoleCommandCount();
}

function executeConsoleCommand(text) {
  // Check for aliases first
  if (workspace.commandAliases && workspace.commandAliases[text.split(' ')[0]]) {
    text = workspace.commandAliases[text.split(' ')[0]] + text.substring(text.split(' ')[0].length);
  }
  
  // Parse command
  const parts = text.split(/\s+/);
  const commandName = parts[0];
  const args = parts.slice(1);
  
  // Find command
  const command = ConsoleCommands.getCommand(commandName);
  if (!command) {
    return `❌ Unknown command: "${commandName}". Type "help" for available commands.`;
  }
  
  // Parse arguments
  const parsedArgs = {};
  let argIndex = 0;
  while (argIndex < args.length) {
    const arg = args[argIndex];
    if (arg.startsWith('--')) {
      // Flag argument
      const flag = arg.substring(2);
      parsedArgs[flag] = true;
      argIndex++;
    } else if (argIndex < args.length - 1 && args[argIndex + 1].startsWith('--')) {
      // Positional argument (next is a flag)
      parsedArgs[command.args?.[argIndex]?.name || `arg${argIndex}`] = arg;
      argIndex++;
    } else if (command.args && command.args[argIndex]) {
      // Positional argument with known name
      const argDef = command.args[argIndex];
      parsedArgs[argDef.name] = arg;
      argIndex++;
    } else {
      // Collect remaining args
      parsedArgs._ = args.slice(argIndex);
      break;
    }
  }
  
  // Collect all remaining args as 'options'
  if (!parsedArgs.options && args.length > (command.args?.filter(a => !a.optional).length || 0)) {
    parsedArgs.options = args.slice(command.args?.filter(a => !a.optional).length).join(' ');
  }
  
  try {
    return command.fn(parsedArgs, {
      saveWorkspace: saveAllData,
      clearOutput: () => clearConsoleOutput(),
      executeCommand: executeConsoleCommand,
      context: {
        workspace,
        trashItems,
        activityLog,
        currentUser
      }
    });
  } catch (e) {
    return `❌ Error executing command: ${e.message}`;
  }
}

function addConsoleOutput(text, type = 'info') {
  const log = document.getElementById('fcLog');
  if (!log) return;
  
  const line = document.createElement('div');
  line.className = `fc-log-line ${type}`;
  
  // Format text with line breaks
  const lines = text.split('\n');
  line.innerHTML = lines.map((lineText, i) => {
    if (i === 0) return `<span>${formatConsoleText(lineText)}</span>`;
    return `<br><span>${formatConsoleText(lineText)}</span>`;
  }).join('');
  
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
  
  // Limit log size
  while (log.children.length > 500) {
    log.removeChild(log.firstChild);
  }
}

function formatConsoleText(text) {
  // Format console text with colors and styling
  return text
    .replace(/✅/g, '<span class="console-success">✅</span>')
    .replace(/❌/g, '<span class="console-error">❌</span>')
    .replace(/⚠️/g, '<span class="console-warning">⚠️</span>')
    .replace(/📊/g, '<span class="console-info">📊</span>')
    .replace(/📋/g, '<span class="console-info">📋</span>')
    .replace(/🔍/g, '<span class="console-info">🔍</span>')
    .replace(/🗑/g, '<span class="console-error">🗑</span>')
    .replace(/🟢/g, '<span style="color: var(--gr);">🟢</span>')
    .replace(/🟡/g, '<span style="color: var(--am);">🟡</span>')
    .replace(/🟠/g, '<span style="color: var(--or);">🟠</span>')
    .replace(/🔴/g, '<span style="color: var(--rd);">🔴</span>')
    .replace(/⚙️/g, '<span class="console-info">⚙️</span>')
    .replace(/📥/g, '<span class="console-info">📥</span>')
    .replace(/💾/g, '<span class="console-success">💾</span>')
    .replace(/📄/g, '<span class="console-info">📄</span>')
    .replace(/📅/g, '<span class="console-info">📅</span>')
    .replace(/👤/g, '<span class="console-info">👤</span>')
    .replace(/🏷️/g, '<span class="console-info">🏷️</span>')
    .replace(/👥/g, '<span class="console-info">👥</span>')
    .replace(/📈/g, '<span class="console-info">📈</span>')
    .replace(/🔓/g, '<span class="console-success">🔓</span>')
    .replace(/🔄/g, '<span class="console-info">🔄</span>')
    .replace(/🔧/g, '<span class="console-info">🔧</span>')
    .replace(/🌓/g, '<span class="console-info">🌓</span>')
    .replace(/🎨/g, '<span class="console-info">🎨</span>')
    .replace(/🖌️/g, '<span class="console-info">🖌️</span>')
    .replace(/🖼️/g, '<span class="console-info">🖼️</span>')
    .replace(/🌐/g, '<span class="console-info">🌐</span>')
    .replace(/🔑/g, '<span class="console-info">🔑</span>')
    .replace(/📊/g, '<span class="console-info">📊</span>')
    .replace(/📜/g, '<span class="console-info">📜</span>')
    .replace(/⌨/g, '<span class="console-info">⌨</span>')
    .replace(/🗑/g, '<span class="console-error">🗑</span>');
}

function clearConsoleOutput() {
  const log = document.getElementById('fcLog');
  if (log) log.innerHTML = '';
  addConsoleOutput('Console cleared', 'info');
}

function loadConsoleHistory() {
  if (workspace.consoleHistory && Array.isArray(workspace.consoleHistory)) {
    consoleCommandHistory = [...workspace.consoleHistory];
  }
}

function updateConsoleStatus() {
  updateConsoleCommandCount();
  updateConsoleCardCount();
}

function updateConsoleCommandCount() {
  const el = document.getElementById('consoleCommandCount');
  if (el) {
    el.textContent = `${consoleCommandHistory.length} commands`;
  }
}

function updateConsoleCardCount() {
  const el = document.getElementById('consoleCardCount');
  if (el) {
    el.textContent = `| ${workspace.cards.length} cards`;
  }
}

function startConsoleClock() {
  function tick() {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const el = document.getElementById('consoleTime');
    if (el) el.textContent = `| ${time}`;
  }
  tick();
  if (consoleClockInterval) clearInterval(consoleClockInterval);
  consoleClockInterval = setInterval(tick, 1000);
}

let consoleClockInterval = null;

function updateConsoleMode() {
  const textarea = document.getElementById('fcInput');
  const modeEl = document.getElementById('consoleMode');
  if (!modeEl) return;
  
  if (!textarea || textarea.value.length === 0) {
    modeEl.textContent = 'READY';
    modeEl.style.color = 'var(--gr)';
  } else if (textarea.value.startsWith(' ') || textarea.value.length === 0) {
    modeEl.textContent = 'INPUT';
    modeEl.style.color = 'var(--am)';
  } else {
    const command = ConsoleCommands.getCommand(textarea.value.split(' ')[0]);
    if (command) {
      modeEl.textContent = command.name.toUpperCase();
      modeEl.style.color = 'var(--am)';
    } else {
      modeEl.textContent = 'INPUT';
      modeEl.style.color = 'var(--rd)';
    }
  }
}

function setConsoleTab(tab) {
  // Update tab buttons
  document.querySelectorAll('.fc-toolbar-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  
  // Update tab content
  document.querySelectorAll('.fc-tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `consoleTab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
  });
  
  // Load tab content
  if (tab === 'history') {
    renderConsoleHistory();
  } else if (tab === 'macros') {
    renderConsoleMacros();
  } else if (tab === 'help') {
    renderConsoleHelp();
  }
}

function renderConsoleHistory() {
  const list = document.getElementById('fcHistoryList');
  if (!list) return;
  
  if (consoleCommandHistory.length === 0) {
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
  addConsoleOutput(`Copied: ${cmd}`, 'success');
}

function renderConsoleMacros() {
  const list = document.getElementById('fcMacrosList');
  if (!list) return;
  
  if (!workspace.macros || Object.keys(workspace.macros).length === 0) {
    list.innerHTML = '<div style="color: var(--mu); padding: 12px; text-align: center;">No macros defined. Create one using the form below.</div>';
    return;
  }
  
  list.innerHTML = Object.entries(workspace.macros).map(([name, commands]) => `
    <div class="fc-macro-item">
      <div class="fc-macro-header">
        <span class="fc-macro-name">${escapeHTML(name)}</span>
        <div class="fc-macro-actions">
          <button class="btn btn-sm btn-ghost" onclick="runMacro('${name.replace(/'/g, "\\'")}')" title="Run">▶</button>
          <button class="btn btn-sm btn-ghost" onclick="copyMacro('${name.replace(/'/g, "\\'")}')" title="Copy">📋</button>
          <button class="btn btn-sm btn-danger" onclick="deleteMacro('${name.replace(/'/g, "\\'")}')" title="Delete">✕</button>
        </div>
      </div>
      <div class="fc-macro-commands">
        ${commands.map((cmd, i) => `<span class="fc-macro-command">${i + 1}. ${escapeHTML(cmd)}</span>`).join('')}
      </div>
      <div class="fc-macro-count">${commands.length} command(s)</div>
    </div>
  `).join('');
}

function createMacroFromForm() {
  const nameInput = document.getElementById('macroNameInput');
  const commandsInput = document.getElementById('macroCommandsInput');
  
  if (!nameInput || !commandsInput) return;
  
  const name = nameInput.value.trim();
  const commands = commandsInput.value.trim();
  
  if (!name || !commands) {
    addConsoleOutput('❌ Please enter both name and commands', 'error');
    return;
  }
  
  // Initialize macros if not exists
  if (!workspace.macros) workspace.macros = {};
  
  workspace.macros[name] = commands.split(';').map(c => c.trim()).filter(c => c);
  saveAllData();
  
  nameInput.value = '';
  commandsInput.value = '';
  
  addConsoleOutput(`✅ Macro "${name}" created`, 'success');
  renderConsoleMacros();
  setConsoleTab('macros');
}

function runMacro(name) {
  if (!workspace.macros || !workspace.macros[name]) {
    addConsoleOutput(`❌ Macro "${name}" not found`, 'error');
    return;
  }
  
  const commands = workspace.macros[name];
  addConsoleOutput(`🔄 Running macro "${name}" (${commands.length} commands):`, 'info');
  
  let successCount = 0;
  commands.forEach((cmd, i) => {
    const result = executeConsoleCommand(cmd);
    if (result && !result.startsWith('❌')) {
      successCount++;
      addConsoleOutput(`  ✅ ${i + 1}. ${result.split('\n')[0]}`, 'success');
    } else {
      addConsoleOutput(`  ❌ ${i + 1}. ${result || 'Error'}`, 'error');
    }
  });
  
  addConsoleOutput(`📊 ${successCount}/${commands.length} commands succeeded`, 'info');
  setConsoleTab('output');
}

function copyMacro(name) {
  if (!workspace.macros || !workspace.macros[name]) {
    addConsoleOutput(`❌ Macro "${name}" not found`, 'error');
    return;
  }
  
  const commands = workspace.macros[name];
  const text = commands.join('; ');
  navigator.clipboard.writeText(text);
  addConsoleOutput(`✅ Macro "${name}" copied to clipboard`, 'success');
}

function deleteMacro(name) {
  if (!workspace.macros || !workspace.macros[name]) {
    addConsoleOutput(`❌ Macro "${name}" not found`, 'error');
    return;
  }
  
  delete workspace.macros[name];
  saveAllData();
  addConsoleOutput(`✅ Macro "${name}" deleted`, 'success');
  renderConsoleMacros();
}

function renderConsoleHelp() {
  const content = document.getElementById('fcHelpContent');
  if (!content) return;
  
  const commands = ConsoleCommands.getAllCommands();
  const categories = {
    'System': [],
    'Card Management': [],
    'Query & Filter': [],
    'Bulk Operations': [],
    'Data Export/Import': [],
    'View Control': [],
    'Settings': [],
    'Scripting': [],
    'Utilities': [],
    'Trash': [],
    'Analytics': []
  };
  
  // Categorize commands
  const categoryKeywords = {
    'help': 'System',
    'clear': 'System',
    'theme': 'System',
    'stats': 'System',
    'autosave': 'System',
    'version': 'System',
    'shortcuts': 'System',
    'card': 'Card Management',
    'edit': 'Card Management',
    'move': 'Card Management',
    'delete': 'Card Management',
    'clone': 'Card Management',
    'find': 'Query & Filter',
    'query': 'Query & Filter',
    'filter': 'Query & Filter',
    'bulk': 'Bulk Operations',
    'export': 'Data Export/Import',
    'import': 'Data Export/Import',
    'view': 'View Control',
    'refresh': 'View Control',
    'set': 'Settings',
    'get': 'Settings',
    'exec': 'Scripting',
    'macro': 'Scripting',
    'alias': 'Scripting',
    'unalias': 'Scripting',
    'history': 'Utilities',
    'date': 'Utilities',
    'echo': 'Utilities',
    'calc': 'Utilities',
    'trash': 'Trash',
    'log': 'Utilities',
    'people': 'Utilities',
    'labels': 'Utilities',
    'chart': 'Analytics'
  };
  
  commands.forEach(cmd => {
    const category = categoryKeywords[cmd.name] || 'Utilities';
    if (categories[category]) {
      categories[category].push(cmd);
    }
  });
  
  // Generate help HTML
  let html = '<div class="fc-help-section">';
  html += '<h3>📚 Alkembic Super Console</h3>';
  html += '<p>The Super Console is a powerful command-line interface that gives you complete control over your workspace.</p>';
  html += '<div class="fc-help-tip">💡 <strong>Tip:</strong> Use <code>Tab</code> for autocomplete, <code>↑/↓</code> for history navigation</div>';
  html += '</div>';
  
  Object.entries(categories).forEach(([category, cmds]) => {
    if (cmds.length === 0) return;
    
    html += `<div class="fc-help-category">`;
    html += `<h4>${category}</h4>`;
    html += `<table class="fc-help-table">`;
    html += `<thead><tr><th>Command</th><th>Description</th><th>Usage</th></tr></thead>`;
    html += `<tbody>`;
    
    cmds.sort((a, b) => a.name.localeCompare(b.name)).forEach(cmd => {
      const aliases = cmd.aliases?.length ? ` (${cmd.aliases.join(', ')})` : '';
      html += `<tr>`;
      html += `<td><code>${escapeHTML(cmd.name)}${aliases}</code></td>`;
      html += `<td>${escapeHTML(cmd.description)}</td>`;
      html += `<td><code>${escapeHTML(cmd.usage)}</code></td>`;
      html += `</tr>`;
    });
    
    html += `</tbody></table>`;
    html += `</div>`;
  });
  
  html += '<div class="fc-help-section">';
  html += '<h4>🎯 Quick Start</h4>';
  html += '<ul>';
  html += '<li><code>help</code> - List all commands</li>';
  html += '<li><code>card My Task | Important task | high</code> - Create a card</li>';
  html += '<li><code>find urgent</code> - Search for cards</li>';
  html += '<li><code>query priority:high column:todo</code> - Filter cards</li>';
  html += '<li><code>bulk move selected done</code> - Bulk move selected cards</li>';
  html += '<li><code>export csv</code> - Export all cards to CSV</li>';
  html += '<li><code>macro create myMacro "card Task1; card Task2"</code> - Create a macro</li>';
  html += '</ul>';
  html += '</div>';
  
  content.innerHTML = html;
}

function minimizeEnhancedConsole() {
  const console = document.getElementById('floatingConsole');
  if (console) {
    console.classList.toggle('minimized');
    const reopenBtn = document.getElementById('consoleReopen');
    if (reopenBtn) {
      reopenBtn.classList.toggle('show', console.classList.contains('minimized'));
    }
  }
}

function toggleConsoleVisibility() {
  const console = document.getElementById('floatingConsole');
  if (console) {
    console.classList.toggle('hidden');
    const reopenBtn = document.getElementById('consoleReopen');
    if (reopenBtn) {
      reopenBtn.classList.toggle('show', console.classList.contains('hidden'));
    }
  }
}

function closeEnhancedConsole() {
  if (floatingConsole) {
    floatingConsole.remove();
    floatingConsole = null;
    if (consoleClockInterval) {
      clearInterval(consoleClockInterval);
      consoleClockInterval = null;
    }
  }
  document.getElementById('consoleReopen')?.classList.add('show');
}

function clearEnhancedConsole() {
  clearConsoleOutput();
}

/* =============================================
   ENHANCED CONSOLE STYLES
   =============================================
   Add these to your existing CSS
   =============================================
*/

// Add this to your CSS (or create a new stylesheet)
const enhancedConsoleCSS = `
/* ===== ENHANCED CONSOLE STYLES ===== */
.floating-console.enhanced {
  width: 600px;
  max-width: 90vw;
  min-height: 400px;
  max-height: 80vh;
  background: var(--sf);
  border: 1px solid var(--bd2);
  box-shadow: 0 8px 32px rgba(0,0,0,0.6);
  display: flex;
  flex-direction: column;
  font-family: 'JetBrains Mono', monospace;
  overflow: hidden;
}

.floating-console.enhanced .fc-header {
  background: var(--card);
  border-bottom: 1px solid var(--bd2);
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: move;
  user-select: none;
}

.floating-console.enhanced .fc-title {
  font-family: 'Syne', sans-serif;
  font-weight: 700;
  color: var(--am);
  font-size: 1rem;
}

.floating-console.enhanced .fc-actions {
  display: flex;
  gap: 4px;
}

.floating-console.enhanced .fc-btn {
  background: transparent;
  border: 1px solid var(--bd2);
  color: var(--tx);
  cursor: pointer;
  padding: 2px 6px;
  font-size: 1rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.floating-console.enhanced .fc-btn:hover {
  background: var(--amd);
  border-color: var(--am);
  color: var(--am);
}

.floating-console.enhanced .fc-toolbar {
  display: flex;
  background: var(--card2);
  border-bottom: 1px solid var(--bd2);
  padding: 4px;
  gap: 2px;
}

.floating-console.enhanced .fc-toolbar-btn {
  background: transparent;
  border: none;
  color: var(--mu);
  cursor: pointer;
  padding: 6px 12px;
  font-size: 0.75rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.floating-console.enhanced .fc-toolbar-btn:hover {
  background: var(--amd);
  color: var(--am);
}

.floating-console.enhanced .fc-toolbar-btn.active {
  background: var(--am);
  color: #000;
}

.floating-console.enhanced .fc-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.floating-console.enhanced .fc-tab-content {
  display: none;
  flex: 1;
  overflow: auto;
  padding: 12px;
}

.floating-console.enhanced .fc-tab-content.active {
  display: block;
}

.floating-console.enhanced .fc-log {
  flex: 1;
  overflow-y: auto;
  font-size: 0.8rem;
  line-height: 1.4;
  color: var(--tx);
  white-space: pre-wrap;
  word-break: break-word;
}

.floating-console.enhanced .fc-log-line {
  padding: 2px 0;
  border-bottom: 1px solid transparent;
}

.floating-console.enhanced .fc-log-line:hover {
  background: var(--amd);
}

.floating-console.enhanced .fc-log-line.command {
  color: var(--pu);
  font-weight: 600;
}

.floating-console.enhanced .fc-log-line.success {
  color: var(--gr);
}

.floating-console.enhanced .fc-log-line.error {
  color: var(--rd);
}

.floating-console.enhanced .fc-log-line.warn {
  color: var(--am);
}

.floating-console.enhanced .fc-log-line.info {
  color: var(--cy);
}

/* Console text formatting */
.floating-console.enhanced .console-success { color: var(--gr); }
.floating-console.enhanced .console-error { color: var(--rd); }
.floating-console.enhanced .console-warning { color: var(--am); }
.floating-console.enhanced .console-info { color: var(--cy); }

.floating-console.enhanced .fc-input-container {
  display: flex;
  align-items: flex-end;
  background: var(--card);
  border-top: 1px solid var(--bd2);
  padding: 8px 12px;
  gap: 8px;
}

.floating-console.enhanced .fc-prompt {
  color: var(--am);
  font-size: 0.85rem;
  white-space: nowrap;
}

.floating-console.enhanced .fc-prompt-user { color: var(--gr); }
.floating-console.enhanced .fc-prompt-at { color: var(--mu); }
.floating-console.enhanced .fc-prompt-host { color: var(--am); }
.floating-console.enhanced .fc-prompt-dir { color: var(--cy); }
.floating-console.enhanced .fc-prompt-separator { color: var(--am); }

.floating-console.enhanced .fc-input-wrapper {
  flex: 1;
  position: relative;
}

.floating-console.enhanced .fc-input-wrapper textarea {
  width: 100%;
  background: var(--ibg);
  border: 1px solid var(--bd);
  color: var(--hd);
  padding: 6px 10px;
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  resize: none;
  overflow-y: auto;
  max-height: 150px;
  transition: border-color 0.2s;
}

.floating-console.enhanced .fc-input-wrapper textarea:focus {
  outline: none;
  border-color: var(--am);
  box-shadow: 0 0 0 2px var(--amd);
}

.floating-console.enhanced .fc-input-wrapper textarea::placeholder {
  color: var(--mu);
}

.floating-console.enhanced .fc-autocomplete {
  position: absolute;
  top: 0;
  left: 0;
  background: var(--card);
  border: 1px solid var(--bd2);
  border-radius: 6px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10001;
  display: none;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}

.floating-console.enhanced .fc-autocomplete-item {
  padding: 6px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.15s;
}

.floating-console.enhanced .fc-autocomplete-item:hover {
  background: var(--amd);
}

.floating-console.enhanced .fc-autocomplete-item.selected {
  background: var(--am);
  color: #000;
}

.floating-console.enhanced .fc-autocomplete-text {
  flex: 1;
  font-size: 0.85rem;
}

.floating-console.enhanced .fc-autocomplete-hint {
  font-size: 0.65rem;
  color: var(--mu);
  white-space: nowrap;
}

.floating-console.enhanced .fc-input-actions {
  display: flex;
  gap: 4px;
}

.floating-console.enhanced .fc-input-actions .btn {
  padding: 6px 12px;
  font-size: 0.75rem;
}

.floating-console.enhanced .fc-status-bar {
  display: flex;
  justify-content: space-between;
  background: var(--card2);
  border-top: 1px solid var(--bd2);
  padding: 4px 12px;
  font-size: 0.65rem;
  color: var(--mu);
}

.floating-console.enhanced .fc-status-left,
.floating-console.enhanced .fc-status-right {
  display: flex;
  gap: 12px;
}

/* History tab */
.floating-console.enhanced .fc-history-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.floating-console.enhanced .fc-history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: var(--card2);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.floating-console.enhanced .fc-history-item:hover {
  background: var(--amd);
}

.floating-console.enhanced .fc-history-index {
  color: var(--mu);
  font-size: 0.7rem;
  min-width: 24px;
  text-align: right;
}

.floating-console.enhanced .fc-history-command {
  flex: 1;
  color: var(--tx);
  font-size: 0.8rem;
}

.floating-console.enhanced .fc-history-copy {
  background: none;
  border: none;
  color: var(--mu);
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
  transition: all 0.2s;
}

.floating-console.enhanced .fc-history-copy:hover {
  background: var(--amd);
  color: var(--am);
}

/* Macros tab */
.floating-console.enhanced .fc-macros-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.floating-console.enhanced .fc-macro-item {
  background: var(--card2);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid var(--bd2);
}

.floating-console.enhanced .fc-macro-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.floating-console.enhanced .fc-macro-name {
  font-weight: 700;
  color: var(--am);
  font-size: 0.9rem;
}

.floating-console.enhanced .fc-macro-actions {
  display: flex;
  gap: 4px;
}

.floating-console.enhanced .fc-macro-actions .btn {
  padding: 4px 8px;
  font-size: 0.7rem;
}

.floating-console.enhanced .fc-macro-commands {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}

.floating-console.enhanced .fc-macro-command {
  background: var(--card);
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--tx);
  border: 1px solid var(--bd2);
}

.floating-console.enhanced .fc-macro-count {
  font-size: 0.65rem;
  color: var(--mu);
}

.floating-console.enhanced .fc-macro-form {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--bd2);
}

.floating-console.enhanced .fc-macro-form input {
  flex: 1;
  padding: 6px 10px;
  background: var(--ibg);
  border: 1px solid var(--bd);
  color: var(--hd);
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
}

.floating-console.enhanced .fc-macro-form input:focus {
  outline: none;
  border-color: var(--am);
}

/* Help tab */
.floating-console.enhanced .fc-help-section {
  margin-bottom: 16px;
}

.floating-console.enhanced .fc-help-section h3 {
  color: var(--am);
  font-family: 'Syne', sans-serif;
  margin-bottom: 8px;
}

.floating-console.enhanced .fc-help-section p {
  color: var(--tx);
  font-size: 0.85rem;
  line-height: 1.5;
}

.floating-console.enhanced .fc-help-tip {
  background: var(--amd);
  padding: 8px 12px;
  border-radius: 6px;
  margin: 8px 0;
  font-size: 0.8rem;
  color: var(--am);
}

.floating-console.enhanced .fc-help-tip strong {
  color: var(--am);
}

.floating-console.enhanced .fc-help-category {
  margin-bottom: 16px;
}

.floating-console.enhanced .fc-help-category h4 {
  color: var(--hd);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--bd2);
}

.floating-console.enhanced .fc-help-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
}

.floating-console.enhanced .fc-help-table th,
.floating-console.enhanced .fc-help-table td {
  padding: 6px 8px;
  text-align: left;
  border-bottom: 1px solid var(--bd2);
}

.floating-console.enhanced .fc-help-table th {
  color: var(--am);
  font-weight: 600;
  background: var(--card2);
}

.floating-console.enhanced .fc-help-table code {
  font-family: 'JetBrains Mono', monospace;
  background: var(--card);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 0.8em;
}

.floating-console.enhanced .fc-help-table tr:hover {
  background: var(--amd);
}

/* Minimized state */
.floating-console.enhanced.minimized {
  height: 40px;
  resize: none;
}

.floating-console.enhanced.minimized .fc-content,
.floating-console.enhanced.minimized .fc-input-container,
.floating-console.enhanced.minimized .fc-status-bar {
  display: none;
}

.floating-console.enhanced.minimized .fc-header {
  border-bottom: none;
}

/* Resize handle */
.floating-console.enhanced::after {
  content: '';
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, transparent 50%, var(--fc-bd) 50%);
  cursor: nwse-resize;
  pointer-events: auto;
  border-radius: 0 0 12px 0;
}

.floating-console.enhanced.minimized::after {
  display: none;
}

/* Dark/light theme adjustments */
[data-theme="light"] .floating-console.enhanced {
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
}

[data-theme="light"] .floating-console.enhanced .fc-autocomplete {
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
}
`;

/* =============================================
   INTEGRATION WITH EXISTING APP
   =============================================
   Replace the existing openFloatingConsole function
   =============================================
*/

// Override the existing function
function openFloatingConsole() {
  if (floatingConsole && floatingConsole.classList.contains('enhanced')) {
    // Already enhanced console exists
    floatingConsole.classList.remove('hidden');
    floatingConsole.classList.remove('minimized');
    document.getElementById('consoleReopen')?.classList.remove('show');
    document.getElementById('fcInput')?.focus();
    return;
  }
  
  // Remove old console if it exists
  const oldConsole = document.getElementById('floatingConsole');
  if (oldConsole) oldConsole.remove();
  
  // Create enhanced console
  createEnhancedConsole();
  
  // Add styles
  const styleElement = document.createElement('style');
  styleElement.id = 'enhancedConsoleStyles';
  styleElement.textContent = enhancedConsoleCSS;
  document.head.appendChild(styleElement);
  
  // Focus input
  setTimeout(() => {
    const input = document.getElementById('fcInput');
    if (input) {
      input.focus();
    }
  }, 100);
}

// Override close function
function closeFloatingConsole() {
  const console = document.getElementById('floatingConsole');
  if (console && console.classList.contains('enhanced')) {
    closeEnhancedConsole();
  } else if (console) {
    console.remove();
    floatingConsole = null;
    document.getElementById('consoleReopen')?.classList.add('show');
  }
}

// Add keyboard shortcut to open console
function addConsoleKeyboardShortcut() {
  document.addEventListener('keydown', (e) => {
    // Ctrl+F to open console
    if (e.ctrlKey && e.key === 'f' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      openFloatingConsole();
    }
    
    // Escape to close console
    if (e.key === 'Escape' && floatingConsole) {
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        // Only close if escape is pressed in console input
        if (activeElement.id === 'fcInput' || activeElement.closest('#floatingConsole')) {
          closeFloatingConsole();
        }
      }
    }
  });
}

// Initialize console enhancement
function initEnhancedConsole() {
  // Add keyboard shortcut
  addConsoleKeyboardShortcut();
  
  // Load command history from workspace
  if (workspace.consoleHistory) {
    consoleCommandHistory = [...workspace.consoleHistory];
  }
  
  // Update existing console button
  const consoleBtn = document.querySelector('.console-btn');
  if (consoleBtn) {
    consoleBtn.title = 'Open Super Console (Ctrl+F)';
  }
}

// Call this during app initialization
// Add to your existing initialization code:
// initEnhancedConsole();

/* =============================================
   CONSOLE COMMAND SHORTCUTS
   Quick access to common operations
   =============================================
*/

// Add these to your ConsoleCommands.register calls or use them as inspiration

ConsoleCommands.register('ls', {
  description: 'List cards (shortcut for query)',
  usage: 'ls [filters]',
  aliases: ['list'],
  fn: (args) => {
    const command = ConsoleCommands.getCommand('query');
    return command.fn({ filters: args._?.join(' ') || '' }, {});
  }
});

ConsoleCommands.register('cd', {
  description: 'Change column (shortcut for move)',
  usage: 'cd <column>',
  fn: (args, context) => {
    if (selectedCardIds.size === 0) {
      return `❌ No cards selected. Use "move" to move all or specific cards.`;
    }
    const column = args.column || args._?.[0];
    if (!column) return `❌ Please specify a column: todo, in-progress, or done`;
    
    workspace.cards.forEach(c => {
      if (selectedCardIds.has(c.id)) c.column = column;
    });
    context.saveWorkspace();
    renderKanban();
    return `✅ Moved ${selectedCardIds.size} selected cards to ${column}`;
  },
  completions: () => ['todo', 'in-progress', 'done']
});

ConsoleCommands.register('rm', {
  description: 'Remove/delete cards (shortcut for delete)',
  usage: 'rm <target> [--force]',
  fn: async (args, context) => {
    const deleteCmd = ConsoleCommands.getCommand('delete');
    return deleteCmd.fn(args, context);
  },
  completions: (args) => {
    const deleteCmd = ConsoleCommands.getCommand('delete');
    return deleteCmd.completions(args);
  }
});

ConsoleCommands.register('cp', {
  description: 'Copy/clone card (shortcut for clone)',
  usage: 'cp <id> [new_subject]',
  fn: (args, context) => {
    const cloneCmd = ConsoleCommands.getCommand('clone');
    return cloneCmd.fn(args, context);
  },
  completions: (args) => {
    const cloneCmd = ConsoleCommands.getCommand('clone');
    return cloneCmd.completions(args);
  }
});

ConsoleCommands.register('mv', {
  description: 'Move card (shortcut for move)',
  usage: 'mv <id> <column>',
  fn: (args, context) => {
    const moveCmd = ConsoleCommands.getCommand('move');
    return moveCmd.fn(args, context);
  },
  completions: (args) => {
    const moveCmd = ConsoleCommands.getCommand('move');
    return moveCmd.completions(args);
  }
});

ConsoleCommands.register('grep', {
  description: 'Search cards (shortcut for find)',
  usage: 'grep <query>',
  fn: (args, context) => {
    const findCmd = ConsoleCommands.getCommand('find');
    return findCmd.fn({ query: args._?.join(' ') || '' }, context);
  }
});

ConsoleCommands.register('cat', {
  description: 'Show card details',
  usage: 'cat <id>',
  fn: (args) => {
    const getCmd = ConsoleCommands.getCommand('get');
    return getCmd.fn({ key: 'card', id: args.id || args._?.[0] }, {});
  },
  completions: (args) => {
    if (args.length === 1) {
      return workspace.cards.map(c => c.id.toString()).filter(id => id.startsWith(args[0]));
    }
    return [];
  }
});

/* =============================================
   CONSOLE TUTORIAL / ONBOARDING
   =============================================
*/

function showConsoleTutorial() {
  const tutorial = `
🎓 ALKEMBIC SUPER CONSOLE TUTORIAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 BASIC COMMANDS:
  help              - Show all commands
  clear            - Clear console output
  theme [dark|light] - Change theme
  stats           - Show workspace statistics

📋 CARD MANAGEMENT:
  card "Title" | Description | high    - Create a card
  ls                                - List all cards
  find urgent                      - Search for cards
  query priority:high column:todo  - Advanced filtering
  move <id> done                   - Move card to column
  edit <id> subject "New Title"    - Edit card property
  clone <id>                       - Clone a card
  delete <id>                      - Delete a card

🔄 BULK OPERATIONS:
  bulk move selected done          - Move all selected cards
  bulk tag all "urgent"             - Add tag to all cards
  bulk delete selected --force     - Delete selected cards

📤 EXPORT/IMPORT:
  export csv                       - Export all cards to CSV
  export json                      - Export all cards to JSON
  export selected                  - Export selected cards
  import csv                       - Import from CSV file

🔧 SCRIPTING:
  exec "card Task1; card Task2"     - Execute multiple commands
  macro create myMacro "command1; command2" - Create a macro
  macro run myMacro                - Run a macro
  alias ll "ls --limit 50"         - Create command alias

💡 TIPS:
  • Use TAB for autocomplete
  • Use ↑/↓ to navigate command history
  • Use Ctrl+F to open console
  • Use ESC to close console
  • Type "help <command>" for details

🎯 POWER USER:
  • Chain commands with ";"
  • Use filters: query priority:high
  • Create macros for repetitive tasks
  • Use aliases for shortcuts

Type "help" for complete command list
`.trim();
  
  addConsoleOutput(tutorial, 'info');
}

// Add tutorial command
ConsoleCommands.register('tutorial', {
  description: 'Show console tutorial',
  usage: 'tutorial',
  aliases: ['helpme', '?'],
  fn: () => {
    showConsoleTutorial();
    return '';
  }
});

/* =============================================
   FINAL INTEGRATION NOTES
   =============================================

To integrate this enhanced console into your Alkembic Ace app:

1. Add the ConsoleCommands registry and all command definitions
2. Replace openFloatingConsole() with the enhanced version
3. Call initEnhancedConsole() during app initialization
4. Add the enhanced CSS styles
5. Update any existing console references

The enhanced console provides:
- 50+ powerful commands
- Tab completion
- Command history with ↑/↓ navigation
- Multi-line input support
- Syntax highlighting
- Multiple tabs (Output, History, Macros, Help)
- Macro recording and playback
- Command aliases
- Advanced querying and filtering
- Bulk operations
- Data export/import
- Complete workspace management

This transforms the console from a simple debugging tool
into the primary power-user interface for Alkembic Ace!

=============================================
*/
