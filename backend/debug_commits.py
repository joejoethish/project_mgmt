from github.models import Commit
from pm.models import Members
from django.db.models import Q

email = "raja@logimaxindia.com"
print(f"Checking commits for: {email}")

commits = Commit.objects.filter(
    Q(author_email__iexact=email) | 
    Q(author_login__icontains="raja")
)

print(f"Total matching commits: {commits.count()}")

if commits.exists():
    last_commit = commits.order_by('-committed_at').first()
    print(f"Most recent commit: {last_commit.committed_at} - {last_commit.message[:50]}")
    print(f"Author Email: {last_commit.author_email}")
    print(f"Author Login: {last_commit.author_login}")
else:
    print("No commits found matching email or login.")
