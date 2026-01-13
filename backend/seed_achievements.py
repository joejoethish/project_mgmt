import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from gamification.models import Achievement

def seed_achievements():
    print("🏅 Seeding Achievements...")
    
    achievements = [
        {
            'name': 'First Steps',
            'icon': '👶',
            'description': 'Complete your first task',
            'unlock_condition': {'tasks_completed': 1},
            'category': 'milestone',
            'sort_order': 1
        },
        {
            'name': 'Bug Hunter',
            'icon': '🐛',
            'description': 'Fix 10 bugs',
            'unlock_condition': {'tasks_completed': 10},
            'category': 'quality',
            'sort_order': 2
        },
        {
            'name': 'Rising Star',
            'icon': '⭐',
            'description': 'Earn 100 Credits',
            'unlock_condition': {'total_credits': 100},
            'category': 'milestone',
            'sort_order': 3
        },
        {
            'name': 'Code Wizard',
            'icon': '🧙‍♂️',
            'description': 'Earn 500 Credits',
            'unlock_condition': {'total_credits': 500},
            'category': 'milestone',
            'sort_order': 4
        },
        {
            'name': 'Legend',
            'icon': '🏆',
            'description': 'Earn 1000 Credits',
            'unlock_condition': {'total_credits': 1000},
            'category': 'milestone',
            'sort_order': 5
        },
        {
            'name': 'Speed Demon',
            'icon': '⚡',
            'description': 'Complete 5 tasks early',
            'unlock_condition': {'early_completions': 5},
            'category': 'speed',
            'sort_order': 6
        },
    ]
    
    for a in achievements:
        obj, created = Achievement.objects.get_or_create(
            name=a['name'],
            defaults={
                'icon': a['icon'],
                'description': a['description'],
                'unlock_condition': a['unlock_condition'],
                'category': a['category'],
                'sort_order': a['sort_order']
            }
        )
        if created:
            print(f"   ✅ Created: {a['icon']} {a['name']}")
        else:
            print(f"   ℹ️ Exists: {a['name']}")

if __name__ == "__main__":
    seed_achievements()
