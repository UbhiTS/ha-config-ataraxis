import appdaemon.plugins.hass.hassapi as hass
from datetime import datetime, time

#
# Auto Fan Speed Controller App
#
# Args:
# auto_fan_speed_master_bedroom:
#   module: auto_fan_speed
#   class: AutoFanSpeed
#   temp_sensor: sensor.thermostat_master_bedroom_temperature
#   fan: fan.master_bedroom_fan
#   sun: sun.sun
#   speeds:
#     low: 67
#     medium: 69
#     high: 73
#     sun_offset: -2
#   time:
#     start: "21:00:00"
#     end: "09:30:00"
#     turn_off_at_end_time: True


class AutoFanSpeed(hass.Hass):

  def initialize(self):
    
    # REQUIRED
    self.temp_sensor  = self.args["temp_sensor"]
    self.sun          = self.args["sun"]
    self.fan          = self.args["fan"]
    
    # DEFAULTS
    self.low          = 67
    self.medium       = 69
    self.high         = 73
    self.offset       = 0
    self.start        = datetime.strptime("21:00:00", '%H:%M:%S').time()
    self.end          = datetime.strptime("09:30:00", '%H:%M:%S').time()
    self.turn_off     = False
    
    # USER PREFERENCES
    if "speeds" in self.args:
      self.low = int(self.args["speeds"]["low"]) if "low" in self.args["speeds"] else self.low
      self.medium = int(self.args["speeds"]["medium"]) if "medium" in self.args["speeds"] else self.medium
      self.high = int(self.args["speeds"]["high"]) if "high" in self.args["speeds"] else self.high
      self.offset = int(self.args["speeds"]["sun_offset"]) if "sun_offset" in self.args["speeds"] else self.offset
    
    if "time" in self.args:
      self.start = datetime.strptime(self.args["time"]["start"], '%H:%M:%S').time() if "start" in self.args["time"] else self.start
      self.end = datetime.strptime(self.args["time"]["end"], '%H:%M:%S').time() if "end" in self.args["time"] else self.end
      self.turn_off = bool(self.args["time"]["turn_off_at_end_time"]) if "turn_off_at_end_time" in self.args["time"] else self.turn_off

    self.run_in(self.configure, 0)


  def configure(self, kwargs):

    init_log = ["\nINIT\n"]
    
    init_log += [f"FAN           {self.fan}\n"]
    init_log += [f"TEMP SENSOR   {self.temp_sensor}\n"]
    init_log += [f"SPEEDS        OFF < {self.low} > LOW < {self.medium} > MEDIUM < {self.high} > HIGH\n"]
    init_log += [f"SUN OFFSET    {self.offset}\n"]
    init_log += [f"TIME          {self.start} to {self.end}\n"]

    self.listen_state(self.temperature_change, self.temp_sensor)
    
    if self.turn_off:
        self.run_daily(self.hvac_daily_shut_off, self.end)
        init_log += [f"AUTO OFF      {self.end}\n"]
    
    self.log("  ".join(init_log))


  def temperature_change(self, entity, attribute, old, new, kwargs):
    
    # if the room temp changes
    # and if time is between start and end
    # then calculate and change fan speed
    
    current_time = datetime.now().time()
    time_okay = self.start <= current_time and current_time <= self.end
    
    if time_okay:
      room_temperature = float(new)
      fan_speed = self.get_target_fan_speed(room_temperature)
      self.call_service("fan/set_speed", entity_id = self.fan, speed = fan_speed)


  def get_target_fan_speed(self, room_temperature):
    
    # if sun is above horizon, then add offset
    sun_above_horizon = self.get_state(self.sun) == "above_horizon"
    offset = self.offset if sun_above_horizon else 0
    fan_speed = "off"
    
    if room_temperature < self.low + offset:
      fan_speed = "off"
    elif room_temperature >= self.low + offset and room_temperature < self.medium + offset:
      fan_speed = "low"
    elif room_temperature >= self.medium + offset and room_temperature < self.high + offset:
      fan_speed = "medium"
    elif room_temperature >= self.high + offset:
      fan_speed = "high"
    
    self.log(f"AUTO FAN SPEED: {str(room_temperature)}/{fan_speed}")
    
    if sun_above_horizon: self.log(f" (SUN OFFSET)")
      
    return fan_speed


  def hvac_daily_shut_off(self, kwargs):
    self.call_service("fan/turn_off", entity_id = self.fan)
    self.log("FAN AUTO OFF")
