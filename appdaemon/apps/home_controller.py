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
    self.alexa_kitchen = self.args["alexa_kitchen"]
    self.alexa_entryway = self.args["alexa_entryway"]
    
    self.call_service("notify/alexa_media", data = {"type":"announce", "method":"all"}, target = self.alexa_kitchen, message = "Hi, your Home Assistant is ready to rock and roll!")
    
    self.listen_state(self.buzz_kitchen, self.buzz_control)
    
    #self.run_hourly(self.play_music_entryway, time(datetime.now().hour, 0, 0))


  def buzz_kitchen(self, entity, attribute, old, new, kwargs):
    
    if old == "off" and new == "on":
      self.call_service("notify/alexa_media", data = {"type":"announce", "method":"all"}, target = self.alexa_kitchen, message = "Someone's calling you. Please pick up the phone or call them back immediately!")
      self.call_service("input_boolean/turn_off", entity_id = self.buzz_control)


  def play_music_entryway(self, kwargs):
    #self.log("ENTRYWAY_MUSIC_PLAY")
    #self.call_service("media_player/media_play", entity_id = self.alexa_entryway)
    pass
