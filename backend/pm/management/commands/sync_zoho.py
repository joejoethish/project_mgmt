"""
Django Management Command: Sync Zoho data to PM System
Usage: python manage.py sync_zoho
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from pm.zoho_models import ZohoBoard, ZohoMember, ZohoTaskData, ZohoStatus
from pm.models import Projects, Members, Tasks, TaskStatuses, TaskPriorities, TaskAssignees


class Command(BaseCommand):
    help = 'Sync Zoho Connect data to PM System (Projects, Members, Tasks)'

    def handle(self, *args, **options):
        self.stdout.write("=" * 60)
        self.stdout.write("ZOHO → PM FULL SYNC")
        self.stdout.write("=" * 60)

        # Step 1: Sync Task Statuses
        self.stdout.write("\n📊 Syncing Task Statuses...")
        status_map = {}
        for zs in ZohoStatus.objects.all():
            ts, created = TaskStatuses.objects.get_or_create(
                name=zs.zoho_status_name,
                defaults={'description': 'From Zoho', 'is_default': 0, 'sort_order': 0}
            )
            status_map[str(zs.status_id)] = ts
            status_map[zs.zoho_status_id] = ts
            if created:
                self.stdout.write(f"  ✅ {zs.zoho_status_name}")
        self.stdout.write(f"  Total Statuses: {TaskStatuses.objects.count()}")

        # Step 2: Task Priorities
        self.stdout.write("\n🔥 Syncing Task Priorities...")
        priority_map = {}
        for name, desc, order in [('Critical', 'Urgent', 4), ('High', 'High', 3), ('Medium', 'Normal', 2), ('Low', 'Low', 1)]:
            tp, created = TaskPriorities.objects.get_or_create(name=name, defaults={'description': desc, 'sort_order': order, 'is_default': 0})
            priority_map[name.lower()] = tp
            if created:
                self.stdout.write(f"  ✅ {name}")
        self.stdout.write(f"  Total Priorities: {TaskPriorities.objects.count()}")

        # Step 3: Sync Members and build lookup maps
        self.stdout.write("\n👥 Syncing Members...")
        member_by_zoho_id = {}  # zoho_user_id -> Member
        member_by_email = {}    # email -> Member
        
        # First build email lookup from existing members
        for m in Members.objects.all():
            if m.email:
                member_by_email[m.email.lower()] = m
        
        for zm in ZohoMember.objects.all():
            member = Members.objects.filter(email=zm.zoho_email).first()
            if not member:
                name_parts = (zm.zoho_name or 'Unknown').split(' ', 1)
                member = Members.objects.create(
                    first_name=name_parts[0],
                    last_name=name_parts[1] if len(name_parts) > 1 else '',
                    email=zm.zoho_email,
                    is_active=True,
                )
                self.stdout.write(f"  ✅ {zm.zoho_name}")
            member_by_zoho_id[zm.zoho_user_id] = member
            if zm.zoho_email:
                member_by_email[zm.zoho_email.lower()] = member
        self.stdout.write(f"  Total Members: {Members.objects.count()}")


        # Step 4: Sync Projects
        self.stdout.write("\n📁 Syncing Projects...")
        project_map = {}
        for zb in ZohoBoard.objects.all():
            project = Projects.objects.filter(name=zb.zoho_board_name).first()
            if not project:
                # Generate slug from name
                slug = zb.zoho_board_name.lower().replace(' ', '-').replace('/', '-')
                project = Projects.objects.create(
                    name=zb.zoho_board_name,
                    slug=slug,
                    description='Imported from Zoho Connect',
                    status='active',
                    visibility='private',
                )
                self.stdout.write(f"  ✅ {zb.zoho_board_name}")

            project_map[zb.zoho_board_id] = project
            project_map[str(zb.board_id)] = project
            # Update mapping - handle case where mapped_project references deleted project
            try:
                existing_mapping = zb.mapped_project
                if not existing_mapping:
                    zb.mapped_project = project
                    zb.save(update_fields=['mapped_project'])
            except Projects.DoesNotExist:
                zb.mapped_project = project
                zb.save(update_fields=['mapped_project'])
        self.stdout.write(f"  Total Projects: {Projects.objects.count()}")



        # Step 5: Sync Tasks with Assignees
        self.stdout.write("\n📋 Syncing Tasks...")
        tasks_created = 0
        tasks_skipped = 0
        assignees_created = 0
        default_status = TaskStatuses.objects.first()
        default_priority = priority_map.get('medium')

        for zt in ZohoTaskData.objects.all():
            if zt.synced_task:
                tasks_skipped += 1
                continue

            project = None
            if zt.board:
                project = zt.board.mapped_project or project_map.get(zt.board.zoho_board_id)

            if not project:
                tasks_skipped += 1
                continue

            existing = Tasks.objects.filter(title=zt.title, project_id=project).first()
            if existing:
                zt.synced_task = existing
                zt.is_synced = True
                zt.save(update_fields=['synced_task', 'is_synced'])
                tasks_skipped += 1
                continue

            # Get status
            task_status = default_status
            if zt.status:
                task_status = status_map.get(zt.status.zoho_status_id, default_status)

            # Get priority
            priority_name = (zt.priority_name or 'medium').lower()
            task_priority = priority_map.get(priority_name, default_priority)

            task = Tasks.objects.create(
                title=zt.title or 'Untitled',
                description=zt.description or '',
                project_id=project,
                status_id=task_status,
                priority_id=task_priority,
                due_date=zt.due_date,
                start_date=zt.start_date,
                external_url=zt.url,  # Zoho Connect task URL
            )

            # Create TaskAssignees from Zoho assignees
            if zt.assignees:
                for assignee_data in zt.assignees:
                    member = None
                    # Try matching by Zoho ID first
                    zoho_id = assignee_data.get('id')
                    if zoho_id and zoho_id in member_by_zoho_id:
                        member = member_by_zoho_id[zoho_id]
                    # Try matching by email
                    if not member:
                        email = assignee_data.get('emailId', '').lower()
                        if email and email in member_by_email:
                            member = member_by_email[email]
                    
                    if member:
                        TaskAssignees.objects.get_or_create(
                            task_id=task,
                            member_id=member,
                            defaults={'assigned_at': timezone.now()}
                        )
                        assignees_created += 1

            zt.synced_task = task
            zt.is_synced = True
            zt.save(update_fields=['synced_task', 'is_synced'])
            tasks_created += 1

        self.stdout.write(f"  ✅ Created: {tasks_created} tasks")
        self.stdout.write(f"  👤 Created: {assignees_created} assignees")
        self.stdout.write(f"  ➡️ Skipped: {tasks_skipped} tasks")

        # Step 6: Backfill assignees for existing synced tasks
        self.stdout.write("\n👥 Backfilling Assignees for Existing Tasks...")
        backfill_count = 0
        for zt in ZohoTaskData.objects.filter(synced_task__isnull=False):
            if not zt.assignees or not zt.synced_task:
                continue
            
            for assignee_data in zt.assignees:
                member = None
                zoho_id = assignee_data.get('id')
                if zoho_id and zoho_id in member_by_zoho_id:
                    member = member_by_zoho_id[zoho_id]
                if not member:
                    email = assignee_data.get('emailId', '').lower()
                    if email and email in member_by_email:
                        member = member_by_email[email]
                
                if member:
                    _, created = TaskAssignees.objects.get_or_create(
                        task_id=zt.synced_task,
                        member_id=member,
                        defaults={'assigned_at': timezone.now()}
                    )
                    if created:
                        backfill_count += 1
        
        self.stdout.write(f"  ✅ Backfilled: {backfill_count} assignees")

        # Step 7: Backfill external_url for existing synced tasks
        self.stdout.write("\n🔗 Backfilling External URLs for Synced Tasks...")
        url_backfill_count = 0
        for zt in ZohoTaskData.objects.filter(synced_task__isnull=False):
            if zt.url and zt.synced_task:
                # Update task if external_url is not set
                if not zt.synced_task.external_url:
                    zt.synced_task.external_url = zt.url
                    zt.synced_task.save(update_fields=['external_url'])
                    url_backfill_count += 1
        
        self.stdout.write(f"  ✅ Backfilled: {url_backfill_count} task URLs")

        # Summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("✅ SYNC COMPLETE!"))
        self.stdout.write(f"  📊 Task Statuses: {TaskStatuses.objects.count()}")
        self.stdout.write(f"  🔥 Task Priorities: {TaskPriorities.objects.count()}")
        self.stdout.write(f"  👥 Members: {Members.objects.count()}")
        self.stdout.write(f"  📁 Projects: {Projects.objects.count()}")
        self.stdout.write(f"  📋 Tasks: {Tasks.objects.count()}")
        self.stdout.write(f"  👤 Task Assignees: {TaskAssignees.objects.count()}")
        self.stdout.write(f"  🔗 External URLs: {Tasks.objects.exclude(external_url__isnull=True).exclude(external_url='').count()}")

