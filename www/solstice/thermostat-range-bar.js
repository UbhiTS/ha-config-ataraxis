class ThermostatRangeBar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = null;
    this._dragging = null; // 'low' | 'high' | 'single' | null
    this._dragLow = null;
    this._dragHigh = null;
    this._dragSingle = null;
    this._optLow = null;
    this._optHigh = null;
    this._optSingle = null;
    this._optMode = null;
    this._optFanMode = null;
    this._optUntil = 0;
    this._optModeUntil = 0;
    this._optFanModeUntil = 0;
    this._min = 55;
    this._max = 85;
    this._minGap = 2;
    this._initialized = false;
    this._legacyHidden = false;
    this._lastSignature = '';
    this._lastStateSig = '';
  }

  connectedCallback() {
    if (!this._legacyHidden) {
      this._hideLegacyButtonRow();
      this._legacyHidden = true;
    }
  }

  setConfig(config) {
    if (!config || (!config.entity && !config.climate_entity)) {
      throw new Error('thermostat-range-bar requires a climate entity (e.g. entity: climate.living_room)');
    }
    this._config = config;
    this._min = Number.isFinite(Number(config.min)) ? Number(config.min) : null;
    this._max = Number.isFinite(Number(config.max)) ? Number(config.max) : null;
    this._minGap = Number.isFinite(Number(config.min_gap)) ? Number(config.min_gap) : 2;
    this._lastStateSig = '';
    this._renderSkeleton();
  }

  static getStubConfig(hass) {
    const climateEntity = hass
      ? Object.keys(hass.states).find((e) => e.startsWith('climate.'))
      : 'climate.thermostat';
    return {
      entity: climateEntity || 'climate.thermostat'
    };
  }

  _resolveEntityId() {
    if (!this._config) return null;
    return this._config.entity || this._config.climate_entity || null;
  }

  _getClimateStateObj() {
    if (!this._hass) return null;
    const entityId = this._resolveEntityId();
    if (!entityId) return null;
    return this._hass.states[entityId] || null;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._renderSkeleton();
    }
    if (!this._legacyHidden) {
      this._hideLegacyButtonRow();
      this._legacyHidden = true;
    }
    if (this._dragging) return;

    const stateObj = this._getClimateStateObj();
    if (!stateObj) return;
    const a = stateObj.attributes || {};
    const now = Date.now();
    const optActive = (now < this._optUntil || now < this._optModeUntil || now < this._optFanModeUntil) ? '1' : '0';
    const stateSig = `${stateObj.state}|${a.temperature}|${a.target_temp_low}|${a.target_temp_high}|${a.fan_mode}|${a.min_temp}|${a.max_temp}|${a.supported_features}|${optActive}`;
    if (stateSig === this._lastStateSig && optActive === '0') {
      return;
    }
    this._lastStateSig = stateSig;
    this._updateUI();
  }

  /**
   * If a browser tab has cached Lovelace YAML with the old mushroom-template-card
   * horizontal-stack above this element, hide it automatically so only the native
   * capability-driven controls inside this component are visible.
   */
  _hideLegacyButtonRow() {
    try {
      let host = this;
      for (let i = 0; i < 6 && host; i++) {
        if (host.parentElement) {
          const children = Array.from(host.parentElement.children);
          for (const sibling of children) {
            if (sibling !== host && sibling.tagName && sibling.tagName.toLowerCase().includes('horizontal-stack')) {
              sibling.style.display = 'none';
            }
          }
          host = host.parentElement;
        } else if (host.getRootNode && host.getRootNode().host) {
          host = host.getRootNode().host;
        } else {
          break;
        }
      }
    } catch (_) {}
  }

  /**
   * Normalize HVAC mode strings across Home Assistant integrations.
   */
  _normalizeHvacMode(raw) {
    const s = String(raw ?? '').trim().toLowerCase();
    if (s === 'heat_cool' || s === 'auto') return 'auto';
    if (s === 'heat') return 'heat';
    if (s === 'cool') return 'cool';
    if (s === 'dry') return 'dry';
    if (s === 'fan_only') return 'fan_only';
    if (s === 'off') return 'off';
    return s || 'off';
  }

  /**
   * Return the list of supported HVAC mode descriptors for this specific entity.
   * Any mode not in stateObj.attributes.hvac_modes is strictly omitted.
   */
  _getSupportedHvacModes(stateObj) {
    const rawModes = Array.isArray(stateObj?.attributes?.hvac_modes)
      ? stateObj.attributes.hvac_modes
      : [];
    if (rawModes.length === 0) return [];

    const catalog = [
      {
        canonical: 'off',
        match: ['off'],
        icon: 'mdi:power',
        label: 'System Off',
        activeColor: '#e2e8f0',
        activeBg: 'linear-gradient(180deg, rgba(148, 163, 184, 0.24) 0%, rgba(100, 116, 139, 0.12) 100%)',
        activeBorder: '1.5px solid rgba(226, 232, 240, 0.72)',
        activeShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.22), 0 4px 12px -2px rgba(15, 23, 42, 0.35)'
      },
      {
        canonical: 'heat',
        match: ['heat'],
        icon: 'mdi:fire',
        label: 'Heat Mode',
        activeColor: '#fb923c',
        activeBg: 'linear-gradient(180deg, rgba(251, 146, 60, 0.26) 0%, rgba(251, 146, 60, 0.12) 100%)',
        activeBorder: '1.5px solid rgba(251, 146, 60, 0.80)',
        activeShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.22), 0 4px 12px -2px rgba(251, 146, 60, 0.30)'
      },
      {
        canonical: 'cool',
        match: ['cool'],
        icon: 'mdi:snowflake',
        label: 'Cool Mode',
        activeColor: '#38bdf8',
        activeBg: 'linear-gradient(180deg, rgba(56, 189, 248, 0.26) 0%, rgba(56, 189, 248, 0.12) 100%)',
        activeBorder: '1.5px solid rgba(56, 189, 248, 0.80)',
        activeShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.22), 0 4px 12px -2px rgba(56, 189, 248, 0.30)'
      },
      {
        canonical: 'auto',
        match: ['auto', 'heat_cool'],
        icon: 'mdi:thermostat-auto',
        label: 'Auto Mode',
        activeColor: '#34d399',
        activeBg: 'linear-gradient(180deg, rgba(52, 211, 153, 0.26) 0%, rgba(52, 211, 153, 0.12) 100%)',
        activeBorder: '1.5px solid rgba(52, 211, 153, 0.80)',
        activeShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.22), 0 4px 12px -2px rgba(52, 211, 153, 0.30)'
      },
      {
        canonical: 'dry',
        match: ['dry'],
        icon: 'mdi:water-percent',
        label: 'Dry Mode',
        activeColor: '#a78bfa',
        activeBg: 'linear-gradient(180deg, rgba(167, 139, 250, 0.26) 0%, rgba(167, 139, 250, 0.12) 100%)',
        activeBorder: '1.5px solid rgba(167, 139, 250, 0.80)',
        activeShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.22), 0 4px 12px -2px rgba(167, 139, 250, 0.30)'
      },
      {
        canonical: 'fan_only',
        match: ['fan_only'],
        icon: 'mdi:fan',
        label: 'Fan Only Mode',
        activeColor: '#38bdf8',
        activeBg: 'linear-gradient(180deg, rgba(56, 189, 248, 0.26) 0%, rgba(56, 189, 248, 0.12) 100%)',
        activeBorder: '1.5px solid rgba(56, 189, 248, 0.80)',
        activeShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.22), 0 4px 12px -2px rgba(56, 189, 248, 0.30)'
      }
    ];

    const result = [];
    for (const item of catalog) {
      const exactMode = rawModes.find(m => item.match.includes(String(m).trim().toLowerCase()));
      if (exactMode !== undefined) {
        result.push({
          ...item,
          serviceValue: exactMode
        });
      }
    }
    return result;
  }

  /**
   * Normalize fan mode strings (including Z-Wave / Honeywell aliases like "Auto low" and "Low").
   */
  _normalizeFanMode(raw) {
    const s = String(raw ?? '').trim().toLowerCase();
    if (!s || s === 'unknown' || s === 'unavailable') return '';
    if (s === 'auto' || s === 'auto low' || s === 'auto_low' || s === 'auto high' || s === 'auto_high') {
      return 'auto';
    }
    if (s === 'on' || s === 'low' || s === 'high' || s === 'medium' || s === 'continuous') {
      return 'on';
    }
    return s;
  }

  /**
   * Return the list of supported Fan mode descriptors for this specific entity.
   * If fan modes are not supported by the thermostat, returns [].
   */
  _getSupportedFanModes(stateObj) {
    const features = Number(stateObj?.attributes?.supported_features ?? 0);
    const rawFanModes = Array.isArray(stateObj?.attributes?.fan_modes)
      ? stateObj.attributes.fan_modes
      : [];

    // ClimateEntityFeature.FAN_MODE = 8
    const supportsFan = (features & 8) !== 0 || rawFanModes.length > 0;
    if (!supportsFan || rawFanModes.length === 0) return [];

    const result = [];

    // Check if an "Auto" fan mode is supported
    const autoMatch = rawFanModes.find(m => {
      const lower = String(m).trim().toLowerCase();
      return lower === 'auto' || lower === 'auto low' || lower === 'auto_low';
    });
    if (autoMatch !== undefined) {
      // Prefer 'auto' if present in rawFanModes, otherwise the matched string
      const preferredAuto = rawFanModes.find(m => String(m).trim().toLowerCase() === 'auto') || autoMatch;
      result.push({
        canonical: 'auto',
        serviceValue: preferredAuto,
        icon: 'mdi:fan-auto',
        label: 'Fan Auto',
        activeColor: '#e2e8f0',
        activeBg: 'linear-gradient(180deg, rgba(148, 163, 184, 0.24) 0%, rgba(100, 116, 139, 0.12) 100%)',
        activeBorder: '1.5px solid rgba(226, 232, 240, 0.72)',
        activeShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.22), 0 4px 12px -2px rgba(15, 23, 42, 0.35)'
      });
    }

    // Check if an "On" / continuous fan mode is supported
    const onMatch = rawFanModes.find(m => {
      const lower = String(m).trim().toLowerCase();
      return lower === 'on' || lower === 'low' || lower === 'high' || lower === 'medium';
    });
    if (onMatch !== undefined) {
      const preferredOn = rawFanModes.find(m => String(m).trim().toLowerCase() === 'on') || onMatch;
      result.push({
        canonical: 'on',
        serviceValue: preferredOn,
        icon: 'mdi:fan',
        label: 'Fan On',
        activeColor: '#38bdf8',
        activeBg: 'linear-gradient(180deg, rgba(56, 189, 248, 0.26) 0%, rgba(56, 189, 248, 0.12) 100%)',
        activeBorder: '1.5px solid rgba(56, 189, 248, 0.80)',
        activeShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.22), 0 4px 12px -2px rgba(56, 189, 248, 0.30)'
      });
    }

    // Include any other custom fan modes exposed by a non-standard thermostat
    for (const raw of rawFanModes) {
      const norm = this._normalizeFanMode(raw);
      if (norm !== 'auto' && norm !== 'on' && !result.some(r => r.canonical === norm)) {
        result.push({
          canonical: norm,
          serviceValue: raw,
          icon: 'mdi:fan',
          label: `Fan ${raw}`,
          activeColor: '#38bdf8',
          activeBg: 'linear-gradient(180deg, rgba(56, 189, 248, 0.26) 0%, rgba(56, 189, 248, 0.12) 100%)',
          activeBorder: '1.5px solid rgba(56, 189, 248, 0.80)',
          activeShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.22), 0 4px 12px -2px rgba(56, 189, 248, 0.30)'
        });
      }
    }

    return result;
  }

  /**
   * Determine setpoint capabilities for this thermostat.
   */
  _getSetpointCapabilities(stateObj) {
    if (!stateObj || !stateObj.attributes) {
      return { supportsSingle: false, supportsRange: false, supportsAny: false };
    }
    const attr = stateObj.attributes;
    const features = Number(attr.supported_features ?? 0);
    // ClimateEntityFeature.TARGET_TEMPERATURE = 1, TARGET_TEMPERATURE_RANGE = 2
    const hasSingleFeature = (features & 1) !== 0;
    const hasRangeFeature = (features & 2) !== 0;
    const hasSingleAttr = attr.temperature !== undefined && attr.temperature !== null;
    const hasRangeAttr =
      attr.target_temp_low !== undefined &&
      attr.target_temp_low !== null &&
      attr.target_temp_high !== undefined &&
      attr.target_temp_high !== null;

    const supportsSingle = hasSingleFeature || hasSingleAttr;
    const supportsRange = hasRangeFeature || hasRangeAttr;
    return {
      supportsSingle,
      supportsRange,
      supportsAny: supportsSingle || supportsRange
    };
  }

  _getActiveHvacMode(stateObj) {
    if (Date.now() < this._optModeUntil && this._optMode) {
      return this._optMode;
    }
    if (!stateObj) return 'off';
    return this._normalizeHvacMode(stateObj.state);
  }

  _getActiveFanMode(stateObj) {
    if (Date.now() < this._optFanModeUntil && this._optFanMode) {
      return this._optFanMode;
    }
    if (!stateObj || !stateObj.attributes) return '';
    return this._normalizeFanMode(stateObj.attributes.fan_mode);
  }

  _getSetpoints(stateObj) {
    const attr = stateObj?.attributes || {};
    const rawLow = Number(attr.target_temp_low ?? attr.temperature ?? 68);
    const rawHigh = Number(attr.target_temp_high ?? attr.temperature ?? 73);
    const rawSingle = Number(attr.temperature ?? attr.target_temp_low ?? attr.target_temp_high ?? 70);

    const now = Date.now();
    const low =
      this._dragging && this._dragLow !== null
        ? this._dragLow
        : now < this._optUntil && this._optLow !== null
        ? this._optLow
        : Number.isFinite(rawLow)
        ? rawLow
        : 68;

    const high =
      this._dragging && this._dragHigh !== null
        ? this._dragHigh
        : now < this._optUntil && this._optHigh !== null
        ? this._optHigh
        : Number.isFinite(rawHigh)
        ? rawHigh
        : 73;

    const single =
      this._dragging && this._dragSingle !== null
        ? this._dragSingle
        : now < this._optUntil && this._optSingle !== null
        ? this._optSingle
        : Number.isFinite(rawSingle)
        ? rawSingle
        : 70;

    return {
      low: Math.round(low),
      high: Math.round(high),
      single: Math.round(single)
    };
  }

  _selectHvacMode(modeDesc) {
    const stateObj = this._getClimateStateObj();
    if (!stateObj || !this._hass) return;

    this._optMode = modeDesc.canonical;
    this._optModeUntil = Date.now() + 3500;
    this._updateUI();

    this._hass.callService('climate', 'set_hvac_mode', {
      entity_id: stateObj.entity_id,
      hvac_mode: modeDesc.serviceValue
    });
  }

  _selectFanMode(fanDesc) {
    const stateObj = this._getClimateStateObj();
    if (!stateObj || !this._hass) return;

    this._optFanMode = fanDesc.canonical;
    this._optFanModeUntil = Date.now() + 3500;
    this._updateUI();

    this._hass.callService('climate', 'set_fan_mode', {
      entity_id: stateObj.entity_id,
      fan_mode: fanDesc.serviceValue
    });
  }

  _commitTemperature(changedThumb, newLow, newHigh, newSingle) {
    const stateObj = this._getClimateStateObj();
    if (!stateObj || !this._hass) return;

    const entityId = stateObj.entity_id;
    const mode = this._getActiveHvacMode(stateObj);
    const caps = this._getSetpointCapabilities(stateObj);
    const features = Number(stateObj.attributes?.supported_features ?? 0);

    this._optLow = newLow;
    this._optHigh = newHigh;
    this._optSingle = newSingle;
    this._optUntil = Date.now() + 4000;

    if (mode === 'auto' && caps.supportsRange) {
      this._hass.callService('climate', 'set_temperature', {
        entity_id: entityId,
        target_temp_low: newLow,
        target_temp_high: newHigh
      });
      return;
    }

    const targetVal =
      changedThumb === 'low'
        ? newLow
        : changedThumb === 'high'
        ? newHigh
        : newSingle;

    // If entity supports single temperature (ClimateEntityFeature.TARGET_TEMPERATURE = 1)
    if ((features & 1) !== 0 || !caps.supportsRange) {
      this._hass.callService('climate', 'set_temperature', {
        entity_id: entityId,
        temperature: targetVal
      });
    }

    // If entity also maintains target_temp_low / target_temp_high in state attributes, update range separately
    if ((features & 2) !== 0 && stateObj.attributes?.target_temp_low != null && stateObj.attributes?.target_temp_high != null) {
      this._hass.callService('climate', 'set_temperature', {
        entity_id: entityId,
        target_temp_low: newLow,
        target_temp_high: newHigh
      });
    }
  }

  _renderSkeleton() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          box-sizing: border-box;
          user-select: none;
          -webkit-user-select: none;
          font-family: var(--primary-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
        }
        .card-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 4px 12px 10px 12px;
        }
        .controls-row {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
        }
        .controls-row.hidden {
          display: none;
        }
        .ctrl-btn {
          flex: 1 1 0;
          height: 42px;
          min-width: 0;
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.48);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #64748b;
          transition: all 0.16s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 0;
          outline: none;
          -webkit-tap-highlight-color: transparent;
        }
        .ctrl-btn:hover {
          background: rgba(30, 41, 59, 0.68);
          color: #cbd5e1;
          border-color: rgba(255, 255, 255, 0.16);
        }
        .ctrl-btn:active {
          transform: scale(0.96);
        }
        .ctrl-btn ha-icon {
          --mdc-icon-size: 22px;
          pointer-events: none;
        }
        .ctrl-divider {
          width: 1.5px;
          height: 26px;
          background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.03) 100%);
          margin: 0 2px;
          flex-shrink: 0;
          border-radius: 2px;
        }
        .bar-wrap {
          position: relative;
          height: 54px;
          border-radius: 12px;
          background: rgba(15, 23, 42, 0.62);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.45);
          padding: 0 18px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          transition: opacity 0.25s ease;
        }
        .bar-wrap.hidden {
          display: none;
        }
        .bar-wrap.off-state {
          opacity: 0.48;
        }
        .labels-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 7px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          pointer-events: none;
        }
        .lbl-low {
          color: #fb923c;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .lbl-center {
          color: #94a3b8;
          font-size: 10.5px;
          font-weight: 600;
        }
        .lbl-high {
          color: #38bdf8;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .track-area {
          position: relative;
          height: 22px;
          display: flex;
          align-items: center;
          cursor: pointer;
          touch-action: pan-y;
        }
        .track-bg {
          width: 100%;
          height: 8px;
          border-radius: 999px;
          background: rgba(30, 41, 59, 0.95);
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.6);
          position: relative;
          overflow: hidden;
        }
        .track-fill {
          position: absolute;
          top: 0;
          bottom: 0;
          border-radius: 999px;
          transition: left 0.08s ease-out, width 0.08s ease-out, background 0.2s ease;
        }
        .track-Area-dragging .track-fill,
        .track-Area-dragging .thumb {
          transition: none !important;
        }
        .ticks {
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          height: 4px;
          display: flex;
          justify-content: space-between;
          padding: 0 2px;
          pointer-events: none;
          opacity: 0.28;
        }
        .tick {
          width: 1px;
          height: 4px;
          background: #cbd5e1;
        }
        .thumb {
          position: absolute;
          top: 50%;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 800;
          color: #0f172a;
          cursor: grab;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.55), 0 0 0 2px rgba(255, 255, 255, 0.22);
          transition: left 0.08s ease-out, transform 0.12s ease, opacity 0.2s ease;
          z-index: 2;
          touch-action: none;
        }
        .thumb:hover {
          transform: translate(-50%, -50%) scale(1.12);
        }
        .thumb.active-drag {
          cursor: grabbing;
          transform: translate(-50%, -50%) scale(1.18);
          z-index: 4;
        }
        .thumb-low {
          background: linear-gradient(135deg, #fdba74 0%, #f97316 100%);
          color: #fff;
          text-shadow: 0 1px 2px rgba(0,0,0,0.45);
        }
        .thumb-high {
          background: linear-gradient(135deg, #7dd3fc 0%, #0284c7 100%);
          color: #fff;
          text-shadow: 0 1px 2px rgba(0,0,0,0.45);
        }
        .thumb.hidden {
          opacity: 0;
          pointer-events: none;
          transform: translate(-50%, -50%) scale(0.5);
        }
      </style>
      <div class="card-body">
        <div class="controls-row" id="controlsRow"></div>
        <div class="bar-wrap" id="barWrap">
          <div class="labels-row">
            <span class="lbl-low" id="lblLow"></span>
            <span class="lbl-center" id="lblCenter"></span>
            <span class="lbl-high" id="lblHigh"></span>
          </div>
          <div class="track-area" id="trackArea">
            <div class="track-bg">
              <div class="ticks">
                <span class="tick"></span><span class="tick"></span><span class="tick"></span>
                <span class="tick"></span><span class="tick"></span><span class="tick"></span>
                <span class="tick"></span>
              </div>
              <div class="track-fill" id="trackFill"></div>
            </div>
            <div class="thumb thumb-low" id="thumbLow"></div>
            <div class="thumb thumb-high" id="thumbHigh"></div>
          </div>
        </div>
      </div>
    `;

    this._controlsRow = this.shadowRoot.getElementById('controlsRow');
    this._barWrap = this.shadowRoot.getElementById('barWrap');
    this._trackArea = this.shadowRoot.getElementById('trackArea');
    this._trackFill = this.shadowRoot.getElementById('trackFill');
    this._thumbLow = this.shadowRoot.getElementById('thumbLow');
    this._thumbHigh = this.shadowRoot.getElementById('thumbHigh');
    this._lblLow = this.shadowRoot.getElementById('lblLow');
    this._lblCenter = this.shadowRoot.getElementById('lblCenter');
    this._lblHigh = this.shadowRoot.getElementById('lblHigh');

    this._bindSliderEvents();
    this._initialized = true;
  }

  _bindSliderEvents() {
    const startDrag = (which, e) => {
      const stateObj = this._getClimateStateObj();
      if (!stateObj) return;
      const mode = this._getActiveHvacMode(stateObj);
      if (mode === 'off' || mode === 'fan_only') return;

      e.stopPropagation();
      if (e.cancelable) e.preventDefault();

      const pts = this._getSetpoints(stateObj);
      this._dragging = which;
      this._dragLow = pts.low;
      this._dragHigh = pts.high;
      this._dragSingle = pts.single;

      this._trackArea.classList.add('track-Area-dragging');
      if (which === 'low') {
        this._thumbLow.classList.add('active-drag');
      } else {
        this._thumbHigh.classList.add('active-drag');
      }

      const moveHandler = (ev) => this._onPointerMove(ev);
      const upHandler = () => {
        window.removeEventListener('mousemove', moveHandler);
        window.removeEventListener('touchmove', moveHandler);
        window.removeEventListener('mouseup', upHandler);
        window.removeEventListener('touchend', upHandler);
        window.removeEventListener('touchcancel', upHandler);
        this._endDrag();
      };

      window.addEventListener('mousemove', moveHandler);
      window.addEventListener('touchmove', moveHandler, { passive: false });
      window.addEventListener('mouseup', upHandler);
      window.addEventListener('touchend', upHandler);
      window.addEventListener('touchcancel', upHandler);
    };

    this._thumbLow.addEventListener('mousedown', (e) => startDrag('low', e));
    this._thumbLow.addEventListener('touchstart', (e) => startDrag('low', e), { passive: false });

    this._thumbHigh.addEventListener('mousedown', (e) => startDrag('high', e));
    this._thumbHigh.addEventListener('touchstart', (e) => startDrag('high', e), { passive: false });

    this._trackArea.addEventListener('mousedown', (e) => {
      if (e.target === this._thumbLow || e.target === this._thumbHigh) return;
      this._onTrackClick(e, startDrag);
    });
    this._trackArea.addEventListener('touchstart', (e) => {
      if (e.target === this._thumbLow || e.target === this._thumbHigh) return;
      this._onTrackClick(e, startDrag);
    }, { passive: false });
  }

  _clientXToTemp(clientX) {
    const rect = this._trackArea.getBoundingClientRect();
    if (!rect.width) return this._min;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(this._min + pct * (this._max - this._min));
  }

  _onTrackClick(e, startDragFn) {
    const stateObj = this._getClimateStateObj();
    if (!stateObj) return;
    const mode = this._getActiveHvacMode(stateObj);
    if (mode === 'off' || mode === 'fan_only') return;

    const clientX = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
    const clickedTemp = this._clientXToTemp(clientX);
    const pts = this._getSetpoints(stateObj);
    const caps = this._getSetpointCapabilities(stateObj);

    let targetThumb = 'low';
    if (mode === 'cool') {
      targetThumb = 'high';
    } else if (mode === 'heat') {
      targetThumb = 'low';
    } else if (mode === 'auto' && caps.supportsRange) {
      const distLow = Math.abs(clickedTemp - pts.low);
      const distHigh = Math.abs(clickedTemp - pts.high);
      targetThumb = distLow <= distHigh ? 'low' : 'high';
    } else {
      targetThumb = 'low';
    }

    startDragFn(targetThumb, e);
    this._onPointerMove(e);
  }

  _onPointerMove(e) {
    if (!this._dragging) return;
    if (e.cancelable) e.preventDefault();

    const stateObj = this._getClimateStateObj();
    const mode = this._getActiveHvacMode(stateObj);
    const caps = this._getSetpointCapabilities(stateObj);

    const clientX = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
    const val = this._clientXToTemp(clientX);

    if (this._dragging === 'low') {
      if (mode === 'auto' && caps.supportsRange) {
        this._dragLow = Math.min(val, this._dragHigh - this._minGap);
        this._dragLow = Math.max(this._min, this._dragLow);
      } else {
        this._dragLow = Math.max(this._min, Math.min(this._max, val));
        this._dragSingle = this._dragLow;
      }
    } else if (this._dragging === 'high') {
      if (mode === 'auto' && caps.supportsRange) {
        this._dragHigh = Math.max(val, this._dragLow + this._minGap);
        this._dragHigh = Math.min(this._max, this._dragHigh);
      } else {
        this._dragHigh = Math.max(this._min, Math.min(this._max, val));
        this._dragSingle = this._dragHigh;
      }
    }

    this._updateUI();
  }

  _endDrag() {
    if (!this._dragging) return;
    const changedThumb = this._dragging;
    const finalLow = this._dragLow;
    const finalHigh = this._dragHigh;
    const finalSingle = this._dragSingle;

    this._dragging = null;
    this._dragLow = null;
    this._dragHigh = null;
    this._dragSingle = null;

    this._trackArea.classList.remove('track-Area-dragging');
    this._thumbLow.classList.remove('active-drag');
    this._thumbHigh.classList.remove('active-drag');

    if (finalLow !== null && finalHigh !== null) {
      this._commitTemperature(changedThumb, finalLow, finalHigh, finalSingle);
    }
    this._updateUI();
  }

  _valToPct(val) {
    const clamped = Math.max(this._min, Math.min(this._max, val));
    return ((clamped - this._min) / (this._max - this._min)) * 100;
  }

  _renderControlsRow(stateObj) {
    if (!this._controlsRow) return;

    const hvacModes = this._getSupportedHvacModes(stateObj);
    const fanModes = this._getSupportedFanModes(stateObj);

    if (hvacModes.length === 0 && fanModes.length === 0) {
      this._controlsRow.classList.add('hidden');
      this._controlsRow.textContent = '';
      return;
    }

    this._controlsRow.classList.remove('hidden');

    const activeHvac = this._getActiveHvacMode(stateObj);
    const activeFan = this._getActiveFanMode(stateObj);

    const signature = JSON.stringify({
      hvac: hvacModes.map(m => m.canonical),
      fan: fanModes.map(f => f.canonical)
    });

    if (this._lastSignature !== signature) {
      this._lastSignature = signature;
      this._controlsRow.textContent = '';

      for (const modeDesc of hvacModes) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ctrl-btn';
        btn.dataset.kind = 'hvac';
        btn.dataset.canonical = modeDesc.canonical;
        btn.title = modeDesc.label;
        btn.setAttribute('aria-label', modeDesc.label);
        const ico = document.createElement('ha-icon');
        ico.setAttribute('icon', modeDesc.icon);
        btn.appendChild(ico);
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._selectHvacMode(modeDesc);
        });
        this._controlsRow.appendChild(btn);
      }

      if (hvacModes.length > 0 && fanModes.length > 0) {
        const div = document.createElement('div');
        div.className = 'ctrl-divider';
        this._controlsRow.appendChild(div);
      }

      for (const fanDesc of fanModes) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ctrl-btn';
        btn.dataset.kind = 'fan';
        btn.dataset.canonical = fanDesc.canonical;
        btn.title = fanDesc.label;
        btn.setAttribute('aria-label', fanDesc.label);
        const ico = document.createElement('ha-icon');
        ico.setAttribute('icon', fanDesc.icon);
        btn.appendChild(ico);
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._selectFanMode(fanDesc);
        });
        this._controlsRow.appendChild(btn);
      }
    }

    // Update active visual states on all buttons
    const buttons = this._controlsRow.querySelectorAll('.ctrl-btn');
    buttons.forEach((btn) => {
      const kind = btn.dataset.kind;
      const canonical = btn.dataset.canonical;
      const descList = kind === 'hvac' ? hvacModes : fanModes;
      const desc = descList.find(d => d.canonical === canonical);
      if (!desc) return;

      const isActive = kind === 'hvac' ? canonical === activeHvac : canonical === activeFan;
      if (isActive) {
        btn.style.background = desc.activeBg;
        btn.style.border = desc.activeBorder;
        btn.style.boxShadow = desc.activeShadow;
        btn.style.color = desc.activeColor;
      } else {
        btn.style.background = 'rgba(15, 23, 42, 0.48)';
        btn.style.border = '1px solid rgba(255, 255, 255, 0.08)';
        btn.style.boxShadow = 'none';
        btn.style.color = '#64748b';
      }
    });
  }

  _updateUI() {
    if (!this._initialized) return;
    const stateObj = this._getClimateStateObj();
    if (!stateObj) return;

    // Respect card config min/max if provided; otherwise use the climate entity's native min_temp / max_temp attributes
    this._min = Number.isFinite(Number(this._config.min))
      ? Number(this._config.min)
      : Number.isFinite(Number(stateObj.attributes?.min_temp))
      ? Number(stateObj.attributes.min_temp)
      : 55;
    this._max = Number.isFinite(Number(this._config.max))
      ? Number(this._config.max)
      : Number.isFinite(Number(stateObj.attributes?.max_temp))
      ? Number(stateObj.attributes.max_temp)
      : 85;

    // 1. Update dynamic capability-driven mode & fan controls row
    this._renderControlsRow(stateObj);

    // 2. Update setpoint bar (or hide if thermostat does not support temperature setpoints)
    const caps = this._getSetpointCapabilities(stateObj);
    if (!caps.supportsAny) {
      this._barWrap.classList.add('hidden');
      return;
    }
    this._barWrap.classList.remove('hidden');

    const mode = this._getActiveHvacMode(stateObj);
    const { low, high, single } = this._getSetpoints(stateObj);

    const lowPct = this._valToPct(low);
    const highPct = this._valToPct(high);
    const singlePct = this._valToPct(single);

    this._thumbLow.textContent = `${low}°`;
    this._thumbHigh.textContent = `${high}°`;

    if (mode === 'off' || mode === 'fan_only') {
      this._barWrap.classList.add('off-state');
      this._thumbLow.classList.add('hidden');
      this._thumbHigh.classList.add('hidden');
      this._trackFill.style.left = `${lowPct}%`;
      this._trackFill.style.width = `${Math.max(0, highPct - lowPct)}%`;
      this._trackFill.style.background = 'rgba(100, 116, 139, 0.35)';
      this._lblLow.style.color = '#94a3b8';
      this._lblLow.textContent = mode === 'fan_only' ? 'FAN ONLY' : 'SYSTEM OFF';
      this._lblCenter.textContent =
        caps.supportsRange ? `STANDBY (${low}°–${high}°F)` : `STANDBY (${single}°F)`;
      this._lblHigh.style.color = '#64748b';
      this._lblHigh.textContent = `${this._min}°–${this._max}°F`;
    } else if (mode === 'heat') {
      const heatVal = caps.supportsRange ? low : single;
      const heatPct = this._valToPct(heatVal);
      this._thumbLow.textContent = `${heatVal}°`;
      this._barWrap.classList.remove('off-state');
      this._thumbLow.classList.remove('hidden');
      this._thumbHigh.classList.add('hidden');
      this._thumbLow.style.left = `${heatPct}%`;
      this._trackFill.style.left = '0%';
      this._trackFill.style.width = `${heatPct}%`;
      this._trackFill.style.background = 'linear-gradient(90deg, rgba(251, 146, 60, 0.20) 0%, rgba(249, 115, 22, 0.85) 100%)';
      this._lblLow.style.color = '#fb923c';
      this._lblLow.textContent = `🔥 HEAT TARGET: ${heatVal}°F`;
      this._lblCenter.textContent = 'DRAG SLIDER TO ADJUST';
      this._lblHigh.style.color = '#64748b';
      this._lblHigh.textContent = `MAX ${this._max}°F`;
    } else if (mode === 'cool') {
      const coolVal = caps.supportsRange ? high : single;
      const coolPct = this._valToPct(coolVal);
      this._thumbHigh.textContent = `${coolVal}°`;
      this._barWrap.classList.remove('off-state');
      this._thumbLow.classList.add('hidden');
      this._thumbHigh.classList.remove('hidden');
      this._thumbHigh.style.left = `${coolPct}%`;
      this._trackFill.style.left = `${coolPct}%`;
      this._trackFill.style.width = `${Math.max(0, 100 - coolPct)}%`;
      this._trackFill.style.background = 'linear-gradient(90deg, rgba(56, 189, 248, 0.85) 0%, rgba(56, 189, 248, 0.20) 100%)';
      this._lblLow.style.color = '#64748b';
      this._lblLow.textContent = `MIN ${this._min}°F`;
      this._lblCenter.textContent = 'DRAG SLIDER TO ADJUST';
      this._lblHigh.style.color = '#38bdf8';
      this._lblHigh.textContent = `❄️ COOL TARGET: ${coolVal}°F`;
    } else if (mode === 'auto' && caps.supportsRange) {
      this._barWrap.classList.remove('off-state');
      this._thumbLow.classList.remove('hidden');
      this._thumbHigh.classList.remove('hidden');
      this._thumbLow.style.left = `${lowPct}%`;
      this._thumbHigh.style.left = `${highPct}%`;
      this._trackFill.style.left = `${lowPct}%`;
      this._trackFill.style.width = `${Math.max(0, highPct - lowPct)}%`;
      this._trackFill.style.background = 'linear-gradient(90deg, #f97316 0%, #34d399 50%, #38bdf8 100%)';
      this._lblLow.style.color = '#fb923c';
      this._lblLow.textContent = `🔥 HEAT ${low}°F`;
      this._lblCenter.textContent = `BAND ${high - low}°F`;
      this._lblHigh.style.color = '#38bdf8';
      this._lblHigh.textContent = `❄️ COOL ${high}°F`;
    } else {
      // Single-setpoint Auto / Dry mode
      this._thumbLow.textContent = `${single}°`;
      this._barWrap.classList.remove('off-state');
      this._thumbLow.classList.remove('hidden');
      this._thumbHigh.classList.add('hidden');
      this._thumbLow.style.left = `${singlePct}%`;
      this._trackFill.style.left = '0%';
      this._trackFill.style.width = `${singlePct}%`;
      this._trackFill.style.background = 'linear-gradient(90deg, rgba(52, 211, 153, 0.25) 0%, rgba(52, 211, 153, 0.85) 100%)';
      this._lblLow.style.color = '#fb923c';
      this._lblLow.textContent = `🎯 TARGET: ${single}°F`;
      this._lblCenter.textContent = 'DRAG SLIDER TO ADJUST';
      this._lblHigh.style.color = '#64748b';
      this._lblHigh.textContent = `${this._min}°–${this._max}°F`;
    }
  }

  getCardSize() {
    return 2;
  }
}

if (!customElements.get('thermostat-range-bar')) {
  customElements.define('thermostat-range-bar', ThermostatRangeBar);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === 'thermostat-range-bar')) {
  window.customCards.push({
    type: 'thermostat-range-bar',
    name: 'Thermostat Range Bar',
    description: 'Generic capability-driven HVAC & Fan Mode controller with single/dual-thumb setpoint slider for any Home Assistant climate entity.',
    preview: true
  });
}
