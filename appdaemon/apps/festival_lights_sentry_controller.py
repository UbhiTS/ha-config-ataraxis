import appdaemon.plugins.hass.hassapi as hass
import datetime

#
# Festival Lights Sentry Controller App
#
# Args:
# festival_lights_sentry:
#   module: festival_lights_sentry_controller
#   class: FestivalLightsSentryController
#   alexa: media_player.kitchen_alexa
#   alarm_time: 15

class FestivalLightsSentryController(hass.Hass):

  def initialize(self):
    
    self.alexa = self.args["alexa"]
    self.alarm_time = int(self.args["alarm_time"])
    
    #self.listen_state(self.sound_alarm, "binary_sensor.front_yard_motion", attribute = "state")


  def sound_alarm(self, entity, attribute, old, new, kwargs):
    
    if (old == "off" and new == "on"):
      self.log("THEFT ALERT")
      self.alarm_led_on()
      self.turn_on("switch.entryway_light")
      self.turn_on("switch.backyard_light_left")
      self.turn_on("switch.side_deck_light")
      self.call_service("notify/alexa_media", data = {"type":"tts", "method":"all"}, target = self.alexa, message = "Emergency, Emergency, someone's stealing the outdoor laser. Emergency, Emergency, someone's stealing the outdoor laser.")
  
  
  def alarm_led_on(self):
    self.turn_on("light.fortrezz_ssa2_siren_strobe_light_alarm_level", brightness=33)
    self.run_in(self.alarm_off, self.alarm_time)
  
  
  def alarm_siren_on(self):
    self.turn_on("light.fortrezz_ssa2_siren_strobe_light_alarm_level", brightness=150)
    self.run_in(self.alarm_off, self.alarm_time)
    
    
  def alarm_led_siren_on(self):
    self.turn_on("light.fortrezz_ssa2_siren_strobe_light_alarm_level", brightness=250)
    self.run_in(self.alarm_off, self.alarm_time)
  
  
  def alarm_off(self, kwargs):
    self.turn_on("light.fortrezz_ssa2_siren_strobe_light_alarm_level", brightness=0)