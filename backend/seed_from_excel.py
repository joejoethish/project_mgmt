"""
Seed script to import master data from Retail Tasks.xlsx
Imports:
1. Task Statuses (Workflow states)
2. Employees (Developers) → HR Employees + PM Members
3. Projects (Clients) - optional
4. Departments & Designations
5. Task Priorities
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

import pandas as pd
from datetime import date
from hr.models import Department, Designation, Employee
from pm.models import Members, TaskStatuses, TaskPriorities, Projects, WorkflowTransitions

EXCEL_FILE = r'd:\my_projects\pr_mgmt\Retail Tasks.xlsx'

def clear_existing_data():
    """Clear existing data for fresh import"""
    print("\n🗑️  Clearing existing data...")
    WorkflowTransitions.objects.all().delete()
    print("   ✓ Cleared workflow transitions")
    TaskStatuses.objects.all().delete()
    TaskPriorities.objects.all().delete()
    print("   ✓ Cleared task statuses and priorities")

def create_departments():
    """Create standard departments"""
    print("\n🏢 Creating Departments...")
    
    departments_data = [
        {'dept_code': 'DEV', 'dept_name': 'Development', 'category': 'development'},
        {'dept_code': 'QA', 'dept_name': 'Quality Assurance', 'category': 'qa'},
        {'dept_code': 'IMPL', 'dept_name': 'Implementation', 'category': 'implementation'},
        {'dept_code': 'SUP', 'dept_name': 'Support', 'category': 'support'},
        {'dept_code': 'MGT', 'dept_name': 'Management', 'category': 'management'},
    ]
    
    created_depts = {}
    for data in departments_data:
        dept, created = Department.objects.get_or_create(
            dept_code=data['dept_code'],
            defaults=data
        )
        created_depts[data['dept_code']] = dept
        status = "✓ Created" if created else "○ Exists"
        print(f"   {status}: {data['dept_name']}")
    
    return created_depts

def create_designations():
    """Create standard designations"""
    print("\n💼 Creating Designations...")
    
    designations_data = [
        {'designation_code': 'JR_DEV', 'designation_name': 'Junior Developer', 'level': 2},
        {'designation_code': 'DEV', 'designation_name': 'Developer', 'level': 3},
        {'designation_code': 'SR_DEV', 'designation_name': 'Senior Developer', 'level': 4},
        {'designation_code': 'TL', 'designation_name': 'Team Lead', 'level': 5},
        {'designation_code': 'QA_ENG', 'designation_name': 'QA Engineer', 'level': 3},
        {'designation_code': 'IMPL_ENG', 'designation_name': 'Implementation Engineer', 'level': 3},
        {'designation_code': 'PM', 'designation_name': 'Project Manager', 'level': 6},
    ]
    
    created_desigs = {}
    for data in designations_data:
        desig, created = Designation.objects.get_or_create(
            designation_code=data['designation_code'],
            defaults=data
        )
        created_desigs[data['designation_code']] = desig
        status = "✓ Created" if created else "○ Exists"
        print(f"   {status}: {data['designation_name']} (Level {data['level']})")
    
    return created_desigs

def create_task_statuses():
    """Create task statuses from Excel Process State column"""
    print("\n📋 Creating Task Statuses (Workflow)...")
    
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
        {'name': 'Deleted', 'description': 'Task cancelled/deleted', 'sort_order': 11, 'is_default': 0},
        {'name': 'Waiting for Response', 'description': 'Waiting for client response', 'sort_order': 12, 'is_default': 0},
    ]
    
    for status_data in statuses:
        status, created = TaskStatuses.objects.get_or_create(
            name=status_data['name'],
            defaults=status_data
        )
        symbol = "✓" if created else "○"
        print(f"   {symbol} {status_data['sort_order']:2}. {status_data['name']}")
    
    print(f"\n   Total: {len(statuses)} statuses")

def create_task_priorities():
    """Create standard task priorities"""
    print("\n🎯 Creating Task Priorities...")
    
    priorities = [
        {'name': 'Low', 'description': 'Low priority task', 'sort_order': 1, 'is_default': 0},
        {'name': 'Medium', 'description': 'Normal priority', 'sort_order': 2, 'is_default': 1},
        {'name': 'High', 'description': 'High priority task', 'sort_order': 3, 'is_default': 0},
        {'name': 'Critical', 'description': 'Urgent/Critical task', 'sort_order': 4, 'is_default': 0},
    ]
    
    for p in priorities:
        priority, created = TaskPriorities.objects.get_or_create(
            name=p['name'],
            defaults=p
        )
        symbol = "✓" if created else "○"
        print(f"   {symbol} {p['name']}")

def create_employees_from_excel(departments, designations):
    """Create employees from the Developer column in Excel"""
    print("\n👥 Creating Employees (from Excel)...")
    
    # Read Excel
    df = pd.read_excel(EXCEL_FILE, sheet_name='Masters')
    developers = df['Developer'].dropna().unique().tolist()
    
    dev_dept = departments.get('DEV')
    dev_desig = designations.get('DEV')
    
    for i, dev_name in enumerate(developers, 1):
        # Parse name
        name_parts = dev_name.strip().split()
        first_name = name_parts[0] if name_parts else dev_name
        last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
        
        # Generate code and email
        emp_code = f"EMP{i:03d}"
        email = f"{first_name.lower()}@company.com"
        
        # Create or get employee
        employee, created = Employee.objects.get_or_create(
            email=email,
            defaults={
                'employee_code': emp_code,
                'first_name': first_name,
                'last_name': last_name,
                'department': dev_dept,
                'designation': dev_desig,
                'date_of_joining': date(2024, 1, 1),
                'status': 'active',
                'employment_type': 'full_time'
            }
        )
        
        if created:
            # Also create PM Member and link
            member = Members.objects.create(
                first_name=first_name,
                last_name=last_name,
                email=email,
                is_active=True
            )
            employee.pm_member_id = member.member_id
            employee.save(update_fields=['pm_member_id'])
            print(f"   ✓ Created: {dev_name} ({emp_code}) → PM Member linked")
        else:
            print(f"   ○ Exists: {dev_name}")
    
    print(f"\n   Total: {len(developers)} developers")

def create_projects_from_excel():
    """Create projects from Client Name column"""
    print("\n📁 Creating Projects (from Excel)...")
    
    df = pd.read_excel(EXCEL_FILE, sheet_name='Masters')
    
    created_count = 0
    existing_count = 0
    
    for _, row in df.iterrows():
        client_name = row.get('Client Name')
        client_type = row.get('Type', 'Existing')
        
        if pd.isna(client_name):
            continue
        
        # Generate slug
        slug = client_name.lower().replace(' ', '-').replace('(', '').replace(')', '')
        slug = ''.join(c for c in slug if c.isalnum() or c == '-')[:50]
        
        # Determine status
        status = 'active' if client_type == 'Ongoing' else 'archived'
        
        project, created = Projects.objects.get_or_create(
            slug=slug,
            defaults={
                'name': client_name,
                'description': f'{client_type} client - Retail jewellery',
                'visibility': 'team',
                'status': status
            }
        )
        
        if created:
            created_count += 1
        else:
            existing_count += 1
    
    print(f"   ✓ Created: {created_count} projects")
    print(f"   ○ Existing: {existing_count} projects")
    print(f"   Total: {created_count + existing_count} projects")

def display_summary():
    """Display summary of imported data"""
    print("\n" + "="*60)
    print("📊 IMPORT SUMMARY")
    print("="*60)
    
    print(f"\n   Departments:    {Department.objects.count()}")
    print(f"   Designations:   {Designation.objects.count()}")
    print(f"   Employees:      {Employee.objects.count()}")
    print(f"   PM Members:     {Members.objects.count()}")
    print(f"   Task Statuses:  {TaskStatuses.objects.count()}")
    print(f"   Task Priorities: {TaskPriorities.objects.count()}")
    print(f"   Projects:       {Projects.objects.count()}")
    
    print("\n" + "="*60)
    print("✅ IMPORT COMPLETED SUCCESSFULLY!")
    print("="*60)

if __name__ == "__main__":
    print("="*60)
    print("🚀 RETAIL TASKS MASTER DATA IMPORT")
    print("="*60)
    print(f"Source: {EXCEL_FILE}")
    
    try:
        clear_existing_data()
        departments = create_departments()
        designations = create_designations()
        create_task_statuses()
        create_task_priorities()
        create_employees_from_excel(departments, designations)
        create_projects_from_excel()
        display_summary()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
