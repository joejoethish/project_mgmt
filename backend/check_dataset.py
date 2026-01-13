import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from reporting.models import Dataset, DatasetColumn

# Find Daily Standup dataset
ds = Dataset.objects.filter(name__icontains='standup').first()

if ds:
    print(f"Dataset: {ds.name}")
    print(f"Primary Model: {ds.primary_model}")
    print(f"Joins: {ds.joins}")
    print(f"\nColumns ({DatasetColumn.objects.filter(dataset=ds).count()}):")
    for c in DatasetColumn.objects.filter(dataset=ds).order_by('sort_order'):
        print(f"  - {c.field_name} ({c.display_name})")
    
    # Check for columns that need fixing
    print("\n--- Checking for invalid columns ---")
    bad_columns = []
    for c in DatasetColumn.objects.filter(dataset=ds):
        # 'member' without prefix is wrong - should be 'standup__member' or similar
        if c.field_name == 'member':
            bad_columns.append(c)
            print(f"  FIX NEEDED: '{c.field_name}' should be 'standup__member__email' or similar")
    
    if not bad_columns:
        print("  All columns look valid!")
else:
    print("No Daily Standup dataset found")
    print("\nAll datasets:")
    for d in Dataset.objects.all():
        print(f"  - {d.name} ({d.primary_model})")
