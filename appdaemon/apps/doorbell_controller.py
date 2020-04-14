import appdaemon.plugins.hass.hassapi as hass
from datetime import datetime, time
#
# Doorbell Controller App
#
# Args:
# doorbell:
#   module: doorbell_controller
#   class: DoorbellController
#   door: binary_sensor.main_door
#   motion_sensor: binary_sensor.main_door_motion
#   doorbell: switch.living_room_doorbell
#   alexa_kitchen: media_player.kitchen_alexa
#   alexa_entryway: media_player.entryway_alexa

class DoorbellController(hass.Hass):

  def initialize(self):
    
    self.door = self.args["door"]
    self.motion_sensor = self.args["motion_sensor"]
    self.doorbell = self.args["doorbell"]
    self.alexa_kitchen = self.args["alexa_kitchen"]
    self.alexa_entryway = self.args["alexa_entryway"]
    
    self.listen_state(self.evaluate_and_ring_doorbell, self.motion_sensor, attribute = "state")


  def evaluate_and_ring_doorbell(self, entity, attribute, old, new, kwargs):
      # IF MOTION DETECTED
      # CHECK DOOR IS CURRENTLY CLOSED
      # CHECK DOOR WAS LAST CLOSED AT LEAST 30 SECONDS AGO
      # CHECK TIME IS BETWEEN 7 AM AND 10 PM
    if new == "on":
      door_closed = self.get_state(self.door) == "off"
      last_door_closed_seconds = datetime.now().timestamp() - self.convert_utc(self.get_state(self.door, attribute = 'last_changed')).timestamp()
      time_okay = time(7) <= datetime.now().time() and datetime.now().time() <= time(22)

      if door_closed and last_door_closed_seconds > 30:
        if time_okay:
          self.run_in(self.doorbell_ring, 0)
          self.run_in(self.notify_home, 0)
          
        #self.run_in(self.set_guest_volume_high, 1)
        self.run_in(self.notify_guest, 0)
        #self.run_in(self.set_guest_volume_low, 5)


  def guest_greeting(self):
    
    hour = datetime.now().hour
    
    if hour >= 0 and hour <= 4:
      greeting = "Hi, Welcome. Please ring the bell on your left if you want to notify the family of your arrival."
    if hour >= 5 and hour <= 11:
      greeting = "Good morning. Welcome. I've notified the family. Someone will be at the door shortly."
    elif hour >= 12 and hour <= 16:
      greeting = "Good afternoon. Welcome. I've notified the family. Someone will be at the door shortly."
    elif hour >= 17 and hour <= 21:
      greeting = "Good evening. Welcome. I've notified the family. Someone will be at the door shortly."
    elif hour >= 22 and hour <= 23:
      greeting = "Hi, Welcome. Please ring the bell on your left if you want to notify the family inside."
      
    return greeting

  def doorbell_ring(self, kwargs):
    self.call_service("switch/turn_on", entity_id = self.doorbell)
    #self.log("DOORBELL RING")
    
  def notify_home(self, kwargs):
    self.call_service("notify/alexa_media", data = {"type":"announce", "method":"all"}, target = self.alexa_kitchen, message = "Your attention please. There is someone at the door!")
    #self.log("NOTIFY HOME")

  def notify_guest(self, kwargs):
    self.call_service("notify/alexa_media", data = {"type":"tts", "method":"all"}, target = self.alexa_entryway, message = self.guest_greeting())
    #self.log("NOTIFY GUEST")

#  def set_guest_volume_high(self, kwargs):
#    self.call_service("media_player/volume_set", entity_id = self.alexa_entryway, volume_level = .99)
#    self.log("GUEST VOLUME HIGH")

#  def set_guest_volume_low(self, kwargs):
#    self.call_service("media_player/volume_set", entity_id = self.alexa_entryway, volume_level = .40)
#    self.log("GUEST VOLUME LOW")