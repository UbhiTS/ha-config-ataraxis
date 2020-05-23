import appdaemon.plugins.hass.hassapi as hass
from datetime import datetime, time, timedelta

#
# Alexa Door Window Announce App
#
# Args:
#alexa_door_window_announce:
#  module: alexa_door_window_announce
#  class: AlexaDoorWindowAnnounce
#  alexas:
#    - media_player.kitchen_alexa
#    - media_player.living_room_alexa
#  doors_windows:
#    - cover.garage_door_big
#    - cover.garage_door_small
#    - binary_sensor.main_door
#    - binary_sensor.side_door
#  announcements:
#    delay: "00:00:00"
#    close: True
#    start_time: "00:00:00"
#    end_time: "23:59:59"


class AlexaDoorWindowAnnounce(hass.Hass):

  def initialize(self):

    self.delay = timedelta() # default 0
    self.announce_close = True
    self.time_start = datetime.strptime("00:00:00", '%H:%M:%S').time()
    self.time_end = datetime.strptime("23:59:59", '%H:%M:%S').time()

    if "announcements" in self.args:
      delay = datetime.strptime(self.args["announcements"]["delay"], '%H:%M:%S').time() if "delay" in self.args["announcements"] else datetime.strptime("00:00:00", '%H:%M:%S').time()
      
      self.delay = timedelta(hours = delay.hour, minutes = delay.minute, seconds = delay.second)
      self.announce_close = bool(self.args["announcements"]["close"]) if "close" in self.args["announcements"] else self.announce_close
      self.time_start = datetime.strptime(self.args["announcements"]["start_time"], '%H:%M:%S').time() if "start_time" in self.args["announcements"] else self.time_start
      self.time_end = datetime.strptime(self.args["announcements"]["end_time"], '%H:%M:%S').time() if "end_time" in self.args["announcements"] else self.time_end

    if "doors_windows" in self.args:
      for door_window_sensor in self.args["doors_windows"]:
        states = self.get_state_values(door_window_sensor)
        if states[0] in ["cover", "sensor"]:
          self.listen_state(self.door_window_state_changed, door_window_sensor, old = states[3], new = states[4], duration = self.delay.total_seconds())
        else:
          self.log("UNSUPPORTED DOMAIN: " + door_window_sensor)
        
    init_log = [f"START {self.time_start}, END {self.time_end}"]

    if self.delay.total_seconds() > 0:
      init_log += [f"DELAY:{int(self.delay.total_seconds())}"]
    if self.announce_close:
      init_log += [f"CLOSE"]
    
    self.log("INIT " + ", ".join(init_log))


  def door_window_state_changed(self, entity, attribute, old, new, kwargs):
    states = self.get_state_values(entity)
    
    if new == states[4] and self.announce_close: # door is open, and announce_closed is True
      self.listen_state(self.door_window_state_changed, entity, old = states[1], new = states[2], oneshot = True)
    
    friendly_name = self.get_state(entity, attribute = "friendly_name")
    
    state = "changed"
    if new == states[2]: state = "closed"
    if new == states[4]: state = "opened"
    
    if datetime.now().time() < self.time_start or self.time_end < datetime.now().time():
      self.log(f"DOOR/WINDOW TIME LOG ONLY: {entity.split('.')[1]}|{state}")
      return
    
    delay = 0
    if "alexas" in self.args:
      for alexa in self.args["alexas"]:
        self.run_in(self.announce_state, delay, sensor_name = entity, friendly_name = friendly_name, state = state, alexa = alexa)
        delay = delay + 5


  def announce_state(self, kwargs):
    
    sensor_name = kwargs["sensor_name"]
    friendly_name = kwargs["friendly_name"]
    state = kwargs["state"]
    alexa = kwargs["alexa"]
    
    try:
      self.call_service("notify/alexa_media", data = {"type":"tts", "method":"all"}, target = alexa, title = "Home Assistant: Door/Window Announce", message = f"Your attention please. The {friendly_name} has been {state}.")
    finally:
      self.log(f"DOOR/WINDOW ANNOUNCE: {sensor_name.split('.')[1]}|{state}|{alexa.split('.')[1]}")


  def get_state_values(self, entity):
    
    domain = entity.split(".")[0].lower()
    
    if domain == "cover":
      return [ "cover", "closing", "closed", "opening", "open" ]
    elif domain == "binary_sensor":
      return [ "sensor", "on", "off", "off", "on" ]
    else:
      return [ "other" ]
