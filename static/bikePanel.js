let timeButtons = 0;
let thisRide = null;

const typeColorMap = {
    "normal":"#aec8a8",
    "alert":"#ec4d4d"
};
const historyLength = 20;
const shortHistoryLength = 5;
const mphPerRpm = 4.276315789473684;
const bikeServer = "ws://minihome.dankurtz.local:8001/";
const Http = new XMLHttpRequest();

//control for the message prompt
class promptControl {
    constructor() {
        this.promptTimeout = null;
        this.promptMessageQueue = [];
    }

    showPrompt(message, duration, type) {
        let promptData = [message,duration,type];
    
        let skip = false;
    
        if (this.promptMessageQueue.length == 0) {
            let promptElement = document.getElementById('prompt');
    
            promptElement.style.display = "block";
            promptElement.classList.add("openAnimation");
    
            this.promptTimeout = setTimeout(function(){this.loopAllPromptMessages() }.bind(this), 500);
            setTimeout(() => {
                let promptElement = document.getElementById('prompt');
                promptElement.classList.remove("openAnimation");
            }, 1000)
        } else {
            if (this.promptMessageQueue.length > 0) {
                for (let i in this.promptMessageQueue) {
                    if (this.promptMessageQueue[i][0] == promptData[0]) {skip = true;}
                }
            }
        }
        if (skip == false) this.promptMessageQueue.push(promptData);
    }

    loopAllPromptMessages() {

        let promptData = this.promptMessageQueue[0];
    
        let promptElement = document.getElementById('prompt');
    
        promptElement.innerHTML = promptData[0]
        promptElement.style.opacity = "100";
        promptElement.style.color = typeColorMap[promptData[2]];
        promptElement.classList.remove("fadeOutAnimation");
        promptElement.classList.add("fadeInAnimation");
    
        setTimeout(function() {
            let promptElement = document.getElementById('prompt');
            promptElement.style.opacity = "0"
            promptElement.classList.remove("fadeInAnimation");
            promptElement.classList.add("fadeOutAnimation");
    
            this.promptMessageQueue.splice(0, 1);
    
            if (this.promptMessageQueue.length == 0) this.closePrompt();
    
            setTimeout(function() {
                promptElement.classList.remove("fadeOutAnimation");
                if (this.promptMessageQueue.length > 0) this.loopAllPromptMessages();     
            }.bind(this), 500);
        }.bind(this), promptData[1]);
    }

    closePrompt() {
        let promptElement = document.getElementById('prompt');
        promptElement.classList.add("closeAnimation");
        setTimeout(function() {
            promptElement = document.getElementById('prompt');
            promptElement.style.display = "none";
            promptElement.classList.remove("closeAnimation");
        }, 1000)
    }
}
const messagePrompt = new promptControl();

class rideControl {
    constructor(rider) {
        this.backToZeroTime = null;
        this.miles = 0;
        this.rpmHistory = [];
        this.rpmHistoryShort = [];
        this.timeHistoryShort = [];
        this.startTime = null;
        this.totalRpms = 0;
        this.totalMs = 0;
        this.maxRpms = 0;
        this.rideId = null;
        this.thisRider = rider;
        this.tickTimer = null;
        this.excludedTime = 0;
        this.paused = false;
        this.pauseStartTime = null;
        this.websocket = null;

        this.historyLength = 20;
        this.shortHistoryLength = 5;
        this.mphPerRpm = 4.276315789473684;

        this.rpmField = document.getElementById('rpms');
        this.mphField = document.getElementById('mph');
        this.distanceField = document.getElementById('miles');
        this.arpmField = document.getElementById('arpm');
        this.amphField = document.getElementById('amph');
        this.mrpmField = document.getElementById('mrpm');
        this.mmphField = document.getElementById('mmph');
        this.timeField = document.getElementById('time');

        this.socketConnect();
    }

    socketConnect() {
        this.websocket = new WebSocket(bikeServer);
        this.receiveRPMS();
        
        this.websocket.addEventListener('open', (event) => {
            let payload = {
                "action":"Connect",
                "rideId":this.rideId
            }
            this.websocket.send(JSON.stringify(payload));
            messagePrompt.showPrompt('Connected', 3000, 'normal');
        });
    
        this.websocket.addEventListener('error', (event) => {
            messagePrompt.showPrompt('Connection Error', 1000, 'alert');
        });
    
        this.websocket.addEventListener('close', (event) => {
            messagePrompt.showPrompt('Disconnected', 1000, 'alert');
            this.socketConnect();
        });
    }

    saveName() {
        this.thisRider = document.getElementById('name').value
    
        if (this.thisRider.length > 0) {
            setCookie('name', this.thisRider, 2100);
            document.getElementById('getNameTile').style.display = "none";
            loadHistory(this.thisRider);
        } else {
            alert('Please enter a name');
        }
    }

    receiveRPMS() {
        console.log('Loaded...');
    
        // rpm updates from the bike
        this.websocket.addEventListener("message", ({ data }) => {
            let payload = JSON.parse(data)
    
            if (payload['action'] == "Rotate") {
    
                if (paused == true) {
                    let pausedTime = Date.now() - this.pauseStartTime;
                    this.excludedTime = this.excludedTime + pausedTime;
                    this.pauseStartTime = null;
                    this.paused = false;
                }
    
                // start the timer if it is not already going
                if (this.startTime == null) this.startTime = Date.now();
                if (this.tickTimer == null) this.tickTimer = setInterval(function() {this.tick()}.bind(this), 200);
    
                // rolls mph and rpm fields back to zero if rpm updates stop
                clearTimeout(this.backToZeroTime);
                this.backToZeroTime = setTimeout(function() {this.pauseTime()}.bind(this), 2000);
    
                // get rpms, store the history for standard deviation calcs
                let rpm = parseFloat(payload['rpm']);
                this.rpmHistory.push(rpm);
                if (this.rpmHistory.length > this.historyLength) this.rpmHistory.splice(0, 1);
    
                // determine mph from rpm
                let mph = rpm / this.mphPerRpm;
    
                // get the time duration for the last update in secs and ms
                let elapsedSec = parseFloat(payload['time_diff_sec']);
                let elapsedMs = elapsedSec * 1000;
    
                // determine distance traveled based on time and mph, add to total distance traveled
                let netDistance = mph * (elapsedSec / 60 / 60);
                if (netDistance > 0) this.miles = this.miles + netDistance;
    
                // add time and rpm to the short history, determine rpm weighted average based on short history
                this.rpmHistoryShort.push(rpm);
                this.timeHistoryShort.push(elapsedMs);
    
                if (this.rpmHistoryShort.length > this.shortHistoryLength) {
                    this.rpmHistoryShort.splice(0, 1);
                    this.timeHistoryShort.splice(0, 1);
                }
    
                // add to totals used for calculating average rpm/mph
                this.totalRpms += rpm * elapsedMs;
                this.totalMs += elapsedMs;
    
                // smoothing the rpm to account for noise from the sensor
                let displayedRpm = this.rpmHistoryShort.length < this.shortHistoryLength ? rpm : w_avg(this.rpmHistoryShort, this.timeHistoryShort);
                let displayedMph = this.timeHistoryShort.length < this.shortHistoryLength ? mph : displayedRpm / this.mphPerRpm;
    
                // add to max rpm
                if (displayedRpm > this.maxRpms) this.maxRpms = displayedRpm;
                let aRpm = this.totalRpms / this.totalMs;
                let aMph = aRpm / this.mphPerRpm;
                let mMph = this.maxRpms / this.mphPerRpm;
    
                // format the fields for display
                let rpmRounded = numberToStringFormatter(Math.round((displayedRpm + Number.EPSILON) * 10) / 10, 1);
                let mphRounded = numberToStringFormatter(Math.round((displayedMph + Number.EPSILON) * 10) / 10, 1);
                let milesRounded = numberToStringFormatter(Math.round((this.miles + Number.EPSILON) * 100) / 100, 2);
                let arpmRounded = numberToStringFormatter(Math.round((aRpm + Number.EPSILON) * 10) / 10, 1);
                let amphRounded = numberToStringFormatter(Math.round((aMph + Number.EPSILON) * 10) / 10, 1);
                let mrpmRounded = numberToStringFormatter(Math.round((this.maxRpms + Number.EPSILON) * 10) / 10, 1);
                let mmphRounded = numberToStringFormatter(Math.round((mMph + Number.EPSILON) * 10) / 10, 1);
    
                // populate the fields values
                this.rpmField.innerHTML = rpmRounded;
                this.mphField.innerHTML = mphRounded;
                this.distanceField.innerHTML = milesRounded;
                this.arpmField.innerHTML = arpmRounded;
                this.amphField.innerHTML = amphRounded;
                this.mrpmField.innerHTML = mrpmRounded;
                this.mmphField.innerHTML = mmphRounded;
    
            }
        });
    }
    
    tick() {
        let elapsedTime = Date.now() - this.startTime - this.excludedTime;
    
        let elapsedTimeDate = new Date(elapsedTime);
        
        this.timeField.innerHTML = timeStringFormater(elapsedTimeDate);
    
        let aRpm = this.totalRpms / this.totalMs
    
        let payload = {
            "id": this.rideId,
            "riderName": this.thisRider,
            "startTime": this.startTime,
            "elapsedTime": elapsedTime,
            "avgRpm": aRpm,
            "maxRpm": this.maxRpms,    
            "distanceMiles": this.miles
        }
    
        Http.open("POST", "/rideUpdate");
        Http.setRequestHeader("Content-Type", "application/json");
        Http.onreadystatechange = function() {
            if (Http.readyState === XMLHttpRequest.DONE && Http.status === 200) {
                let response = JSON.parse(Http.responseText);
    
                if (response['status'] == 'success' && this.rideId == null) {
                    this.rideId = response['rideId'];
                }
            }
        }.bind(this)
        Http.send(JSON.stringify(payload));
    }
    
    pauseTime() {
        this.backToZero();
        this.paused = true;
        this.pauseStartTime = Date.now();
        clearInterval(this.tickTimer);
        this.tickTimer = null;
    
        let payload = {
            "action":"Pause",
            "rideId":this.rideId
        }
    
        this.websocket.send(JSON.stringify(payload));
    }
    
    backToZero() {    
        let rpms = Math.round(parseFloat(rpmField.innerHTML));
        rpms -= 2;
        let mph = Math.round(rpms / mphPerRpm);
    
        this.rpmField.innerHTML = numberToStringFormatter(rpms < 0 ? 0 : rpms.toString(), 1);
        this.mphField.innerHTML = numberToStringFormatter(mph < 0 ? 0 : mph.toString(), 1);
        
        if (rpms > 0) this.backToZeroTime = setTimeout(function() {this.backToZero()}.bind(this), 40);
    }
}

function getStandardDeviation (array) {
    const n = array.length
    const mean = array.reduce((a, b) => a + b) / n
    return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)
}

function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
  }

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return false;
}

function w_avg(values, counts) {
    totalproduct = 0;
    totalcount = 0;

    for (let i in values) {
        totalproduct += values[i] * counts[i];
        totalcount += counts[i];
    }

    return totalproduct / totalcount;
}

function numberToStringFormatter(value, decimals) {
    stringValue = value.toString();

    if (stringValue.indexOf('.') == -1) {
        let appendDecimals = "";
        for (let i = 0; i < decimals; i++) {
            appendDecimals = appendDecimals + "0";
        }
        
        stringValue = stringValue + "." + appendDecimals;
    } else {
        if (stringValue.split('.')[1].length < decimals) {
            for (let i = stringValue.split('.')[1].length; i < decimals; i++) {
                stringValue = stringValue + "0";
            }
        }
    }

    return stringValue
}

function timeStringFormater(dateForFormat) {
    let hours = dateForFormat.getUTCHours().toString();
    let minutes = dateForFormat.getUTCMinutes().toString();
    let seconds = dateForFormat.getUTCSeconds().toString();

    hours = hours.length == 1 ? "0" + hours : hours;
    minutes = minutes.length == 1 ? "0" + minutes : minutes;
    seconds = seconds.length == 1 ? "0" + seconds : seconds;

    let timeString = hours + ":" + minutes + ":" + seconds;

    return timeString;
}

function showButtons(panelId) {
    panelElement = document.getElementById(panelId);
    
    panelElement.style.display = "block";
    panelElement.style.height = "0px";
    panelElement.classList.add("openButtonPanelAnimate");
    setTimeout(() => {
        panelElement = document.getElementById(panelId);

        panelElement.style.height = "64px";
        panelElement.classList.remove("openButtonPanelAnimate");

        // get all buttons
        buttons = panelElement.getElementsByTagName('button');

        for (let i = 0; i < buttons.length; i++) {
            let button = buttons[i];
            button.classList.remove("hiddenButton");
            button.classList.add("showButtonAnimation");
        }

        setTimeout(() => {
            panelElement = document.getElementById(panelId);
            buttons = panelElement.getElementsByTagName('button');

            for (let i = 0; i < buttons.length; i++) {
                let button = buttons[i];
                button.classList.remove("showButtonAnimation");
            }
        }, 200);
    }, 1000);
}

function hideButtons(panelId) {
    panelElement = document.getElementById(panelId);
    buttons = panelElement.getElementsByTagName('button');

    for (let i = 0; i < buttons.length; i++) {
        let button = buttons[i];
        button.classList.add("hideButtonAnimation");
    }

    setTimeout(() => {
        panelElement = document.getElementById(panelId);
        buttons = panelElement.getElementsByTagName('button');

        for (let i = 0; i < buttons.length; i++) {
            let button = buttons[i];
            button.classList.remove("hideButtonAnimation");
            button.classList.add("hiddenButton");
        }

        panelElement.classList.add("closeButtonPanelAnimate");

        setTimeout(() => {
            panelElement = document.getElementById(panelId);

            panelElement.style.display = "none";
            panelElement.classList.remove("closeButtonPanelAnimate");
        }, 1000);
    }, 200);
}

function toggleTimeButtons() {
    if (timeButtons == 0) {
        showButtons('timeButtons');
        timeButtons = 1;
    } else {
        hideButtons('timeButtons');
        timeButtons = 0;
    }
}

function loadHistory(riderName) {
    let payload = {
        "riderName":riderName
    }

    Http.open("POST", "/getHistory");
    Http.setRequestHeader("Content-Type", "application/json");
    Http.onreadystatechange = function() {
        if (Http.readyState === XMLHttpRequest.DONE && Http.status === 200) {
            response = JSON.parse(Http.responseText);

            if (response['status'] == 'success' && thisRide.rideId == null) {
                //fields to be updated
                lastTimeField = document.getElementById('lasttime');
                lastDistanceField = document.getElementById('lastdistance');
                lastAvgRpmField = document.getElementById('lastrpm');
                lastAvgMphField = document.getElementById('lastmph');
                lastMaxRpmField = document.getElementById('lastpeakrpm');
                totalDistanceField = document.getElementById('alldistance');

                lastTimeField.innerHTML = timeStringFormater(new Date(parseInt(response['elapsedTimeSec']) * 1000));
                lastDistanceField.innerHTML = numberToStringFormatter(Math.round((parseFloat(response['distanceMiles']) + Number.EPSILON) * 100) / 100, 2) +"mi";
                lastAvgRpmField.innerHTML = numberToStringFormatter(Math.round((parseFloat(response['avgRpm']) + Number.EPSILON) * 10) / 10, 1);
                lastAvgMphField.innerHTML = numberToStringFormatter(Math.round((parseFloat(response['avgRpm'] / thisRide.mphPerRpm) + Number.EPSILON) * 10) / 10, 1)
                lastMaxRpmField.innerHTML = numberToStringFormatter(Math.round((parseFloat(response['maxRpm']) + Number.EPSILON) * 10) / 10, 1);
                totalDistanceField.innerHTML = numberToStringFormatter(Math.round((parseFloat(response['totalDistance']) + Number.EPSILON) * 100) / 100, 2) +"mi";
            }
        }
    }
    Http.send(JSON.stringify(payload));

}

window.addEventListener("DOMContentLoaded", () => {

    thisRide = new rideControl(getCookie('name'));

    thisRide.thisRider = getCookie('name');

    if (thisRide.thisRider == false) {
        document.getElementById('getNameTile').style.display = "block";
    } else {
        messagePrompt.showPrompt('Hello '+ thisRide.thisRider, 3000, 'normal');
        loadHistory(thisRide.thisRider);
    }

    rpmField = document.getElementById('rpms');
    mphField = document.getElementById('mph');
    distanceField = document.getElementById('miles');
    arpmField = document.getElementById('arpm');
    amphField = document.getElementById('amph');
    mrpmField = document.getElementById('mrpm');
    mmphField = document.getElementById('mmph');

    rpmField.innerHTML = numberToStringFormatter(0, 1);
    mphField.innerHTML = numberToStringFormatter(0, 1);
    distanceField.innerHTML = numberToStringFormatter(0, 2);
    arpmField.innerHTML = numberToStringFormatter(0, 1);
    amphField.innerHTML = numberToStringFormatter(0, 1);
    mrpmField.innerHTML = numberToStringFormatter(0, 1);
    mmphField.innerHTML = numberToStringFormatter(0, 1);
});