"""
Sync Zoho Data to PM System
Creates Projects, Members, and Tasks from Zoho sync data
"""
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()

from pm.zoho_models import ZohoBoard, ZohoMember, ZohoTaskData, ZohoStatus
from pm.models import Projects, Members, Tasks, TaskStatuses, TaskPriorities
import uuid

print("=" * 60)
print("ZOHO → PM FULL SYNC")
print("=" * 60)

# ============ STEP 1: Create Task Statuses from Zoho Statuses ============
print("\n📊 Syncing Task Statuses...")
status_map = {}
for zs in ZohoStatus.objects.all():
    ts, created = TaskStatuses.objects.get_or_create(
        name=zs.zoho_status_name,
        defaults={
            'description': f'Imported from Zoho',
            'is_default': 0,
            'sort_order': 0
        }
    )
    status_map[str(zs.status_id)] = ts
    status_map[zs.zoho_status_id] = ts
    if created:
        print(f"  ✅ {zs.zoho_status_name}")

print(f"  Total: {TaskStatuses.objects.count()} statuses")


# ============ STEP 2: Create Task Priorities (if not exist) ============
print("\n🔥 Checking Task Priorities...")
priorities = [
    ('Critical', 'Requires immediate attention', 4),
    ('High', 'High business impact', 3),
    ('Medium', 'Normal priority level', 2),
    ('Low', 'Can be scheduled later', 1),
    ('Urgent', 'Urgent priority', 5),
]
priority_map = {}
for name, desc, sort_order in priorities:
    tp, created = TaskPriorities.objects.get_or_create(
        name=name,
        defaults={'description': desc, 'sort_order': sort_order, 'is_default': 0}
    )
    priority_map[name.lower()] = tp
    if created:
        print(f"  ✅ {name}")

print(f"  Total: {TaskPriorities.objects.count()} priorities")

# ============ STEP 3: Create Members from Zoho Members ============
print("\n👥 Syncing Members...")
member_map = {}

for zm in ZohoMember.objects.all():
    # Check if member already exists by email
    member = Members.objects.filter(email=zm.zoho_email).first()
    
    if not member:
        # Parse name
        name_parts = (zm.zoho_name or 'Unknown User').split(' ', 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ''
        
        member = Members.objects.create(
            first_name=first_name,
            last_name=last_name,
            email=zm.zoho_email,
            status='active',
        )
        print(f"  ✅ {zm.zoho_name}")
    
    # Update mapping
    if not zm.mapped_member:
        zm.mapped_member = member
        zm.save()
    
    member_map[zm.zoho_user_id] = member
    member_map[str(zm.member_id)] = member

print(f"  Total: {Members.objects.count()} members")

# ============ STEP 4: Create Projects from Zoho Boards ============
print("\n📁 Syncing Projects...")
project_map = {}

for zb in ZohoBoard.objects.all():
    # Check if project exists by name
    project = Projects.objects.filter(name=zb.zoho_board_name).first()
    
    if not project:
        project = Projects.objects.create(
            name=zb.zoho_board_name,
            description=f"Imported from Zoho Connect",
            status='active',
            start_date=zb.created_at.date() if zb.created_at else None,
        )
        print(f"  ✅ {zb.zoho_board_name}")
    
    # Update mapping
    if not zb.mapped_project:
        zb.mapped_project = project
        zb.save()
    
    project_map[zb.zoho_board_id] = project
    project_map[str(zb.board_id)] = project

print(f"  Total: {Projects.objects.count()} projects")

# ============ STEP 5: Create Tasks from Zoho Tasks ============
print("\n📋 Syncing Tasks...")
tasks_created = 0
tasks_skipped = 0

# Get default status and priority
default_status = TaskStatuses.objects.first()
default_priority = priority_map.get('medium')

for zt in ZohoTaskData.objects.all():
    # Skip if already synced
    if zt.synced_task:
        tasks_skipped += 1
        continue
    
    # Get project from board
    project = None
    if zt.board:
        project = zt.board.mapped_project
    
    if not project:
        tasks_skipped += 1
        continue
    
    # Check if task exists by title in project
    existing_task = Tasks.objects.filter(title=zt.title, project_id=project).first()
    if existing_task:
        zt.synced_task = existing_task
        zt.is_synced = True
        zt.save()
        tasks_skipped += 1
        continue
    
    # Get status
    status = None
    if zt.status and zt.status.mapped_status:
        status = zt.status.mapped_status
    if not status:
        status = default_status
    
    # Get priority
    priority_name = (zt.priority_name or 'medium').lower()
    priority = priority_map.get(priority_name, default_priority)
    
    # Create task
    task = Tasks.objects.create(
        title=zt.title or 'Untitled Task',
        description=zt.description or '',
        project_id=project,
        status_id=status,
        priority_id=priority,
        due_date=zt.due_date,
        start_date=zt.start_date,
    )
    
    # Update sync status
    zt.synced_task = task
    zt.is_synced = True
    zt.save()
    
    tasks_created += 1
    
    if tasks_created % 20 == 0:
        print(f"  ... created {tasks_created} tasks")

print(f"  ✅ Created: {tasks_created} tasks")
print(f"  ➡️ Skipped: {tasks_skipped} tasks")
print(f"  Total: {Tasks.objects.count()} tasks")

# ============ SUMMARY ============
print("\n" + "=" * 60)
print("✅ SYNC COMPLETE!")
print("=" * 60)
print(f"  📊 Task Statuses: {TaskStatuses.objects.count()}")
print(f"  🔥 Task Priorities: {TaskPriorities.objects.count()}")
print(f"  👥 Members: {Members.objects.count()}")
print(f"  📁 Projects: {Projects.objects.count()}")
print(f"  📋 Tasks: {Tasks.objects.count()}")
print("=" * 60)
