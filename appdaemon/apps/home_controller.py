import appdaemon.plugins.hass.hassapi as hass
from datetime import datetime, time
#
# Home Controller App
#
# Args:
# home:
#   module: home_controller
#   class: HomeController
#   buzz_control: input_boolean.buzz_home
#   alexa_kitchen: media_player.kitchen_alexa
#   alexa_entryway: media_player.entryway_alexa

class HomeController(hass.Hass):

  def initialize(self):
    self.buzz_control = self.args["buzz_control"]
    self.internet_control = self.args["internet_control"]
    self.internet_switch = self.args["internet_switch"]
    self.alexa_kitchen = self.args["alexa_kitchen"]
    self.alexa_entryway = self.args["alexa_entryway"]
    
    #self.call_service("notify/alexa_media", data = {"type":"announce", "method":"all"}, target = self.alexa_kitchen, message = "Hi, your Home Assistant is ready to rock and roll!")
    
    self.listen_state(self.buzz_kitchen, self.buzz_control)
    self.listen_state(self.reset_internet, self.internet_control)
    
    #self.run_hourly(self.play_music_entryway, time(datetime.now().hour, 0, 0))


  def buzz_kitchen(self, entity, attribute, old, new, kwargs):

    if old == "off" and new == "on":
      self.log("HOME BUZZ")
      self.call_service("notify/alexa_media", data = {"type":"announce", "method":"all"}, target = self.alexa_kitchen, message = "Someone's calling you. Please pick up the phone or call them back immediately!")
      self.call_service("input_boolean/turn_off", entity_id = self.buzz_control)
      
      
  def reset_internet(self, entity, attribute, old, new, kwargs):

    if old == "off" and new == "on":
      self.log("RESET INTERNET")
      self.call_service("input_boolean/turn_off", entity_id = self.internet_control)
      
      self.run_in(self.turn_off_switch, 5)
      self.run_in(self.turn_on_switch, 15)


  def play_music_entryway(self, kwargs):
    #self.log("ENTRYWAY_MUSIC_PLAY")
    #self.call_service("media_player/media_play", entity_id = self.alexa_entryway)
    pass
  

  def turn_off_switch(self, kwargs):
    self.log("INTERNET_RESET:TURN_OFF")
    self.call_service("switch/turn_off", entity_id = self.internet_switch)


  def turn_on_switch(self, kwargs):
    self.log("INTERNET_RESET:TURN_ON")
    self.call_service("switch/turn_on", entity_id = self.internet_switch)
    
#  def set_guest_volume_high(self, kwargs):
#    self.call_service("media_player/volume_set", entity_id = self.door_alexa, volume_level = .99)
#    self.log("GUEST VOLUME HIGH")


#  def set_guest_volume_low(self, kwargs):
#    self.call_service("media_player/volume_set", entity_id = self.door_alexa, volume_level = .40)
#    self.log("GUEST VOLUME LOW")