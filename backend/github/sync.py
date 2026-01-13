"""
GitHub API Sync Module
Handles fetching data from GitHub API and storing in database.
"""
import requests
from datetime import datetime
from django.utils import timezone

from .models import GitHubOrganization, Repository, Commit, PullRequest


class GitHubAPIClient:
    """Simple GitHub API client"""
    
    BASE_URL = "https://api.github.com"
    
    def __init__(self, token: str):
        self.token = token
        self.headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json"
        }
    
    def _get(self, endpoint: str, params: dict = None) -> dict:
        """Make GET request to GitHub API"""
        url = f"{self.BASE_URL}{endpoint}"
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()
    
    def _get_paginated(self, endpoint: str, params: dict = None, max_pages: int = 10):
        """Get paginated results"""
        params = params or {}
        params['per_page'] = 100
        all_results = []
        
        for page in range(1, max_pages + 1):
            params['page'] = page
            results = self._get(endpoint, params)
            if not results:
                break
            all_results.extend(results)
            if len(results) < 100:
                break
        
        return all_results
    
    def get_org_repos(self, org_name: str):
        """Get all repositories for an organization"""
        try:
            # Try org endpoint first
            return self._get_paginated(f"/orgs/{org_name}/repos")
        except requests.exceptions.HTTPError:
            # Fall back to user endpoint
            return self._get_paginated(f"/users/{org_name}/repos")
    
    def get_repo_commits(self, owner: str, repo: str, since: datetime = None):
        """Get commits for a repository"""
        params = {}
        if since:
            params['since'] = since.isoformat()
        return self._get_paginated(f"/repos/{owner}/{repo}/commits", params)
    
    def get_commit(self, owner: str, repo: str, sha: str):
        """Get single commit details (includes stats)"""
        return self._get(f"/repos/{owner}/{repo}/commits/{sha}")

    def get_repo_pulls(self, owner: str, repo: str, state: str = 'all'):
        """Get pull requests for a repository"""
        return self._get_paginated(f"/repos/{owner}/{repo}/pulls", {'state': state})
    
    def get_pull_details(self, owner: str, repo: str, pr_number: int):
        """Get detailed info for a specific PR"""
        return self._get(f"/repos/{owner}/{repo}/pulls/{pr_number}")


def sync_organization(org: GitHubOrganization) -> str:
    """Sync all repositories for an organization"""
    client = GitHubAPIClient(org.github_token)
    
    repos = client.get_org_repos(org.name)
    created_count = 0
    updated_count = 0
    
    for repo_data in repos:
        repo, created = Repository.objects.update_or_create(
            github_id=repo_data['id'],
            defaults={
                'organization': org,
                'name': repo_data['name'],
                'full_name': repo_data['full_name'],
                'description': repo_data['description'] or '',
                'html_url': repo_data['html_url'],
                'default_branch': repo_data['default_branch'] or 'main',
                'is_private': repo_data['private'],
            }
        )
        if created:
            created_count += 1
        else:
            updated_count += 1
    
    org.last_sync = timezone.now()
    org.save()
    
    return f"Synced {len(repos)} repos ({created_count} new, {updated_count} updated)"


def sync_repository(repo: Repository) -> str:
    """Sync commits and PRs for a tracked repository"""
    if not repo.is_tracked:
        return "Repository is not tracked"
    
    org = repo.organization
    client = GitHubAPIClient(org.github_token)
    owner, repo_name = repo.full_name.split('/')
    
    # Sync commits (last 30 days or since last sync)
    since = repo.last_sync or (timezone.now() - timezone.timedelta(days=30))
    commits_data = client.get_repo_commits(owner, repo_name, since)
    commits_created = 0
    
    for c in commits_data:
        sha = c['sha']
        commit_info = c.get('commit', {})
        author_info = commit_info.get('author', {})
        
        # Check if we have stats
        existing = Commit.objects.filter(repository=repo, sha=sha).first()
        additions = 0
        deletions = 0
        files_changed = 0
        
        should_fetch_details = False
        if not existing:
            should_fetch_details = True
        elif existing.additions == 0 and existing.deletions == 0:
            should_fetch_details = True
            
        if should_fetch_details:
            try:
                detail = client.get_commit(owner, repo_name, sha)
                stats = detail.get('stats', {})
                additions = stats.get('additions', 0)
                deletions = stats.get('deletions', 0)
                # files not always in stats object directly, sometimes in 'files' list length
                files_changed = len(detail.get('files', []))
            except Exception:
                # If fetch fails, just keep 0 and continue
                print(f"Failed to fetch details for {sha}")
                pass
        else:
            # Keep existing values
            additions = existing.additions
            deletions = existing.deletions
            files_changed = existing.files_changed

        _, created = Commit.objects.update_or_create(
            repository=repo,
            sha=sha,
            defaults={
                'author_login': c.get('author', {}).get('login') if c.get('author') else None,
                'author_name': author_info.get('name'),
                'author_email': author_info.get('email'),
                'message': commit_info.get('message', ''),
                'committed_at': author_info.get('date'),
                'html_url': c.get('html_url'),
                'additions': additions,
                'deletions': deletions,
                'files_changed': files_changed,
            }
        )
        if created:
            commits_created += 1
            
        # Trigger signal
        from .signals import commit_synced
        commit_synced.send(sender=Commit, commit=_, created=created)
    
    # Sync PRs
    prs_data = client.get_repo_pulls(owner, repo_name, 'all')
    prs_created = 0
    
    for pr in prs_data:
        state = 'merged' if pr.get('merged_at') else pr['state']
        
        # Determine if we need to fetch details for PR stats (commits, additions, deletions)
        # The list endpoint doesn't return additions/deletions usually
        # For simplicity, similar check could be done, but let's stick to commits for now as requested
        
        _, created = PullRequest.objects.update_or_create(
            repository=repo,
            number=pr['number'],
            defaults={
                'github_id': pr['id'],
                'title': pr['title'],
                'body': pr.get('body') or '',
                'state': state,
                'author_login': pr['user']['login'],
                'author_avatar_url': pr['user'].get('avatar_url'),
                'html_url': pr['html_url'],
                'created_at': pr['created_at'],
                'updated_at': pr.get('updated_at'),
                'merged_at': pr.get('merged_at'),
                'closed_at': pr.get('closed_at'),
                'requested_reviewers': [r['login'] for r in pr.get('requested_reviewers', [])],
            }
        )
        if created:
            prs_created += 1
    
    repo.last_sync = timezone.now()
    repo.save()
    
    return f"Synced {commits_created} new commits, {prs_created} new PRs"


def sync_all_tracked_repos() -> str:
    """Sync all tracked repositories across all organizations"""
    results = []
    
    for org in GitHubOrganization.objects.filter(is_active=True):
        # First sync org repos
        org_result = sync_organization(org)
        results.append(f"{org.name}: {org_result}")
        
        # Then sync tracked repos
        for repo in org.repositories.filter(is_tracked=True):
            try:
                repo_result = sync_repository(repo)
                results.append(f"  - {repo.name}: {repo_result}")
            except Exception as e:
                results.append(f"  - {repo.name}: ERROR - {str(e)}")
    
    return "\n".join(results)
