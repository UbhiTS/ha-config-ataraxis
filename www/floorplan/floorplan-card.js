class FloorplanCard extends HTMLElement {
  constructor() {
    super();

    this.version = "1.1.8";

    this.isScriptsLoading = false;
    this.isFloorplanLoading = false;

    this.isScriptsLoaded = false;
    this.isFloorplanLoaded = false;

    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    this.config = config;

    this.initCard(config);
    this.setIsLoading(true);
  }

  set hass(hass) {
    if (!this.config || this.isScriptsLoading || this.isFloorplanLoading) return;

    (this.isScriptsLoaded ? Promise.resolve() : this.loadScripts())
      .then(() => {
        (this.isFloorplanLoaded ? Promise.resolve() : this.loadFloorplan(hass, this.config))
          .then(() => {
            this.floorplan.hassChanged(hass);
          });
      });
  }

  loadScripts() {
    this.isScriptsLoading = true;

    const promises = [];

    promises.push(this.loadScript(`/local/floorplan/lib/floorplan.js?v=${this.version}`, true));
    promises.push(this.loadScript('/local/floorplan/lib/yaml.min.js', true));
    promises.push(this.loadScript('/local/floorplan/lib/jquery-3.4.1.min.js', true));

    return Promise.all(promises)
      .then(() => {
        this.isScriptsLoading = false;
        this.isScriptsLoaded = true;
      });
  }

  loadFloorplan(hass, config) {
    this.isFloorplanLoading = true;

    const floorplan = new Floorplan();

    const options = {
      root: this.shadowRoot,
      hass: hass,
      openMoreInfo: this.openMoreInfo.bind(this),
      setIsLoading: this.setIsLoading.bind(this),
      config: (config && config.config) || config,
    };

    return floorplan.init(options)
      .then(() => {
        this.setIsLoading(false);
        this.floorplan = floorplan;
        this.isFloorplanLoading = false;
        this.isFloorplanLoaded = true;
      });
  }

  initCard(config) {
    const root = this.shadowRoot;
    if (root.lastChild) root.removeChild(root.lastChild);

    const style = document.createElement('style');
    style.textContent = this.getStyle();
    root.appendChild(style);

    const card = document.createElement('ha-card');
    card.header = config.title;
    root.appendChild(card);

    const container = document.createElement('div');
    container.id = 'container';
    card.appendChild(container);

    const spinner = document.createElement('paper-spinner-lite');
    container.appendChild(spinner);

    const floorplan = document.createElement('div');
    floorplan.id = 'floorplan';
    container.appendChild(floorplan);

    const log = document.createElement('div');
    log.id = 'log';
    container.appendChild(log);

    const link = document.createElement('a');
    link.setAttribute('href', '#');
    link.text = 'Clear log';
    log.appendChild(link);
    link.onclick = function () { $(this).siblings('ul').html('').parent().css('display', 'none'); };

    const list = document.createElement('ul');
    log.appendChild(list);

    this.log = log;
    this.spinner = spinner;
  }

  getStyle() {
    return `
      #container {
        text-align: center;
      }

      paper-spinner-lite {
        margin-bottom: 50px;
      }

      #log {
        max-height: 150px;
        overflow: auto;
        background-color: #eee;
        display: none;
        padding: 10px;
      }

      #log ul {
        list-style-type: none;
        padding-left: 0px;
        text-align: left;
      }

      .error {
        color: #FF0000;
      }

      .warning {
        color: #FF851B;
      }

      .info {
        color: #0000FF;
      }

      .debug {
        color: #000000;
      }
    `;
  }

  openMoreInfo(entityId) {
    this.fire('hass-more-info', { entityId: entityId });
  }

  setIsLoading(isLoading) {
    this.isLoading = isLoading;

    if (this.isLoading) {
      this.spinner.setAttribute('active', '');
      this.spinner.style.display = 'inline-block';
    }
    else {
      this.spinner.removeAttribute('active');
      this.spinner.style.display = 'none';
    }
  }

  logError(message) {
    console.error(message);

    $(this.log).find('ul').prepend(`<li class="error">${message}</li>`)
    $(this.log).css('display', 'block');
  }

  fire(type, detail, options) {
    options = options || {};
    detail = (detail === null || detail === undefined) ? {} : detail;
    const event = new Event(type, {
      bubbles: options.bubbles === undefined ? true : options.bubbles,
      cancelable: Boolean(options.cancelable),
      composed: options.composed === undefined ? true : options.composed
    });
    event.detail = detail;
    const node = options.node || this;
    node.dispatchEvent(event);
    return event;
  }

  loadScript(scriptUrl, useCache) {
    return new Promise((resolve, reject) => {
      let script = document.createElement('script');
      script.async = true;
      script.src = useCache ? scriptUrl : this.cacheBuster(scriptUrl);
      script.onload = () => resolve();
      script.onerror = (err) => reject(new URIError(`${err.target.src}`));
      this.appendChild(script);
    });
  }

  cacheBuster(url) {
    return `${url}${(url.indexOf('?') >= 0) ? '&' : '?'}_=${new Date().getTime()}`;
  }
}

customElements.define('floorplan-card', FloorplanCard);
