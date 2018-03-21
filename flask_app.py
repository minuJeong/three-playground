
from flask import Flask
from flask import request
from flask import redirect
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
    if not username:
        return redirect("/six/signup")

    exists = User.query.filter_by(username=username)
    print(exists)
    if exists:
        user = exists.first()

        if not user:
            user = User(username=username)
            db.session.add(user)
            db.session.commit()

        return render_template("six.html", user=user)
    else:
        return redirect("/six/signup")

@app.route("/six/signup")
def signup():
    return render_template("signup.html")

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

    def __repr__(self):
        return f"User: {self.username}"

db.create_all()
