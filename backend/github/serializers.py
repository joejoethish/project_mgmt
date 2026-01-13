from rest_framework import serializers
from .models import GitHubOrganization, Repository, Commit, PullRequest, PeerReview


class GitHubOrganizationSerializer(serializers.ModelSerializer):
    repository_count = serializers.SerializerMethodField()
    tracked_repos_count = serializers.SerializerMethodField()
    
    class Meta:
        model = GitHubOrganization
        fields = ['org_id', 'name', 'is_active', 'last_sync', 'repository_count', 'tracked_repos_count', 'created_at']
        read_only_fields = ['org_id', 'last_sync', 'created_at']
    
    def get_repository_count(self, obj):
        return obj.repositories.count()
    
    def get_tracked_repos_count(self, obj):
        return obj.repositories.filter(is_tracked=True).count()


class GitHubOrganizationCreateSerializer(serializers.ModelSerializer):
    """For creating/updating orgs - includes token field"""
    class Meta:
        model = GitHubOrganization
        fields = ['org_id', 'name', 'github_token', 'is_active']
        extra_kwargs = {
            'github_token': {'write_only': True}
        }


class RepositorySerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    commits_count = serializers.SerializerMethodField()
    prs_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Repository
        fields = [
            'repo_id', 'organization', 'organization_name', 'project', 'project_name', 'github_id', 
            'name', 'full_name', 'description', 'html_url', 'default_branch',
            'is_private', 'is_tracked', 'last_sync', 
            'commits_count', 'prs_count', 'created_at'
        ]
        read_only_fields = ['repo_id', 'github_id', 'full_name', 'html_url', 'last_sync', 'created_at']
    
    def get_commits_count(self, obj):
        return obj.commits.count()
    
    def get_prs_count(self, obj):
        return obj.pull_requests.count()


class RepositoryToggleSerializer(serializers.ModelSerializer):
    """Simple serializer for toggling is_tracked"""
    class Meta:
        model = Repository
        fields = ['repo_id', 'is_tracked']


class CommitSerializer(serializers.ModelSerializer):
    repository_name = serializers.CharField(source='repository.full_name', read_only=True)
    sha_short = serializers.SerializerMethodField()
    
    class Meta:
        model = Commit
        fields = [
            'commit_id', 'repository', 'repository_name', 'sha', 'sha_short',
            'author_login', 'author_name', 'author_email', 'message',
            'committed_at', 'additions', 'deletions', 'files_changed', 'html_url'
        ]
    
    def get_sha_short(self, obj):
        return obj.sha[:7] if obj.sha else ''


class PullRequestSerializer(serializers.ModelSerializer):
    repository_name = serializers.CharField(source='repository.full_name', read_only=True)
    peer_reviews_count = serializers.SerializerMethodField()
    
    class Meta:
        model = PullRequest
        fields = [
            'pr_id', 'repository', 'repository_name', 'github_id', 'number',
            'title', 'body', 'state', 'author_login', 'author_avatar_url', 'html_url',
            'created_at', 'updated_at', 'merged_at', 'closed_at',
            'commits_count', 'additions', 'deletions', 'changed_files',
            'requested_reviewers', 'peer_reviews_count'
        ]
    
    def get_peer_reviews_count(self, obj):
        return obj.peer_reviews.count()


class PullRequestListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views"""
    repository_name = serializers.CharField(source='repository.full_name', read_only=True)
    
    class Meta:
        model = PullRequest
        fields = [
            'pr_id', 'repository_name', 'number', 'title', 'state', 
            'author_login', 'created_at', 'merged_at', 'html_url'
        ]


class PeerReviewSerializer(serializers.ModelSerializer):
    pull_request_title = serializers.CharField(source='pull_request.title', read_only=True)
    pull_request_number = serializers.IntegerField(source='pull_request.number', read_only=True)
    average_score = serializers.FloatField(read_only=True)
    
    class Meta:
        model = PeerReview
        fields = [
            'review_id', 'pull_request', 'pull_request_title', 'pull_request_number',
            'reviewer_name', 'reviewee_name',
            'code_quality', 'communication', 'timeliness', 'documentation',
            'strengths', 'improvements', 'comments',
            'review_period_start', 'review_period_end',
            'average_score', 'created_at', 'updated_at'
        ]
        read_only_fields = ['review_id', 'created_at', 'updated_at']


class PeerReviewCreateSerializer(serializers.ModelSerializer):
    """For creating peer reviews"""
    class Meta:
        model = PeerReview
        fields = [
            'pull_request', 'reviewer_name', 'reviewee_name',
            'code_quality', 'communication', 'timeliness', 'documentation',
            'strengths', 'improvements', 'comments',
            'review_period_start', 'review_period_end'
        ]


# Stats/Dashboard serializers
class CommitStatsSerializer(serializers.Serializer):
    author_login = serializers.CharField()
    commit_count = serializers.IntegerField()
    additions = serializers.IntegerField()
    deletions = serializers.IntegerField()


class RepositoryStatsSerializer(serializers.Serializer):
    full_name = serializers.CharField()
    commits_count = serializers.IntegerField()
    prs_count = serializers.IntegerField()
    open_prs = serializers.IntegerField()
