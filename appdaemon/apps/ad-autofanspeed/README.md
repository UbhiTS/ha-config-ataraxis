# Auto 'Fan Speed' Controller :chicken: <img src="https://poa5qzspd7.execute-api.us-east-1.amazonaws.com/live/hypercounterimage/1067a5bcbd5842f38c4aa8c5cba6a89f/counter.png" />

[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg)](https://github.com/custom-components/hacs)

Automatically control your room/ceiling fan speed using a temperature sensor (like a room thermostat, or a multi sensor)

Where we live, there is a huge difference between day:sunny: and night:first_quarter_moon_with_face: temperatures, sometimes more than 25F. At 10 in the night, the temperature could be 75F:fire:, but at 3 in the morning it could be as low as 50F:snowflake:. So when you sleep it's kinda hot and you need the fan on high, but then early morning you are cold. So you have to wake up, get up from your bed, walk to the switch and lower the fan speed thereby losing valuable sleep.

Another big problem this app solves is the "feels like" syndrome. In the morning when the sun shines through your room window:sunrise:, 75F actually feels more like 85F. This app includes a temperature offset setting that adjusts the temp range based on whether the sun is above the horizon or below.

Finally, to save energy:moneybag:, you could ask the app to only control the fan speed during a particular time and also turn off the fan at the end time :)

Ever since we've set this up in our home:house_with_garden:, we've never had to worry about the fan speed. More comfort, and more sleep ... Awesome!

Please ⭐ this repo if you like my work and also check out my other repos like
- [Home Assistant 'STEROIDS' Configuration](https://github.com/UbhiTS/ha-config-ataraxis)
- [Alexa (& Sonos) Talking Clock](https://github.com/UbhiTS/ad-alexatalkingclock)
- [Alexa (& Sonos) Doorbell](https://github.com/UbhiTS/ad-alexadoorbell)
- [Alexa (& Sonos) Door/Window Announce](https://github.com/UbhiTS/ad-alexadoorwindowannounce)
- [Alexa (& Sonos) Smart Talking Thermostat](https://github.com/UbhiTS/ad-alexasmarttalkingthermostat)
- [Auto 'Crappy Internet' Rebooter](https://github.com/UbhiTS/ad-autointernetrebooter)

Also, if you want to see a walkthrough of my Home Assistant configuration, I have my video walkthrough on youtube below
- [Home Automation on 'STEROIDS' : Video Walkthrough](https://youtu.be/qqktLE9_45A)

## Prerequisites
You need the :boom:**[sun](https://www.home-assistant.io/integrations/sun/)**:boom: component configured in your configuration.yaml

## Installation
Use [HACS](https://github.com/custom-components/hacs) or [download](https://github.com/UbhiTS/ad-autofanspeed) the `auto_fan_speed.py` from inside the `apps` directory to your local `apps` directory, and add the following configuration to enable the app.

## Configuration (with Optional Speech Notifications)
```yaml
auto_fan_speed_master_bedroom:
  module: auto_fan_speed
  class: AutoFanSpeed
  temp_sensor: sensor.thermostat_master_bedroom_temperature
  fan: fan.master_bedroom_fan
  sun: sun.sun
  speeds:
    low: 67
    medium: 69
    high: 73
    sun_offset: -2
  time:
    start: "21:00:00"
    end: "09:30:00"
    turn_off_at_end_time: True
  debug: false
```

key | optional | type | description
-- | -- | -- | --
`module` | **False** | string | The module name of the app
`class` | **False** | string | The name of the Class
`temp_sensor` | **False** | sensor | the local room temperature sensor
`fan` | **False** | fan | fan switch
`sun` | **False** | sun | home assistant sun [sun](https://www.home-assistant.io/integrations/sun/) sensor
`speeds\|low` | **False** | number | The fan will be switched "off" below this temperature and "low speed" between low and medium temperatures  
`speeds\|medium` | **False** | number | The fan will be at "medium speed" between medium and high temperatures
`speeds\|high` | **False** | number | The fan will be at "high speed" at or above this temperature
`speeds\|sun_offset` | **False** | number | normally "-ve". how much of the temperature to adjust by when the sun rises and is above horizon
`time\|start` | **False** | time | Only control between start and end times. if you only want to auto control the fan speed at night for example. This is in 24h format
`time\|end` | **False** | time | Every start has an end. This one too :smirk:
`time\|turn_off_at_end_time` | **False** | bool | Turn off the fan at the end time, to save energy and ensure that the fan doesnt run all day.
`debug` | True | bool | if True, outputs messages to the AppDaemon Log
    
    
## Thank you! :raised_hands:
This app wouldn't be possible without the amazing work done by the developers and community at **[Home Assistant](https://www.home-assistant.io/)**. 

If you like my work and feel gracious, you can buy me a beer below ;)

<a href="https://www.buymeacoffee.com/ubhits" target="_blank">
<img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png"
     alt="Buy Me A Beer" 
     style="height:41px !important; width:174px !important;" />
</a>

# License
[Apache-2.0](LICENSE). By providing a contribution, you agree the contribution is licensed under Apache-2.0. This is required for Home Assistant contributions.
