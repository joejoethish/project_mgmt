"""
Signals for PM module
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver, Signal
from pm.models import Permissions

# Custom Signals for task status changes (used by gamification)
task_status_changed = Signal()


def ensure_permission(name, description):
    """Create permission if it doesn't exist"""
    perm, created = Permissions.objects.get_or_create(
        name=name,
        defaults={'description': description}
    )
    return perm, created


def delete_permission(name):
    """Delete a permission by name if it exists"""
    Permissions.objects.filter(name=name).delete()


# ==================== REPORTING SIGNALS ====================

@receiver(post_save, sender='reporting.ReportDefinition')
def create_report_permissions(sender, instance, created, **kwargs):
    """Auto-create permissions when a report is created"""
    report_id = str(instance.report_id)
    report_name = instance.name
    
    # Create view permission
    ensure_permission(
        name=f'view_report_{report_id}',
        description=f'View report: {report_name}'
    )
    
    # Create edit permission
    ensure_permission(
        name=f'edit_report_{report_id}',
        description=f'Edit report: {report_name}'
    )


@receiver(post_delete, sender='reporting.ReportDefinition')
def delete_report_permissions(sender, instance, **kwargs):
    """Clean up permissions when a report is deleted"""
    report_id = str(instance.report_id)
    delete_permission(f'view_report_{report_id}')
    delete_permission(f'edit_report_{report_id}')


# ==================== MASTERS SIGNALS ====================

@receiver(post_save, sender='masters.DynamicMaster')
def create_master_permissions(sender, instance, created, **kwargs):
    """Auto-create permissions when a master is created"""
    master_name = instance.name
    display_name = instance.display_name
    
    # Create view permission
    ensure_permission(
        name=f'view_master_{master_name}',
        description=f'View master: {display_name}'
    )
    
    # Create edit permission
    ensure_permission(
        name=f'edit_master_{master_name}',
        description=f'Edit master data: {display_name}'
    )


@receiver(post_delete, sender='masters.DynamicMaster')
def delete_master_permissions(sender, instance, **kwargs):
    """Clean up permissions when a master is deleted"""
    master_name = instance.name
    delete_permission(f'view_master_{master_name}')
    delete_permission(f'edit_master_{master_name}')
