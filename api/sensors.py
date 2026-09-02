from flask import Blueprint, jsonify

from api.database import get_sqlite_connection


sensor_api = Blueprint(
    "sensor_api",
    __name__
)


# ==========================================
# Latest reading
# ==========================================

@sensor_api.route("/api/latest")
def latest():

    connection = get_sqlite_connection()

    cursor = connection.cursor()


    cursor.execute("""
        SELECT
            timestamp,
            node_id,
            co2,
            voc,
            temp,
            humidity,
            aqi
        FROM readings
        ORDER BY id DESC
        LIMIT 1
    """)


    row = cursor.fetchone()


    connection.close()


    if row:

        return jsonify({
            "timestamp": row["timestamp"],
            "node_id": row["node_id"],
            "co2": row["co2"],
            "voc": row["voc"],
            "temp": row["temp"],
            "humidity": row["humidity"],
            "aqi": row["aqi"]
        })


    return jsonify({
        "error": "No data found"
    })


# ==========================================
# Last 100 readings
# ==========================================

@sensor_api.route("/api/all")
def all_data():

    connection = get_sqlite_connection()

    cursor = connection.cursor()


    cursor.execute("""
        SELECT
            timestamp,
            node_id,
            co2,
            voc,
            temp,
            humidity,
            aqi
        FROM readings
        ORDER BY id DESC
        LIMIT 100
    """)


    rows = cursor.fetchall()


    connection.close()


    data = []


    for row in rows:

        data.append({
            "timestamp": row["timestamp"],
            "node_id": row["node_id"],
            "co2": row["co2"],
            "voc": row["voc"],
            "temp": row["temp"],
            "humidity": row["humidity"],
            "aqi": row["aqi"]
        })


    return jsonify(data)