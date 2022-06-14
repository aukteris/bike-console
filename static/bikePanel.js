let backToZeroTime = null;
let miles = 0;

function receiveRPMS(websocket) {
    console.log('Loaded...');
    websocket.addEventListener("message", ({ data }) => {
        clearTimeout(backToZeroTime)
        rpmField = document.getElementById('rpms');

        rpm = parseFloat(data);
        
        rpmRounded = Math.round((rpm + Number.EPSILON) * 10) / 10
        
        rpmField.innerHTML = data == "Hi!" ? 0 : rpmRounded.toString();
        

        backToZeroTime = setTimeout(backToZero, 1000);
    });
}

function backToZero() {
    rpmField = document.getElementById('rpms');
    rpms = Math.round(parseFloat(rpmField.innerHTML));
    rpms--;
    rpmField.innerHTML = rpms < 0 ? 0 : rpms.toString();
    
    if (rpms > 0) backToZeroTime = setTimeout(backToZero, 50);
}

window.addEventListener("DOMContentLoaded", () => {
    const websocket = new WebSocket("ws://minihome.dankurtz.local:8001/")

    setTimeout(function() {websocket.send("Hi!")}, 2000);
    receiveRPMS(websocket);
});