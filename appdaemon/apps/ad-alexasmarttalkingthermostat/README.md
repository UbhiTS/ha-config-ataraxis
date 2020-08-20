# Alexa (& Friends) Smart Talking Thermostat :chicken: <img src="https://poa5qzspd7.execute-api.us-east-1.amazonaws.com/live/hypercounterimage/dbdaff78525947ce9e52c1047b695968/counter.png">

[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg)](https://github.com/custom-components/hacs)

## New in Version 2.0
**Notifications Schedule, Power Backup Guard**: apps.yaml configuration breaking changes, please read the documentation to fix for v2. 

Alexa (or other Smart Speakers) become the voice for your thermostat. Take control of your thermostat like never before. Extremely "Street Smart"!
- **Your Thermostat Speaks What It's Doing**: **Alexa & HA together are :gem:Awesome!:gem:**
- **Notifications**: Your thermostat speaks only when you want it to. This is handy specially at night when your kids are sleeping and you want things to be quiet
- **Enforce Temp Limits**: your guests (or kids) can't crank up the heat :hotsprings: or cold :snowflake:, saving you :dollar::dollar::dollar:
- **Daily Shut Off**: no more forgetting to turn off the thermostat and let it run whole day while you are away 
- **Enforce Fan Mode Auto**: Does not allow your fan to aimlessly be on, this can be used with the Air Cycle Feature to get the best of both worlds, save :dollar::dollar::dollar: and cycle air
- **Air Cycle Feature**: Cycles air at the defined interval between the rooms in your house. If you have temp difference in rooms in your house, or a room has stagnant air, and just smells funny :trollface:, this will solve it!
kids :girl::girl: ;)
- **Open Door/Window Shut Off**: AC turns off if a door :door: or window :city_sunrise: is left open for 60 seconds. Works specially well with your 
- **Power Backup Guard**: AC turns off if the mains utility grid goes offline and your home is running on battery backup (Tesla Powerwall)

Ever since we've set this up in our home, we cannot imaging our home without it. Your home suddenly gets a voice, something like Jarvis ... Awesome! 

Please ⭐ this repo if you like my work and also check out my other repos like
- [Home Assistant 'STEROIDS' Configuration](https://github.com/UbhiTS/ha-config-ataraxis)
- [Alexa (& Friends) Talking Clock](https://github.com/UbhiTS/ad-alexatalkingclock)
- [Alexa (& Friends) Doorbell](https://github.com/UbhiTS/ad-alexadoorbell)
- [Alexa (& Friends) Door/Window Announce](https://github.com/UbhiTS/ad-alexadoorwindowannounce)
- [Alexa (& Friends) Smart Talking Thermostat](https://github.com/UbhiTS/ad-alexasmarttalkingthermostat)
- [Auto 'Crappy Internet' Rebooter](https://github.com/UbhiTS/ad-autointernetrebooter)

Also, if you want to see a walkthrough of my Home Assistant configuration, I have my video walkthrough on youtube below
- [Home Automation on 'STEROIDS' : Video Walkthrough](https://youtu.be/qqktLE9_45A)

## Installation
**Needs the [Alexa Media Player or Sonos](https://github.com/custom-components/alexa_media_player) integration**

Use [HACS](https://github.com/custom-components/hacs) or [download](https://github.com/UbhiTS/ad-alexasmarttalkingthermostat) the `alexa_smart_talking_thermostat.py` from inside the `apps` directory to your local `apps` directory, and add the following configuration to enable the app.

## App Configuration (config/appdaemon/apps/apps.yaml)
```yaml
hvac_master_bedroom:
  module: alexa_smart_talking_thermostat
  class: AlexaSmartTalkingThermostat
  thermostat: climate.thermostat_master_bedroom_mode
  hvac_limits:
    cooling_min: 67
    heating_max: 72
    daily_shutoff: "08:00:00"
    enforce_fan_auto_mode: True
  # OPTIONAL
  notifications:
    speaker: media_player.master_bedroom_alexa
    start_time: "08:00:00"
    end_time: "21:30:00"
  # OPTIONAL
  doors_windows: 
    - binary_sensor.master_bedroom_door
    - binary_sensor.master_bedroom_window
  # OPTIONAL
  air_recirculation:
    hour: true
    half_hour: true
    quarter_hour: false
    minute_offset: 0
    duration: 1
  # OPTIONAL
  power_backup_guard:
    grid_status_sensor: binary_sensor.grid_status
  debug: false
```

key | description
-- | --
`module` | The module name of the app
`class` | The name of the Class
`thermostat` | Your climate entity (Thermostat) to connect with the app
`hvac_limits\|cooling_min` | **Nobody** can set the cooling temperature below this threshold. **$$$ :moneybag:** Hurray!
`hvac_limits\|heating_max` | **Nobody** can set the heating temperature above this threshold. **$$$ :moneybag:** Yaaaay!
`hvac_limits\|daily_shutoff` | **Shuts off** your thermostat **"everyday" at this time**. Recommend 8 AM. This is in 24 hour format ("08:00:00")
`hvac_limits\|enforce_fan_auto_mode` | Does not allow your fan **aimlessly** be on, this can be **used with the Air Cycle Feature** to get the best of both worlds, save $$$ and consistent air throughout your house
`notifications\speaker` | Your Alexa to connect with the app
`notifications\start_time` | Notifications start time
`notifications\end_time` | Notifications end time
`doors_windows` | If you have door/window sensors in the same room, connect them here so the thermostat will **shut off** if they are **open** for more than **60 seconds**
`air_recirculation\|hour` | Cycles air every hour. Turns on **just the fan**. Very handy to control stagnant air and temperature difference in your home! 
`air_recirculation\|half_hour` | Cycles every 30 mins
`air_recirculation\|quarter_hour` | Cycles every 15 mins
`air_recirculation\|minute_offset` | If you want different thermostats in your house to **cycle** at **different times**, set the offset. E.g. MasterBedroom to 1, LivingRoom to 7, Kitchen to 15 etc 
`air_recirculation\|duration` | how many minutes to cycle the air.
`power_backup_guard\grid_status_sensor` | Grid status sensor. If you do not have that, you can omit this section completely
`debug` | if True, outputs messages to the AppDaemon Log

## Thank you! :raised_hands:
This app wouldn't be possible without the amazing work done by the developers and community at **[Home Assistant](https://www.home-assistant.io/)**, and of Keaton Taylor and Alan Tse on their **Alexa Media Player integration** for Home Assistant. *https://github.com/custom-components/alexa_media_player*

If you like my work and feel gracious, you can buy me a beer below ;)

<a href="https://www.buymeacoffee.com/ubhits" target="_blank">
<img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png"
     alt="Buy Me A Beer" 
     style="height:41px !important; width:174px !important;" />
</a>

# License
[Apache-2.0](LICENSE). By providing a contribution, you agree the contribution is licensed under Apache-2.0. This is required for Home Assistant contributions.
