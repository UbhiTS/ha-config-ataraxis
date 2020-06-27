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
#  debug: false

class AlexaDoorWindowAnnounce(hass.Hass):

  def initialize(self):

    self.debug = True;
    self.delay = timedelta() # default 0
    self.announce_close = True
    self.time_start = datetime.strptime("00:00:00", '%H:%M:%S').time()
    self.time_end = datetime.strptime("23:59:59", '%H:%M:%S').time()

    self.closing_handles = []

    if "announcements" in self.args:
      delay = datetime.strptime(self.args["announcements"]["delay"], '%H:%M:%S').time() if "delay" in self.args["announcements"] else datetime.strptime("00:00:00", '%H:%M:%S').time()
      
      self.delay = timedelta(hours = delay.hour, minutes = delay.minute, seconds = delay.second)
      self.announce_close = bool(self.args["announcements"]["close"]) if "close" in self.args["announcements"] else self.announce_close
      self.time_start = datetime.strptime(self.args["announcements"]["start_time"], '%H:%M:%S').time() if "start_time" in self.args["announcements"] else self.time_start
      self.time_end = datetime.strptime(self.args["announcements"]["end_time"], '%H:%M:%S').time() if "end_time" in self.args["announcements"] else self.time_end

    if "doors_windows" in self.args:
      for door_window_sensor in self.args["doors_windows"]:
        
        domain = door_window_sensor.split(".")[0].lower()

        if domain in ["binary_sensor"]:
          self.listen_state(self.door_window_state_changed, door_window_sensor, old = "off", new = "on", duration = self.delay.total_seconds())
          
        elif domain in ["cover"]:
          self.listen_state(self.door_window_state_changed, door_window_sensor, old = "closed", new = "open", duration = self.delay.total_seconds())
          self.listen_state(self.door_window_state_changed, door_window_sensor, old = "opening", new = "open", duration = self.delay.total_seconds())
        else:
          self.debug_log("UNSUPPORTED DOMAIN: " + door_window_sensor)
        
    init_log = [f"  START {self.time_start}\n  END   {self.time_end}"]

    if self.delay.total_seconds() > 0:
      init_log += [f"\n  DELAY {int(self.delay.total_seconds())}"]
    if self.announce_close:
      init_log += [f"\n  CLOSE ANNOUNCE"]
    
    self.debug_log("\n**** INIT - ALEXA DOOR WINDOW ANNOUNCE ****\n" + "".join(init_log))
    
    self.debug = bool(self.args["debug"]) if "debug" in self.args else self.debug


  def door_window_state_changed(self, entity, attribute, old, new, kwargs):
    
    domain = entity.split(".")[0].lower() # cover, binary_sensor
    
    if self.announce_close:
      
      if new in ["on","open"]:
        
        # add closing state listener for this entity
      
        if domain == "binary_sensor":
          self.closing_handles += [
            self.listen_state(self.door_window_state_changed, entity, old = "on", new = "off", oneshot = True)
          ]
        elif domain == "cover":
          self.closing_handles += [
            self.listen_state(self.door_window_state_changed, entity, old = "open", new = "closed", oneshot = True),
            self.listen_state(self.door_window_state_changed, entity, old = "closing", new = "closed", oneshot = True)
          ]
      
      elif new in ["off", "closed"]:
        
        # delete closing state listeners for this entity
        
        # unregister all closing handles if exists, this is a workaround for the bug in HA
        # where garage door openers have different open / close states when triggered
        # from HA > open, closing, closed, opening, open
        # vs physical button > open > closed > open
        for i in range(len(self.closing_handles) - 1, -1, -1):
          closing_handle = self.closing_handles[i]
          try:
            info = self.info_listen_state(closing_handle)
            if info[1] == entity:
              self.cancel_listen_state(closing_handle)
              del self.closing_handles[i]
          except:
            del self.closing_handles[i]
      
    friendly_name = self.get_state(entity, attribute = "friendly_name")
    
    state = "changed"
    if new in ["off","closed"]: state = "closed"
    elif new in ["on","open"]: state = "opened"
    
    if not self.is_time_okay(self.time_start, self.time_end):
      self.debug_log(f"DOOR/WINDOW TIME LOG ONLY: {entity.split('.')[1]}|{state}")
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
      self.debug_log(f"DOOR/WINDOW ANNOUNCE: {sensor_name.split('.')[1]}|{state}|{alexa.split('.')[1]}")


  def is_time_okay(self, start, end):
    current_time = datetime.now().time()
    if (start < end):
      return start <= current_time and current_time <= end
    else:
      return start <= current_time or current_time <= end
      
  def debug_log(self, message):
    if self.debug:
      self.log(message)
