/* =======================================================
 * GrooveScribe MIDI Importer
 * Parses a standard GM MIDI file, extracts the drum track
 * (channel 10), quantises to 8th or 16th grid, builds the
 * H/S/K URL arrays and loads the groove into the editor.
 * ======================================================= */
(function () {
  'use strict';

  var PANEL_ID = 'midiImportPanel';

  /* ---- GM drum note → GrooveScribe instrument ---- */
  var NOTE_MAP = {
    // Kick
    35: 'kick', 36: 'kick',
    // Snare
    38: 'snare', 40: 'snare', 37: 'snare_ghost',
    // Hi-hat
    42: 'hh_normal', 44: 'hh_foot', 46: 'hh_open',
    // Crash (map to HH line as crash)
    49: 'crash', 57: 'crash',
    // Ride (map to HH line as ride)
    51: 'ride', 53: 'ride_bell'
  };

  /* ---- Public API ---- */
  window.MidiImport = {
    toggle: togglePanel
  };

  /* ---- Panel ---- */
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

  function buildPanel() {
    var panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = [
      '<div class="mi-header">',
      '  <span class="mi-title">&#127925; Import MIDI</span>',
      '  <button class="mi-close" id="miCloseBtn">&times;</button>',
      '</div>',
      '<div class="mi-body">',
      '  <p class="mi-hint">Load a standard GM MIDI drum file.<br>Kick, snare and hi-hat will be extracted.</p>',
      '  <div class="mi-row">',
      '    <label class="mi-label">Grid</label>',
      '    <select class="mi-select" id="miGrid">',
      '      <option value="16">16th notes</option>',
      '      <option value="8">8th notes</option>',
      '    </select>',
      '  </div>',
      '  <div class="mi-row">',
      '    <label class="mi-label">Bar to import</label>',
      '    <select class="mi-select" id="miBar">',
      '      <option value="0">Bar 1</option>',
      '      <option value="1">Bar 2</option>',
      '      <option value="2">Bar 3</option>',
      '      <option value="3">Bar 4</option>',
      '      <option value="4">Bar 5</option>',
      '      <option value="5">Bar 6</option>',
      '      <option value="6">Bar 7</option>',
      '      <option value="7">Bar 8</option>',
      '      <option value="8">Bar 9</option>',
      '      <option value="9">Bar 10</option>',
      '      <option value="10">Bar 11</option>',
      '      <option value="11">Bar 12</option>',
      '      <option value="12">Bar 13</option>',
      '      <option value="13">Bar 14</option>',
      '      <option value="14">Bar 15</option>',
      '      <option value="15">Bar 16</option>',
      '    </select>',
      '  </div>',
      '  <div class="mi-row">',
      '    <label class="mi-label">Measures to load</label>',
      '    <select class="mi-select" id="miMeasures">',
      '      <option value="1">1</option>',
      '      <option value="2">2</option>',
      '      <option value="4">4</option>',
      '    </select>',
      '  </div>',
      '  <label class="mi-file-btn" id="miFileLabel">',
      '    &#128194; Choose MIDI file',
      '    <input type="file" id="miFileInput" accept=".mid,.midi" style="display:none;">',
      '  </label>',
      '  <div class="mi-filename" id="miFilename">No file selected</div>',
      '  <div class="mi-status" id="miStatus"></div>',
      '</div>'
    ].join('\n');

    document.body.appendChild(panel);

    panel.querySelector('#miCloseBtn').addEventListener('click', hidePanel);
    panel.querySelector('#miFileInput').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      document.getElementById('miFilename').textContent = file.name;
      document.getElementById('miStatus').textContent = '';
      var reader = new FileReader();
      reader.onload = function (ev) {
        try {
          var grid     = parseInt(document.getElementById('miGrid').value, 10);
          var barStart = parseInt(document.getElementById('miBar').value, 10);
          var numBars  = parseInt(document.getElementById('miMeasures').value, 10);
          var url      = parseMidi(new Uint8Array(ev.target.result), grid, barStart, numBars);
          document.getElementById('miStatus').textContent = 'Loaded! Opening groove...';
          setTimeout(function () {
            hidePanel();
            window.location.search = url;
          }, 600);
        } catch (err) {
          document.getElementById('miStatus').textContent = 'Error: ' + err.message;
          console.error('[MidiImport]', err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  /* ================================================================
   * MIDI Parser
   * ================================================================ */
  function parseMidi(bytes, grid, barStart, numBars) {
    var pos = 0;

    function read(n) {
      var slice = bytes.slice(pos, pos + n);
      pos += n;
      return slice;
    }
    function readUint32() {
      var b = read(4);
      return (b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3];
    }
    function readUint16() {
      var b = read(2);
      return (b[0] << 8) | b[1];
    }
    function readVarLen() {
      var val = 0, b;
      do { b = bytes[pos++]; val = (val << 7) | (b & 0x7f); } while (b & 0x80);
      return val;
    }

    // Header
    if (String.fromCharCode.apply(null, read(4)) !== 'MThd') throw new Error('Not a MIDI file');
    readUint32(); // header length (always 6)
    var format   = readUint16();
    var numTracks = readUint16();
    var ticksPerBeat = readUint16();
    if (ticksPerBeat & 0x8000) throw new Error('SMPTE timecode not supported');

    // Parse all tracks, collect note-on events on channel 9 (0-indexed = ch10)
    var tempo     = 500000; // default 120 BPM
    var allNotes  = []; // {tick, note, velocity}

    for (var t = 0; t < numTracks; t++) {
      if (String.fromCharCode.apply(null, read(4)) !== 'MTrk') throw new Error('Bad track header');
      var trackLen = readUint32();
      var trackEnd = pos + trackLen;
      var tick = 0;
      var lastStatus = 0;

      while (pos < trackEnd) {
        var delta = readVarLen();
        tick += delta;
        var statusByte = bytes[pos];

        if (statusByte & 0x80) {
          lastStatus = statusByte;
          pos++;
        } else {
          statusByte = lastStatus; // running status
        }

        var type    = (statusByte & 0xf0) >> 4;
        var channel = statusByte & 0x0f;

        if (type === 0x0f) {
          // Meta event
          var metaType = bytes[pos++];
          var metaLen  = readVarLen();
          if (metaType === 0x51 && metaLen === 3) {
            // Tempo
            tempo = (bytes[pos] << 16) | (bytes[pos+1] << 8) | bytes[pos+2];
          }
          pos += metaLen;
        } else if (type === 0x0f - 1) {
          // SysEx
          var sysexLen = readVarLen();
          pos += sysexLen;
        } else if (type === 0x09 && channel === 9) {
          // Note-on on channel 10 (drums)
          var note = bytes[pos++];
          var vel  = bytes[pos++];
          if (vel > 0) {
            allNotes.push({ tick: tick, note: note, velocity: vel });
          }
        } else if (type === 0x09 || type === 0x08) {
          pos += 2;
        } else if (type === 0x0a || type === 0x0b || type === 0x0e) {
          pos += 2;
        } else if (type === 0x0c || type === 0x0d) {
          pos += 1;
        } else {
          pos++; // unknown, skip one byte
        }
      }
      pos = trackEnd;
    }

    if (allNotes.length === 0) throw new Error('No drum notes found. Make sure the MIDI file has a drum track (channel 10).');

    // Calculate ticks per bar and per grid slot
    var bpm           = Math.round(60000000 / tempo);
    var ticksPerBar   = ticksPerBeat * 4; // assumes 4/4
    var slotsPerBar   = grid;             // 8 or 16
    var ticksPerSlot  = ticksPerBeat * 4 / slotsPerBar;
    var totalSlots    = slotsPerBar * numBars;
    var startTick     = barStart * ticksPerBar;
    var endTick       = startTick + numBars * ticksPerBar;

    // Build empty arrays
    var hhArr = [], snArr = [], kArr = [];
    for (var i = 0; i < totalSlots; i++) {
      hhArr.push('-'); snArr.push('-'); kArr.push('-');
    }

    // Quantise and place notes
    allNotes.forEach(function (ev) {
      if (ev.tick < startTick || ev.tick >= endTick) return;
      var relTick  = ev.tick - startTick;
      var slot     = Math.round(relTick / ticksPerSlot);
      if (slot >= totalSlots) slot = totalSlots - 1;
      var inst     = NOTE_MAP[ev.note];
      if (!inst) return;
      var vel      = ev.velocity;
      var isAccent = vel >= 100;
      var isGhost  = vel < 50;

      if (inst === 'kick') {
        kArr[slot] = 'o';
      } else if (inst === 'snare') {
        snArr[slot] = isAccent ? 'O' : isGhost ? 'g' : 'o';
      } else if (inst === 'snare_ghost') {
        if (snArr[slot] === '-') snArr[slot] = 'g';
      } else if (inst === 'hh_normal') {
        hhArr[slot] = isAccent ? 'X' : 'x';
      } else if (inst === 'hh_open') {
        hhArr[slot] = 'o';
      } else if (inst === 'hh_foot') {
        if (hhArr[slot] === '-') hhArr[slot] = '+';
      } else if (inst === 'crash') {
        hhArr[slot] = 'c';
      } else if (inst === 'ride') {
        hhArr[slot] = 'r';
      }
    });

    // Split into measure chunks for URL encoding
    function buildMeasureStr(arr) {
      var out = '';
      for (var m = 0; m < numBars; m++) {
        out += '|' + arr.slice(m * slotsPerBar, (m + 1) * slotsPerBar).join('');
      }
      return out + '|';
    }

    var url = '?TimeSig=4/4'
      + '&Div=' + grid
      + '&Tempo=' + bpm
      + '&Measures=' + numBars
      + '&H=' + buildMeasureStr(hhArr)
      + '&S=' + buildMeasureStr(snArr)
      + '&K=' + buildMeasureStr(kArr);

    return url;
  }

}());
