# Alexa (& Friends) Door/Window Announce :chicken: <img src="https://poa5qzspd7.execute-api.us-east-1.amazonaws.com/live/hypercounterimage/7d054a64bdc14763b3e85eedc56773a4/counter.png" />

[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg)](https://github.com/custom-components/hacs)

## New in v1.0.6: Door/Window Open Delay, and Close Announcement Control

Alexa and other smart speakers (media_player) announce your doors/windows opening and closing. Comes in handy specially for garage doors or side/main exits for homes and shops where you need to stay informed of any changes. Trust me, it's a secured feeling to know the status of your garage, main/side exits. 

Ever since we've set this up in our home, we don't think we can do without it now. Your home suddenly gets a voice, something like Jarvis ... Awesome! 

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
    delay: "00:00:00"
    close: True
    start_time: "00:00:00"
    end_time: "23:59:59"
```

key | optional | type | default | description
-- | -- | -- | -- | --
`module` | **False** | string |  | The module name of the app.
`class` | **False** | string |  | The name of the Class.
`alexas` | **False** | list |  | Your smart speaker device(s) to target for the door/window announcements.
`door_windows` | **False** | cover, binary_sensor |  | The doors/windows to monitor.
`announcements\|delay` | True | time | 00:00:00 | The time duration to wait before announcing a door open (24h format). Useful to notify if a door has been open for a long time.
`announcements\|close` | True | bool | True | Announce the closing of the door. Set to False if you just want opening announcements.
`announcements\|start_time` | True | time | 00:00:00 | The time to enable the service. (24h format)
`announcements\|end_time` | True | time | 23:59:59 | The time to disable the service. (24h format)

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
