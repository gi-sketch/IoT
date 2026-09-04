import os
import sys

# ==========================================
# PROJECT PATH
# ==========================================

# C:\IoT
PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

# Add C:\IoT to Python's import path
# This allows: from api.signup import signup_api
sys.path.insert(0, PROJECT_ROOT)


from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS


# ==========================================
# IMPORT API BLUEPRINTS
# ==========================================

from api.signup import signup_api
from api.login import login_api
from api.sensors import sensor_api
from api.anomalies import anomaly_api
from api.admin import admin_api

# ==========================================
# PROJECT PATHS
# ==========================================

FRONTEND_DIR = os.path.join(
    PROJECT_ROOT,
    "frontend"
)


# ==========================================
# CREATE FLASK APP
# ==========================================

app = Flask(
    __name__,
    static_folder=FRONTEND_DIR,
    static_url_path=""
)


# ==========================================
# ENABLE CORS
# ==========================================

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": "*"
        }
    }
)


# ==========================================
# REGISTER API BLUEPRINTS
# ==========================================

app.register_blueprint(signup_api)
app.register_blueprint(login_api)
app.register_blueprint(sensor_api)
app.register_blueprint(anomaly_api)
app.register_blueprint(admin_api)

# ==========================================
# FRONTEND ROUTES
# ==========================================

@app.route("/")
def home():
    return send_from_directory(
        FRONTEND_DIR,
        "login.html"
    )


# ==========================================
# LOGIN PAGE
# ==========================================

@app.route("/login")
def login_page():
    return send_from_directory(
        FRONTEND_DIR,
        "login.html"
    )


# ==========================================
# SIGNUP PAGE
# ==========================================

@app.route("/signup")
def signup_page():
    return send_from_directory(
        FRONTEND_DIR,
        "signup.html"
    )


# ==========================================
# DASHBOARD PAGE
# ==========================================

@app.route("/dashboard")
def dashboard_page():
    return send_from_directory(
        FRONTEND_DIR,
        "index.html"
    )


# ==========================================
# ABOUT PAGE
# ==========================================

@app.route("/about")
def about():
    return send_from_directory(
        FRONTEND_DIR,
        "about.html"
    )


# ==========================================
# SETTINGS PAGE
# ==========================================

@app.route("/settings")
def settings():
    return send_from_directory(
        FRONTEND_DIR,
        "settings.html"
    )

@app.route("/admin")
def admin_page():
    return send_from_directory(FRONTEND_DIR, "admin.html")


# ==========================================
# API STATUS
# ==========================================

@app.route("/api/status")
def api_status():

    return jsonify({

        "status": "running",

        "project": "AirIQ - Smart Air Quality Monitoring System",

        "available_routes": [

            "POST /api/signup",

            "POST /api/login",

            "GET /api/latest",

            "GET /api/all",

            "GET /api/anomalies"

        ]

    })


# ==========================================
# RUN SERVER
# ==========================================

if __name__ == "__main__":

    print("\n================================")
    print("AIRIQ SMART AIR QUALITY SYSTEM")
    print("================================")

    print("\nFRONTEND")

    print("Login:")
    print("http://127.0.0.1:5000/")

    print("\nSignup:")
    print("http://127.0.0.1:5000/signup")

    print("\nDashboard:")
    print("http://127.0.0.1:5000/dashboard")

    print("\nAbout:")
    print("http://127.0.0.1:5000/about")

    print("\nSettings:")
    print("http://127.0.0.1:5000/settings")

    print("\nAPI STATUS:")
    print("http://127.0.0.1:5000/api/status")

    print("\nAPIs:")

    print("POST http://127.0.0.1:5000/api/signup")
    print("POST http://127.0.0.1:5000/api/login")

    print("GET  http://127.0.0.1:5000/api/latest")
    print("GET  http://127.0.0.1:5000/api/all")
    print("GET  http://127.0.0.1:5000/api/anomalies")

    print("\n================================\n")

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )