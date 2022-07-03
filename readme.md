<div id="top"></div>

# Smart Bike Console
<p align="center">
    <img src="https://github.com/aukteris/bike-console/blob/master/interface.png?raw=true" width="200" />
</p>
## About

This is a console app designed to work with a Schwinn IC3 exercise bike. I felt the bike console you can get for the bike didn't show enough statistics or capture history, so I designed this as a DIY alternative.

It consists of 2 parts:
1. A bike server script which runs on a raspberry pi and receives input from the bike senser via a 3.5mm adapter via GPIO.
2. A console server which hosts a web app client that connects to the bike server via websockets.

The console runs in a browser and is iOS web app compatible. The client is designed to be used in mobile web browsers (specifically iPhone 13). It does not prevent screen auto-lock so you must manually disable this setting on the phone while the app is in use. (Note: Native iOS app planned to address this in the long term).