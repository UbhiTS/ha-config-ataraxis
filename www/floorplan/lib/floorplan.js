(function () {
  if (typeof window.Floorplan === 'function') return;

  class Floorplan {
    constructor() {
      this.version = '1.1.14';
      this.root = {};
      this.hass = {};
      this.openMoreInfo = () => { };
      this.setIsLoading = () => { };
      this.config = undefined;
      this.timeDifferenceMs = 0; // assume client and server perfectly in sync
      this.pageInfos = [];
      this.entityInfos = [];
      this.elementInfos = [];
      this.cssRules = [];
      this.lastMotionConfig = {};
      this.logLevels = [];
      this.handleEntitiesDebounced = {};
      this.variables = [];

      //this.setIsLoading(true);
    }

    hassChanged(newHass, oldHass) {
      this.hass = newHass;

      if (!this.config) return;

      this.handleEntitiesDebounced(); // use debounced wrapper
    }

    /***************************************************************************************************************************/
    /* Startup
    /***************************************************************************************************************************/

    init(options) {
      this.root = options.root;
      this.hass = options.hass;
      this.openMoreInfo = options.openMoreInfo;
      this.setIsLoading = options.setIsLoading;

      window.onerror = this.handleWindowError.bind(this);

      this.handleEntitiesDebounced = this.debounce(() => {
        return this.handleEntities();
      }, 100);

      this.initTimeDifference();

      return this.loadConfig(options.config)
        .then(config => {
          this.getLogLevels(config);
          this.logInfo('VERSION', `Floorplan v${this.version}`);

          if (!this.validateConfig(config)) {
            this.setIsLoading(false);
            return Promise.resolve();
          }

          this.config = Object.assign({}, config);

          return this.loadLibraries()
            .then(() => {
              this.initFullyKiosk();
              return this.config.pages ? this.initMultiPage() : this.initSinglePage();
            });
        })
        .catch(error => {
          this.setIsLoading(false);
          this.handleError(error);
        });
    }

    initMultiPage() {
      return this.loadPages()
        .then(() => {
          this.setIsLoading(false);
          this.initPageDisplay();
          this.initVariables();
          this.initStartupActions();
          return this.handleEntities(true);
        });
    }

    initSinglePage() {
      const imageUrl = this.getBestImage(this.config);
      return this.loadFloorplanSvg(imageUrl)
        .then((svg) => {
          this.config.svg = svg;
          return this.loadStyleSheet(this.config.stylesheet)
            .then(() => {
              return this.initFloorplan(svg, this.config)
                .then(() => {
                  this.setIsLoading(false);
                  this.initPageDisplay();
                  this.initVariables();
                  this.initStartupActions();
                  return this.handleEntities(true);
                })
            });
        });
    }

    getLogLevels(config) {
      if (!config.log_level) return;

      const allLogLevels = {
        error: ['error'],
        warning: ['error', 'warning'],
        info: ['error', 'warning', 'info'],
        debug: ['error', 'warning', 'info', 'debug'],
      };

      const logLevels = allLogLevels[config.log_level.toLowerCase()];

      this.logLevels = logLevels ? logLevels : [];
    }

    /***************************************************************************************************************************/
    /* Loading resources
    /***************************************************************************************************************************/

    loadConfig(config) {
      if (typeof config === 'string') {
        return this.fetchTextResource(config, false)
          .then(config => {
            return Promise.resolve(YAML.parse(config));
          });
      }
      else {
        return Promise.resolve(config);
      }
    }

    loadLibraries() {
      const promises = [];

      if (this.isOptionEnabled(this.config.pan_zoom)) {
        promises.push(this.loadScript('/local/floorplan/lib/svg-pan-zoom.min.js'));
      }

      if (this.isOptionEnabled(this.config.fully_kiosk)) {
        promises.push(this.loadScript('/local/floorplan/lib/fully-kiosk.js'));
      }

      return promises.length ? Promise.all(promises) : Promise.resolve();
    }

    loadScript(scriptUrl) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = this.cacheBuster(scriptUrl);
        script.onload = () => {
          return resolve();
        };
        script.onerror = (err) => {
          reject(new URIError(`${err.target.src}`));
        };

        this.root.appendChild(script);
      });
    }

    loadPages() {
      const configPromises = [Promise.resolve()]
        .concat(this.config.pages.map(pageConfigUrl => {
          return this.loadPageConfig(pageConfigUrl, this.config.pages.indexOf(pageConfigUrl));
        }));

      return Promise.all(configPromises)
        .then(() => {
          const pageInfos = Object.keys(this.pageInfos).map(key => this.pageInfos[key]);
          pageInfos.sort((a, b) => a.index - b.index); // sort ascending

          const masterPageInfo = pageInfos.find(pageInfo => pageInfo.config.master_page);
          if (masterPageInfo) {
            masterPageInfo.isMaster = true;
          }

          const defaultPageInfo = pageInfos.find(pageInfo => !pageInfo.config.master_page);
          if (defaultPageInfo) {
            defaultPageInfo.isDefault = true;
          }

          return this.loadPageFloorplanSvg(masterPageInfo, masterPageInfo) // load master page first
            .then(() => {
              const nonMasterPages = pageInfos.filter(pageInfo => pageInfo !== masterPageInfo);

              const svgPromises = [Promise.resolve()]
                .concat(nonMasterPages.map(pageInfo => this.loadPageFloorplanSvg(pageInfo, masterPageInfo)));

              return Promise.all(svgPromises);
            });
        });
    }

    loadPageConfig(pageConfigUrl, index) {
      return this.loadConfig(pageConfigUrl)
        .then((pageConfig) => {
          const pageInfo = this.createPageInfo(pageConfig);
          pageInfo.index = index;
          return Promise.resolve(pageInfo);
        });
    }

    loadPageFloorplanSvg(pageInfo, masterPageInfo) {
      const imageUrl = this.getBestImage(pageInfo.config);
      return this.loadFloorplanSvg(imageUrl, pageInfo, masterPageInfo)
        .then((svg) => {
          svg.id = pageInfo.config.page_id; // give the SVG an ID so it can be styled (i.e. background color)
          pageInfo.svg = svg;
          return this.loadStyleSheet(pageInfo.config.stylesheet)
            .then(() => {
              return this.initFloorplan(pageInfo.svg, pageInfo.config);
            });
        });
    }

    getBestImage(config) {
      let imageUrl = '';

      if (typeof config.image === 'string') {
        imageUrl = config.image;
      }
      else {
        if (config.image.sizes) {
          config.image.sizes.sort((a, b) => b.min_width - a.min_width); // sort descending
          for (let pageSize of config.image.sizes) {
            if (screen.width >= pageSize.min_width) {
              imageUrl = pageSize.location;
              break;
            }
          }
        }
      }

      return imageUrl;
    }

    createPageInfo(pageConfig) {
      const pageInfo = { config: pageConfig };

      // Merge the page's rules with the main config's rules
      if (pageInfo.config.rules && this.config.rules) {
        pageInfo.config.rules = pageInfo.config.rules.concat(this.config.rules);
      }

      this.pageInfos[pageInfo.config.page_id] = pageInfo;

      return pageInfo;
    }

    loadStyleSheet(stylesheetUrl) {
      if (!stylesheetUrl) {
        return Promise.resolve();
      }

      return this.fetchTextResource(stylesheetUrl, false)
        .then(stylesheet => {
          const link = document.createElement('style');
          link.type = 'text/css';
          link.innerHTML = stylesheet;
          this.root.appendChild(link);

          const cssRules = this.getArray(link.sheet.cssRules);
          this.cssRules = this.cssRules.concat(cssRules);

          return Promise.resolve();
        });
    }

    loadFloorplanSvg(imageUrl, pageInfo, masterPageInfo) {
      return this.fetchTextResource(imageUrl, true)
        .then(result => {
          let svg = $(result).siblings('svg')[0];
          svg = svg ? svg : $(result);

          if (pageInfo) {
            $(svg).attr('id', pageInfo.config.page_id);
          }

          $(svg).height('100%');
          $(svg).width('100%');
          $(svg).css('position', this.isPanel ? 'absolute' : 'relative');
          $(svg).css('cursor', 'default');
          $(svg).css('opacity', 0);
          $(svg).attr('xmlns:xlink', 'http://www.w3.org/1999/xlink');

          if (pageInfo && masterPageInfo) {
            const masterPageId = masterPageInfo.config.page_id;
            const contentElementId = masterPageInfo.config.master_page.content_element;

            if (pageInfo.config.page_id === masterPageId) {
              $(this.root).find('#floorplan').append(svg);
            }
            else {
              const $masterPageElement = $(this.root).find('#' + masterPageId);
              const $contentElement = $(this.root).find('#' + contentElementId);

              const height = Number.parseFloat($(svg).attr('height'));
              const width = Number.parseFloat($(svg).attr('width'));
              if (!$(svg).attr('viewBox')) {
                $(svg).attr('viewBox', `0 0 ${width} ${height}`);
              }

              $(svg)
                .attr('preserveAspectRatio', 'xMinYMin meet')
                .attr('height', $contentElement.attr('height'))
                .attr('width', $contentElement.attr('width'))
                .attr('x', $contentElement.attr('x'))
                .attr('y', $contentElement.attr('y'));

              $contentElement.parent().append(svg);
            }
          }
          else {
            $(this.root).find('#floorplan').append(svg);
          }

          // Enable pan / zoom if enabled in config
          if (this.isOptionEnabled(this.config.pan_zoom)) {
            svgPanZoom($(svg)[0], {
              zoomEnabled: true,
              controlIconsEnabled: true,
              fit: true,
              center: true,
            });
          }

          return Promise.resolve(svg);
        });
    }

    loadImage(imageUrl, svgElementInfo, entityId, rule) {
      if (imageUrl.toLowerCase().indexOf('.svg') >= 0) {
        return this.loadSvgImage(imageUrl, svgElementInfo, entityId, rule);
      }
      else {
        return this.loadBitmapImage(imageUrl, svgElementInfo, entityId, rule);
      }
    }

    loadBitmapImage(imageUrl, svgElementInfo, entityId, rule) {
      return this.fetchImageResource(imageUrl, false, true)
        .then(imageData => {
          this.logDebug('IMAGE', `${entityId} (setting image: ${imageUrl})`);

          let svgElement = svgElementInfo.svgElement; // assume the target element already exists

          if (!$(svgElement).is('image')) {
            svgElement = this.createImageElement(svgElementInfo.originalSvgElement);

            $(svgElement).append(document.createElementNS('http://www.w3.org/2000/svg', 'title'))
              .off('click')
              .on('click', this.onEntityClick.bind({ instance: this, svgElementInfo: svgElementInfo, entityId: entityId, rule: rule }))
              .css('cursor', 'pointer')
              .addClass('ha-entity');

            svgElementInfo.svgElement = this.replaceElement(svgElementInfo.svgElement, svgElement);
          }

          const existingHref = svgElement.getAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href');
          if (existingHref !== imageData) {
            svgElement.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imageUrl);
          }

          return Promise.resolve(svgElement);
        });
    }

    loadSvgImage(imageUrl, svgElementInfo, entityId, rule) {
      return this.fetchTextResource(imageUrl, true)
        .then(result => {
          this.logDebug('IMAGE', `${entityId} (setting image: ${imageUrl})`);

          let svgElement = $(result).siblings('svg')[0];
          svgElement = svgElement ? svgElement : $(result);

          const height = Number.parseFloat($(svgElement).attr('height'));
          const width = Number.parseFloat($(svgElement).attr('width'));
          if (!$(svgElement).attr('viewBox')) {
            $(svgElement).attr('viewBox', `0 0 ${width} ${height}`);
          }

          $(svgElement)
            .attr('id', svgElementInfo.svgElement.id)
            .attr('preserveAspectRatio', 'xMinYMin meet')
            .attr('height', svgElementInfo.originalBBox.height)
            .attr('width', svgElementInfo.originalBBox.width)
            .attr('x', svgElementInfo.originalBBox.x)
            .attr('y', svgElementInfo.originalBBox.y);

          $(svgElement).find('*').append(document.createElementNS('http://www.w3.org/2000/svg', 'title'))
            .off('click')
            .on('click', this.onEntityClick.bind({ instance: this, svgElementInfo: svgElementInfo, entityId: entityId, rule: rule }))
            .css('cursor', 'pointer')
            .addClass('ha-entity');

          svgElementInfo.svgElement = this.replaceElement(svgElementInfo.svgElement, svgElement);

          return Promise.resolve(svgElement);
        })
    }

    replaceElement(prevousSvgElement, svgElement) {
      const $parent = $(prevousSvgElement).parent();

      $(prevousSvgElement).find('*')
        .off('click');

      $(prevousSvgElement)
        .off('click')
        .remove();

      $parent.append(svgElement);

      return svgElement;
    }

    /***************************************************************************************************************************/
    /* Initialization
    /***************************************************************************************************************************/

    initTimeDifference() {
      this.hass.connection.socket.addEventListener('message', event => {
        const data = JSON.parse(event.data);

        // Store the time difference between the local web browser and the Home Assistant server
        if (data.event && data.event.time_fired) {
          const lastEventFiredTime = new Date(data.event.time_fired);
          const currentDateTime = new Date();
          this.timeDifferenceMs = currentDateTime.getTime() - lastEventFiredTime.getTime();

          this.logDebug('SYSTEM', `Client is ${(this.timeDifferenceMs >= 0) ? 'ahead of' : 'behind'} server by ${Math.abs(this.timeDifferenceMs)} miliseconds`);
        }
      });
    }

    initFullyKiosk() {
      if (this.isOptionEnabled(this.config.fully_kiosk)) {
        this.fullyKiosk = new FullyKiosk(this);
        this.fullyKiosk.init();
      }
    }

    initPageDisplay() {
      if (this.config.pages) {
        Object.keys(this.pageInfos).map(key => {
          const pageInfo = this.pageInfos[key];

          $(pageInfo.svg).css('opacity', 1);
          $(pageInfo.svg).css('display', pageInfo.isMaster || pageInfo.isDefault ? 'initial' : 'none'); // Show the first page
        });
      }
      else {
        // Show the SVG
        $(this.config.svg).css('opacity', 1);
        $(this.config.svg).css('display', 'initial');
      }
    }

    initVariables() {
      if (this.config.variables) {
        for (let variable of this.config.variables) {
          this.initVariable(variable);
        }
      }

      if (this.config.pages) {
        for (let key of Object.keys(this.pageInfos)) {
          const pageInfo = this.pageInfos[key];

          if (pageInfo.config.variables) {
            for (let variable of pageInfo.config.variables) {
              this.initVariable(variable);
            }
          }
        }
      }
    }

    initVariable(variable) {
      let variableName;
      let value;

      if (typeof variable === 'string') {
        variableName = variable;
      }
      else {
        variableName = variable.name;

        value = variable.value;
        if (variable.value_template) {
          value = this.evaluate(variable.value_template, variableName, undefined);
        }
      }

      if (!this.entityInfos[variableName]) {
        let entityInfo = { entityId: variableName, ruleInfos: [], lastState: undefined };
        this.entityInfos[variableName] = entityInfo;
      }

      if (!this.hass.states[variableName]) {
        this.hass.states[variableName] = {
          entity_id: variableName,
          state: value,
          last_changed: new Date(),
          attributes: [],
        };
      }

      this.setVariable(variableName, value, [], true);
    }

    initStartupActions() {
      let actions = [];

      const startup = this.config.startup;
      if (startup && startup.action) {
        actions = actions.concat(Array.isArray(startup.action) ? startup.action : [startup.action]);
      }

      if (this.config.pages) {
        for (let key of Object.keys(this.pageInfos)) {
          const pageInfo = this.pageInfos[key];

          const startup = pageInfo.config.startup;
          if (startup && startup.action) {
            actions = actions.concat(Array.isArray(startup.action) ? startup.action : [startup.action]);
          }
        }
      }

      for (let action of actions) {
        if (action.service || action.service_template) {
          const actionService = this.getActionService(action, undefined, undefined);

          switch (this.getDomain(actionService)) {
            case 'floorplan':
              this.callFloorplanService(action, undefined, undefined);
              break;

            default:
              this.callHomeAssistantService(action, undefined, undefined);
              break;
          }
        }
      }
    }

    /***************************************************************************************************************************/
    /* SVG initialization
    /***************************************************************************************************************************/

    initFloorplan(svg, config) {
      if (!config.rules) {
        return Promise.resolve();;
      }

      const svgElements = $(svg).find('*').toArray();

      this.initLastMotion(config, svg, svgElements);
      this.initRules(config, svg, svgElements);

      return Promise.resolve();;
    }

    initLastMotion(config, svg, svgElements) {
      // Add the last motion entity if required
      if (config.last_motion && config.last_motion.entity && config.last_motion.class) {
        this.lastMotionConfig = config.last_motion;

        const entityInfo = { entityId: config.last_motion.entity, ruleInfos: [], lastState: undefined };
        this.entityInfos[config.last_motion.entity] = entityInfo;
      }
    }

    initRules(config, svg, svgElements) {
      // Apply default options to rules that don't override the options explictly
      if (config.defaults) {
        for (let rule of config.rules) {
          rule.hover_over = (rule.hover_over === undefined) ? config.defaults.hover_over : rule.hover_over;
          rule.more_info = (rule.more_info === undefined) ? config.defaults.more_info : rule.more_info;
          rule.propagate = (rule.propagate === undefined) ? config.defaults.propagate : rule.propagate;
        }
      }

      for (let rule of config.rules) {
        if (rule.entity || rule.entities) {
          this.initEntityRule(rule, svg, svgElements);
        }
        else if (rule.element || rule.elements) {
          this.initElementRule(rule, svg, svgElements);
        }
      }
    }

    initEntityRule(rule, svg, svgElements) {
      const entities = this.initGetEntityRuleEntities(rule);
      for (let entity of entities) {
        const entityId = entity.entityId;
        const elementId = entity.elementId;

        let entityInfo = this.entityInfos[entityId];
        if (!entityInfo) {
          entityInfo = { entityId: entityId, ruleInfos: [], lastState: undefined };
          this.entityInfos[entityId] = entityInfo;
        }

        const ruleInfo = { rule: rule, svgElementInfos: {}, };
        entityInfo.ruleInfos.push(ruleInfo);

        const svgElement = svgElements.find(svgElement => svgElement.id === elementId);
        if (!svgElement) {
          this.logWarning('CONFIG', `Cannot find element '${elementId}' in SVG file`);
          continue;
        }

        const svgElementInfo = this.addSvgElementToRule(svg, svgElement, ruleInfo);

        const $svgElement = $(svgElementInfo.svgElement);
        if ($svgElement.length) {
          svgElementInfo.svgElement = $svgElement[0];

          // Create a title element (to support hover over text)
          $svgElement.append(document.createElementNS('http://www.w3.org/2000/svg', 'title'));

          if (ruleInfo.rule.action || (ruleInfo.rule.more_info !== false)) {
            $svgElement.off('click').on('click', this.onEntityClick.bind({ instance: this, svgElementInfo: svgElementInfo, entityId: entityId, rule: ruleInfo.rule }));
            $svgElement.css('cursor', 'pointer');
          }
          $svgElement.addClass('ha-entity');

          /*
          if ($svgElement.is('text') && ($svgElement[0].id === elementId)) {
            const backgroundSvgElement = svgElements.find(svgElement => svgElement.id === ($svgElement[0].id + '.background'));
            if (!backgroundSvgElement) {
              this.addBackgroundRectToText(svgElementInfo);
            }
            else {
              svgElementInfo.alreadyHadBackground = true;
              $(backgroundSvgElement).css('fill-opacity', 0);
            }
          }
          */
        }
      }
    }

    initGetEntityRuleEntities(rule) {
      const targetEntities = [];

      // Split out HA entity groups into separate entities
      if (rule.groups) {
        for (let entityId of rule.groups) {
          const group = this.hass.states[entityId];
          if (group) {
            for (let entityId of group.attributes.entity_id) {
              targetEntities.push({ entityId: entityId, elementId: entityId });
            }
          }
          else {
            this.logWarning('CONFIG', `Cannot find '${entityId}' in Home Assistant groups`);
          }
        }
      }

      // HA entity treated as is
      if (rule.entity) {
        rule.entities = [rule.entity];
      }

      // HA entities treated as is
      if (rule.entities) {
        const entityIds = rule.entities.filter(x => (typeof x === 'string'));
        for (let entityId of entityIds) {
          const entity = this.hass.states[entityId];
          const isFloorplanVariable = (entityId.split('.')[0] === 'floorplan');

          if (entity || isFloorplanVariable) {
            const elementId = rule.element ? rule.element : entityId;
            targetEntities.push({ entityId: entityId, elementId: elementId });
          }
          else {
            this.logWarning('CONFIG', `Cannot find '${entityId}' in Home Assistant entities`);
          }
        }

        const entityObjects = rule.entities.filter(x => (typeof x !== 'string'));
        for (let entityObject of entityObjects) {
          const entity = this.hass.states[entityObject.entity];
          const isFloorplanVariable = (entityObject.entity.split('.')[0] === 'floorplan');

          if (entity || isFloorplanVariable) {
            targetEntities.push({ entityId: entityObject.entity, elementId: entityObject.element });
          }
          else {
            this.logWarning('CONFIG', `Cannot find '${entityObject.entity}' in Home Assistant entities`);
          }
        }
      }

      return targetEntities;
    }

    initElementRule(rule, svg, svgElements) {
      if (rule.element) {
        rule.elements = [rule.element];
      }

      for (let elementId of rule.elements) {
        const svgElement = svgElements.find(svgElement => svgElement.id === elementId);
        if (svgElement) {
          let elementInfo = this.elementInfos[elementId];
          if (!elementInfo) {
            elementInfo = { ruleInfos: [], lastState: undefined };
            this.elementInfos[elementId] = elementInfo;
          }

          const ruleInfo = { rule: rule, svgElementInfos: {}, };
          elementInfo.ruleInfos.push(ruleInfo);

          const svgElementInfo = this.addSvgElementToRule(svg, svgElement, ruleInfo);

          const $svgElement = $(svgElementInfo.svgElement);

          $svgElement.off('click').on('click', this.onElementClick.bind({ instance: this, svgElementInfo: svgElementInfo, elementId: elementId, rule: rule }));
          $svgElement.css('cursor', 'pointer');

          /*
          if ($svgElement.is('text') && ($svgElement[0].id === elementId)) {
            const backgroundSvgElement = svgElements.find(svgElement => svgElement.id === ($svgElement[0].id + '.background'));
            if (!backgroundSvgElement) {
              this.addBackgroundRectToText(svgElementInfo);
            }
            else {
              svgElementInfo.alreadyHadBackground = true;
              $(backgroundSvgElement).css('fill-opacity', 0);
            }
          }
          */

          const actions = Array.isArray(rule.action) ? rule.action : [rule.action];
          for (let action of actions) {
            if (action) {
              switch (action.service) {
                case 'toggle':
                  for (let otherElementId of action.data.elements) {
                    const otherSvgElement = svgElements.find(svgElement => svgElement.id === otherElementId);
                    $(otherSvgElement).addClass(action.data.default_class);
                  }
                  break;

                default:
                  break;
              }
            }
          }
        }
        else {
          this.logWarning('CONFIG', `Cannot find '${elementId}' in SVG file`);
        }
      }
    }

    addBackgroundRectToText(svgElementInfo) {
      const svgElement = svgElementInfo.svgElement;

      const bbox = svgElement.getBBox();

      const rect = $(document.createElementNS('http://www.w3.org/2000/svg', 'rect'))
        .attr('id', svgElement.id + '.background')
        .attr('height', bbox.height + 1)
        .attr('width', bbox.width + 2)
        .attr('x', bbox.x - 1)
        .attr('y', bbox.y - 0.5)
        .css('fill-opacity', 0);

      $(rect).insertBefore(svgElement);
    }

    addSvgElementToRule(svg, svgElement, ruleInfo) {
      const svgElementInfo = {
        entityId: svgElement.id,
        svg: svg,
        svgElement: svgElement,
        originalSvgElement: svgElement,
        originalStroke: svgElement.style.stroke,
        originalFill: svgElement.style.fill,
        originalClasses: this.getArray(svgElement.classList),
        originalBBox: svgElement.getBBox(),
        originalClientRect: svgElement.getBoundingClientRect(),
      };
      ruleInfo.svgElementInfos[svgElement.id] = svgElementInfo;

      //      this.addNestedSvgElementsToRule(svgElement, ruleInfo);

      return svgElementInfo;
    }

    addNestedSvgElementsToRule(svgElement, ruleInfo) {
      $(svgElement).find('*').each((i, svgNestedElement) => {
        ruleInfo.svgElementInfos[svgNestedElement.id] = {
          entityId: svgElement.id,
          svgElement: svgNestedElement,
          originalSvgElement: svgNestedElement,
          originalStroke: svgNestedElement.style.stroke,
          originalFill: svgNestedElement.style.fill,
          originalClasses: this.getArray(svgNestedElement.classList),
          //originalBBox: svgNestedElement.getBBox(),
          //originalClientRect: svgNestedElement.getBoundingClientRect(),
        };
      });
    }

    createImageElement(svgElement) {
      return $(document.createElementNS('http://www.w3.org/2000/svg', 'image'))
        .attr('id', $(svgElement).attr('id'))
        .attr('x', $(svgElement).attr('x'))
        .attr('y', $(svgElement).attr('y'))
        .attr('height', $(svgElement).attr('height'))
        .attr('width', $(svgElement).attr('width'))[0];
      /*
              return $('object')
                .attr('type', $(svgElement).attr('image/svg+xml'))
                .attr('id', $(svgElement).attr('id'))
                .attr('x', $(svgElement).attr('x'))
                .attr('y', $(svgElement).attr('y'))
                .attr('height', $(svgElement).attr('height'))
                .attr('width', $(svgElement).attr('width'))[0];
                */
    }

    addClasses(entityId, svgElement, classes, propagate) {
      if (!classes || !classes.length) return;

      for (let className of classes) {
        if ($(svgElement).hasClass('ha-leave-me-alone')) return;

        if (!$(svgElement).hasClass(className)) {
          this.logDebug('CLASS', `${entityId} (adding class: ${className})`);
          $(svgElement).addClass(className);

          if ($(svgElement).is('text')) {
            /*
            $(svgElement).parent().find(`[id="${entityId}.background"]`).each((i, rectElement) => {
              if (!$(rectElement).hasClass(className + '-background')) {
                $(rectElement).addClass(className + '-background');
              }
            });
            */
          }
        }

        if (propagate || (propagate === undefined)) {
          $(svgElement).find('*').each((i, svgNestedElement) => {
            if (!$(svgNestedElement).hasClass('ha-leave-me-alone')) {
              if (!$(svgNestedElement).hasClass(className)) {
                $(svgNestedElement).addClass(className);
              }
            }
          });
        }
      }
    }

    removeClasses(entityId, svgElement, classes, propagate) {
      if (!classes || !classes.length) return;

      for (let className of classes) {
        if ($(svgElement).hasClass(className)) {
          this.logDebug('CLASS', `${entityId} (removing class: ${className})`);
          $(svgElement).removeClass(className);

          /*
          if ($(svgElement).is('text')) {
            $(svgElement).parent().find(`[id="${entityId}.background"]`).each((i, rectElement) => {
              if ($(rectElement).hasClass(className + '-background')) {
                $(rectElement).removeClass(className + '-background');
              }
            });
          }
          */

          if (propagate || (propagate === undefined)) {
            $(svgElement).find('*').each((i, svgNestedElement) => {
              if ($(svgNestedElement).hasClass(className)) {
                $(svgNestedElement).removeClass(className);
              }
            });
          }
        }
      }
    }

    setEntityStyle(svgElementInfo, svgElement, entityInfo, ruleInfo) {
      const stateConfig = ruleInfo.rule.states.find(stateConfig => (stateConfig.state === entityInfo.lastState.state));
      if (stateConfig) {
        const stroke = this.getStroke(stateConfig);
        if (stroke) {
          svgElement.style.stroke = stroke;
        }
        else {
          if (svgElementInfo.originalStroke) {
            svgElement.style.stroke = svgElementInfo.originalStroke;
          }
          else {
            // ???
          }
        }

        const fill = this.getFill(stateConfig);
        if (fill) {
          svgElement.style.fill = fill;
        }
        else {
          if (svgElementInfo.originalFill) {
            svgElement.style.fill = svgElementInfo.originalFill;
          }
          else {
            // ???
          }
        }
      }
    }

    /***************************************************************************************************************************/
    /* Entity handling (when states change)
    /***************************************************************************************************************************/

    handleEntities(isInitialLoad) {
      this.handleElements(isInitialLoad);

      let changedEntityIds = this.getChangedEntities(isInitialLoad);
      changedEntityIds = changedEntityIds.concat(Object.keys(this.variables)); // always assume variables need updating

      if (changedEntityIds && changedEntityIds.length) {
        const promises = changedEntityIds.map(entityId => this.handleEntity(entityId, isInitialLoad));
        return Promise.all(promises)
          .then(() => {
            return Promise.resolve(changedEntityIds);
          });
      }
      else {
        return Promise.resolve();
      }
    }

    getChangedEntities(isInitialLoad) {
      const changedEntityIds = [];

      const entityIds = Object.keys(this.hass.states);

      let lastMotionEntityInfo, oldLastMotionState, newLastMotionState;

      if (this.lastMotionConfig) {
        lastMotionEntityInfo = this.entityInfos[this.lastMotionConfig.entity];
        if (lastMotionEntityInfo && lastMotionEntityInfo.lastState) {
          oldLastMotionState = lastMotionEntityInfo.lastState.state;
          newLastMotionState = this.hass.states[this.lastMotionConfig.entity].state;
        }
      }

      for (let entityId of entityIds) {
        const entityInfo = this.entityInfos[entityId];
        if (entityInfo) {
          const entityState = this.hass.states[entityId];

          if (isInitialLoad) {
            this.logDebug('STATE', `${entityId}: ${entityState.state} (initial load)`);
            if (changedEntityIds.indexOf(entityId) < 0) {
              changedEntityIds.push(entityId);
            }
          }
          else if (entityInfo.lastState) {
            const oldState = entityInfo.lastState.state;
            const newState = entityState.state;

            if (entityState.last_changed !== entityInfo.lastState.last_changed) {
              this.logDebug('STATE', `${entityId}: ${newState} (last changed ${this.formatDate(entityInfo.lastState.last_changed)})`);
              if (changedEntityIds.indexOf(entityId) < 0) {
                changedEntityIds.push(entityId);
              }
            }
            else {
              if (!this.equal(entityInfo.lastState.attributes, entityState.attributes)) {
                this.logDebug('STATE', `${entityId}: attributes (last updated ${this.formatDate(entityInfo.lastState.last_changed)})`);
                if (changedEntityIds.indexOf(entityId) < 0) {
                  changedEntityIds.push(entityId);
                }
              }
            }

            if (this.lastMotionConfig) {
              if ((newLastMotionState !== oldLastMotionState) && (entityId.indexOf('binary_sensor') >= 0)) {
                const friendlyName = entityState.attributes.friendly_name;

                if (friendlyName === newLastMotionState) {
                  this.logDebug('LAST_MOTION', `${entityId} (new)`);
                  if (changedEntityIds.indexOf(entityId) < 0) {
                    changedEntityIds.push(entityId);
                  }
                }
                else if (friendlyName === oldLastMotionState) {
                  this.logDebug('LAST_MOTION', `${entityId} (old)`);
                  if (changedEntityIds.indexOf(entityId) < 0) {
                    changedEntityIds.push(entityId);
                  }
                }
              }
            }
          }
        }
      }

      return changedEntityIds;
    }

    handleEntity(entityId, isInitialLoad) {
      const entityState = this.hass.states[entityId];
      const entityInfo = this.entityInfos[entityId];

      if (!entityInfo) return Promise.resolve();

      entityInfo.lastState = Object.assign({}, entityState);

      return this.handleEntityUpdateDom(entityInfo)
        .then(() => {
          this.handleEntityUpdateCss(entityInfo, isInitialLoad);
          this.handleEntityUpdateLastMotionCss(entityInfo);
          this.handleEntitySetHoverOver(entityInfo);

          return Promise.resolve();
        });
    }

    handleEntityUpdateDom(entityInfo) {
      const promises = [];

      const entityId = entityInfo.entityId;
      const entityState = this.hass.states[entityId];

      for (let ruleInfo of entityInfo.ruleInfos) {
        for (let svgElementId in ruleInfo.svgElementInfos) {
          const svgElementInfo = ruleInfo.svgElementInfos[svgElementId];

          if ($(svgElementInfo.svgElement).is('text')) {
            this.handleEntityUpdateText(entityId, ruleInfo, svgElementInfo);
          }
          else if (ruleInfo.rule.image || ruleInfo.rule.image_template) {
            promises.push(this.handleEntityUpdateImage(entityId, ruleInfo, svgElementInfo));
          }
        }
      }

      return promises.length ? Promise.all(promises) : Promise.resolve();
    }

    handleElements(isInitialLoad) {
      const promises = [];

      Object.keys(this.elementInfos).map(key => {
        const elementInfo = this.elementInfos[key];
        const promise = this.handleElementUpdateDom(elementInfo)
          .then(() => {
            return this.handleElementUpdateCss(elementInfo, isInitialLoad);
          });

        promises.push(promise);
      });

      return promises.length ? Promise.all(promises) : Promise.resolve();
    }

    handleElementUpdateDom(elementInfo) {
      const promises = [];

      for (let ruleInfo of elementInfo.ruleInfos) {
        for (let svgElementId in ruleInfo.svgElementInfos) {
          const svgElementInfo = ruleInfo.svgElementInfos[svgElementId];

          if ($(svgElementInfo.svgElement).is('text')) {
            this.handleEntityUpdateText(svgElementId, ruleInfo, svgElementInfo);
          }
          else if (ruleInfo.rule.image || ruleInfo.rule.image_template) {
            promises.push(this.handleEntityUpdateImage(svgElementId, ruleInfo, svgElementInfo));
          }
        }
      }

      return promises.length ? Promise.all(promises) : Promise.resolve();
    }

    handleEntityUpdateText(entityId, ruleInfo, svgElementInfo) {
      const svgElement = svgElementInfo.svgElement;
      const state = this.hass.states[entityId] ? this.hass.states[entityId].state : undefined;

      const text = ruleInfo.rule.text_template ? this.evaluate(ruleInfo.rule.text_template, entityId, svgElement) : state;

      const tspan = $(svgElement).find('tspan');
      if (tspan.length) {
        $(tspan).text(text);
      }
      else {
        const title = $(svgElement).find('title');
        $(svgElement).text(text);
        if (title.length) {
          $(svgElement).append(title);
        }
      }

      /*
      if (!svgElementInfo.alreadyHadBackground) {
        const rect = $(svgElement).parent().find(`[id="${entityId}.background"]`);
        if (rect.length) {
          if ($(svgElement).css('display') != 'none') {
            const parentSvg = $(svgElement).parents('svg').eq(0);
            if ($(parentSvg).css('display') !== 'none') {
              const bbox = svgElement.getBBox();
              $(rect)
                .attr('x', bbox.x - 1)
                .attr('y', bbox.y - 0.5)
                .attr('height', bbox.height + 1)
                .attr('width', bbox.width + 2)
                .height(bbox.height + 1)
                .width(bbox.width + 2);
            }
          }
        }
      }
      */
    }

    handleEntityUpdateImage(entityId, ruleInfo, svgElementInfo) {
      const svgElement = svgElementInfo.svgElement;

      const imageUrl = ruleInfo.rule.image ? ruleInfo.rule.image : this.evaluate(ruleInfo.rule.image_template, entityId, svgElement);

      if (imageUrl && (ruleInfo.imageUrl !== imageUrl)) {
        ruleInfo.imageUrl = imageUrl;

        if (ruleInfo.imageLoader) {
          clearInterval(ruleInfo.imageLoader); // cancel any previous image loading for this rule
        }

        if (ruleInfo.rule.image_refresh_interval) {
          const refreshInterval = parseInt(ruleInfo.rule.image_refresh_interval);

          ruleInfo.imageLoader = setInterval((imageUrl, svgElement) => {
            this.loadImage(imageUrl, svgElementInfo, entityId, ruleInfo.rule)
              .catch(error => {
                this.handleError(error);
              });
          }, refreshInterval * 1000, imageUrl, svgElement);
        }

        return this.loadImage(imageUrl, svgElementInfo, entityId, ruleInfo.rule)
          .catch(error => {
            this.handleError(error);
          });
      }
      else {
        return Promise.resolve();
      }
    }

    handleEntitySetHoverOver(entityInfo) {
      const entityId = entityInfo.entityId;
      const entityState = this.hass.states[entityId];

      for (let ruleInfo of entityInfo.ruleInfos) {
        if (ruleInfo.rule.hover_over !== false) {
          for (let svgElementId in ruleInfo.svgElementInfos) {
            const svgElementInfo = ruleInfo.svgElementInfos[svgElementId];

            this.handlEntitySetHoverOverText(svgElementInfo.svgElement, entityState);
          }
        }
      }
    }

    handlEntitySetHoverOverText(element, entityState) {
      const dateFormat = this.config.date_format ? this.config.date_format : 'DD-MMM-YYYY';

      $(element).find('title').each((i, titleElement) => {
        const lastChangedElapsed = (new Date()).getTime() - new Date(entityState.last_changed);
        const lastChangedDate = this.formatDate(entityState.last_changed);

        const lastUpdatedElapsed = (new Date()).getTime() - new Date(entityState.last_updated);
        const lastUpdatedDate = this.formatDate(entityState.last_updated);

        let titleText = `${entityState.attributes.friendly_name}\n`;
        titleText += `State: ${entityState.state}\n\n`;

        Object.keys(entityState.attributes).map(key => {
          titleText += `${key}: ${entityState.attributes[key]}\n`;
        });
        titleText += '\n';

        titleText += `Last changed: ${lastChangedDate}\n`;
        titleText += `Last updated: ${lastUpdatedDate}`;

        $(titleElement).html(titleText);
      });
    }

    handleElementUpdateCss(elementInfo, isInitialLoad) {
      if (!this.cssRules || !this.cssRules.length) return;

      for (let ruleInfo of elementInfo.ruleInfos) {
        for (let svgElementId in ruleInfo.svgElementInfos) {
          const svgElementInfo = ruleInfo.svgElementInfos[svgElementId];

          this.handleUpdateElementCss(svgElementInfo, ruleInfo);
        }
      }
    }

    handleEntityUpdateCss(entityInfo, isInitialLoad) {
      if (!this.cssRules || !this.cssRules.length) return;

      for (let ruleInfo of entityInfo.ruleInfos) {
        for (let svgElementId in ruleInfo.svgElementInfos) {
          const svgElementInfo = ruleInfo.svgElementInfos[svgElementId];

          if (svgElementInfo.svgElement) { // images may not have been updated yet
            this.handleUpdateCss(entityInfo, svgElementInfo, ruleInfo);
          }
        }
      }
    }

    getStateConfigClasses(stateConfig) { // support class: or classes:
      if (!stateConfig) return [];
      if (Array.isArray(stateConfig.class)) return stateConfig.class;
      if (typeof stateConfig.class === "string") return stateConfig.class.split(" ").map(x => x.trim());
      if (Array.isArray(stateConfig.classes)) return stateConfig.classes;
      if (typeof stateConfig.classes === "string") return stateConfig.classes.split(" ").map(x => x.trim());
      return [];
    }

    handleUpdateCss(entityInfo, svgElementInfo, ruleInfo) {
      const entityId = entityInfo.entityId;
      const svgElement = svgElementInfo.svgElement;

      let targetClasses = [];
      const obsoleteClasses = [];

      if (ruleInfo.rule.class_template) {
        targetClasses = this.evaluate(ruleInfo.rule.class_template, entityId, svgElement).split(" ");
      }

      // Get the config for the current state
      if (ruleInfo.rule.states) {
        const entityState = this.hass.states[entityId];

        const stateConfig = ruleInfo.rule.states.find(stateConfig => (stateConfig.state === entityState.state));
        targetClasses = this.getStateConfigClasses(stateConfig);

        // Remove any other previously-added state classes
        for (let otherStateConfig of ruleInfo.rule.states) {
          if (!stateConfig || (otherStateConfig.state !== stateConfig.state)) {
            const otherStateClasses = this.getStateConfigClasses(otherStateConfig);
            for (let otherStateClass of otherStateClasses) {
              if (otherStateClass && (targetClasses.indexOf(otherStateClass) < 0) && (otherStateClass !== 'ha-entity') && $(svgElement).hasClass(otherStateClass) && (svgElementInfo.originalClasses.indexOf(otherStateClass) < 0)) {
                obsoleteClasses.push(otherStateClass);
              }
            }
          }
        }
      }
      else {
        if (svgElement.classList) {
          for (let otherClass of this.getArray(svgElement.classList)) {
            if ((targetClasses.indexOf(otherClass) < 0) && (otherClass !== 'ha-entity') && $(svgElement).hasClass(otherClass) && (svgElementInfo.originalClasses.indexOf(otherClass) < 0)) {
              obsoleteClasses.push(otherClass);
            }
          }
        }
      }

      // Remove any obsolete classes from the entity
      //this.logDebug(`${entityId}: Removing obsolete classes: ${obsoleteClasses.join(', ')}`);
      this.removeClasses(entityId, svgElement, obsoleteClasses, ruleInfo.rule.propagate);

      // Add the target classes to the entity
      this.addClasses(entityId, svgElement, targetClasses, ruleInfo.rule.propagate);
    }

    handleUpdateElementCss(svgElementInfo, ruleInfo) {
      const entityId = svgElementInfo.entityId;
      const svgElement = svgElementInfo.svgElement;

      let targetClasses = undefined;
      if (ruleInfo.rule.class_template) {
        targetClasses = this.evaluate(ruleInfo.rule.class_template, entityId, svgElement).split(" ");
      }

      const obsoleteClasses = [];
      for (let otherClass of this.getArray(svgElement.classList)) {
        if ((targetClasses.indexOf(otherClass) < 0) && (otherClass !== 'ha-entity') && $(svgElement).hasClass(otherClass) && (svgElementInfo.originalClasses.indexOf(otherClass) < 0)) {
          obsoleteClasses.push(otherClass);
        }
      }

      // Remove any obsolete classes from the entity
      this.removeClasses(entityId, svgElement, obsoleteClasses, ruleInfo.rule.propagate);

      // Add the target class to the entity
      this.addClasses(entityId, svgElement, targetClasses, ruleInfo.rule.propagate);
    }

    handleEntityUpdateLastMotionCss(entityInfo) {
      if (!this.lastMotionConfig || !this.cssRules || !this.cssRules.length) return;

      const entityId = entityInfo.entityId;
      const entityState = this.hass.states[entityId];

      if (!entityState) return;

      for (let ruleInfo of entityInfo.ruleInfos) {
        for (let svgElementId in ruleInfo.svgElementInfos) {
          const svgElementInfo = ruleInfo.svgElementInfos[svgElementId];
          const svgElement = svgElementInfo.svgElement;

          const stateConfigClasses = this.getStateConfigClasses(this.lastMotionConfig);

          if (this.hass.states[this.lastMotionConfig.entity] &&
            (entityState.attributes.friendly_name === this.hass.states[this.lastMotionConfig.entity].state)) {
            //this.logDebug(`${entityId}: Adding last motion class '${this.lastMotionConfig.class}'`);
            this.addClasses(entityId, svgElement, stateConfigClasses, ruleInfo.propagate);
          }
          else {
            //this.logDebug(`${entityId}: Removing last motion class '${this.lastMotionConfig.class}'`);
            this.removeClasses(entityId, svgElement, stateConfigClasses, ruleInfo.propagate);
          }
        }
      }
    }

    /***************************************************************************************************************************/
    /* Floorplan helper functions
    /***************************************************************************************************************************/

    isOptionEnabled(option) {
      return ((option === null) || (option !== undefined));
    }

    isLastMotionEnabled() {
      return this.lastMotionConfig && this.config.last_motion.entity && this.config.last_motion.class;
    }

    validateConfig(config) {
      let isValid = true;

      if (!config.pages && !config.rules) {
        this.setIsLoading(false);
        this.logError('CONFIG', `Cannot find 'pages' nor 'rules' in floorplan configuration`);
        isValid = false;
      }
      else {
        if (config.pages) {
          if (!config.pages.length) {
            this.logError('CONFIG', `The 'pages' section must contain one or more pages in floorplan configuration`);
            isValid = false;
          }
        }
        else {
          if (!config.rules) {
            this.logError('CONFIG', `Cannot find 'rules' in floorplan configuration`);
            isValid = false;
          }

          let invalidRules = config.rules.filter(x => x.entities && x.elements);
          if (invalidRules.length) {
            this.logError('CONFIG', `A rule cannot contain both 'entities' and 'elements' in floorplan configuration`);
            isValid = false;
          }

          invalidRules = config.rules.filter(x => !(x.entity || x.entities) && !(x.element || x.elements));
          if (invalidRules.length) {
            this.logError('CONFIG', `A rule must contain either 'entities' or 'elements' in floorplan configuration`);
            isValid = false;
          }
        }
      }

      return isValid;
    }

    localToServerDate(localDate) {
      const serverDateMs = localDate.getTime() - this.timeDifferenceMs;
      return new Date(serverDateMs);
    }

    serverToLocalDate(serverDate) {
      const localDateMs = serverDate.getTime() + this.timeDifferenceMs;
      return new Date(localDateMs);
    }

    formatDate(date) {
      if (!date) return '';

      return (typeof date === 'string') ?
        new Date(date).toLocaleString() : date.toLocaleString();
    }

    evaluate(code, entityId, svgElement) {
      try {
        const entityState = this.hass.states[entityId];
        let functionBody = (code.indexOf('${') >= 0) ? `\`${code}\`;` : code;
        functionBody = (functionBody.indexOf('return') >= 0) ? functionBody : `return ${functionBody};`;
        const func = new Function('entity', 'entities', 'hass', 'config', 'element', functionBody);
        return func(entityState, this.hass.states, this.hass, this.config, svgElement);
      }
      catch (err) {
        //  this.logError('ERROR', entityId);
        //  this.logError('ERROR', err);
      }
    }

    /***************************************************************************************************************************/
    /* Event handlers
    /***************************************************************************************************************************/

    onElementClick(e) {
      e.stopPropagation();
      this.instance.onActionClick(this.svgElementInfo, this.elementId, this.elementId, this.rule);
    }

    onEntityClick(e) {
      e.stopPropagation();
      this.instance.onActionClick(this.svgElementInfo, this.entityId, this.elementId, this.rule);
    }

    onActionClick(svgElementInfo, entityId, elementId, rule) {
      let entityInfo = this.entityInfos[entityId];
      const actionRuleInfo = entityInfo && entityInfo.ruleInfos.find(ruleInfo => ruleInfo.rule.action);
      const actionRule = rule.action ? rule : (actionRuleInfo ? actionRuleInfo.rule : undefined);

      if (!rule || !actionRule) {
        if (entityId && (rule.more_info !== false)) {
          this.openMoreInfo(entityId);
        }
        return;
      }

      let calledServiceCount = 0;

      const svgElement = svgElementInfo.svgElement;

      const actions = Array.isArray(actionRule.action) ? actionRule.action : [actionRule.action];
      for (let action of actions) {
        if (action.service || action.service_template) {
          const actionService = this.getActionService(action, entityId, svgElement);

          switch (this.getDomain(actionService)) {
            case 'floorplan':
              this.callFloorplanService(action, entityId, svgElementInfo);
              break;

            default:
              this.callHomeAssistantService(action, entityId, svgElementInfo);
              break;
          }

          calledServiceCount++;
        }
      }

      if (!calledServiceCount) {
        if (entityId && (actionRule.more_info !== false)) {
          this.openMoreInfo(entityId);
        }
      }
    }

    callFloorplanService(action, entityId, svgElementInfo) {
      const svgElement = svgElementInfo ? svgElementInfo.svgElement : undefined;

      const actionService = this.getActionService(action, entityId, svgElement);
      const actionData = this.getActionData(action, entityId, svgElement);

      switch (this.getService(actionService)) {
        case 'class_toggle':
          if (actionData) {
            const classes = actionData.classes;

            for (let otherElementId of actionData.elements) {
              const otherSvgElement = $(svgElementInfo.svg).find(`[id="${otherElementId}"]`);

              if ($(otherSvgElement).hasClass(classes[0])) {
                $(otherSvgElement).removeClass(classes[0]);
                $(otherSvgElement).addClass(classes[1]);
              }
              else if ($(otherSvgElement).hasClass(classes[1])) {
                $(otherSvgElement).removeClass(classes[1]);
                $(otherSvgElement).addClass(classes[0]);
              }
              else {
                $(otherSvgElement).addClass(actionData.default_class);
              }
            }
          }
          break;

        case 'page_navigate':
          const page_id = actionData.page_id;
          const targetPageInfo = page_id && this.pageInfos[page_id];

          if (targetPageInfo) {
            Object.keys(this.pageInfos).map(key => {
              const pageInfo = this.pageInfos[key];

              if (!pageInfo.isMaster) {
                if ($(pageInfo.svg).css('display') !== 'none') {
                  $(pageInfo.svg).css('display', 'none');
                }
              }
            });

            $(targetPageInfo.svg).css('display', 'initial');
          }
          break;

        case 'variable_set':
          if (actionData.variable) {
            const attributes = [];

            if (actionData.attributes) {
              for (let attribute of actionData.attributes) {
                const attributeValue = this.getActionValue(attribute, entityId, svgElement);
                attributes.push({ name: attribute.attribute, value: attributeValue });
              }
            }

            const value = this.getActionValue(actionData, entityId, svgElement);
            this.setVariable(actionData.variable, value, attributes);
          }
          break;

        default:
          // Unknown floorplan service
          break;
      }
    }

    getActionValue(action, entityId, svgElement) {
      let value = action.value;
      if (action.value_template) {
        value = this.evaluate(action.value_template, entityId, svgElement);
      }
      return value;
    }

    setVariable(variableName, value, attributes, isInitialLoad) {
      this.variables[variableName] = value;

      if (this.hass.states[variableName]) {
        this.hass.states[variableName].state = value;

        for (let attribute of attributes) {
          this.hass.states[variableName].attributes[attribute.name] = attribute.value;
        }
      }

      for (let otherVariableName of Object.keys(this.variables)) {
        const otherVariable = this.hass.states[otherVariableName];
        if (otherVariable) {
          otherVariable.last_changed = new Date(); // mark all variables as changed
        }
      }

      // Simulate an event change to all entities
      if (!isInitialLoad) {
        this.handleEntitiesDebounced(); // use debounced wrapper
      }
    }

    /***************************************************************************************************************************/
    /* Home Assisant helper functions
    /***************************************************************************************************************************/

    callHomeAssistantService(action, entityId, svgElementInfo) {
      const svgElement = svgElementInfo ? svgElementInfo.svgElement : undefined;

      const actionService = this.getActionService(action, entityId, svgElement);
      const actionData = this.getActionData(action, entityId, svgElement);

      if (!actionData.entity_id && entityId) {
        actionData.entity_id = entityId;
      }

      this.hass.callService(this.getDomain(actionService), this.getService(actionService), actionData);
    }

    getActionData(action, entityId, svgElement) {
      let data = action.data ? action.data : {};
      if (action.data_template) {
        const result = this.evaluate(action.data_template, entityId, svgElement);
        data = (typeof result === 'string') ? JSON.parse(result) : result;
      }
      return data;
    }

    getActionService(action, entityId, svgElement) {
      let service = action.service;
      if (action.service_template) {
        service = this.evaluate(action.service_template, entityId, svgElement);
      }
      return service;
    }

    getDomain(actionService) {
      return actionService.split(".")[0];
    }

    getService(actionService) {
      return actionService.split(".")[1];
    }

    /***************************************************************************************************************************/
    /* Logging / error handling functions
    /***************************************************************************************************************************/

    handleWindowError(msg, url, lineNo, columnNo, error) {
      this.setIsLoading(false);

      if (msg.toLowerCase().indexOf("script error") >= 0) {
        this.logError('SCRIPT', 'Script error: See browser console for detail');
      }
      else {
        const message = [
          msg,
          'URL: ' + url,
          'Line: ' + lineNo + ', column: ' + columnNo,
          'Error: ' + JSON.stringify(error)
        ].join('<br>');

        this.logError('ERROR', message);
      }

      return false;
    }

    handleError(error) {
      let message = error;
      if (error.stack) {
        message = `${error.stack}`;
      }
      else if (error.message) {
        message = `${error.message}`;
      }

      this.log('error', message);
    }

    logError(area, message) {
      this.log('error', `${area} ${message}`);
    }

    logWarning(area, message) {
      this.log('warning', `${area} ${message}`);
    }

    logInfo(area, message) {
      this.log('info', `${area} ${message}`);
    }

    logDebug(area, message) {
      this.log('debug', `${area} ${message}`);
    }

    log(level, message) {
      const text = `${this.formatDate(new Date())} ${level.toUpperCase()} ${message}`;

      if (this.config && this.config.debug && (this.config.debug !== false)) {
        switch (level) {
          case 'error':
            console.error(text);
            break;

          case 'warning':
            console.warn(text);
            break;

          case 'error':
            console.info(text);
            break;

          default:
            console.log(text);
            break;
        }
      }

      const isTargetLogLevel = this.logLevels && this.logLevels.length && (this.logLevels.indexOf(level) >= 0);

      if ((!this.config && (level === 'error')) || isTargetLogLevel) {
        // Always log error messages that occur before the config has been loaded
        const log = $(this.root).find('#log');
        $(log).find('ul').prepend(`<li class="${level}">${text}</li>`)
        $(log).css('display', 'block');
      }
    }

    /***************************************************************************************************************************/
    /* CSS helper functions
    /***************************************************************************************************************************/

    getStroke(stateConfig) {
      let stroke = undefined;

      const stateConfigClasses = this.getStateConfigClasses(stateConfig);

      for (let cssRule of this.cssRules) {
        for (let stateConfigClass of stateConfigClasses) {
          if (cssRule.selectorText && cssRule.selectorText.indexOf(`.${stateConfigClass}`) >= 0) {
            if (cssRule.style && cssRule.style.stroke) {
              if (cssRule.style.stroke[0] === '#') {
                stroke = cssRule.style.stroke;
              }
              else {
                const rgb = cssRule.style.stroke.substring(4).slice(0, -1).split(',').map(x => parseInt(x));
                stroke = `#${rgb[0].toString(16)[0]}${rgb[1].toString(16)[0]}${rgb[2].toString(16)[0]}`;
              }
            }
            break;
          }
        }
      }

      return stroke;
    }

    getFill(stateConfig) {
      let fill = undefined;

      const stateConfigClasses = this.getStateConfigClasses(stateConfig);

      for (let cssRule of this.cssRules) {
        for (let stateConfigClass of stateConfigClasses) {
          if (cssRule.selectorText && cssRule.selectorText.indexOf(`.${stateConfigClass}`) >= 0) {
            if (cssRule.style && cssRule.style.fill) {
              if (cssRule.style.fill[0] === '#') {
                fill = cssRule.style.fill;
              }
              else {
                const rgb = cssRule.style.fill.substring(4).slice(0, -1).split(',').map(x => parseInt(x));
                fill = `#${rgb[0].toString(16)}${rgb[1].toString(16)}${rgb[2].toString(16)}`;
              }
            }

            break;
          }
        }
      }

      return fill;
    }

    /***************************************************************************************************************************/
    /* General helper functions
    /***************************************************************************************************************************/

    fetchTextResource(resourceUrl, useCache) {
      resourceUrl = this.cacheBuster(resourceUrl);
      useCache = false;

      return new Promise((resolve, reject) => {
        const request = new Request(resourceUrl, {
          cache: (useCache === true) ? 'reload' : 'no-cache',
        });

        fetch(request)
          .then((response) => {
            if (response.ok) {
              return response.text();
            }
            else {
              throw new Error(`Error fetching resource`);
            }
          })
          .then((result) => resolve(result))
          .catch((err) => {
            reject(new URIError(`${resourceUrl}: ${err.message}`));
          });
      });
    }

    fetchImageResource(resourceUrl, useCache) {
      resourceUrl = this.cacheBuster(resourceUrl);
      useCache = false;

      return new Promise((resolve, reject) => {
        const request = new Request(resourceUrl, {
          cache: (useCache === true) ? 'reload' : 'no-cache',
          headers: new Headers({ 'Content-Type': 'text/plain; charset=x-user-defined' }),
        });

        fetch(request)
          .then((response) => {
            if (response.ok) {
              return response.arrayBuffer();
            }
            else {
              throw new Error(`Error fetching resource`);
            }
          })
          .then((result) => resolve(`data:image/jpeg;base64,${this.arrayBufferToBase64(result)}`))
          .catch((err) => {
            reject(new URIError(`${resourceUrl}: ${err.message}`));
          });
      });
    }

    /***************************************************************************************************************************/
    /* Utility functions
    /***************************************************************************************************************************/

    getArray(list) {
      return Array.isArray(list) ? list : Object.keys(list).map(key => list[key]);
    }

    arrayBufferToBase64(buffer) {
      let binary = '';
      const bytes = [].slice.call(new Uint8Array(buffer));

      bytes.forEach((b) => binary += String.fromCharCode(b));

      let base64 = window.btoa(binary);

      // IOS / Safari will not render base64 images unless length is divisible by 4
      while ((base64.length % 4) > 0) {
        base64 += '=';
      }

      return base64;
    }

    cacheBuster(url) {
      return url;
      //return `${url}${(url.indexOf('?') >= 0) ? '&' : '?'}_=${new Date().getTime()}`;
    }

    debounce(func, wait, immediate) {
      let timeout;
      return function () {
        const context = this, args = arguments;

        const later = function () {
          timeout = null;
          if (!immediate) func.apply(context, args);
        };

        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);

        if (callNow) func.apply(context, args);
      };
    }

    equal(a, b) {
      if (a === b) return true;

      let arrA = Array.isArray(a)
        , arrB = Array.isArray(b)
        , i;

      if (arrA && arrB) {
        if (a.length != b.length) return false;
        for (i = 0; i < a.length; i++)
          if (!this.equal(a[i], b[i])) return false;
        return true;
      }

      if (arrA != arrB) return false;

      if (a && b && typeof a === 'object' && typeof b === 'object') {
        const keys = Object.keys(a);
        if (keys.length !== Object.keys(b).length) return false;

        const dateA = a instanceof Date
          , dateB = b instanceof Date;
        if (dateA && dateB) return a.getTime() == b.getTime();
        if (dateA != dateB) return false;

        const regexpA = a instanceof RegExp
          , regexpB = b instanceof RegExp;
        if (regexpA && regexpB) return a.toString() == b.toString();
        if (regexpA != regexpB) return false;

        for (i = 0; i < keys.length; i++)
          if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;

        for (i = 0; i < keys.length; i++)
          if (!this.equal(a[keys[i]], b[keys[i]])) return false;

        return true;
      }

      return false;
    }
  }

  window.Floorplan = Floorplan;
}).call(this);
