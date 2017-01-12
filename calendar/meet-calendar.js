const BASE_URL = "https://meet.jit.si/";
const APP_NAME = "Jitsi";

//A text to be used when adding info to the location field.
const LOCATION_TEXT = APP_NAME + ' Conference';

// Numbers used to access the service, will be listed in the autogenerated
// description of the event when adding a meeting to an event.
let NUMBERS = [];
let generateRoomNameAsDigits = false;

/**
 * The event page we will be updating.
 */
class EventContainer {
    constructor() {
    }

    /**
     * @returns {EventContainer}
     */
    static getInstance() {
        var eventEditPage = document.querySelector('#maincell #coverinner');
        if (eventEditPage)
            return new GEvent(eventEditPage);
        else
            return new MSLiveEvent();
    }

    /**
     * The description of the event.
     * @abstract
     * @returns {Description}
     */
    get description() {}

    /**
     * The button container where we will add the jitsi button.
     * @abstract
     */
    get buttonContainer() {}

    /**
     * The location of the event.
     * @abstract
     * @returns {Location}
     */
    get location() {}

    /**
     * The container element of the event edit page.
     * @returns {*}
     */
    get container(){
        return this.containerElement;
    };

    set container(c){
        this.containerElement = c;
    };

    /**
     * Main entry point of the event modifictaions.
     * @abstract
     */
    update() {}

    /**
     * Checks for the button on current page
     */
    isButtonPresent() {
        return ($('#jitsi_button').length >= 1);
    }

    /**
     * Checks if there is meetingId, if not generate it, otherwise return it.
     * @returns {string} the meeting id to use.
     */
    getMeetingId() {
        let resMeetingId = "";

        var inviteText;
        if (this.location)
            inviteText = this.location.text;
        else
            inviteText = this.description.value;

        var ix = inviteText.indexOf(BASE_URL);
        var url;
        if (ix != -1 && (url = inviteText.substring(ix)) && url.length > 0) {
            resMeetingId = url.substring(BASE_URL.length);

            // there can be ',' after the meeting, normally added when adding
            // physical rooms to the meeting
            var regexp = /([a-zA-Z]+).*/g;
            var match = regexp.exec(resMeetingId);
            if (match && match.length > 1)
                resMeetingId = match[1];
        }
        else {
            if (generateRoomNameAsDigits) {
                resMeetingId = randomDigitString(10);
            }
            else
                resMeetingId = generateRoomWithoutSeparator();
        }

        return resMeetingId;
    }

    /**
     * Adds the jitsi button in buttonContainer.
     */
    addJitsiButton() {
        var container = this.buttonContainer;
        if (!container)
            return;

        var description = this.description;

        if (!description.element)
            return;

        container.addClass('button_container');
        container.append(
            '<div id="jitsi_button"><a href="#" style="color: white"></a></div>');
        // container.find('div.ui-sch').addClass('hangouts_button');
        description.update(this.location);
    }
}

/**
 * Represents the location field.
 */
class Location {
    /**
     * The text in the location field.
     * @abstract
     */
    get text() {}

    /**
     * Adds location info.
     * @abstract
     * @param text
     */
    addLocationText(text){}
}

/**
 * Represents the description of the event.
 */
class Description {
    constructor(event) {
        this.event = event;
    }
    /**
     * Updates the description and location field is not already updated.
     * @param location
     */
    update(location) {
        var isDescriptionUpdated = false;

        // checks whether description was updated.
        if (this.element != undefined) {
            var descriptionContainsURL =
                (this.value.length >= 1 && this.value.indexOf(BASE_URL) !== -1);
            isDescriptionUpdated =
                descriptionContainsURL ||
                // checks whether there is the generated name in the location input
                // if there is a location
                (location != null
                    && location.text.indexOf(LOCATION_TEXT) != -1);
        }

        if(isDescriptionUpdated) {
            // update button url of event has all the data
            this.updateButtonURL();
        } else {
            // update button as event description has no meeting set
            var button = $('#jitsi_button a');
            button.html('Add a ' + APP_NAME + ' Meeting');
            button.attr('href', '#');
            button.on('click', e => {
                e.preventDefault();

                if (!isDescriptionUpdated) {
                    // Build the invitation content
                    this.addDescriptionText(this.getInviteText());
                    this.updateButtonURL();

                    if (location)
                        location.addLocationText(
                            LOCATION_TEXT + ' - '
                                + $('#jitsi_button a').attr('href'));
                }
                this.updateButtonURL();
            });
        }
    }

    /**
     * The description html element.
     * @abstract
     */
    get element() {}

    /**
     * The text value of the description of the event.
     * @abstract
     */
    get value() {}

    /**
     * Adds description text to the existing text.
     * @abstract
     * @param text
     */
    addDescriptionText(text){}

    /**
     * Generates description text used for the invite.
     * @returns {String}
     */
    getInviteText() {
        var inviteText =
            "Click the following link to join the meeting from your computer: "
            + BASE_URL + this.event.meetingId;

        if (NUMBERS.length > 0) {
            inviteText += "\n\n=====";
            inviteText +="\n\nJust want to dial in on your phone? ";
            inviteText += " \n\nCall one of the following numbers: ";
            NUMBERS.forEach(function (num) {
                inviteText += "\n" + num;
            });
            inviteText += "\n\nSay your conference name: '"
                + this.event.meetingId
                + "' and you will be connected!";
        }

        return inviteText;
    }

    /**
     * Updates the url for the button.
     */
    updateButtonURL() {
        try {
            $('#jitsi_button').addClass('join');
            var button = $('#jitsi_button a');
            button.html("Join " + this.event.meetingId + " now");
            button.off('click');
            button.attr('href', BASE_URL + this.event.meetingId);
            button.attr('target', '_new');
            button.attr('style', '{color:blue}');
        } catch (e) {
            console.log(e);
        }
    }
}

/**
 * The google calendar specific implementation of the event page.
 */
class GEvent extends EventContainer {
    constructor(eventEditPage) {
        super();

        this.container = eventEditPage;
    }

    /**
     * Updates content (adds the button if is not there).
     * This is the entry point for all page modifications.
     */
    update() {
        if ($('table.ep-dp-dt').is(":visible")) {
            this.meetingId = this.getMeetingId();

            if(!this.isButtonPresent())
                this.addJitsiButton();
        }
    }

    /**
     * The event location.
     * @returns {GLocation}
     */
    get location() {
        return new GLocation();
    }

    /**
     * The button container holding jitsi button.
     * @returns {*}
     */
    get buttonContainer() {
        var container = $(getNodeID('rtc'));
        if(container.length == 0)
            return null;
        return container;
    }

    /**
     * The event description.
     * @returns {GDescription}
     */
    get description() {
        return new GDescription(this);
    }

    /**
     * Adds the jitsi button.
     */
    addJitsiButton() {
        super.addJitsiButton();

        var rtcRow = $(getNodeID('rtc-row'));
        if(rtcRow.is(':visible') == false && description.length != 0) {
            rtcRow.show();
            this.buttonContainer.addClass('solo');
        }
    }
}

/**
 * The google calendar specific implementation of the location field in the
 * event page.
 */
class GLocation extends Location {
    constructor() {
        super();
        this.elem = $('[id*=location].ep-dp-input input');
    }

    /**
     * The text from the location input field.
     * @returns {*}
     */
    get text() {
        return this.elem.val();
    }

    /**
     * Adds text to location input.
     * @param text
     */
    addLocationText(text){
        // Set the location if there is content
        var locationNode = this.elem[0];
        if (locationNode) {
            locationNode.dispatchEvent(getKeyboardEvent('keydown'));
            locationNode.value = locationNode.value == '' ?
                text : locationNode.value + ', ' + text;
            locationNode.dispatchEvent(getKeyboardEvent('input'));
            locationNode.dispatchEvent(getKeyboardEvent('keyup'));
            var changeEvt2 = document.createEvent("HTMLEvents");
            changeEvt2.initEvent('change', false, true);
            locationNode.dispatchEvent(changeEvt2);
        }
    }
}

/**
 * The google calendar specific implementation of the description textarea in
 * the event page.
 */
class GDescription extends Description {
    constructor(event) {
        super(event);

        var description = $(getNodeID('descript textarea'))[0];
        var descriptionRow = $(getNodeID('descript-row'));

        if (descriptionRow.find('textarea').length === 0)
            return;

        this.element = description;
    }

    /**
     * The html element.
     * @returns {*}
     */
    get element() {
        return this.el;
    }

    set element(el) {
        this.el = el;
    }

    /**
     * The text value of the description.
     */
    get value() {
        return this.el.value;
    }

    /**
     * Adds text to the description.
     * @param text
     */
    addDescriptionText(text){
        this.el.dispatchEvent(getKeyboardEvent('keydown'));
        this.el.value = this.el.value + text;
        this.el.dispatchEvent(getKeyboardEvent('input'));
        this.el.dispatchEvent(getKeyboardEvent('keyup'));
        var changeEvt1 = document.createEvent("HTMLEvents");
        changeEvt1.initEvent('change', false, true);
        this.el.dispatchEvent(changeEvt1);
    }
}

/**
 * The outlook live calendar specific implementation of the event page.
 */
class MSLiveEvent extends EventContainer {
    constructor() {
        super();

        this.container = document.getElementsByTagName("BODY")[0];
    }

    /**
     * Updates content (adds the button if is not there).
     * This is the entry point for all page modifications.
     */
    update() {
        if ($("div[aria-label='Event compose form']").is(":visible")) {
            this.meetingId = this.getMeetingId();

            if(!this.isButtonPresent())
                this.addJitsiButton();
        }
    }

    /**
     * The event location. Currently not supported.
     * @returns {MSLiveLocation}
     */
    get location() {
        return null;
    }

    /**
     * The button container holding jitsi button.
     * @returns {*}
     */
    get buttonContainer() {
        var container
            = $("span[id='MeetingCompose.LocationInputLabel']").parent();
        if(container.length == 0)
            return null;
        return container;
    }

    /**
     * The event description.
     * @returns {MSLiveDescription}
     */
    get description() {
        return new MSLiveDescription(this);
    }
}

/**
 * The outlook live calendar specific implementation of the description textarea
 * in the event page.
 */
class MSLiveDescription extends Description {
    constructor(event) {
        super(event);

        var description = $("div[aria-label='Event body'] p:first-child");
        if (description.length == 0)
            return;

        this.element = description;
    }

    /**
     * The html element.
     * @returns {*}
     */
    get element() {
        return this.el[0];
    }

    set element(el) {
        this.el = el;
    }

    /**
     * The text value of the description.
     */
    get value() {
        return this.el.text();
    }

    /**
     * Adds text to the description.
     * @param text
     */
    addDescriptionText(text){
        this.el.text(this.value + text);
    }
}

/**
 * Returns the node id.
 */
function getNodeID(name) {
    var inputNodePrefix = '';
    var labelNode = $("[id*='location-label']");
    if (labelNode.length >= 1) {
        inputNodePrefix = labelNode[0].id.split('.')[0];
    }
    return '#\\' + inputNodePrefix + '\\.' + name;
}

/**
 * Returns an event object that can be used to be simulated
 */
function getKeyboardEvent(event) {
    var keyboardEvent = document.createEvent('KeyboardEvent');
    var initMethod = typeof keyboardEvent.initKeyboardEvent !== 'undefined' ?
        'initKeyboardEvent' : 'initKeyEvent';
    keyboardEvent[initMethod](
        event // event type (keydown, keyup, or keypress)
        , true // bubbles
        , true // cancel-able
        , window // viewArg (window)
        , false // ctrlKeyArg
        , false // altKeyArg
        , false // shiftKeyArg
        , false // metaKeyArg
        , 32 // keyCodeArg
        , 0 // charCodeArg
    );

    return keyboardEvent;
}

/**
 * Checks whether it is ok to add the button to current page and add it.
 */
function checkAndUpdateCalendar() {
    var MutationObserver
        = window.MutationObserver || window.WebKitMutationObserver;
    var c = EventContainer.getInstance();
    if (c) {
        new MutationObserver(function(mutations) {
            try {
                mutations.every(function() {
                    c.update();
                });
            } catch(e) {
                console.log(e);
            }
        }).observe(c.container, {
            childList: true, attributes: true, characterData: false });
    }
}

checkAndUpdateCalendar();
