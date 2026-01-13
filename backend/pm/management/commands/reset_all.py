"""
Django Management Command: Reset All Data (Fresh Start)
Usage: python manage.py reset_all

This command deletes ALL transactional data from both Zoho and PM systems,
while preserving master data (Members, TaskStatuses, TaskPriorities, Roles, etc.)
"""
from django.core.management.base import BaseCommand
from django.db import transaction

# Zoho models
from pm.zoho_models import (
    ZohoBoard, ZohoSection, ZohoStatus, ZohoMember, 
    ZohoTaskData, ZohoSyncLog
)

# PM models
from pm.models import (
    Projects, Tasks, TaskAssignees, TaskComments, TaskAttachments,
    TaskHistory, TaskLabelMap, Sprints, SprintTasks,
    Iterations, IterationTasks, ProjectDocuments, DocumentVersions,
    DocumentPermissions, ProjectMembers, Teams, TeamMembers,
    ActivityLogs, DailyStandup, StandupItem
)


class Command(BaseCommand):
    help = 'Reset all transactional data (Zoho + PM) while preserving masters'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm the reset operation (required)',
        )
        parser.add_argument(
            '--include-members',
            action='store_true',
            help='Also delete Members (team users)',
        )

    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(self.style.ERROR(
                "\n" + "=" * 60 +
                "\n⚠️  WARNING: This will DELETE ALL DATA!\n" +
                "=" * 60 +
                "\n\nThis command will delete:\n"
                "  • All Zoho: Boards, Sections, Statuses, Members, Tasks, Logs\n"
                "  • All PM: Projects, Tasks, Sprints, Iterations, Timesheets\n"
                "  • All PM: Comments, Attachments, Assignees, History\n"
                "\nThis command will KEEP:\n"
                "  • Masters: TaskStatuses, TaskPriorities, TaskLabels\n"
                "  • Security: Roles, Permissions, RolePermissions\n"
                "  • Team: Members (unless --include-members is passed)\n"
                "\nTo proceed, run:\n"
                "  python manage.py reset_all --confirm\n"
            ))
            return
        
        # Final confirmation
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.WARNING("🚨 FINAL CONFIRMATION REQUIRED"))
        self.stdout.write("=" * 60)
        
        # Show counts
        counts = self._get_counts()
        self.stdout.write("\nData to be deleted:")
        for name, count in counts.items():
            if count > 0:
                self.stdout.write(f"  • {name}: {count}")
        
        user_input = input("\nType 'DELETE EVERYTHING' to proceed: ")
        if user_input != 'DELETE EVERYTHING':
            self.stdout.write(self.style.ERROR("\n❌ Reset cancelled."))
            return
        
        # Perform deletion
        self.stdout.write("\n🗑️ Deleting data...\n")
        
        with transaction.atomic():
            deleted = self._delete_all(options['include_members'])
        
        # Summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("✅ RESET COMPLETE!"))
        self.stdout.write("=" * 60)
        self.stdout.write("\nDeleted:")
        for name, count in deleted.items():
            if count > 0:
                self.stdout.write(f"  ✓ {name}: {count}")
        
        self.stdout.write("\n📌 Masters preserved: TaskStatuses, TaskPriorities, TaskLabels, Roles, Permissions")
        if not options['include_members']:
            self.stdout.write("📌 Members preserved")
        
        self.stdout.write("\n🚀 Ready for fresh sync!")

    def _get_counts(self):
        """Get counts of all data to be deleted"""
        return {
            # Zoho
            'Zoho Tasks': ZohoTaskData.objects.count(),
            'Zoho Boards': ZohoBoard.objects.count(),
            'Zoho Sections': ZohoSection.objects.count(),
            'Zoho Statuses': ZohoStatus.objects.count(),
            'Zoho Members': ZohoMember.objects.count(),
            'Zoho Sync Logs': ZohoSyncLog.objects.count(),
            # PM
            'PM Projects': Projects.objects.count(),
            'PM Tasks': Tasks.objects.count(),
            'PM Task Assignees': TaskAssignees.objects.count(),
            'PM Task Comments': TaskComments.objects.count(),
            'PM Task Attachments': TaskAttachments.objects.count(),
            'PM Task History': TaskHistory.objects.count(),
            'PM Sprints': Sprints.objects.count(),
            'PM Sprint Tasks': SprintTasks.objects.count(),
            'PM Iterations': Iterations.objects.count(),
            'PM Iteration Tasks': IterationTasks.objects.count(),
            'PM Standups': DailyStandup.objects.count(),
            'PM Standup Items': StandupItem.objects.count(),
            'PM Teams': Teams.objects.count(),
            'PM Team Members': TeamMembers.objects.count(),
            'PM Project Members': ProjectMembers.objects.count(),
            'PM Documents': ProjectDocuments.objects.count(),
            'PM Activity Logs': ActivityLogs.objects.count(),
        }

    def _delete_all(self, include_members=False):
        """Delete all data in correct order (respecting foreign keys)"""
        deleted = {}
        
        # === ZOHO DATA ===
        self.stdout.write("  Deleting Zoho data...")
        
        deleted['Zoho Tasks'] = ZohoTaskData.objects.count()
        ZohoTaskData.objects.all().delete()
        
        deleted['Zoho Sections'] = ZohoSection.objects.count()
        ZohoSection.objects.all().delete()
        
        deleted['Zoho Statuses'] = ZohoStatus.objects.count()
        ZohoStatus.objects.all().delete()
        
        deleted['Zoho Members'] = ZohoMember.objects.count()
        ZohoMember.objects.all().delete()
        
        deleted['Zoho Boards'] = ZohoBoard.objects.count()
        ZohoBoard.objects.all().delete()
        
        deleted['Zoho Sync Logs'] = ZohoSyncLog.objects.count()
        ZohoSyncLog.objects.all().delete()
        
        self.stdout.write(self.style.SUCCESS("    ✓ Zoho data deleted"))
        
        # === PM DATA ===
        self.stdout.write("  Deleting PM data...")
        
        # Activity logs first (references many things)
        deleted['Activity Logs'] = ActivityLogs.objects.count()
        ActivityLogs.objects.all().delete()
        
        # Standups
        deleted['Standup Items'] = StandupItem.objects.count()
        StandupItem.objects.all().delete()
        deleted['Standups'] = DailyStandup.objects.count()
        DailyStandup.objects.all().delete()
        
        # Task related
        deleted['Task Assignees'] = TaskAssignees.objects.count()
        TaskAssignees.objects.all().delete()
        deleted['Task Comments'] = TaskComments.objects.count()
        TaskComments.objects.all().delete()
        deleted['Task Attachments'] = TaskAttachments.objects.count()
        TaskAttachments.objects.all().delete()
        deleted['Task History'] = TaskHistory.objects.count()
        TaskHistory.objects.all().delete()
        deleted['Task Labels'] = TaskLabelMap.objects.count()
        TaskLabelMap.objects.all().delete()
        
        # Sprint/Iteration tasks
        deleted['Sprint Tasks'] = SprintTasks.objects.count()
        SprintTasks.objects.all().delete()
        deleted['Iteration Tasks'] = IterationTasks.objects.count()
        IterationTasks.objects.all().delete()
        
        # Tasks
        deleted['Tasks'] = Tasks.objects.count()
        Tasks.objects.all().delete()
        
        # Sprints & Iterations
        deleted['Sprints'] = Sprints.objects.count()
        Sprints.objects.all().delete()
        deleted['Iterations'] = Iterations.objects.count()
        Iterations.objects.all().delete()
        
        # Documents
        deleted['Document Versions'] = DocumentVersions.objects.count()
        DocumentVersions.objects.all().delete()
        deleted['Document Permissions'] = DocumentPermissions.objects.count()
        DocumentPermissions.objects.all().delete()
        deleted['Documents'] = ProjectDocuments.objects.count()
        ProjectDocuments.objects.all().delete()
        
        # Project members & Teams
        deleted['Project Members'] = ProjectMembers.objects.count()
        ProjectMembers.objects.all().delete()
        deleted['Team Members'] = TeamMembers.objects.count()
        TeamMembers.objects.all().delete()
        deleted['Teams'] = Teams.objects.count()
        Teams.objects.all().delete()
        
        # Projects
        deleted['Projects'] = Projects.objects.count()
        Projects.objects.all().delete()
        
        self.stdout.write(self.style.SUCCESS("    ✓ PM data deleted"))
        
        # Members (optional)
        if include_members:
            from pm.models import Members
            deleted['Members'] = Members.objects.count()
            Members.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("    ✓ Members deleted"))
        
        return deleted
