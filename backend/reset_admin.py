import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User

try:
    username = "admin"
    password = "password123"
    
    # Get or create
    user, created = User.objects.get_or_create(username=username)
    if created:
        user.email = "admin@example.com"
        # Try to link to a member if possible, but mainly just ensure the User exists
        print(f"Created new user {username}")
    
    user.set_password(password)
    user.is_superuser = True
    user.is_staff = True
    user.save()
    
    print(f"Successfully reset password for user '{username}' to '{password}'")

except Exception as e:
    print(f"Error resetting password: {e}")
