from datetime import datetime
import RPi.GPIO as GPIO
import json
import asyncio
import websockets

class rpm_meter:
    def __init__(self):
        self.lastReadTime = None
        self.connectedSocket = None
        self.connectedRiders = {}

        GPIO.setmode(GPIO.BCM)
        GPIO.setup(7, GPIO.OUT)
        GPIO.output(7, 1)
        GPIO.setup(7, GPIO.IN, pull_up_down=GPIO.PUD_UP)

    def rev_cb(self, channel):
        if self.lastReadTime != None:
            timediff = datetime.now() - self.lastReadTime
            timediffsec = timediff.total_seconds()

            rpm = 60 / (timediffsec * 4)

            data = {
                "action":"Rotate",
                "rpm": rpm,
                "time_diff_sec": timediffsec
            }
            
            if self.connectedSocket != None:
                asyncio.run(self.connectedSocket.send(json.dumps(data)))
            
        self.lastReadTime = datetime.now()

meter = rpm_meter()

GPIO.add_event_detect(7, GPIO.FALLING, callback=meter.rev_cb, bouncetime=30)

async def handler(websocket):
    while True:
        try:
            message = await websocket.recv()
            
            payload = json.loads(message)

            if payload['action'] == "Connect":                
                meter.connectedSocket = websocket
                
                if payload['rideId'] == None:
                    meter.lastReadTime = None

            if payload['action'] == "Pause":
                meter.lastReadTime = None

            await websocket.send(message)
        except websockets.ConnectionClosedOK:
            if meter.connectedSocket == websocket:
                meter.connectedSocket = None
            break
        except websockets.ConnectionClosedError:
            if meter.connectedSocket == websocket:
                meter.connectedSocket = None
            break

        print(message) 
 
 
async def main(): 
    async with websockets.serve(handler, "minihome.dankurtz.local", 8001): 
        await asyncio.Future()  # run forever 

if __name__ == "__main__": 
    asyncio.run(main())