"""
Seed script to create sample tags for the Universal Tags system
"""
import os
import sys
import django
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from tags.models import Tags, EntityTags, TagCategory
from pm.models import Projects, Tasks
from hr.models import Employee

def create_categories():
    print("\n📦 Creading/Loading Categories...")
    categories_data = [
        ('priority', 'Priority', '🎯', '#ef4444'),
        ('status', 'Status', '📊', '#3b82f6'),
        ('client_type', 'Client Type', '🏢', '#f59e0b'),
        ('team', 'Team', '👥', '#10b981'),
        ('skill', 'Skill', '💡', '#8b5cf6'),
        ('region', 'Region', '📍', '#ec4899'),
        ('department', 'Department', '🏛️', '#6366f1'),
        ('custom', 'Custom', '🏷️', '#6b7280'),
    ]
    
    cat_map = {}
    for name, label, icon, color in categories_data:
        cat, created = TagCategory.objects.get_or_create(
            name=name,
            defaults={
                'label': label,
                'icon': icon,
                'color': color,
                'sort_order': 0,
                'is_active': True
            }
        )
        cat_map[name] = cat
        print(f"   {'✓ Created' if created else '○ Exists'}: {label}")
    return cat_map

def create_sample_tags(cat_map):
    """Create sample tags"""
    print("\n🏷️  Creating Sample Tags...")
    
    tags_data = [
        # Priority tags
        {'name': 'Urgent', 'slug': 'urgent', 'category': cat_map['priority'], 'color': '#ef4444', 'is_system': True},
        {'name': 'High Priority', 'slug': 'high-priority', 'category': cat_map['priority'], 'color': '#f97316', 'is_system': True},
        {'name': 'Normal', 'slug': 'normal', 'category': cat_map['priority'], 'color': '#3b82f6', 'is_system': True},
        {'name': 'Low Priority', 'slug': 'low-priority', 'category': cat_map['priority'], 'color': '#6b7280', 'is_system': True},
        
        # Status tags
        {'name': 'Blocked', 'slug': 'blocked', 'category': cat_map['status'], 'color': '#dc2626', 'is_system': True},
        {'name': 'On Hold', 'slug': 'on-hold', 'category': cat_map['status'], 'color': '#f59e0b', 'is_system': True},
        {'name': 'Needs Review', 'slug': 'needs-review', 'category': cat_map['status'], 'color': '#8b5cf6', 'is_system': True},
        {'name': 'Ready for Deploy', 'slug': 'ready-for-deploy', 'category': cat_map['status'], 'color': '#10b981', 'is_system': True},
        
        # Client Type tags
        {'name': 'Existing Client', 'slug': 'existing-client', 'category': cat_map['client_type'], 'color': '#06b6d4', 'is_system': True},
        {'name': 'New Client', 'slug': 'new-client', 'category': cat_map['client_type'], 'color': '#22c55e', 'is_system': True},
        {'name': 'Enterprise', 'slug': 'enterprise', 'category': cat_map['client_type'], 'color': '#a855f7', 'is_system': True},
        {'name': 'SMB', 'slug': 'smb', 'category': cat_map['client_type'], 'color': '#64748b', 'is_system': True},
        
        # Team tags
        {'name': 'Dev Team', 'slug': 'dev-team', 'category': cat_map['team'], 'color': '#3b82f6', 'is_system': True},
        {'name': 'QA Team', 'slug': 'qa-team', 'category': cat_map['team'], 'color': '#8b5cf6', 'is_system': True},
        {'name': 'Implementation Team', 'slug': 'implementation-team', 'category': cat_map['team'], 'color': '#10b981', 'is_system': True},
        {'name': 'Support Team', 'slug': 'support-team', 'category': cat_map['team'], 'color': '#f59e0b', 'is_system': True},
        
        # Skill tags
        {'name': 'React', 'slug': 'react', 'category': cat_map['skill'], 'color': '#61dafb'},
        {'name': 'Django', 'slug': 'django', 'category': cat_map['skill'], 'color': '#092e20'},
        {'name': 'Python', 'slug': 'python', 'category': cat_map['skill'], 'color': '#3776ab'},
        {'name': 'MySQL', 'slug': 'mysql', 'category': cat_map['skill'], 'color': '#4479a1'},
        {'name': 'JavaScript', 'slug': 'javascript', 'category': cat_map['skill'], 'color': '#f7df1e'},
        {'name': 'TypeScript', 'slug': 'typescript', 'category': cat_map['skill'], 'color': '#3178c6'},
        
        # Region tags
        {'name': 'Chennai', 'slug': 'chennai', 'category': cat_map['region'], 'color': '#ec4899'},
        {'name': 'Coimbatore', 'slug': 'coimbatore', 'category': cat_map['region'], 'color': '#f43f5e'},
        {'name': 'Bangalore', 'slug': 'bangalore', 'category': cat_map['region'], 'color': '#14b8a6'},
        {'name': 'Hyderabad', 'slug': 'hyderabad', 'category': cat_map['region'], 'color': '#06b6d4'},
        {'name': 'Mumbai', 'slug': 'mumbai', 'category': cat_map['region'], 'color': '#8b5cf6'},
        
        # Custom tags
        {'name': 'Bug Fix', 'slug': 'bug-fix', 'category': cat_map['custom'], 'color': '#ef4444'},
        {'name': 'Feature', 'slug': 'feature', 'category': cat_map['custom'], 'color': '#22c55e'},
        {'name': 'Enhancement', 'slug': 'enhancement', 'category': cat_map['custom'], 'color': '#3b82f6'},
        {'name': 'Documentation', 'slug': 'documentation', 'category': cat_map['custom'], 'color': '#6b7280'},
        {'name': 'Refactor', 'slug': 'refactor', 'category': cat_map['custom'], 'color': '#f59e0b'},
    ]
    
    created_count = 0
    for data in tags_data:
        tag, created = Tags.objects.get_or_create(
            slug=data['slug'],
            defaults=data
        )
        if created:
            created_count += 1
            print(f"   ✓ Created: {data['name']} ({data['category'].name})")
        else:
            # Update category for existing tags
            tag.category = data['category']
            tag.save()
            print(f"   ○ Updated: {data['name']}")
    
    print(f"\n   Total: {Tags.objects.count()} tags ({created_count} new)")
    return Tags.objects.all()


def apply_sample_tags():
    """Apply some tags to existing entities for demo"""
    print("\n🔗 Applying Tags to Entities...")
    
    # Get some tags
    urgent = Tags.objects.filter(slug='urgent').first()
    existing_client = Tags.objects.filter(slug='existing-client').first()
    bug_fix = Tags.objects.filter(slug='bug-fix').first()
    feature = Tags.objects.filter(slug='feature').first()
    dev_team = Tags.objects.filter(slug='dev-team').first()
    chennai = Tags.objects.filter(slug='chennai').first()
    
    # Tag some projects
    projects = Projects.objects.all()[:5]
    for i, project in enumerate(projects):
        if existing_client:
            EntityTags.objects.get_or_create(
                tag=existing_client,
                entity_type='project',
                entity_id=str(project.project_id)
            )
        if chennai and i < 3:
            EntityTags.objects.get_or_create(
                tag=chennai,
                entity_type='project',
                entity_id=str(project.project_id)
            )
        print(f"   ✓ Tagged project: {project.name}")
    
    # Tag some tasks
    tasks = Tasks.objects.all()[:5]
    for i, task in enumerate(tasks):
        if urgent and i == 0:
            EntityTags.objects.get_or_create(
                tag=urgent,
                entity_type='task',
                entity_id=str(task.task_id)
            )
        if bug_fix and i < 2:
            EntityTags.objects.get_or_create(
                tag=bug_fix,
                entity_type='task',
                entity_id=str(task.task_id)
            )
        if feature and i >= 2:
            EntityTags.objects.get_or_create(
                tag=feature,
                entity_type='task',
                entity_id=str(task.task_id)
            )
        print(f"   ✓ Tagged task: {task.title[:30]}...")
    
    # Tag some employees
    employees = Employee.objects.all()[:5]
    for i, emp in enumerate(employees):
        if dev_team:
            EntityTags.objects.get_or_create(
                tag=dev_team,
                entity_type='employee',
                entity_id=str(emp.id)
            )
        print(f"   ✓ Tagged employee: {emp.first_name} {emp.last_name}")
    
    print(f"\n   Total mappings: {EntityTags.objects.count()}")


def display_summary():
    """Display summary"""
    print("\n" + "="*60)
    print("📊 TAGS SUMMARY")
    print("="*60)
    
    print("\n   Tags by Category:")
    for cat in TagCategory.objects.all():
        count = Tags.objects.filter(category=cat).count()
        print(f"      {cat.label}: {count}")
    
    print(f"\n   Total Tags: {Tags.objects.count()}")
    print(f"   Total Mappings: {EntityTags.objects.count()}")
    
    print("\n   Mappings by Entity Type:")
    for entity_type, _ in EntityTags.ENTITY_TYPE_CHOICES:
        count = EntityTags.objects.filter(entity_type=entity_type).count()
        if count > 0:
            print(f"      {entity_type}: {count}")
    
    print("\n" + "="*60)
    print("✅ TAGS SEEDING COMPLETED!")
    print("="*60)
    print("\n🌐 API Endpoints:")
    print("   GET  /api/tags/categories/       - List categories")
    print("   GET  /api/tags/tags/             - List all tags")
    print("   GET  /api/tags/tags/by_category/ - Tags by category")


if __name__ == "__main__":
    print("="*60)
    print("🚀 TAGS SEED SCRIPT V2")
    print("="*60)
    
    try:
        cat_map = create_categories()
        create_sample_tags(cat_map)
        apply_sample_tags()
        display_summary()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
