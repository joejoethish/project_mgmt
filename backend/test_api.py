import requests
import json

url = "http://localhost:8000/api/forms/submit/"
data = {
    "form_type": "daily-status",
    "form_title": "Daily Status Update",
    "submission_data": {
        "Tasks Completed": "Test task",
        "Progress Status": "On Track"
    }
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    if response.status_code != 201:
        print("\nERROR DETECTED!")
except Exception as e:
    print(f"Exception: {e}")
