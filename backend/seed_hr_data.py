"""
Seed script for HR data only (Departments, Designations, Employees)
Task Statuses will be added manually via UI
"""
import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

import pandas as pd
from datetime import date
from hr.models import Department, Designation, Employee
from pm.models import Members

EXCEL_FILE = r'd:\my_projects\pr_mgmt\Retail Tasks.xlsx'


def create_departments():
    """Create standard departments"""
    print("\n🏢 Creating Departments...")
    
    departments_data = [
        {'dept_code': 'DEV', 'dept_name': 'Development', 'category': 'development', 'description': 'Software Development Team'},
        {'dept_code': 'QA', 'dept_name': 'Quality Assurance', 'category': 'qa', 'description': 'QA and Testing Team'},
        {'dept_code': 'IMPL', 'dept_name': 'Implementation', 'category': 'implementation', 'description': 'Deployment and Implementation Team'},
        {'dept_code': 'SUP', 'dept_name': 'Support', 'category': 'support', 'description': 'Customer Support Team'},
        {'dept_code': 'MGT', 'dept_name': 'Management', 'category': 'management', 'description': 'Project Management'},
    ]
    
    created_depts = {}
    for data in departments_data:
        dept, created = Department.objects.get_or_create(
            dept_code=data['dept_code'],
            defaults=data
        )
        created_depts[data['dept_code']] = dept
        status = "✓ Created" if created else "○ Exists"
        print(f"   {status}: {data['dept_name']} ({data['category']})")
    
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
        {'designation_code': 'SR_QA', 'designation_name': 'Senior QA Engineer', 'level': 4},
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
        email = f"{first_name.lower().replace(' ', '')}@company.com"
        
        # Check if employee exists by email
        if Employee.objects.filter(email=email).exists():
            print(f"   ○ Exists: {dev_name}")
            continue
        
        # Create employee
        employee = Employee.objects.create(
            employee_code=emp_code,
            first_name=first_name,
            last_name=last_name,
            email=email,
            department=dev_dept,
            designation=dev_desig,
            date_of_joining=date(2024, 1, 1),
            status='active',
            employment_type='full_time'
        )
        
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
    
    print(f"\n   Total developers from Excel: {len(developers)}")


def create_sample_employees(departments, designations):
    """Create additional sample employees for QA and Implementation teams"""
    print("\n👥 Creating Sample QA & Implementation Team Members...")
    
    sample_employees = [
        # QA Team
        {'first_name': 'Priya', 'last_name': 'Sharma', 'dept': 'QA', 'desig': 'QA_ENG'},
        {'first_name': 'Karthik', 'last_name': 'Rajan', 'dept': 'QA', 'desig': 'SR_QA'},
        {'first_name': 'Divya', 'last_name': 'Mohan', 'dept': 'QA', 'desig': 'QA_ENG'},
        # Implementation Team
        {'first_name': 'Suresh', 'last_name': 'Kumar', 'dept': 'IMPL', 'desig': 'IMPL_ENG'},
        {'first_name': 'Lakshmi', 'last_name': 'Narayanan', 'dept': 'IMPL', 'desig': 'IMPL_ENG'},
        # Manager
        {'first_name': 'Rajesh', 'last_name': 'Krishnan', 'dept': 'MGT', 'desig': 'PM'},
    ]
    
    emp_count = Employee.objects.count()
    
    for emp_data in sample_employees:
        email = f"{emp_data['first_name'].lower()}@company.com"
        
        if Employee.objects.filter(email=email).exists():
            print(f"   ○ Exists: {emp_data['first_name']} {emp_data['last_name']}")
            continue
        
        emp_count += 1
        employee = Employee.objects.create(
            employee_code=f"EMP{emp_count:03d}",
            first_name=emp_data['first_name'],
            last_name=emp_data['last_name'],
            email=email,
            department=departments.get(emp_data['dept']),
            designation=designations.get(emp_data['desig']),
            date_of_joining=date(2024, 1, 1),
            status='active',
            employment_type='full_time'
        )
        
        # Create PM Member
        member = Members.objects.create(
            first_name=emp_data['first_name'],
            last_name=emp_data['last_name'],
            email=email,
            is_active=True
        )
        employee.pm_member_id = member.member_id
        employee.save(update_fields=['pm_member_id'])
        
        print(f"   ✓ Created: {emp_data['first_name']} {emp_data['last_name']} ({emp_data['dept']})")


def display_summary():
    """Display summary"""
    print("\n" + "="*60)
    print("📊 IMPORT SUMMARY")
    print("="*60)
    
    print(f"\n   Departments:    {Department.objects.count()}")
    print(f"   Designations:   {Designation.objects.count()}")
    print(f"   Employees:      {Employee.objects.count()}")
    print(f"   PM Members:     {Members.objects.count()}")
    
    print("\n   Employees by Department:")
    for dept in Department.objects.all():
        count = Employee.objects.filter(department=dept, status='active').count()
        print(f"      {dept.dept_name}: {count}")
    
    print("\n" + "="*60)
    print("✅ HR DATA IMPORT COMPLETED!")
    print("="*60)
    print("\n⚠️  Remember to add Task Statuses manually via:")
    print("   http://localhost:5173/pm/workflows")


if __name__ == "__main__":
    print("="*60)
    print("🚀 HR DATA SEED SCRIPT")
    print("="*60)
    
    try:
        departments = create_departments()
        designations = create_designations()
        create_employees_from_excel(departments, designations)
        create_sample_employees(departments, designations)
        display_summary()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
