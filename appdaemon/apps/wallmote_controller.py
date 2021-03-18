import appdaemon.plugins.hass.hassapi as hass
from datetime import datetime, time
#
# WallMote Controller App
#
# Args:
# wallmote:
#   module: wallmote_controller
#   class: WallMoteController
#   alexa_master_bedroom: media_player.master_bedroom_alexa
#   alexa_master_bathroom: media_player.master_bathroom_alexa
#   alexa_living_room: media_player.living_room_alexa
#   alexa_kitchen: media_player.kitchen_alexa
#   alexa_upper_big_bedroom: media_player.upper_big_bedroom_alexa
#   alexa_upper_small_bedroom: media_player.upper_small_bedroom_alexa
#   alexa_upper_guest_bedroom: media_player.upper_guest_bedroom_alexa
#   doorbell: switch.living_room_doorbell

class WallMoteController(hass.Hass):

  def initialize(self):
    self.doorbell = self.args["doorbell"]
    self.alexa_master_bedroom = self.args["alexa_master_bedroom"]
    self.alexa_master_bathroom = self.args["alexa_master_bathroom"]
    self.alexa_living_room = self.args["alexa_living_room"]
    self.alexa_kitchen = self.args["alexa_kitchen"]
    self.alexa_upper_big_bedroom = self.args["alexa_upper_big_bedroom"]
    self.alexa_upper_small_bedroom = self.args["alexa_upper_small_bedroom"]
    self.alexa_upper_guest_bedroom = self.args["alexa_upper_guest_bedroom"]
    self.internet_switch = self.args["internet_switch"]
    self.tv = self.args["tv"]

    self.listen_event(self.button_one_single_tap, "zwave.scene_activated", entity_id = "zwave.wallmote_quad_01", scene_id = 1, scene_data = 0)
    self.listen_event(self.button_one_hold, "zwave.scene_activated", entity_id = "zwave.wallmote_quad_01", scene_id = 1, scene_data = 2)
    self.listen_event(self.button_one_release, "zwave.scene_activated", entity_id = "zwave.wallmote_quad_01", scene_id = 1, scene_data = 1)
    self.listen_event(self.button_two_single_tap, "zwave.scene_activated", entity_id = "zwave.wallmote_quad_01", scene_id = 2, scene_data = 0)
    self.listen_event(self.button_two_hold, "zwave.scene_activated", entity_id = "zwave.wallmote_quad_01", scene_id = 2, scene_data = 2)
    self.listen_event(self.button_two_release, "zwave.scene_activated", entity_id = "zwave.wallmote_quad_01", scene_id = 2, scene_data = 1)
    self.listen_event(self.button_three_single_tap, "zwave.scene_activated", entity_id = "zwave.wallmote_quad_01", scene_id = 3, scene_data = 0)
    self.listen_event(self.button_three_hold, "zwave.scene_activated", entity_id = "zwave.wallmote_quad_01", scene_id = 3, scene_data = 2)
    self.listen_event(self.button_three_release, "zwave.scene_activated", entity_id = "zwave.wallmote_quad_01", scene_id = 3, scene_data = 1)
    self.listen_event(self.button_four_single_tap, "zwave.scene_activated", entity_id = "zwave.wallmote_quad_01", scene_id = 4, scene_data = 0)
    self.listen_event(self.button_four_hold, "zwave.scene_activated", entity_id = "zwave.wallmote_quad_01", scene_id = 4 , scene_data = 2)
    self.listen_event(self.button_four_release, "zwave.scene_activated", entity_id = "zwave.wallmote_quad_01", scene_id = 4, scene_data = 1)

    #self.call_service("media_player/play_media", entity_id = self.alexa_kitchen, media_content_type = "sequence", media_content_id = "Alexa.Joke.Play")
    #self.call_service("webostv/button", entity_id = self.tv, button = sequence[step])
    #self.call_service("notify/alexa_media", data = {"type":"tts", "method":"all"}, target = self.alexa_upper_big_bedroom, message = "hi, your attention please. this is a call for beer time")
    #self.call_service("notify/alexa_media", data = {"type":"tts", "method":"all"}, target = self.alexa_upper_small_bedroom, message = "hi, your attention please. this is a call for beer time")
    #self.call_service("notify/alexa_media", data = {"type":"tts", "method":"all"}, target = self.alexa_upper_guest_bedroom, message = "hi, your attention please. this is a call for beer time")



  def button_one_single_tap(self, event, data, kwargs):
    self.tv_energy_save_off()


  def button_one_hold(self, event, data, kwargs):
    pass


  def button_one_release(self, event, data, kwargs):
    pass


  def button_two_single_tap(self, event, data, kwargs):
    self.tv_energy_save_min()


  def button_two_hold(self, event, data, kwargs):
    pass


  def button_two_release(self, event, data, kwargs):
    pass
    

  def button_three_single_tap(self, event, data, kwargs):
    self.tv_energy_save_med()


  def button_three_hold(self, event, data, kwargs):
    pass


  def button_three_release(self, event, data, kwargs):
    pass


  def button_four_single_tap(self, event, data, kwargs):
    self.tv_energy_save_max()


  def button_four_hold(self, event, data, kwargs):
    pass


  def button_four_release(self, event, data, kwargs):
    self.tv_energy_save_screen_off()
    pass


  def reset_internet(self):
      self.call_service("notify/alexa_media", data = {"type":"tts", "method":"all"}, target = self.alexa_kitchen, message = "Your attention please, internet power cycle in 10 seconds!")
      self.run_in(self.turn_off_switch, 10)
      self.run_in(self.turn_on_switch, 30)


  def turn_off_switch(self, kwargs):
    self.log("INTERNET_RESET:TURN_OFF")
    self.call_service("switch/turn_off", entity_id = self.internet_switch)


  def turn_on_switch(self, kwargs):
    self.log("INTERNET_RESET:TURN_ON")
    self.call_service("switch/turn_on", entity_id = self.internet_switch)
  
  
  def tv_energy_save_off(self):
    self.run_sequence([
      {"webostv/button": {"entity_id": self.tv, "button": "MENU"}},  {"sleep": 2},
      {"webostv/button": {"entity_id": self.tv, "button": "UP"}},    {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 3},
      {"webostv/button": {"entity_id": self.tv, "button": "RIGHT"}}, {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 2.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "EXIT"}}
      ])
      
  def tv_energy_save_min(self):
    self.run_sequence([
      {"webostv/button": {"entity_id": self.tv, "button": "MENU"}},  {"sleep": 2},
      {"webostv/button": {"entity_id": self.tv, "button": "UP"}},    {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 3},
      {"webostv/button": {"entity_id": self.tv, "button": "RIGHT"}}, {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 2.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "EXIT"}}
      ])
  
  def tv_energy_save_med(self):
    self.run_sequence([
      {"webostv/button": {"entity_id": self.tv, "button": "MENU"}},  {"sleep": 2},
      {"webostv/button": {"entity_id": self.tv, "button": "UP"}},    {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 3},
      {"webostv/button": {"entity_id": self.tv, "button": "RIGHT"}}, {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 2.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "EXIT"}}
      ])
  
  def tv_energy_save_max(self):
    self.run_sequence([
      {"webostv/button": {"entity_id": self.tv, "button": "MENU"}},  {"sleep": 2},
      {"webostv/button": {"entity_id": self.tv, "button": "UP"}},    {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 3},
      {"webostv/button": {"entity_id": self.tv, "button": "RIGHT"}}, {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 2.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "EXIT"}}
      ])

  def tv_energy_save_screen_off(self):
    self.run_sequence([
      {"webostv/button": {"entity_id": self.tv, "button": "MENU"}},  {"sleep": 2},
      {"webostv/button": {"entity_id": self.tv, "button": "UP"}},    {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 3},
      {"webostv/button": {"entity_id": self.tv, "button": "RIGHT"}}, {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}, {"sleep": 2.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "DOWN"}},  {"sleep": 0.5},
      {"webostv/button": {"entity_id": self.tv, "button": "ENTER"}}
      ])