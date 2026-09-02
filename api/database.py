import os
import sqlite3
import mysql.connector
from dotenv import load_dotenv


# Load environment variables from .env
load_dotenv()


# ==========================================
# MySQL DATABASE
# User accounts
# ==========================================

def get_mysql_connection():

    connection = mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "localhost"),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD"),
        database=os.getenv("MYSQL_DATABASE", "airiq_db")
    )

    return connection


# ==========================================
# SQLite DATABASE
# Sensor readings
# ==========================================

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SQLITE_DB_PATH = os.path.join(
    BASE_DIR,
    "ml",
    "air_quality.db"
)


def get_sqlite_connection():

    connection = sqlite3.connect(SQLITE_DB_PATH)

    connection.row_factory = sqlite3.Row

    return connection