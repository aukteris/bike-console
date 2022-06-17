let backToZeroTime = null;
let miles = 0;
let rpmHistory = [];
let rpmHistoryShort = [];
let timeHistoryShort = [];
let startTime = null;
let totalRpms = 0;
let totalMs = 0;

const historyLength = 20;
const shortHistoryLength = 5;
const mphPerRpm = 4.3;
const bikeServer = "ws://minihome.dankurtz.local:8001/";

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
}

function showPrompt(message, duration) {
    promptElement = document.getElementById('prompt');

    promptElement.innerHTML = message;
    promptElement.style.display = "block";
    promptElement.classList.add("openAnimation");

    setTimeout(removePrompt, duration);
}

function removePrompt() {
    promptElement = document.getElementById('prompt');

    promptElement.classList.remove("openAnimation");
    promptElement.classList.add("closeAnimation");

    setTimeout(function() {
        promptElement = document.getElementById('prompt');
        promptElement.style.display = "none";
        promptElement.classList.remove("closeAnimation");
    }, 1000)
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

            totalRpms += rpm * elapsedMs;
            totalMs += elapsedMs;

            displayedRpm = rpmHistoryShort.length < shortHistoryLength ? rpm : w_avg(rpmHistoryShort, timeHistoryShort);
            displayedMph = timeHistoryShort.length < shortHistoryLength ? mph : displayedRpm / mphPerRpm;
            aRpm = totalRpms / totalMs;
            aMph = aRpm / mphPerRpm;

            // format the fields for display
            rpmRounded = numberToStringFormatter(Math.round((displayedRpm + Number.EPSILON) * 10) / 10, 1);
            mphRounded = numberToStringFormatter(Math.round((displayedMph + Number.EPSILON) * 10) / 10, 1);
            milesRounded = numberToStringFormatter(Math.round((miles + Number.EPSILON) * 100) / 100, 2);
            arpmRounded = numberToStringFormatter(Math.round((aRpm + Number.EPSILON) * 10) / 10, 1);
            amphRounded = numberToStringFormatter(Math.round((aMph + Number.EPSILON) * 10) / 10, 1);

            /* for standard devation approached
            lastIndex = rpmHistory.length - 2;
            
            if (rpmStdDev > 20 && rpm > rpmHistory[lastIndex]) {
                console.log('Increase too high: suppressing');
            } else {
                rpmField.innerHTML = rpmRounded.toString();
                mphField.innerHTML = mphRounded.toString();
            }
            */
            rpmField.innerHTML = rpmRounded;
            mphField.innerHTML = mphRounded;
            distanceField.innerHTML = milesRounded;
            arpmField.innerHTML = arpmRounded;
            amphField.innerHTML = amphRounded;
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

window.addEventListener("DOMContentLoaded", () => {
    const websocket = new WebSocket(bikeServer)

    thisRider = getCookie('name');

    if (thisRider == false) {
        document.getElementById('getNameTile').style.display = "block";
    } else {
        showPrompt('Hello '+ thisRider, 5000);
    }

    rpmField = document.getElementById('rpms');
    mphField = document.getElementById('mph');
    distanceField = document.getElementById('miles');
    arpmField = document.getElementById('arpm');
    amphField = document.getElementById('amph');

    rpmField.innerHTML = numberToStringFormatter(0, 1);
    mphField.innerHTML = numberToStringFormatter(0, 1);
    distanceField.innerHTML = numberToStringFormatter(0, 2);
    arpmField.innerHTML = numberToStringFormatter(0, 1);
    amphField.innerHTML = numberToStringFormatter(0, 1);

    setTimeout(function() {websocket.send("Hi!")}, 2000);
    receiveRPMS(websocket);
});