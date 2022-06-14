from flask import Flask, request, Response, redirect, url_for, render_template

app = Flask(__name__)

@app.route("/")
def root():
    return render_template('index.html')

if __name__ == "__main__":
    app.run()
