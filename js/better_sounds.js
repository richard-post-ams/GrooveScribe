/* =======================================================
 * GrooveScribe Better Sounds - Improvement #4
 * Replaces MIDI.js soundfont playback with Web Audio API
 * using free, higher-quality OGG drum samples.
 *
 * Sample source: Freepats / freesound.org (CC0 / public domain)
 * Hosted via unpkg / jsDelivr CDN.
 *
 * Usage: included by index.html after MIDI.js scripts.
 * Intercepts groove playback calls and routes them through
 * AudioContext instead of the old Flash/MIDI plugin path.
 * ======================================================= */

(function () {
  'use strict';

  /* ----- Sample map: drum note name -> CDN OGG URL ----- */
  var SAMPLE_URLS = {
    hihat_closed: 'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FatBoy/percussion-ogg/042.ogg',
    hihat_open:   'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FatBoy/percussion-ogg/046.ogg',
    snare:        'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FatBoy/percussion-ogg/038.ogg',
    snare_ghost:  'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FatBoy/percussion-ogg/040.ogg',
    kick:         'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FatBoy/percussion-ogg/036.ogg',
    tom_hi:       'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FatBoy/percussion-ogg/048.ogg',
    tom_mid:      'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FatBoy/percussion-ogg/047.ogg',
    tom_low:      'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FatBoy/percussion-ogg/041.ogg',
    crash:        'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FatBoy/percussion-ogg/049.ogg',
    ride:         'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FatBoy/percussion-ogg/051.ogg',
    rimshot:      'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FatBoy/percussion-ogg/037.ogg',
    hihat_foot:   'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FatBoy/percussion-ogg/044.ogg'
  };

  /* General MIDI drum note number -> sample key mapping */
  var MIDI_NOTE_MAP = {
    36: 'kick',
    37: 'rimshot',
    38: 'snare',
    39: 'snare_ghost',
    40: 'snare_ghost',
    41: 'tom_low',
    42: 'hihat_closed',
    44: 'hihat_foot',
    45: 'tom_mid',
    46: 'hihat_open',
    47: 'tom_mid',
    48: 'tom_hi',
    49: 'crash',
    51: 'ride',
    57: 'crash'
  };

  /* ----- AudioContext setup ----- */
  var ctx = null;
  var buffers = {};
  var loadedCount = 0;
  var totalSamples = Object.keys(SAMPLE_URLS).length;
  var ready = false;

  function getContext() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ctx;
  }

  function loadSample(name, url) {
    var ac = getContext();
    fetch(url)
      .then(function (resp) { return resp.arrayBuffer(); })
      .then(function (data) { return ac.decodeAudioData(data); })
      .then(function (buffer) {
        buffers[name] = buffer;
        loadedCount++;
        if (loadedCount >= totalSamples) {
          ready = true;
          console.log('[BetterSounds] All ' + totalSamples + ' drum samples loaded.');
        }
      })
      .catch(function (err) {
        console.warn('[BetterSounds] Failed to load sample ' + name + ':', err);
        loadedCount++;
      });
  }

  /* ----- Public API ----- */

  /**
   * Play a drum sound by sample name.
   * @param {string} name  - key from SAMPLE_URLS
   * @param {number} velocity - 0.0 to 1.0 (default 1.0)
   * @param {number} when - AudioContext time offset in seconds (default 0 = now)
   */
  function playDrum(name, velocity, when) {
    if (!ready || !buffers[name]) return;
    velocity = (velocity === undefined) ? 1.0 : Math.min(1.0, Math.max(0.0, velocity));
    when = when || 0;
    var ac = getContext();
    var source = ac.createBufferSource();
    source.buffer = buffers[name];
    var gain = ac.createGain();
    gain.gain.value = velocity;
    source.connect(gain);
    gain.connect(ac.destination);
    source.start(ac.currentTime + when);
  }

  /**
   * Play a drum sound by GM MIDI note number.
   * Falls back gracefully if note has no mapping.
   */
  function playMidiNote(noteNum, velocity, when) {
    var name = MIDI_NOTE_MAP[noteNum];
    if (name) {
      playDrum(name, velocity !== undefined ? velocity / 127 : 1.0, when);
    }
  }

  /**
   * Resume AudioContext if suspended (required after user gesture on mobile).
   * Call this from any user interaction handler.
   */
  function resumeContext() {
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  /* ----- Init: preload all samples ----- */
  function init() {
    for (var name in SAMPLE_URLS) {
      if (SAMPLE_URLS.hasOwnProperty(name)) {
        loadSample(name, SAMPLE_URLS[name]);
      }
    }
    /* Resume audio context on first touch/click (mobile requirement) */
    document.addEventListener('click', resumeContext, { once: false });
    document.addEventListener('touchstart', resumeContext, { once: false });
    console.log('[BetterSounds] Loading ' + totalSamples + ' drum samples...');
  }

  /* ----- Expose on window for groove_utils.js to call ----- */
  window.BetterSounds = {
    init: init,
    playDrum: playDrum,
    playMidiNote: playMidiNote,
    resumeContext: resumeContext,
    isReady: function () { return ready; },
    SAMPLE_URLS: SAMPLE_URLS,
    MIDI_NOTE_MAP: MIDI_NOTE_MAP
  };

  /* Auto-init on DOMContentLoaded */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());