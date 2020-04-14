# Alexa Talking Clock : AppDaemon App (HASS) :chicken:

[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg)](https://github.com/custom-components/hacs)

Amazon Alexa will keep on reminding you of the time from morning till night and also courteously greet with a good morning, good afternoon, and a good night & sweet dreams all without you having to lift a finger (or speak a word). Sweet!

## Installation
**NEEDS THE [Alexa Media Player](https://github.com/custom-components/alexa_media_player) HACS Integration from Keaton Taylor and Alan Tse**

Use [HACS](https://github.com/custom-components/hacs) or [download](https://github.com/UbhiTS/HASS-AlexaTalkingClock/tree/master/apps/alexa_talking_clock) the `alexa_talking_clock` directory from inside the `apps` directory here to your local `apps` directory, then add the configuration to enable the `alexa_talking_clock` module.

## App Configuration (config/appdaemon/apps/apps.yaml)

```yaml
alexa_talking_clock:
  module: alexa_talking_clock
  class: AlexaTalkingClock
  alexa: media_player.kitchen_alexa
  start_hour: 7
  start_minute: 0
  end_hour: 21
  end_minute: 0
  announce_hour: true
  announce_half_hour: true
  announce_quarter_hour: false
```

key | optional | type | default | description
-- | -- | -- | -- | --
`module` | False | string | | The module name of the app.
`class` | False | string | | The name of the Class.
`alexa` | False | string | | The Alexa device to target for the time reminder speech. You need the Alexa Media Player integration alive and kickin before you install this app.
`start_hour` | False | int | | The hour to start time remiders. This is in 24h format.
`start_minute` | False | int | | The minute to start time reminders. This can be 0, 15, 30, 45
`end_hour` | False | int | | The hour to end time remiders. This is in 24h format.
`end_minute` | False | int | | The minute to end time reminders. This can be 0, 15, 30, 45
`announce_hour` | False | bool | | Announce every hour (It's 8 AM, It's 9 AM)
`announce_half_hour` | False | bool | | Announce every half hour (It's 8 AM, It's 8:30 AM, It's 9 AM)
`announce_quarter_hour` | False | bool | | Announce every 15 minutes (It's 8 AM, It's 8:15 AM, It's 8:30 AM, It's 8:45 AM, It's 9 AM)

## Thank you for your time! (get it ;)
This app was a result of my amazing wife's request (who is a mother of 2 beautiful princesses BTW) to help her manage her time wisely ;). So this is dedicated to my wife Reena, without whom this world would not be worth my time :) 

This also wouldn't be possible without the amazing work done by the developers and community at **[Home Assistant](https://www.home-assistant.io/)**, and of Keaton Taylor and Alan Tse on their **Alexa Media Player integration** for Home Assistant. *https://github.com/custom-components/alexa_media_player*

Ever since we've set this up in our home, it has become an indispensable part of our lives. It's amazing to see how a simple reminder of the current time in the day can make people more efficient :), I hope this app helps others as it has helped us. 

If you like my work and feel gracious, you can buy me a beer below ;)

<a href="https://www.buymeacoffee.com/ubhits" target="_blank">
<img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png"
     alt="Buy Me A Beer" 
     style="height:41px !important; width:174px !important;" />
</a>

# License
[Apache-2.0](LICENSE). By providing a contribution, you agree the contribution is licensed under Apache-2.0. This is required for Home Assistant contributions.
