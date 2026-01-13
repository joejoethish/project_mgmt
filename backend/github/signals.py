from django.dispatch import Signal

# Signal sent when a commit is newly synced
# Provides arguments: sender, commit (instance), created (bool)
commit_synced = Signal()
