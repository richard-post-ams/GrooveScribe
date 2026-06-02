/* =======================================================
 * GrooveScribe MIDI Importer v2
 * - Bar selection: All / Specific / Range
 * - Filename parsed for Title/Author → shown in notation
 * ======================================================= */
(function () {
  'use strict';

  var PANEL_ID = 'midiImportPanel';

  var NOTE_MAP = {
    35: 'kick', 36: 'kick',
    38: 'snare', 40: 'snare', 37: 'snare_ghost',
    42: 'hh_normal', 44: 'hh_foot', 46: 'hh_open',
    49: 'crash', 57: 'crash',
    51: 'ride', 53: 'ride_bell'
  };

  window.MidiImport = { toggle: togglePanel };

  /* ---- Panel ---- */
  function togglePanel() {
    var panel = document.getElementById(PANEL_ID);
    if (!panel) { buildPanel(); panel = document.getElementById(PANEL_ID); }
    var visible = panel.style.display !== 'none' && panel.style.display !== '';
    panel.style.display = visible ? 'none' : 'flex';
  }

  function hidePanel() {
    var panel = document.getElementById(PANEL_ID);
    if (panel) panel.style.display = 'none';
  }

  function barOptions(selectedVal) {
    var opts = '';
    for (var i = 1; i <= 32; i++) {
      opts += '<option value="' + i + '"' + (i === selectedVal ? ' selected' : '') + '>Bar ' + i + '</option>';
    }
    return opts;
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
      '  <div class="mi-row mi-row-top">',
      '    <label class="mi-label">Bar selection</label>',
      '  </div>',
      '  <div class="mi-bar-modes">',
      '    <label class="mi-radio-label"><input type="radio" name="miBarMode" value="all" checked> All bars</label>',
      '    <label class="mi-radio-label"><input type="radio" name="miBarMode" value="specific"> Specific bar</label>',
      '    <label class="mi-radio-label"><input type="radio" name="miBarMode" value="range"> Bar range</label>',
      '  </div>',
      '  <div class="mi-bar-options" id="miBarSpecific" style="display:none;">',
      '    <select class="mi-select" id="miBarSingle">' + barOptions(1) + '</select>',
      '  </div>',
      '  <div class="mi-bar-options mi-bar-range-row" id="miBarRange" style="display:none;">',
      '    <select class="mi-select" id="miBarFrom">' + barOptions(1) + '</select>',
      '    <span class="mi-range-sep">to</span>',
      '    <select class="mi-select" id="miBarTo">' + barOptions(4) + '</select>',
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

    // Bar mode radio buttons
    panel.querySelectorAll('input[name="miBarMode"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        document.getElementById('miBarSpecific').style.display = this.value === 'specific' ? 'block' : 'none';
        document.getElementById('miBarRange').style.display    = this.value === 'range'    ? 'flex'  : 'none';
      });
    });

    panel.querySelector('#miFileInput').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      document.getElementById('miFilename').textContent = file.name;
      document.getElementById('miStatus').textContent = '';

      var reader = new FileReader();
      reader.onload = function (ev) {
        try {
          var grid    = parseInt(document.getElementById('miGrid').value, 10);
          var mode    = panel.querySelector('input[name="miBarMode"]:checked').value;
          var bytes   = new Uint8Array(ev.target.result);

          // Parse to count total bars first
          var parsed      = parseMidiData(bytes);
          var totalBars   = parsed.totalBars;
          var barStart, numBars;

          if (mode === 'all') {
            barStart = 0;
            numBars  = Math.min(totalBars, 32); // cap at 32 (our max measures)
          } else if (mode === 'specific') {
            barStart = parseInt(document.getElementById('miBarSingle').value, 10) - 1;
            numBars  = 1;
          } else {
            barStart = parseInt(document.getElementById('miBarFrom').value, 10) - 1;
            var barEnd = parseInt(document.getElementById('miBarTo').value, 10);
            numBars  = Math.max(1, barEnd - barStart);
          }

          // Clamp to available bars
          if (barStart >= totalBars) barStart = 0;
          if (barStart + numBars > totalBars) numBars = totalBars - barStart;
          if (numBars < 1) numBars = 1;

          var titleInfo = parseFilename(file.name);
          var url = buildGrooveUrl(parsed, grid, barStart, numBars, titleInfo);

          document.getElementById('miStatus').textContent =
            'Found ' + totalBars + ' bars. Loading ' + numBars + ' bar' + (numBars > 1 ? 's' : '') + '...';

          setTimeout(function () { hidePanel(); window.location.search = url; }, 700);
        } catch (err) {
          document.getElementById('miStatus').textContent = 'Error: ' + err.message;
          console.error('[MidiImport]', err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  /* ================================================================
   * Filename parser  →  { title, author }
   * Handles: "Artist - Title.mid", "Title.mid", "Artist_Title.mid"
   * ================================================================ */
  function parseFilename(filename) {
    // Remove extension
    var base = filename.replace(/\.(mid|midi)$/i, '').trim();

    // Common separators: " - ", " – ", "_-_"
    var dashMatch = base.match(/^(.+?)\s*[-–]\s*(.+)$/);
    if (dashMatch) {
      return { author: cleanStr(dashMatch[1]), title: cleanStr(dashMatch[2]) };
    }

    // Underscore separator: Artist_Title
    var underMatch = base.match(/^([A-Z][a-z]+(?:_[A-Z][a-z]+)*)_(.+)$/);
    if (underMatch) {
      return { author: cleanStr(underMatch[1].replace(/_/g,' ')), title: cleanStr(underMatch[2].replace(/_/g,' ')) };
    }

    // No separator — treat whole thing as title
    return { author: '', title: cleanStr(base) };
  }

  function cleanStr(s) {
    return s.replace(/[_]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* ================================================================
   * MIDI Parser — returns { tempo, ticksPerBeat, allNotes, totalBars }
   * ================================================================ */
  function parseMidiData(bytes) {
    var pos = 0;

    function read(n)      { var s = bytes.slice(pos, pos+n); pos+=n; return s; }
    function readUint32() { var b=read(4); return (b[0]<<24)|(b[1]<<16)|(b[2]<<8)|b[3]; }
    function readUint16() { var b=read(2); return (b[0]<<8)|b[1]; }
    function readVarLen() {
      var val=0, b;
      do { b=bytes[pos++]; val=(val<<7)|(b&0x7f); } while (b&0x80);
      return val;
    }

    if (String.fromCharCode.apply(null, read(4)) !== 'MThd') throw new Error('Not a MIDI file');
    readUint32();
    readUint16(); // format
    var numTracks    = readUint16();
    var ticksPerBeat = readUint16();
    if (ticksPerBeat & 0x8000) throw new Error('SMPTE timecode not supported');

    var tempo    = 500000;
    var allNotes = [];
    var maxTick  = 0;

    for (var t = 0; t < numTracks; t++) {
      if (String.fromCharCode.apply(null, read(4)) !== 'MTrk') throw new Error('Bad track header');
      var trackLen = readUint32();
      var trackEnd = pos + trackLen;
      var tick = 0, lastStatus = 0;

      while (pos < trackEnd) {
        tick += readVarLen();
        var statusByte = bytes[pos];
        if (statusByte & 0x80) { lastStatus = statusByte; pos++; }
        else { statusByte = lastStatus; }

        var type    = (statusByte & 0xf0) >> 4;
        var channel = statusByte & 0x0f;

        if (type === 0x0f) {
          var metaType = bytes[pos++];
          var metaLen  = readVarLen();
          if (metaType === 0x51 && metaLen === 3)
            tempo = (bytes[pos]<<16)|(bytes[pos+1]<<8)|bytes[pos+2];
          pos += metaLen;
        } else if (type === 0x0e) {
          // SysEx
          pos += readVarLen();
        } else if (type === 0x09 && channel === 9) {
          var note = bytes[pos++], vel = bytes[pos++];
          if (vel > 0) { allNotes.push({tick:tick, note:note, velocity:vel}); if (tick>maxTick) maxTick=tick; }
        } else if (type === 0x09 || type === 0x08 || type === 0x0a || type === 0x0b || type === 0x0e) {
          pos += 2;
        } else if (type === 0x0c || type === 0x0d) {
          pos += 1;
        } else { pos++; }
      }
      pos = trackEnd;
    }

    if (allNotes.length === 0) throw new Error('No drum notes found. Is this a GM MIDI file with drums on channel 10?');

    var ticksPerBar = ticksPerBeat * 4;
    var totalBars   = Math.ceil((maxTick + ticksPerBar) / ticksPerBar);

    return { tempo: tempo, ticksPerBeat: ticksPerBeat, allNotes: allNotes, totalBars: totalBars };
  }

  /* ================================================================
   * Build groove URL from parsed data
   * ================================================================ */
  function buildGrooveUrl(parsed, grid, barStart, numBars, titleInfo) {
    var ticksPerBeat = parsed.ticksPerBeat;
    var ticksPerBar  = ticksPerBeat * 4;
    var ticksPerSlot = ticksPerBeat * 4 / grid;
    var totalSlots   = grid * numBars;
    var startTick    = barStart * ticksPerBar;
    var endTick      = startTick + numBars * ticksPerBar;
    var bpm          = Math.round(60000000 / parsed.tempo);

    var hhArr = [], snArr = [], kArr = [];
    for (var i = 0; i < totalSlots; i++) { hhArr.push('-'); snArr.push('-'); kArr.push('-'); }

    parsed.allNotes.forEach(function (ev) {
      if (ev.tick < startTick || ev.tick >= endTick) return;
      var slot = Math.round((ev.tick - startTick) / ticksPerSlot);
      if (slot >= totalSlots) slot = totalSlots - 1;
      var inst = NOTE_MAP[ev.note];
      if (!inst) return;
      var isAccent = ev.velocity >= 100, isGhost = ev.velocity < 50;

      if      (inst === 'kick')       kArr[slot] = 'o';
      else if (inst === 'snare')      snArr[slot] = isAccent ? 'O' : isGhost ? 'g' : 'o';
      else if (inst === 'snare_ghost' && snArr[slot] === '-') snArr[slot] = 'g';
      else if (inst === 'hh_normal')  hhArr[slot] = isAccent ? 'X' : 'x';
      else if (inst === 'hh_open')    hhArr[slot] = 'o';
      else if (inst === 'hh_foot' && hhArr[slot] === '-') hhArr[slot] = '+';
      else if (inst === 'crash')      hhArr[slot] = 'c';
      else if (inst === 'ride')       hhArr[slot] = 'r';
    });

    function measureStr(arr) {
      var out = '';
      for (var m = 0; m < numBars; m++)
        out += '|' + arr.slice(m * grid, (m + 1) * grid).join('');
      return out + '|';
    }

    var url = '?TimeSig=4/4'
      + '&Div='     + grid
      + '&Tempo='   + bpm
      + '&Measures='+ numBars
      + '&H='       + measureStr(hhArr)
      + '&S='       + measureStr(snArr)
      + '&K='       + measureStr(kArr);

    if (titleInfo.title)  url += '&Title='  + encodeURIComponent(titleInfo.title);
    if (titleInfo.author) url += '&Author=' + encodeURIComponent(titleInfo.author);

    return url;
  }

}());
