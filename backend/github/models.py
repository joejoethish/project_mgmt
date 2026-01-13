from django.db import models
import uuid


class GitHubOrganization(models.Model):
    """GitHub Organization or User account with API access"""
    org_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True, help_text="GitHub organization or username")
    github_token = models.CharField(max_length=255, help_text="Personal Access Token for API access")
    is_active = models.BooleanField(default=True)
    last_sync = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'github_organizations'
        ordering = ['name']

    def __str__(self):
        return self.name


class Repository(models.Model):
    """GitHub Repository"""
    repo_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(GitHubOrganization, on_delete=models.CASCADE, related_name='repositories')
    project = models.ForeignKey('pm.Projects', on_delete=models.SET_NULL, null=True, blank=True, related_name='github_repos')
    github_id = models.BigIntegerField(unique=True, help_text="GitHub's internal repo ID")
    name = models.CharField(max_length=255)
    full_name = models.CharField(max_length=512, help_text="owner/repo format")
    description = models.TextField(blank=True, null=True)
    html_url = models.URLField(max_length=512)
    default_branch = models.CharField(max_length=255, default='main')
    is_private = models.BooleanField(default=False)
    is_tracked = models.BooleanField(default=False, help_text="Whether to sync commits/PRs for this repo")
    last_sync = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'github_repositories'
        ordering = ['full_name']
        verbose_name_plural = 'Repositories'

    def __str__(self):
        return self.full_name


class Commit(models.Model):
    """GitHub Commit"""
    commit_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    repository = models.ForeignKey(Repository, on_delete=models.CASCADE, related_name='commits')
    sha = models.CharField(max_length=40, db_index=True)
    author_login = models.CharField(max_length=255, blank=True, null=True)
    author_name = models.CharField(max_length=255, blank=True, null=True)
    author_email = models.EmailField(blank=True, null=True)
    message = models.TextField()
    committed_at = models.DateTimeField()
    additions = models.IntegerField(default=0)
    deletions = models.IntegerField(default=0)
    files_changed = models.IntegerField(default=0)
    html_url = models.URLField(max_length=512, blank=True, null=True)
    
    class Meta:
        db_table = 'github_commits'
        ordering = ['-committed_at']
        unique_together = ['repository', 'sha']

    def __str__(self):
        return f"{self.sha[:7]} - {self.message[:50]}"


class PullRequest(models.Model):
    """GitHub Pull Request"""
    STATE_CHOICES = [
        ('open', 'Open'),
        ('closed', 'Closed'),
        ('merged', 'Merged'),
    ]
    
    pr_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    repository = models.ForeignKey(Repository, on_delete=models.CASCADE, related_name='pull_requests')
    github_id = models.BigIntegerField()
    number = models.IntegerField()
    title = models.CharField(max_length=512)
    body = models.TextField(blank=True, null=True)
    state = models.CharField(max_length=20, choices=STATE_CHOICES, default='open')
    author_login = models.CharField(max_length=255)
    author_avatar_url = models.URLField(max_length=512, blank=True, null=True)
    html_url = models.URLField(max_length=512)
    
    # Dates
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField(null=True, blank=True)
    merged_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    
    # Stats
    commits_count = models.IntegerField(default=0)
    additions = models.IntegerField(default=0)
    deletions = models.IntegerField(default=0)
    changed_files = models.IntegerField(default=0)
    
    # Reviewers (JSON list of logins)
    requested_reviewers = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = 'github_pull_requests'
        ordering = ['-created_at']
        unique_together = ['repository', 'number']

    def __str__(self):
        return f"#{self.number} - {self.title}"


class PeerReview(models.Model):
    """Custom Peer Review Form - for internal performance tracking"""
    RATING_CHOICES = [
        (1, '1 - Needs Improvement'),
        (2, '2 - Below Average'),
        (3, '3 - Average'),
        (4, '4 - Good'),
        (5, '5 - Excellent'),
    ]
    
    review_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pull_request = models.ForeignKey(PullRequest, on_delete=models.CASCADE, related_name='peer_reviews', null=True, blank=True)
    
    # Link to your HR/User model if available
    reviewer_name = models.CharField(max_length=255, help_text="Person giving the review")
    reviewee_name = models.CharField(max_length=255, help_text="Person being reviewed")
    
    # Rating scales
    code_quality = models.IntegerField(choices=RATING_CHOICES, help_text="Quality of code written")
    communication = models.IntegerField(choices=RATING_CHOICES, help_text="Communication during PR")
    timeliness = models.IntegerField(choices=RATING_CHOICES, default=3, help_text="Speed of response/delivery")
    documentation = models.IntegerField(choices=RATING_CHOICES, default=3, help_text="Quality of comments/docs")
    
    # Freeform feedback
    strengths = models.TextField(blank=True, null=True, help_text="What went well?")
    improvements = models.TextField(blank=True, null=True, help_text="What could be improved?")
    comments = models.TextField(blank=True, null=True, help_text="Additional comments")
    
    # Metadata
    review_period_start = models.DateField(null=True, blank=True)
    review_period_end = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'github_peer_reviews'
        ordering = ['-created_at']

    def __str__(self):
        return f"Review: {self.reviewer_name} → {self.reviewee_name}"
    
    @property
    def average_score(self):
        scores = [self.code_quality, self.communication, self.timeliness, self.documentation]
        return sum(scores) / len(scores)
