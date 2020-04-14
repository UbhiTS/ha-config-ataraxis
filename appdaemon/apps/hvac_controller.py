import appdaemon.plugins.hass.hassapi as hass
import datetime

#
# HVAC Thermostat Controller App
#
# Args:
# hvac_living_room:
#   module: hvac_controller
#   class: HVACController
#   min_cool_temp: 67
#   max_heat_temp: 71
#   thermostat: climate.thermostat_living_room_mode
#   doors_windows:
#   alexa: media_player.living_room_alexa
#   air_cycle_minute: 3

class HVACController(hass.Hass):

  def initialize(self):
    self.thermostat = self.args["thermostat"]
    self.min_cool_temp = self.args["min_cool_temp"]
    self.max_heat_temp = self.args["max_heat_temp"]
    self.doors_windows = self.args["doors_windows"]
    self.alexa = self.args["alexa"]
    self.air_cycle_minute = int(self.args["air_cycle_minute"]) if "air_cycle_minute" in self.args else None
    self.air_cycling = False
    
    self.run_daily(self.turn_off_in_the_morning, datetime.time(8, 0, 0))
    self.listen_state(self.set_fan_mode_auto, self.thermostat, attribute = "fan_mode")
    self.listen_state(self.enforce_temp_limits, self.thermostat, attribute = "temperature")
    self.listen_state(self.enforce_temp_limits, self.thermostat, attribute = "target_temp_high")
    self.listen_state(self.enforce_temp_limits, self.thermostat, attribute = "target_temp_low")
    
    # if a door or window is open for 60 seconds then shut of thermostat
    if self.doors_windows:
      for door_window_sensor in self.doors_windows:
        self.listen_state(self.open_door_window_wait_for_shut_off, door_window_sensor, old = "off", new = "on", duration = 60)
        # TODO: Add the attribute = "state" in the above listen_state call as there is a bug right now
        # https://github.com/home-assistant/appdaemon/issues/185

    if self.air_cycle_minute is not None:
      now = datetime.datetime.now()
      next = now.replace(minute=self.air_cycle_minute, second=0)
      next = next + datetime.timedelta(hours=1) if now > next else next
      self.run_every(self.air_cycle, next, 60 * 30)
    
    #self.run_daily(self.decrease_heating_temp_after_midnight, datetime.time(2, 0, 0))
    #self.run_daily(self.decrease_heating_temp_after_midnight, datetime.time(3, 0, 0))
    #self.run_daily(self.increase_heating_temp_before_morning, datetime.time(4, 0, 0))
    #self.run_daily(self.increase_heating_temp_before_morning, datetime.time(5, 0, 0))


  def turn_off_in_the_morning(self, kwargs):
    self.log("MORNING_SHUT_OFF")
    self.call_service("climate/turn_off", entity_id = self.thermostat)


  def set_fan_mode_auto(self, entity, attribute, old, new, kwargs):
    
    if new != 'Auto Low' and self.air_cycling == False:
      self.log("FAN_MODE_AUTO")
      self.call_service("climate/set_fan_mode", entity_id = self.thermostat, fan_mode = 'Auto Low')
      self.call_service("notify/alexa_media", data = {"type":"tts", "method":"all"}, target = self.alexa, message = "Your attention please. AC fan mode has been set to auto.")


  def enforce_temp_limits(self, entity, attribute, old, new, kwargs):
    
    hvac_mode = self.get_state(self.thermostat)
    
    if hvac_mode is None:
      return
    
    if hvac_mode == 'heat':
      temp = self.get_state(self.thermostat, attribute = "temperature")
      if temp > self.max_heat_temp:
        self.log("ENFORCED_MAX_HEAT_TEMP_LIMIT")
        self.call_service("climate/set_temperature", entity_id = self.thermostat, temperature = self.max_heat_temp)
        self.call_service("notify/alexa_media", data = {"type":"tts", "method":"all"}, target = self.alexa, message = "Your attention please, the maximum heating temperature limit in this room is " + str(self.max_heat_temp))

    if hvac_mode == 'cool':
      temp = self.get_state(self.thermostat, attribute = "temperature")
      if temp < self.min_cool_temp:
        self.log("ENFORCED_MIN_COOL_TEMP_LIMIT")
        self.call_service("climate/set_temperature", entity_id = self.thermostat, temperature = self.min_cool_temp)
        self.call_service("notify/alexa_media", data = {"type":"tts", "method":"all"}, target = self.alexa, message = "Your attention please, the minimum cooling temperature limit in this room is " + str(self.min_cool_temp))

    if hvac_mode == 'heat_cool':
      temp_high = self.get_state(self.thermostat, attribute = "target_temp_high")
      temp_low = self.get_state(self.thermostat, attribute = "target_temp_low")
      
      if temp_low < self.min_cool_temp or self.max_heat_temp > temp_low or temp_high < self.min_cool_temp or self.max_heat_temp > temp_high:
        self.log("ENFORCED_AUTO_TEMP_LIMIT")
        self.call_service("climate/set_temperature", entity_id = self.thermostat, target_temp_high = self.max_heat_temp, target_temp_low = self.min_cool_temp)
        self.call_service("notify/alexa_media", data = {"type":"tts", "method":"all"}, target = self.alexa, message = "Your attention please, the temperature range limit in this room is " + str(self.min_cool_temp) + " to " + str(self.max_heat_temp))
    
    
  def open_door_window_wait_for_shut_off(self, entity, attribute, old, new, kwargs):
    operation_mode = self.get_state(self.thermostat)
    if operation_mode != 'off':
      self.log("DOOR_WINDOW_SHUT_OFF")
      self.call_service("climate/turn_off", entity_id = self.thermostat)
      self.call_service("notify/alexa_media", data = {"type":"tts", "method":"all"}, target = self.alexa, message = "Your attention please, this room's door or window has been open since the past 60 seconds. I've turned off the air conditioning.")


  def air_cycle(self, kwargs):
    self.log("AIR_CYCLE_ON")
    self.air_cycling = True
    self.call_service("climate/set_fan_mode", entity_id = self.thermostat, fan_mode = 'On Low')
    self.run_in(self.air_cycle_off, 75)


  def air_cycle_off(self, kwargs):
    self.log("AIR_CYCLE_OFF")
    self.call_service("climate/set_fan_mode", entity_id = self.thermostat, fan_mode = 'Auto Low')
    self.air_cycling = False


#  def decrease_heating_temp_after_midnight(self, kwargs):
#    temp = self.get_state(self.thermostat_heating, attribute = "temperature")
#    new_temp = temp - 1
#    self.call_service("climate/set_temperature", entity_id = self.thermostat_heating, temperature = new_temp)
#    self.log("AUTO_DECREASE_TEMP") 
  
  
#  def increase_heating_temp_before_morning(self, kwargs):
#    temp = self.get_state(self.thermostat_heating, attribute = "temperature")
#    new_temp = temp + 1
#    self.call_service("climate/set_temperature", entity_id = self.thermostat_heating, temperature = new_temp)
#    self.log("AUTO_INCREASE_TEMP")