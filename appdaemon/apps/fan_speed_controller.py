import appdaemon.plugins.hass.hassapi as hass
from datetime import datetime, time

#
# Auto Fan Speed Controller App
#
# Args:
# fan_speed_controller_master_bedroom:
#   module: fan_speed_controller
#   class: FanSpeedController
#   fan: fan.master_bedroom_fan
#   thermostat: sensor.thermostat_master_bedroom_temperature


class FanSpeedController(hass.Hass):

  def initialize(self):
    self.fan = self.args["fan"]
    self.thermostat = self.args["thermostat"]

    self.listen_state(self.temperature_change, self.thermostat)


  def temperature_change(self, entity, attribute, old, new, kwargs):
      
    # if it's night time and room temp changes, then change fan speed
    current_time = datetime.now().time()
    is_fan_speed_on_auto_control_mode = (time(21) <= current_time and current_time <= time(23,59,59)) or (time(0) <= current_time and current_time <= time(8))
    
    if is_fan_speed_on_auto_control_mode:
      room_temperature = float(new)
      fan_speed = self.get_target_fan_speed(room_temperature)
      self.call_service("fan/set_speed", entity_id = self.fan, speed = fan_speed)
      self.log("ROOM_TEMP:" + str(room_temperature) + " FAN_SPEED:" + fan_speed)


  def get_target_fan_speed(self, room_temperature):
    if room_temperature == 0:
      return "low"
    elif room_temperature >= 45 and room_temperature <= 67.0:
      return "off"
    elif room_temperature >= 67.5 and room_temperature <= 69:
      return "low"
    elif room_temperature >= 69.5 and room_temperature <= 73:
      return "medium"
    elif room_temperature >= 73.5:
      return "high"
