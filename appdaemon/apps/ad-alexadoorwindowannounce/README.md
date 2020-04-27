# Alexa (& Sonos) Door/Window Announce : AppDaemon (HASS) :chicken:

[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg)](https://github.com/custom-components/hacs)

Alexa announces your doors/windows opening and closing. Comes in handy specially for garage doors or side/main exits for homes and shops where you need to stay informed of any changes. Trust me, it's a secured feeling to know the status of your garage, main/side exits. 

Ever since we've set this up in our home, we don't think we can do without it now. Your home suddenly gets a voice, something like Jarvis ... Awesome! 

Please ⭐ this repo if you like my work and also check out my other repos like
- [Home Assistant 'STEROIDS' Configuration](https://github.com/UbhiTS/ha-config-ataraxis)
- [Alexa (& Sonos) Talking Clock](https://github.com/UbhiTS/ad-alexatalkingclock)
- [Alexa (& Sonos) Doorbell](https://github.com/UbhiTS/ad-alexadoorbell)
- [Alexa (& Sonos) Door/Window Announce](https://github.com/UbhiTS/ad-alexadoorwindowannounce)
- [Alexa (& Sonos) Smart Talking Thermostat](https://github.com/UbhiTS/ad-alexasmarttalkingthermostat)
- [Auto 'Crappy Internet' Rebooter](https://github.com/UbhiTS/ad-autointernetrebooter)

Also, if you want to see a walkthrough of my Home Assistant configuration, I have my video walkthrough on youtube below
- [Home Automation on 'STEROIDS' : Video Walkthrough](https://youtu.be/qqktLE9_45A)

## Installation
**NEEDS THE [Alexa Media Player](https://github.com/custom-components/alexa_media_player) HACS Integration from Keaton Taylor and Alan Tse**

Use [HACS](https://github.com/custom-components/hacs) or [download](https://github.com/UbhiTS/ad-alexadoorwindowannounce) the `alexa_door_window_announce.py` from inside the `apps` directory to your local `apps` directory, and add the following configuration to enable the app.

## App Configuration (config/appdaemon/apps/apps.yaml)
```yaml
alexa_door_window_announce:
  module: alexa_door_window_announce
  class: AlexaDoorWindowAnnounce
  alexas:
    - media_player.kitchen_alexa
    - media_player.living_room_alexa
  doors_windows:
    - cover.garage_door_big
    - cover.garage_door_small
    - binary_sensor.main_door
    - binary_sensor.side_door
  announcements:
    start_time: "00:00:00"
    end_time: "23:59:59"
```

key | optional | type | default | description
-- | -- | -- | -- | --
`module` | **False** | string |  | The module name of the app.
`class` | **False** | string |  | The name of the Class.
`alexas` | **False** | list |  | The Alexa device(s) to target for the door/window announcements.
`door_windows` | **False** | cover, binary_sensor |  | The doors/windows to monitor.
`announcements\|start_time` | True | time | 00:00:00 | The time to enable the service. (24h format)
`announcements\|end_time` | True | time | 23:59:59 | The time to disable the service. (24h format)

## Thank you!
This app wouldn't be possible without the amazing work done by the developers and community at **[Home Assistant](https://www.home-assistant.io/)**

If you like my work and feel gracious, you can buy me a beer below ;)

<a href="https://www.buymeacoffee.com/ubhits" target="_blank">
<img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png"
     alt="Buy Me A Beer" 
     style="height:41px !important; width:174px !important;" />
</a>

# License
[Apache-2.0](LICENSE). By providing a contribution, you agree the contribution is licensed under Apache-2.0. This is required for Home Assistant contributions.
