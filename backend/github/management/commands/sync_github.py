"""
Django Management Command: sync_github

Syncs data from GitHub API into the database.

Usage:
    python manage.py sync_github                    # Sync all active orgs
    python manage.py sync_github --org=myorg        # Sync specific org
    python manage.py sync_github --repos-only       # Only sync repo list, not commits/PRs
"""
from django.core.management.base import BaseCommand, CommandError
from github.models import GitHubOrganization, Repository
from github.sync import sync_organization, sync_repository, sync_all_tracked_repos


class Command(BaseCommand):
    help = 'Sync GitHub repositories, commits, and pull requests'

    def add_arguments(self, parser):
        parser.add_argument(
            '--org',
            type=str,
            help='Sync only this organization (by name)',
        )
        parser.add_argument(
            '--repo',
            type=str,
            help='Sync only this repository (full_name format: owner/repo)',
        )
        parser.add_argument(
            '--repos-only',
            action='store_true',
            help='Only sync repository list, do not sync commits/PRs',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Sync all tracked repositories across all organizations',
        )

    def handle(self, *args, **options):
        org_name = options.get('org')
        repo_name = options.get('repo')
        repos_only = options.get('repos_only')
        sync_all = options.get('all')

        if repo_name:
            # Sync specific repo
            try:
                repo = Repository.objects.get(full_name=repo_name)
            except Repository.DoesNotExist:
                raise CommandError(f"Repository '{repo_name}' not found in database")
            
            self.stdout.write(f"Syncing repository: {repo.full_name}")
            result = sync_repository(repo)
            self.stdout.write(self.style.SUCCESS(result))
            
        elif org_name:
            # Sync specific org
            try:
                org = GitHubOrganization.objects.get(name=org_name)
            except GitHubOrganization.DoesNotExist:
                raise CommandError(f"Organization '{org_name}' not found in database")
            
            self.stdout.write(f"Syncing organization: {org.name}")
            result = sync_organization(org)
            self.stdout.write(self.style.SUCCESS(result))
            
            if not repos_only:
                # Also sync tracked repos
                for repo in org.repositories.filter(is_tracked=True):
                    self.stdout.write(f"  Syncing: {repo.name}...")
                    try:
                        repo_result = sync_repository(repo)
                        self.stdout.write(self.style.SUCCESS(f"    {repo_result}"))
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"    Error: {str(e)}"))
                        
        elif sync_all:
            # Sync everything
            self.stdout.write("Syncing all tracked repositories...")
            result = sync_all_tracked_repos()
            self.stdout.write(self.style.SUCCESS(result))
            
        else:
            # Default: list orgs and their status
            orgs = GitHubOrganization.objects.filter(is_active=True)
            if not orgs.exists():
                self.stdout.write(self.style.WARNING(
                    "No organizations configured. Add one via Django admin or API:\n"
                    "  POST /api/github/organizations/ with {name: 'org-name', github_token: 'xxx'}"
                ))
                return
            
            self.stdout.write("Active organizations:")
            for org in orgs:
                repo_count = org.repositories.count()
                tracked = org.repositories.filter(is_tracked=True).count()
                self.stdout.write(f"  - {org.name}: {repo_count} repos ({tracked} tracked)")
            
            self.stdout.write("\nTo sync, use:")
            self.stdout.write("  python manage.py sync_github --org=<name>  # Sync specific org")
            self.stdout.write("  python manage.py sync_github --all         # Sync all tracked repos")
