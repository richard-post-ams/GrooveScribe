/* =======================================================
 * GrooveScribe Drum Trainer
 * Trainer button in top nav opens a panel with exercise
 * categories. Each exercise loads a groove into the editor.
 * ======================================================= */
(function () {
  'use strict';

  var PANEL_ID    = 'trainerPanel';
  var currentCat  = sessionStorage.getItem('tr_cat') || null;
  var currentIdx  = parseInt(sessionStorage.getItem('tr_idx') || '-1', 10);

  /* ================================================================
   * EXERCISE LIBRARY
   * url: the query string passed to window.location to load the groove
   * ================================================================ */
  var EXERCISES = {

    '8th Notes': [
      {
        id:    '8th_01',
        title: '1. Hi-hat only — straight 8ths',
        desc:  'Right hand only. Eight even 8th notes. Focus on consistency and a relaxed grip.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|xxxxxxxx|&S=|--------|&K=|--------|'
      },
      {
        id:    '8th_02',
        title: '2. Hi-hat + snare on beat 3',
        desc:  'Add the snare on beat 3 only. One point of focus for the left hand.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|xxxxxxxx|&S=|----O---|&K=|--------|'
      },
      {
        id:    '8th_03',
        title: '3. Hi-hat + snare on 2 and 4',
        desc:  'The standard backbeat. This is the foundation of almost all popular music.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|xxxxxxxx|&S=|--O---O-|&K=|--------|'
      },
      {
        id:    '8th_04',
        title: '4. Full basic groove — kick on beat 1',
        desc:  'Add the kick on beat 1. Hi-hat, snare 2 and 4, kick 1. The complete starter groove.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|xxxxxxxx|&S=|--O---O-|&K=|o-------|'
      },
      {
        id:    '8th_05',
        title: '5. Kick on beats 1 and 3',
        desc:  'The most common rock kick pattern. Kick lands on beats 1 and 3, snare on 2 and 4.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|xxxxxxxx|&S=|--O---O-|&K=|o---o---|'
      },
      {
        id:    '8th_06',
        title: '6. Kick on 1 and the "and" of 2',
        desc:  'First syncopated kick. The second kick lands between beats 2 and 3.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|xxxxxxxx|&S=|--O---O-|&K=|o--o----|'
      },
      {
        id:    '8th_07',
        title: '7. Kick on 1, "and" of 2, and 3',
        desc:  'Building the kick pattern. Three kicks — the groove starts to move forward.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|xxxxxxxx|&S=|--O---O-|&K=|o--oo---|'
      },
      {
        id:    '8th_08',
        title: '8. Four-on-the-floor',
        desc:  'Kick on every beat: 1, 2, 3, 4. The foundation of disco, house and EDM.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|xxxxxxxx|&S=|--O---O-|&K=|o-o-o-o-|'
      },
      {
        id:    '8th_09',
        title: '9. Kick on the "and" of 1 and beat 3',
        desc:  'Off-beat kick feel. The kick avoids the downbeats — common in funk and R&B.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|xxxxxxxx|&S=|--O---O-|&K=|-o--o---|'
      },
      {
        id:    '8th_10',
        title: '10. Open hi-hat on the "and" of 2',
        desc:  'Open the hi-hat between beats 2 and 3. Close it on beat 3. Classic rock technique.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|x-xox-x-|&S=|--O---O-|&K=|o---o---|'
      },
      {
        id:    '8th_11',
        title: '11. Open hi-hat on the "and" of 4',
        desc:  'Open the hi-hat on the last 8th of the bar — it leads into beat 1 of the next bar.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|x-x-x-xo|&S=|--O---O-|&K=|o---o---|'
      },
      {
        id:    '8th_12',
        title: '12. Ghost note before beat 2',
        desc:  'Add a soft ghost note on the snare on the "and" of 1. Introduction to dynamics.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|xxxxxxxx|&S=|-gO---O-|&K=|o---o---|'
      },
      {
        id:    '8th_13',
        title: '13. Two-bar phrase',
        desc:  'Basic groove for one bar, then a simplified fill setup in bar 2. Think in phrases.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=2&H=|xxxxxxxx|xxxxxxxx|&S=|--O---O-|--O--OOO|&K=|o---o---|o-------|'
      },
      {
        id:    '8th_14',
        title: '14. Combination — syncopated kick + open hi-hat',
        desc:  'Putting it all together. Syncopated kick, open hi-hat on the and of 4, snare on 2 and 4.',
        url:   '?TimeSig=4/4&Div=8&Tempo=60&Measures=1&H=|x-x-x-xo|&S=|--O---O-|&K=|o--o----|'
      }
    ]
  };;

  /* ================================================================
   * Panel open / close
   * ================================================================ */

  window.DrumTrainer = {
    toggle:            togglePanel,
    next:              function () { navigate(1); },
    prev:              function () { navigate(-1); },
    updateNavButtons:  updateNavButtons
  };

  // Restore nav bar state after page reload
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateNavButtons);
  } else {
    updateNavButtons();
  }

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
        '  <div class="tr-ex-title">' + escH(ex.title) + '</div>',
        '</div>'
      ].join('\n');
    }).join('\n');
  }

  function bindExerciseClicks() {
    var panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    var cat = panel.querySelector('#trCategorySelect') ?
              panel.querySelector('#trCategorySelect').value :
              Object.keys(EXERCISES)[0];

    panel.querySelectorAll('.tr-exercise').forEach(function (row, idx) {
      row.style.cursor = 'pointer';
      row.addEventListener('click', function () {
        loadGroove(row.getAttribute('data-url'), cat, idx);
        panel.querySelectorAll('.tr-exercise').forEach(function (el) {
          el.classList.remove('tr-active');
        });
        row.classList.add('tr-active');
      });
    });
  }

  /* ================================================================
   * Load a groove by setting window.location.search
   * ================================================================ */
  function loadGroove(urlQuery, cat, idx) {
    if (cat !== undefined) currentCat = cat;
    if (idx !== undefined) currentIdx = idx;
    // Persist before reload so nav bar survives the page reload
    try {
      sessionStorage.setItem('tr_cat', currentCat || '');
      sessionStorage.setItem('tr_idx', String(currentIdx));
    } catch(e) {}
    window.location.search = urlQuery;
  }

  function navigate(delta) {
    var cat  = currentCat || Object.keys(EXERCISES)[0];
    var list = EXERCISES[cat] || [];
    var next = currentIdx + delta;
    if (next < 0 || next >= list.length) return;
    var ex = list[next];
    currentIdx = next;
    try {
      sessionStorage.setItem('tr_cat', currentCat || '');
      sessionStorage.setItem('tr_idx', String(currentIdx));
    } catch(e) {}
    updateNavButtons();
    // Highlight row in panel if open
    var panel = document.getElementById(PANEL_ID);
    if (panel) {
      panel.querySelectorAll('.tr-exercise').forEach(function (row) {
        row.classList.remove('tr-active');
      });
      var rows = panel.querySelectorAll('.tr-exercise');
      if (rows[next]) rows[next].classList.add('tr-active');
    }
    window.location.search = ex.url;
  }

  function updateNavButtons() {
    var cat   = currentCat || Object.keys(EXERCISES)[0];
    var list  = EXERCISES[cat] || [];
    var total = list.length;

    var prev  = document.getElementById('trainerNavPrev');
    var next  = document.getElementById('trainerNavNext');
    var label = document.getElementById('trainerNavLabel');

    if (!prev || !next) return;

    // Show nav bar only when a trainer exercise is active
    var bar = document.getElementById('trainerNavBar');
    if (bar) bar.style.display = currentIdx >= 0 ? 'flex' : 'none';

    prev.disabled  = currentIdx <= 0;
    next.disabled  = currentIdx < 0 || currentIdx >= total - 1;

    if (label && currentIdx >= 0 && list[currentIdx]) {
      label.textContent = list[currentIdx].title;
    }
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
