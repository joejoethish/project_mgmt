import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.utils import timezone
from datetime import timedelta
from gamification.models import Challenge, Reward

def seed_challenges():
    print("🎯 Seeding Challenges...")
    
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = today_start + timedelta(days=7)
    month_end = today_start + timedelta(days=30)
    
    challenges = [
        # Daily Challenges
        {
            'name': 'Daily Grind',
            'description': 'Complete 3 tasks today',
            'icon': '📋',
            'challenge_type': 'daily',
            'activity_type': 'tasks_completed',
            'target_count': 3,
            'start_date': today_start,
            'end_date': today_start + timedelta(days=1),
            'reward_credits': 30,
        },
        {
            'name': 'Bug Squasher',
            'description': 'Fix 2 bugs today',
            'icon': '🐛',
            'challenge_type': 'daily',
            'activity_type': 'bugs_fixed',
            'target_count': 2,
            'start_date': today_start,
            'end_date': today_start + timedelta(days=1),
            'reward_credits': 40,
        },
        # Weekly Challenges
        {
            'name': 'Weekly Warrior',
            'description': 'Complete 15 tasks this week',
            'icon': '⚔️',
            'challenge_type': 'weekly',
            'activity_type': 'tasks_completed',
            'target_count': 15,
            'start_date': today_start,
            'end_date': week_end,
            'reward_credits': 150,
        },
        {
            'name': 'Credit Hunter',
            'description': 'Earn 200 Credits this week',
            'icon': '💰',
            'challenge_type': 'weekly',
            'activity_type': 'credits_earned',
            'target_count': 200,
            'start_date': today_start,
            'end_date': week_end,
            'reward_credits': 100,
        },
        {
            'name': 'Streak Master',
            'description': 'Maintain a 7-day streak',
            'icon': '🔥',
            'challenge_type': 'weekly',
            'activity_type': 'streak_days',
            'target_count': 7,
            'start_date': today_start,
            'end_date': week_end,
            'reward_credits': 200,
        },
    ]
    
    for c in challenges:
        obj, created = Challenge.objects.get_or_create(
            name=c['name'],
            defaults=c
        )
        if created:
            print(f"   ✅ Created: {c['icon']} {c['name']}")
        else:
            print(f"   ℹ️ Exists: {c['name']}")


def seed_rewards():
    print("\n🎁 Seeding Rewards...")
    
    rewards = [
        {
            'name': 'Rising Star',
            'description': 'Display "Rising Star" under your name',
            'icon': '⭐',
            'cost_credits': 200,
            'effect_type': 'title',
            'effect_value': 'Rising Star',
        },
        {
            'name': 'Code Ninja',
            'description': 'Unlock the "Code Ninja" title',
            'icon': '🥷',
            'cost_credits': 300,
            'effect_type': 'title',
            'effect_value': 'Code Ninja',
        },
        {
            'name': 'Gold Frame',
            'description': 'Premium gold border for your profile',
            'icon': '🌟',
            'cost_credits': 500,
            'effect_type': 'badge_frame',
            'effect_value': 'gold',
        },
        {
            'name': 'Champion',
            'description': 'Exclusive "Champion" title',
            'icon': '🏆',
            'cost_credits': 1000,
            'effect_type': 'title',
            'effect_value': 'Champion',
        },
        {
            'name': 'Blue Name',
            'description': 'Display your name in blue',
            'icon': '💙',
            'cost_credits': 400,
            'effect_type': 'name_color',
            'effect_value': '#3B82F6',
        },
        {
            'name': 'Fire Effect',
            'description': 'Animated fire effect on profile',
            'icon': '🔥',
            'cost_credits': 750,
            'effect_type': 'profile_effect',
            'effect_value': 'fire',
        },
        {
            'name': 'Legend',
            'description': 'The ultimate "Legend" title',
            'icon': '👑',
            'cost_credits': 5000,
            'effect_type': 'title',
            'effect_value': 'Legend',
        },
    ]
    
    for r in rewards:
        obj, created = Reward.objects.get_or_create(
            name=r['name'],
            defaults=r
        )
        if created:
            print(f"   ✅ Created: {r['icon']} {r['name']} ({r['cost_credits']} Credits)")
        else:
            print(f"   ℹ️ Exists: {r['name']}")


if __name__ == "__main__":
    seed_challenges()
    seed_rewards()
    print("\n✅ Done!")
