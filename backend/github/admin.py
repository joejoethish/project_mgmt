from django.contrib import admin
from .models import GitHubOrganization, Repository, Commit, PullRequest, PeerReview


@admin.register(GitHubOrganization)
class GitHubOrganizationAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'last_sync', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Repository)
class RepositoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'organization', 'is_tracked', 'default_branch', 'last_sync']
    list_filter = ['is_tracked', 'organization']
    search_fields = ['name', 'full_name']
    list_editable = ['is_tracked']


@admin.register(Commit)
class CommitAdmin(admin.ModelAdmin):
    list_display = ['sha_short', 'repository', 'author_login', 'message_short', 'committed_at']
    list_filter = ['repository', 'author_login']
    search_fields = ['sha', 'message', 'author_name']
    date_hierarchy = 'committed_at'
    
    def sha_short(self, obj):
        return obj.sha[:7] if obj.sha else ''
    sha_short.short_description = 'SHA'
    
    def message_short(self, obj):
        return obj.message[:50] + '...' if len(obj.message) > 50 else obj.message
    message_short.short_description = 'Message'


@admin.register(PullRequest)
class PullRequestAdmin(admin.ModelAdmin):
    list_display = ['number', 'title', 'repository', 'state', 'author_login', 'created_at']
    list_filter = ['state', 'repository']
    search_fields = ['title', 'author_login']
    date_hierarchy = 'created_at'


@admin.register(PeerReview)
class PeerReviewAdmin(admin.ModelAdmin):
    list_display = ['pull_request', 'reviewer_name', 'reviewee_name', 'code_quality', 'communication', 'created_at']
    list_filter = ['code_quality', 'communication']
    search_fields = ['reviewer_name', 'reviewee_name', 'comments']
    date_hierarchy = 'created_at'
