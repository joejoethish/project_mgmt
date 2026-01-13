"""
Management command to create preconfigured dynamic masters
Usage: python manage.py seed_masters
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from masters.models import DynamicMaster, DynamicMasterField


PRECONFIGURED_MASTERS = [
    {
        'name': 'employee',
        'display_name': 'Employee Master',
        'description': 'Team members and their information',
        'icon': '👤',
        'fields': [
            {'field_name': 'employee_code', 'display_name': 'Employee Code', 'field_type': 'text', 'is_required': True, 'is_unique': True, 'show_in_list': True},
            {'field_name': 'name', 'display_name': 'Full Name', 'field_type': 'text', 'is_required': True, 'show_in_list': True},
            {'field_name': 'email', 'display_name': 'Email', 'field_type': 'email', 'is_required': True, 'is_unique': True, 'show_in_list': True},
            {'field_name': 'phone', 'display_name': 'Phone', 'field_type': 'phone', 'show_in_list': False},
            {'field_name': 'role', 'display_name': 'Role', 'field_type': 'text', 'is_required': True, 'show_in_list': True},
            {'field_name': 'department', 'display_name': 'Department', 'field_type': 'text', 'is_required': True, 'show_in_list': True},
            {'field_name': 'joining_date', 'display_name': 'Joining Date', 'field_type': 'date', 'show_in_list': False},
            {'field_name': 'status', 'display_name': 'Status', 'field_type': 'select', 'choices_json': ['Active', 'On Leave', 'Inactive'], 'show_in_list': True},
        ]
    },
    {
        'name': 'project',
        'display_name': 'Project Master',
        'description': 'Projects and client information',
        'icon': '📁',
        'fields': [
            {'field_name': 'project_code', 'display_name': 'Project Code', 'field_type': 'text', 'is_required': True, 'is_unique': True, 'show_in_list': True},
            {'field_name': 'project_name', 'display_name': 'Project Name', 'field_type': 'text', 'is_required': True, 'show_in_list': True},
            {'field_name': 'client_name', 'display_name': 'Client Name', 'field_type': 'text', 'is_required': True, 'show_in_list': True},
            {'field_name': 'client_contact', 'display_name': 'Client Contact', 'field_type': 'text', 'show_in_list': False},
            {'field_name': 'client_email', 'display_name': 'Client Email', 'field_type': 'email', 'show_in_list': False},
            {'field_name': 'project_type', 'display_name': 'Project Type', 'field_type': 'select', 'choices_json': ['Existing - Maintenance', 'Ongoing - Active Dev', 'New - Fresh Start'], 'show_in_list': True},
            {'field_name': 'start_date', 'display_name': 'Start Date', 'field_type': 'date', 'show_in_list': False},
            {'field_name': 'status', 'display_name': 'Status', 'field_type': 'select', 'choices_json': ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'], 'show_in_list': True},
        ]
    },
    {
        'name': 'status',
        'display_name': 'Status Master',
        'description': 'Task status definitions',
        'icon': '🔄',
        'fields': [
            {'field_name': 'name', 'display_name': 'Status Name', 'field_type': 'text', 'is_required': True, 'is_unique': True, 'show_in_list': True},
            {'field_name': 'stage', 'display_name': 'Stage', 'field_type': 'select', 'choices_json': ['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'], 'is_required': True, 'show_in_list': True},
            {'field_name': 'color', 'display_name': 'Color Code', 'field_type': 'color', 'show_in_list': True},
            {'field_name': 'description', 'display_name': 'Description', 'field_type': 'textarea', 'show_in_list': False},
        ]
    },
    {
        'name': 'priority',
        'display_name': 'Priority Master',
        'description': 'Task priority levels',
        'icon': '⚡',
        'fields': [
            {'field_name': 'name', 'display_name': 'Priority Name', 'field_type': 'text', 'is_required': True, 'is_unique': True, 'show_in_list': True},
            {'field_name': 'level', 'display_name': 'Priority Level', 'field_type': 'number', 'is_required': True, 'show_in_list': True, 'help_text': '1=highest, 5=lowest'},
            {'field_name': 'color', 'display_name': 'Color Code', 'field_type': 'color', 'show_in_list': True},
        ]
    },
    {
        'name': 'task_type',
        'display_name': 'Task Type Master',
        'description': 'Types of tasks',
        'icon': '📌',
        'fields': [
            {'field_name': 'name', 'display_name': 'Task Type', 'field_type': 'text', 'is_required': True, 'is_unique': True, 'show_in_list': True},
            {'field_name': 'description', 'display_name': 'Description', 'field_type': 'textarea', 'show_in_list': False},
            {'field_name': 'icon', 'display_name': 'Icon', 'field_type': 'text', 'show_in_list': True},
        ]
    },
    {
        'name': 'module',
        'display_name': 'Module Master',
        'description': 'Application modules',
        'icon': '📦',
        'fields': [
            {'field_name': 'name', 'display_name': 'Module Name', 'field_type': 'text', 'is_required': True, 'is_unique': True, 'show_in_list': True},
            {'field_name': 'description', 'display_name': 'Description', 'field_type': 'textarea', 'show_in_list': False},
            {'field_name': 'icon', 'display_name': 'Icon', 'field_type': 'text', 'show_in_list': True},
        ]
    },
]


class Command(BaseCommand):
    help = 'Create preconfigured dynamic masters'

    def handle(self, *args, **options):
        # Get or create admin user
        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            admin_user, created = User.objects.get_or_create(
                username='admin',
                defaults={'is_staff': True, 'is_superuser': True}
            )
            if created:
                admin_user.set_password('admin')
                admin_user.save()
                self.stdout.write(self.style.SUCCESS('Created admin user'))

        created_count = 0
        skipped_count = 0

        for master_def in PRECONFIGURED_MASTERS:
            master_name = master_def['name']
            
            # Check if master already exists
            if DynamicMaster.objects.filter(name=master_name).exists():
                self.stdout.write(self.style.WARNING(f'Master "{master_name}" already exists - skipping'))
                skipped_count += 1
                continue

            # Create master
            fields_data = master_def.pop('fields')
            master = DynamicMaster.objects.create(
                created_by=admin_user,
                **master_def
            )

            # Create fields
            for order, field_data in enumerate(fields_data):
                DynamicMasterField.objects.create(
                    master=master,
                    order=order,
                    **field_data
                )

            self.stdout.write(self.style.SUCCESS(f'✓ Created master "{master.display_name}" with {len(fields_data)} fields'))
            created_count += 1

        self.stdout.write(self.style.SUCCESS(f'\n{"="*50}'))
        self.stdout.write(self.style.SUCCESS(f'Summary: {created_count} created, {skipped_count} skipped'))
        self.stdout.write(self.style.SUCCESS(f'{"="*50}'))
