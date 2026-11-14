/* Manifest file tree. Pure model shared by the picker and offline tests. */
(function (root) {
  'use strict';
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

  function create(files) {
    const tree = { root: null, nodes: new Map(), folders: [], files: [] };
    let sequence = 0;
    const folder = (name, path, parent) => {
      const node = { id: 'd' + sequence++, type: 'folder', name, path, parent,
        children: [], directories: new Map(), totalCount: 0, totalBytes: 0 };
      tree.nodes.set(node.id, node);
      tree.folders.push(node);
      return node;
    };
    tree.root = folder('', '', null);
    const seen = new Set();
    for (const value of files || []) {
      if (!value || typeof value.path !== 'string') continue;
      const path = value.path.replace(/\\/g, '/');
      const pieces = path.split('/');
      if (pieces.some(piece => !piece || piece === '.' || piece === '..') || /^[A-Za-z]:/.test(path)) continue;
      const identity = path.toLowerCase();
      if (seen.has(identity)) continue;
      seen.add(identity);
      let parent = tree.root;
      for (let i = 0; i < pieces.length - 1; i++) {
        const key = pieces[i].toLowerCase();
        let child = parent.directories.get(key);
        if (!child) {
          child = folder(pieces[i], parent.path ? parent.path + '/' + pieces[i] : pieces[i], parent);
          parent.directories.set(key, child);
          parent.children.push(child);
        }
        parent = child;
      }
      const size = Number.isFinite(Number(value.size)) ? Math.max(0, Number(value.size)) : 0;
      const node = { id: 'f' + sequence++, type: 'file', name: pieces[pieces.length - 1], path,
        size, parent, totalCount: 1, totalBytes: size };
      parent.children.push(node);
      tree.nodes.set(node.id, node);
      tree.files.push(node);
      for (let ancestor = parent; ancestor; ancestor = ancestor.parent) {
        ancestor.totalCount++;
        ancestor.totalBytes += size;
      }
    }
    for (const node of tree.folders) {
      node.children.sort((a, b) => (a.type === b.type ? 0 : a.type === 'folder' ? -1 : 1)
        || collator.compare(a.name, b.name) || a.path.localeCompare(b.path));
    }
    return tree;
  }

  function matches(node, query, filter) {
    const path = node.path.toLowerCase();
    if (query && !path.includes(query)) return false;
    if (filter === '.exe' && !path.endsWith('.exe')) return false;
    if (filter === '.dll' && !path.endsWith('.dll')) return false;
    if (filter === '.ini' && !/\.(ini|cfg|json)$/.test(path)) return false;
    if (filter === '.pak' && !/\.(pak|ucas|utoc)$/.test(path)) return false;
    return true;
  }

  function view(tree, query, filter, selected) {
    query = String(query || '').trim().toLowerCase().replace(/\\/g, '/');
    filter = filter || 'all';
    const states = new Map();
    for (const node of tree.nodes.values()) states.set(node.id, { count: 0, bytes: 0, selected: 0 });
    for (const file of tree.files) {
      if (!matches(file, query, filter)) continue;
      const chosen = selected.has(file.path) ? 1 : 0;
      for (let node = file; node; node = node.parent) {
        const state = states.get(node.id);
        state.count++;
        state.bytes += file.size;
        state.selected += chosen;
      }
    }
    return { states, active: Boolean(query || filter !== 'all'), query, filter };
  }

  function rows(tree, current, isExpanded) {
    const result = [];
    const pending = tree.root.children.map(node => ({ node, depth: 0 })).reverse();
    while (pending.length) {
      const row = pending.pop();
      if (!current.states.get(row.node.id).count) continue;
      result.push(row);
      if (row.node.type === 'folder' && isExpanded(row.node)) {
        for (let i = row.node.children.length - 1; i >= 0; i--) {
          pending.push({ node: row.node.children[i], depth: row.depth + 1 });
        }
      }
    }
    return result;
  }

  function select(node, current, selected, checked) {
    const pending = [node];
    while (pending.length) {
      const item = pending.pop();
      if (!current.states.get(item.id).count) continue;
      if (item.type === 'folder') { for (const child of item.children) pending.push(child); }
      else if (checked) selected.add(item.path);
      else selected.delete(item.path);
    }
  }

  const api = { create, view, rows, select };
  root.ManifestFileTree = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
