import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from pm.models import IterationTasks, Iterations
from pm.serializers import IterationTasksSerializer

# Test fetching iteration tasks
iteration_id = "5075394c-d799-4f30-9409-623627c80f5e"

try:
    iteration = Iterations.objects.filter(iteration_id=iteration_id).first()
    print(f"Iteration found: {iteration}")
    
    tasks = IterationTasks.objects.filter(iteration_id=iteration_id)
    print(f"Found {tasks.count()} iteration tasks")
    
    # Try serializing
    for t in tasks:
        print(f"Task: {t}")
        serializer = IterationTasksSerializer(t)
        print(f"Serialized: {serializer.data}")
        
except Exception as e:
    import traceback
    print(f"Error: {e}")
    traceback.print_exc()
