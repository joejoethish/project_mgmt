
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from pm.models import Members, Roles

def assign_admin():
    member = Members.objects.first()
    if not member:
        print("No members found!")
        return

    admin_role = Roles.objects.filter(name='Admin').first()
    if not admin_role:
        print("Admin role not found!")
        return

    member.role_id = admin_role
    member.save()
    print(f"Assigned Admin role to {member.first_name} {member.last_name} ({member.email})")

if __name__ == '__main__':
    assign_admin()
