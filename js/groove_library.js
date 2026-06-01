/* =======================================================
 * GrooveScribe Local Groove Library - Improvement #10
 * localStorage-based save/load with name, tags, timestamp.
 * Exposes window.GrooveLibrary API for index.html to call.
 * ======================================================= */

(function () {
  'use strict';

  var STORAGE_KEY = 'groovescribe_library';
  var PANEL_ID    = 'grooveLibraryPanel';

  /* ---- Storage helpers ---- */

  function loadAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveAll(grooves) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(grooves));
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ---- Public API ---- */

  function saveGroove(name, tags, urlString) {
    var grooves = loadAll();
    var entry = {
      id:        generateId(),
      name:      name || 'Untitled',
      tags:      tags || '',
      url:       urlString,
      createdAt: new Date().toISOString()
    };
    grooves.unshift(entry); // newest first
    saveAll(grooves);
    return entry;
  }

  function deleteGroove(id) {
    var grooves = loadAll().filter(function (g) { return g.id !== id; });
    saveAll(grooves);
  }

  function renameGroove(id, newName) {
    var grooves = loadAll().map(function (g) {
      if (g.id === id) g.name = newName;
      return g;
    });
    saveAll(grooves);
  }

  function searchGrooves(query) {
    var q = (query || '').toLowerCase();
    return loadAll().filter(function (g) {
      return !q ||
        g.name.toLowerCase().includes(q) ||
        g.tags.toLowerCase().includes(q);
    });
  }

  /* ---- UI helpers ---- */

  function formatDate(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) +
             ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return iso; }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---- Render panel ---- */

  function renderPanel(query) {
    var panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    var grooves = searchGrooves(query);

    var rows = grooves.length === 0
      ? '<div class="gl-empty">No grooves saved yet. Click <b>Save</b> to add one.</div>'
      : grooves.map(function (g) {
          var tagHtml = g.tags
            ? g.tags.split(',').map(function (t) {
                return '<span class="gl-tag">' + escapeHtml(t.trim()) + '</span>';
              }).join('')
            : '';
          return [
            '<div class="gl-row" data-id="' + g.id + '">',
            '  <div class="gl-row-main">',
            '    <span class="gl-name" title="Click to load">' + escapeHtml(g.name) + '</span>',
            '    <span class="gl-date">' + formatDate(g.createdAt) + '</span>',
            '  </div>',
            tagHtml ? '<div class="gl-tags">' + tagHtml + '</div>' : '',
            '  <div class="gl-row-actions">',
            '    <button class="gl-btn gl-btn-load"  data-id="' + g.id + '" data-url="' + escapeHtml(g.url) + '">Load</button>',
            '    <button class="gl-btn gl-btn-del"   data-id="' + g.id + '">Delete</button>',
            '  </div>',
            '</div>'
          ].join('');
        }).join('');

    panel.innerHTML = [
      '<div class="gl-header">',
      '  <span class="gl-title"><i class="fa fa-music"></i>&nbsp; Groove Library</span>',
      '  <button class="gl-close" id="glCloseBtn" title="Close">&times;</button>',
      '</div>',
      '<div class="gl-save-form">',
      '  <input class="gl-input" id="glNameInput" type="text" placeholder="Groove name..." maxlength="80">',
      '  <input class="gl-input" id="glTagsInput" type="text" placeholder="Tags (comma-separated)..." maxlength="120">',
      '  <button class="gl-btn gl-btn-save" id="glSaveBtn"><i class="fa fa-save"></i> Save current groove</button>',
      '</div>',
      '<div class="gl-search-row">',
      '  <input class="gl-input" id="glSearchInput" type="text" placeholder="Search by name or tag..." value="' + escapeHtml(query || '') + '">',
      '  <span class="gl-count">' + grooves.length + ' groove' + (grooves.length !== 1 ? 's' : '') + '</span>',
      '</div>',
      '<div class="gl-list">' + rows + '</div>'
    ].join('');

    /* ---- Event listeners ---- */

    document.getElementById('glCloseBtn').addEventListener('click', hidePanel);

    document.getElementById('glSaveBtn').addEventListener('click', function () {
      var name   = document.getElementById('glNameInput').value.trim();
      var tags   = document.getElementById('glTagsInput').value.trim();
      var urlStr = window.location.search || '';

      // Try to get the live URL from GrooveWriter if available
      if (window.myGrooveWriter && window.myGrooveWriter.updateCurrentURL) {
        window.myGrooveWriter.updateCurrentURL();
        urlStr = window.location.search;
      }

      if (!urlStr) {
        alert('Nothing to save - create a groove first.');
        return;
      }

      saveGroove(name || 'Untitled', tags, urlStr);
      renderPanel(document.getElementById('glSearchInput') ? document.getElementById('glSearchInput').value : '');
    });

    document.getElementById('glSearchInput').addEventListener('input', function () {
      renderPanel(this.value);
    });

    panel.querySelectorAll('.gl-btn-load').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var url = btn.getAttribute('data-url');
        if (url) {
          window.location.search = url;
        }
      });
    });

    panel.querySelectorAll('.gl-btn-del').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var row = panel.querySelector('.gl-row[data-id="' + id + '"]');
        var name = row ? row.querySelector('.gl-name').textContent : 'this groove';
        if (confirm('Delete "' + name + '"?')) {
          deleteGroove(id);
          renderPanel(document.getElementById('glSearchInput') ? document.getElementById('glSearchInput').value : '');
        }
      });
    });
  }

  /* ---- Show / hide panel ---- */

  function showPanel() {
    var panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = PANEL_ID;
      document.body.appendChild(panel);
    }
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    renderPanel('');
  }

  function hidePanel() {
    var panel = document.getElementById(PANEL_ID);
    if (panel) panel.style.display = 'none';
  }

  function togglePanel() {
    var panel = document.getElementById(PANEL_ID);
    if (panel && panel.style.display !== 'none') {
      hidePanel();
    } else {
      showPanel();
    }
  }

  /* ---- Expose on window ---- */

  window.GrooveLibrary = {
    show:   showPanel,
    hide:   hidePanel,
    toggle: togglePanel,
    save:   saveGroove,
    delete: deleteGroove,
    rename: renameGroove,
    search: searchGrooves,
    all:    loadAll
  };

}());
