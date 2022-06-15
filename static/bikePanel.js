let backToZeroTime = null;
let miles = 0;
let rpmHistory = [];
let startTime = null;

function getStandardDeviation (array) {
    const n = array.length
    const mean = array.reduce((a, b) => a + b) / n
    return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)
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
    websocket.addEventListener("message", ({ data }) => {
        if (data != "Hi!") {
            if (startTime == null) {
                startTime = Date.now();
                setInterval(tick, 200);
            }

            payload = JSON.parse(data)

            clearTimeout(backToZeroTime);

            rpmField = document.getElementById('rpms');
            mphField = document.getElementById('mph');
            distanceField = document.getElementById('miles');

            rpm = parseFloat(payload['rpm']);
            rpmHistory.push(rpm);
            if (rpmHistory.length > 20) rpmHistory.splice(0, 1);
            rpmStdDev = getStandardDeviation(rpmHistory);
            //console.log(rpm.toString() + ";" + rpmStdDev.toString());

            mph = rpm / 4.3;

            elapsedSec = parseFloat(payload['time_diff_sec']);
            netDistance = mph * (elapsedSec / 60 / 60);
            if (netDistance > 0) miles = miles + netDistance;

            rpmRounded = Math.round((rpm + Number.EPSILON) * 10) / 10;
            mphRounded = Math.round((mph + Number.EPSILON) * 10) / 10;
            milesRounded = Math.round((miles + Number.EPSILON) * 100) / 100;

            lastIndex = rpmHistory.length - 2;
            
            if (rpmStdDev > 20 && rpm > rpmHistory[lastIndex]) {
                console.log('Increase too high: suppressing');
            } else {
                rpmField.innerHTML = rpmRounded.toString();
                mphField.innerHTML = mphRounded.toString();
            }
            distanceField.innerHTML = milesRounded.toString();

            backToZeroTime = setTimeout(backToZero, 1000);
        }
    });
}

function backToZero() {
    rpmField = document.getElementById('rpms');
    mphField = document.getElementById('mph');

    rpms = Math.round(parseFloat(rpmField.innerHTML));
    rpms--;
    mph = Math.round(rpms / 4.3);

    rpmField.innerHTML = rpms < 0 ? 0 : rpms.toString();
    mphField.innerHTML = mph < 0 ? 0 : mph.toString();
    
    if (rpms > 0) backToZeroTime = setTimeout(backToZero, 50);
}

window.addEventListener("DOMContentLoaded", () => {
    const websocket = new WebSocket("ws://minihome.dankurtz.local:8001/")

    setTimeout(function() {websocket.send("Hi!")}, 2000);
    receiveRPMS(websocket);
});