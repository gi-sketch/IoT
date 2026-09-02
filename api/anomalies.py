from flask import Blueprint, jsonify

from api.database import get_sqlite_connection


anomaly_api = Blueprint(
    "anomaly_api",
    __name__
)


@anomaly_api.route("/api/anomalies")
def anomalies():

    connection = get_sqlite_connection()

    cursor = connection.cursor()


    cursor.execute("""
        SELECT *
        FROM readings
        WHERE
            aqi > 150
            OR co2 > 2000
            OR voc > 0.8
            OR temp > 35
            OR humidity > 85
        ORDER BY id DESC
        LIMIT 50
    """)


    rows = cursor.fetchall()


    connection.close()


    return jsonify([
        dict(row)
        for row in rows
    ])