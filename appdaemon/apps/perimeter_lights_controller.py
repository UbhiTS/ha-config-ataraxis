import appdaemon.plugins.hass.hassapi as hass
from datetime import datetime, time, timedelta
import holidays as hd

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
    
    self.run_at_sunset(self.sunset)
    self.run_at_sunrise(self.sunrise)
    self.run_daily(self.wind_down, time(21, 30, 00))
    self.run_daily(self.night, time(23, 15, 00))

    year = datetime.now().year
    hds_us = hd.US(years=year) + hd.US(years=year + 1)
    hds_india = hd.India(years=year) + hd.India(years=year + 1)
  
    self.holidays_us = sorted(hds_us.items())
    self.holidays_india = sorted(hds_india.items())

    #self.check_holidays(None)
    #self.run_every(self.check_holidays, "now", 5 * 60)

    

  def sunset(self, kwargs):
    self.log("SUNSET")
    
    self.call_service("notify/alexa_media", data = {"type":"tts", "method":"all"}, target = self.alexa, message = "Good evening. I'll turn on the lights.")
    
    self.turn_on("switch.entryway_festival_leds_01")
    self.turn_on("switch.entryway_festival_leds_02")
    self.turn_on("switch.backyard_mesh_lights")
    self.turn_on("switch.side_deck_light")
    self.turn_on("switch.kitchen_light")
    self.turn_on("light.master_bedroom_light_left")
    self.turn_on("light.master_bedroom_light_right")


  def sunrise(self, kwargs):
    self.log("SUNRISE")
    
    self.turn_off("switch.entryway_festival_leds_01")
    self.turn_off("switch.entryway_festival_leds_02")
    self.turn_off("switch.backyard_mesh_lights")
    self.turn_off("switch.backyard_light_left")
    self.turn_off("switch.entryway_light")
    self.turn_off("switch.side_deck_light")
    self.turn_off("switch.kitchen_light")
    self.turn_off("light.living_room_light")
    self.turn_off("light.master_bedroom_light_left")
    self.turn_off("light.master_bedroom_light_right")


  def wind_down(self, kwargs):
    self.log("WINDING DOWN")

    self.turn_off("switch.backyard_mesh_lights")


  def night(self, kwargs):
    self.log("NIGHT")

    self.turn_off("switch.entryway_festival_leds_01")
    self.turn_off("switch.entryway_festival_leds_02")
    self.turn_off("switch.kitchen_light")

    self.turn_on("switch.entryway_light")
    self.turn_on("switch.backyard_light_left")


  def check_holidays(self, kwargs):

    if self.get_state("light.welcome_leds") != "on": return
    
    self.log("FRONT LEDS: CHECKING HOLIDAYS (2 WEEKS AHEAD)")

    holiday = self.get_state("light.welcome_leds", attribute = "effect")
    self.log(f"LED ON {holiday} PRESET")

    wled_playlists = self.get_state("select.welcome_leds_playlist", attribute='options')
    wled_presets = self.get_state("select.welcome_leds_preset", attribute='options')

    if holiday == 'default':
      for date, occasion in self.holidays_us:
        if date.today() <= date <= (date.today() + timedelta(weeks=2)):
          date = date.strftime('%d %b')
          occasion = f"US {occasion.split('*')[0]}"
          self.log(f"HOLIDAY '{occasion}' ON '{date}'")
          if occasion in wled_playlists:
            self.log(f"FOUND WLED PLAYLIST FOR '{occasion}' ON '{date}'")
            holiday = occasion
            break
          elif occasion in wled_presets:
            self.log(f"FOUND WLED PRESET FOR '{occasion}' ON '{date}'")
            holiday = occasion
            break

    if holiday == 'default':
      for date, occasion in self.holidays_india:
        if date.today() <= date <= (date.today() + timedelta(weeks=2)):
          date = date.strftime('%d %b')
          occasion = f"INDIA {occasion.split('*')[0]}"
          self.log(f"HOLIDAY '{occasion}' ON '{date}'")
          if occasion in wled_playlists:
            self.log(f"FOUND WLED PLAYLIST FOR '{occasion}' ON '{date}'")
            holiday = occasion
            break
          elif occasion in wled_presets:
            self.log(f"FOUND WLED PRESET FOR '{occasion}' ON '{date}'")
            holiday = occasion
            break
    
    if holiday in wled_playlists:
      self.call_service("select/select_option", entity_id="select.welcome_leds_playlist", option=holiday)
      self.log(f"SET WLED PLAYLIST '{holiday}'")
    elif holiday in wled_presets:
      self.call_service("select/select_option", entity_id="select.welcome_leds_preset", option=holiday)
      self.log(f"SET WLED PRESET '{holiday}'")
    #else:
    #  self.call_service("select/select_option", entity_id="select.welcome_leds_preset", option=holiday)
    #  self.log(f"SET {holiday} PRESET")

