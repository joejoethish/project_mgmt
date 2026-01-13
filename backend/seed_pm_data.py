"""
Seed script to create sample PM data (Projects, Task Statuses, Task Priorities, Tasks)
"""
import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

import pandas as pd
from datetime import date, timedelta
from pm.models import (
    Projects, Tasks, TaskStatuses, TaskPriorities, 
    Members, Sprints
)

EXCEL_FILE = r'd:\my_projects\pr_mgmt\Retail Tasks.xlsx'


def create_task_statuses():
    """Create task statuses from Excel workflow"""
    print("\n📋 Creating Task Statuses...")
    
    statuses = [
        {'name': 'Backlogs', 'description': 'Tasks waiting to be planned', 'sort_order': 1, 'is_default': 1},
        {'name': 'To Do', 'description': 'Tasks ready to be picked up', 'sort_order': 2, 'is_default': 0},
        {'name': 'In Progress', 'description': 'Tasks currently being worked on', 'sort_order': 3, 'is_default': 0},
        {'name': 'In Review', 'description': 'Tasks awaiting code review', 'sort_order': 4, 'is_default': 0},
        {'name': 'Yet to Update in Test', 'description': 'Ready for QA testing', 'sort_order': 5, 'is_default': 0},
        {'name': 'Yet to Update in Live', 'description': 'Ready for deployment', 'sort_order': 6, 'is_default': 0},
        {'name': 'Approved', 'description': 'Approved by client/PM', 'sort_order': 7, 'is_default': 0},
        {'name': 'Completed', 'description': 'Task completed successfully', 'sort_order': 8, 'is_default': 0},
        {'name': 'Rejected - Dev', 'description': 'Rejected by development review', 'sort_order': 9, 'is_default': 0},
        {'name': 'Rejected - Sup', 'description': 'Rejected by support/client', 'sort_order': 10, 'is_default': 0},
        {'name': 'Waiting for Response', 'description': 'Waiting for client response', 'sort_order': 11, 'is_default': 0},
    ]
    
    status_map = {}
    for s in statuses:
        obj, created = TaskStatuses.objects.get_or_create(
            name=s['name'],
            defaults=s
        )
        status_map[s['name']] = obj
        print(f"   {'✓ Created' if created else '○ Exists'}: {s['name']}")
    
    return status_map


def create_task_priorities():
    """Create task priorities"""
    print("\n🎯 Creating Task Priorities...")
    
    priorities = [
        {'name': 'Low', 'description': 'Low priority', 'sort_order': 1, 'is_default': 0},
        {'name': 'Medium', 'description': 'Normal priority', 'sort_order': 2, 'is_default': 1},
        {'name': 'High', 'description': 'High priority', 'sort_order': 3, 'is_default': 0},
        {'name': 'Critical', 'description': 'Urgent/Critical task', 'sort_order': 4, 'is_default': 0},
    ]
    
    priority_map = {}
    for p in priorities:
        obj, created = TaskPriorities.objects.get_or_create(
            name=p['name'],
            defaults=p
        )
        priority_map[p['name']] = obj
        print(f"   {'✓ Created' if created else '○ Exists'}: {p['name']}")
    
    return priority_map


def create_projects_from_excel():
    """Create projects from Excel client names"""
    print("\n📁 Creating Projects from Excel...")
    
    df = pd.read_excel(EXCEL_FILE, sheet_name='Masters')
    
    projects_map = {}
    created_count = 0
    
    # Take first 10 clients for demo
    for _, row in df.head(10).iterrows():
        client_name = row.get('Client Name')
        client_type = row.get('Type', 'Existing')
        
        if pd.isna(client_name):
            continue
        
        slug = client_name.lower().replace(' ', '-').replace('(', '').replace(')', '')
        slug = ''.join(c for c in slug if c.isalnum() or c == '-')[:50]
        
        project, created = Projects.objects.get_or_create(
            slug=slug,
            defaults={
                'name': client_name,
                'description': f'{client_type} Retail Jewellery Client - Retail software implementation and support',
                'visibility': 'team',
                'status': 'active'
            }
        )
        
        projects_map[client_name] = project
        if created:
            created_count += 1
            print(f"   ✓ Created: {client_name}")
        else:
            print(f"   ○ Exists: {client_name}")
    
    print(f"\n   Total: {len(projects_map)} projects")
    return projects_map


def create_sample_tasks(projects_map, status_map, priority_map):
    """Create sample tasks for projects"""
    print("\n📝 Creating Sample Tasks...")
    
    # Get members for assignment
    members = list(Members.objects.filter(is_active=True)[:5])
    if not members:
        print("   ⚠️ No members found. Tasks will be unassigned.")
    
    # Sample task templates
    task_templates = [
        {'title': 'Database backup configuration', 'priority': 'High', 'status': 'Completed'},
        {'title': 'UI/UX improvements for dashboard', 'priority': 'Medium', 'status': 'In Progress'},
        {'title': 'Fix login session timeout issue', 'priority': 'High', 'status': 'In Review'},
        {'title': 'Add new report - Daily Sales Summary', 'priority': 'Medium', 'status': 'To Do'},
        {'title': 'Implement inventory sync feature', 'priority': 'Critical', 'status': 'In Progress'},
        {'title': 'Customer feedback integration', 'priority': 'Low', 'status': 'Backlogs'},
        {'title': 'Mobile responsive fixes', 'priority': 'Medium', 'status': 'Yet to Update in Test'},
        {'title': 'Performance optimization - product search', 'priority': 'High', 'status': 'Yet to Update in Live'},
        {'title': 'Add barcode scanner support', 'priority': 'Medium', 'status': 'Approved'},
        {'title': 'Fix GST calculation edge case', 'priority': 'Critical', 'status': 'In Progress'},
    ]
    
    task_count = 0
    i = 0
    
    for project_name, project in list(projects_map.items())[:5]:  # Tasks for first 5 projects
        # Create 3-5 tasks per project
        num_tasks = min(5, len(task_templates) - i)
        
        for j in range(num_tasks):
            template = task_templates[i % len(task_templates)]
            
            # Check if task already exists
            existing = Tasks.objects.filter(
                project_id=project,
                title=template['title']
            ).first()
            
            if existing:
                print(f"   ○ Exists: {template['title']} ({project_name})")
                i += 1
                continue
            
            # Create task
            task = Tasks.objects.create(
                project_id=project,
                title=template['title'],
                description=f"Task for {project_name}: {template['title']}. This is a sample task created for demonstration purposes.",
                status_id=status_map.get(template['status']),
                priority_id=priority_map.get(template['priority']),
                due_date=date.today() + timedelta(days=(j + 1) * 7),
                created_by_member_id=members[0] if members else None
            )
            
            task_count += 1
            print(f"   ✓ Created: {template['title']} ({project_name})")
            i += 1
    
    print(f"\n   Total: {task_count} tasks created")


def create_sample_sprints(projects_map):
    """Create sample sprints for projects"""
    print("\n🏃 Creating Sample Sprints...")
    
    sprint_count = 0
    
    for project_name, project in list(projects_map.items())[:3]:  # Sprints for first 3 projects
        # Create 2 sprints per project
        for sprint_num in range(1, 3):
            sprint_name = f"Sprint {sprint_num}"
            
            existing = Sprints.objects.filter(
                project_id=project,
                name=sprint_name
            ).first()
            
            if existing:
                print(f"   ○ Exists: {sprint_name} ({project_name})")
                continue
            
            start_date = date.today() + timedelta(days=(sprint_num - 1) * 14)
            end_date = start_date + timedelta(days=14)
            
            Sprints.objects.create(
                project_id=project,
                name=sprint_name,
                goal=f"Sprint goal for {project_name}",
                start_date=start_date,
                end_date=end_date
            )
            
            sprint_count += 1
            print(f"   ✓ Created: {sprint_name} ({project_name})")
    
    print(f"\n   Total: {sprint_count} sprints created")


def display_summary():
    """Display summary"""
    print("\n" + "="*60)
    print("📊 PM DATA SUMMARY")
    print("="*60)
    
    print(f"\n   Projects:       {Projects.objects.count()}")
    print(f"   Task Statuses:  {TaskStatuses.objects.count()}")
    print(f"   Task Priorities: {TaskPriorities.objects.count()}")
    print(f"   Tasks:          {Tasks.objects.count()}")
    print(f"   Sprints:        {Sprints.objects.count()}")
    print(f"   Members:        {Members.objects.count()}")
    
    print("\n   Tasks by Status:")
    for status in TaskStatuses.objects.all().order_by('sort_order'):
        count = Tasks.objects.filter(status_id=status).count()
        print(f"      {status.name}: {count}")
    
    print("\n" + "="*60)
    print("✅ PM DATA SEEDING COMPLETED!")
    print("="*60)
    print("\n🌐 View your data at:")
    print("   Projects: http://localhost:5173/pm/projects")
    print("   All Tasks: http://localhost:5173/pm/tasks")


if __name__ == "__main__":
    print("="*60)
    print("🚀 PM DATA SEED SCRIPT")
    print("="*60)
    
    try:
        status_map = create_task_statuses()
        priority_map = create_task_priorities()
        projects_map = create_projects_from_excel()
        create_sample_tasks(projects_map, status_map, priority_map)
        create_sample_sprints(projects_map)
        display_summary()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
