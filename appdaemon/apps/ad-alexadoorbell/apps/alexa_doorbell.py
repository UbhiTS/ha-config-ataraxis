import appdaemon.plugins.hass.hassapi as hass
from datetime import datetime, time
#
# Alexa Doorbell Controller App
# Developed by @UbhiTS on GitHub
#
# Args:
#alexa_doorbell:
#  module: alexa_doorbell
#  class: AlexaDoorbell
#  door:
#    motion_sensor: binary_sensor.main_door_motion
#    sensor: binary_sensor.main_door          # optional
#    alexa: media_player.entryway_alexa       # optional
#    announce_bell: False                     # optional
#    bell_switch: switch.doorbell_switch      # optional
#  home:
#    alexa: media_player.kitchen_alexa
#    doorbell: switch.living_room_doorbell    # optional
#    announce_bell: False                     # optional
#  time:
#    start: "07:00:00"                        # optional, default 7 AM
#    end: "22:00:00"                          # optional, default 10 PM
#  debug: false

class AlexaDoorbell(hass.Hass):

  def initialize(self):
    
    self.debug = True;
    self.door_motion_sensor = self.args["door"]["motion_sensor"] if "motion_sensor" in self.args["door"] else None
    self.door_sensor = self.args["door"]["sensor"] if "sensor" in self.args["door"] else None
    self.door_alexa = self.args["door"]["alexa"] if "alexa" in self.args["door"] else None
    self.door_alexa_bell = self.args["door"]["announce_bell"] if "announce_bell" in self.args["door"] else False
    self.door_bell_switch = self.args["door"]["bell_switch"] if "bell_switch" in self.args["door"] else None
    self.home_alexa = self.args["home"]["alexa"] if "alexa" in self.args["home"] else None
    self.home_alexa_bell = self.args["home"]["announce_bell"] if "announce_bell" in self.args["home"] else True
    self.home_doorbell = self.args["home"]["doorbell"] if "doorbell" in self.args["home"] else None
    
    self.listen_state(self.evaluate_and_ring_doorbell, self.door_motion_sensor, attribute = "state")
    
    if self.door_bell_switch:
      self.listen_state(self.doorbell_override, self.door_bell_switch, attribute = "state", old = "off", new = "on")
    
    self.time_start = datetime.strptime("07:00:00", '%H:%M:%S').time()
    self.time_end = datetime.strptime("22:00:00", '%H:%M:%S').time()
    
    if "time" in self.args:
      self.time_start = datetime.strptime(self.args["time"]["start"], '%H:%M:%S').time() if "start" in self.args["time"] else self.time_start
      self.time_end = datetime.strptime(self.args["time"]["end"], '%H:%M:%S').time() if "end" in self.args["time"] else self.time_end
    
    self.debug_log(f"\n**** INIT - ALEXA DOORBELL ****\n  START {self.time_start.strftime('%H:%M:%S')}\n  END   {self.time_end.strftime('%H:%M:%S')}\n")
    
    self.debug = bool(self.args["debug"]) if "debug" in self.args else self.debug

  def evaluate_and_ring_doorbell(self, entity, attribute, old, new, kwargs):
      # IF MOTION DETECTED
      # CHECK DOOR IS CURRENTLY CLOSED (IF DEFINED)
      # CHECK DOOR WAS LAST CLOSED AT LEAST 30 SECONDS AGO
      # CHECK TIME IS BETWEEN START TIME AND END TIME
    if new == "on":
      door_closed = True if self.door_sensor is None else self.get_state(self.door_sensor) == "off"
      last_door_closed_seconds = 60 if self.door_sensor is None else datetime.now().timestamp() - self.convert_utc(self.get_state(self.door_sensor, attribute = 'last_changed')).timestamp()
      time_okay = self.is_time_okay(self.time_start, self.time_end)

      if door_closed and last_door_closed_seconds > 30:
        guest_notify_delay = 5
        if time_okay:
          if self.home_doorbell is not None: self.run_in(self.doorbell_ring, 0)
          self.run_in(self.notify_home, 0)
        else:
          guest_notify_delay = 0
          self.debug_log("OUTSIDE TIME RANGE")
          
        if self.door_alexa is not None:
          self.run_in(self.notify_guest, guest_notify_delay, message = self.guest_greeting(time_okay))
      else:
        if not door_closed:
          self.debug_log("DOOR IS OPEN")
        elif last_door_closed_seconds < 30:
          self.debug_log("DOOR CLOSED < 30 SECS AGO")


  def guest_greeting(self, time_okay):
    
    hour = datetime.now().hour
    
    if (not time_okay) or (22 <= hour and hour <= 23) or (0 <= hour and hour <= 4):
      greeting = "Hi, Welcome. Please ring the bell if you want to notify the family inside."
    elif 5 <= hour and hour <= 11:
      greeting = "Good morning. Welcome. I've notified the family. Someone will be at the door shortly."
    elif 12 <= hour and hour <= 16:
      greeting = "Good afternoon. Welcome. I've notified the family. Someone will be at the door shortly."
    elif 17 <= hour and hour <= 21:
      greeting = "Good evening. Welcome. I've notified the family. Someone will be at the door shortly."
      
    return greeting


  def doorbell_override(self, entity, attribute, old, new, kwargs):
    self.call_service("switch/turn_off", entity_id = self.door_bell_switch)
    if self.home_doorbell is not None: self.run_in(self.doorbell_ring, 0)
    self.run_in(self.notify_home, 0)
    self.debug_log("DOORBELL OVERRIDE SWITCH")


  def doorbell_ring(self, kwargs):
    self.call_service("switch/turn_on", entity_id = self.home_doorbell)
    self.debug_log("DOORBELL RING")
    
    
  def notify_home(self, kwargs):
    self.call_service("notify/alexa_media", data = {"type": "announce" if self.home_alexa_bell else "tts", "method": "all"}, target = self.home_alexa, title = "Home Assistant: Alexa Doorbell", message = "Your attention please. There is someone at the door!")
    self.debug_log("NOTIFY HOME")


  def notify_guest(self, kwargs):
    self.call_service("notify/alexa_media", data = {"type": "announce" if self.door_alexa_bell else "tts", "method": "all"}, target = self.door_alexa, title = "Home Assistant: Alexa Doorbell", message = kwargs["message"])
    self.debug_log("NOTIFY GUEST")


  def is_time_okay(self, start, end):
    current_time = datetime.now().time()
    if (start < end):
      return start <= current_time and current_time <= end
    else:
      return start <= current_time or current_time <= end
      
  def debug_log(self, message):
    if self.debug:
      self.log(message)
