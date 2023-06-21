import { LitElement, html, css } from 'https://unpkg.com/lit-element@2.0.1/lit-element.js?module';

class LightWithProfiles extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {}
    };
  }

  constructor() {
    super();

    this.lightProfiles = {};
  }

  render() {
    return html`
      <ha-card>
        ${this.config.title
          ? html`
              <div class="card-header">
                <div class="name">${this.config.title}</div>
              </div>
            `
          : ''}
        <div class="card-content entities">
          ${this.config.entities.map(ent => {
            const stateObj = this.hass.states[ent.entity];
            return stateObj
              ? html`
                  <ha-icon class="entity-icon" ?active="${stateObj.state === 'on'}" .icon="${ent.icon ? ent.icon : stateObj.attributes.icon}" @click="${() => this.toggleLight(ent.entity)}"></ha-icon>
                  <span class="label">
                    ${ent.name ? ent.name : stateObj.attributes.friendly_name}
                    ${this.config.debug
                      ? html`
                          <small>x,y: ${stateObj.attributes.xy_color ? stateObj.attributes.xy_color.toString() : 'null'}</small>
                          <small>brightness: ${stateObj.attributes.brightness ? stateObj.attributes.brightness.toString() : 'null'}</small>
                        `
                      : ''}
                  </span>
                  <div class="profiles">
                    ${ent.profiles
                      ? ent.profiles.map(profile => {
                          return html`
                            <ha-icon class="profile-icon" ?active="${this.profileClass(stateObj, profile.name)}" .icon="${profile.icon}" .title="${profile.name}" @click="${() => this.turnOnProfile(ent.entity, profile.name)}"></ha-icon>
                          `;
                        })
                      : ''}
                  </div>
                  <ha-switch ?checked="${stateObj.state === 'on'}" @click="${() => this.toggleLight(ent.entity)}"></ha-switch>
                `
              : 'Entity not found!';
          })}
        </div>
      </ha-card>
    `;
  }

  toggleLight(entity) {
    this.hass.callService('homeassistant', 'toggle', {
      entity_id: entity
    });
  }

  turnOnProfile(entity, pro) {
    this.hass.callService('light', 'turn_on', {
      entity_id: entity,
      profile: pro
    });
  }

  profileClass(stateObj, profile) {
    let XYcolor = '0,0';

    if (stateObj.attributes.xy_color) {
      XYcolor = stateObj.attributes.xy_color.toString();
    }

    if (stateObj.attributes.brightness) {
      const activeProfile = `${XYcolor},${stateObj.attributes.brightness.toString()}`;

      if (activeProfile === this.lightProfiles[profile]) {
        return true;
      }
    }

    return false;
  }

  setConfig(config) {
    if (!config.entities) {
      throw new Error('You need to define entities');
    }

    const ll = this.getLovelace();

    if (ll.config && ll.config.light_profiles) {
      this.lightProfiles = ll.config.light_profiles;
    }

    this.config = config;
  }

  getCardSize() {
    return this.config.entities.length + 1;
  }

  static get styles() {
    return css`
      .entities {
        display: grid;
        grid-template-columns: 24px auto auto 46px;
        gap: 16px 10px;
        margin-top: 8px;
      }

      .entity-icon {
        fill: var(--disabled-text-color);
      }

      .entity-icon[active] {
        fill: var(--primary-color);
      }

      .label {
        font-size: 1.2rem;
        font-weight: 500;
      }

      .profiles {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        justify-content: space-around;
        align-content: stretch;
        align-items: flex-start;
      }

      .profile-icon {
        cursor: pointer;
        fill: var(--disabled-text-color);
      }

      .profile-icon[active] {
        fill: var(--primary-color);
      }

      paper-toggle-button {
        cursor: pointer;
      }
    `;
  }
  // https://github.com/custom-cards/custom-card-helpers/blob/master/src/get-lovelace.ts
  getLovelace() {
    let root = document.querySelector('home-assistant');
    root = root && root.shadowRoot;
    root = root && root.querySelector('home-assistant-main');
    root = root && root.shadowRoot;
    root = root && root.querySelector('app-drawer-layout partial-panel-resolver');
    root = (root && root.shadowRoot) || root;
    root = root && root.querySelector('ha-panel-lovelace');
    root = root && root.shadowRoot;
    root = root && root.querySelector('hui-root');
    if (root) {
      const ll = root.lovelace;
      ll.current_view = root.___curView;
      return ll;
    }
    return null;
  }
}

customElements.define('light-with-profiles', LightWithProfiles);
