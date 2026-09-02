# Air Quality Anomaly Detection — Setup Guide

## Files
- `sensor_logger.py` — reads MQTT from ESP32, stores in SQLite
- `train_model.py`   — trains IsolationForest on collected data
- `detector.py`      — scores new readings (used by Flask)
- `app.py`           — Flask REST API for dashboard
- `simulate.py`      — fake data generator for testing

---

## Step 1 — Install dependencies
```bash
pip install -r requirements.txt
```

---

## Step 2 — Collect baseline data (3-7 days minimum)
Run the logger while your ESP32 publishes to MQTT:
```bash
python sensor_logger.py
```
ESP32 should publish to topic: `campus/airquality/nodeA`
Payload format: `{"pm25":35,"co2":820,"voc":0.15,"temp":28,"humidity":72}`

---

## Step 3 — Train the model
After collecting data, train IsolationForest:
```bash
python train_model.py
```
This creates `anomaly_model.pkl` and `scaler.pkl`.

---

## Step 4 — Start the Flask API
```bash
python app.py
```
API runs on `http://0.0.0.0:5000`

---

## Step 5 — Test with simulator (no hardware needed)
```bash
python simulate.py --spike
```
Watch the terminal — anomalies will be flagged with [ANOMALY].

---

## API Endpoints for your dashboard

| Endpoint | Method | Description |
|---|---|---|
| `/reading` | POST | ESP32 sends reading here |
| `/latest` | GET | Latest reading per node |
| `/anomalies` | GET | Last 50 flagged events |
| `/history?hours=6` | GET | Past N hours for chart |

---

## ESP32 Arduino code (send to Flask instead of MQTT)
```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid     = "YOUR_WIFI";
const char* password = "YOUR_PASSWORD";
const char* apiUrl   = "http://YOUR_PI_IP:5000/reading";

void sendReading(float pm25, float co2, float voc, float temp, float hum) {
  HTTPClient http;
  http.begin(apiUrl);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<200> doc;
  doc["node_id"]  = "nodeA";
  doc["pm25"]     = pm25;
  doc["co2"]      = co2;
  doc["voc"]      = voc;
  doc["temp"]     = temp;
  doc["humidity"] = hum;

  String body;
  serializeJson(doc, body);
  int code = http.POST(body);
  http.end();
}
```