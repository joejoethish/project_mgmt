from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Sum, Q
from django.utils import timezone
from datetime import timedelta

from .models import GitHubOrganization, Repository, Commit, PullRequest, PeerReview
from .serializers import (
    GitHubOrganizationSerializer, GitHubOrganizationCreateSerializer,
    RepositorySerializer, RepositoryToggleSerializer,
    CommitSerializer, PullRequestSerializer, PullRequestListSerializer,
    PeerReviewSerializer, PeerReviewCreateSerializer,
    CommitStatsSerializer, RepositoryStatsSerializer
)


class GitHubOrganizationViewSet(viewsets.ModelViewSet):
    queryset = GitHubOrganization.objects.all()
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return GitHubOrganizationCreateSerializer
        return GitHubOrganizationSerializer
    
    @action(detail=True, methods=['post'])
    def sync(self, request, pk=None):
        """Trigger sync for this organization"""
        org = self.get_object()
        # Import here to avoid circular imports
        from .sync import sync_organization
        try:
            result = sync_organization(org)
            return Response({'status': 'success', 'message': result})
        except Exception as e:
            return Response({'status': 'error', 'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class RepositoryViewSet(viewsets.ModelViewSet):
    queryset = Repository.objects.select_related('organization', 'project').all()
    serializer_class = RepositorySerializer
    
    # Explicitly enable filtering backends
    from django_filters.rest_framework import DjangoFilterBackend
    from rest_framework.filters import SearchFilter
    filter_backends = [DjangoFilterBackend, SearchFilter]
    
    filterset_fields = ['organization', 'is_tracked', 'is_private', 'project']
    search_fields = ['name', 'full_name', 'description']
    
    @action(detail=True, methods=['post'])
    def toggle_tracking(self, request, pk=None):
        """Toggle is_tracked for a repository"""
        repo = self.get_object()
        repo.is_tracked = not repo.is_tracked
        repo.save()
        return Response(RepositoryToggleSerializer(repo).data)
    
    @action(detail=True, methods=['post'])
    def sync(self, request, pk=None):
        """Trigger sync for this repository"""
        repo = self.get_object()
        from .sync import sync_repository
        try:
            result = sync_repository(repo)
            return Response({'status': 'success', 'message': result})
        except Exception as e:
            return Response({'status': 'error', 'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CommitViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Commit.objects.select_related('repository').all()
    serializer_class = CommitSerializer
    filterset_fields = ['repository', 'author_login']
    search_fields = ['sha', 'message', 'author_name', 'author_login']
    ordering_fields = ['committed_at', 'additions', 'deletions']
    ordering = ['-committed_at']


class PullRequestViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PullRequest.objects.select_related('repository').all()
    filterset_fields = ['repository', 'state', 'author_login']
    search_fields = ['title', 'author_login']
    ordering_fields = ['created_at', 'merged_at', 'number']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return PullRequestListSerializer
        return PullRequestSerializer


class PeerReviewViewSet(viewsets.ModelViewSet):
    queryset = PeerReview.objects.select_related('pull_request').all()
    filterset_fields = ['reviewer_name', 'reviewee_name', 'pull_request']
    search_fields = ['reviewer_name', 'reviewee_name', 'comments']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PeerReviewCreateSerializer
        return PeerReviewSerializer


class GitHubDashboardView(APIView):
    """Dashboard stats API"""
    
    def get(self, request):
        # Time ranges
        now = timezone.now()
        last_7_days = now - timedelta(days=7)
        last_30_days = now - timedelta(days=30)
        
        # Get last sync time from organizations
        last_sync = GitHubOrganization.objects.filter(is_active=True, last_sync__isnull=False).order_by('-last_sync').values_list('last_sync', flat=True).first()
        
        # Basic counts
        stats = {
            'organizations': GitHubOrganization.objects.filter(is_active=True).count(),
            'repositories': Repository.objects.count(),
            'tracked_repositories': Repository.objects.filter(is_tracked=True).count(),
            'total_commits': Commit.objects.count(),
            'total_pull_requests': PullRequest.objects.count(),
            'total_peer_reviews': PeerReview.objects.count(),
            
            # Recent activity
            'commits_last_7_days': Commit.objects.filter(committed_at__gte=last_7_days).count(),
            'commits_last_30_days': Commit.objects.filter(committed_at__gte=last_30_days).count(),
            'prs_last_7_days': PullRequest.objects.filter(created_at__gte=last_7_days).count(),
            'prs_last_30_days': PullRequest.objects.filter(created_at__gte=last_30_days).count(),
            
            # PR states
            'open_prs': PullRequest.objects.filter(state='open').count(),
            'merged_prs': PullRequest.objects.filter(state='merged').count(),
            'closed_prs': PullRequest.objects.filter(state='closed').count(),
            
            # Last sync timestamp
            'last_sync': last_sync.isoformat() if last_sync else None,
        }
        
        # Top contributors (last 30 days)
        top_contributors = (
            Commit.objects
            .filter(committed_at__gte=last_30_days)
            .values('author_login')
            .annotate(
                commit_count=Count('commit_id'),
                additions=Sum('additions'),
                deletions=Sum('deletions')
            )
            .order_by('-commit_count')[:10]
        )
        stats['top_contributors'] = list(top_contributors)
        
        # Active repos (with 30-day filtered PR counts)
        active_repos = (
            Repository.objects
            .filter(is_tracked=True)
            .annotate(
                commits_count=Count('commits', filter=Q(commits__committed_at__gte=last_30_days)),
                prs_count=Count('pull_requests', filter=Q(pull_requests__created_at__gte=last_30_days)),
                open_prs=Count('pull_requests', filter=Q(pull_requests__state='open'))
            )
            .order_by('-commits_count')[:10]
            .values('full_name', 'html_url', 'commits_count', 'prs_count', 'open_prs')
        )
        stats['active_repos'] = list(active_repos)
        
        return Response(stats)
