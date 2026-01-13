import os
import django
import sys
import json
from django.utils.functional import Promise

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from reporting.services.schema import SchemaService

try:
    print("Checking relations for pm.Members...")
    schema = SchemaService.get_model_schema('pm', 'Members', include_relations=False)
    
    found = False
    for rel in schema.get('relations', []):
        if rel['related_model'] == 'pm.Projects':
            print(f"FOUND RELATION TO pm.Projects:")
            print(f"  Name: '{rel['name']}'")
            print(f"  Verbose: '{rel.get('verbose_name')}'")
            found = True
            
    if not found:
        print("NO RELATION FOUND to pm.Projects")

except Exception as e:
    print(f"Error: {e}")
