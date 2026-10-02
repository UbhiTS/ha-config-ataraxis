/**
 * ThermostatRangeBar (v10)
 * High-performance, optimistic-reactive dual/single range slider + mode/fan bar
 * for Home Assistant Z-Wave & MQTT climate entities.
 *
 * Performance, Reactivity & Security Highlights:
 *  - Zero innerHTML usage (100% DOM API createElement/textContent for XSS safety)
 *  - O(1) memoized `set hass()` — skips DOM updates when zone state is unchanged
 *  - Native integration with zone helpers (`input_select.thermostat_<zone>_mode`,
 *    `input_select.thermostat_<zone>_fan_mode`, `input_number.thermostat_<zone>_heat_setpoint`,
 *    `input_number.thermostat_<zone>_setpoint`) and hardware sync scripts
 *    (`script.climate_smart_mode`, `script.climate_smart_fan_mode`,
 *    `script.climate_apply_zone_selection`) for instant (<16ms) UI reactivity
 *  - Mobile- & laptop-friendly responsive layout with pointercancel safety and +/- steppers
 */
class ThermostatRangeBar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = null;
    this._dragging = null;
    this._low = 68;
    this._high = 73;
    this._single = 70;
    this._lastSignature = '';
    this._legacyCleaned = false;

    // Optimistic state for immediate UI feedback (<16ms)
    this._optMode = null;
    this._optFan = null;
    this._optLow = null;
    this._optHigh = null;
    this._optSingle = null;
    this._optUntil = 0;
    this._optTimer = null;
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error('thermostat-range-bar: "entity" is required');
    }
    this._config = {
      min: 55,
      max: 85,
      step: 1,
      min_gap: 2,
      show_controls: true,
      ...config,
    };
    this._lastSignature = '';
    this._renderSkeleton();
  }

  connectedCallback() {
    if (!this._legacyCleaned) {
      requestAnimationFrame(() => this._hideLegacyButtonRow());
    }
  }

  _getZoneSlug() {
    if (!this._config || !this._config.entity) return null;
    const raw = this._config.entity.replace(/^climate\.thermostat_/, '').replace(/^climate\./, '');
    if (
      raw === 'lower_guest_bedroom' &&
      this._hass &&
      !this._hass.states['climate.thermostat_lower_guest_bedroom'] &&
      this._hass.states['climate.thermostat_entertainment_room']
    ) {
      return 'entertainment_room';
    }
    return raw;
  }

  _getResolvedEntities() {
    const slug = this._getZoneSlug();
    const climateId = slug ? `climate.thermostat_${slug}` : this._config.entity;
    const modeHelperId = slug ? `input_select.thermostat_${slug}_mode` : null;
    const fanHelperId = slug ? `input_select.thermostat_${slug}_fan_mode` : null;
    const coolHelperId = slug ? `input_number.thermostat_${slug}_setpoint` : null;
    const heatHelperId = slug ? `input_number.thermostat_${slug}_heat_setpoint` : null;
    const tempSensorId = slug ? `sensor.thermostat_${slug}_temperature` : null;
    return {
      slug,
      climateId,
      modeHelperId,
      fanHelperId,
      coolHelperId,
      heatHelperId,
      tempSensorId,
    };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config || !hass) return;
    if (!this._legacyCleaned) {
      this._hideLegacyButtonRow();
    }
    if (this._dragging) return;

    const ids = this._getResolvedEntities();
    const cObj = hass.states[ids.climateId] || hass.states[this._config.entity];
    const mObj = ids.modeHelperId ? hass.states[ids.modeHelperId] : null;
    const fObj = ids.fanHelperId ? hass.states[ids.fanHelperId] : null;
    const coolObj = ids.coolHelperId ? hass.states[ids.coolHelperId] : null;
    const heatObj = ids.heatHelperId ? hass.states[ids.heatHelperId] : null;
    const tempObj = ids.tempSensorId ? hass.states[ids.tempSensorId] : null;

    if (!cObj && !mObj) return;

    const attrs = (cObj && cObj.attributes) || {};
    const optActive = Date.now() < this._optUntil ? '1' : '0';
    const sig = [
      cObj ? cObj.state : '',
      mObj ? mObj.state : '',
      fObj ? fObj.state : '',
      coolObj ? coolObj.state : '',
      heatObj ? heatObj.state : '',
      tempObj ? tempObj.state : '',
      attrs.temperature,
      attrs.target_temp_low,
      attrs.target_temp_high,
      attrs.current_temperature,
      attrs.fan_mode,
      optActive,
    ].join('|');

    if (sig === this._lastSignature) return;
    this._lastSignature = sig;
    this._updateUI();
  }

  getCardSize() {
    return 2;
  }

  _hideLegacyButtonRow() {
    try {
      let node = this;
      for (let i = 0; i < 6 && node; i++) {
        const root = node.getRootNode && node.getRootNode();
        const host = root && root.host ? root.host : node.parentElement;
        if (host && host.children && host.children.length > 1) {
          Array.from(host.children).forEach((child) => {
            if (child === this || (child.contains && child.contains(this))) return;
            const tag = (child.tagName || '').toLowerCase();
            if (tag.includes('horizontal-stack')) {
              child.style.display = 'none';
            }
          });
        }
        node = host;
      }
      this._legacyCleaned = true;
    } catch (_e) {
      this._legacyCleaned = true;
    }
  }

  _renderSkeleton() {
    const root = this.shadowRoot;
    while (root.firstChild) {
      root.removeChild(root.firstChild);
    }

    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        contain: content;
      }
      ha-card {
        background: #1a2233;
        border-radius: 10px;
        border: 1px solid rgba(148, 163, 184, 0.14);
        box-shadow: 0 2px 6px rgba(6, 10, 18, 0.28);
        padding: 8px 12px 10px 12px;
        box-sizing: border-box;
        user-select: none;
        -webkit-user-select: none;
      }
      .bar-wrap {
        position: relative;
        height: 28px;
        display: flex;
        align-items: center;
        touch-action: pan-y;
      }
      .track {
        position: relative;
        width: 100%;
        height: 8px;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.85);
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.55);
        cursor: pointer;
      }
      .fill {
        position: absolute;
        top: 0;
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, #fb923c 0%, #34d399 50%, #38bdf8 100%);
        pointer-events: none;
      }
      .current-tick {
        position: absolute;
        top: -4px;
        width: 3px;
        height: 16px;
        border-radius: 2px;
        background: #f8fafc;
        transform: translateX(-50%);
        box-shadow: 0 0 4px rgba(248, 250, 252, 0.8);
        pointer-events: none;
        z-index: 2;
      }
      .handle {
        position: absolute;
        top: 50%;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        cursor: grab;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--primary-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
        font-size: 10.5px;
        font-weight: 700;
        color: #0f172a;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
        transition: transform 0.1s ease;
        z-index: 3;
        touch-action: none;
      }
      .handle:active {
        cursor: grabbing;
        transform: translate(-50%, -50%) scale(1.12);
      }
      .handle.heat {
        background: #fb923c;
        border: 2px solid #fff7ed;
      }
      .handle.cool {
        background: #38bdf8;
        border: 2px solid #f0f9ff;
      }
      .handle.single {
        background: #fbbf24;
        border: 2px solid #fefce8;
      }
      .labels-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 6px;
        margin-top: 2px;
        font-family: var(--primary-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
        font-size: 10.5px;
        font-weight: 600;
        color: #94a3b8;
        white-space: nowrap;
      }
      .labels-row .heat-lbl { color: #fdba74; }
      .labels-row .cool-lbl { color: #7dd3fc; }
      .labels-row .cur-lbl { color: #cbd5e1; }
      .step-btns {
        display: inline-flex;
        gap: 4px;
        align-items: center;
      }
      .step-btn {
        background: rgba(51, 65, 85, 0.6);
        border: 1px solid rgba(148, 163, 184, 0.22);
        color: #f1f5f9;
        border-radius: 5px;
        width: 22px;
        height: 20px;
        font-size: 13px;
        font-weight: 700;
        line-height: 1;
        padding: 0;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .step-btn:active {
        background: rgba(56, 189, 248, 0.35);
      }
      .controls-row {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 4px;
        margin-top: 7px;
        padding-top: 7px;
        border-top: 1px solid rgba(148, 163, 184, 0.12);
      }
      @media (max-width: 420px) {
        .controls-row {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .labels-row .cur-lbl {
          display: none;
        }
      }
      .ctrl-btn {
        appearance: none;
        border: 1px solid rgba(148, 163, 184, 0.14);
        background: rgba(30, 41, 59, 0.65);
        color: #94a3b8;
        border-radius: 6px;
        height: 28px;
        padding: 0 4px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 3px;
        font-family: var(--primary-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.02em;
        cursor: pointer;
        transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
        min-width: 0;
        overflow: hidden;
      }
      .ctrl-btn ha-icon {
        --mdc-icon-size: 13px;
        flex-shrink: 0;
      }
      .ctrl-btn span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .ctrl-btn:hover {
        background: rgba(51, 65, 85, 0.75);
        color: #f1f5f9;
      }
      .ctrl-btn.active-heat {
        background: rgba(251, 146, 60, 0.22);
        border-color: rgba(251, 146, 60, 0.6);
        color: #fdba74;
      }
      .ctrl-btn.active-cool {
        background: rgba(56, 189, 248, 0.22);
        border-color: rgba(56, 189, 248, 0.6);
        color: #7dd3fc;
      }
      .ctrl-btn.active-auto {
        background: rgba(52, 211, 153, 0.22);
        border-color: rgba(52, 211, 153, 0.6);
        color: #6ee7b7;
      }
      .ctrl-btn.active-off {
        background: rgba(148, 163, 184, 0.22);
        border-color: rgba(148, 163, 184, 0.45);
        color: #e2e8f0;
      }
      .ctrl-btn.active-fan {
        background: rgba(34, 211, 238, 0.2);
        border-color: rgba(34, 211, 238, 0.55);
        color: #67e8f9;
      }
      .off-banner {
        font-family: var(--primary-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
        font-size: 11.5px;
        font-weight: 600;
        color: #94a3b8;
        text-align: center;
        padding: 5px 0 3px 0;
      }
    `;
    root.appendChild(style);

    const card = document.createElement('ha-card');

    const body = document.createElement('div');
    body.id = 'body';

    const barWrap = document.createElement('div');
    barWrap.className = 'bar-wrap';

    const track = document.createElement('div');
    track.className = 'track';
    track.id = 'track';

    const fill = document.createElement('div');
    fill.className = 'fill';
    fill.id = 'fill';

    const curTick = document.createElement('div');
    curTick.className = 'current-tick';
    curTick.id = 'curTick';

    const hLow = document.createElement('div');
    hLow.className = 'handle heat';
    hLow.id = 'hLow';

    const hHigh = document.createElement('div');
    hHigh.className = 'handle cool';
    hHigh.id = 'hHigh';

    const hSingle = document.createElement('div');
    hSingle.className = 'handle single';
    hSingle.id = 'hSingle';
    hSingle.style.display = 'none';

    track.appendChild(fill);
    track.appendChild(curTick);
    track.appendChild(hLow);
    track.appendChild(hHigh);
    track.appendChild(hSingle);
    barWrap.appendChild(track);

    const labelsRow = document.createElement('div');
    labelsRow.className = 'labels-row';

    const lblLow = document.createElement('span');
    lblLow.className = 'heat-lbl';
    lblLow.id = 'lblLow';

    const lblMid = document.createElement('span');
    lblMid.className = 'cur-lbl';
    lblMid.id = 'lblMid';

    const rightWrap = document.createElement('span');
    rightWrap.style.display = 'inline-flex';
    rightWrap.style.alignItems = 'center';
    rightWrap.style.gap = '6px';

    const lblHigh = document.createElement('span');
    lblHigh.className = 'cool-lbl';
    lblHigh.id = 'lblHigh';

    const stepBtns = document.createElement('span');
    stepBtns.className = 'step-btns';
    stepBtns.id = 'stepBtns';

    const btnMinus = document.createElement('button');
    btnMinus.type = 'button';
    btnMinus.className = 'step-btn';
    btnMinus.textContent = '−';
    btnMinus.title = 'Decrease 1°F';
    btnMinus.addEventListener('click', (e) => {
      e.stopPropagation();
      this._nudgeTemp(-1);
    });

    const btnPlus = document.createElement('button');
    btnPlus.type = 'button';
    btnPlus.className = 'step-btn';
    btnPlus.textContent = '+';
    btnPlus.title = 'Increase 1°F';
    btnPlus.addEventListener('click', (e) => {
      e.stopPropagation();
      this._nudgeTemp(1);
    });

    stepBtns.appendChild(btnMinus);
    stepBtns.appendChild(btnPlus);
    rightWrap.appendChild(lblHigh);
    rightWrap.appendChild(stepBtns);

    labelsRow.appendChild(lblLow);
    labelsRow.appendChild(lblMid);
    labelsRow.appendChild(rightWrap);

    body.appendChild(barWrap);
    body.appendChild(labelsRow);

    const offMsg = document.createElement('div');
    offMsg.className = 'off-banner';
    offMsg.id = 'offMsg';
    offMsg.style.display = 'none';
    offMsg.textContent = 'HVAC System Off — Select a mode below';

    const controls = document.createElement('div');
    controls.className = 'controls-row';
    controls.id = 'controls';

    card.appendChild(body);
    card.appendChild(offMsg);
    card.appendChild(controls);
    root.appendChild(card);

    this._track = track;
    this._fill = fill;
    this._curTick = curTick;
    this._hLow = hLow;
    this._hHigh = hHigh;
    this._hSingle = hSingle;
    this._lblLow = lblLow;
    this._lblMid = lblMid;
    this._lblHigh = lblHigh;
    this._body = body;
    this._offMsg = offMsg;
    this._controls = controls;

    this._bindDrag(this._hLow, 'low');
    this._bindDrag(this._hHigh, 'high');
    this._bindDrag(this._hSingle, 'single');

    this._track.addEventListener('pointerdown', (e) => {
      if (e.target === this._hLow || e.target === this._hHigh || e.target === this._hSingle) return;
      const val = this._posToValue(e.clientX);
      const mode = this._getEffectiveMode();
      if (mode === 'heat_cool' || mode === 'auto') {
        const distLow = Math.abs(val - this._low);
        const distHigh = Math.abs(val - this._high);
        this._onPointerDown(e, distLow <= distHigh ? 'low' : 'high');
      } else if (mode === 'heat' || mode === 'cool') {
        this._onPointerDown(e, 'single');
      }
    });

    this._renderControlsRow();
  }

  _createControlButton(iconName, labelText, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ctrl-btn';
    const icon = document.createElement('ha-icon');
    icon.setAttribute('icon', iconName);
    const span = document.createElement('span');
    span.textContent = labelText;
    btn.appendChild(icon);
    btn.appendChild(span);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  _renderControlsRow() {
    if (!this._controls) return;
    while (this._controls.firstChild) {
      this._controls.removeChild(this._controls.firstChild);
    }
    if (this._config && this._config.show_controls === false) {
      this._controls.style.display = 'none';
      return;
    }
    this._controls.style.display = 'grid';

    const modeSpecs = [
      { key: 'heat', label: 'Heat', icon: 'mdi:fire' },
      { key: 'cool', label: 'Cool', icon: 'mdi:snowflake' },
      { key: 'auto', label: 'Auto', icon: 'mdi:thermostat-auto' },
      { key: 'off', label: 'Off', icon: 'mdi:power' },
    ];
    const fanSpecs = [
      { key: 'auto', label: 'Fan Auto', icon: 'mdi:fan-auto' },
      { key: 'on', label: 'Fan On', icon: 'mdi:fan' },
    ];

    this._modeBtns = {};
    modeSpecs.forEach((m) => {
      const btn = this._createControlButton(m.icon, m.label, () => this._setHvacMode(m.key));
      this._controls.appendChild(btn);
      this._modeBtns[m.key] = btn;
    });

    this._fanBtns = {};
    fanSpecs.forEach((f) => {
      const btn = this._createControlButton(f.icon, f.label, () => this._setFanMode(f.key));
      this._controls.appendChild(btn);
      this._fanBtns[f.key] = btn;
    });
  }

  _getEffectiveMode() {
    if (Date.now() < this._optUntil && this._optMode !== null) {
      return this._optMode;
    }
    if (!this._hass) return 'off';
    const ids = this._getResolvedEntities();
    const mObj = ids.modeHelperId ? this._hass.states[ids.modeHelperId] : null;
    if (mObj && mObj.state && !['unknown', 'unavailable'].includes(mObj.state)) {
      const s = mObj.state.toLowerCase();
      if (s === 'auto' || s === 'heat_cool') return 'auto';
      if (s === 'heat' || s === 'cool' || s === 'off') return s;
    }
    const cObj = this._hass.states[ids.climateId] || this._hass.states[this._config.entity];
    const raw = cObj ? String(cObj.state).toLowerCase() : 'off';
    return raw === 'heat_cool' ? 'auto' : raw;
  }

  _getEffectiveFan() {
    if (Date.now() < this._optUntil && this._optFan !== null) {
      return this._optFan;
    }
    if (!this._hass) return 'auto';
    const ids = this._getResolvedEntities();
    const fObj = ids.fanHelperId ? this._hass.states[ids.fanHelperId] : null;
    if (fObj && fObj.state && !['unknown', 'unavailable'].includes(fObj.state)) {
      return fObj.state.toLowerCase();
    }
    const cObj = this._hass.states[ids.climateId] || this._hass.states[this._config.entity];
    const fanAttr = String((cObj && cObj.attributes && cObj.attributes.fan_mode) || 'auto').toLowerCase();
    return fanAttr.includes('auto') ? 'auto' : 'on';
  }

  _setHvacMode(modeKey) {
    if (!this._hass || !this._config) return;
    const ids = this._getResolvedEntities();

    // Immediate optimistic UI update
    this._optMode = modeKey;
    this._optUntil = Date.now() + 7000;
    this._scheduleOptExpiry();
    this._lastSignature = '';
    this._updateUI();

    const uiOption =
      modeKey === 'heat'
        ? 'Heat'
        : modeKey === 'cool'
          ? 'Cool'
          : modeKey === 'auto'
            ? 'Auto'
            : 'Off';

    if (ids.modeHelperId && this._hass.states[ids.modeHelperId]) {
      this._hass.callService('input_select', 'select_option', {
        entity_id: ids.modeHelperId,
        option: uiOption,
      });
    }

    if (this._hass.states['script.climate_smart_mode']) {
      this._hass.callService('script', 'climate_smart_mode', {
        entity_id: ids.climateId,
        mode: modeKey,
      });
    } else {
      this._hass.callService('climate', 'set_hvac_mode', {
        entity_id: ids.climateId,
        hvac_mode: modeKey === 'auto' ? 'heat_cool' : modeKey,
      });
    }
  }

  _setFanMode(fanKey) {
    if (!this._hass || !this._config) return;
    const ids = this._getResolvedEntities();

    // Immediate optimistic UI update
    this._optFan = fanKey;
    this._optUntil = Date.now() + 7000;
    this._scheduleOptExpiry();
    this._lastSignature = '';
    this._updateUI();

    if (ids.fanHelperId && this._hass.states[ids.fanHelperId]) {
      this._hass.callService('input_select', 'select_option', {
        entity_id: ids.fanHelperId,
        option: fanKey === 'on' ? 'On' : 'Auto',
      });
    }

    if (this._hass.states['script.climate_smart_fan_mode']) {
      this._hass.callService('script', 'climate_smart_fan_mode', {
        entity_id: ids.climateId,
        fan_mode: fanKey,
      });
    } else {
      this._hass.callService('climate', 'set_fan_mode', {
        entity_id: ids.climateId,
        fan_mode: fanKey,
      });
    }
  }

  _nudgeTemp(delta) {
    if (!this._hass || !this._config) return;
    const mode = this._getEffectiveMode();
    const { min, max, min_gap } = this._config;
    if (mode === 'auto' || mode === 'heat_cool') {
      this._low = Math.max(min, Math.min(this._low + delta, this._high - min_gap));
      this._high = Math.min(max, Math.max(this._high + delta, this._low + min_gap));
    } else if (mode === 'heat' || mode === 'cool') {
      this._single = Math.max(min, Math.min(max, this._single + delta));
    } else {
      return;
    }
    this._renderPositions(mode);
    this._commitValues();
  }

  _scheduleOptExpiry() {
    if (this._optTimer) clearTimeout(this._optTimer);
    this._optTimer = setTimeout(() => {
      this._optMode = null;
      this._optFan = null;
      this._optLow = null;
      this._optHigh = null;
      this._optSingle = null;
      this._lastSignature = '';
      if (!this._dragging) this._updateUI();
    }, 7100);
  }

  _bindDrag(handle, which) {
    handle.addEventListener('pointerdown', (e) => this._onPointerDown(e, which));
  }

  _posToValue(clientX) {
    const rect = this._track.getBoundingClientRect();
    const { min, max, step } = this._config;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / (rect.width || 1)));
    const raw = min + pct * (max - min);
    return Math.round(raw / step) * step;
  }

  _onPointerDown(e, which) {
    e.preventDefault();
    e.stopPropagation();
    this._dragging = which;

    const applyMove = (clientX) => {
      const val = this._posToValue(clientX);
      const { min, max, min_gap } = this._config;
      if (which === 'low') {
        this._low = Math.min(val, this._high - min_gap);
        this._low = Math.max(min, this._low);
      } else if (which === 'high') {
        this._high = Math.max(val, this._low + min_gap);
        this._high = Math.min(max, this._high);
      } else {
        this._single = Math.max(min, Math.min(max, val));
      }
      this._renderPositions(this._getEffectiveMode());
    };

    applyMove(e.clientX);

    const moveHandler = (ev) => applyMove(ev.clientX);
    const finishHandler = () => {
      if (!this._dragging) return;
      this._dragging = null;
      window.removeEventListener('pointermove', moveHandler);
      window.removeEventListener('pointerup', finishHandler);
      window.removeEventListener('pointercancel', finishHandler);
      this._commitValues();
    };

    window.addEventListener('pointermove', moveHandler);
    window.addEventListener('pointerup', finishHandler);
    window.addEventListener('pointercancel', finishHandler);
  }

  _valToPct(val) {
    const { min, max } = this._config;
    return Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
  }

  _updateUI() {
    if (!this._hass || !this._config || !this._track) return;
    const ids = this._getResolvedEntities();
    const cObj = this._hass.states[ids.climateId] || this._hass.states[this._config.entity];
    const coolObj = ids.coolHelperId ? this._hass.states[ids.coolHelperId] : null;
    const heatObj = ids.heatHelperId ? this._hass.states[ids.heatHelperId] : null;
    const tempObj = ids.tempSensorId ? this._hass.states[ids.tempSensorId] : null;

    const attrs = (cObj && cObj.attributes) || {};
    const optActive = Date.now() < this._optUntil;
    const mode = this._getEffectiveMode();
    const fan = this._getEffectiveFan();

    let cur = attrs.current_temperature;
    if (tempObj && tempObj.state && !['unknown', 'unavailable'].includes(tempObj.state)) {
      const parsed = Number(tempObj.state);
      if (!Number.isNaN(parsed) && parsed > 0) cur = parsed;
    }

    // Update active state on control buttons
    if (this._modeBtns) {
      Object.entries(this._modeBtns).forEach(([key, btn]) => {
        btn.className = 'ctrl-btn';
        if (mode === key || (key === 'auto' && mode === 'heat_cool')) {
          btn.classList.add(`active-${key}`);
        }
      });
    }
    if (this._fanBtns) {
      const isFanAuto = fan.includes('auto');
      if (this._fanBtns.auto) {
        this._fanBtns.auto.className = `ctrl-btn${isFanAuto ? ' active-fan' : ''}`;
      }
      if (this._fanBtns.on) {
        this._fanBtns.on.className = `ctrl-btn${!isFanAuto ? ' active-fan' : ''}`;
      }
    }

    if (mode === 'off' || mode === 'unavailable' || mode === 'unknown') {
      this._body.style.display = 'none';
      this._offMsg.style.display = 'block';
      this._offMsg.textContent =
        mode === 'off' ? 'HVAC Off — Tap Heat, Cool, or Auto below' : `Thermostat ${mode}`;
      return;
    }

    this._body.style.display = 'block';
    this._offMsg.style.display = 'none';

    if (cur != null && !Number.isNaN(Number(cur)) && Number(cur) > 0) {
      this._curTick.style.display = 'block';
      this._curTick.style.left = `${this._valToPct(Number(cur))}%`;
      this._lblMid.textContent = `Now ${Math.round(Number(cur))}°F`;
    } else {
      this._curTick.style.display = 'none';
      this._lblMid.textContent = '';
    }

    const helperLow =
      heatObj && !['unknown', 'unavailable'].includes(heatObj.state) ? Number(heatObj.state) : null;
    const helperHigh =
      coolObj && !['unknown', 'unavailable'].includes(coolObj.state) ? Number(coolObj.state) : null;

    if (mode === 'auto' || mode === 'heat_cool') {
      const lowVal =
        helperLow != null && !Number.isNaN(helperLow)
          ? helperLow
          : attrs.target_temp_low != null
            ? Number(attrs.target_temp_low)
            : 68;
      const highVal =
        helperHigh != null && !Number.isNaN(helperHigh)
          ? helperHigh
          : attrs.target_temp_high != null
            ? Number(attrs.target_temp_high)
            : 73;
      this._low = optActive && this._optLow !== null ? this._optLow : lowVal;
      this._high =
        optActive && this._optHigh !== null
          ? this._optHigh
          : Math.max(this._low + this._config.min_gap, highVal);
      this._hLow.style.display = 'flex';
      this._hHigh.style.display = 'flex';
      this._hSingle.style.display = 'none';
      this._fill.style.background = 'linear-gradient(90deg, #fb923c 0%, #34d399 50%, #38bdf8 100%)';
    } else {
      let singleVal = 70;
      if (mode === 'heat') {
        singleVal =
          helperLow != null && !Number.isNaN(helperLow)
            ? helperLow
            : attrs.temperature != null
              ? Number(attrs.temperature)
              : 68;
      } else {
        singleVal =
          helperHigh != null && !Number.isNaN(helperHigh)
            ? helperHigh
            : attrs.temperature != null
              ? Number(attrs.temperature)
              : 72;
      }
      this._single = optActive && this._optSingle !== null ? this._optSingle : singleVal;
      this._hLow.style.display = 'none';
      this._hHigh.style.display = 'none';
      this._hSingle.style.display = 'flex';
      this._hSingle.className = `handle ${mode === 'heat' ? 'heat' : mode === 'cool' ? 'cool' : 'single'}`;
      this._fill.style.background = mode === 'heat' ? '#fb923c' : '#38bdf8';
    }

    this._renderPositions(mode);
  }

  _renderPositions(mode) {
    if (mode === 'auto' || mode === 'heat_cool') {
      const pLow = this._valToPct(this._low);
      const pHigh = this._valToPct(this._high);
      this._hLow.style.left = `${pLow}%`;
      this._hHigh.style.left = `${pHigh}%`;
      this._hLow.textContent = `${Math.round(this._low)}°`;
      this._hHigh.textContent = `${Math.round(this._high)}°`;
      this._fill.style.left = `${pLow}%`;
      this._fill.style.width = `${Math.max(0, pHigh - pLow)}%`;
      this._lblLow.className = 'heat-lbl';
      this._lblLow.textContent = `Heat ${Math.round(this._low)}°F`;
      this._lblHigh.className = 'cool-lbl';
      this._lblHigh.textContent = `Cool ${Math.round(this._high)}°F`;
    } else {
      const p = this._valToPct(this._single);
      this._hSingle.style.left = `${p}%`;
      this._hSingle.textContent = `${Math.round(this._single)}°`;
      if (mode === 'heat') {
        this._fill.style.left = '0%';
        this._fill.style.width = `${p}%`;
        this._lblLow.className = 'heat-lbl';
        this._lblLow.textContent = `Heat Target ${Math.round(this._single)}°F`;
        this._lblHigh.className = '';
        this._lblHigh.textContent = `Max ${this._config.max}°F`;
      } else {
        this._fill.style.left = `${p}%`;
        this._fill.style.width = `${Math.max(0, 100 - p)}%`;
        this._lblLow.className = '';
        this._lblLow.textContent = `Min ${this._config.min}°F`;
        this._lblHigh.className = 'cool-lbl';
        this._lblHigh.textContent = `Cool Target ${Math.round(this._single)}°F`;
      }
    }
  }

  _commitValues() {
    if (!this._hass || !this._config) return;
    const mode = this._getEffectiveMode();
    const ids = this._getResolvedEntities();

    if (mode === 'auto' || mode === 'heat_cool') {
      this._optLow = this._low;
      this._optHigh = this._high;
      this._optUntil = Date.now() + 7000;
      this._scheduleOptExpiry();

      if (ids.heatHelperId && this._hass.states[ids.heatHelperId]) {
        this._hass.callService('input_number', 'set_value', {
          entity_id: ids.heatHelperId,
          value: this._low,
        });
      }
      if (ids.coolHelperId && this._hass.states[ids.coolHelperId]) {
        this._hass.callService('input_number', 'set_value', {
          entity_id: ids.coolHelperId,
          value: this._high,
        });
      }
      if (ids.slug && this._hass.states['script.climate_apply_zone_selection']) {
        this._hass.callService('script', 'climate_apply_zone_selection', {
          zone: ids.slug,
        });
      } else {
        this._hass.callService('climate', 'set_temperature', {
          entity_id: ids.climateId,
          target_temp_low: this._low,
          target_temp_high: this._high,
        });
      }
    } else if (mode === 'heat' || mode === 'cool') {
      this._optSingle = this._single;
      this._optUntil = Date.now() + 7000;
      this._scheduleOptExpiry();

      if (mode === 'heat' && ids.heatHelperId && this._hass.states[ids.heatHelperId]) {
        this._hass.callService('input_number', 'set_value', {
          entity_id: ids.heatHelperId,
          value: this._single,
        });
      }
      if (ids.coolHelperId && this._hass.states[ids.coolHelperId]) {
        this._hass.callService('input_number', 'set_value', {
          entity_id: ids.coolHelperId,
          value: this._single,
        });
      }
      if (ids.slug && this._hass.states['script.climate_apply_zone_selection']) {
        this._hass.callService('script', 'climate_apply_zone_selection', {
          zone: ids.slug,
        });
      } else {
        this._hass.callService('climate', 'set_temperature', {
          entity_id: ids.climateId,
          temperature: this._single,
        });
      }
    }
  }
}

if (!customElements.get('thermostat-range-bar')) {
  customElements.define('thermostat-range-bar', ThermostatRangeBar);
}
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'thermostat-range-bar')) {
  window.customCards.push({
    type: 'thermostat-range-bar',
    name: 'Thermostat Range Bar',
    description: 'High-performance optimistic dual/single range slider for climate entities',
  });
}
