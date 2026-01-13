from rest_framework import serializers
from django.utils import timezone
from .models import *
from tags.models import EntityTags
from tags.serializers import TagsListSerializer

class ActivityLogsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLogs
        fields = '__all__'

class ChangelogSerializer(serializers.ModelSerializer):
    class Meta:
        model = Changelog
        fields = '__all__'

class DocumentPermissionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentPermissions
        fields = '__all__'

class DocumentVersionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentVersions
        fields = '__all__'

class MembersSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()
    user_username = serializers.SerializerMethodField()

    class Meta:
        model = Members
        fields = '__all__'

    def get_user_username(self, obj):
        """Return the linked User's username if exists"""
        if obj.user:
            return obj.user.username
        return None

    def get_permissions(self, obj):
        # Flatten permissions from the assigned Global Role
        if not obj.role_id:
            return []
        
        # Optimized lookup: fetching names directly
        # Relationship: role_id (Roles) -> RolePermissions (has role_id) -> permission_id (Permissions)
        return list(RolePermissions.objects.filter(role_id=obj.role_id).values_list('permission_id__name', flat=True))


class PermissionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permissions
        fields = '__all__'

class ProjectDocumentsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectDocuments
        fields = '__all__'

class ProjectMembersSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectMembers
        fields = '__all__'

class ProjectsSerializer(serializers.ModelSerializer):
    tags = serializers.SerializerMethodField()
    tag_ids = serializers.ListField(child=serializers.UUIDField(), write_only=True, required=False)
    
    # Dynamic Master Details
    client_type_details = serializers.SerializerMethodField()
    project_category_details = serializers.SerializerMethodField()

    class Meta:
        model = Projects
        fields = '__all__'

    def get_client_type_details(self, obj):
        return obj.client_type.data if obj.client_type else None

    def get_project_category_details(self, obj):
        return obj.project_category.data if obj.project_category else None

    def get_tags(self, obj):
        mappings = EntityTags.objects.filter(entity_type='project', entity_id=str(obj.project_id)).select_related('tag', 'tag__category')
        tags = [m.tag for m in mappings]
        return TagsListSerializer(tags, many=True).data

    def create(self, validated_data):
        tag_ids = validated_data.pop('tag_ids', None)
        instance = super().create(validated_data)
        if tag_ids is not None:
            self._save_tags(instance, tag_ids)
        return instance

    def update(self, instance, validated_data):
        tag_ids = validated_data.pop('tag_ids', None)
        instance = super().update(instance, validated_data)
        if tag_ids is not None:
            self._save_tags(instance, tag_ids)
        return instance

    def _save_tags(self, instance, tag_ids):
        entity_id = str(instance.project_id)
        EntityTags.objects.filter(entity_type='project', entity_id=entity_id).delete()
        new_tags = [EntityTags(tag_id=tid, entity_type='project', entity_id=entity_id) for tid in tag_ids]
        EntityTags.objects.bulk_create(new_tags)

class RolePermissionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = RolePermissions
        fields = '__all__'

class RolesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Roles
        fields = '__all__'

class SprintTasksSerializer(serializers.ModelSerializer):
    class Meta:
        model = SprintTasks
        fields = '__all__'

class SprintsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sprints
        fields = '__all__'

class TaskAssigneesSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskAssignees
        fields = '__all__'

class TaskAttachmentsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskAttachments
        fields = '__all__'

class TaskCommentsSerializer(serializers.ModelSerializer):
    attachments = TaskAttachmentsSerializer(many=True, read_only=True)
    likes_count = serializers.SerializerMethodField()
    liked_by = serializers.SerializerMethodField()

    class Meta:
        model = TaskComments
        fields = '__all__'

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_liked_by(self, obj):
        return obj.likes.values_list('member_id', flat=True)

class TaskHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskHistory
        fields = '__all__'

class TaskLabelMapSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskLabelMap
        fields = '__all__'

class TaskLabelsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskLabels
        fields = '__all__'

class TaskPrioritiesSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskPriorities
        fields = '__all__'

class TaskStatusesSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskStatuses
        fields = '__all__'

class TasksSerializer(serializers.ModelSerializer):
    tags = serializers.SerializerMethodField()
    tag_ids = serializers.ListField(child=serializers.UUIDField(), write_only=True, required=False)
    
    # Alias estimate_hours to match frontend 'estimated_hours'
    estimated_hours = serializers.FloatField(source='estimate_hours', required=False)
    
    # Handle assigned_to manually as it relates to TaskAssignees model
    assigned_to = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    assignee_name = serializers.SerializerMethodField()
    
    # Read-only computed fields
    status_name = serializers.CharField(source='status_id.name', read_only=True)
    project_name = serializers.CharField(source='project_id.name', read_only=True)

    class Meta:
        model = Tasks
        fields = '__all__'
        extra_kwargs = {
            'estimate_hours': {'write_only': True}
        }

    def get_tags(self, obj):
        # For list views, skip tags to improve performance (fetch individually on detail)
        request = self.context.get('request')
        if request and request.method == 'GET' and hasattr(request, 'query_params'):
            # Check if this is a list request (no pk in URL)
            if 'pk' not in getattr(request, 'parser_context', {}).get('kwargs', {}):
                return []  # Skip tags in list view for performance
        
        mappings = EntityTags.objects.filter(entity_type='task', entity_id=str(obj.task_id)).select_related('tag', 'tag__category')
        tags = [m.tag for m in mappings]
        return TagsListSerializer(tags, many=True).data

    def get_assignee_name(self, obj):
        # Use prefetched data if available (from viewset prefetch_related)
        assignees = getattr(obj, 'task_assignees_task_id', None)
        if assignees is not None:
            # Prefetched - use it
            all_assignees = list(assignees.all())
            if all_assignees:
                # Sort by assigned_at desc and take first
                all_assignees.sort(key=lambda x: x.assigned_at or timezone.now(), reverse=True)
                member = all_assignees[0].member_id
                if member:
                    return f"{member.first_name} {member.last_name}"
        return None

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Use prefetched assignees if available
        assignees = getattr(instance, 'task_assignees_task_id', None)
        if assignees is not None:
            all_assignees = list(assignees.all())
            if all_assignees:
                all_assignees.sort(key=lambda x: x.assigned_at or timezone.now(), reverse=True)
                member = all_assignees[0].member_id
                ret['assigned_to'] = member.member_id if member else None
            else:
                ret['assigned_to'] = None
        else:
            # Fallback for non-prefetched queries (single detail view)
            assignee = TaskAssignees.objects.filter(task_id=instance.task_id).order_by('-assigned_at').first()
            ret['assigned_to'] = assignee.member_id.member_id if assignee and assignee.member_id else None
        return ret

    def create(self, validated_data):
        tag_ids = validated_data.pop('tag_ids', None)
        assigned_to_id = validated_data.pop('assigned_to', None)
        
        instance = super().create(validated_data)
        
        if tag_ids is not None:
            self._save_tags(instance, tag_ids)
            
        if assigned_to_id:
            self._update_assignee(instance, assigned_to_id)
            
        return instance

    def update(self, instance, validated_data):
        tag_ids = validated_data.pop('tag_ids', None)
        assigned_to_id = validated_data.pop('assigned_to', None)
        
        instance = super().update(instance, validated_data)
        
        if tag_ids is not None:
            self._save_tags(instance, tag_ids)
            
        if assigned_to_id is not None: # Check for None to allow clearing? Or just if present in payload?
             # Payload has 'assigned_to'. If null, we should clear?
             # TaskForm sends null if unassigned.
             self._update_assignee(instance, assigned_to_id)
            
        return instance

    def _save_tags(self, instance, tag_ids):
        entity_id = str(instance.task_id)
        EntityTags.objects.filter(entity_type='task', entity_id=entity_id).delete()
        new_tags = [EntityTags(tag_id=tid, entity_type='task', entity_id=entity_id) for tid in tag_ids]
        EntityTags.objects.bulk_create(new_tags)

    def _update_assignee(self, instance, member_id):
        # Enforce single assignee logic for now (clear others)
        # and use get_or_create to prevent IntegrityError if re-assigning same person
        
        if member_id:
            # 1. Remove other assignees if any (enforcing single assignee)
            TaskAssignees.objects.filter(task_id=instance).exclude(member_id_id=member_id).delete()
            
            # 2. Get or Create the new assignment
            # We use update_or_create to ensure we update the timestamp if it already exists, 
            # or creates it if not.
            TaskAssignees.objects.update_or_create(
                task_id=instance, 
                member_id_id=member_id,
                defaults={'assigned_at': timezone.now()}
            )
        else:
            # If explicit None/Null passed, clear all assignees
            TaskAssignees.objects.filter(task_id=instance).delete()

class TeamMembersSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamMembers
        fields = '__all__'

class TeamsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Teams
        fields = '__all__'

class WorkflowTransitionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowTransitions
        fields = '__all__'


class IterationsSerializer(serializers.ModelSerializer):
    task_count = serializers.SerializerMethodField()
    total_points = serializers.SerializerMethodField()

    class Meta:
        model = Iterations
        fields = '__all__'

    def get_task_count(self, obj):
        return obj.iteration_tasks.count()

    def get_total_points(self, obj):
        return sum(it.priority_points for it in obj.iteration_tasks.all())


class IterationTasksSerializer(serializers.ModelSerializer):
    task_details = serializers.SerializerMethodField()
    project_details = serializers.SerializerMethodField()

    class Meta:
        model = IterationTasks
        fields = '__all__'

    def get_task_details(self, obj):
        task = obj.task
        if not task:
            return None
        return {
            'task_id': str(task.task_id),
            'title': task.title,
            'description': task.description,
            'status_id': str(task.status_id.task_status_id) if task.status_id else None,
            'status_name': task.status_id.name if task.status_id else None,
            'priority_id': str(task.priority_id.task_priority_id) if task.priority_id else None,
            'priority_name': task.priority_id.name if task.priority_id else None,
            'priority_color': task.priority_id.color if task.priority_id else None,
            'assigned_to': self._get_assignee(task),
        }

    def _get_assignee(self, task):
        # Fetch the first assignee (UI currently supports single assignee focus on card)
        # We need to import TaskAssignees here or get it from related manager if defined
        # Based on models.py: task_id = ForeignKey(Tasks, related_name='task_assignees_task_id')
        assignee_record = task.task_assignees_task_id.first()
        if assignee_record and assignee_record.member_id:
            member = assignee_record.member_id
            full_name = f"{member.first_name or ''} {member.last_name or ''}".strip()
            initials = "".join([n[0] for n in full_name.split()[:2]]).upper() if full_name else "??"
            return {
                'id': str(member.member_id),
                'name': full_name,
                'avatar': member.avatar if hasattr(member, 'avatar') else None, # Check if avatar exists
                'initials': initials
            }
        return None

    def get_project_details(self, obj):
        if not obj.task:
            return None
        project = obj.task.project_id
        if project:
            return {
                'project_id': str(project.project_id),
                'name': project.name,
            }
        return None


class StandupItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = StandupItem
        fields = '__all__'
        read_only_fields = ['standup']

class DailyStandupSerializer(serializers.ModelSerializer):
    items = StandupItemSerializer(many=True)

    class Meta:
        model = DailyStandup
        fields = ['standup_id', 'member', 'date', 'created_at', 'updated_at', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        # Ensure we don't have duplicate standups for same member/date
        standup, created = DailyStandup.objects.get_or_create(
            member=validated_data['member'],
            date=validated_data['date'],
            defaults=validated_data
        )
        
        # If updating existing standup via create (idempotency), clear old items?
        # Or just append? Standard approach for "update" usually PUT.
        # But here we treat "submission" as fresh or overwrite. 
        # Let's clear old items to be safe if it existed (re-submission).
        if not created:
            standup.items.all().delete()

        for item_data in items_data:
            StandupItem.objects.create(standup=standup, **item_data)
            
        return standup

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', [])
        
        # Update main fields
        instance.date = validated_data.get('date', instance.date)
        instance.member = validated_data.get('member', instance.member)
        instance.save()
        
        # Replace items strategy
        instance.items.all().delete()
        for item_data in items_data:
            StandupItem.objects.create(standup=instance, **item_data)
            
        return instance
