import appdaemon.plugins.hass.hassapi as hass
import datetime
 
#
# Alexa Talking Clock AppDeamon App for Home Assistant
# Developed by @UbhiTS on GitHub
#
#alexa_talking_clock:
#  module: alexa_talking_clock
#  class: AlexaTalkingClock
#  alexas:
#    - media_player.bedroom_alexa
#    - media_player.kitchen_alexa
#  voice:
#    volume_offset: 0 # -40 to 4, default 0
#    pitch_offset: 0 # -33 to 50, default 0
#    rate: 100 # 20 to 250, default 100
#    whisper: false
#  announcements:
#    bell: true
#    start_time: "07:30:00"
#    end_time: "21:30:00"
#    half_hour: true
#    quarter_hour: true
#  debug: false

class AlexaTalkingClock(hass.Hass):

  def initialize(self):
    
    self.alexas = self.args["alexas"]
    
    self.volume_offset = 0
    self.pitch_offset = 0
    self.rate = 100
    self.whisper = False
    
    self.announce_bell = True
    self.start_hour = 7
    self.start_minute = 30
    self.end_hour = 21
    self.end_minute = 30
    self.announce_hour = True
    self.announce_half_hour = True
    self.announce_quarter_hour = False
    self.debug = False
    
    if "voice" in self.args:
      self.volume_offset = int(self.args["voice"]["volume_offset"]) if "volume_offset" in self.args["voice"] else self.volume_offset
      self.pitch_offset = int(self.args["voice"]["pitch_offset"]) if "pitch_offset" in self.args["voice"] else self.pitch_offset
      self.rate = int(self.args["voice"]["rate"]) if "rate" in self.args["voice"] else self.rate
      self.whisper = bool(self.args["voice"]["whisper"]) if "whisper" in self.args["voice"] else self.whisper

    if "announcements" in self.args:
      self.announce_bell = bool(self.args["announcements"]["bell"]) if "bell" in self.args["announcements"] else self.announce_bell
      self.start_hour = int(self.args["announcements"]["start_time"].split(':')[0]) if "start_time" in self.args["announcements"] else self.start_hour
      self.start_minute = int(self.args["announcements"]["start_time"].split(':')[1]) if "start_time" in self.args["announcements"] else self.start_minute
      self.end_hour = int(self.args["announcements"]["end_time"].split(':')[0]) if "end_time" in self.args["announcements"] else self.end_hour
      self.end_minute = int(self.args["announcements"]["end_time"].split(':')[1]) if "end_time" in self.args["announcements"] else self.end_minute
      self.announce_half_hour = bool(self.args["announcements"]["half_hour"]) if "half_hour" in self.args["announcements"] else self.announce_half_hour
      self.announce_quarter_hour = bool(self.args["announcements"]["quarter_hour"]) if "quarter_hour" in self.args["announcements"] else self.announce_quarter_hour

    self.debug = bool(self.args["debug"]) if "debug" in self.args else self.debug
    
    if self.pitch_offset < -33: self.pitch_offset = -33
    if self.pitch_offset > 50: self.pitch_offset = 50
    if self.volume_offset < -40: self.volume_offset = -40
    if self.volume_offset > 4: self.volume_offset = 4
    if self.rate < 20: self.rate = 20
    if self.rate > 250: self.rate = 250
    
    self.run_in(self.configure, 5)
    
    
  def configure(self, kwargs):
    
    self.frequency = self.get_frequency()
    self.next_start = self.get_next_start()
    
    self.run_every(self.time_announce, self.next_start, (60 * self.frequency.interval))
    
    log_message = f"INITIALIZED: " + \
      f"Start [{str(self.start_hour).zfill(2)}:{str(self.start_minute).zfill(2)}], " + \
      f"End [{str(self.end_hour).zfill(2)}:{str(self.end_minute).zfill(2)}], " + \
      f"Next [{str(self.next_start.strftime('%H:%M'))}], " + \
      f"Freq {str(self.frequency.announce_times)}"
    self.log(log_message)

    if self.debug: self.time_announce(None)
    
    
  def get_frequency(self):
    
    frequency = Frequency()
    
    if (self.announce_hour):
      frequency.interval = 60
      frequency.announce_times.append(0)
    
    if (self.announce_half_hour):
      frequency.interval = 30
      frequency.announce_times.append(0)
      frequency.announce_times.append(30)
      
    if (self.announce_quarter_hour):
      frequency.interval = 15
      frequency.announce_times.append(0)
      frequency.announce_times.append(15)
      frequency.announce_times.append(30)
      frequency.announce_times.append(45)
    
    frequency.announce_times = set(frequency.announce_times)
    frequency.announce_times = sorted(frequency.announce_times)
    
    return frequency


  def get_next_start(self):
    
    now = datetime.datetime.now()
    next_start_min = None
    
    for min in self.frequency.announce_times:
      if now.minute < min:
        next_start_min = min
        break
    
    if next_start_min is None:
      next = now.replace(minute = 0, second = 0) + datetime.timedelta(hours=1)
    else:
      next = now.replace(minute = next_start_min, second = 0)
    
    return next


  def time_announce(self, kwargs):
    now = datetime.datetime.now()
    time_speech = self.get_time_speech(now.hour, now.minute)
    
    if time_speech is not None:
      effects_speech = self.set_effects(time_speech)
      seconds = 0
      for alexa in self.alexas:
        self.run_in(self.announce_time, seconds, alexa = alexa, time_speech = time_speech, effects_speech = effects_speech)
        seconds = seconds + 5

  def announce_time(self, kwargs):
    alexa = kwargs['alexa']
    announce = "announce"
    method = "all"
    time_speech = kwargs['time_speech']
    effects_speech = kwargs['effects_speech']
    
    title = "Home Assistant: Alexa Talking Clock"
    message = time_speech
    
    if self.announce_bell == False:
      # no change in home screen
      announce = "tts"
      method = "all"
    
    if self.whisper or self.volume_offset != 0 or self.pitch_offset != 0 or self.rate != 100:
      # goes to a blank announcement screen and back
      method = "speak"
      message = effects_speech
      
    self.call_service("notify/alexa_media", data = {"type": announce, "method": method}, target = alexa, title = title, message = message)
    self.log(f"TIME_ANNOUNCE {time_speech}: {alexa.split('.')[1]}")
    

  def set_effects(self, time_speech):
    prefix = "<speak>"
    postfix = "</speak>"
    
    if self.whisper:
      prefix = prefix + "<amazon:effect name='whispered'>"
      postfix = "</amazon:effect>" + postfix

    str_rate = str(self.rate)
    str_pitch = "+" + str(self.pitch_offset) if self.pitch_offset >= 0 else str(self.pitch_offset)
    str_volume = "+" + str(self.volume_offset) if self.volume_offset >= 0 else str(self.volume_offset)
  
    prefix = prefix + "<prosody rate='" + str_rate + "%' pitch='" + str_pitch + "%' volume='" + str_volume + "dB'>"
    postfix = "</prosody>" + postfix
      
    return prefix + time_speech + postfix


  def get_time_speech(self, hour, minute):
    
    prefix = ""
    postfix = ""
    time_speech = ""
    
    if not self.debug:
      if hour < self.start_hour or hour > self.end_hour:
        return
      if hour == self.start_hour and minute < self.start_minute:
        return
      if hour == self.end_hour and minute > self.end_minute:
        return

    ampm_str = "AM" if hour <= 11 else "PM"
    
    if hour == self.start_hour and minute == self.start_minute and hour <= 11:
      prefix = "Good morning."
    elif hour == 12 and minute == 0:
      prefix = "Good afternoon."
    elif hour == 17 and minute == 0:
      prefix = "Good evening."
    elif hour == self.end_hour and minute == self.end_minute and hour >= 20:
      postfix = "Good night. And sweet dreams."
      
    hour = hour - 12 if hour > 12 else hour
  
    if minute == 0:
      time_speech = f"It's {hour} {ampm_str}."
    else:
      time_speech = f"It's {hour}:{minute:02d} {ampm_str}."
    
    return prefix + " " + time_speech + " " + postfix


class Frequency:
  
    def __init__(self):
      
        self.announce_times = []
        self.interval = None
