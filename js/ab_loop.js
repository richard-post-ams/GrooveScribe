/* =======================================================
 * GrooveScribe A-B Loop - Improvement #6
 * Adds a visual A/B marker per measure. When both markers
 * are set, playback loops only the selected range.
 *
 * Fix: buttons are injected via MutationObserver on
 * measureContainer so load order doesn't matter.
 * ======================================================= */

(function () {
  'use strict';

  /* ---- State ---- */
  var abLoopStart = null;
  var abLoopEnd   = null;

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
    updateUI();
    // Force MIDI reload so the loop range takes effect immediately
    if (window.myGrooveWriter && window.myGrooveWriter.updateCurrentURL) {
      window.myGrooveWriter.updateCurrentURL();
    }
  }

  function clear() {
    abLoopStart = null;
    abLoopEnd   = null;
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
    if (container.querySelector('.ab-loop-btn')) return; // already injected

    var btn = document.createElement('span');
    btn.className = 'ab-loop-btn';
    btn.setAttribute('data-measure', measureIndex);
    btn.title = 'Click to set A-B loop point';
    btn.textContent = '\u25CB';
    btn.addEventListener('click', function () {
      setMarker(measureIndex);
    });

    // Append after the closeMeasureButton span
    var closeBtn = container.querySelector('.closeMeasureButton');
    if (closeBtn && closeBtn.parentNode) {
      closeBtn.parentNode.insertBefore(btn, closeBtn.nextSibling);
    } else {
      container.appendChild(btn);
    }
  }

  /* ---- Inject buttons into all existing measure containers ---- */
  function injectButtons() {
    var containers = document.querySelectorAll('[id^="staff-container"]');
    containers.forEach(function (c) {
      injectButtonIntoContainer(c);
    });
    updateUI();
  }

  /* ---- Watch for new measures being added/removed ---- */
  function observeMeasureContainer() {
    var measureContainer = document.getElementById('measureContainer');
    if (!measureContainer) return;

    var observer = new MutationObserver(function () {
      injectButtons();
    });
    observer.observe(measureContainer, { childList: true, subtree: false });
  }

  /* ---- Update all button visuals and the player indicator ---- */
  function updateUI() {
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

    var clearBtn = document.getElementById('abLoopClearBtn');
    if (clearBtn) {
      clearBtn.style.display = window.ABLoop.isActive() ? 'inline-flex' : 'none';
    }

    var indicator = document.getElementById('abLoopIndicator');
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

  /* ---- Init on DOMContentLoaded ---- */
  function init() {
    injectButtons();
    observeMeasureContainer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
