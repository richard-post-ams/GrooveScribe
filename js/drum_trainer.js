/* =======================================================
 * GrooveScribe Drum Trainer
 * Trainer button in top nav opens a panel with exercise
 * categories. Each exercise loads a groove into the editor.
 * ======================================================= */
(function () {
  'use strict';

  var PANEL_ID = 'trainerPanel';

  /* ================================================================
   * EXERCISE LIBRARY
   * url: the query string passed to window.location to load the groove
   * ================================================================ */
  var EXERCISES = {

    '8th Notes': [
      {
        id:    '8th_1',
        title: '1. Basic groove — straight 8ths',
        desc:  'Hi-hat on every 8th, snare on beats 2 and 4, kick on beat 1.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|xxxxxxxx|&S=|--O---O-|&K=|o-------|'
      },
      {
        id:    '8th_2a',
        title: '2a. Kick shifted +1 (and of 1)',
        desc:  'Move the kick one 8th note to the right — now on the "and" of beat 1.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|xxxxxxxx|&S=|--O---O-|&K=|-o------|'
      },
      {
        id:    '8th_2b',
        title: '2b. Kick shifted +2 (beat 2)',
        desc:  'Kick on beat 2.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|xxxxxxxx|&S=|--O---O-|&K=|--o-----|'
      },
      {
        id:    '8th_2c',
        title: '2c. Kick shifted +3 (and of 2)',
        desc:  'Kick on the "and" of beat 2.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|xxxxxxxx|&S=|--O---O-|&K=|---o----|'
      },
      {
        id:    '8th_2d',
        title: '2d. Kick shifted +4 (beat 3)',
        desc:  'Kick on beat 3.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|xxxxxxxx|&S=|--O---O-|&K=|----o---|'
      },
      {
        id:    '8th_3',
        title: '3. Double kick — beats 1 and 2',
        desc:  'Two kicks back to back: beat 1 and the and of 1.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|xxxxxxxx|&S=|--O---O-|&K=|oo------|'
      },
      {
        id:    '8th_3a',
        title: '3a. Double kick shifted +1',
        desc:  'Both kicks shifted one 8th to the right.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|xxxxxxxx|&S=|--O---O-|&K=|-oo-----|'
      },
      {
        id:    '8th_3b',
        title: '3b. Double kick shifted +2',
        desc:  'Double kick starting on beat 2.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|xxxxxxxx|&S=|--O---O-|&K=|--oo----|'
      },
      {
        id:    '8th_3c',
        title: '3c. Double kick shifted +3',
        desc:  'Double kick starting on the and of beat 2.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|xxxxxxxx|&S=|--O---O-|&K=|---oo---|'
      },
      {
        id:    '8th_4a',
        title: '4a. Snare shifted — beat 2½ and 4½',
        desc:  'Move both snare hits one 8th to the right (to the "and" of beats 2 and 4).',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|xxxxxxxx|&S=|---O---O|&K=|o-------|'
      },
      {
        id:    '8th_4b',
        title: '4b. Snare shifted — beat 3 only',
        desc:  'First snare moved to beat 3; second drops off.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|xxxxxxxx|&S=|----O---|&K=|o-------|'
      },
      {
        id:    '8th_4c',
        title: '4c. Snare shifted — and of beat 3',
        desc:  'Snare on the "and" of beat 3.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|xxxxxxxx|&S=|-----O--|&K=|o-------|'
      },
      {
        id:    '8th_4d',
        title: '4d. Snare shifted — beat 4 only',
        desc:  'Single snare on beat 4.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|xxxxxxxx|&S=|------O-|&K=|o-------|'
      },
      {
        id:    '8th_5',
        title: '5. Open hi-hat on the "and" of beat 1',
        desc:  'Hi-hat opens on the "and" of beat 1 — classic rock fill-in technique.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|xoxxxxxx|&S=|--O---O-|&K=|o-------|'
      }
    ]
  };

  /* ================================================================
   * Panel open / close
   * ================================================================ */

  window.DrumTrainer = {
    toggle: togglePanel
  };

  function togglePanel() {
    var panel = document.getElementById(PANEL_ID);
    if (!panel) {
      buildPanel();
      panel = document.getElementById(PANEL_ID);
    }
    var visible = panel.style.display !== 'none' && panel.style.display !== '';
    panel.style.display = visible ? 'none' : 'flex';
  }

  function hidePanel() {
    var panel = document.getElementById(PANEL_ID);
    if (panel) panel.style.display = 'none';
  }

  /* ================================================================
   * Build the panel DOM
   * ================================================================ */
  function buildPanel() {
    var existing = document.getElementById(PANEL_ID);
    if (existing) return;

    var panel = document.createElement('div');
    panel.id = PANEL_ID;

    var categories = Object.keys(EXERCISES);

    var catsHTML = categories.map(function (cat) {
      return '<option value="' + escH(cat) + '">' + escH(cat) + '</option>';
    }).join('');

    var firstCat  = categories[0];
    var firstList = renderExerciseList(firstCat);

    panel.innerHTML = [
      '<div class="tr-header">',
      '  <span class="tr-title">&#x1F941; Drum Trainer</span>',
      '  <button class="tr-close" id="trCloseBtn">&times;</button>',
      '</div>',
      '<div class="tr-subheader">',
      '  <select class="tr-category-select" id="trCategorySelect">' + catsHTML + '</select>',
      '</div>',
      '<div class="tr-list" id="trExerciseList">' + firstList + '</div>',
      '<div class="tr-footer" id="trFooter"></div>'
    ].join('\n');

    document.body.appendChild(panel);

    // Close
    panel.querySelector('#trCloseBtn').addEventListener('click', hidePanel);

    // Category switch
    panel.querySelector('#trCategorySelect').addEventListener('change', function () {
      document.getElementById('trExerciseList').innerHTML = renderExerciseList(this.value);
      document.getElementById('trFooter').innerHTML = '';
      bindExerciseClicks();
    });

    bindExerciseClicks();
  }

  function renderExerciseList(category) {
    var list = EXERCISES[category];
    if (!list || list.length === 0) return '<p class="tr-empty">No exercises yet.</p>';

    return list.map(function (ex, idx) {
      return [
        '<div class="tr-exercise" data-url="' + escH(ex.url) + '" data-id="' + escH(ex.id) + '">',
        '  <div class="tr-ex-num">' + (idx + 1) + '</div>',
        '  <div class="tr-ex-body">',
        '    <div class="tr-ex-title">' + escH(ex.title) + '</div>',
        '    <div class="tr-ex-desc">'  + escH(ex.desc)  + '</div>',
        '  </div>',
        '  <button class="tr-load-btn" data-url="' + escH(ex.url) + '">Load &#9654;</button>',
        '</div>'
      ].join('\n');
    }).join('\n');
  }

  function bindExerciseClicks() {
    var panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    panel.querySelectorAll('.tr-load-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        loadGroove(btn.getAttribute('data-url'));
        // Highlight active
        panel.querySelectorAll('.tr-exercise').forEach(function (el) {
          el.classList.remove('tr-active');
        });
        btn.closest('.tr-exercise').classList.add('tr-active');
      });
    });
  }

  /* ================================================================
   * Load a groove by setting window.location.search
   * ================================================================ */
  function loadGroove(urlQuery) {
    window.location.search = urlQuery;
  }

  /* ================================================================
   * Helpers
   * ================================================================ */
  function escH(str) {
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

}());
