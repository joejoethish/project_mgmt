import os
import django
from django.conf import settings

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

import inspect
import pm.models

APP_NAME = 'pm'

# Get all classes from pm.models that are Django models
models_list = []
for name, obj in inspect.getmembers(pm.models):
    if inspect.isclass(obj) and issubclass(obj, django.db.models.Model) and obj.__module__ == 'pm.models':
        models_list.append(obj)

serializers_code = "from rest_framework import serializers\nfrom .models import *\n\n"
views_code = "from rest_framework import viewsets, filters\nfrom django_filters.rest_framework import DjangoFilterBackend\nfrom .models import *\nfrom .serializers import *\n\n"
urls_code = "from rest_framework.routers import DefaultRouter\nfrom .views import *\n\nrouter = DefaultRouter()\n\n"

for model in models_list:
    model_name = model.__name__
    
    # Serializer
    serializers_code += f"class {model_name}Serializer(serializers.ModelSerializer):\n"
    serializers_code += f"    class Meta:\n"
    serializers_code += f"        model = {model_name}\n"
    serializers_code += f"        fields = '__all__'\n\n"
    
    # ViewSet
    views_code += f"class {model_name}ViewSet(viewsets.ModelViewSet):\n"
    views_code += f"    queryset = {model_name}.objects.all()\n"
    views_code += f"    serializer_class = {model_name}Serializer\n"
    views_code += f"    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]\n"
    views_code += f"    filterset_fields = '__all__'\n"
    views_code += f"    search_fields = '__all__'\n"
    views_code += f"    ordering_fields = '__all__'\n"
    
    if model_name == 'Tasks':
        views_code += "    def perform_update(self, serializer):\n"
        views_code += "        instance = serializer.instance\n"
        views_code += "        new_status = serializer.validated_data.get('status_id')\n"
        views_code += "        if new_status and instance.status_id != new_status:\n"
        views_code += "            # Check workflow\n"
        views_code += "            transitions = WorkflowTransitions.objects.filter(from_status_id=instance.status_id)\n"
        views_code += "            if transitions.exists():\n"
        views_code += "                allowed = transitions.filter(to_status_id=new_status).exists()\n"
        views_code += "                if not allowed:\n"
        views_code += "                    from rest_framework.exceptions import ValidationError\n"
        views_code += "                    raise ValidationError('Invalid status transition based on workflow rules.')\n"
        views_code += "        serializer.save()\n\n"
    else:
        views_code += "\n"
    
    # URL
    route_name = model_name.lower()
    # Handle pluralization (simple)
    if route_name.endswith('s'):
        route_path = route_name
    elif route_name.endswith('y'):
        route_path = route_name[:-1] + 'ies'
    else:
        route_path = route_name + 's'
        
    urls_code += f"router.register(r'{route_path}', {model_name}ViewSet, basename='{route_name}')\n"

urls_code += "\nurlpatterns = router.urls\n"

# Write files
with open(f'{APP_NAME}/serializers.py', 'w') as f:
    f.write(serializers_code)
    
with open(f'{APP_NAME}/views.py', 'w') as f:
    f.write(views_code)

with open(f'{APP_NAME}/urls.py', 'w') as f:
    f.write(urls_code)

print(f"Generated API code for {len(models_list)} models in {APP_NAME} app.")
