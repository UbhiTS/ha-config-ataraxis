import appdaemon.plugins.hass.hassapi as hass
from datetime import datetime, time

#
# TV Notifications Controller App
#
# Args:
# tv_notifications:
#   module: tv_notifications_controller
#   class: TVNotificationsController
#   tv: media_player.tv_living_room
#   calendar: calendar.important_dates
#   notification_service: notify/tv_living_room

class TVNotificationsController(hass.Hass):

  def initialize(self):
    
    self.tv = self.args["tv"]
    self.calendar = self.args["calendar"]
    self.notification_service = self.args["notification_service"]
    
    self.listen_state(self.notify_tv, self.tv, attribute = "state")


  def notify_tv(self, entity, attribute, old, new, kwargs):
    
    if old == "off" and new == "on":
      self.run_in(self.show_notification, 30)
      self.run_in(self.show_notification, 300)


  def show_notification(self, kwargs):
    msg = self.calendar_events()
    if msg is not None:
      self.log("TV NOTIFY : " + msg)
      self.call_service(self.notification_service, message = msg)
      
      
  def calendar_events(self):
    
    event = self.get_state(self.calendar, attribute="all")
    event_message = event["attributes"]["message"]
    event_date_str = event["attributes"]["start_time"]
    event_date = datetime.strptime(event_date_str, '%Y-%m-%d %H:%M:%S')
    current_date = datetime.now().replace(hour = 0, minute = 0, second = 0, microsecond = 0)
    event_days_remaining = event_date - current_date
    
    event_message = event_message.replace("&","&amp;")
    event_message = event_message.replace("<","&lt;")
    event_message = event_message.replace(">","&gt;")
    
    if event_days_remaining.days == 0:
      return event_message + '<br/>Today'
    elif event_days_remaining.days == 1:
      return event_message + '<br/>Tomorrow'
    elif event_days_remaining.days <= 15:
      return event_message + '<br/>' + str(event_days_remaining.days) + ' days<br/>' + event_date.strftime("%d %b %Y")
    else:
      return None
      
  
  def gym_reminder(self):
    pass
