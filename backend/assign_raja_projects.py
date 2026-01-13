import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from pm.models import Projects, ProjectMembers, Members

def assign_raja():
    try:
        raja = Members.objects.filter(first_name__iexact="Raja").first()
        if not raja:
            print("Raja not found")
            return

        projects = Projects.objects.all()
        print(f"Assigning {raja.first_name} to {projects.count()} projects...")

        for p in projects:
            member, created = ProjectMembers.objects.get_or_create(
                project_id=p,
                member_id=raja,
                defaults={'role': 'Manager'}
            )
            if created:
                print(f" - Assigned to {p.name}")
            else:
                print(f" - Already assigned to {p.name}")

        print("Done.")

    except Exception as e:
        print(e)

if __name__ == "__main__":
    assign_raja()
