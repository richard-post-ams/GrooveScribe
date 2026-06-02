/* =======================================================
 * GrooveScribe A-B Loop - Improvement #6
 * - Per-measure A/B marker buttons
 * - State persisted in sessionStorage across URL reloads
 * - Yellow highlight on measures inside the range
 * - Loops only the selected range during playback
 * ======================================================= */

(function () {
  'use strict';

  /* ---- State (restored from sessionStorage on load) ---- */
  var abLoopStart = null;
  var abLoopEnd   = null;

  function loadState() {
    try {
      var s = parseInt(sessionStorage.getItem('ab_start'), 10);
      var e = parseInt(sessionStorage.getItem('ab_end'),   10);
      abLoopStart = isNaN(s) ? null : s;
      abLoopEnd   = isNaN(e) ? null : e;
    } catch(ex) {}
  }

  function saveState() {
    try {
      if (abLoopStart !== null) sessionStorage.setItem('ab_start', abLoopStart);
      else sessionStorage.removeItem('ab_start');
      if (abLoopEnd !== null) sessionStorage.setItem('ab_end', abLoopEnd);
      else sessionStorage.removeItem('ab_end');
    } catch(ex) {}
  }

  /* ---- Public API ---- */
  window.ABLoop = {
    getStart:          function () { return abLoopStart; },
    getEnd:            function () { return abLoopEnd; },
    isActive:          function () { return abLoopStart !== null && abLoopEnd !== null; },
    clear:             clear,
    setMarker:         setMarker,
    applyToGrooveData: applyToGrooveData,
    injectButtons:     injectButtons
  };

  /* ---- Set A or B marker ---- */
  function setMarker(measureIndex) {
    if (abLoopStart === null || abLoopEnd !== null) {
      abLoopStart = measureIndex;
      abLoopEnd   = null;
    } else if (measureIndex === abLoopStart) {
      clear();
      return;
    } else {
      if (measureIndex < abLoopStart) {
        abLoopEnd   = abLoopStart;
        abLoopStart = measureIndex;
      } else {
        abLoopEnd = measureIndex;
      }
    }
    saveState();
    updateUI();
    // Reload the groove so the MIDI range takes effect
    if (window.myGrooveWriter && window.myGrooveWriter.updateCurrentURL) {
      window.myGrooveWriter.updateCurrentURL();
    }
  }

  function clear() {
    abLoopStart = null;
    abLoopEnd   = null;
    saveState();
    updateUI();
    if (window.myGrooveWriter && window.myGrooveWriter.updateCurrentURL) {
      window.myGrooveWriter.updateCurrentURL();
    }
  }

  /* ---- Slice grooveData arrays to selected measure range ---- */
  function applyToGrooveData(grooveData) {
    if (!window.ABLoop.isActive()) return grooveData;

    var start = abLoopStart - 1;
    var end   = abLoopEnd;
    var npm   = grooveData.notesPerMeasure;

    var sliced = Object.assign({}, grooveData);
    sliced.numberOfMeasures = end - start;

    function sliceArr(arr) {
      return arr ? arr.slice(start * npm, end * npm) : arr;
    }

    sliced.hh_array    = sliceArr(grooveData.hh_array);
    sliced.snare_array = sliceArr(grooveData.snare_array);
    sliced.kick_array  = sliceArr(grooveData.kick_array);
    sliced.toms_array  = grooveData.toms_array
      ? grooveData.toms_array.map(function (t) { return sliceArr(t); })
      : grooveData.toms_array;

    return sliced;
  }

  /* ---- Inject A/B button into a single staff container ---- */
  function injectButtonIntoContainer(container) {
    var measureIndex = parseInt(container.id.replace('staff-container', ''), 10);
    if (isNaN(measureIndex)) return;
    if (container.querySelector('.ab-loop-btn')) return;

    var btn = document.createElement('span');
    btn.className = 'ab-loop-btn';
    btn.setAttribute('data-measure', measureIndex);
    btn.title = 'Click to set A-B loop point';
    btn.textContent = '\u25CB';
    btn.addEventListener('click', function () {
      setMarker(measureIndex);
    });

    var closeBtn = container.querySelector('.closeMeasureButton');
    if (closeBtn && closeBtn.parentNode) {
      closeBtn.parentNode.insertBefore(btn, closeBtn.nextSibling);
    } else {
      container.appendChild(btn);
    }
  }

  /* ---- Inject buttons into all measure containers ---- */
  function injectButtons() {
    document.querySelectorAll('[id^="staff-container"]').forEach(function (c) {
      injectButtonIntoContainer(c);
    });
    updateUI();
  }

  /* ---- Watch for new measures added/removed ---- */
  function observeMeasureContainer() {
    var mc = document.getElementById('measureContainer');
    if (!mc) return;
    new MutationObserver(function () { injectButtons(); })
      .observe(mc, { childList: true, subtree: false });
  }

  /* ---- Update button visuals + yellow range highlight + indicator ---- */
  function updateUI() {
    // Update buttons
    document.querySelectorAll('.ab-loop-btn').forEach(function (btn) {
      var m = parseInt(btn.getAttribute('data-measure'), 10);
      btn.classList.remove('ab-a', 'ab-b', 'ab-range');

      if (abLoopStart !== null && abLoopEnd !== null) {
        if (m === abLoopStart) {
          btn.textContent = 'A';
          btn.classList.add('ab-a');
          btn.title = 'Loop start — click to clear';
        } else if (m === abLoopEnd) {
          btn.textContent = 'B';
          btn.classList.add('ab-b');
          btn.title = 'Loop end — click to clear';
        } else if (m > abLoopStart && m < abLoopEnd) {
          btn.textContent = '\u2022';
          btn.classList.add('ab-range');
          btn.title = 'Inside loop range';
        } else {
          btn.textContent = '\u25CB';
          btn.title = 'Click to set loop point';
        }
      } else if (abLoopStart !== null && m === abLoopStart) {
        btn.textContent = 'A';
        btn.classList.add('ab-a');
        btn.title = 'A set — click another measure to set B';
      } else {
        btn.textContent = '\u25CB';
        btn.title = 'Click to set A point';
      }
    });

    // Yellow background on staff containers inside A-B range
    document.querySelectorAll('[id^="staff-container"]').forEach(function (c) {
      var m = parseInt(c.id.replace('staff-container', ''), 10);
      c.classList.remove('ab-highlight-a', 'ab-highlight-b', 'ab-highlight-range');
      if (abLoopStart !== null && abLoopEnd !== null) {
        if      (m === abLoopStart)                   c.classList.add('ab-highlight-a');
        else if (m === abLoopEnd)                     c.classList.add('ab-highlight-b');
        else if (m > abLoopStart && m < abLoopEnd)    c.classList.add('ab-highlight-range');
      } else if (abLoopStart !== null && m === abLoopStart) {
        c.classList.add('ab-highlight-a');
      }
    });

    // Player bar indicator and clear button
    var clearBtn  = document.getElementById('abLoopClearBtn');
    var indicator = document.getElementById('abLoopIndicator');

    if (clearBtn)  clearBtn.style.display  = window.ABLoop.isActive() ? 'inline-flex' : 'none';

    if (indicator) {
      if (window.ABLoop.isActive()) {
        indicator.textContent = 'A-B: M' + abLoopStart + '\u2013M' + abLoopEnd;
        indicator.style.display = 'inline-block';
      } else if (abLoopStart !== null) {
        indicator.textContent = 'A: M' + abLoopStart + ' \u2014 click B';
        indicator.style.display = 'inline-block';
      } else {
        indicator.style.display = 'none';
      }
    }
  }

  /* ---- Init ---- */
  function init() {
    loadState();
    injectButtons();
    observeMeasureContainer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
