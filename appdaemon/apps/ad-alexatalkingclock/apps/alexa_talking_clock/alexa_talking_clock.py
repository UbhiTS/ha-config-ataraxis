import appdaemon.plugins.hass.hassapi as hass
from datetime import datetime, time, timedelta
import calendar
 
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
#  reminders: 
#    # daily
#    - schedule: "daily, 07:30:00" 
#      reminder: "Good morning. Today is {day}, {date}, and it's {time}."
#    - schedule: "daily, 12:00:00"
#      reminder: "Good afternoon. Today is {day}, {date}, and it's {time}."
#    - schedule: "daily, 17:00:00"
#      reminder: "Good evening. It's {time}."
#    - schedule: "daily, 21:30:00"
#      reminder: "It's {time}. Good night. And sweet dreams."
#    
#    # weekdays
#    - schedule: "weekdays, 09:30:00"
#      reminder: "It's {time}. Quick reminder. Did you go to gym today?"
#      
#    # weekends
#    - schedule: "weekends, 09:30:00"
#      reminder: "It's {time}. Question. Are you planning to go for a run or a hike today?"
#      
#    # mon, tue, wed, thu, fri, sat, sun
#    - schedule: "wed, 09:30:00"
#      reminder: "It's {time}. What day is it? It's Hump Day! Yaaaay!"
#    - schedule: "fri, 04:30:00"
#      reminder: "The weekend is almost here. Better plan it now, or waste it forever!"
#  debug: false

class AlexaTalkingClock(hass.Hass):

  def initialize(self):
    
    self.alexas = self.args["alexas"]
    
    self.volume_offset = 0
    self.pitch_offset = 0
    self.rate = 100
    self.whisper = False
    
    self.announce_bell = True
    self.time_start = datetime.strptime("07:30:00", '%H:%M:%S').time()
    self.time_end = datetime.strptime("21:30:00", '%H:%M:%S').time()
    self.announce_hour = True
    self.announce_half_hour = True
    self.announce_quarter_hour = False
    self.default_speech = "It's {time}."
    self.reminders = None
    self.debug = False
    
    if "voice" in self.args:
      self.volume_offset = int(self.args["voice"]["volume_offset"]) if "volume_offset" in self.args["voice"] else self.volume_offset
      self.pitch_offset = int(self.args["voice"]["pitch_offset"]) if "pitch_offset" in self.args["voice"] else self.pitch_offset
      self.rate = int(self.args["voice"]["rate"]) if "rate" in self.args["voice"] else self.rate
      self.whisper = bool(self.args["voice"]["whisper"]) if "whisper" in self.args["voice"] else self.whisper

    if "announcements" in self.args:
      self.announce_bell = bool(self.args["announcements"]["bell"]) if "bell" in self.args["announcements"] else self.announce_bell
      self.time_start = datetime.strptime(self.args["announcements"]["start_time"], '%H:%M:%S').time() if "start_time" in self.args["announcements"] else self.time_start
      self.time_end = datetime.strptime(self.args["announcements"]["end_time"], '%H:%M:%S').time() if "end_time" in self.args["announcements"] else self.time_end
      self.announce_half_hour = bool(self.args["announcements"]["half_hour"]) if "half_hour" in self.args["announcements"] else self.announce_half_hour
      self.announce_quarter_hour = bool(self.args["announcements"]["quarter_hour"]) if "quarter_hour" in self.args["announcements"] else self.announce_quarter_hour
      self.default_speech = self.args["announcements"]["default_speech"] if "default_speech" in self.args["announcements"] else self.default_speech

    if "reminders" in self.args:
     self.reminders = self.args["reminders"]
      
    self.debug = bool(self.args["debug"]) if "debug" in self.args else self.debug
    
    if self.pitch_offset < -33: self.pitch_offset = -33
    if self.pitch_offset > 50: self.pitch_offset = 50
    if self.volume_offset < -40: self.volume_offset = -40
    if self.volume_offset > 4: self.volume_offset = 4
    if self.rate < 20: self.rate = 20
    if self.rate > 250: self.rate = 250
    
    self.run_in(self.configure, 0)
    
    
  def configure(self, kwargs):
    
    self.frequency = self.get_frequency()
    self.next_start = self.get_next_start()
    
    self.run_every(self.time_announce, self.next_start, (60 * self.frequency.interval))
    
    log_message = f"\n**** INIT - ALEXA TALKING CLOCK ****\n" + \
      f"  START     {self.time_start.strftime('%H:%M')}\n" + \
      f"  END       {self.time_end.strftime('%H:%M')}\n" + \
      f"  NEXT      {str(self.next_start.strftime('%H:%M'))}\n" + \
      f"  FREQUENCY {str(self.frequency.announce_times)}\n"
    self.debug_log(log_message)

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
    
    now = datetime.now()
    next_start_min = None
    
    for min in self.frequency.announce_times:
      if now.minute < min:
        next_start_min = min
        break
    
    if next_start_min is None:
      next = now.replace(minute = 0, second = 0) + timedelta(hours=1)
    else:
      next = now.replace(minute = next_start_min, second = 0)
    
    return next


  def time_announce(self, kwargs):
    now = datetime.now().replace(second = 0, microsecond=0)
    
    if not self.debug and self.time_outside_range(now.time(), self.time_start, self.time_end): return
    
    time_speech = self.get_time_speech(now)
    effects_speech = self.set_effects(time_speech)
    delay = 0
    for alexa in self.alexas:
      self.run_in(self.time_announce_alexa, delay, alexa = alexa, time_speech = time_speech, effects_speech = effects_speech)
      delay = delay + 5


  def time_announce_alexa(self, kwargs):
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
    self.debug_log(f"TIME_ANNOUNCE {time_speech}: {alexa.split('.')[1]}")
    

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


  def get_time_speech(self, now):
    
    hour = now.hour;
    minute = now.minute
    second = now.second
    weekday = now.weekday() # monday = 0, sunday = 6
    day_name = calendar.day_name[weekday].lower()
    day_abbr = calendar.day_abbr[weekday].lower()
    
    schedule_now = ["daily", day_name, day_abbr, "weekdays" if weekday <= 4 else "weekends"] # daily, weekdays, weekends, mon, tue, wed, thu, fri, sat, sun
    speech = ""
    
    if self.reminders:
      for reminder in self.reminders:
        schedule = [x.strip().lower() for x in reminder["schedule"].split(',')]
        if schedule[0] in schedule_now:
          if datetime.strptime(schedule[1], '%H:%M:%S').time() == time(hour, minute, second):
            speech += " " + reminder["reminder"]
    
    date_str = now.strftime("%d %B")
    
    ampm_str = "AM" if hour <= 11 else "PM"
    hour = hour - 12 if hour > 12 else hour
    time_str = f"{hour} {ampm_str}" if minute == 0 else f"{hour}:{minute:02d} {ampm_str}"
    
    speech = self.default_speech if speech == "" else speech
    
    return speech.replace("{day}", day_name).replace("{date}", date_str).replace("{time}", time_str)


  # https://stackoverflow.com/questions/20518122/python-working-out-if-time-now-is-between-two-times
  def time_outside_range(self, now, start, end):
    
    result = True
    
    if start <= end: result = start <= now <= end
    else: result = start <= now or now <= end # over midnight e.g., 23:30-04:15
    
    return not result


  def debug_log(self, message):
    if self.debug:
      self.log(message)


class Frequency:
  
    def __init__(self):
      
        self.announce_times = []
        self.interval = None
