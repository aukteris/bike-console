let backToZeroTime = null;
let miles = 0;
let rpmHistory = [];
let rpmHistoryShort = [];
let timeHistoryShort = [];
let startTime = null;
let totalRpms = 0;
let totalMs = 0;
let maxRpms = 0;
let timeButtons = 0;
let promptTimeout = null;
let promptMessageQueue = [];
let rideId = null;
let thisRider = null;

const typeColorMap = {
    "normal":"#aec8a8",
    "alert":"#ec4d4d"
};
const historyLength = 20;
const shortHistoryLength = 5;
const mphPerRpm = 4.3;
const bikeServer = "ws://minihome.dankurtz.local:8001/";
const Http = new XMLHttpRequest();

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

function saveName() {
    ridername = document.getElementById('name').value

    if (ridername.length > 0) {
        setCookie('name', ridername, 2100);
        document.getElementById('getNameTile').style.display = "none";
    } else {
        alert('Please enter a name');
    }
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

function tick() {
    elapsedTime = Date.now() - startTime;

    elapsedTimeDate = new Date(elapsedTime);

    hours = elapsedTimeDate.getUTCHours().toString();
    minutes = elapsedTimeDate.getUTCMinutes().toString();
    seconds = elapsedTimeDate.getUTCSeconds().toString();

    hours = hours.length == 1 ? "0" + hours : hours;
    minutes = minutes.length == 1 ? "0" + minutes : minutes;
    seconds = seconds.length == 1 ? "0" + seconds : seconds;

    timeString = hours + ":" + minutes + ":" + seconds;
    timeField = document.getElementById('time');
    timeField.innerHTML = timeString;

    aRpm = totalRpms / totalMs

    let payload = {
        "id": rideId,
        "riderName": thisRider,
        "startTime": startTime,
        "elapsedTime": elapsedTime,
        "avgRpm": aRpm,
        "maxRpm": maxRpms,
        "distanceMiles": miles
    }

    Http.open("POST", "/rideUpdate");
    Http.setRequestHeader("Content-Type", "application/json");
    Http.onreadystatechange = function() {
        if (Http.readyState === XMLHttpRequest.DONE && Http.status === 200) {
            response = JSON.parse(Http.responseText);

            if (response['status'] == 'success' && rideId == null) {
                rideId = response['rideId'];
            }
        }
    }
    Http.send(JSON.stringify(payload));
}

function showPrompt(message, duration, type) {
    promptData = [message,duration,type];

    let skip = false;

    if (promptMessageQueue.length == 0) {
        promptElement = document.getElementById('prompt');

        promptElement.style.display = "block";
        promptElement.classList.add("openAnimation");

        promptTimeout = setTimeout(loopAllPromptMessages, 500);
        setTimeout(() => {
            promptElement = document.getElementById('prompt');
            promptElement.classList.remove("openAnimation");
        }, 1000)
    } else {
        if (promptMessageQueue.length > 0) {
            for (let i in promptMessageQueue) {
                if (promptMessageQueue[i][0] == promptData[0]) {skip = true;}
            }
        }
    }
    if (skip == false) promptMessageQueue.push(promptData);
}

function loopAllPromptMessages() {

    promptData = promptMessageQueue[0];

    promptElement = document.getElementById('prompt');

    promptElement.innerHTML = promptData[0]
    promptElement.style.opacity = "100";
    promptElement.style.color = typeColorMap[promptData[2]];
    promptElement.classList.remove("fadeOutAnimation");
    promptElement.classList.add("fadeInAnimation");

    setTimeout(function() {
        promptElement = document.getElementById('prompt');
        promptElement.style.opacity = "0"
        promptElement.classList.remove("fadeInAnimation");
        promptElement.classList.add("fadeOutAnimation");

        promptMessageQueue.splice(0, 1);

        if (promptMessageQueue.length == 0) closePrompt();

        setTimeout(() => {
            promptElement.classList.remove("fadeOutAnimation");
            if (promptMessageQueue.length > 0) loopAllPromptMessages();     
        }, 500);
    }, promptData[1]);
}

function closePrompt() {
    promptElement = document.getElementById('prompt');
    promptElement.classList.add("closeAnimation");
    setTimeout(function() {
        promptElement = document.getElementById('prompt');
        promptElement.style.display = "none";
        promptElement.classList.remove("closeAnimation");
    }, 1000)
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

function receiveRPMS(websocket) {
    console.log('Loaded...');

    // rpm updates from the bake
    websocket.addEventListener("message", ({ data }) => {
        if (data != "Hi!") {

            // start the timer if it is not already going
            if (startTime == null) {
                startTime = Date.now();
                setInterval(tick, 200);
            }

            payload = JSON.parse(data)

            // rolls mph and rpm fields back to zero if rpm updates stop
            clearTimeout(backToZeroTime);
            backToZeroTime = setTimeout(backToZero, 2000);

            // fields which need updating
            rpmField = document.getElementById('rpms');
            mphField = document.getElementById('mph');
            distanceField = document.getElementById('miles');
            arpmField = document.getElementById('arpm');
            amphField = document.getElementById('amph');
            mrpmField = document.getElementById('mrpm');
            mmphField = document.getElementById('mmph');

            // get rpms, store the history for standard deviation calcs
            rpm = parseFloat(payload['rpm']);
            rpmHistory.push(rpm);
            if (rpmHistory.length > historyLength) rpmHistory.splice(0, 1);
            rpmStdDev = getStandardDeviation(rpmHistory);
            //console.log(rpm.toString() + ";" + rpmStdDev.toString());

            // determine mph from rpm
            mph = rpm / mphPerRpm;

            // get the time duration for the last update in secs and ms
            elapsedSec = parseFloat(payload['time_diff_sec']);
            elapsedMs = elapsedSec * 1000;

            // determine distance traveled based on time and mph, add to total distance traveled
            netDistance = mph * (elapsedSec / 60 / 60);
            if (netDistance > 0) miles = miles + netDistance;

            // add time and rpm to the short history, determine rpm weighted average based on short history
            rpmHistoryShort.push(rpm);
            timeHistoryShort.push(elapsedMs);

            if (rpmHistoryShort.length > shortHistoryLength) {
                rpmHistoryShort.splice(0, 1);
                timeHistoryShort.splice(0, 1);
            }

            // add to totals used for calculating average rpm/mph
            totalRpms += rpm * elapsedMs;
            totalMs += elapsedMs;

            // smoothing the rpm to account for noise from the sensor
            displayedRpm = rpmHistoryShort.length < shortHistoryLength ? rpm : w_avg(rpmHistoryShort, timeHistoryShort);
            displayedMph = timeHistoryShort.length < shortHistoryLength ? mph : displayedRpm / mphPerRpm;

            // add to max rpm
            if (displayedRpm > maxRpms) maxRpms = displayedRpm;
            aRpm = totalRpms / totalMs;
            aMph = aRpm / mphPerRpm;
            mMph = maxRpms / mphPerRpm;

            // format the fields for display
            rpmRounded = numberToStringFormatter(Math.round((displayedRpm + Number.EPSILON) * 10) / 10, 1);
            mphRounded = numberToStringFormatter(Math.round((displayedMph + Number.EPSILON) * 10) / 10, 1);
            milesRounded = numberToStringFormatter(Math.round((miles + Number.EPSILON) * 100) / 100, 2);
            arpmRounded = numberToStringFormatter(Math.round((aRpm + Number.EPSILON) * 10) / 10, 1);
            amphRounded = numberToStringFormatter(Math.round((aMph + Number.EPSILON) * 10) / 10, 1);
            mrpmRounded = numberToStringFormatter(Math.round((maxRpms + Number.EPSILON) * 10) / 10, 1);
            mmphRounded = numberToStringFormatter(Math.round((mMph + Number.EPSILON) * 10) / 10, 1);

            // populate the fields values
            rpmField.innerHTML = rpmRounded;
            mphField.innerHTML = mphRounded;
            distanceField.innerHTML = milesRounded;
            arpmField.innerHTML = arpmRounded;
            amphField.innerHTML = amphRounded;
            mrpmField.innerHTML = arpmRounded;
            mmphField.innerHTML = amphRounded;

        }
    });
}

function backToZero() {
    rpmField = document.getElementById('rpms');
    mphField = document.getElementById('mph');

    rpms = Math.round(parseFloat(rpmField.innerHTML));
    rpms -= 2;
    mph = Math.round(rpms / mphPerRpm);

    rpmField.innerHTML = numberToStringFormatter(rpms < 0 ? 0 : rpms.toString(), 1);
    mphField.innerHTML = numberToStringFormatter(mph < 0 ? 0 : mph.toString(), 1);
    
    if (rpms > 0) backToZeroTime = setTimeout(backToZero, 40);
}

function loadHistory() {
    let payload = {
        "riderName":thisRider
    }

    Http.open("POST", "/getHistory");
    Http.setRequestHeader("Content-Type", "application/json");
    Http.onreadystatechange = function() {
        if (Http.readyState === XMLHttpRequest.DONE && Http.status === 200) {
            response = JSON.parse(Http.responseText);

            if (response['status'] == 'success' && rideId == null) {
                //fields to be updated
                lastDistanceField = document.getElementById('lastdistance');
                lastAvgRpmField = document.getElementById('lastrpm');
                lastAvgMphField = document.getElementById('lastmph');
                lastMaxRpmField = document.getElementById('lastpeakrpm');
                totalDistanceField = document.getElementById('alldistance');

                lastDistanceField.innerHTML = numberToStringFormatter(Math.round((parseFloat(response['distanceMiles']) + Number.EPSILON) * 100) / 100, 2) +"mi";
                lastAvgRpmField.innerHTML = numberToStringFormatter(Math.round((parseFloat(response['avgRpm']) + Number.EPSILON) * 10) / 10, 1);
                lastAvgMphField.innerHTML = numberToStringFormatter(Math.round((parseFloat(response['avgRpm'] / mphPerRpm) + Number.EPSILON) * 10) / 10, 1)
                lastMaxRpmField.innerHTML = numberToStringFormatter(Math.round((parseFloat(response['maxRpm']) + Number.EPSILON) * 10) / 10, 1);
                totalDistanceField.innerHTML = numberToStringFormatter(Math.round((parseFloat(response['totalDistance']) + Number.EPSILON) * 100) / 100, 2) +"mi";
            }
        }
    }
    Http.send(JSON.stringify(payload));

}

function socketConnect() {
    let websocket = new WebSocket(bikeServer);
    receiveRPMS(websocket);
    
    websocket.addEventListener('open', (event) => {
        websocket.send("Hi!");
        showPrompt('Connected', 3000, 'normal');
    });

    websocket.addEventListener('error', (event) => {
        showPrompt('Connection Error', 1000, 'alert');
    });

    websocket.addEventListener('close', (event) => {
        showPrompt('Disconnected', 1000, 'alert');
        socketConnect();
    });
}

window.addEventListener("DOMContentLoaded", () => {
    socketConnect();

    thisRider = getCookie('name');

    if (thisRider == false) {
        document.getElementById('getNameTile').style.display = "block";
    } else {
        showPrompt('Hello '+ thisRider, 3000, 'normal');
        loadHistory();
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