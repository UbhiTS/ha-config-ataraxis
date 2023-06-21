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
    self.log('TV: SWITCHED ON')
    self.call_service("switch/turn_on", entity_id = self.tv_speaker_switch)
    

  def tv_switched_off(self, entity, attribute, old, new, kwargs):
    self.log('TV: SWITCHED OFF')
    self.call_service("switch/turn_off", entity_id = self.tv_speaker_switch)


#   def tv_energy_save_off(self):
#     self.run_sequence([
#       {"webostv/button": {"entity_id": self.tv, "button": "MENU"}},  {"sleep": 2},
#       {"webostv/button": {"entity_id": self.tv, "button": "UP"}},    {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 3},
#       {"webostv/button": {"entity_id": self.tv, "button": "RIGHT"}}, {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 2.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "EXIT"}}
#       ])
      
#   def tv_energy_save_min(self):
#     self.run_sequence([
#       {"webostv/button": {"entity_id": self.tv, "button": "MENU"}},  {"sleep": 2},
#       {"webostv/button": {"entity_id": self.tv, "button": "UP"}},    {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 3},
#       {"webostv/button": {"entity_id": self.tv, "button": "RIGHT"}}, {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 2.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "EXIT"}}
#       ])
  
#   def tv_energy_save_med(self):
#     self.run_sequence([
#       {"webostv/button": {"entity_id": self.tv, "button": "MENU"}},  {"sleep": 2},
#       {"webostv/button": {"entity_id": self.tv, "button": "UP"}},    {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 3},
#       {"webostv/button": {"entity_id": self.tv, "button": "RIGHT"}}, {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 2.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "EXIT"}}
#       ])
  
#   def tv_energy_save_max(self):
#     self.run_sequence([
#       {"webostv/button": {"entity_id": self.tv, "button": "MENU"}},  {"sleep": 2},
#       {"webostv/button": {"entity_id": self.tv, "button": "UP"}},    {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 3},
#       {"webostv/button": {"entity_id": self.tv, "button": "RIGHT"}}, {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 2.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "EXIT"}}
#       ])

#   def tv_energy_save_screen_off(self):
#     self.run_sequence([
#       {"webostv/button": {"entity_id": self.tv, "button": "MENU"}},  {"sleep": 2},
#       {"webostv/button": {"entity_id": self.tv, "button": "UP"}},    {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 3},
#       {"webostv/button": {"entity_id": self.tv, "button": "RIGHT"}}, {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 2.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
#       {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}
#       ])