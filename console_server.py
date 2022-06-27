from flask import Flask, request, Response, redirect, url_for, render_template
import sqlite3
import json
import atexit

app = Flask(__name__)

con = sqlite3.connect('persist.db')
cur = con.cursor()

cur.execute('CREATE TABLE IF NOT EXISTS rideHistory (id INTEGER PRIMARY KEY AUTOINCREMENT, riderName TEXT, startTime TEXT, elapsedTimeSec INTEGER, avgRpm REAL, maxRpm REAL, distanceMiles REAL)')

@app.route("/")
def root():
    return render_template('index.html')

@app.route("/getHistory", methods=["POST"])
def getHistory():
    payload = json.loads(request.data)

    # get the details for the last ride for the user
    cur.execute('SELECT avgRpm, maxRpm, distanceMiles FROM rideHistory WHERE riderName = :riderName ORDER BY startTime DESC LIMIT 1', payload)
    lastResult = cur.fetchall()

    # get the historic total stats for the user
    cur.execute('SELECT SUM(distanceMiles) as totalDistance FROM rideHistory WHERE riderName = :riderName', payload)
    totalResult = cur.fetchall()

    result = {
        "status":"success",
        "avgRpm":lastResult[0][0],
        "maxRpm":lastResult[0][1],
        "distanceMiles":lastResult[0][2],
        "totalDistance":totalResult[0][0]
    }

    return json.dumps(result)

@app.route("/rideUpdate", methods=["POST"])
def rideUpdate():
    payload = json.loads(request.data)
    id = None

    payload['elapsedTime'] = round(payload['elapsedTime'] / 1000)

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

def exit_handler():
    con.close()

atexit.register(exit_handler)