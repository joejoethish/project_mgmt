"""
Seed script to set up the standard workflow statuses and transitions.
Run this after database tables are created.

Workflow: Backlog → To Do → In Progress → In Review → Approved/Rejected
"""
import pymysql
import uuid

# Database connection
conn = pymysql.connect(
    host='localhost',
    user='root',
    password='',
    database='pr_mgmt',
    charset='utf8mb4'
)

cursor = conn.cursor()

def uuid_to_bytes(uuid_str):
    """Convert UUID string to bytes for BINARY(16) storage"""
    return uuid.UUID(uuid_str).bytes

def generate_uuid():
    """Generate a new UUID and return both string and bytes"""
    u = uuid.uuid4()
    return str(u), u.bytes

# Define statuses with sort order
STATUSES = [
    {"name": "Backlog", "description": "Tasks waiting to be planned", "sort_order": 1, "is_default": True},
    {"name": "To Do", "description": "Tasks ready to be worked on", "sort_order": 2, "is_default": False},
    {"name": "In Progress", "description": "Tasks currently being worked on", "sort_order": 3, "is_default": False},
    {"name": "In Review", "description": "Tasks awaiting review", "sort_order": 4, "is_default": False},
    {"name": "Approved", "description": "Tasks that have been approved", "sort_order": 5, "is_default": False},
    {"name": "Rejected", "description": "Tasks that were rejected", "sort_order": 6, "is_default": False},
]

# Define allowed transitions (from_status -> to_status)
# This defines the workflow rules
TRANSITIONS = [
    # From Backlog
    ("Backlog", "To Do"),
    
    # From To Do
    ("To Do", "In Progress"),
    ("To Do", "Backlog"),  # Can move back to backlog
    
    # From In Progress
    ("In Progress", "In Review"),
    ("In Progress", "To Do"),  # Can move back if blocked
    
    # From In Review
    ("In Review", "Approved"),
    ("In Review", "Rejected"),
    ("In Review", "In Progress"),  # Needs more work
    
    # From Rejected
    ("Rejected", "To Do"),  # Re-plan rejected tasks
    ("Rejected", "Backlog"),  # Put back in backlog
    
    # From Approved (usually terminal, but allow reopen)
    ("Approved", "In Progress"),  # Reopen if needed
]

# Define roles
ROLES = [
    {"name": "Admin", "description": "Full access to all features", "is_system": True},
    {"name": "Project Manager", "description": "Can manage projects and approve tasks", "is_system": False},
    {"name": "Developer", "description": "Can work on tasks", "is_system": False},
    {"name": "Reviewer", "description": "Can review and approve/reject tasks", "is_system": False},
    {"name": "Viewer", "description": "Read-only access", "is_system": False},
]

def clear_existing_data():
    """Clear existing workflow data for fresh setup"""
    print("Clearing existing workflow data...")
    cursor.execute("DELETE FROM workflow_transitions")
    cursor.execute("DELETE FROM task_statuses")
    cursor.execute("DELETE FROM roles WHERE is_system = 0 OR name IN ('Admin', 'Project Manager', 'Developer', 'Reviewer', 'Viewer')")
    conn.commit()
    print("✓ Cleared existing data")

def seed_statuses():
    """Insert task statuses"""
    print("\nSeeding task statuses...")
    status_ids = {}
    
    for status in STATUSES:
        uuid_str, uuid_bytes = generate_uuid()
        cursor.execute("""
            INSERT INTO task_statuses (task_status_id, name, description, sort_order, is_default)
            VALUES (%s, %s, %s, %s, %s)
        """, (uuid_bytes, status["name"], status["description"], status["sort_order"], status["is_default"]))
        status_ids[status["name"]] = uuid_bytes
        print(f"  ✓ Created status: {status['name']}")
    
    conn.commit()
    return status_ids

def seed_transitions(status_ids):
    """Insert workflow transitions"""
    print("\nSeeding workflow transitions...")
    
    for from_status, to_status in TRANSITIONS:
        uuid_str, uuid_bytes = generate_uuid()
        from_id = status_ids.get(from_status)
        to_id = status_ids.get(to_status)
        
        if from_id and to_id:
            cursor.execute("""
                INSERT INTO workflow_transitions (transition_id, from_status_id, to_status_id, workflow_name, role_id)
                VALUES (%s, %s, %s, %s, NULL)
            """, (uuid_bytes, from_id, to_id, f"{from_status} → {to_status}"))
            print(f"  ✓ Created transition: {from_status} → {to_status}")
    
    conn.commit()

def seed_roles():
    """Insert roles"""
    print("\nSeeding roles...")
    role_ids = {}
    
    for role in ROLES:
        uuid_str, uuid_bytes = generate_uuid()
        cursor.execute("""
            INSERT INTO roles (role_id, name, description, is_system)
            VALUES (%s, %s, %s, %s)
        """, (uuid_bytes, role["name"], role["description"], role["is_system"]))
        role_ids[role["name"]] = uuid_bytes
        print(f"  ✓ Created role: {role['name']}")
    
    conn.commit()
    return role_ids

def verify_setup():
    """Verify the setup was successful"""
    print("\n" + "="*50)
    print("VERIFICATION")
    print("="*50)
    
    cursor.execute("SELECT name, sort_order FROM task_statuses ORDER BY sort_order")
    statuses = cursor.fetchall()
    print(f"\nTask Statuses ({len(statuses)}):")
    for name, order in statuses:
        print(f"  {order}. {name}")
    
    cursor.execute("""
        SELECT 
            (SELECT name FROM task_statuses WHERE task_status_id = wt.from_status_id) as from_name,
            (SELECT name FROM task_statuses WHERE task_status_id = wt.to_status_id) as to_name
        FROM workflow_transitions wt
    """)
    transitions = cursor.fetchall()
    print(f"\nWorkflow Transitions ({len(transitions)}):")
    for from_name, to_name in transitions:
        print(f"  {from_name} → {to_name}")
    
    cursor.execute("SELECT name, description FROM roles ORDER BY is_system DESC, name")
    roles = cursor.fetchall()
    print(f"\nRoles ({len(roles)}):")
    for name, desc in roles:
        print(f"  • {name}: {desc}")

if __name__ == "__main__":
    try:
        print("="*50)
        print("PROJECT MANAGEMENT - WORKFLOW SEEDER")
        print("="*50)
        
        clear_existing_data()
        status_ids = seed_statuses()
        seed_transitions(status_ids)
        seed_roles()
        verify_setup()
        
        print("\n" + "="*50)
        print("✅ WORKFLOW SETUP COMPLETE!")
        print("="*50)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()
