import os
import sys
import django
import random
from datetime import timedelta
from django.utils import timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from gamification.models import CreditLedger, GamificationRule, UserLevel

def seed_history():
    print("🔹 Seeding History for Mock User...")
    member_id = '1f0bb929-e50c-4e99-a5c0-f2a480d8f8af' # Unified User
    
    rules = GamificationRule.objects.all()
    if not rules.exists():
        print("Error: No rules found.")
        return

    prefixes = ["Task #101", "Bug #205", "Feature #304", "Deploy v1.2"]
    
    # Create 5 random transactions
    for i in range(5):
        rule = random.choice(rules)
        prefix = random.choice(prefixes)
        
        CreditLedger.objects.create(
            member_id=member_id,
            amount=rule.credits,
            reason=f"{rule.name}: {prefix} - {random.randint(1,100)}",
            rule=rule,
            created_at=timezone.now() - timedelta(days=i)
        )
        print(f"   + {rule.credits} Credits")

    # Update Level
    from django.db.models import Sum
    total = CreditLedger.objects.filter(member_id=member_id).aggregate(Sum('amount'))['amount__sum'] or 0
    ul, _ = UserLevel.objects.get_or_create(member_id=member_id)
    ul.total_credits = total
    ul.calculate_level()
    print(f"   ✅ User Level Updated: {ul.current_level} ({ul.total_credits} Credits)")

if __name__ == "__main__":
    seed_history()
