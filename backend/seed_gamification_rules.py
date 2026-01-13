import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from gamification.models import GamificationRule

def seed_rules():
    print("🔹 Seeding Gamification Rules...")
    
    rules = [
        {
            'name': 'Task Completion',
            'event_name': 'task_completed',
            'credits': 10,
            'description': 'Awarded when a task is moved to Completed/Done.',
            'conditions': {}    
        },
        {
            'name': 'Fast Delivery Bonus',
            'event_name': 'task_completed_early',
            'credits': 5,
            'description': 'Bonus for finishing before due date.',
            'conditions': {'days_early': '>0'}
        },
        {
            'name': 'Critical Bug Fix',
            'event_name': 'bug_fixed_critical',
            'credits': 50,
            'description': 'Fixing a huge issue.',
            'conditions': {'priority': 'critical'}
        }
    ]
    
    for r in rules:
        obj, created = GamificationRule.objects.get_or_create(
            name=r['name'],
            defaults={
                'event_name': r['event_name'],
                'credits': r['credits'],
                'description': r['description'],
                'conditions': r['conditions']
            }
        )
        if created:
            print(f"   ✅ Created Rule: {r['name']} ({r['credits']} Credits)")
        else:
            print(f"   ℹ️ Rule exists: {r['name']}")

if __name__ == "__main__":
    seed_rules()
