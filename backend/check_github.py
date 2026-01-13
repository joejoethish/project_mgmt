import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()

import requests
from github.models import GitHubOrganization

org = GitHubOrganization.objects.first()
print(f"Org: {org.name}")

headers = {"Authorization": f"token {org.github_token}"}

# Check user info
r = requests.get("https://api.github.com/user", headers=headers)
if r.ok:
    user = r.json()
    print(f"Token owner: {user.get('login')}")

# Check orgs the token has access to
r = requests.get("https://api.github.com/user/orgs", headers=headers)
if r.ok:
    orgs = r.json()
    print(f"Organizations with access: {[o['login'] for o in orgs]}")
else:
    print(f"Orgs error: {r.status_code}")

# Check repos the token can see
r = requests.get("https://api.github.com/user/repos?per_page=10", headers=headers)
if r.ok:
    repos = r.json()
    print(f"User repos accessible: {[repo['full_name'] for repo in repos[:5]]}")
else:
    print(f"Repos error: {r.status_code}")

# Try org-specific repos
r = requests.get(f"https://api.github.com/orgs/{org.name}/repos", headers=headers)
print(f"Org repos status: {r.status_code}")
if r.ok:
    repos = r.json()
    print(f"Org repos: {[repo['name'] for repo in repos[:5]]}")
else:
    print(f"Org repos error: {r.text[:200]}")
