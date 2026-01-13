from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import *
from .serializers import *

# ... (rest of the file until TaskCommentsViewSet)



class ActivityLogsViewSet(viewsets.ModelViewSet):
    queryset = ActivityLogs.objects.all()
    serializer_class = ActivityLogsSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = '__all__'
    search_fields = '__all__'
    ordering_fields = '__all__'

class ChangelogViewSet(viewsets.ModelViewSet):
    queryset = Changelog.objects.all()
    serializer_class = ChangelogSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = '__all__'
    search_fields = '__all__'
    ordering_fields = '__all__'

class DocumentPermissionsViewSet(viewsets.ModelViewSet):
    queryset = DocumentPermissions.objects.all()
    serializer_class = DocumentPermissionsSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = '__all__'
    search_fields = '__all__'
    ordering_fields = '__all__'

class DocumentVersionsViewSet(viewsets.ModelViewSet):
    queryset = DocumentVersions.objects.all()
    serializer_class = DocumentVersionsSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = '__all__'
    search_fields = '__all__'
    ordering_fields = '__all__'

class MembersViewSet(viewsets.ModelViewSet):
    queryset = Members.objects.all()
    serializer_class = MembersSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = '__all__'
    search_fields = '__all__'
    ordering_fields = '__all__'

class PermissionsViewSet(viewsets.ModelViewSet):
    queryset = Permissions.objects.all()
    serializer_class = PermissionsSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = '__all__'
    search_fields = '__all__'
    ordering_fields = '__all__'

class ProjectDocumentsViewSet(viewsets.ModelViewSet):
    queryset = ProjectDocuments.objects.all()
    serializer_class = ProjectDocumentsSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = '__all__'
    search_fields = '__all__'
    ordering_fields = '__all__'

class ProjectMembersViewSet(viewsets.ModelViewSet):
    queryset = ProjectMembers.objects.all()
    serializer_class = ProjectMembersSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = '__all__'
    search_fields = '__all__'
    ordering_fields = '__all__'

from tags.models import EntityTags

class ProjectsViewSet(viewsets.ModelViewSet):
    queryset = Projects.objects.all()
    serializer_class = ProjectsSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = '__all__'
    search_fields = '__all__'
    ordering_fields = '__all__'

    def get_queryset(self):
        queryset = super().get_queryset()
        tags_param = self.request.query_params.get('tags')
        if tags_param:
            tag_ids = [t.strip() for t in tags_param.split(',') if t.strip()]
            for tag_id in tag_ids:
                matches = EntityTags.objects.filter(
                    entity_type='project',
                    tag_id=tag_id
                ).values_list('entity_id', flat=True)
                queryset = queryset.filter(project_id__in=matches)
        
        member_id = self.request.query_params.get('member_id')
        if member_id:
            # Filter projects where member is a participant
            queryset = queryset.filter(project_members_project_id__member_id=member_id).distinct()
            
        return queryset

class RolePermissionsViewSet(viewsets.ModelViewSet):
    queryset = RolePermissions.objects.all()
    serializer_class = RolePermissionsSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = '__all__'
    search_fields = '__all__'
    ordering_fields = '__all__'

class RolesViewSet(viewsets.ModelViewSet):
    queryset = Roles.objects.all()
    serializer_class = RolesSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = '__all__'
    search_fields = '__all__'
    ordering_fields = '__all__'

class SprintTasksViewSet(viewsets.ModelViewSet):
    queryset = SprintTasks.objects.all()
    serializer_class = SprintTasksSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = '__all__'
    search_fields = '__all__'
    ordering_fields = '__all__'

class SprintsViewSet(viewsets.ModelViewSet):
    queryset = Sprints.objects.all()
    serializer_class = SprintsSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = '__all__'
    search_fields = '__all__'
    ordering_fields = '__all__'

class TaskAssigneesViewSet(viewsets.ModelViewSet):
    queryset = TaskAssignees.objects.all()
    serializer_class = TaskAssigneesSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = '__all__'
    search_fields = '__all__'
    ordering_fields = '__all__'

class TaskAttachmentsViewSet(viewsets.ModelViewSet):
    queryset = TaskAttachments.objects.all()
    serializer_class = TaskAttachmentsSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = '__all__'
    search_fields = '__all__'
    ordering_fields = '__all__'

class TaskCommentsViewSet(viewsets.ModelViewSet):
    queryset = TaskComments.objects.all()
    serializer_class = TaskCommentsSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = '__all__'
    search_fields = '__all__'
    ordering_fields = '__all__'

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        try:
            comment = self.get_object()
            member_id = request.data.get('member_id')
            # print(f"DEBUG: Like Request - Comment: {comment}, Member: {member_id}")
            
            if not member_id:
                return Response({'error': 'member_id required'}, status=status.HTTP_400_BAD_REQUEST)
                
            # Use get_or_create logic manually or via model
            # Assuming TaskCommentLikes model exists (it does)
            from .models import TaskCommentLikes
            
            # Check if already liked
            existing = TaskCommentLikes.objects.filter(task_comment_id=comment, member_id=member_id).first()
            if existing:
                existing.delete()
                # Update count
                comment.likes_count = max(0, comment.likes_count - 1) # Prevent negative
                comment.save()
                return Response({'status': 'unliked'}, status=status.HTTP_200_OK)
            else:
                TaskCommentLikes.objects.create(task_comment_id=comment, member_id_id=member_id)
                comment.likes_count += 1
                comment.save()
                return Response({'status': 'liked'}, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Like Error: {e}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        member_id = request.data.get('member_id') or request.query_params.get('member_id')
        
        # Enforce strict ownership if member_id is provided or generally
        # We'll strict enforce: Validation requires member_id matching the comment owner
        
        # Note: instance.member_id might be None if system comment? (Assuming not for now)
        if instance.member_id and str(instance.member_id.member_id) != str(member_id):
             return Response({"error": "You are not authorized to delete this comment"}, status=status.HTTP_403_FORBIDDEN)
             
        return super().destroy(request, *args, **kwargs)

class TaskHistoryViewSet(viewsets.ModelViewSet):
    queryset = TaskHistory.objects.all()
    serializer_class = TaskHistorySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = '__all__'
    search_fields = '__all__'
    ordering_fields = '__all__'

class TaskLabelMapViewSet(viewsets.ModelViewSet):
    queryset = TaskLabelMap.objects.all()
    serializer_class = TaskLabelMapSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = '__all__'
    search_fields = '__all__'
    ordering_fields = '__all__'

class TaskLabelsViewSet(viewsets.ModelViewSet):
    queryset = TaskLabels.objects.all()
    serializer_class = TaskLabelsSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = '__all__'
    search_fields = '__all__'
    ordering_fields = '__all__'

class TaskPrioritiesViewSet(viewsets.ModelViewSet):
    queryset = TaskPriorities.objects.all()
    serializer_class = TaskPrioritiesSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = '__all__'
    search_fields = '__all__'
    ordering_fields = '__all__'

class TaskStatusesViewSet(viewsets.ModelViewSet):
    queryset = TaskStatuses.objects.all()
    serializer_class = TaskStatusesSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = '__all__'
    search_fields = '__all__'
    ordering_fields = '__all__'

    def destroy(self, request, *args, **kwargs):
        status_obj = self.get_object()
        
        # 1. Prevent deleting Default status
        if status_obj.is_default == 1:
            return Response(
                {"error": "Cannot delete the Default status. Please set another status as default first."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Check for assigned tasks
        from pm.models import Tasks
        assigned_tasks_count = Tasks.objects.filter(status_id=status_obj).count()
        
        if assigned_tasks_count > 0:
            transfer_to_id = request.query_params.get('transfer_to')
            
            if transfer_to_id:
                # User confirmed transfer
                try:
                    target_status = TaskStatuses.objects.get(task_status_id=transfer_to_id)
                    Tasks.objects.filter(status_id=status_obj).update(status_id=target_status)
                    return super().destroy(request, *args, **kwargs)
                except TaskStatuses.DoesNotExist:
                     return Response({"error": "Target status not found."}, status=status.HTTP_400_BAD_REQUEST)
            else:
                # 3. Suggest Prior Status
                # Find status with lower sort_order (closest one)
                prior_status = TaskStatuses.objects.filter(
                    sort_order__lte=status_obj.sort_order
                ).exclude(task_status_id=status_obj.task_status_id).order_by('-sort_order').first()
                
                # If no prior, try next
                if not prior_status:
                     prior_status = TaskStatuses.objects.filter(
                        sort_order__gte=status_obj.sort_order
                    ).exclude(task_status_id=status_obj.task_status_id).order_by('sort_order').first()

                # Get all other statuses for dropdown
                all_statuses = TaskStatuses.objects.exclude(task_status_id=status_obj.task_status_id).values('task_status_id', 'name')
                
                return Response({
                    "error": "This status has assigned tasks.",
                    "code": "TASKS_ASSIGNED",
                    "count": assigned_tasks_count,
                    "suggested_id": prior_status.task_status_id if prior_status else None,
                    "suggested_name": prior_status.name if prior_status else None,
                    "all_statuses": list(all_statuses)
                }, status=status.HTTP_409_CONFLICT)
        
        # No tasks, safe to delete
        try:
            return super().destroy(request, *args, **kwargs)
        except Exception as e:
            if "protected" in str(e).lower() or "foreign key constraint" in str(e).lower():
                 return Response(
                    {"error": "Cannot delete this status because it is referenced by other records (not tasks)."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            raise e

from rest_framework.pagination import PageNumberPagination

class TaskPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class TasksViewSet(viewsets.ModelViewSet):
    queryset = Tasks.objects.all()
    serializer_class = TasksSerializer
    pagination_class = TaskPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status_id', 'priority_id', 'project_id']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'due_date', 'title']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = Tasks.objects.select_related(
            'status_id', 'priority_id', 'project_id'
        ).prefetch_related(
            'task_assignees_task_id__member_id'
        )
        
        tags_param = self.request.query_params.get('tags')
        if tags_param:
            tag_ids = [t.strip() for t in tags_param.split(',') if t.strip()]
            for tag_id in tag_ids:
                matches = EntityTags.objects.filter(
                    entity_type='task',
                    tag_id=tag_id
                ).values_list('entity_id', flat=True)
                queryset = queryset.filter(task_id__in=matches)

        member_id_param = self.request.query_params.get('member_id')
        if member_id_param:
            queryset = queryset.filter(task_assignees_task_id__member_id=member_id_param).distinct()

        return queryset
    def perform_update(self, serializer):
        instance = serializer.instance
        new_status = serializer.validated_data.get('status_id')
        
        if new_status and instance.status_id != new_status:
            old_status = instance.status_id
            
            # Strict Workflow Rule: Cannot skip steps
            # Allowed: 
            # 1. Moving to next immediate step (old + 1)
            # 2. Moving backwards (new <= old)
            
            # Check Workflow Transitions first (Explicit overrides)
            transitions = WorkflowTransitions.objects.filter(from_status_id=old_status)
            explicit_allow = False
            if transitions.exists():
                explicit_allow = transitions.filter(to_status_id=new_status).exists()
            
            if not explicit_allow:
                # Default Rule
                if old_status and new_status.sort_order > old_status.sort_order + 1:
                    from rest_framework.exceptions import ValidationError
                    
                    # Fetch neighbor status names for better error message
                    next_status = TaskStatuses.objects.filter(sort_order=old_status.sort_order + 1).first()
                    prev_status = TaskStatuses.objects.filter(sort_order=old_status.sort_order - 1).first()
                    
                    next_name = next_status.name if next_status else "Next Stage"
                    prev_name = prev_status.name if prev_status else "Previous Stage"
                    
                    raise ValidationError(
                        f"Invalid transition. You can only move to '{next_name}' or '{prev_name}' (or earlier)."
                    )
        
        # Capture old status details before save
        old_status = instance.status_id
        
        obj = serializer.save()

        # Log Status Change
        if new_status and old_status != new_status:
            try:
                # Try to get actor from request
                actor_id = self.request.data.get('modified_by') or self.request.data.get('member_id')
                if actor_id:
                    ActivityLogs.objects.create(
                        project_id=obj.project_id,
                        member_id_id=actor_id,
                        verb='status_changed',
                        subject_type='task',
                        subject_id=obj.task_id,
                        data={
                            'old_status': str(old_status.task_status_id) if old_status else None,
                            'new_status': str(new_status.task_status_id),
                            'new_status_name': new_status.name
                        }
                    )
                    
                    # 🎮 Emit Signal for Gamification
                    from pm.signals import task_status_changed
                    from pm.models import Members
                    
                    # Fetch Actor Object
                    actor_obj = Members.objects.get(member_id=actor_id)
                    
                    task_status_changed.send(
                        sender=instance.__class__,
                        instance=obj,
                        old_status=old_status,
                        new_status=new_status,
                        actor=actor_obj
                    )
                    
            except Exception as e:
                print(f"Error logging activity or gamification: {e}")

class TeamMembersViewSet(viewsets.ModelViewSet):
    queryset = TeamMembers.objects.all()
    serializer_class = TeamMembersSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = '__all__'
    search_fields = '__all__'
    ordering_fields = '__all__'

class TeamsViewSet(viewsets.ModelViewSet):
    queryset = Teams.objects.all()
    serializer_class = TeamsSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = '__all__'
    search_fields = '__all__'
    ordering_fields = '__all__'

class WorkflowTransitionsViewSet(viewsets.ModelViewSet):
    queryset = WorkflowTransitions.objects.all()
    serializer_class = WorkflowTransitionsSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = '__all__'
    search_fields = '__all__'
    ordering_fields = '__all__'


class IterationsViewSet(viewsets.ModelViewSet):
    queryset = Iterations.objects.all()
    serializer_class = IterationsSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'is_current']
    search_fields = ['name', 'description', 'goal']
    ordering_fields = ['start_date', 'end_date', 'name', 'created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        # Filter by date range if provided
        start_after = self.request.query_params.get('start_after')
        if start_after:
            queryset = queryset.filter(start_date__gte=start_after)
        return queryset


class IterationTasksViewSet(viewsets.ModelViewSet):
    queryset = IterationTasks.objects.all()
    serializer_class = IterationTasksSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['iteration', 'task']
    ordering_fields = ['priority_points', 'added_at']

    def get_queryset(self):
        queryset = super().get_queryset().select_related('task', 'task__project_id', 'task__status_id', 'task__priority_id')
        # Filter by iteration_id from URL
        iteration_id = self.request.query_params.get('iteration_id')
        if iteration_id:
            queryset = queryset.filter(iteration_id=iteration_id)
        return queryset


class DailyStandupViewSet(viewsets.ModelViewSet):
    queryset = DailyStandup.objects.all()
    serializer_class = DailyStandupSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['member', 'date']
    ordering_fields = ['date', 'created_at']

    def get_queryset(self):
        queryset = super().get_queryset().prefetch_related('items', 'items__task', 'items__project')
        # Filter by date range if needed
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
            
        return queryset


from rest_framework.views import APIView

class PermissionResourcesView(APIView):
    """
    API to get all permission resources grouped by category.
    Used by Permission Matrix to render the new CRUD-based layout.
    """
    def get(self, request):
        from reporting.models import ReportDefinition
        from masters.models import DynamicMaster
        
        categories = []
        
        # 1. Menu Access - static permissions
        menu_resources = [
            {'id': 'settings', 'name': 'Settings', 'permission_prefix': 'view_menu_settings', 'actions': ['view']},
            {'id': 'hr', 'name': 'HR Module', 'permission_prefix': 'view_menu_hr', 'actions': ['view']},
            {'id': 'pm', 'name': 'PM Module', 'permission_prefix': 'view_menu_pm', 'actions': ['view']},
            {'id': 'reporting', 'name': 'Reporting', 'permission_prefix': 'view_menu_reporting', 'actions': ['view']},
            {'id': 'masters', 'name': 'Masters', 'permission_prefix': 'view_menu_masters', 'actions': ['view']},
        ]
        categories.append({
            'name': 'Menu Access',
            'icon': '🧭',
            'resources': menu_resources
        })
        
        # 2. Core Modules - static CRUD permissions
        core_resources = [
            {'id': 'project', 'name': 'Projects', 'permission_prefix': 'project', 'actions': ['view', 'add', 'edit', 'delete']},
            {'id': 'tasks', 'name': 'Tasks', 'permission_prefix': 'task', 'actions': ['view', 'add', 'edit', 'delete']},
            {'id': 'users', 'name': 'Users', 'permission_prefix': 'users', 'actions': ['view', 'add', 'edit', 'delete']},
            {'id': 'permissions', 'name': 'Permissions', 'permission_prefix': 'permissions', 'actions': ['view', 'add', 'edit', 'delete']},
            {'id': 'roles', 'name': 'Roles', 'permission_prefix': 'roles', 'actions': ['view', 'add', 'edit', 'delete']},
        ]
        categories.append({
            'name': 'Core Modules',
            'icon': '📁',
            'resources': core_resources
        })
        
        # 3. Dynamic Reports - from database
        report_resources = []
        for report in ReportDefinition.objects.all().order_by('name'):
            report_resources.append({
                'id': str(report.report_id),
                'name': report.name,
                'permission_prefix': f'report_{report.report_id}',
                'actions': ['view', 'edit', 'delete']
            })
        categories.append({
            'name': 'Reports',
            'icon': '📊',
            'resources': report_resources
        })
        
        # 4. Dynamic Masters - from database
        master_resources = []
        for master in DynamicMaster.objects.filter(is_active=True).order_by('display_name'):
            master_resources.append({
                'id': master.name,
                'name': master.display_name,
                'permission_prefix': f'master_{master.name}',
                'actions': ['view', 'add', 'edit', 'delete']
            })
        categories.append({
            'name': 'Masters',
            'icon': '📋',
            'resources': master_resources
        })
        
        return Response({'categories': categories})
