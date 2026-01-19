import requests
import random
import time

# Configuration
SERVER_URL = "http://localhost:3000/api/sensor-data"
MACHINES = ["Machine A", "Machine B"]

def generate_data():
    while True:
        for machine in MACHINES:
            # Simulate random data
            # Normal temp: 30-80, Spike > 90
            # Normal current: 5-15, Spike > 20
            payload = {
                "machine_id": machine,
                "temperature": round(random.uniform(30, 95), 2), 
                "current": round(random.uniform(5, 25), 2)
            }
            
            try:
                response = requests.post(SERVER_URL, json=payload)
                print(f"Sent {machine}: {payload} | Status: {response.status_code}")
            except Exception as e:
                print(f"Error sending data: {e}")
        
        time.sleep(2) # Send data every 2 seconds

if __name__ == "__main__":
    print("Starting Machine Simulator...")
    generate_data()