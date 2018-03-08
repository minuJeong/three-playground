
from flask import Flask
from flask import render_template


app = Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True
@app.route("/")
def index():
    return render_template("index.html")
