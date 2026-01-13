
import os
import django
import uuid

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from pm.models import Roles, Permissions

def seed():
    roles = [
        {'name': 'Admin', 'description': 'Full access to everything'},
        {'name': 'Manager', 'description': 'Can manage projects and teams'},
        {'name': 'Employee', 'description': 'Can view assigned tasks'},
        {'name': 'Viewer', 'description': 'Read-only access'},
    ]

    perms = [
        # Project Management
        {'name': 'view_project', 'description': 'Can view projects'},
        {'name': 'edit_project', 'description': 'Can edit projects'},
        {'name': 'delete_project', 'description': 'Can delete projects'},
        # User Management
        {'name': 'manage_users', 'description': 'Can add/remove users'},
        {'name': 'manage_roles', 'description': 'Can change roles'},
        {'name': 'manage_permissions', 'description': 'Can change permissions'},
        # Menu Access (Global)
        {'name': 'view_menu_hr', 'description': 'Can see HR menu'},
        {'name': 'view_menu_pm', 'description': 'Can see PM menu'},
        {'name': 'view_menu_reporting', 'description': 'Can see Reporting menu'},
        {'name': 'view_menu_settings', 'description': 'Can see Settings menu'},
        {'name': 'view_menu_masters', 'description': 'Can see Masters menu'},
        # Masters
        {'name': 'manage_dynamic_masters', 'description': 'Can create/edit masters'},
        {'name': 'view_dynamic_masters', 'description': 'Can view masters'},
        # Reporting
        {'name': 'view_reports', 'description': 'Can view reports'},
        {'name': 'create_reports', 'description': 'Can create reports'},
    ]

    print("Seeding Roles...")
    for r in roles:
        role, created = Roles.objects.get_or_create(name=r['name'], defaults=r)
        if created:
            print(f"Created Role: {r['name']}")
        else:
            print(f"Role Exists: {r['name']}")

    print("\nSeeding Permissions...")
    for p in perms:
        perm, created = Permissions.objects.get_or_create(name=p['name'], defaults=p)
        if created:
            print(f"Created Permission: {p['name']}")
        else:
            print(f"Permission Exists: {p['name']}")

if __name__ == '__main__':
    seed()
