import appdaemon.plugins.hass.hassapi as hass
from datetime import datetime, time
#
# WallMote Controller App


class WallMoteController(hass.Hass):

    def initialize(self):
        self.backyard_mesh_lights = "switch.backyard_mesh_lights"
        self.home_theatre_living_room = "switch.home_theatre_living_room"
        self.kitchen_alexa = "media_player.kitchen_alexa"
        self.upper_big_bedroom_alexa = "media_player.upper_big_bedroom_alexa"
        self.garage_internet_switch = "switch.garage_internet_switch"

        self.listen_state(self.wallmote_scene_activated_001, "sensor.living_room_wallmote_quad_scene_state_scene_001")
        self.listen_state(self.wallmote_scene_activated_002, "sensor.living_room_wallmote_quad_scene_state_scene_002")
        self.listen_state(self.wallmote_scene_activated_003, "sensor.living_room_wallmote_quad_scene_state_scene_003")
        self.listen_state(self.wallmote_scene_activated_004, "sensor.living_room_wallmote_quad_scene_state_scene_004")

    
    def wallmote_scene_activated_001(self, entity, attribute, old, new, kwargs):

        if new == "0":
            self.log("BACKYARD MESH LIGHTS: TURN ON")
            self.call_service("switch/turn_on", entity_id = self.backyard_mesh_lights)
        if new == "1":
            self.log("BACKYARD MESH LIGHTS: TURN OFF")
            self.call_service("switch/turn_off", entity_id = self.backyard_mesh_lights)


    def wallmote_scene_activated_002(self, entity, attribute, old, new, kwargs):
        if new == "0":
            self.log("INTERNET RESET: WARNING")
            self.call_service("notify/alexa_media", data = {"type":"tts", "method":"speak"}, target = self.kitchen_alexa, message = """                
            <speak>
            <amazon:emotion name="excited" intensity="high">
                To reset the internet, keep this button pressed, and find a seat!
            </amazon:emotion>
            </speak>
            """)
        if new == "1":
            self.internet_reset(entity, attribute, old, new, kwargs)


    def wallmote_scene_activated_003(self, entity, attribute, old, new, kwargs):
        if new == "0":
            self.log("HOME THEATER: TURN ON")
            self.call_service("switch/turn_on", entity_id = self.home_theatre_living_room)
        if new == "1":
            self.log("HOME THEATER: TURN OFF")
            self.call_service("switch/turn_off", entity_id = self.home_theatre_living_room)


    def wallmote_scene_activated_004(self, entity, attribute, old, new, kwargs):
        if new == "0":
            self.log("ALEXA: JOKE")
            self.call_service("media_player/play_media", entity_id = self.kitchen_alexa, media_content_type = "sequence", media_content_id = "Alexa.Joke.Play")
        if new == "1":
            self.log("ALEXA: SIMMY SAMMY CALL")
            self.call_service("notify/alexa_media", data = {"type":"tts", "method":"speak"}, target = self.upper_big_bedroom_alexa, message = """
            <speak>
            <voice name="Aditi">
                <amazon:emotion name="excited" intensity="high">
                <lang xml:lang="hi-IN">Simran and Samayra, jaldi neeche aao! If you do not, you will get a thappad!</lang>
                </amazon:emotion>
            </voice>
            </speak>
            """)

    def internet_reset(self, entity, attribute, old, new, kwargs):

        self.log("INTERNET RESET: INITIATE")
            
        self.call_service("notify/alexa_media", data = {"type":"tts", "method":"speak"}, target = self.kitchen_alexa, message = """
        <speak>
            <amazon:emotion name="excited" intensity="high">
            Embrace yourself for total meltdown. Resetting the internet in 5 seconds!
            </amazon:emotion>
        </speak>
        """)
    
        self.run_in(self.internet_turn_off, 10)
        self.run_in(self.internet_turn_on, 15)


    def internet_turn_off(self, kwargs):
        self.log("INTERNET RESET: TURN OFF")
        self.call_service("switch/turn_off", entity_id = self.garage_internet_switch)


    def internet_turn_on(self, kwargs):
        self.log("INTERNET RESET: TURN ON")
        self.call_service("switch/turn_on", entity_id = self.garage_internet_switch)
        