import appdaemon.plugins.hass.hassapi as hass
import datetime

#
# Energy Meter Controller App
#
# Args:
# energy_meter:
#   module: energy_meter_controller
#   class: EnergyMeterController
#   energy_meter: sensor.hem_energy

class EnergyMeterController(hass.Hass):

  def initialize(self):
    self.energy_meter = self.args["energy_meter"]
    self.run_daily(self.reset_energy_meter, datetime.time(20, 00, 00))


  def reset_energy_meter(self, kwargs):
    
    date = datetime.datetime.now()
    
    if date.month == 8 and date.day == 20:
      self.call_service("zwave/reset_node_meters", node_id = 30)
      self.log("RESET_PG&E_ENERGY_SURPLUS_METER")
