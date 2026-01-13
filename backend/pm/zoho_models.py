# Zoho Connect Integration

## Models

from django.db import models
from pm.models import Tasks, Projects, Members, TaskStatuses
import uuid


class ZohoBoard(models.Model):
    """Zoho Connect Board (maps to PM Project)"""
    board_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    zoho_board_id = models.CharField(max_length=50, unique=True)  # e.g., "124744000002239124"
    zoho_board_name = models.CharField(max_length=200)  # e.g., "Raja Thangamaaligai"
    zoho_board_url = models.URLField(blank=True, null=True)
    
    # Mapping to PM
    mapped_project = models.ForeignKey(Projects, on_delete=models.SET_NULL, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'zoho_boards'
        verbose_name = 'Zoho Board'
        verbose_name_plural = 'Zoho Boards'
    
    def __str__(self):
        return self.zoho_board_name


class ZohoSection(models.Model):
    """Zoho Connect Section within a Board"""
    section_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    zoho_section_id = models.CharField(max_length=50, unique=True)
    zoho_section_name = models.CharField(max_length=200)
    board = models.ForeignKey(ZohoBoard, on_delete=models.CASCADE, related_name='sections')
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'zoho_sections'
    
    def __str__(self):
        return f"{self.board.zoho_board_name} / {self.zoho_section_name}"


class ZohoStatus(models.Model):
    """Zoho Connect Status (maps to PM TaskStatus)"""
    status_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    zoho_status_id = models.CharField(max_length=50, unique=True)  # e.g., "CFO_124744000002239170"
    zoho_status_name = models.CharField(max_length=100)  # e.g., "To Do"
    color_type = models.CharField(max_length=10, blank=True)
    mapping_type = models.CharField(max_length=10, blank=True)
    board = models.ForeignKey(ZohoBoard, on_delete=models.CASCADE, related_name='statuses', null=True, blank=True)
    
    # Mapping to PM
    mapped_status = models.ForeignKey(TaskStatuses, on_delete=models.SET_NULL, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'zoho_statuses'
    
    def __str__(self):
        return self.zoho_status_name


class ZohoMember(models.Model):
    """Zoho Connect User (maps to PM Member)"""
    member_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    zoho_user_id = models.CharField(max_length=50, unique=True)  # e.g., "60037264906"
    zoho_name = models.CharField(max_length=200)
    zoho_email = models.EmailField()
    zoho_profile_url = models.URLField(blank=True, null=True)
    
    # Mapping to PM
    mapped_member = models.ForeignKey(Members, on_delete=models.SET_NULL, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'zoho_members'
    
    def __str__(self):
        return f"{self.zoho_name} ({self.zoho_email})"


class ZohoTaskData(models.Model):
    """Parsed Zoho Task from Webhook"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Zoho identifiers
    zoho_task_id = models.CharField(max_length=50, db_index=True)  # e.g., "124744000004280299"
    zoho_internal_task_id = models.CharField(max_length=50, blank=True)  # taskId field
    
    # Task details
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    url = models.URLField(blank=True, null=True)
    
    # Board and Section
    board = models.ForeignKey(ZohoBoard, on_delete=models.SET_NULL, null=True, blank=True)
    section = models.ForeignKey(ZohoSection, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Status and Priority
    status = models.ForeignKey(ZohoStatus, on_delete=models.SET_NULL, null=True, blank=True)
    priority_id = models.CharField(max_length=10, blank=True)
    priority_name = models.CharField(max_length=50, blank=True)
    
    # Dates
    due_date = models.DateField(null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    created_time = models.DateTimeField(null=True, blank=True)
    created_time_millis = models.BigIntegerField(null=True, blank=True)
    
    # Assignees (stored as JSON)
    assignees = models.JSONField(default=list, blank=True)  # [{"id": "...", "name": "...", "emailId": "..."}]
    
    # Custom fields (stored as JSON)
    custom_fields = models.JSONField(default=dict, blank=True)
    
    # Category from custom fields (extracted for convenience)
    category_name = models.CharField(max_length=100, blank=True)  # Bug, Task, Support request, etc.
    user_story = models.TextField(blank=True)
    
    # Checklists and Tags
    checklists = models.JSONField(default=list, blank=True)
    tags = models.JSONField(default=list, blank=True)
    
    # Attachments
    attachments = models.JSONField(default=list, blank=True)
    
    # Webhook metadata
    trigger_type = models.CharField(max_length=50)  # Task_Created, Task_Status_Changed, etc.
    triggered_by_id = models.CharField(max_length=50, blank=True)
    triggered_by_name = models.CharField(max_length=200, blank=True)
    triggered_by_email = models.CharField(max_length=200, blank=True)
    triggered_time = models.DateTimeField(null=True, blank=True)
    triggered_time_millis = models.BigIntegerField(null=True, blank=True)
    
    # Scope (organization)
    scope_id = models.CharField(max_length=50, blank=True)
    scope_name = models.CharField(max_length=200, blank=True)
    
    # Raw webhook data
    raw_payload = models.JSONField(default=dict)
    webhook_log_id = models.IntegerField(null=True, blank=True)  # Reference to original webhook log
    
    # Sync status
    is_synced = models.BooleanField(default=False)
    synced_task = models.ForeignKey(Tasks, on_delete=models.SET_NULL, null=True, blank=True, related_name='zoho_data')
    last_sync_at = models.DateTimeField(null=True, blank=True)
    sync_error = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'zoho_task_data'
        ordering = ['-triggered_time']
        indexes = [
            models.Index(fields=['zoho_task_id']),
            models.Index(fields=['is_synced']),
            models.Index(fields=['trigger_type']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.zoho_task_id})"


class ZohoSyncLog(models.Model):
    """Log of sync operations"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sync_type = models.CharField(max_length=50)  # pull_webhooks, sync_task, bulk_sync
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, default='running')  # running, completed, failed
    
    items_processed = models.IntegerField(default=0)
    items_created = models.IntegerField(default=0)
    items_updated = models.IntegerField(default=0)
    items_failed = models.IntegerField(default=0)
    
    error_message = models.TextField(blank=True)
    details = models.JSONField(default=dict)
    
    class Meta:
        db_table = 'zoho_sync_logs'
        ordering = ['-started_at']
    
    def __str__(self):
        return f"{self.sync_type} @ {self.started_at}"


class ZohoProcessedLog(models.Model):
    """Tracks which webhook log IDs have been successfully processed"""
    webhook_log_id = models.IntegerField(unique=True)
    processed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'zoho_processed_logs'
        ordering = ['-webhook_log_id']

    def __str__(self):
        return f"Log {self.webhook_log_id}"

