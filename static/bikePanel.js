let backToZeroTime = null;
let miles = 0;
let rpmHistory = [];
let rpmHistoryShort = [];
let timeHistoryShort = [];
let startTime = null;
const historyLength = 20;
const shortHistoryLength = 5;
const mphPerRpm = 4.3;

function getStandardDeviation (array) {
    const n = array.length
    const mean = array.reduce((a, b) => a + b) / n
    return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)
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

            displayedRpm = rpmHistoryShort.length < shortHistoryLength ? rpm : w_avg(rpmHistoryShort, timeHistoryShort);
            displayedMph = timeHistoryShort.length < shortHistoryLength ? mph : displayedRpm / mphPerRpm;

            // format the fields for display
            rpmRounded = numberToStringFormatter(Math.round((displayedRpm + Number.EPSILON) * 10) / 10, 1);
            mphRounded = numberToStringFormatter(Math.round((displayedMph + Number.EPSILON) * 10) / 10, 1);
            milesRounded = numberToStringFormatter(Math.round((miles + Number.EPSILON) * 100) / 100, 2);

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
        }
    });
}

function backToZero() {
    rpmField = document.getElementById('rpms');
    mphField = document.getElementById('mph');

    rpms = Math.round(parseFloat(rpmField.innerHTML));
    rpms--;
    mph = Math.round(rpms / mphPerRpm);

    rpmField.innerHTML = numberToStringFormatter(rpms < 0 ? 0 : rpms.toString(), 1);
    mphField.innerHTML = numberToStringFormatter(mph < 0 ? 0 : mph.toString(), 1);
    
    if (rpms > 0) backToZeroTime = setTimeout(backToZero, 50);
}

window.addEventListener("DOMContentLoaded", () => {
    const websocket = new WebSocket("ws://minihome.dankurtz.local:8001/")

    setTimeout(function() {websocket.send("Hi!")}, 2000);
    receiveRPMS(websocket);
});