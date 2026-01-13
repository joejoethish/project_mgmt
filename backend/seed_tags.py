import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from tags.models import TagCategory, Tags

def seed_tag_categories():
    print("🏷️  Seeding Tag Categories...")
    
    categories = [
        {
            'name': 'Severity',
            'icon': '🔴',
            'color': '#ef4444',
            'tags': [
                {'name': 'Critical', 'color': '#dc2626'},
                {'name': 'Major', 'color': '#f97316'},
                {'name': 'Minor', 'color': '#eab308'},
                {'name': 'Low', 'color': '#22c55e'},
            ]
        },
        {
            'name': 'Status Labels',
            'icon': '📋',
            'color': '#3b82f6',
            'tags': [
                {'name': 'Blocked', 'color': '#dc2626'},
                {'name': 'Waiting for Client', 'color': '#f97316'},
                {'name': 'On Hold', 'color': '#eab308'},
                {'name': 'Ready for Review', 'color': '#8b5cf6'},
            ]
        },
        {
            'name': 'Priority',
            'icon': '⚡',
            'color': '#f59e0b',
            'tags': [
                {'name': 'Urgent', 'color': '#dc2626'},
                {'name': 'High Priority', 'color': '#f97316'},
                {'name': 'Normal', 'color': '#3b82f6'},
                {'name': 'Low Priority', 'color': '#6b7280'},
            ]
        },
        {
            'name': 'Type',
            'icon': '🏷️',
            'color': '#8b5cf6',
            'tags': [
                {'name': 'Bug', 'color': '#dc2626'},
                {'name': 'Feature', 'color': '#22c55e'},
                {'name': 'Enhancement', 'color': '#3b82f6'},
                {'name': 'Documentation', 'color': '#6b7280'},
            ]
        }
    ]
    
    for cat_data in categories:
        category, created = TagCategory.objects.get_or_create(
            name=cat_data['name'],
            defaults={
                'label': cat_data['name'],
                'icon': cat_data['icon'],
                'color': cat_data['color']
            }
        )
        action = 'Created' if created else 'Exists'
        print(f"   {action}: Category '{cat_data['name']}'")
        
        for tag_data in cat_data['tags']:
            # Create unique slug by combining category and tag name
            slug = f"{cat_data['name'].lower().replace(' ', '-')}-{tag_data['name'].lower().replace(' ', '-')}"
            
            # Check if tag exists with this slug
            existing = Tags.objects.filter(slug=slug).first()
            if existing:
                print(f"      - Tag exists: {tag_data['name']}")
            else:
                tag = Tags.objects.create(
                    name=tag_data['name'],
                    slug=slug,
                    color=tag_data['color'],
                    category=category
                )
                print(f"      ✓ Tag: {tag_data['name']}")
    
    print("✅ Done seeding tags!")

if __name__ == "__main__":
    seed_tag_categories()
