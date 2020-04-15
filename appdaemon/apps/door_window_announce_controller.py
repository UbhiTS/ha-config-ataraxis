import appdaemon.plugins.hass.hassapi as hass
from datetime import datetime, time
#
# Door Window Announce Controller App
#
# Args:
# door_window_announce:
#   module: door_window_announce_controller
#   class: DoorWindowAnnounceController
#   alexa: media_player.kitchen_alexa
#   doors_windows:
#     - cover.garage_door_big
#     - cover.garage_door_small

class DoorWindowAnnounceController(hass.Hass):

  def initialize(self):
    self.doors_windows = self.args["doors_windows"]
    self.alexa = self.args["alexa"]

    if self.doors_windows:
      for door_window_sensor in self.doors_windows:
        self.listen_state(self.door_window_open_announce, door_window_sensor)


  def door_window_open_announce(self, entity, attribute, old, new, kwargs):
    
    friendly_name = self.get_state(entity, attribute = "friendly_name")
    
    self.log("DOOR WINDOW ANNOUNCE: " + entity + " (" + old + " > " + new + ")")
    
    # if the HA has just rebooted, old state would be unavailable. In that case, do not announce!
    if old == "unavailable":
      return
    
    if new == "open" or new == "on":
      self.call_service("notify/alexa_media", data = {"type":"tts", "method":"all"}, target = self.alexa, message = "Your attention please. The " + friendly_name + " has been opened")
    if new == "closed" or new == "off":
      self.call_service("notify/alexa_media", data = {"type":"tts", "method":"all"}, target = self.alexa, message = "Your attention please. The " + friendly_name + " has been closed")
