import appdaemon.plugins.hass.hassapi as hass
from datetime import datetime, time
#
# Home Controller App
#
# Args:
# home:
#   module: home_controller
#   class: HomeController


class HomeController(hass.Hass):

  def initialize(self):
    self.bool_buzz_home = "input_boolean.buzz_home"
    self.bool_reset_internet = "input_boolean.reset_internet"
    self.garage_internet_switch = "switch.garage_internet_switch"
    self.vacuum_jhadoo_pocha = "vacuum.jhadoo_pocha"
    self.kitchen_alexa = "media_player.kitchen_alexa"
    self.entryway_alexa = "media_player.entryway_alexa"
    self.upper_big_bedroom_alexa = "media_player.upper_big_bedroom_alexa"
    self.upper_small_bedroom_alexa = "media_player.upper_small_bedroom_alexa"
    self.hem_energy = "sensor.hem_energy"

    self.notification_devices = ['notify/mobile_app_funky_monkey_s_iphone', 'notify/mobile_app_ivavvay_s_iphone']
    
    self.listen_state(self.buzz_kitchen, self.bool_buzz_home)
    self.listen_state(self.internet_reset, self.bool_reset_internet)
    self.listen_state(self.vacuum_event_handler, self.vacuum_jhadoo_pocha)
    
    self.call_service("notify/alexa_media", data = {"type":"tts", "method":"speak"}, target = self.kitchen_alexa, message = """                
    <speak>
       Hi, your Home Assistant is ready to rock and roll!
    </speak>
    """)

    #self.run_daily(self.reset_energy_meter, time(11, 59, 59))
    #self.run_hourly(self.play_music_entryway, time(datetime.now().hour, 0, 0))

    # EVERY HOUR
    self.run_every(self.solar_production_loss_alert, "now", 60 * 60, random_start = -5 * 60, random_end = 5 * 60)
    
    # EVERY 30 MINS
    #self.run_every(self.nas_hdd_error_alert, "now", 30 * 60, random_start = -3 * 60, random_end = 3 * 60)

    # EVERY 15 MINS
    self.run_every(self.internet_turn_on, "now", 15 * 60, random_start = -2 * 60, random_end = 2 * 60)

    # EVERY 5 MINS
    self.run_every(self.flume_water_alert, "now", 5 * 60, random_start = -1 * 60, random_end = 1 * 60)
    
    #self.solar_production_loss_alert(None)
    #self.flume_water_alert(None)
    

  def buzz_kitchen(self, entity, attribute, old, new, kwargs):
    if old == "off" and new == "on":
      self.log("HOME BUZZ")
      self.call_service("notify/alexa_media", data = {"type":"announce", "method":"all"}, target = self.kitchen_alexa, message = "Someone's calling you. Please pick up the phone or call them back immediately!")
      self.call_service("input_boolean/turn_off", entity_id = self.bool_buzz_home)
      
      
  def internet_reset(self, entity, attribute, old, new, kwargs):
    if old == "off" and new == "on":
      self.log("INTERNET RESET: INITIATE")
      self.call_service("input_boolean/turn_off", entity_id = self.bool_reset_internet)
      self.call_service("notify/alexa_media", data = {"type":"tts", "method":"speak"}, target = self.kitchen_alexa, message = """
      <speak>
        <amazon:emotion name="excited" intensity="high">
          Embrace yourself for total meltdown. Resetting the internet in 5 seconds!
        </amazon:emotion>
      </speak>
      """)
      
      self.run_in(self.internet_turn_off, 10)
      self.run_in(self.internet_turn_on, 15)


  def internet_turn_off(self, kwargs):
    self.log("INTERNET: TURN OFF")
    self.call_service("switch/turn_off", entity_id = self.garage_internet_switch)


  def internet_turn_on(self, kwargs):
    self.log("INTERNET: TURN ON")
    self.call_service("switch/turn_on", entity_id = self.garage_internet_switch)


  def vacuum_event_handler(self, entity, attribute, old, new, kwargs):
    if attribute == "state" and (old, new) in [("cleaning", "error")]:
      self.log("VACCUM ERROR HANDLER")
      self.call_service("vacuum/start", entity_id = self.vacuum_jhadoo_pocha)


  def nas_hdd_error_alert(self, kwargs):
    self.log("NAS HDD HEALTH EVALUATE")

    ubhinas_hdd_01_not_ok = self.get_state("sensor.ubhinas_smart_status_drive_0_1") != "OK"
    ubhinas_hdd_02_not_ok = self.get_state("sensor.ubhinas_smart_status_drive_0_2") != "OK"
    plexnas_hdd_01_not_ok = self.get_state("sensor.plexnas_smart_status_drive_0_1") != "OK"
    plexnas_hdd_02_not_ok = self.get_state("sensor.plexnas_smart_status_drive_0_2") != "OK"

    if any([ubhinas_hdd_01_not_ok, ubhinas_hdd_02_not_ok, plexnas_hdd_01_not_ok, plexnas_hdd_02_not_ok]):
      self.log("NAS HDD CRITIAL ERROR ALERT")

      self.call_service("notify/alexa_media", data = {"type":"tts", "method":"speak"}, target = self.kitchen_alexa, message = """
      <speak>
        <amazon:emotion name="excited" intensity="medium">
          Critical Emergency! One of the hard drives in your NASS has failed. Time is of the essence, immediate action is required!
        </amazon:emotion>
      </speak>
      """)

      for device in self.notification_devices:
        self.call_service(device, title = 'NAS HDD ALERT: CRITICAL', message = 'One of the hard drives in your NAS has failed. Time is of the essence, immediate action is required!')


  def solar_production_loss_alert(self, kwargs):
    
    solar_forecast = self.get_state("sensor.power_production_now")
    try: solar_forecast = float(solar_forecast)
    except ValueError: solar_forecast = 0

    if solar_forecast < 250: return

    self.log("SOLAR PRODUCTION LOSS EVALUATION")

    solar_production = self.get_state("sensor.powerwall_solar_now")
    try: solar_production = float(solar_production) * 1000
    except ValueError: solar_production = 0

    delta = solar_forecast - solar_production
    
    if delta > 500:
      self.log("WARNING: SOLAR PRODUCTION LOSS ALERT, NET LOSS " + str(delta) + "W")

      self.call_service("notify/alexa_media", data = {"type":"tts", "method":"speak"}, target = self.kitchen_alexa, message = """
      <speak>
        <amazon:emotion name="excited" intensity="medium">
          Warning. The solar production is significantly less than the anticipated forecast right now. Please inspect the system promptly!
        </amazon:emotion>
      </speak>
      """)
      for device in self.notification_devices:
        self.call_service(device, title = 'WARNING: SOLAR PRODUCTION', message = 'Warning. The solar production is significantly less than the anticipated forecast right now. Please inspect the system promptly!')


  def flume_water_alert(self, kwargs):
    
    high_flow_alert = self.get_state("binary_sensor.flume_sensor_home_high_flow")
    leak_detected_alert = self.get_state("binary_sensor.flume_sensor_home_leak_detected")

    self.log("FLUME WATER SENSOR EVALUATION")

    if high_flow_alert == "on":
      self.log("EMERGENCY: WATER, HIGH FLOW")
      self.call_service("notify/alexa_media", data = {"type":"tts", "method":"speak"}, target = self.kitchen_alexa, message = """
      <speak>
        <amazon:emotion name="excited" intensity="medium">
          Emergency. High water flow was detected by the Flume sensor. Please take immediate corrective action!
        </amazon:emotion>
      </speak>
      """)
      for device in self.notification_devices:
        self.call_service(device, title = 'EMERGENCY: WATER, HIGH FLOW', message = 'Emergency. High water flow was detected by the Flume sensor. Please take immediate corrective action!')

    if leak_detected_alert == "on":
      self.log("WARNING: WATER, LEAK DETECTED")
      self.call_service("notify/alexa_media", data = {"type":"tts", "method":"speak"}, target = self.kitchen_alexa, message = """
      <speak>
        <amazon:emotion name="excited" intensity="medium">
          Warning. A water leak has been detected by the Flume sensor. Please check the system promptly!
        </amazon:emotion>
      </speak>
      """)
      for device in self.notification_devices:
        self.call_service(device, title = 'WARNING: WATER, LEAK DETECTED', message = 'Warning. A water leak has been detected by the Flume sensor. Please check the system promptly!')

    

  # def reset_energy_meter(self, kwargs):
  #   date = datetime.now()
  #   if date.month == 10 and date.day == 18:
  #     self.call_service("zwave_js/reset_meter", node_id = 116)
  #     self.log("ENERGY SURPLUS PG&E: RESET METER")


  # def play_music_entryway(self, kwargs):
  #   self.log("ENTRYWAY_MUSIC_PLAY")
  #   self.call_service("media_player/media_play", entity_id = self.alexa_entryway)
  #   pass
  

  #  def set_guest_volume_high(self, kwargs):
  #    self.call_service("media_player/volume_set", entity_id = self.door_alexa, volume_level = .99)
  #    self.log("GUEST VOLUME HIGH")


  #  def set_guest_volume_low(self, kwargs):
  #    self.call_service("media_player/volume_set", entity_id = self.door_alexa, volume_level = .40)
  #    self.log("GUEST VOLUME LOW")
