class rideControl {
    constructor(rider) {
        this.thisRider = rider;
        this.bikeServer = "ws://minihome.dankurtz.local:8001/";
        this.websocket = null;

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
        this.tickTimer = null;
        this.excludedTime = 0;
        this.paused = false;
        this.pauseStartTime = null;

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
        this.lastTimeField = document.getElementById('lasttime');
        this.lastDistanceField = document.getElementById('lastdistance');
        this.lastAvgRpmField = document.getElementById('lastrpm');
        this.lastAvgMphField = document.getElementById('lastmph');
        this.lastMaxRpmField = document.getElementById('lastpeakrpm');
        this.totalDistanceField = document.getElementById('alldistance');

        // ask for the rider name if one does not exist
        if (this.thisRider == false) {
            document.getElementById('getNameTile').style.display = "block";
        } else {
            messagePrompt.showPrompt('Hello '+ this.thisRider, 3000, 'normal');
        }

        this.socketConnect();
    }

    socketConnect() {
        this.websocket = new WebSocket(this.bikeServer);
        this.receiveRPMS();
        
        this.websocket.addEventListener('open', (event) => {
            let payload = {
                "action":"Connect",
                "rideId":this.rideId
            }
            this.websocket.send(JSON.stringify(payload));
        });
    
        this.websocket.addEventListener('error', (event) => {
            messagePrompt.showPrompt('Connection Error', 1000, 'alert');
        });
    
        this.websocket.addEventListener('close', (event) => {
            messagePrompt.showPrompt('Disconnected', 1000, 'alert');
            this.socketConnect();
        });
    }

    resetRide() {
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
        this.tickTimer = null;
        this.excludedTime = 0;
        this.paused = false;
        this.pauseStartTime = null;

        this.timeField.innerHTML = timeStringFormater(new Date(0));
        this.rpmField.innerHTML = numberToStringFormatter(0, 1);
        this.mphField.innerHTML = numberToStringFormatter(0, 1);
        this.distanceField.innerHTML = numberToStringFormatter(0, 2);
        this.arpmField.innerHTML = numberToStringFormatter(0, 1);
        this.amphField.innerHTML = numberToStringFormatter(0, 1);
        this.mrpmField.innerHTML = numberToStringFormatter(0, 1);
        this.mmphField.innerHTML = numberToStringFormatter(0, 1);

        if (this.thisRider != false) {
            this.loadHistory();
        }
    }

    saveName() {
        let assessRiderName = document.getElementById('name').value;
    
        if (assessRiderName.length > 0) {
            this.thisRider = assessRiderName;
            setCookie('name', this.thisRider, 2100);
            document.getElementById('getNameTile').style.display = "none";
            this.loadHistory();
        } else {
            alert('Please enter a name');
        }
    }

    receiveRPMS() {
        console.log('Loaded...');
    
        // rpm updates from the bike
        this.websocket.addEventListener("message", ({ data }) => {
            let payload = JSON.parse(data)

            switch(payload['action']) {
                case "Rotate":
                    if (this.paused == true) {
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

                case "Response":
                    switch(payload['requestAction']) {
                        case "Connect":
                            if (payload['status'] == "Primary-Client") {
                                messagePrompt.showPrompt('Connected', 3000, 'normal');
                            } else {
                                messagePrompt.showPrompt('Non-primary Client', 3000, 'alert');
                            }

                        case "Pause":
                            if (payload['status'] == "Not-primary") messagePrompt.showPrompt('Non-primary Client', 3000, 'alert');
                    }
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
        let rpms = Math.round(parseFloat(this.rpmField.innerHTML));
        rpms -= 2;
        let mph = Math.round(rpms / this.mphPerRpm);
    
        this.rpmField.innerHTML = numberToStringFormatter(rpms < 0 ? 0 : rpms.toString(), 1);
        this.mphField.innerHTML = numberToStringFormatter(mph < 0 ? 0 : mph.toString(), 1);
        
        if (rpms > 0) this.backToZeroTime = setTimeout(function() {this.backToZero()}.bind(this), 40);
    }

    loadHistory() {
        let payload = {
            "riderName":this.thisRider
        }
    
        Http.open("POST", "/getHistory");
        Http.setRequestHeader("Content-Type", "application/json");
        Http.onreadystatechange = function() {
            if (Http.readyState === XMLHttpRequest.DONE && Http.status === 200) {
                let response = JSON.parse(Http.responseText);
    
                if (response['status'] == 'success' && this.rideId == null) {
                    this.lastTimeField.innerHTML = timeStringFormater(new Date(parseInt(response['elapsedTimeSec']) * 1000));
                    this.lastDistanceField.innerHTML = numberToStringFormatter(Math.round((parseFloat(response['distanceMiles']) + Number.EPSILON) * 100) / 100, 2) +"mi";
                    this.lastAvgRpmField.innerHTML = numberToStringFormatter(Math.round((parseFloat(response['avgRpm']) + Number.EPSILON) * 10) / 10, 1);
                    this.lastAvgMphField.innerHTML = numberToStringFormatter(Math.round((parseFloat(response['avgRpm'] / this.mphPerRpm) + Number.EPSILON) * 10) / 10, 1)
                    this.lastMaxRpmField.innerHTML = numberToStringFormatter(Math.round((parseFloat(response['maxRpm']) + Number.EPSILON) * 10) / 10, 1);
                    this.totalDistanceField.innerHTML = numberToStringFormatter(Math.round((parseFloat(response['totalDistance']) + Number.EPSILON) * 100) / 100, 2) +"mi";
                }
            }
        }.bind(this);
        Http.send(JSON.stringify(payload));
    }
}