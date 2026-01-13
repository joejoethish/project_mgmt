"""
Fix Daily Standup Dataset Columns
The 'member' field is on DailyStandup, not StandupItem.
Correct path should be: standup__member or standup__member__<field>
"""
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import django
django.setup()

from reporting.models import Dataset, DatasetColumn
from pm.models import StandupItem

# Get the Daily Standup dataset
datasets = Dataset.objects.filter(primary_model__icontains='StandupItem').all()

print(f"Found {datasets.count()} StandupItem datasets")

for ds in datasets:
    print(f"\n=== Dataset: {ds.name} ===")
    print(f"Primary Model: {ds.primary_model}")
    
    # Get valid fields for StandupItem
    valid_direct_fields = set(f.name for f in StandupItem._meta.get_fields() 
                              if hasattr(f, 'get_internal_type') or hasattr(f, 'related_model'))
    
    print(f"\nValid direct fields on StandupItem: {valid_direct_fields}")
    
    # Check columns
    print(f"\nDataset Columns:")
    for col in DatasetColumn.objects.filter(dataset=ds):
        field_name = col.field_name
        
        # Check if it's a direct field
        if '__' not in field_name:
            if field_name in valid_direct_fields:
                print(f"  ✓ {field_name} - OK")
            else:
                # This field doesn't exist on StandupItem - needs fixing
                print(f"  ✗ {field_name} - INVALID! Not a direct field on StandupItem")
                
                # Try to find if it's a relation field that needs prefix
                if field_name == 'member':
                    new_field = 'standup__member'
                    print(f"    -> Should be: {new_field}")
                    col.field_name = new_field
                    col.save()
                    print(f"    -> FIXED!")
                elif field_name == 'date':
                    new_field = 'standup__date'
                    print(f"    -> Should be: {new_field}")
                    col.field_name = new_field
                    col.save()
                    print(f"    -> FIXED!")
        else:
            # Relation field - verify path exists
            print(f"  ? {field_name} - Relation path (needs verification)")

print("\nDone!")
