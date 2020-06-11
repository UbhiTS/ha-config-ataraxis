# Alexa (& Friends) Doorbell :chicken: <img src="https://poa5qzspd7.execute-api.us-east-1.amazonaws.com/live/hypercounterimage/e504a75b4c784b799031c4d8e1d8b6a5/counter.png" />

[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg)](https://github.com/custom-components/hacs)

## New in v1.0.9 : Master Doorbell Switch Override :)

### For Sonos, set announce_bell:false (thanks to @5and0)

Alexa and other smart speakers will notify you like a doorbell, (thus the name, so creative isn't it!) based on a motion sensor placed on your doorway. Ever since we've set this up in our home, we always get praises and surprised looks from our guests when they come. Your home suddenly gets a voice, something like Jarvis ... Awesome! 

You can also :- 
- add a door sensor (like the [Ecolink Door Sensor](https://www.amazon.com/Aeotec-Window-Contact-sensors-Battery/dp/B07PDDX3K6/ref=sr_1_16?dchild=1&keywords=eco+wave+door+sensor&qid=1587791320&s=electronics&sr=1-16) or any other) to only ring the bell if the door is currently closed, and has been closed for at least the last 30 seconds. This is so that the bell only rings when someone arrives at your door and not when you step out.
- add an outdoor Alexa (or other smart speaker) to greet your guest with a pleasant message based on the time of day
- add a doorbell (like the [Aeotec Doorbell](https://aeotec.com/z-wave-doorbell/) or any other) to ring when a guest arrives outside your door

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

Use [HACS](https://github.com/custom-components/hacs) or [download](https://github.com/UbhiTS/ad-alexadoorbell) the `alexa_doorbell.py` from inside the `apps` directory to your local `apps` directory, and add the configuration to enable the app.

### Basic Config (config/appdaemon/apps/apps.yaml)
```yaml
alexa_doorbell:
  module: alexa_doorbell
  class: AlexaDoorbell
  door:
    motion_sensor: binary_sensor.main_door_motion
  home:
    alexa: media_player.kitchen_alexa
    announce_bell: True # optional, set to False for SONOS
  time:
    start: "07:00:00"
    end: "22:00:00"
```

### Advanced Config
```yaml
alexa_doorbell:
  module: alexa_doorbell
  class: AlexaDoorbell
  door:
    motion_sensor: binary_sensor.main_door_motion
    sensor: binary_sensor.main_door          # optional
    alexa: media_player.entryway_alexa       # optional
    announce_bell: False                     # optional
    bell_switch: switch.doorbell_switch      # optional
  home:
    alexa: media_player.kitchen_alexa
    doorbell: switch.living_room_doorbell    # optional
    announce_bell: False                     # optional
  time:
    start: "07:00:00"
    end: "22:00:00"
  debug: false
```

key | optional | type | default | description
-- | -- | -- | -- | --
`module` | **False** | string | alexa_doorbell | The module name of the app.
`class` | **False** | string | AlexaDoorbell | The name of the Class.
`door\|motion_sensor` | **False** | motion_sensor |  | The motion sensor to trigger the app.
`door\|sensor` | True | binary_sensor |  | Set to trigger based on door status
`door\|alexa` | True | media_player |  | Set your Alexa (or other Smart Speaker) to greet your guest with a pleasant greeting
`door\|announce_bell` | True | bool | False | Prefix bell sound before announcement. Set to false for SONOS
`door\|bell_switch` | True | switch |  | Set to a switch to override all checks and ring the doorbell when it's pressed
`home\|alexa` | **False** | media_player |  | The Alexa (or other smart speaker) to notify inside the house
`home\|announce_bell` | True | bool | False | Prefix bell sound before announcement. Set to false for SONOS
`home\|doorbell` | True | switch |  | Set to ring this doorbell (or switch on a light) 
`time\|start` | True | time | 07:00:00 | The time to enable the service. (24h format)
`time\|end` | True | time | 22:00:00 | The time to disable the service. (24h format)
`debug` | True | bool | False | if True, outputs messages to the AppDaemon Log

## Thank you! :raised_hands:
This app wouldn't be possible without the amazing work done by the developers and community at **[Home Assistant](https://www.home-assistant.io/)**

A very special thanks to **Keaton Taylor** and **Alan Tse** whose work on **[Alexa Media Player](https://github.com/custom-components/alexa_media_player)** was the basis of my inspiration and my work to code all the above listed apps!

If you like my work and feel gracious, you can buy me a beer below ;)

<a href="https://www.buymeacoffee.com/ubhits" target="_blank">
<img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png"
     alt="Buy Me A Beer" 
     style="height:41px !important; width:174px !important;" />
</a>

# License
[Apache-2.0](LICENSE). By providing a contribution, you agree the contribution is licensed under Apache-2.0. This is required for Home Assistant contributions.
