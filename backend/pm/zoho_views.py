import requests
import json
from datetime import datetime
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .zoho_models import ZohoBoard, ZohoSection, ZohoStatus, ZohoMember, ZohoTaskData, ZohoSyncLog, ZohoProcessedLog
from .zoho_serializers import (
    ZohoBoardSerializer, ZohoSectionSerializer, ZohoStatusSerializer, 
    ZohoMemberSerializer, ZohoTaskDataSerializer, ZohoTaskDataListSerializer,
    ZohoSyncLogSerializer, BoardMappingSerializer, StatusMappingSerializer, MemberMappingSerializer
)
from .models import Tasks, Projects, Members, TaskStatuses, TaskAssignees


WEBHOOK_API_URL = "https://marketing.logimaxindia.com/api/webhook-logs/?full_raw_body=true"


class ZohoBoardViewSet(viewsets.ModelViewSet):
    queryset = ZohoBoard.objects.all()
    serializer_class = ZohoBoardSerializer
    
    @action(detail=False, methods=['post'])
    def map_to_project(self, request):
        """Map a Zoho Board to a PM Project"""
        serializer = BoardMappingSerializer(data=request.data)
        if serializer.is_valid():
            board = ZohoBoard.objects.get(board_id=serializer.validated_data['board_id'])
            project_id = serializer.validated_data.get('mapped_project_id')
            if project_id:
                board.mapped_project = Projects.objects.get(project_id=project_id)
            else:
                board.mapped_project = None
            board.save()
            return Response(ZohoBoardSerializer(board).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def fast_track_projects(self, request):
        """Create PM Projects for all unmapped Zoho Boards"""
        created_count = 0
        already_mapped = 0
        
        for board in ZohoBoard.objects.all():
            if board.mapped_project:
                already_mapped += 1
                continue
            
            # Create Project
            from django.utils.text import slugify
            project_name = board.zoho_board_name
            project_slug = slugify(project_name)[:50]
            
            # Ensure unique slug
            base_slug = project_slug
            counter = 1
            while Projects.objects.filter(slug=project_slug).exists():
                project_slug = f"{base_slug[:45]}-{counter}"
                counter += 1
            
            project = Projects.objects.create(
                name=project_name,
                slug=project_slug,
                status='active',
                visibility='private'
            )
            
            board.mapped_project = project
            board.save()
            created_count += 1
            
        return Response({
            'success': True,
            'created': created_count,
            'already_mapped': already_mapped
        })


class ZohoSectionViewSet(viewsets.ModelViewSet):
    queryset = ZohoSection.objects.all()
    serializer_class = ZohoSectionSerializer


class ZohoStatusViewSet(viewsets.ModelViewSet):
    queryset = ZohoStatus.objects.all()
    serializer_class = ZohoStatusSerializer
    
    @action(detail=False, methods=['post'])
    def map_to_status(self, request):
        """Map a Zoho Status to a PM TaskStatus across all boards with the same name"""
        serializer = StatusMappingSerializer(data=request.data)
        if serializer.is_valid():
            zoho_status = ZohoStatus.objects.get(status_id=serializer.validated_data['status_id'])
            pm_status_id = serializer.validated_data.get('mapped_status_id')
            
            # Find all Zoho statuses with the same name
            name = zoho_status.zoho_status_name
            affected_statuses = ZohoStatus.objects.filter(zoho_status_name=name)
            
            pm_status = None
            if pm_status_id:
                pm_status = TaskStatuses.objects.get(status_id=pm_status_id)
            
            # Apply mapping to all of them
            affected_statuses.update(mapped_status=pm_status)
            
            return Response({
                'success': True,
                'name': name,
                'mapped_to': pm_status.name if pm_status else None,
                'affected_count': affected_statuses.count()
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def auto_map(self, request):
        """Auto-map Zoho Statuses to PM TaskStatuses by matching names"""
        mapped_count = 0
        already_mapped = 0
        not_found = []
        
        for zoho_status in ZohoStatus.objects.all():
            if zoho_status.mapped_status:
                already_mapped += 1
                continue
            
            # Try to find PM TaskStatus by name (case-insensitive)
            name = zoho_status.zoho_status_name.strip()
            pm_status = TaskStatuses.objects.filter(name__iexact=name).first()
            if pm_status:
                zoho_status.mapped_status = pm_status
                zoho_status.save()
                mapped_count += 1
            else:
                not_found.append(name)
        
        return Response({
            'success': True,
            'mapped': mapped_count,
            'already_mapped': already_mapped,
            'not_found': not_found
        })

    @action(detail=False, methods=['post'])
    def fast_track_statuses(self, request):
        """Create PM TaskStatuses for all unique unmapped Zoho Status names"""
        created_count = 0
        already_mapped = 0
        unique_unmapped_names = ZohoStatus.objects.filter(mapped_status__isnull=True).values_list('zoho_status_name', flat=True).distinct()
        
        for name in unique_unmapped_names:
            clean_name = name.strip()
            # Check if PM status already exists with this name
            pm_status = TaskStatuses.objects.filter(name__iexact=clean_name).first()
            if not pm_status:
                pm_status = TaskStatuses.objects.create(
                    name=clean_name,
                    sort_order=TaskStatuses.objects.count() + 1
                )
                created_count += 1
            
            # Map ALL Zoho statuses with this name to this PM status
            ZohoStatus.objects.filter(zoho_status_name=name).update(mapped_status=pm_status)
            
        return Response({
            'success': True,
            'created': created_count,
            'unique_names_processed': len(unique_unmapped_names)
        })


class ZohoMemberViewSet(viewsets.ModelViewSet):
    queryset = ZohoMember.objects.all()
    serializer_class = ZohoMemberSerializer
    
    @action(detail=False, methods=['post'])
    def map_to_member(self, request):
        """Map a Zoho Member to a PM Member"""
        serializer = MemberMappingSerializer(data=request.data)
        if serializer.is_valid():
            zoho_member = ZohoMember.objects.get(member_id=serializer.validated_data['member_id'])
            pm_member_id = serializer.validated_data.get('mapped_member_id')
            if pm_member_id:
                zoho_member.mapped_member = Members.objects.get(member_id=pm_member_id)
            else:
                zoho_member.mapped_member = None
            zoho_member.save()
            return Response(ZohoMemberSerializer(zoho_member).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def auto_map(self, request):
        """Auto-map Zoho Members to PM Members by matching email or name"""
        mapped_count = 0
        already_mapped = 0
        not_found = []
        
        for zoho_member in ZohoMember.objects.all():
            if zoho_member.mapped_member:
                already_mapped += 1
                continue
            
            # 1. Try to find PM member by email (case-insensitive)
            pm_member = None
            if zoho_member.zoho_email:
                pm_member = Members.objects.filter(email__iexact=zoho_member.zoho_email.strip()).first()
            
            # 2. Fallback: Try to find by Name (case-insensitive)
            if not pm_member and zoho_member.zoho_name:
                name = zoho_member.zoho_name.strip()
                # Try exact match on first_name or last_name or Concat
                from django.db.models import Value, CharField
                from django.db.models.functions import Concat
                
                # Match full name (First Last)
                pm_member = Members.objects.annotate(
                    full_name=Concat('first_name', Value(' '), 'last_name', output_field=CharField())
                ).filter(full_name__iexact=name).first()
                
                # Try match without space if still not found
                if not pm_member:
                    pm_member = Members.objects.filter(first_name__iexact=name).first() or \
                                Members.objects.filter(last_name__iexact=name).first()

            if pm_member:
                zoho_member.mapped_member = pm_member
                zoho_member.save()
                mapped_count += 1
            else:
                not_found.append({'name': zoho_member.zoho_name, 'email': zoho_member.zoho_email})
        
        return Response({
            'success': True,
            'mapped': mapped_count,
            'already_mapped': already_mapped,
            'not_found': not_found
        })


class ZohoTaskDataViewSet(viewsets.ModelViewSet):
    queryset = ZohoTaskData.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ZohoTaskDataListSerializer
        return ZohoTaskDataSerializer
    
    def get_queryset(self):
        queryset = ZohoTaskData.objects.all()
        
        # Filter by sync status
        is_synced = self.request.query_params.get('is_synced')
        if is_synced is not None:
            queryset = queryset.filter(is_synced=is_synced.lower() == 'true')
        
        # Filter by board
        board_id = self.request.query_params.get('board')
        if board_id:
            queryset = queryset.filter(board__board_id=board_id)
        
        # Filter by trigger type
        trigger_type = self.request.query_params.get('trigger_type')
        if trigger_type:
            queryset = queryset.filter(trigger_type=trigger_type)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def sync_to_pm(self, request, pk=None):
        """Sync a single Zoho task to PM"""
        zoho_task = self.get_object()
        
        try:
            # Check mappings
            if not zoho_task.board or not zoho_task.board.mapped_project:
                return Response({'error': 'Board not mapped to a project'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Find or create task
            if zoho_task.synced_task:
                task = zoho_task.synced_task
            else:
                task = Tasks.objects.filter(
                    title=zoho_task.title,
                    project_id=zoho_task.board.mapped_project.project_id # Fixed field name
                ).first()
                
                if not task:
                    task = Tasks(project_id=zoho_task.board.mapped_project.project_id) # Fixed field name
            
            # Update task fields
            task.title = zoho_task.title
            task.description = zoho_task.user_story or zoho_task.description
            
            if zoho_task.status and zoho_task.status.mapped_status:
                task.status_id = zoho_task.status.mapped_status.status_id # Fixed field name
            
            task.save()
            
            # Sync assignees
            self._sync_task_assignees(task, zoho_task)
            
            # Update sync status
            zoho_task.synced_task = task
            zoho_task.is_synced = True
            zoho_task.last_sync_at = timezone.now()
            zoho_task.sync_error = ''
            zoho_task.save()
            
            return Response({
                'success': True,
                'task_id': str(task.task_id),
                'message': 'Task synced successfully'
            })
            
        except Exception as e:
            zoho_task.sync_error = str(e)
            zoho_task.save()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _sync_task_assignees(self, task, zoho_task):
        """Helper to sync assignees from Zoho task data to PM TaskAssignees"""
        if not zoho_task.assignees:
            TaskAssignees.objects.filter(task_id=task).delete()
            return
            
        # Get Zoho User IDs from JSON (the 'id' field in assignees is zoho_user_id)
        zoho_user_ids = [str(a.get('id')) for a in zoho_task.assignees if a.get('id')]
        
        # Find mapped PM member IDs through ZohoMember
        mapped_member_ids = []
        zoho_members = ZohoMember.objects.filter(
            zoho_user_id__in=zoho_user_ids,
            mapped_member__isnull=False
        ).select_related('mapped_member')
        
        for zm in zoho_members:
            if zm.mapped_member:
                mapped_member_ids.append(zm.mapped_member.member_id)
        
        # Current PM members assigned to this task
        current_assignments = TaskAssignees.objects.filter(task_id=task)
        current_member_ids = set(current_assignments.values_list('member_id', flat=True))
        
        target_member_ids = set(mapped_member_ids)
        
        # Remove old ones
        to_remove = current_member_ids - target_member_ids
        if to_remove:
            TaskAssignees.objects.filter(task_id=task, member_id__in=to_remove).delete()
            
        # Add new ones
        for member_id in target_member_ids - current_member_ids:
            TaskAssignees.objects.create(
                task_id=task,
                member_id_id=member_id,
                assigned_at=timezone.now()
            )
    
        return Response(results)

    @action(detail=False, methods=['post'])
    def bulk_sync_to_pm(self, request):
        """Sync all un-synced Zoho tasks to PM tasks, provided board/status mappings exist"""
        sync_log = ZohoSyncLog.objects.create(sync_type='bulk_sync_to_pm')
        
        # We only sync tasks where board and status are mapped
        tasks_to_sync = ZohoTaskData.objects.filter(
            is_synced=False,
            board__mapped_project__isnull=False,
            status__mapped_status__isnull=False
        ).select_related('board__mapped_project', 'status__mapped_status', 'synced_task')
        
        total = tasks_to_sync.count()
        synced = 0
        failed = 0
        errors = []
        
        for zoho_task in tasks_to_sync:
            try:
                # Find or create task
                if zoho_task.synced_task:
                    task = zoho_task.synced_task
                else:
                    task = Tasks.objects.filter(
                        title=zoho_task.title,
                        project_id=zoho_task.board.mapped_project
                    ).first()
                    
                    if not task:
                        task = Tasks(project_id=zoho_task.board.mapped_project)
                
                # Update task fields
                task.title = zoho_task.title
                task.description = zoho_task.user_story or zoho_task.description
                
                if zoho_task.status and zoho_task.status.mapped_status:
                    task.status_id = zoho_task.status.mapped_status
                
                task.save()
                
                # Sync assignees
                self._sync_task_assignees(task, zoho_task)
                
                # Update sync status
                zoho_task.synced_task = task
                zoho_task.is_synced = True
                zoho_task.last_sync_at = timezone.now()
                zoho_task.sync_error = ''
                zoho_task.save()
                
                synced += 1
            except Exception as e:
                failed += 1
                errors.append(f"{zoho_task.zoho_task_id}: {str(e)}")
                
        sync_log.status = 'completed'
        sync_log.items_processed = total
        sync_log.items_created = synced
        sync_log.items_failed = failed
        sync_log.details = {'errors': errors[:100]}
        sync_log.completed_at = timezone.now()
        sync_log.save()
        
        return Response({
            'success': True,
            'total': total,
            'synced': synced,
            'failed': failed,
            'errors': errors[:10]
        })

    @action(detail=False, methods=['post'])
    def resync_assignees(self, request):
        """Re-sync assignees for all already-synced tasks (used to fix missing assignee data)"""
        synced_tasks = ZohoTaskData.objects.filter(
            is_synced=True,
            synced_task__isnull=False
        ).select_related('synced_task')
        
        updated = 0
        failed = 0
        
        for zoho_task in synced_tasks:
            try:
                self._sync_task_assignees(zoho_task.synced_task, zoho_task)
                updated += 1
            except Exception as e:
                failed += 1
                
        return Response({
            'success': True,
            'updated': updated,
            'failed': failed
        })


class ZohoSyncLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ZohoSyncLog.objects.all()
    serializer_class = ZohoSyncLogSerializer


class ZohoPullWebhooksView(APIView):
    """Pull webhook data from marketing API and parse into ZohoTaskData"""
    
    def post(self, request):
        # Get batch parameters from request
        batch_size = int(request.data.get('batch_size', 200))  # Default 200 per batch
        start_offset = int(request.data.get('offset', 0))  # Starting offset
        auto_sync_tasks = request.data.get('auto_sync', False)  # Auto-sync new tasks if mappings exist
        
        sync_log = ZohoSyncLog.objects.create(sync_type='pull_webhooks')
        
        try:
            # First, get total count from API
            response = requests.get(f"{WEBHOOK_API_URL}&page_size=1", timeout=30)
            response.raise_for_status()
            total_count = response.json().get('count', 0)
            
            # Calculate which page and records to fetch
            # We'll fetch in batches using offset-based pagination
            all_results = []
            current_offset = start_offset
            items_to_fetch = min(batch_size, total_count - start_offset)
            
            if items_to_fetch <= 0:
                return Response({
                    'success': True,
                    'message': 'All items already synced',
                    'total_in_api': total_count,
                    'offset': start_offset,
                    'has_more': False
                })
            
            # Fetch items in smaller pages from API
            page_size = 100  # API page size
            pages_needed = (items_to_fetch + page_size - 1) // page_size
            start_page = (start_offset // page_size) + 1
            
            for page_num in range(pages_needed):
                page = start_page + page_num
                url = f"{WEBHOOK_API_URL}&page={page}&page_size={page_size}"
                response = requests.get(url, timeout=60)
                response.raise_for_status()
                data = response.json()
                
                results = data.get('results', [])
                if not results:
                    break
                
                # Handle offset within first page
                if page_num == 0:
                    skip_in_page = start_offset % page_size
                    results = results[skip_in_page:]
                
                # Don't exceed batch_size
                remaining = batch_size - len(all_results)
                all_results.extend(results[:remaining])
                
                if len(all_results) >= batch_size:
                    break
                    
                print(f"Page {page}: fetched {len(results)} items (batch so far: {len(all_results)}/{batch_size})")
            
            # Process this batch
            for item in all_results:
                try:
                    self._process_webhook_item(item, sync_log)
                    sync_log.items_processed += 1
                except Exception as e:
                    sync_log.items_failed += 1
                    print(f"Error processing webhook {item.get('id')}: {e}")
            
            new_offset = start_offset + len(all_results)
            has_more = new_offset < total_count
            
            # Auto-sync tasks if requested
            auto_synced = 0
            if auto_sync_tasks:
                unsynced_tasks = ZohoTaskData.objects.filter(
                    is_synced=False,
                    board__mapped_project__isnull=False,
                    status__mapped_status__isnull=False
                ).select_related('board__mapped_project', 'status__mapped_status')
                
                for zoho_task in unsynced_tasks:
                    try:
                        task = Tasks.objects.filter(
                            title=zoho_task.title,
                            project_id=zoho_task.board.mapped_project
                        ).first()
                        
                        if not task:
                            task = Tasks(project_id=zoho_task.board.mapped_project)
                        
                        task.title = zoho_task.title
                        task.description = zoho_task.user_story or zoho_task.description
                        task.external_url = zoho_task.url
                        
                        if zoho_task.status and zoho_task.status.mapped_status:
                            task.status_id = zoho_task.status.mapped_status
                        
                        task.save()
                        
                        zoho_task.synced_task = task
                        zoho_task.is_synced = True
                        zoho_task.last_sync_at = timezone.now()
                        zoho_task.save()
                        auto_synced += 1
                    except Exception as e:
                        print(f"Auto-sync error for {zoho_task.zoho_task_id}: {e}")
            
            sync_log.status = 'completed'
            sync_log.completed_at = timezone.now()
            sync_log.details = {
                'batch_size': batch_size,
                'offset': start_offset,
                'new_offset': new_offset,
                'total_in_api': total_count,
                'has_more': has_more,
                'auto_synced': auto_synced
            }
            sync_log.save()
            
            return Response({
                'success': True,
                'total_in_api': total_count,
                'batch_fetched': len(all_results),
                'processed': sync_log.items_processed,
                'created': sync_log.items_created,
                'updated': sync_log.items_updated,
                'failed': sync_log.items_failed,
                'offset': start_offset,
                'new_offset': new_offset,
                'has_more': has_more,
                'remaining': total_count - new_offset,
                'auto_synced': auto_synced
            })
            
        except Exception as e:
            sync_log.status = 'failed'
            sync_log.error_message = str(e)
            sync_log.completed_at = timezone.now()
            sync_log.save()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _process_webhook_item(self, item, sync_log):
        """Parse a webhook log item and create/update ZohoTaskData"""
        log_id = item.get('id')
        if not log_id:
            return

        # Skip if already processed according to our marker
        if ZohoProcessedLog.objects.filter(webhook_log_id=log_id).exists():
            return

        raw_body = item.get('raw_body', '{}')
        if isinstance(raw_body, str):
            payload_data = json.loads(raw_body)
        else:
            payload_data = raw_body
        
        payload = payload_data.get('payload', {})
        if not payload:
            return
        
        zoho_task_id = payload.get('id')
        if not zoho_task_id:
            return
        
        # Get or create board
        partition = payload.get('partition', {})
        board = None
        if partition.get('id'):
            board, _ = ZohoBoard.objects.get_or_create(
                zoho_board_id=partition['id'],
                defaults={
                    'zoho_board_name': partition.get('name', ''),
                    'zoho_board_url': partition.get('url', '')
                }
            )
        
        # Get or create section
        section_data = payload.get('section', {})
        section = None
        if section_data.get('id') and board:
            section, _ = ZohoSection.objects.get_or_create(
                zoho_section_id=section_data['id'],
                defaults={
                    'zoho_section_name': section_data.get('name', ''),
                    'board': board
                }
            )
        
        # Get or create status
        status_data = payload.get('status', {})
        zoho_status = None
        if status_data.get('id'):
            zoho_status, _ = ZohoStatus.objects.get_or_create(
                zoho_status_id=status_data['id'],
                defaults={
                    'zoho_status_name': status_data.get('name', ''),
                    'color_type': status_data.get('colorType', ''),
                    'mapping_type': status_data.get('mappingType', ''),
                    'board': board
                }
            )
        
        # Get or create members from assignees
        for assignee in payload.get('assignees', []):
            if assignee.get('id'):
                ZohoMember.objects.get_or_create(
                    zoho_user_id=assignee['id'],
                    defaults={
                        'zoho_name': assignee.get('name', ''),
                        'zoho_email': assignee.get('emailId', ''),
                        'zoho_profile_url': assignee.get('url', '')
                    }
                )
        
        # Extract custom fields
        custom_fields = payload.get('customFields', {})
        category_name = ''
        user_story = ''
        for key, cf in custom_fields.items():
            if cf.get('name') == 'Category' and cf.get('value'):
                category_name = cf['value'].get('name', '') if isinstance(cf['value'], dict) else str(cf['value'])
            elif cf.get('name') == 'User story':
                user_story = cf.get('value', '')
        
        # Parse triggered time
        triggered_time = None
        triggered_millis = payload_data.get('triggeredTimeInMillis')
        if triggered_millis:
            try:
                triggered_time = datetime.fromtimestamp(int(triggered_millis) / 1000, tz=timezone.utc)
            except:
                pass
        
        # Prepare task data
        task_defaults = {
            'zoho_internal_task_id': payload.get('taskId', ''),
            'title': payload.get('title', ''),
            'description': payload.get('description', ''),
            'url': payload.get('url', ''),
            'board': board,
            'section': section,
            'status': zoho_status,
            'priority_id': payload.get('priority', {}).get('id', ''),
            'priority_name': payload.get('priority', {}).get('name', ''),
            'assignees': payload.get('assignees', []),
            'custom_fields': custom_fields,
            'category_name': category_name,
            'user_story': user_story,
            'checklists': payload.get('checklists', []),
            'tags': payload.get('tags', []),
            'attachments': payload.get('attachments', []),
            'trigger_type': payload_data.get('triggerType', ''),
            'triggered_by_id': payload_data.get('triggeredBy', {}).get('id', ''),
            'triggered_by_name': payload_data.get('triggeredBy', {}).get('name', ''),
            'triggered_by_email': payload_data.get('triggeredBy', {}).get('emailId', ''),
            'triggered_time': triggered_time,
            'triggered_time_millis': triggered_millis,
            'scope_id': payload_data.get('scope', {}).get('id', ''),
            'scope_name': payload_data.get('scope', {}).get('name', ''),
            'raw_payload': payload_data,
            'webhook_log_id': item.get('id')
        }

        # Create or update ZohoTaskData
        task, created = ZohoTaskData.objects.update_or_create(
            zoho_task_id=zoho_task_id,
            defaults=task_defaults
        )
        
        if created:
            sync_log.items_created += 1
        else:
            sync_log.items_updated += 1
        
        # Mark as processed
        ZohoProcessedLog.objects.get_or_create(webhook_log_id=log_id)


class ZohoStatsView(APIView):
    """Get statistics about Zoho data"""
    
    def get(self, request):
        return Response({
            'boards': {
                'total': ZohoBoard.objects.count(),
                'mapped': ZohoBoard.objects.filter(mapped_project__isnull=False).count()
            },
            'statuses': {
                'total': ZohoStatus.objects.values('zoho_status_name').distinct().count(),
                'mapped': ZohoStatus.objects.filter(mapped_status__isnull=False).values('zoho_status_name').distinct().count()
            },
            'members': {
                'total': ZohoMember.objects.count(),
                'mapped': ZohoMember.objects.filter(mapped_member__isnull=False).count()
            },
            'tasks': {
                'total': ZohoTaskData.objects.count(),
                'synced': ZohoTaskData.objects.filter(is_synced=True).count(),
                'unsynced': ZohoTaskData.objects.filter(is_synced=False).count()
            },
            'logs': {
                'processed': ZohoProcessedLog.objects.count(),
                'total_api': ZohoSyncLog.objects.filter(sync_type='pull_webhooks').first().details.get('total_in_api', 0) if ZohoSyncLog.objects.filter(sync_type='pull_webhooks').exists() else 0
            },
            'recent_syncs': ZohoSyncLogSerializer(
                ZohoSyncLog.objects.all()[:5], many=True
            ).data
        })


class ZohoResetView(APIView):
    """Reset all Zoho data - Full Reset"""
    
    def post(self, request):
        confirm = request.data.get('confirm', False)
        
        if not confirm:
            return Response({
                'error': 'Confirmation required. Send {"confirm": true} to proceed.',
                'warning': 'This will delete ALL Zoho data: Boards, Sections, Statuses, Members, Tasks, and Sync Logs. PM Tasks will NOT be deleted but their Zoho links will be broken.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Count before deletion for reporting
            counts = {
                'tasks': ZohoTaskData.objects.count(),
                'boards': ZohoBoard.objects.count(),
                'sections': ZohoSection.objects.count(),
                'statuses': ZohoStatus.objects.count(),
                'members': ZohoMember.objects.count(),
                'sync_logs': ZohoSyncLog.objects.count(),
            }
            
            # Delete in correct order (respecting foreign keys)
            ZohoTaskData.objects.all().delete()
            ZohoSection.objects.all().delete()
            ZohoStatus.objects.all().delete()
            ZohoMember.objects.all().delete()
            ZohoBoard.objects.all().delete()
            ZohoSyncLog.objects.all().delete()
            
            return Response({
                'success': True,
                'message': 'All Zoho data has been reset',
                'deleted': counts
            })
            
        except Exception as e:
            return Response({
                'error': f'Reset failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
