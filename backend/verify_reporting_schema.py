import os
import django
import json

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from reporting.services.schema import SchemaService

print("Fetching available models for reporting...")
models = SchemaService.get_models()
found = False
for m in models:
    if m['app_label'] == 'forms' and m['model_name'] == 'FormSubmission':
        found = True
        print(f"✅ Found: {m['full_key']}")
        break

if not found:
    print("❌ forms.FormSubmission NOT found in schema.")
else:
    print("Verification Successful.")
