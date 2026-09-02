"""
simulate.py
Sends fake sensor readings to your Flask API so you can test everything
before your ESP32 hardware is ready.

Usage:
    python simulate.py           # normal readings only
    python simulate.py --spike   # inject anomaly spikes randomly
"""

import time
import random
import argparse
import requests

API_URL = "http://localhost:5000/reading"
NODES   = ["nodeA", "nodeB", "nodeC"]

# Normal operating ranges (Kerala campus conditions)
# Matches MQ-135 (co2, voc) + MQ-7 (co) + DHT22 (temp, humidity)
NORMAL = {
    "co2":      (400, 900),    # ppm
    "voc":      (0.02, 0.20),  # mg/m³
    "co":       (1, 9),        # ppm
    "temp":     (26, 34),      # °C
    "humidity": (55, 85),      # %
}

# Spike ranges (anomaly simulation)
SPIKE = {
    "co2":      (1200, 2500),
    "voc":      (0.4, 1.2),
    "co":       (15, 60),
    "temp":     (26, 34),      # temp doesn't spike with air quality
    "humidity": (55, 85),
}


def random_reading(ranges):
    return {k: round(random.uniform(*v), 2) for k, v in ranges.items()}


def main(inject_spikes):
    print(f"Sending readings to {API_URL} every 5 seconds...")
    print("Press Ctrl+C to stop.\n")

    while True:
        for node in NODES:
            is_spike = inject_spikes and random.random() < 0.08   # 8% chance per node
            ranges   = SPIKE if is_spike else NORMAL
            payload  = {"node_id": node, **random_reading(ranges)}

            try:
                resp = requests.post(API_URL, json=payload, timeout=3)
                resp.raise_for_status()
                data    = resp.json()
                anomaly = data["anomaly"]
                flag    = "[ANOMALY]" if anomaly["anomaly"] else "         "
                print(f"{flag} {node}: CO2={payload['co2']} VOC={payload['voc']} "
                      f"CO={payload['co']} | score={anomaly['score']} level={anomaly['level']}")

            except requests.exceptions.ConnectionError:
                print("Cannot connect to Flask app. Is app.py running?")
            except requests.exceptions.HTTPError as e:
                print(f"Server returned an error: {e}")
            except (KeyError, ValueError) as e:
                print(f"Unexpected response format: {e}")

        time.sleep(5)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--spike", action="store_true", help="Inject random anomaly spikes")
    args = parser.parse_args()

    try:
        main(args.spike)
    except KeyboardInterrupt:
        print("\nStopped by user.")