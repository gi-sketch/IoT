import json
import sqlite3
from datetime import datetime
import time
import paho.mqtt.client as mqtt

# ==========================================
# MQTT CONFIG
# ==========================================
MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
MQTT_TOPIC = "campus/airquality/#"

# ==========================================
# DATABASE
# ==========================================
DB_PATH = "air_quality.db"


# ==========================================
# INIT DB
# ==========================================
def init_db():
    conn = sqlite3.connect(DB_PATH)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS readings(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            node_id TEXT NOT NULL,

            latitude REAL,
            longitude REAL,
            location TEXT,

            co2 REAL,
            voc REAL,
            dust REAL,
            temp REAL,
            humidity REAL,
            aqi REAL
        )
    """)

    conn.commit()
    conn.close()


# ==========================================
# SAVE TO DB
# ==========================================
def save_to_db(data):
    conn = sqlite3.connect(DB_PATH)

    conn.execute("""
        INSERT INTO readings (
            timestamp,
            node_id,
            latitude,
            longitude,
            location,
            co2,
            voc,
            dust,
            temp,
            humidity,
            aqi
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data["timestamp"],
        data["node_id"],
        data.get("latitude"),
        data.get("longitude"),
        data.get("location"),
        data.get("co2"),
        data.get("voc"),
        data.get("dust"),
        data.get("temp"),
        data.get("humidity"),
        data.get("aqi")
    ))

    conn.commit()
    conn.close()


# ==========================================
# ANOMALY DETECTION (REAL-TIME)
# ==========================================
def is_anomaly(data):

    return (
        (data.get("aqi") or 0) > 150 or
        (data.get("co2") or 0) > 2000 or
        (data.get("voc") or 0) > 0.8 or
        (data.get("temp") or 0) > 35 or
        (data.get("humidity") or 0) > 85
    )


# ==========================================
# MQTT CALLBACKS
# ==========================================
def on_connect(client, userdata, flags, rc):

    if rc == 0:
        print("\n================================")
        print("MQTT CONNECTED")
        print("================================")
        print(f"Broker : {MQTT_BROKER}:{MQTT_PORT}")
        print(f"Topic  : {MQTT_TOPIC}")
        print("================================\n")

        client.subscribe(MQTT_TOPIC)

    else:
        print("MQTT Connection Failed:", rc)


def on_message(client, userdata, msg):

    try:
        payload = json.loads(msg.payload.decode())

        now = datetime.now().isoformat()

        data = {
            "timestamp": now,
            "node_id": payload.get("node_id") or msg.topic.split("/")[-1],

            "latitude": payload.get("latitude"),
            "longitude": payload.get("longitude"),
            "location": payload.get("location"),

            "co2": payload.get("co2"),
            "voc": payload.get("voc"),
            "dust": payload.get("dust"),
            "temp": payload.get("temp"),
            "humidity": payload.get("humidity"),
            "aqi": payload.get("aqi")
        }

        save_to_db(data)

        # ================= PRINT SENSOR DATA =================
        print("--------------------------------")
        print("Timestamp :", data["timestamp"])
        print("Node      :", data["node_id"])
        print("CO2       :", data["co2"], "ppm")
        print("VOC       :", data["voc"], "mg/m3")
        print("Dust      :", data["dust"], "ug/m3")
        print("Temp      :", data["temp"], "C")
        print("Humidity  :", data["humidity"], "%")
        print("AQI       :", data["aqi"])
        print("--------------------------------")

        # ================= ANOMALY ALERT =================
        if is_anomaly(data):
            print("🚨 ANOMALY DETECTED FROM NODE:", data["node_id"])

    except json.JSONDecodeError:
        print("[ERROR] Invalid JSON:", msg.payload)

    except Exception as e:
        print("[ERROR]", str(e))


# ==========================================
# MAIN LOOP (WITH AUTO RECONNECT)
# ==========================================
def main():

    init_db()

    client = mqtt.Client()

    client.on_connect = on_connect
    client.on_message = on_message

    print("\nConnecting to MQTT...\n")

    while True:
        try:
            client.connect(MQTT_BROKER, MQTT_PORT, 60)
            client.loop_forever()

        except Exception as e:
            print("[MQTT ERROR]", e)
            print("Reconnecting in 5 seconds...\n")
            time.sleep(5)


if __name__ == "__main__":
    main()