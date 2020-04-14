import appdaemon.plugins.hass.hassapi as hass
import datetime

#
# Perimeter Lights Controller App
#
# Args:
# perimeter_lights:
#   module: perimeter_lights_controller
#   class: PerimeterLightsController
#   alexa: media_player.kitchen_alexa

class PerimeterLightsController(hass.Hass):

  def initialize(self):
    
    self.alexa = self.args["alexa"]
    
    self.run_at_sunrise(self.turn_off_perimeter_lights)
    self.run_at_sunset(self.turn_on_perimeter_lights)
    
  def turn_on_perimeter_lights(self, kwargs):
    
    self.call_service("notify/alexa_media", data = {"type":"tts", "method":"all"}, target = self.alexa, message = "Good evening. I'll turn on the perimeter lights.")
    
    self.turn_on("switch.entryway_light")
    self.turn_on("switch.backyard_light_left")
    self.turn_on("switch.side_deck_light")
    self.turn_on("switch.entryway_outlet_switch")
    
    self.run_in(self.check_festival_lights, 15, **kwargs)


  def turn_off_perimeter_lights(self, kwargs):
    
    self.turn_off("switch.entryway_light")
    self.turn_off("switch.backyard_light_left")
    self.turn_off("switch.side_deck_light")


  def check_festival_lights(self, kwargs):
    
    # if outlet power is more than 10W, turn off entryway lights
    power = self.get_state("sensor.entryway_outlet_power")
    
    if float(power) > 15:
      self.call_service("notify/alexa_media", data = {"type":"tts", "method":"all"}, target = self.alexa, message = "Hi again, I'm sensing, the festival lights are connected. I'll turn off the entryway lights till midnight.")
      self.turn_off("switch.entryway_light")
      self.run_at(self.turn_off_festival_lights, datetime.datetime.now().replace(hour = 22, minute = 30, second = 0))
    else:
      self.turn_off("switch.entryway_outlet_switch")


  def turn_off_festival_lights(self, kwargs):
    
    self.call_service("notify/alexa_media", data = {"type":"tts", "method":"all"}, target = self.alexa, message = "I've turned off the festival lights. Please remove our laser from the front yard.")
    self.turn_off("switch.entryway_outlet_switch")
    self.turn_on("switch.entryway_light")
