/* =======================================================
 * GrooveScribe Progressive Metronome
 * Automatically raises BPM by N every X bars until MaxBPM.
 * Settings panel slides in from the player bar.
 * ======================================================= */
(function () {
  'use strict';

  var PANEL_ID = 'progMetroPanel';

  var cfg = {
    enabled:    false,
    increaseBy: 2,
    everyBars:  4,
    startBPM:   80,
    maxBPM:     180
  };

  var barsPlayed = 0;   // counts repeats since last BPM bump
  var sessionStart = false; // true once the first repeat fires

  /* ---- Public API ---- */
  window.ProgressiveMetronome = {
    isEnabled:    function () { return cfg.enabled; },
    togglePanel:  togglePanel,
    onRepeat:     onRepeat,
    reset:        reset
  };

  /* ---- Called on every groove repeat ---- */
  function onRepeat(grooveUtils) {
    if (!cfg.enabled) return;

    // On first repeat of a new session, set tempo to startBPM
    if (!sessionStart) {
      sessionStart = true;
      barsPlayed = 0;
      grooveUtils.setTempo(cfg.startBPM);
      updateDisplay(cfg.startBPM);
      return;
    }

    barsPlayed++;

    if (barsPlayed >= cfg.everyBars) {
      barsPlayed = 0;
      var current = grooveUtils.getTempo();
      var next    = current + cfg.increaseBy;

      if (next > cfg.maxBPM) {
        next = cfg.maxBPM;
      }

      if (next !== current) {
        grooveUtils.setTempo(next);
        updateDisplay(next);
      }

      if (next >= cfg.maxBPM) {
        updateDisplay(next, true);
      }
    }
  }

  function reset() {
    barsPlayed    = 0;
    sessionStart  = false;
    updateDisplay(cfg.startBPM);
  }

  /* ---- Panel toggle ---- */
  function togglePanel() {
    var panel = document.getElementById(PANEL_ID);
    if (!panel) {
      buildPanel();
      panel = document.getElementById(PANEL_ID);
    }
    var visible = panel.style.display !== 'none' && panel.style.display !== '';
    panel.style.display = visible ? 'none' : 'block';
  }

  function hidePanel() {
    var panel = document.getElementById(PANEL_ID);
    if (panel) panel.style.display = 'none';
  }

  /* ---- Build the settings panel ---- */
  function buildPanel() {
    var existing = document.getElementById(PANEL_ID);
    if (existing) return;

    var panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = renderPanelHTML();
    document.body.appendChild(panel);
    bindEvents(panel);
    refreshUI(panel);
  }

  function renderPanelHTML() {
    return [
      '<div class="pm-header">',
      '  <span class="pm-title">&#x23F3; Progressive Metronome</span>',
      '  <button class="pm-close" id="pmCloseBtn">&times;</button>',
      '</div>',
      '<div class="pm-body">',
      '  <div class="pm-row">',
      '    <span class="pm-label">Increase by (BPM)</span>',
      '    <div class="pm-stepper">',
      '      <button class="pm-step-btn" data-field="increaseBy" data-delta="-1">&#8722;</button>',
      '      <span class="pm-val" id="pmIncreaseBy">' + cfg.increaseBy + '</span>',
      '      <button class="pm-step-btn" data-field="increaseBy" data-delta="1">+</button>',
      '    </div>',
      '  </div>',
      '  <div class="pm-row">',
      '    <span class="pm-label">Every (bars)</span>',
      '    <div class="pm-stepper">',
      '      <button class="pm-step-btn" data-field="everyBars" data-delta="-1">&#8722;</button>',
      '      <span class="pm-val" id="pmEveryBars">' + cfg.everyBars + '</span>',
      '      <button class="pm-step-btn" data-field="everyBars" data-delta="1">+</button>',
      '    </div>',
      '  </div>',
      '  <div class="pm-row">',
      '    <span class="pm-label">Start BPM</span>',
      '    <div class="pm-stepper">',
      '      <button class="pm-step-btn" data-field="startBPM" data-delta="-1">&#8722;</button>',
      '      <span class="pm-val" id="pmStartBPM">' + cfg.startBPM + '</span>',
      '      <button class="pm-step-btn" data-field="startBPM" data-delta="1">+</button>',
      '    </div>',
      '  </div>',
      '  <div class="pm-row">',
      '    <span class="pm-label">Max BPM</span>',
      '    <div class="pm-stepper">',
      '      <button class="pm-step-btn" data-field="maxBPM" data-delta="-1">&#8722;</button>',
      '      <span class="pm-val" id="pmMaxBPM">' + cfg.maxBPM + '</span>',
      '      <button class="pm-step-btn" data-field="maxBPM" data-delta="1">+</button>',
      '    </div>',
      '  </div>',
      '  <div class="pm-row pm-row-enable">',
      '    <span class="pm-label">Enable</span>',
      '    <button class="pm-toggle-btn" id="pmEnableBtn">' + (cfg.enabled ? 'On' : 'Off') + '</button>',
      '  </div>',
      '  <div class="pm-status" id="pmStatus"></div>',
      '</div>'
    ].join('\n');
  }

  function bindEvents(panel) {
    // Close button
    var closeBtn = panel.querySelector('#pmCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', hidePanel);

    // Stepper buttons: support click and hold
    panel.querySelectorAll('.pm-step-btn').forEach(function (btn) {
      var interval = null;
      var timeout  = null;

      function step() {
        var field = btn.getAttribute('data-field');
        var delta = parseInt(btn.getAttribute('data-delta'), 10);
        applyDelta(field, delta, panel);
      }

      btn.addEventListener('mousedown', function () {
        step();
        timeout = setTimeout(function () {
          interval = setInterval(step, 80);
        }, 400);
      });

      btn.addEventListener('touchstart', function (e) {
        e.preventDefault();
        step();
        timeout = setTimeout(function () {
          interval = setInterval(step, 80);
        }, 400);
      }, { passive: false });

      function stopRepeat() {
        clearTimeout(timeout);
        clearInterval(interval);
      }

      btn.addEventListener('mouseup', stopRepeat);
      btn.addEventListener('mouseleave', stopRepeat);
      btn.addEventListener('touchend', stopRepeat);
    });

    // Enable toggle
    var enableBtn = panel.querySelector('#pmEnableBtn');
    if (enableBtn) {
      enableBtn.addEventListener('click', function () {
        cfg.enabled = !cfg.enabled;
        enableBtn.textContent = cfg.enabled ? 'On' : 'Off';
        enableBtn.classList.toggle('pm-toggle-on', cfg.enabled);
        reset();
        updateDisplay(cfg.startBPM);
        // Sync startBPM to current groove tempo when enabling
        if (cfg.enabled && window.myGrooveWriter) {
          cfg.startBPM = window.myGrooveWriter.myGrooveUtils.getTempo();
          document.getElementById('pmStartBPM').textContent = cfg.startBPM;
        }
      });
    }
  }

  function applyDelta(field, delta, panel) {
    var limits = {
      increaseBy: { min: 1,  max: 20  },
      everyBars:  { min: 1,  max: 32  },
      startBPM:   { min: 30, max: 280 },
      maxBPM:     { min: 30, max: 300 }
    };
    var idMap = {
      increaseBy: 'pmIncreaseBy',
      everyBars:  'pmEveryBars',
      startBPM:   'pmStartBPM',
      maxBPM:     'pmMaxBPM'
    };

    var lim = limits[field];
    var newVal = cfg[field] + delta;
    if (newVal < lim.min) newVal = lim.min;
    if (newVal > lim.max) newVal = lim.max;
    cfg[field] = newVal;

    var el = document.getElementById(idMap[field]);
    if (el) el.textContent = newVal;

    reset();
  }

  function refreshUI(panel) {
    var fields = { increaseBy: 'pmIncreaseBy', everyBars: 'pmEveryBars', startBPM: 'pmStartBPM', maxBPM: 'pmMaxBPM' };
    for (var f in fields) {
      var el = document.getElementById(fields[f]);
      if (el) el.textContent = cfg[f];
    }
  }

  function updateDisplay(currentBPM, atMax) {
    var status = document.getElementById('pmStatus');
    if (!status) return;
    if (!cfg.enabled) {
      status.textContent = '';
      return;
    }
    var barsUntilNext = cfg.everyBars - barsPlayed;
    status.textContent = atMax
      ? 'Max BPM reached: ' + currentBPM
      : 'Current: ' + currentBPM + ' BPM  \u2014  next bump in ' + barsUntilNext + ' bar' + (barsUntilNext !== 1 ? 's' : '');
  }

  /* ---- Reset session when play stops ---- */
  document.addEventListener('click', function (e) {
    var el = e.target;
    if (el && (el.classList.contains('midiPlayImage') || el.id === 'midiPlayImage')) {
      reset();
    }
  });

}());
