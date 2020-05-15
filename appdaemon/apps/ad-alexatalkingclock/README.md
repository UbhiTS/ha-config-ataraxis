# Alexa (& Friends) Talking Clock :chicken: <img src="https://poa5qzspd7.execute-api.us-east-1.amazonaws.com/live/hypercounterimage/68f7d9511bb4405d9dd2b34615a45ae1/counter.png" />

[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg)](https://github.com/custom-components/hacs)

## New in v2.0.0: 
### Sonos Support: Set bell:false and remove the voice effects section (kudos to @5and0)
### Multiple Speakers, Whisper, Pitch, Volume, Rate and Bell Controls

NOTE: :boom:**Please update your apps.yaml with the new configuration structure**:boom:

Amazon Alexa, Google Home, Sonos (or other smart speakers) will keep on reminding you of the time from morning till night and also courteously greet with a good morning, good afternoon, and a good night & sweet dreams all without you having to lift a finger (or speak a word). Sweet!

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

Use [HACS](https://github.com/custom-components/hacs) or [download](https://github.com/UbhiTS/HASS-AlexaTalkingClock/tree/master/apps/alexa_talking_clock) the `alexa_talking_clock.py` from inside the `apps` directory to your local `apps` directory, and add the following configuration to enable the app.

## App Configuration (config/appdaemon/apps/apps.yaml)

```yaml
alexa_talking_clock:
  module: alexa_talking_clock
  class: AlexaTalkingClock
  alexas:
    - media_player.bedroom_alexa
    - media_player.kitchen_alexa
  announcements:
    bell: true # for SONOS, set to False
    start_time: "07:30:00"
    end_time: "21:30:00"
    half_hour: true
    quarter_hour: true
  voice: # for SONOS, remove this section
    volume_offset: 0 # -40 to 4, default 0
    pitch_offset: 0 # -33 to 50, default 0
    rate: 100 # 20 to 250, default 100
    whisper: false
  debug: false
```

key | optional | type | default | description
-- | -- | -- | -- | --
`module` | False | string | alexa_talking_clock | The module name of the app.
`class` | False | string | AlexaTalkingClock | The name of the Class.
`alexas` | True | list | # alexa_media_players # | The Alexa (or Sonos) to target for the time reminder speech.
`announcements\|bell` | True | bool | True | Enable or disable the Alexa announcement bell before the time speech. For Sonos set to False
`announcements\|start_time` | True | time | 07:30 | The time to start announcements. This is in 24h format.
`announcements\|end_time` | True | time | 21:30 | The time to end announcements. This is in 24h format.
`announcements\|half_hour` | True | bool | True | Announce every half hour (It's 8 AM, It's 8:30 AM, It's 9 AM)
`announcements\|quarter_hour` | True | bool | False | Announce every 15 minutes (It's 8 AM, It's 8:15 AM, It's 8:30 AM, It's 8:45 AM, It's 9 AM)
`voice\|volume_offset` | True | int | 0 | Set between -40 and 4. Default 0
`voice\|pitch_offset` | True | int | 0 | Set between -33 and 50. Default 0
`voice\|rate` | True | int | 100 | Set between 20 to 250. Default 100
`voice\|whisper` | True | bool | False | Whisper Mode. Set "Bell" to False and "Rate" to 50 for a creepy time announcement 
`debug` | True | bool | False | Announces time instantly when you save the apps.yaml. Also, when set, will not honor start and end times and speak throughout the day and night

## Thank you for your time! (get it ;) :raised_hands:
This app was a result of my amazing wife's request (who is a mother of 2 beautiful princesses BTW) to help her manage her time wisely ;). So this is dedicated to my wife Reena, without whom this world would not be worth my time :) 

This also wouldn't be possible without the amazing work done by the developers and community at **[Home Assistant](https://www.home-assistant.io/)**

A very special thanks to **Keaton Taylor** and **Alan Tse** whose work on **[Alexa Media Player](https://github.com/custom-components/alexa_media_player)** was the basis of my inspiration and my work to code all the above listed apps!

Ever since we've set this up in our home, it has become an indispensable part of our lives. It's amazing to see how a simple reminder of the current time in the day can make people more efficient :), I hope this app helps others as it has helped us. 

If you like my work and feel gracious, you can buy me a beer below ;)

<a href="https://www.buymeacoffee.com/ubhits" target="_blank">
<img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png"
     alt="Buy Me A Beer" 
     style="height:41px !important; width:174px !important;" />
</a>

# License
[Apache-2.0](LICENSE). By providing a contribution, you agree the contribution is licensed under Apache-2.0. This is required for Home Assistant contributions.
