
import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from pm.models import Roles, Permissions, RolePermissions

def toggle_hr(action):
    role = Roles.objects.get(name='Admin')
    perm = Permissions.objects.get(name='view_menu_hr')

    if action == 'revoke':
        RolePermissions.objects.filter(role_id=role, permission_id=perm).delete()
        print("Revoked view_menu_hr from Admin")
    else:
        RolePermissions.objects.get_or_create(role_id=role, permission_id=perm)
        print("Granted view_menu_hr to Admin")

if __name__ == '__main__':
    action = sys.argv[1] if len(sys.argv) > 1 else 'grant'
    toggle_hr(action)
