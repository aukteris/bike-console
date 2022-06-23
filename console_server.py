from flask import Flask, request, Response, redirect, url_for, render_template
import sqlite3
import json

app = Flask(__name__)

con = sqlite3.connect('persist.db')
cur = con.cursor()

cur.execute('CREATE TABLE IF NOT EXISTS rideHistory (id INTEGER PRIMARY KEY AUTOINCREMENT, riderName TEXT, startTime TEXT, elapsedTimeSec INTEGER, avgRpm REAL, maxRpm REAL, distanceMiles REAL)')

@app.route("/")
def root():
    return render_template('index.html')

@app.route("/rideUpdate", methods=["POST"])
def rideUpdate():
    payload = json.loads(request.data)
    id = None

    if payload['id'] == None:
        cur.execute('INSERT INTO rideHistory (riderName, startTime, elapsedTimeSec, avgRpm, maxRpm, distanceMiles) VALUES (:riderName, :startTime, :elapsedTime, :avgRpm, :maxRpm, :distanceMiles)', payload)
        id = cur.lastrowid
    else:
        cur.execute('UPDATE rideHistory SET elapsedTimeSec = :elapsedTime, avgRpm = :avgRpm, maxRpm = :maxRpm, distanceMiles = :distanceMiles WHERE id = :id', payload)
        id = payload['id']
    pass

    con.commit()

    result = {"status":"success", "rideId":id}

    return json.dumps(result)

if __name__ == "__main__":
    app.run()
