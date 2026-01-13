import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from pm.models import Projects, ProjectMembers, Members

def check_access():
    try:
        raja = Members.objects.filter(first_name__iexact="Raja").first()
        if not raja:
            print("Raja not found")
            return

        print(f"Checking access for: {raja.first_name} {raja.last_name} ({raja.member_id})")

        all_projects = Projects.objects.all()
        print(f"Total Projects in System: {all_projects.count()}")
        for p in all_projects:
            print(f" - {p.name} (ID: {p.project_id})")

        memberships = ProjectMembers.objects.filter(member_id=raja.member_id)
        print(f"\nRaja is assigned to {memberships.count()} projects:")
        for m in memberships:
            print(f" - {m.project_id.name} (Role: {m.role})")

        if memberships.count() == 0:
            print("\n⚠️ ISSUE: Raja is not assigned to any project, so the API returns empty list.")

    except Exception as e:
        print(e)

if __name__ == "__main__":
    check_access()
