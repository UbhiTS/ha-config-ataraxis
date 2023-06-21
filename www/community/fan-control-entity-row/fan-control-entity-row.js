class CustomFanRow extends Polymer.Element {

	static get template() {
        return Polymer.html`
            <style is="custom-style" include="iron-flex iron-flex-alignment"></style>
            <style>
                :host {
                    line-height: inherit;
				}
                .speed {
                    min-width: 30px;
		    max-width: 30px;
		    height: 30px;
		    margin-left: 2px;
                    margin-right: 2px;
    	            background-color: #759aaa;
	            border: 1px solid lightgrey; 
		    border-radius: 4px;
	            font-size: 10px !important;
		    color: inherit;
		    text-align: center;
	            float: right !important;
		    padding: 1px;
		}
				
                </style>
            	  <hui-generic-entity-row hass="[[hass]]" config="[[_config]]">
                    <div class='horizontal justified layout' on-click="stopPropagation">
                      <button
			class='speed'
			style='[[_lowOnColor]]'
			toggles name="low"
			on-click='setSpeed'
                        disabled='[[_isOnLow]]'>LOW</button>
                    <button
			class='speed'
                        style='[[_medOnColor]]'
                        toggles name="medium"
                        on-click='setSpeed'
                        disabled='[[_isOnMed]]'>MED</button>
                    <button
			class='speed'
                        style='[[_highOnColor]]'
                        toggles name="high"
                        on-click='setSpeed'
                        disabled='[[_isOnHigh]]'>HIGH</button>
		    <button
			class='speed'
                        style='[[_offColor]]'
                        toggles name="off"
                        on-click='setSpeed'
                        disabled='[[_isOffState]]'>OFF</button>
                  </div>
                </hui-generic-entity-row>
        `;
    }

    static get properties() {
        return {
            hass: {
                type: Object,
                observer: 'hassChanged'
            },
                _config: Object,
                _stateObj: Object,
				_lowOnColor: String,
				_medOnColor: String,
				_highOnColor: String,
				_offColor: String,
				_isOffState: Boolean,
            	_isOnState: Boolean,
            	_isOnLow: Boolean,
				_isOnMed: Boolean,
            	_isOnHigh: Boolean,
		}
    }

    setConfig(config) {
        this._config = config;
		
	this._config = {
            customTheme: false,
			sendStateWithSpeed: false,
			customIsOffColor: '#f44c09',
			customIsOnLowColor: '#43A047',
			customIsOnMedColor: '#43A047',
			customIsOnHiColor: '#43A047',
			customIsOffSpdColor: '#759aaa',
            ...config
        };
    }

    hassChanged(hass) {

        const config = this._config;
        const stateObj = hass.states[config.entity];
		const custTheme = config.customTheme;
		const sendStateWithSpeed = config.sendStateWithSpeed;
		const custOnLowClr = config.customIsOnLowColor;
		const custOnMedClr = config.customIsOnMedColor;
		const custOnHiClr = config.customIsOnHiColor;
		const custOffSpdClr = config.customIsOffSpdColor;
		const custOffClr = config.customIsOffColor;
		
						
		
	let speed;
        if (stateObj && stateObj.attributes) {
            speed = stateObj.attributes.speed || 'off';
        }
		
	let low;
	let med;
	let high;
	let offstate;
		
	if (stateObj && stateObj.attributes) {
	    if (stateObj.state == 'on' && stateObj.attributes.speed == 'low') {
		    low = 'on';
	    } else if (stateObj.state == 'on' && stateObj.attributes.speed == 'medium') {
		    med = 'on';
	    } else if (stateObj.state == 'on' && stateObj.attributes.speed == 'high') {
		    high = 'on';
	    } else {
			offstate = 'on';
		}
	}
		
    let lowcolor;
	let medcolor;
	let hicolor;
	let offcolor;
				
	if (custTheme) {

		if (low == 'on') {
			lowcolor = 'background-color:' + custOnLowClr;
		} else {
			lowcolor = 'background-color:' + custOffSpdClr;
		}

		if (med == 'on') {
			medcolor = 'background-color:'  + custOnMedClr;
		} else {
			medcolor = 'background-color:' + custOffSpdClr;
		}
		
		if (high == 'on') {
			hicolor = 'background-color:'  + custOnHiClr;
		} else {
			hicolor = 'background-color:' + custOffSpdClr;
		}
		
		if (offstate == 'on') {
			offcolor = 'background-color:'  + custOffClr;
		} else {
			offcolor = 'background-color:' + custOffSpdClr;
		}

  	} else {

  		if (low == 'on') {
			lowcolor = 'background-color: var(--primary-color)';
		} else {
			lowcolor = 'background-color: var(--disabled-text-color)';
		}
		
		if (med == 'on') {
			medcolor = 'background-color: var(--primary-color)';
		} else {
			medcolor = 'background-color: var(--disabled-text-color)';
		}
		
		if (high == 'on') {
			hicolor = 'background-color: var(--primary-color)';
		} else {
			hicolor = 'background-color: var(--disabled-text-color)';
		}
		
		if (offstate == 'on') {
			offcolor = 'background-color: var(--primary-color)';
		} else {
			offcolor = 'background-color: var(--disabled-text-color)';
		}
	}
	
			
	this.setProperties({
        _stateObj: stateObj,
		_isOffState: stateObj.state == 'off',
        _isOnLow: low === 'on',
		_isOnMed: med === 'on',
		_isOnHigh: high === 'on',
		_lowOnColor: lowcolor,
		_medOnColor: medcolor,
		_highOnColor: hicolor,
		_offColor: offcolor,
	});
    }

    stopPropagation(e) {
        e.stopPropagation();
    }

    setSpeed(e) {
        const speed = e.currentTarget.getAttribute('name');
        if( speed == 'off' ){
		  this.hass.callService('fan', 'turn_off', {entity_id: this._config.entity});
	    } else {
		  if(this._config.sendStateWithSpeed){
		    this.hass.callService('fan', 'turn_on', {entity_id: this._config.entity});
		  }
		  this.hass.callService('fan', 'set_speed', {entity_id: this._config.entity, speed: speed});
	    }
    }

}
	
customElements.define('fan-control-entity-row', CustomFanRow);

