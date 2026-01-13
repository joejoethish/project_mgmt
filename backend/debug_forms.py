import os
import django
from rest_framework import serializers

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from forms.serializers import FormSubmissionSerializer

print("Attempting to instantiate FormSubmissionSerializer...")
try:
    serializer = FormSubmissionSerializer()
    print("Serializer instantiated successfully.")
    print("Fields:", serializer.fields)
except Exception as e:
    print("FAILED to instantiate serializer.")
    print(e)
    import traceback
    traceback.print_exc()
