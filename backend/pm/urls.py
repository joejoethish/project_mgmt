from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import *
from .timesheet_views import TimesheetViewSet
from .auth_views import (
    login_view, me_view, register_view, forgot_password_view, reset_password_view,
    bulk_invite_view, bulk_update_role_view, validate_invite_view, accept_invite_view
)
from .import_views import ProjectImportView, TaskImportView, MemberImportView, UnifiedImportView
from .zoho_views import (
    ZohoBoardViewSet, ZohoSectionViewSet, ZohoStatusViewSet, ZohoMemberViewSet,
    ZohoTaskDataViewSet, ZohoSyncLogViewSet, ZohoPullWebhooksView, ZohoStatsView, ZohoResetView
)

router = DefaultRouter()

router.register(r'activitylogs', ActivityLogsViewSet, basename='activitylogs')
router.register(r'changelogs', ChangelogViewSet, basename='changelog')
router.register(r'documentpermissions', DocumentPermissionsViewSet, basename='documentpermissions')
router.register(r'documentversions', DocumentVersionsViewSet, basename='documentversions')
router.register(r'members', MembersViewSet, basename='members')
router.register(r'permissions', PermissionsViewSet, basename='permissions')
router.register(r'projectdocuments', ProjectDocumentsViewSet, basename='projectdocuments')
router.register(r'projectmembers', ProjectMembersViewSet, basename='projectmembers')
router.register(r'projects', ProjectsViewSet, basename='projects')
router.register(r'rolepermissions', RolePermissionsViewSet, basename='rolepermissions')
router.register(r'roles', RolesViewSet, basename='roles')
router.register(r'sprinttasks', SprintTasksViewSet, basename='sprinttasks')
router.register(r'sprints', SprintsViewSet, basename='sprints')
router.register(r'taskassignees', TaskAssigneesViewSet, basename='taskassignees')
router.register(r'taskattachments', TaskAttachmentsViewSet, basename='taskattachments')
router.register(r'taskcomments', TaskCommentsViewSet, basename='taskcomments')
router.register(r'taskhistories', TaskHistoryViewSet, basename='taskhistory')
router.register(r'tasklabelmaps', TaskLabelMapViewSet, basename='tasklabelmap')
router.register(r'tasklabels', TaskLabelsViewSet, basename='tasklabels')
router.register(r'taskpriorities', TaskPrioritiesViewSet, basename='taskpriorities')
router.register(r'taskstatuses', TaskStatusesViewSet, basename='taskstatuses')
router.register(r'tasks', TasksViewSet, basename='tasks')
router.register(r'teammembers', TeamMembersViewSet, basename='teammembers')
router.register(r'teams', TeamsViewSet, basename='teams')
router.register(r'workflowtransitions', WorkflowTransitionsViewSet, basename='workflowtransitions')
router.register(r'iterations', IterationsViewSet, basename='iterations')
router.register(r'iterationtasks', IterationTasksViewSet, basename='iterationtasks')
router.register(r'dailystandups', DailyStandupViewSet, basename='dailystandups')
router.register(r'timesheets', TimesheetViewSet, basename='timesheets')

# Zoho Connect Integration
router.register(r'zoho/boards', ZohoBoardViewSet, basename='zoho-boards')
router.register(r'zoho/sections', ZohoSectionViewSet, basename='zoho-sections')
router.register(r'zoho/statuses', ZohoStatusViewSet, basename='zoho-statuses')
router.register(r'zoho/members', ZohoMemberViewSet, basename='zoho-members')
router.register(r'zoho/tasks', ZohoTaskDataViewSet, basename='zoho-tasks')
router.register(r'zoho/sync-logs', ZohoSyncLogViewSet, basename='zoho-sync-logs')

urlpatterns = router.urls + [
    # Import endpoints
    path('import/projects/', ProjectImportView.as_view(), name='import-projects'),
    path('import/tasks/', TaskImportView.as_view(), name='import-tasks'),
    path('import/members/', MemberImportView.as_view(), name='import-members'),
    path('import/unified/', UnifiedImportView.as_view(), name='import-unified'),
    
    # Zoho sync endpoints
    path('zoho/pull-webhooks/', ZohoPullWebhooksView.as_view(), name='zoho-pull-webhooks'),
    path('zoho/stats/', ZohoStatsView.as_view(), name='zoho-stats'),
    path('zoho/reset/', ZohoResetView.as_view(), name='zoho-reset'),

    # Permission Matrix resources
    path('permission-resources/', PermissionResourcesView.as_view(), name='permission-resources'),

    # Auth endpoints
    path('auth/login/', login_view, name='api-login'),
    path('auth/me/', me_view, name='api-me'),
    path('auth/register/', register_view, name='api-register'),
    path('auth/forgot-password/', forgot_password_view, name='api-forgot-password'),
    path('auth/reset-password/', reset_password_view, name='api-reset-password'),
    path('auth/invite/bulk/', bulk_invite_view, name='api-bulk-invite'),
    path('auth/role/bulk/', bulk_update_role_view, name='api-bulk-role'),
    path('auth/invite/validate/', validate_invite_view, name='api-validate-invite'),
    path('auth/invite/accept/', accept_invite_view, name='api-accept-invite'),
]


