function receiveRPMS(websocket) {
    console.log('Loaded...');
    websocket.addEventListener("message", ({ data }) => {
        rpmField = document.getElementById('rpms');

        rpmField.innerHTML = data;
    });
}

window.addEventListener("DOMContentLoaded", () => {
    const websocket = new WebSocket("ws://minihome.dankurtz.local:8001/")

    setTimeout(function() {websocket.send("Hi!")}, 2000);
    receiveRPMS(websocket);
});