
from flask import Flask
from flask import request
from flask import render_template
from flask_sqlalchemy import SQLAlchemy


app = Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////tmp/six.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = True
db = SQLAlchemy(app)


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/six")
def six():
    username = request.args.get("username")
    email = request.args.get("email")
    user = User.query.filter_by(username=username).first()

    if not user:
        user = User(username=username, email=email)
        db.session.add(user)
        db.session.commit()
    if email and not user.email == email:
        user.email = email
        db.session.commit()

    return render_template("six.html", user=user)

@app.after_request
def add_header(r):
    r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    r.headers["Pragma"] = "no-cache"
    r.headers["Expires"] = "0"
    r.headers['Cache-Control'] = 'public, max-age=0'
    return r

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)

    def __repr__(self):
        return f"User: {self.username}, ({self.email})"
