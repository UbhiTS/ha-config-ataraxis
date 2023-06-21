# Auto 'Crappy Internet' Rebooter :rocket: <img src="https://poa5qzspd7.execute-api.us-east-1.amazonaws.com/live/hypercounterimage/f7e1b92607a64f5fb2de4cf4ada55099/counter.png" />

[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg)](https://github.com/custom-components/hacs)

Automatically reboot your internet :globe_with_meridians: if you use a **[ZWave](https://www.amazon.com/Aeotec-Wireless-Control-Security-Automation/dp/B07PJNL5DB/ref=sr_1_7?dchild=1&keywords=zwave+socket&qid=1587936800&sr=8-7), [Zigbee](https://www.amazon.com/Compatible-SmartThings-switches-Appliances-accessories/dp/B07SSWD5MH/ref=sr_1_3?dchild=1&keywords=zigbee+socket&qid=1587936858&sr=8-3), or Bluetooth switch/socket** for your internet modem.
**This app :small_red_triangle:WILL NOT WORK:small_red_triangle: with WiFi switches/sockets**

Ever since we've set this up in our home, we've never had to worry about the internet. Infact, I've even forgotten where our modem is :wink: ... Awesome! 

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
You need the :boom:**SpeedTest.net**:boom: component configured in your configuration.yaml
### configuration.yaml
```yaml
speedtestdotnet:
  manual: true
  monitored_conditions:
    - ping
    - download
    - upload
```

**if you enable speech notifications, you will also need the [Alexa Media Player or Sonos](https://github.com/custom-components/alexa_media_player) integration**

## Installation
Use [HACS](https://github.com/custom-components/hacs) or [download](https://github.com/UbhiTS/ad-autointernetrebooter) the `auto_internet_rebooter.py` from inside the `apps` directory to your local `apps` directory, and add the following configuration to enable the app.

## Configuration (with Optional Speech Notifications)
```yaml
internet_health_monitor:
  module: auto_internet_rebooter
  class: AutoInternetRebooter
  internet:
    download: sensor.speedtest_download
    upload: sensor.speedtest_upload
    ping: sensor.speedtest_ping
    switch: switch.garage_internet_switch
  thresholds:
    download_mbps: 50
    upload_mbps: 3.5
    ping_ms: 75
  schedule:
    - "04:00:00"
    - "16:00:00"
  debug: false
  # OPTIONAL SPEECH NOTIFICATIONS
  notify:
    alexa: media_player.upper_big_bedroom_alexa
    start_time: "08:00:00"
    end_time: "21:30:00"
  # OPTIONAL SPEECH NOTIFICATIONS
```

key | optional | type | description
-- | -- | -- | --
`module` | **False** | string | The module name of the app
`class` | **False** | string | The name of the Class
`internet\|download` | **False** | speedtest.sensor | SpeedTest Download Sensor
`internet\|upload` | **False** | speedtest.sensor | SpeedTest Upload Sensor
`internet\|ping` | **False** | speedtest.sensor | SpeedTest Ping Sensor
`internet\|switch` | **False** | switch | The switch/socket that powers your internet modem
`thresholds\|download_mbps` | **False** | number | Threshold download speed. The internet will reboot if your download speed falls below this number.
`thresholds\|upload_mbps` | **False** | number | Threshold upload speed. The internet will reboot if your upload speed falls below this number.
`thresholds\|ping_ms` | **False** | number | Threshold ping. The internet will reboot if your ping goes **above** this number.
`schedule` | **False** | list | Define daily schedule when the speed test should run. This is in 24h format.
`notify\|alexa` | True | media_player | Speaker for Speech Notifications (Optional)
`notify\|start_time` | True | time | Only speak between start and end time. So that you don't get awoken when the test runs at 4 AM :stuck_out_tongue_winking_eye:. This is in 24h format
`notify\|end_time` | True | time | Every start has an end. This one too :smirk:
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
