from datetime import datetime
import RPi.GPIO as GPIO

import asyncio
import websockets

class rpm_meter:
    def __init__(self):
        self.lastReadTime = None
        self.connectedSocket = None

        GPIO.setmode(GPIO.BCM)
        GPIO.setup(7, GPIO.OUT)
        GPIO.output(7, 1)
        GPIO.setup(7, GPIO.IN, pull_up_down=GPIO.PUD_UP)

    def rev_cb(self, channel):
        if self.lastReadTime != None:
            timediff = datetime.now() - self.lastReadTime
            timediffsec = timediff.total_seconds()

            rpm = 60 / (timediffsec * 4)
            
            #asyncio.run(self.transmit(rpm))
            asyncio.run(self.connectedSocket.send(str(rpm)))
            
        self.lastReadTime = datetime.now()

    #async def transmit(self, rpm):
        #async with websockets.connect("ws://minihome.dankurtz.local:8001") as websocket:
            #await websocket.send(str(rpm));

meter = rpm_meter()

GPIO.add_event_detect(7, GPIO.FALLING, callback=meter.rev_cb, bouncetime=30)

async def handler(websocket):
    while True:
        try:
            message = await websocket.recv()
            if message == "Hi!":
                meter.connectedSocket = websocket
            await websocket.send(message)
        except websockets.ConnectionClosedOK:
            break

        print(message) 
 
 
async def main(): 
    async with websockets.serve(handler, "minihome.dankurtz.local", 8001): 
        await asyncio.Future()  # run forever 

if __name__ == "__main__": 
    asyncio.run(main())