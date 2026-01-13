import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from reporting.models import Dataset, ReportDefinition

from pm.models import TaskStatuses

def seed_kpis():
    print("🔹 Creating Employee KPI Dataset...")

    
    # Fetch Status UUIDs
    try:
        # Closure = 'Completed'
        done_obj = TaskStatuses.objects.filter(name__iexact='Completed').first()
        if not done_obj:
             # Try 'Done' as fallback
             done_obj = TaskStatuses.objects.filter(name__iexact='Done').first()
        
        if done_obj:
            done_id = str(done_obj.task_status_id)
            print(f"   ℹ️ Found Closure Status: {done_obj.name} ({done_id})")
        else:
            print("   ⚠️ Closure Status NOT FOUND (Using Dummy)")
            done_id = '00000000-0000-0000-0000-000000000000'
        
        # Rework = 'Rejected - Dev'
        # Try partial match for Rejected
        rejected_obj = TaskStatuses.objects.filter(name__icontains='Rejected - Dev').first()
        if not rejected_obj:
             rejected_obj = TaskStatuses.objects.filter(name__icontains='Rejected').first()

        if rejected_obj:
            rejected_dev_id = str(rejected_obj.task_status_id)
            print(f"   ℹ️ Found Rework Status: {rejected_obj.name} ({rejected_dev_id})")
        else:
            print("   ⚠️ Rework Status NOT FOUND (Using Dummy)")
            rejected_dev_id = '00000000-0000-0000-0000-000000000000'
            
    except Exception as e:
        print(f"⚠️ Status lookup error: {e}")
        done_id = '00000000-0000-0000-0000-000000000000'
        rejected_dev_id = '00000000-0000-0000-0000-000000000000'

    sql_query = f"""
    SELECT 
        m.member_id as id,
        m.first_name || ' ' || m.last_name as full_name,
        d.dept_name as department,
        COUNT(DISTINCT ta.task_id) as total_assigned,
        COUNT(DISTINCT CASE WHEN t.status_id = '{done_id}' THEN t.task_id END) as closures_current,
        COUNT(DISTINCT CASE WHEN al.verb = 'status_changed' AND al.data->>'new_status' = '{done_id}' THEN al.subject_id END) as closures_log,
        COUNT(DISTINCT CASE WHEN t.status_id = '{rejected_dev_id}' THEN t.task_id END) as rework_count
    FROM members m
    LEFT JOIN task_assignees ta ON m.member_id = ta.member_id
    LEFT JOIN tasks t ON ta.task_id = t.task_id
    LEFT JOIN activity_logs al ON m.member_id = al.member_id
    LEFT JOIN (SELECT 'Unknown' as dept_name) d ON 1=1
    GROUP BY m.member_id
    """

    ds, created = Dataset.objects.get_or_create(
        name="Employee Performance",
        defaults={
            'description': 'KPIs including Closures and Rework (Negative Marks)',
            'query_type': 'sql',
            'sql_query': sql_query,
            'primary_model': 'pm.Members'
        }
    )
    
    if created:
        print("   ✅ Created KPI Dataset.")
        # Create Columns
        from reporting.models import DatasetColumn
        cols = [
            ('full_name', 'Employee Name', 'string'),
            ('total_assigned', 'Active Assignments', 'number'),
            ('closures_current', 'Closures (Current Status)', 'number'),
            ('closures_log', 'Closures (Verified History)', 'number'),
            ('rework_count', 'Rework / Rejection Count', 'number'),
        ]
        for db_name, dist_name, dtype in cols:
            DatasetColumn.objects.create(
                dataset=ds,
                field_name=db_name,
                display_name=dist_name,
                data_type=dtype
            )
        print("   ✅ Created Columns.")
    else:
        # Update Query if exists
        ds.sql_query = sql_query
        ds.save()
        print("   🔄 Updated KPI Dataset Query.")
    
    print("   ✨ Done.")

if __name__ == "__main__":
    seed_kpis()
