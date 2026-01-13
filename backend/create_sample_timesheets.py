"""
Script to create sample timesheet entries for testing/verification.
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from datetime import date, timedelta
from pm.models import Members, Projects, Tasks, TimesheetEntry
import random

def create_sample_timesheets():
    print("Creating sample timesheet entries...")
    
    # Get the first member (or create one for testing)
    members = Members.objects.filter(first_name__isnull=False)[:3]
    if not members:
        print("No members found!")
        return
    
    # Get tasks with their projects
    tasks_with_projects = Tasks.objects.exclude(project_id__isnull=True).select_related('project_id')[:10]
    if not tasks_with_projects:
        print("No tasks with projects found!")
        return
    
    # Generate dates for the current week and last week
    today = date.today()
    # Start from Monday of current week
    current_week_start = today - timedelta(days=today.weekday())
    last_week_start = current_week_start - timedelta(days=7)
    
    dates_to_fill = []
    # Current week (Mon-Fri)
    for i in range(5):
        dates_to_fill.append(current_week_start + timedelta(days=i))
    # Last week (all days)
    for i in range(5):
        dates_to_fill.append(last_week_start + timedelta(days=i))
    
    created_count = 0
    
    for member in members:
        print(f"\nMember: {member.first_name} {member.last_name}")
        
        # Assign 2-3 random tasks per member
        member_tasks = random.sample(list(tasks_with_projects), min(3, len(tasks_with_projects)))
        
        for task in member_tasks:
            # Random entries for some days
            selected_dates = random.sample(dates_to_fill, random.randint(3, 6))
            
            for entry_date in selected_dates:
                # Check if entry already exists
                existing = TimesheetEntry.objects.filter(
                    member=member,
                    task=task,
                    date=entry_date
                ).first()
                
                if existing:
                    continue
                
                hours = random.choice([1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0, 6.0, 8.0])
                
                entry = TimesheetEntry.objects.create(
                    member=member,
                    project=task.project_id,
                    task=task,
                    date=entry_date,
                    hours=hours,
                    description=f"Work on {task.title[:50] if task.title else 'task'}",
                    is_billable=random.choice([True, True, True, False])
                )
                created_count += 1
                print(f"  Created: {entry_date} - {task.title[:30] if task.title else 'N/A'} - {hours}h")
    
    print(f"\n✅ Created {created_count} new timesheet entries!")
    print(f"Total timesheet entries now: {TimesheetEntry.objects.count()}")

if __name__ == '__main__':
    create_sample_timesheets()
