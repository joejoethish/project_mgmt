from django.db import models
from django.contrib.auth.models import User
import uuid

class Members(models.Model):
    user = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='member')
    member_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name = models.CharField(max_length=255, blank=True, null=True)
    last_name = models.CharField(max_length=255, blank=True, null=True)
    email = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=255, blank=True, null=True)
    profile_image_url = models.CharField(max_length=255, blank=True, null=True)
    role_id = models.ForeignKey('Roles', on_delete=models.SET_NULL, null=True, blank=True, related_name='members_role_id', db_column='role_id')
    is_active = models.IntegerField(default=0)
    last_login = models.DateTimeField(auto_now_add=False, auto_now=False, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, auto_now=False, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now_add=False, auto_now=True, null=True, blank=True)
    deleted_at = models.DateTimeField(auto_now_add=False, auto_now=False, null=True, blank=True)

    class Meta:
        db_table = 'members'

    def __str__(self):
        return str(self.member_id)

class Projects(models.Model):
    project_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, blank=True, null=True)
    slug = models.CharField(max_length=255, blank=True, null=True)
    description = models.CharField(max_length=255, blank=True, null=True)
    owner_member_id = models.ForeignKey(Members, on_delete=models.CASCADE, related_name='projects_owner_member_id', null=True, blank=True, db_column='owner_member_id')
    visibility = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=255, blank=True, null=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    # Dynamic Master Links
    client_type = models.ForeignKey('masters.DynamicMasterData', on_delete=models.SET_NULL, null=True, blank=True, related_name='projects_client_type')
    project_category = models.ForeignKey('masters.DynamicMasterData', on_delete=models.SET_NULL, null=True, blank=True, related_name='projects_category')

    created_at = models.DateTimeField(auto_now_add=True, auto_now=False, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now_add=False, auto_now=True, null=True, blank=True)
    deleted_at = models.DateTimeField(auto_now_add=False, auto_now=False, null=True, blank=True)

    class Meta:
        db_table = 'projects'

    def __str__(self):
        return str(self.project_id)

class Teams(models.Model):
    team_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, blank=True, null=True)
    description = models.CharField(max_length=255, blank=True, null=True)
    lead_member_id = models.ForeignKey(Members, on_delete=models.CASCADE, related_name='teams_lead_member_id', null=True, blank=True, db_column='lead_member_id')
    created_at = models.DateTimeField(auto_now_add=True, auto_now=False, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now_add=False, auto_now=True, null=True, blank=True)
    deleted_at = models.DateTimeField(auto_now_add=False, auto_now=False, null=True, blank=True)

    class Meta:
        db_table = 'teams'

    def __str__(self):
        return str(self.team_id)

class TeamMembers(models.Model):
    team_member_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team_id = models.ForeignKey(Teams, on_delete=models.CASCADE, related_name='team_members_team_id', null=True, blank=True, db_column='team_id')
    member_id = models.ForeignKey(Members, on_delete=models.CASCADE, related_name='team_members_member_id', null=True, blank=True, db_column='member_id')
    role_in_team = models.CharField(max_length=255, blank=True, null=True)
    joined_at = models.DateTimeField(auto_now_add=False, auto_now=False, null=True, blank=True)
    left_at = models.DateTimeField(auto_now_add=False, auto_now=False, null=True, blank=True)

    class Meta:
        db_table = 'team_members'

    def __str__(self):
        return str(self.team_member_id)

class Roles(models.Model):
    role_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, blank=True, null=True)
    description = models.CharField(max_length=255, blank=True, null=True)
    is_default = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True, auto_now=False, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now_add=False, auto_now=True, null=True, blank=True)

    class Meta:
        db_table = 'roles'

    def __str__(self):
        return str(self.role_id)

class Permissions(models.Model):
    permission_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, blank=True, null=True)
    description = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, auto_now=False, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now_add=False, auto_now=True, null=True, blank=True)

    class Meta:
        db_table = 'permissions'

    def __str__(self):
        return str(self.permission_id)

class MemberInvitations(models.Model):
    invitation_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.ForeignKey(Members, on_delete=models.CASCADE, related_name='invitations_member', db_column='member_id')
    email = models.CharField(max_length=255, blank=True, null=True)
    role_id = models.ForeignKey(Roles, on_delete=models.SET_NULL, null=True, blank=True, related_name='invitations_role_id', db_column='role_id')
    token = models.CharField(max_length=255, unique=True)
    status = models.CharField(max_length=50, default='PENDING') # PENDING, ACCEPTED, EXPIRED
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'member_invitations'

    def __str__(self):
        return f"Invite for {self.email} ({self.status})"




class RolePermissions(models.Model):
    role_permission_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role_id = models.ForeignKey(Roles, on_delete=models.CASCADE, related_name='role_permissions_role_id', null=True, blank=True, db_column='role_id')
    permission_id = models.ForeignKey(Permissions, on_delete=models.CASCADE, related_name='role_permissions_permission_id', null=True, blank=True, db_column='permission_id')
    created_at = models.DateTimeField(auto_now_add=True, auto_now=False, null=True, blank=True)

    class Meta:
        db_table = 'role_permissions'

    def __str__(self):
        return str(self.role_permission_id)

class ProjectMembers(models.Model):
    project_member_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project_id = models.ForeignKey(Projects, on_delete=models.CASCADE, related_name='project_members_project_id', null=True, blank=True, db_column='project_id')
    member_id = models.ForeignKey(Members, on_delete=models.CASCADE, related_name='project_members_member_id', null=True, blank=True, db_column='member_id')
    role_id = models.ForeignKey(Roles, on_delete=models.CASCADE, related_name='project_members_role_id', null=True, blank=True, db_column='role_id')
    is_owner = models.IntegerField(default=0)
    joined_at = models.DateTimeField(auto_now_add=False, auto_now=False, null=True, blank=True)
    left_at = models.DateTimeField(auto_now_add=False, auto_now=False, null=True, blank=True)

    class Meta:
        db_table = 'project_members'

    def __str__(self):
        return str(self.project_member_id)

class TaskStatuses(models.Model):
    task_status_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, blank=True, null=True)
    description = models.CharField(max_length=255, blank=True, null=True)
    sort_order = models.IntegerField(default=0)
    is_default = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'task_statuses'

    def __str__(self):
        return str(self.task_status_id)

class WorkflowTransitions(models.Model):
    transition_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow_name = models.CharField(max_length=255, blank=True, null=True)
    from_status_id = models.ForeignKey(TaskStatuses, on_delete=models.CASCADE, related_name='workflow_transitions_from_status_id', null=True, blank=True, db_column='from_status_id')
    to_status_id = models.ForeignKey(TaskStatuses, on_delete=models.CASCADE, related_name='workflow_transitions_to_status_id', null=True, blank=True, db_column='to_status_id')
    role_id = models.ForeignKey(Roles, on_delete=models.CASCADE, related_name='workflow_transitions_role_id', null=True, blank=True, db_column='role_id')
    created_at = models.DateTimeField(auto_now_add=True, auto_now=False, null=True, blank=True)

    class Meta:
        db_table = 'workflow_transitions'

    def __str__(self):
        return str(self.transition_id)

class TaskPriorities(models.Model):
    task_priority_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, blank=True, null=True)
    description = models.CharField(max_length=255, blank=True, null=True)
    sort_order = models.IntegerField(default=0)
    is_default = models.IntegerField(default=0)
    color = models.CharField(max_length=50, blank=True, null=True, default='#3b82f6')

    class Meta:
        db_table = 'task_priorities'

    def __str__(self):
        return str(self.task_priority_id)

class TaskLabels(models.Model):
    task_label_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project_id = models.ForeignKey(Projects, on_delete=models.CASCADE, related_name='task_labels_project_id', null=True, blank=True, db_column='project_id')
    name = models.CharField(max_length=255, blank=True, null=True)
    color = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, auto_now=False, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now_add=False, auto_now=True, null=True, blank=True)

    class Meta:
        db_table = 'task_labels'

    def __str__(self):
        return str(self.task_label_id)

class Tasks(models.Model):
    task_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project_id = models.ForeignKey(Projects, on_delete=models.CASCADE, related_name='tasks_project_id', null=True, blank=True, db_column='project_id')
    created_by_member_id = models.ForeignKey(Members, on_delete=models.CASCADE, related_name='tasks_created_by_member_id', null=True, blank=True, db_column='created_by_member_id')
    title = models.CharField(max_length=255, blank=True, null=True)
    description = models.CharField(max_length=255, blank=True, null=True)
    status_id = models.ForeignKey(TaskStatuses, on_delete=models.PROTECT, related_name='tasks_status_id', null=True, blank=True, db_column='status_id')
    priority_id = models.ForeignKey(TaskPriorities, on_delete=models.CASCADE, related_name='tasks_priority_id', null=True, blank=True, db_column='priority_id')
    parent_task_id = models.ForeignKey('self', on_delete=models.CASCADE, related_name='tasks_parent_task_id', null=True, blank=True, db_column='parent_task_id')
    estimate_hours = models.FloatField(default=0)
    due_date = models.DateField(null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    percent_complete = models.IntegerField(default=0)
    position = models.IntegerField(default=0)
    external_url = models.URLField(max_length=500, blank=True, null=True, help_text="External URL (e.g., Zoho Connect task link)")
    created_at = models.DateTimeField(auto_now_add=True, auto_now=False, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now_add=False, auto_now=True, null=True, blank=True)
    deleted_at = models.DateTimeField(auto_now_add=False, auto_now=False, null=True, blank=True)


    class Meta:
        db_table = 'tasks'

    def __str__(self):
        return str(self.task_id)

class TaskAssignees(models.Model):
    task_assignee_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task_id = models.ForeignKey(Tasks, on_delete=models.CASCADE, related_name='task_assignees_task_id', null=True, blank=True, db_column='task_id')
    member_id = models.ForeignKey(Members, on_delete=models.CASCADE, related_name='task_assignees_member_id', null=True, blank=True, db_column='member_id')
    assigned_at = models.DateTimeField(auto_now_add=False, auto_now=False, null=True, blank=True)
    assigned_by_member_id = models.ForeignKey(Members, on_delete=models.CASCADE, related_name='task_assignees_assigned_by_member_id', null=True, blank=True, db_column='assigned_by_member_id')

    class Meta:
        db_table = 'task_assignees'

    def __str__(self):
        return str(self.task_assignee_id)

class TaskComments(models.Model):
    task_comment_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task_id = models.ForeignKey(Tasks, on_delete=models.CASCADE, related_name='task_comments_task_id', null=True, blank=True, db_column='task_id')
    member_id = models.ForeignKey(Members, on_delete=models.CASCADE, related_name='task_comments_member_id', null=True, blank=True, db_column='member_id')
    comment = models.CharField(max_length=255, blank=True, null=True)
    parent_comment_id = models.ForeignKey('self', on_delete=models.CASCADE, related_name='replies', null=True, blank=True, db_column='parent_comment_id')
    created_at = models.DateTimeField(auto_now_add=True, auto_now=False, null=True, blank=True)
    edited_at = models.DateTimeField(auto_now_add=False, auto_now=False, null=True, blank=True)
    deleted_at = models.DateTimeField(auto_now_add=False, auto_now=False, null=True, blank=True)

    class Meta:
        db_table = 'task_comments'

    def __str__(self):
        return str(self.task_comment_id)

class TaskAttachments(models.Model):
    task_attachment_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task_id = models.ForeignKey(Tasks, on_delete=models.CASCADE, related_name='task_attachments_task_id', null=True, blank=True, db_column='task_id')
    comment_id = models.ForeignKey(TaskComments, on_delete=models.CASCADE, related_name='attachments', null=True, blank=True, db_column='comment_id')
    member_id = models.ForeignKey(Members, on_delete=models.CASCADE, related_name='task_attachments_member_id', null=True, blank=True, db_column='member_id')
    file_name = models.CharField(max_length=255, blank=True, null=True)
    file_storage_path = models.CharField(max_length=255, blank=True, null=True)
    file_size_bytes = models.IntegerField(default=0)
    mime_type = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, auto_now=False, null=True, blank=True)

    class Meta:
        db_table = 'task_attachments'

    def __str__(self):
        return str(self.task_attachment_id)

class TaskCommentLikes(models.Model):
    like_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    comment_id = models.ForeignKey(TaskComments, on_delete=models.CASCADE, related_name='likes', null=True, blank=True, db_column='comment_id')
    member_id = models.ForeignKey(Members, on_delete=models.CASCADE, related_name='liked_comments', null=True, blank=True, db_column='member_id')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'task_comment_likes'
        unique_together = ('comment_id', 'member_id')

    def __str__(self):
        return str(self.like_id)

class TaskHistory(models.Model):
    task_history_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task_id = models.ForeignKey(Tasks, on_delete=models.CASCADE, related_name='task_history_task_id', null=True, blank=True, db_column='task_id')
    actor_member_id = models.ForeignKey(Members, on_delete=models.CASCADE, related_name='task_history_actor_member_id', null=True, blank=True, db_column='actor_member_id')
    action = models.CharField(max_length=255, blank=True, null=True)
    field_name = models.CharField(max_length=255, blank=True, null=True)
    old_value = models.CharField(max_length=255, blank=True, null=True)
    new_value = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, auto_now=False, null=True, blank=True)

    class Meta:
        db_table = 'task_history'

    def __str__(self):
        return str(self.task_history_id)

class TaskLabelMap(models.Model):
    task_label_map_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task_id = models.ForeignKey(Tasks, on_delete=models.CASCADE, related_name='task_label_map_task_id', null=True, blank=True, db_column='task_id')
    task_label_id = models.ForeignKey(TaskLabels, on_delete=models.CASCADE, related_name='task_label_map_task_label_id', null=True, blank=True, db_column='task_label_id')
    created_at = models.DateTimeField(auto_now_add=True, auto_now=False, null=True, blank=True)

    class Meta:
        db_table = 'task_label_map'

    def __str__(self):
        return str(self.task_label_map_id)

class Sprints(models.Model):
    sprint_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project_id = models.ForeignKey(Projects, on_delete=models.CASCADE, related_name='sprints_project_id', null=True, blank=True, db_column='project_id')
    name = models.CharField(max_length=255, blank=True, null=True)
    goal = models.CharField(max_length=255, blank=True, null=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, auto_now=False, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now_add=False, auto_now=True, null=True, blank=True)

    class Meta:
        db_table = 'sprints'

    def __str__(self):
        return str(self.sprint_id)

class SprintTasks(models.Model):
    sprint_task_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sprint_id = models.ForeignKey(Sprints, on_delete=models.CASCADE, related_name='sprint_tasks_sprint_id', null=True, blank=True, db_column='sprint_id')
    task_id = models.ForeignKey(Tasks, on_delete=models.CASCADE, related_name='sprint_tasks_task_id', null=True, blank=True, db_column='task_id')
    added_at = models.DateTimeField(auto_now_add=False, auto_now=False, null=True, blank=True)

    class Meta:
        db_table = 'sprint_tasks'

    def __str__(self):
        return str(self.sprint_task_id)

class ProjectDocuments(models.Model):
    project_document_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project_id = models.ForeignKey(Projects, on_delete=models.CASCADE, related_name='project_documents_project_id', null=True, blank=True, db_column='project_id')
    title = models.CharField(max_length=255, blank=True, null=True)
    description = models.CharField(max_length=255, blank=True, null=True)
    created_by_member_id = models.ForeignKey(Members, on_delete=models.CASCADE, related_name='project_documents_created_by_member_id', null=True, blank=True, db_column='created_by_member_id')
    created_at = models.DateTimeField(auto_now_add=True, auto_now=False, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now_add=False, auto_now=True, null=True, blank=True)
    deleted_at = models.DateTimeField(auto_now_add=False, auto_now=False, null=True, blank=True)

    class Meta:
        db_table = 'project_documents'

    def __str__(self):
        return str(self.project_document_id)

class DocumentVersions(models.Model):
    document_version_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project_document_id = models.ForeignKey(ProjectDocuments, on_delete=models.CASCADE, related_name='document_versions_project_document_id', null=True, blank=True, db_column='project_document_id')
    version_number = models.IntegerField(default=0)
    file_name = models.CharField(max_length=255, blank=True, null=True)
    file_storage_path = models.CharField(max_length=255, blank=True, null=True)
    file_size_bytes = models.IntegerField(default=0)
    mime_type = models.CharField(max_length=255, blank=True, null=True)
    uploaded_by_member_id = models.ForeignKey(Members, on_delete=models.CASCADE, related_name='document_versions_uploaded_by_member_id', null=True, blank=True, db_column='uploaded_by_member_id')
    uploaded_at = models.DateTimeField(auto_now_add=False, auto_now=False, null=True, blank=True)

    class Meta:
        db_table = 'document_versions'

    def __str__(self):
        return str(self.document_version_id)

class DocumentPermissions(models.Model):
    document_permission_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project_document_id = models.ForeignKey(ProjectDocuments, on_delete=models.CASCADE, related_name='document_permissions_project_document_id', null=True, blank=True, db_column='project_document_id')
    member_id = models.ForeignKey(Members, on_delete=models.CASCADE, related_name='document_permissions_member_id', null=True, blank=True, db_column='member_id')
    team_id = models.ForeignKey(Teams, on_delete=models.CASCADE, related_name='document_permissions_team_id', null=True, blank=True, db_column='team_id')
    permission = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, auto_now=False, null=True, blank=True)

    class Meta:
        db_table = 'document_permissions'

    def __str__(self):
        return str(self.document_permission_id)

class Changelog(models.Model):
    log_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor_member_id = models.ForeignKey(Members, on_delete=models.CASCADE, related_name='changelog_actor_member_id', null=True, blank=True, db_column='actor_member_id')
    entity_type = models.CharField(max_length=255, blank=True, null=True)
    entity_id = models.UUIDField(default=uuid.uuid4)
    action = models.CharField(max_length=255, blank=True, null=True)
    field_name = models.CharField(max_length=255, blank=True, null=True)
    old_value = models.CharField(max_length=255, blank=True, null=True)
    new_value = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, auto_now=False, null=True, blank=True)

    class Meta:
        db_table = 'changelog'

    def __str__(self):
        return str(self.log_id)

class ActivityLogs(models.Model):
    activity_log_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project_id = models.ForeignKey(Projects, on_delete=models.CASCADE, related_name='activity_logs_project_id', null=True, blank=True, db_column='project_id')
    member_id = models.ForeignKey(Members, on_delete=models.CASCADE, related_name='activity_logs_member_id', null=True, blank=True, db_column='member_id')
    verb = models.CharField(max_length=255, blank=True, null=True)
    subject_type = models.CharField(max_length=255, blank=True, null=True)
    subject_id = models.UUIDField(default=uuid.uuid4)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, auto_now=False, null=True, blank=True)

    class Meta:
        db_table = 'activity_logs'

    def __str__(self):
        return str(self.activity_log_id)


class Iterations(models.Model):
    """
    Global iterations for cross-project bi-weekly planning cycles.
    Not tied to a single project - tasks from any project can be added.
    """
    iteration_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)  # e.g., "Week 50", "Dec W1", "Sprint 2024-12"
    description = models.TextField(blank=True, null=True)
    goal = models.TextField(blank=True, null=True)  # What we want to achieve
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    is_current = models.BooleanField(default=False)  # Mark the current iteration
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'iterations'
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.name} ({self.start_date} - {self.end_date})"


class IterationTasks(models.Model):
    """
    Links tasks to iterations. A task can be in multiple iterations (carried over).
    """
    iteration_task_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    iteration = models.ForeignKey(Iterations, on_delete=models.CASCADE, related_name='iteration_tasks')
    task = models.ForeignKey(Tasks, on_delete=models.CASCADE, related_name='iteration_assignments')
    priority_points = models.IntegerField(default=0)  # For prioritization within iteration
    added_at = models.DateTimeField(auto_now_add=True)
    added_by = models.ForeignKey(Members, on_delete=models.SET_NULL, null=True, blank=True, related_name='added_iteration_tasks')
    notes = models.TextField(blank=True, null=True)  # Optional notes for this assignment

    class Meta:
        db_table = 'iteration_tasks'
        unique_together = ['iteration', 'task']  # A task can only be in an iteration once
        ordering = ['-priority_points', 'added_at']

    def __str__(self):
        return f"{self.task.title} in {self.iteration.name}"


class DailyStandup(models.Model):
    """
    Represents a single daily standup submission by a member.
    Enforces one valid submission per member per day.
    """
    standup_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.ForeignKey(Members, on_delete=models.CASCADE, related_name='standups')
    date = models.DateField(default=uuid.uuid4)  # Will be overridden by default logic or frontend
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'daily_standups'
        unique_together = ['member', 'date']
        ordering = ['-date']

    def __str__(self):
        return f"{self.member.first_name} - {self.date}"


class StandupItem(models.Model):
    """
    Individual line items within a daily standup.
    Can be a 'yesterday' achievement, 'today' plan, or 'blocker'.
    """
    SECTION_CHOICES = [
        ('yesterday', 'Yesterday'),
        ('today', 'Today'),
        ('blocker', 'Blocker'),
    ]

    standup_item_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    standup = models.ForeignKey(DailyStandup, on_delete=models.CASCADE, related_name='items')
    section = models.CharField(max_length=50, choices=SECTION_CHOICES)
    
    project = models.ForeignKey(Projects, on_delete=models.SET_NULL, null=True, blank=True, related_name='standup_mentions')
    task = models.ForeignKey(Tasks, on_delete=models.SET_NULL, null=True, blank=True, related_name='standup_mentions')
    
    description = models.TextField(blank=True, null=True)
    status_snapshot = models.CharField(max_length=255, blank=True, null=True, help_text="Status of the task at the time of reporting")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'standup_items'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.section} - {self.description[:30]}"


class TimesheetEntry(models.Model):
    """
    Weekly timesheet entries logged against tasks/projects.
    Can be auto-filled from GitHub activity.
    """
    timesheet_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.ForeignKey(Members, on_delete=models.CASCADE, related_name='timesheets')
    project = models.ForeignKey(Projects, on_delete=models.SET_NULL, null=True, blank=True, related_name='timesheet_entries')
    task = models.ForeignKey(Tasks, on_delete=models.SET_NULL, null=True, blank=True, related_name='timesheet_entries')
    
    date = models.DateField()
    hours = models.FloatField(default=0.0)
    description = models.TextField(blank=True, null=True)
    
    # Traceability
    github_refs = models.JSONField(default=list, blank=True, help_text="List of Commit SHAs or PR IDs linked to this entry")
    is_billable = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'timesheet_entries'
        ordering = ['date', 'created_at']
        indexes = [
            models.Index(fields=['member', 'date']),
        ]

    def __str__(self):
        return f"{self.member.first_name} - {self.date} ({self.hours}h)"
