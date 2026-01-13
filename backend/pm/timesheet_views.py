import logging
import datetime
from django.db.models import Sum, Q
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import TimesheetEntry, Members, Projects, Tasks
from github.models import Commit, PullRequest

# Simple serializer for now, ideally in pm/serializers.py
from rest_framework import serializers

class TimesheetEntrySerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    
    class Meta:
        model = TimesheetEntry
        fields = '__all__'

logger = logging.getLogger(__name__)

class TimesheetViewSet(viewsets.ModelViewSet):
    queryset = TimesheetEntry.objects.all()
    serializer_class = TimesheetEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Standard queryset + filtering by date range"""
        qs = super().get_queryset()
        
        # Default to current user's entries
        if hasattr(self.request.user, 'member'):
            qs = qs.filter(member=self.request.user.member)
            
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
            
        return qs.select_related('project', 'task')

    def perform_create(self, serializer):
        if hasattr(self.request.user, 'member'):
            serializer.save(member=self.request.user.member)
        else:
            # Fallback for dev/testing if user has no member linked
            # In production this should error out
            if Members.objects.exists():
                serializer.save(member=Members.objects.first())
            else:
                serializer.save()

    @action(detail=False, methods=['get'])
    def weekly_grid(self, request):
        """
        Get timesheet data structured for the weekly grid UI.
        Returns: {
           rows: [
             { key: 'proj_X_task_Y', project_id: X, task_id: Y, task_title: '...', entries: { '2025-01-01': 4.0, ... } }
           ],
           total_hours: { '2025-01-01': 8.0 }
        }
        """
        qs = self.get_queryset()
        
        # Structure data
        grid_rows = {}
        daily_totals = {}
        
        for entry in qs:
            key = f"proj_{entry.project_id}_task_{entry.task_id}"
            date_str = entry.date.isoformat()
            
            if key not in grid_rows:
                grid_rows[key] = {
                    'project_id': entry.project_id,
                    'project_name': entry.project.name if entry.project else 'General',
                    'task_id': entry.task_id,
                    'task_title': entry.task.title if entry.task else 'General Task',
                    'entries': {}
                }
            
            # If multiple entries for same task/day, sum them
            current_hours = grid_rows[key]['entries'].get(date_str, {'hours': 0, 'ids': []})
            current_hours['hours'] += entry.hours
            if isinstance(current_hours, dict) and 'ids' in current_hours: # Safety check
                 current_hours['ids'].append(entry.timesheet_id)
            else:
                 # Initialize correctly if it was just a float before (legacy check)
                 current_hours = {'hours': entry.hours, 'ids': [entry.timesheet_id]}

            # Store full entry details for the cell
            # In a real grid we might want specific entry IDs to editing them
            # For simplicity, we send the aggregated hours and list of IDs
            grid_rows[key]['entries'][date_str] = {
                'hours': current_hours['hours'],
                'ids': current_hours['ids'],
                'description': entry.description # Note: last one wins for description preview
            }
            
            daily_totals[date_str] = daily_totals.get(date_str, 0) + entry.hours
            
        return Response({
            'rows': list(grid_rows.values()),
            'daily_totals': daily_totals
        })

    @action(detail=False, methods=['get'])
    def team_grid(self, request):
        """
        Get timesheet data for a specific team member (manager view).
        Requires 'view_team_timesheets' permission.
        Params: member_id (required), start_date, end_date
        """
        from .models import Permissions, RolePermissions
        
        # Check permission
        user = request.user
        has_permission = False
        
        if hasattr(user, 'member') and user.member.role_id:
            # Check if user's role has view_team_timesheets permission
            perm = Permissions.objects.filter(name='view_team_timesheets').first()
            if perm:
                has_permission = RolePermissions.objects.filter(
                    role_id=user.member.role_id,
                    permission_id=perm
                ).exists()
        
        # Also allow superusers
        if user.is_superuser:
            has_permission = True
            
        if not has_permission:
            return Response({'error': 'Permission denied'}, status=403)
        
        # Get member_id parameter
        member_id = request.query_params.get('member_id')
        if not member_id:
            return Response({'error': 'member_id parameter is required'}, status=400)
        
        try:
            target_member = Members.objects.get(member_id=member_id)
        except Members.DoesNotExist:
            return Response({'error': 'Member not found'}, status=404)
        
        # Filter entries for the specified member
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        qs = TimesheetEntry.objects.filter(member=target_member)
        
        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
            
        qs = qs.select_related('project', 'task')
        
        # Structure data (same as weekly_grid)
        grid_rows = {}
        daily_totals = {}
        
        for entry in qs:
            key = f"proj_{entry.project_id}_task_{entry.task_id}"
            date_str = entry.date.isoformat()
            
            if key not in grid_rows:
                grid_rows[key] = {
                    'project_id': entry.project_id,
                    'project_name': entry.project.name if entry.project else 'General',
                    'task_id': entry.task_id,
                    'task_title': entry.task.title if entry.task else 'General Task',
                    'entries': {}
                }
            
            current_hours = grid_rows[key]['entries'].get(date_str, {'hours': 0, 'ids': []})
            current_hours['hours'] += entry.hours
            if isinstance(current_hours, dict) and 'ids' in current_hours:
                current_hours['ids'].append(entry.timesheet_id)
            else:
                current_hours = {'hours': entry.hours, 'ids': [entry.timesheet_id]}

            grid_rows[key]['entries'][date_str] = {
                'hours': current_hours['hours'],
                'ids': current_hours['ids'],
                'description': entry.description
            }
            
            daily_totals[date_str] = daily_totals.get(date_str, 0) + entry.hours
            
        return Response({
            'member': {
                'member_id': str(target_member.member_id),
                'first_name': target_member.first_name,
                'last_name': target_member.last_name
            },
            'rows': list(grid_rows.values()),
            'daily_totals': daily_totals
        })

    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """
        Receive a grid update: list of { date, project_id, task_id, hours, description? }
        Update or create entries.
        """
        updates = request.data.get('updates', [])
        member = request.user.member if hasattr(request.user, 'member') else Members.objects.first()
        
        results = []
        for update in updates:
            date = update.get('date')
            project_id = update.get('project_id')
            task_id = update.get('task_id')
            hours = float(update.get('hours', 0))
            
            # Find existing entry or create
            # Logic: If hours > 0, ensure entry exists. If 0, delete.
            # Simplified: One entry per task/day for now (though model allows multiple)
            
            criteria = {
                'member': member,
                'date': date,
                'project_id': project_id,
                'task_id': task_id
            }
            
            entry = TimesheetEntry.objects.filter(**criteria).first()
            
            if hours <= 0:
                if entry:
                    entry.delete()
                    results.append({'status': 'deleted', 'date': date})
            else:
                if entry:
                    entry.hours = hours
                    if 'description' in update:
                        entry.description = update['description']
                    entry.save()
                    results.append({'status': 'updated', 'id': entry.timesheet_id})
                else:
                    entry = TimesheetEntry.objects.create(
                        **criteria,
                        hours=hours,
                        description=update.get('description', '')
                    )
                    results.append({'status': 'created', 'id': entry.timesheet_id})
                    
        return Response({'results': results})

    @action(detail=False, methods=['get'])
    def suggestions(self, request):
        """
        Auto-fill suggestions based on GitHub activity for a date range.
        Params: start_date, end_date
        """
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        if not start_date_str or not end_date_str:
            return Response({'error': 'start_date and end_date required'}, status=400)
            
        # 1. Identify GitHub Author
        # Ideally Member model has a 'github_username' field. 
        # For now, we try to match by email or fallback to 'github_username' field on Member if it existed
        member = request.user.member if hasattr(request.user, 'member') else Members.objects.first()
        
        # Simple heuristic: Match Member email to Commit author_email
        # Or check if Member has a linked GitHub account (future)
        
        github_emails = [member.email] if member.email else []
        # Add common variations or other known emails if needed
        
        # Find commits
        commits = Commit.objects.filter(
            committed_at__date__gte=start_date_str,
            committed_at__date__lte=end_date_str
        ).filter(
            # Match by email (exact) OR fuzzy name match (simple)
            # For MVP, let's assume one main user or strict email match
            Q(author_email__in=github_emails) | 
            Q(author_login__iexact=member.first_name) # Very rough guess
        )

        suggestions = []
        
        # Group by Date and Repository
        grouped = {}
        
        for commit in commits:
            date_str = commit.committed_at.date().isoformat()
            repo_name = commit.repository.name
            
            key = f"{date_str}_{repo_name}"
            
            if key not in grouped:
                # Priority 1: Direct Link (The new trusty way)
                if commit.repository.project:
                    project = commit.repository.project
                else:
                    # Priority 2: Fuzzy Heuristics (Fallback)
                    # Heuristic 1: Exact/Slug match
                    project = Projects.objects.filter(
                        Q(slug__iexact=repo_name) | Q(name__iexact=repo_name)
                    ).first()
                    
                    # Heuristic 2: Contains match (risky but better than nothing for auto-fill)
                    if not project:
                         # Try to match start of string, e.g. "NSK" in "NSKRetail"
                         # specific for nskjewels.com -> NSK...
                         search_term = repo_name.split('.')[0].split('-')[0]
                         project = Projects.objects.filter(name__icontains=search_term).first()
                
                grouped[key] = {
                    'date': date_str,
                    'repository': repo_name,
                    'project_id': project.project_id if project else None,
                    'project_name': project.name if project else f"Repo: {repo_name} (Select Project)",
                    'commits': [],
                    'messages': []
                }
            
            grouped[key]['commits'].append(commit.sha)
            grouped[key]['messages'].append(commit.message.split('\n')[0])
            
        # Format suggestions
        for item in grouped.values():
            suggestions.append({
                'date': item['date'],
                'project_id': item['project_id'],
                'suggested_project': item['project_name'] or f"GitHub: {item['repository']}",
                'task_id': None, # Difficult to guess task without explicit linking
                'hours': 2.0, # Default suggestion
                'description': f"Commits: {'; '.join(item['messages'][:3])}",
                'github_refs': item['commits']
            })
            
        return Response(suggestions)
