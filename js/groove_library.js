/* =======================================================
 * GrooveScribe Local Groove Library - with Folders
 * localStorage-based save/load with folders, name, timestamp.
 * ======================================================= */

(function () {
  'use strict';

  var STORAGE_KEY         = 'groovescribe_library';
  var FOLDERS_STORAGE_KEY = 'groovescribe_folders';
  var PANEL_ID            = 'grooveLibraryPanel';
  var ALL_FOLDER_ID       = '__all__';

  var currentFolder = ALL_FOLDER_ID;

  /* ================================================================
   * Storage
   * ================================================================ */

  function loadAll() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function saveAll(grooves) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(grooves));
  }

  function loadFolders() {
    try { return JSON.parse(localStorage.getItem(FOLDERS_STORAGE_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function saveFolders(folders) {
    localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ================================================================
   * Public API
   * ================================================================ */

  function saveGroove(name, folder, urlString) {
    var grooves = loadAll();
    var entry = {
      id:        generateId(),
      name:      name || 'Untitled',
      folder:    folder || '',
      url:       urlString,
      createdAt: new Date().toISOString()
    };
    grooves.unshift(entry);
    saveAll(grooves);
    return entry;
  }

  function deleteGroove(id) {
    saveAll(loadAll().filter(function (g) { return g.id !== id; }));
  }

  function createFolder(name) {
    var folders = loadFolders();
    var trimmed = (name || '').trim();
    if (!trimmed) return null;
    if (folders.some(function (f) { return f.name.toLowerCase() === trimmed.toLowerCase(); })) return null;
    var folder = { id: generateId(), name: trimmed };
    folders.push(folder);
    folders.sort(function (a, b) { return a.name.localeCompare(b.name); });
    saveFolders(folders);
    return folder;
  }

  function deleteFolder(id) {
    // Move grooves in this folder to root
    var grooves = loadAll().map(function (g) {
      if (g.folder === id) g.folder = '';
      return g;
    });
    saveAll(grooves);
    saveFolders(loadFolders().filter(function (f) { return f.id !== id; }));
  }

  function getGroovesInFolder(folderId) {
    return loadAll().filter(function (g) {
      if (folderId === ALL_FOLDER_ID) return true;
      if (folderId === '')            return !g.folder;
      return g.folder === folderId;
    });
  }

  /* ================================================================
   * Helpers
   * ================================================================ */

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatDate(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString(undefined, { day:'numeric', month:'short' }) +
             ' ' + d.toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' });
    } catch(e) { return ''; }
  }

  /* ================================================================
   * Render
   * ================================================================ */

  function renderPanel() {
    var panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    var folders = loadFolders();
    var grooves = getGroovesInFolder(currentFolder);
    var all     = loadAll();

    // Folder sidebar items
    var folderItems = [
      '<div class="gl-folder-item' + (currentFolder === ALL_FOLDER_ID ? ' gl-folder-active' : '') +
        '" data-fid="' + ALL_FOLDER_ID + '">',
      '  <span class="gl-folder-icon">&#128191;</span>',
      '  <span class="gl-folder-name">All grooves</span>',
      '  <span class="gl-folder-count">' + all.length + '</span>',
      '</div>',
      '<div class="gl-folder-item' + (currentFolder === '' ? ' gl-folder-active' : '') +
        '" data-fid="">',
      '  <span class="gl-folder-icon">&#128196;</span>',
      '  <span class="gl-folder-name">Unfiled</span>',
      '  <span class="gl-folder-count">' + all.filter(function(g){return !g.folder;}).length + '</span>',
      '</div>'
    ].join('');

    var userFolderItems = folders.map(function (f) {
      var count = all.filter(function (g) { return g.folder === f.id; }).length;
      return [
        '<div class="gl-folder-item' + (currentFolder === f.id ? ' gl-folder-active' : '') +
          '" data-fid="' + escapeHtml(f.id) + '">',
        '  <span class="gl-folder-icon">&#128193;</span>',
        '  <span class="gl-folder-name">' + escapeHtml(f.name) + '</span>',
        '  <span class="gl-folder-count">' + count + '</span>',
        '  <button class="gl-folder-del" data-fid="' + escapeHtml(f.id) + '" title="Delete folder">&times;</button>',
        '</div>'
      ].join('');
    }).join('');

    // Groove rows
    var rows = grooves.length === 0
      ? '<div class="gl-empty">No grooves here yet.</div>'
      : grooves.map(function (g) {
          return [
            '<div class="gl-row" data-id="' + g.id + '">',
            '  <div class="gl-row-main">',
            '    <span class="gl-name">' + escapeHtml(g.name) + '</span>',
            '    <span class="gl-date">' + formatDate(g.createdAt) + '</span>',
            '  </div>',
            '  <div class="gl-row-actions">',
            '    <button class="gl-btn gl-btn-load" data-url="' + escapeHtml(g.url) + '">Load</button>',
            '    <button class="gl-btn gl-btn-del"  data-id="'  + g.id + '">Delete</button>',
            '  </div>',
            '</div>'
          ].join('');
        }).join('');

    // Folder selector for save form
    var folderOptions = '<option value="">Unfiled</option>' +
      folders.map(function (f) {
        return '<option value="' + escapeHtml(f.id) + '"' +
          (currentFolder === f.id ? ' selected' : '') + '>' +
          escapeHtml(f.name) + '</option>';
      }).join('');

    panel.innerHTML = [
      '<div class="gl-header">',
      '  <span class="gl-title">&#127925; Groove Library</span>',
      '  <button class="gl-close" id="glCloseBtn">&times;</button>',
      '</div>',
      '<div class="gl-body">',
      '  <!-- Folder sidebar -->',
      '  <div class="gl-sidebar">',
      '    <div class="gl-sidebar-title">FOLDERS</div>',
      folderItems,
      userFolderItems,
      '    <button class="gl-new-folder-btn" id="glNewFolderBtn">+ New folder</button>',
      '  </div>',
      '  <!-- Main content -->',
      '  <div class="gl-main">',
      '    <div class="gl-save-form">',
      '      <input class="gl-input" id="glNameInput" type="text" placeholder="Groove name..." maxlength="80">',
      '      <select class="gl-input gl-folder-select" id="glFolderSelect">' + folderOptions + '</select>',
      '      <button class="gl-btn gl-btn-save" id="glSaveBtn">&#128190; Save current groove</button>',
      '    </div>',
      '    <div class="gl-count-row">',
      '      <span class="gl-count">' + grooves.length + ' groove' + (grooves.length !== 1 ? 's' : '') + '</span>',
      '    </div>',
      '    <div class="gl-list">' + rows + '</div>',
      '  </div>',
      '</div>'
    ].join('');

    /* ---- Events ---- */

    panel.querySelector('#glCloseBtn').addEventListener('click', hidePanel);

    // Folder clicks
    panel.querySelectorAll('.gl-folder-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        if (e.target.classList.contains('gl-folder-del')) return;
        currentFolder = item.getAttribute('data-fid');
        renderPanel();
      });
    });

    // Delete folder buttons
    panel.querySelectorAll('.gl-folder-del').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var fid  = btn.getAttribute('data-fid');
        var name = loadFolders().filter(function(f){return f.id===fid;})[0];
        if (name && confirm('Delete folder "' + name.name + '"?\nGrooves will be moved to Unfiled.')) {
          deleteFolder(fid);
          if (currentFolder === fid) currentFolder = ALL_FOLDER_ID;
          renderPanel();
        }
      });
    });

    // New folder button
    panel.querySelector('#glNewFolderBtn').addEventListener('click', function () {
      var name = prompt('Folder name:');
      if (!name) return;
      var created = createFolder(name);
      if (!created) { alert('Folder already exists or invalid name.'); return; }
      currentFolder = created.id;
      renderPanel();
    });

    // Save groove
    panel.querySelector('#glSaveBtn').addEventListener('click', function () {
      var name   = panel.querySelector('#glNameInput').value.trim();
      var folder = panel.querySelector('#glFolderSelect').value;
      var urlStr = window.location.search || '';
      if (window.myGrooveWriter && window.myGrooveWriter.updateCurrentURL) {
        window.myGrooveWriter.updateCurrentURL();
        urlStr = window.location.search;
      }
      if (!urlStr) { alert('Nothing to save - create a groove first.'); return; }
      saveGroove(name || 'Untitled', folder, urlStr);
      renderPanel();
    });

    // Load groove
    panel.querySelectorAll('.gl-btn-load').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var url = btn.getAttribute('data-url');
        if (url) window.location.search = url;
      });
    });

    // Delete groove
    panel.querySelectorAll('.gl-btn-del').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id  = btn.getAttribute('data-id');
        var row = panel.querySelector('.gl-row[data-id="' + id + '"]');
        var nm  = row ? row.querySelector('.gl-name').textContent : 'this groove';
        if (confirm('Delete "' + nm + '"?')) { deleteGroove(id); renderPanel(); }
      });
    });
  }

  /* ================================================================
   * Show / hide
   * ================================================================ */

  function showPanel() {
    var panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = PANEL_ID;
      document.body.appendChild(panel);
    }
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    renderPanel();
  }

  function hidePanel() {
    var panel = document.getElementById(PANEL_ID);
    if (panel) panel.style.display = 'none';
  }

  function togglePanel() {
    var panel = document.getElementById(PANEL_ID);
    if (panel && panel.style.display !== 'none') hidePanel();
    else showPanel();
  }

  /* ================================================================
   * Expose
   * ================================================================ */

  window.GrooveLibrary = {
    show: showPanel, hide: hidePanel, toggle: togglePanel,
    save: saveGroove, delete: deleteGroove,
    createFolder: createFolder, deleteFolder: deleteFolder,
    all: loadAll, folders: loadFolders
  };

}());
