import appdaemon.plugins.hass.hassapi as hass
from datetime import datetime, time
#
# iOS HA Companion Controller App
#
# Args:
# ios_ha_companion:
#   module: ios_ha_companion_controller
#   class: IOSHACompanionController

class IOSHACompanionController(hass.Hass):

  def initialize(self):
    
    self.listen_event(self.service_event, "ios.action_fired")


  def service_event(self, event_name, data, kwargs):
    if data["actionName"] == 'open_garage_big':
      self.log('IOS_COMPANION_OPEN_GARAGE_BIG')
      self.call_service("cover/open_cover", entity_id = 'cover.garage_door_big')
    if data["actionName"] == 'open_garage_small':
      self.log('IOS_COMPANION_OPEN_GARAGE_SMALL')
      self.call_service("cover/open_cover", entity_id = 'cover.garage_door_small')
    if data["actionName"] == 'close_garage_big':
      self.log('IOS_COMPANION_CLOSE_GARAGE_BIG')
      self.call_service("cover/close_cover", entity_id = 'cover.garage_door_big')
    if data["actionName"] == 'close_garage_small':
      self.log('IOS_COMPANION_CLOSE_GARAGE_SMALL')
      self.call_service("cover/close_cover", entity_id = 'cover.garage_door_small')
    if data["actionName"] == 'buzz_home':
      self.log('IOS_COMPANION_BUZZ_HOME')
      self.call_service("notify/alexa_media", data = {"type":"announce", "method":"all"}, target = 'media_player.kitchen_alexa', message = "Someone's calling you. Please pick up the phone or call them back immediately!")
      

