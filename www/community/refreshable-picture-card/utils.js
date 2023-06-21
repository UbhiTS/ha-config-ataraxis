// Common utilities functions shamelessly taken from lovelace-mushroom
// Copyright Paul Bottein
// https://github.com/piitaya/lovelace-mushroom

export function handleAction(node, hass, config, actionConfig) {
  switch (actionConfig.action) {
    case "more-info": {
      if (config.entity) {
        fireEvent(node, "hass-more-info", { entityId: config.entity });
      } else {
        showToast(node, {
          message: hass.localize(
            "ui.panel.lovelace.cards.actions.no_entity_more_info"
          ),
        });
        forwardHaptic("failure");
      }
      break;
    }
    case "navigate":
      if (actionConfig.navigation_path) {
        navigate(actionConfig.navigation_path);
      } else {
        showToast(node, {
          message: hass.localize(
            "ui.panel.lovelace.cards.actions.no_navigation_path"
          ),
        });
        forwardHaptic("failure");
      }
      break;
    case "url": {
      if (actionConfig.url_path) {
        window.open(actionConfig.url_path);
      } else {
        showToast(node, {
          message: hass.localize("ui.panel.lovelace.cards.actions.no_url"),
        });
        forwardHaptic("failure");
      }
      break;
    }
    case "toggle": {
      if (config.entity) {
        toggleEntity(hass, config.entity);
        forwardHaptic("light");
      } else {
        showToast(this, {
          message: hass.localize(
            "ui.panel.lovelace.cards.actions.no_entity_toggle"
          ),
        });
        forwardHaptic("failure");
      }
      break;
    }
    case "call-service": {
      if (!actionConfig.service) {
        showToast(node, {
          message: hass.localize("ui.panel.lovelace.cards.actions.no_service"),
        });
        forwardHaptic("failure");
        return;
      }
      const [domain, service] = actionConfig.service.split(".", 2);
      hass.callService(
        domain,
        service,
        actionConfig.data ?? actionConfig.service_data,
        actionConfig.target
      );
      forwardHaptic("light");
      break;
    }
    case "fire-dom-event": {
      fireEvent(node, "ll-custom", actionConfig);
    }
  }
}

const forwardHaptic = (hapticType) => fireEvent(window, "haptic", hapticType);

const showToast = (el, params) => fireEvent(el, "hass-notification", params);

export const fireEvent = (node, type, detail, options) => {
  options = options || {};
  const event = new Event(type, {
    bubbles: options.bubbles === undefined ? true : options.bubbles,
    cancelable: Boolean(options.cancelable),
    composed: options.composed === undefined ? true : options.composed,
  });
  event.detail = detail;
  node.dispatchEvent(event);
  return event;
};
