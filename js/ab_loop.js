/* =======================================================
 * GrooveScribe A-B Loop - Improvement #6
 * Adds a visual A/B marker per measure. When both markers
 * are set, playback loops only the selected range.
 * Uses the existing create_MIDIURLFromGrooveData loop
 * architecture — slices hh/snare/kick/toms arrays to the
 * selected measure range before generating MIDI.
 * ======================================================= */

(function () {
  'use strict';

  /* ---- State ---- */
  var abLoopStart = null;   // 1-based measure index, or null
  var abLoopEnd   = null;

  /* ---- Public API used by groove_writer.js ---- */

  window.ABLoop = {
    getStart:   function () { return abLoopStart; },
    getEnd:     function () { return abLoopEnd; },
    isActive:   function () { return abLoopStart !== null && abLoopEnd !== null; },
    clear:      clear,
    setMarker:  setMarker,
    applyToGrooveData: applyToGrooveData
  };

  /* ---- Set A or B marker ---- */
  function setMarker(measureIndex) {
    if (abLoopStart === null || (abLoopEnd !== null)) {
      // Start fresh: set A point
      abLoopStart = measureIndex;
      abLoopEnd   = null;
    } else if (measureIndex === abLoopStart) {
      // Clicking A again clears
      clear();
      return;
    } else {
      // Set B point, ensure start <= end
      if (measureIndex < abLoopStart) {
        abLoopEnd   = abLoopStart;
        abLoopStart = measureIndex;
      } else {
        abLoopEnd = measureIndex;
      }
    }
    updateUI();
  }

  function clear() {
    abLoopStart = null;
    abLoopEnd   = null;
    updateUI();
  }

  /* ---- Slice grooveData arrays to the selected measure range ---- */
  function applyToGrooveData(grooveData) {
    if (!window.ABLoop.isActive()) return grooveData;

    var start = abLoopStart - 1;  // convert to 0-based
    var end   = abLoopEnd;        // exclusive upper bound (0-based)
    var npm   = grooveData.notesPerMeasure;

    var sliced = Object.assign({}, grooveData);
    sliced.numberOfMeasures = end - start;

    function sliceArr(arr) {
      if (!arr) return arr;
      return arr.slice(start * npm, end * npm);
    }

    sliced.hh_array    = sliceArr(grooveData.hh_array);
    sliced.snare_array = sliceArr(grooveData.snare_array);
    sliced.kick_array  = sliceArr(grooveData.kick_array);
    sliced.toms_array  = grooveData.toms_array
      ? grooveData.toms_array.map(function (t) { return sliceArr(t); })
      : grooveData.toms_array;

    return sliced;
  }

  /* ---- Update button appearance in the DOM ---- */
  function updateUI() {
    // Update all measure A/B buttons
    var btns = document.querySelectorAll('.ab-loop-btn');
    btns.forEach(function (btn) {
      var m = parseInt(btn.getAttribute('data-measure'), 10);
      btn.classList.remove('ab-a', 'ab-b', 'ab-range');

      if (abLoopStart !== null && abLoopEnd !== null) {
        if (m === abLoopStart) {
          btn.textContent = 'A';
          btn.classList.add('ab-a');
          btn.title = 'Loop start (click to clear)';
        } else if (m === abLoopEnd) {
          btn.textContent = 'B';
          btn.classList.add('ab-b');
          btn.title = 'Loop end (click to clear)';
        } else if (m > abLoopStart && m < abLoopEnd) {
          btn.textContent = '\u2022';
          btn.classList.add('ab-range');
          btn.title = 'In loop range';
        } else {
          btn.textContent = '\u25CB';
          btn.title = 'Click to set loop point';
        }
      } else if (abLoopStart !== null && m === abLoopStart) {
        btn.textContent = 'A';
        btn.classList.add('ab-a');
        btn.title = 'Loop start — click another measure to set end';
      } else {
        btn.textContent = '\u25CB';
        btn.title = 'Click to set A point';
      }
    });

    // Show/hide clear button
    var clearBtn = document.getElementById('abLoopClearBtn');
    if (clearBtn) {
      clearBtn.style.display = window.ABLoop.isActive() ? 'inline-flex' : 'none';
    }

    // Highlight loop-active indicator
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

  /* ---- Build HTML for an A/B button inside a measure container ---- */
  window.ABLoop.buttonHTML = function (measureIndex) {
    return '<span class="ab-loop-btn" data-measure="' + measureIndex +
           '" title="Click to set loop point" ' +
           'onclick="window.ABLoop.setMarker(' + measureIndex + '); ' +
           'if(window.myGrooveWriter) window.myGrooveWriter.updateCurrentURL();">' +
           '&#9675;</span>';
  };

}());
