import appdaemon.plugins.hass.hassapi as hass
import datetime

#
# Internet Health Controller App
#
# Args:
# internet_health_monitor:
#   module: internet_health_controller
#   class: InternetHealthController
#   internet_switch: switch.garage_internet_switch
#   download: sensor.speedtest_download
#   upload: sensor.speedtest_upload
#   ping: sensor.speedtest_ping
#   alexa: media_player.kitchen_alexa

class InternetHealthController(hass.Hass):

  def initialize(self):
    self.internet_switch = self.args["internet_switch"]
    self.download = self.args["download"]
    self.upload = self.args["upload"]
    self.ping = self.args["ping"]
    self.alexa = self.args["alexa"]
    
    self.run_daily(self.run_speedtest, datetime.time(4, 0, 0))
    
    self.listen_state(self.reset_internet, self.download, attribute = "state")
    self.listen_state(self.reset_internet, self.upload, attribute = "state")
    self.listen_state(self.reset_internet, self.ping, attribute = "state")


  def run_speedtest(self, kwargs):
    self.log("INTERNET_TEST")
    self.call_service("speedtestdotnet/speedtest")


  def reset_internet(self, entity, attribute, old, new, kwargs):
    
    d = float(self.get_state(self.download)) < 55
    u = float(self.get_state(self.upload)) < 4.5
    p = float(self.get_state(self.ping)) > 50
    
    if d or u or p:
      #self.call_service("notify/alexa_media", data = {"type":"tts", "method":"all"}, target = self.alexa, message = "Your attention please, internet power cycle in 30 seconds!")
      self.run_in(self.turn_off_switch, 30)
      self.run_in(self.turn_on_switch, 45)


  def turn_off_switch(self, kwargs):
    self.log("INTERNET_RESET:TURN_OFF")
    self.call_service("switch/turn_off", entity_id = self.internet_switch)


  def turn_on_switch(self, kwargs):
    self.log("INTERNET_RESET:TURN_ON")
    self.call_service("switch/turn_on", entity_id = self.internet_switch)
