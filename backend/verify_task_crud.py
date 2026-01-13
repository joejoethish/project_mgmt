
import requests
import uuid
from datetime import datetime

BASE_URL = "http://localhost:8001/api/pm"

def verify_task_crud():
    print("--- Starting Task CRUD Verification ---")
    
    # 1. Setup Prerequisites (Project, Member, Status, Priority)
    # We'll just fetch existing ones to be safe, creating if absolutely necessary would be better but fetching is faster for verification
    try:
        # Projects
        projects = requests.get(f"{BASE_URL}/projects/").json()
        if not projects:
            print("FAIL: No projects found. Cannot test task creation.")
            return
        project_id = projects[0]['project_id']
        print(f"Using Project: {project_id}")

        # Members
        members = requests.get(f"{BASE_URL}/members/").json()
        if not members:
            print("FAIL: No members found.")
            return
        member_id = members[0]['member_id']
        print(f"Using Member: {member_id}")

        # Statuses
        statuses = requests.get(f"{BASE_URL}/taskstatuses/").json()
        if not statuses:
            print("FAIL: No statuses found.")
            return
        # Pick 'To Do' or similar if possible, else first
        status_id = statuses[0]['task_status_id']
        print(f"Using Status: {status_id}")

        # Priorities
        priorities = requests.get(f"{BASE_URL}/taskpriorities/").json()
        if not priorities:
            print("FAIL: No priorities found.")
            return
        priority_id = priorities[0]['task_priority_id']
        print(f"Using Priority: {priority_id}")

    except Exception as e:
        print(f"Setup Failed: {e}")
        return

    # 2. CREATE Task
    print("\n[1] Testing CREATE Task...")
    new_task_payload = {
        "project_id": project_id,
        "title": f"CRUD Check Task {uuid.uuid4().hex[:6]}",
        "description": "Auto-generated test task.",
        "status_id": status_id,
        "priority_id": priority_id,
        "start_date": datetime.now().strftime("%Y-%m-%d")
    }
    
    try:
        res = requests.post(f"{BASE_URL}/tasks/", json=new_task_payload)
        if res.status_code == 201:
            task = res.json()
            task_id = task['task_id']
            print(f"SUCCESS: Created Task {task_id} - {task['title']}")
        else:
            print(f"FAIL: Create returned {res.status_code}: {res.text}")
            return
    except Exception as e:
        print(f"FAIL: Create Exception: {e}")
        return

    # 3. READ Task
    print("\n[2] Testing READ Task...")
    try:
        res = requests.get(f"{BASE_URL}/tasks/{task_id}/")
        if res.status_code == 200:
            print(f"SUCCESS: Read Task {task_id}")
        else:
            print(f"FAIL: Read returned {res.status_code}")
    except Exception as e:
        print(f"FAIL: Read Exception: {e}")

    # 4. UPDATE Task
    print("\n[3] Testing UPDATE Task...")
    update_payload = {
        "title": f"UPDATED Title {uuid.uuid4().hex[:6]}",
        "description": "Updated description",
        "estimated_hours": 5.5,
        "assigned_to": member_id # Reuse the member from setup
    }
    try:
        res = requests.patch(f"{BASE_URL}/tasks/{task_id}/", json=update_payload)
        if res.status_code == 200:
            updated_task = res.json()
            
            # Check Title
            if updated_task['title'] != update_payload['title']:
                 print(f"FAIL: Title mismatch. Got {updated_task['title']}")
            
            # Check Hours
            if float(updated_task.get('estimated_hours', 0)) != 5.5:
                print(f"FAIL: estimated_hours mismatch. Got {updated_task.get('estimated_hours')}")
            else:
                print(f"SUCCESS: estimated_hours updated to {updated_task.get('estimated_hours')}")

            # Check Assignee
            # Note: response might use 'assigned_to' (id) or 'assignee_name' depending on serializer
            # The serializer usually returns the ID in 'assigned_to' or nested object.
            # Start by printing what we got to see format
            print(f"DEBUG: Updated Task keys: {updated_task.keys()}")
            
            val = updated_task.get('assigned_to')
            if val == member_id:
                 print(f"SUCCESS: assigned_to updated to {val}")
            else:
                 print(f"FAIL: assigned_to mismatch. Got {val}, expected {member_id}")

            # 4b. UPDATE Task AGAIN (Test Idempotency / Integrity Error)
            print("\n[3b] Testing UPDATE Task (Idempotency Check)...")
            res_idempotency = requests.patch(f"{BASE_URL}/tasks/{task_id}/", json=update_payload)
            if res_idempotency.status_code == 200:
                print("SUCCESS: Idempotent Update (No Integrity Error)")
            else:
                 print(f"FAIL: Idempotent Update Failed: {res_idempotency.status_code} {res_idempotency.text}")

        else:
            print(f"FAIL: Update returned {res.status_code}: {res.text}")
    except Exception as e:
        print(f"FAIL: Update Exception: {e}")

    # 5. DELETE Task
    print("\n[4] Testing DELETE Task...")
    try:
        res = requests.delete(f"{BASE_URL}/tasks/{task_id}/")
        if res.status_code == 204:
            print("SUCCESS: Delete Task (204 No Content)")
        else:
            print(f"FAIL: Delete returned {res.status_code}: {res.text}")
    except Exception as e:
        print(f"FAIL: Delete Exception: {e}")

    # 6. Verify Deletion
    res = requests.get(f"{BASE_URL}/tasks/{task_id}/")
    if res.status_code == 404:
        print("SUCCESS: Verified Deletion (404 Not Found)")
    else:
        print(f"FAIL: Task still exists or error: {res.status_code}")

if __name__ == "__main__":
    verify_task_crud()
