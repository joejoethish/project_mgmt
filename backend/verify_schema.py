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

class LazyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Promise):
            return str(obj)
        return super().default(obj)

try:
    print("Getting schema for pm.Members...")
    schema = SchemaService.get_model_schema('pm', 'Members', include_relations=False)
    
    print("Direct Relations:")
    for rel in schema.get('relations', []):
        print(f"  Name: {rel['name']}, Type: {rel.get('type')}, Related: {rel['related_model']}")

except Exception as e:
    print(f"Error: {e}")
