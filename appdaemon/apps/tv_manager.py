import appdaemon.plugins.hass.hassapi as hass
from datetime import datetime, time

class TVManager(hass.Hass):

  def initialize(self):

    self.debug = True
    
    self.tv = self.args["tv"]
    self.tv_speaker_switch = self.args["tv_speaker_switch"]
    self.debug = bool(self.args["debug"]) if "debug" in self.args else self.debug
    
    self.listen_state(self.tv_switched_on, self.tv, attribute = "state", old = "off", new = "on")
    self.listen_state(self.tv_switched_off, self.tv, attribute = "state", old = "on", new = "off")


  def tv_switched_on(self, entity, attribute, old, new, kwargs):
    self.call_service("switch/turn_on", entity_id = self.tv_speaker_switch)
    

  def tv_switched_off(self, entity, attribute, old, new, kwargs):
    self.call_service("switch/turn_off", entity_id = self.tv_speaker_switch)
