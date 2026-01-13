import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from masters.models import DynamicMaster, DynamicMasterField, DynamicMasterData

def seed_master(name, display_name, fields_config, data_list):
    print(f"🔹 Seeding Master: {display_name} ({name})...")
    dm, created = DynamicMaster.objects.get_or_create(
        name=name,
        defaults={'display_name': display_name, 'description': f'Dynamic master for {display_name}'}
    )
    if created:
        print(f"   Created definition.")
    else:
        print(f"   Definition exists.")

    # Create Fields
    for idx, field in enumerate(fields_config, 1):
        DynamicMasterField.objects.get_or_create(
            master=dm,
            field_name=field['name'],
            defaults={
                'display_name': field['label'],
                'field_type': field.get('type', 'text'),
                'is_required': field.get('required', False),
                'order': idx
            }
        )

    # Create Data
    count = 0
    for item_data in data_list:
        # Check uniqueness based on first field
        first_key = fields_config[0]['name']
        val = item_data.get(first_key)
        
        # We need to query JSONField. 
        # Note: In SQLite/Postgres this works differently, but Django ORM supports `data__key=value`
        query = {f"data__{first_key}": val}
        if not DynamicMasterData.objects.filter(master=dm, **query).exists():
            DynamicMasterData.objects.create(master=dm, data=item_data)
            count += 1
            
    print(f"   ✅ Added {count} new records.")

def run_seed():
    # 1. Client Type
    seed_master(
        name='client_type',
        display_name='Client Type',
        fields_config=[
            {'name': 'name', 'label': 'Name', 'required': True},
            {'name': 'code', 'label': 'Code'}
        ],
        data_list=[
            {'name': 'Retail', 'code': 'RET'},
            {'name': 'Wholesale', 'code': 'WHO'},
            {'name': 'Manufacturing', 'code': 'MFG'},
            {'name': 'Technology', 'code': 'TEC'},
            {'name': 'Healthcare', 'code': 'HLT'}
        ]
    )

    # 2. Project Category
    seed_master(
        name='project_category',
        display_name='Project Category',
        fields_config=[
            {'name': 'name', 'label': 'Category Name', 'required': True},
            {'name': 'description', 'label': 'Description', 'type': 'textarea'}
        ],
        data_list=[
            {'name': 'Implementation', 'description': 'New system setup'},
            {'name': 'AMC', 'description': 'Annual Maintenance Contract'},
            {'name': 'One-off Development', 'description': 'Custom feature development'},
            {'name': 'Consulting', 'description': 'Advisory services'}
        ]
    )

    # 3. Task Severity
    seed_master(
        name='task_severity',
        display_name='Task Severity',
        fields_config=[
            {'name': 'name', 'label': 'Severity', 'required': True},
            {'name': 'color', 'label': 'Color', 'type': 'color'}
        ],
        data_list=[
            {'name': 'Critical', 'color': '#ff0000'},
            {'name': 'Major', 'color': '#ff9900'},
            {'name': 'Minor', 'color': '#ffff00'},
            {'name': 'Cosmetic', 'color': '#cccccc'}
        ]
    )
    
    # 4. Employment Type (HR)
    seed_master(
        name='employment_type',
        display_name='Employment Type',
        fields_config=[
            {'name': 'name', 'label': 'Type', 'required': True}
        ],
        data_list=[
            {'name': 'Full-time'},
            {'name': 'Part-time'},
            {'name': 'Contract'},
            {'name': 'Intern'}
        ]
    )

if __name__ == "__main__":
    run_seed()
