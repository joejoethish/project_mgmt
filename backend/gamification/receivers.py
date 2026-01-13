from django.dispatch import receiver
from pm.signals import task_status_changed
from gamification.models import GamificationRule, CreditLedger, UserLevel
from django.db import transaction

@receiver(task_status_changed)
def handle_task_status_changed(sender, instance, old_status, new_status, actor, **kwargs):
    """
    Listen to Task changes and award credits.
    """
    print(f"🎮 Gamification Receiver Triggered: {old_status} -> {new_status} by {actor}")
    
    if not actor:
        return

    # 1. Check for 'Task Completion' rule
    # In real world, we check Rule Conditions. For now, hardcode logic mapped to Rule Name.
    # Start Simple: If New Status == 'Completed' (or Done)
    
    is_completion = False
    if new_status and new_status.name.lower() in ['completed', 'done', 'approved']:
        is_completion = True
    
    if is_completion:
        # Find Rule
        rule = GamificationRule.objects.filter(event_name='task_completed', is_active=True).first()
        if rule:
            # Check if not already awarded for this task?
            # Ledger prevents duplicates? Or we allow re-earning?
            # Ideally unique per task completion.
            exists = CreditLedger.objects.filter(
                object_id=instance.task_id, 
                rule=rule
            ).exists()
            
            if not exists:
                with transaction.atomic():
                    # Award Credits
                    CreditLedger.objects.create(
                        member_id=actor.member_id,
                        amount=rule.credits,
                        reason=f"Task Completed: {instance.name}",
                        rule=rule,
                        content_object=instance
                    )
                    
                    # Update Level
                    _update_user_level(actor.member_id, rule.credits, instance.name)
                    print(f"   💰 Awarded {rule.credits} Credits to {actor.first_name}")

def _update_user_level(member_id, credits_earned=0, task_name=""):
    from django.db.models import Sum
    from gamification.services import check_achievements, create_notification
    
    total = CreditLedger.objects.filter(member_id=member_id).aggregate(Sum('amount'))['amount__sum'] or 0
    
    ul, _ = UserLevel.objects.get_or_create(member_id=member_id)
    old_level = ul.current_level
    ul.total_credits = total
    ul.calculate_level()
    
    # Create credit notification
    if credits_earned > 0:
        create_notification(
            member_id=str(member_id),
            notification_type='credit',
            title=f"+{credits_earned} Credits Earned!",
            message=f"You earned credits for: {task_name}",
            icon='💰',
            link='/impact'
        )
    
    # Check for level up
    if ul.current_level != old_level:
        create_notification(
            member_id=str(member_id),
            notification_type='level_up',
            title=f"🚀 Level Up!",
            message=f"Congratulations! You reached {ul.current_level}!",
            icon='🚀',
            link='/impact'
        )
    
    # Check for new achievements
    newly_unlocked = check_achievements(member_id)
    if newly_unlocked:
        for a in newly_unlocked:
            create_notification(
                member_id=str(member_id),
                notification_type='achievement',
                title=f"New Badge: {a.name}!",
                message=a.description,
                icon=a.icon,
                link='/impact'
            )
            print(f"   🏅 NEW ACHIEVEMENT: {a.icon} {a.name}")
    
    # Update streak
    from gamification.models import UserStreak
    streak, _ = UserStreak.objects.get_or_create(member_id=member_id)
    old_streak = streak.current_streak
    new_streak = streak.update_streak()
    
    # Notify on streak milestones
    if new_streak in [7, 14, 30, 60, 100] and new_streak != old_streak:
        create_notification(
            member_id=str(member_id),
            notification_type='system',
            title=f"🔥 {new_streak}-Day Streak!",
            message=f"Amazing! You've been active for {new_streak} consecutive days!",
            icon='🔥',
            link='/impact'
        )
        print(f"   🔥 STREAK MILESTONE: {new_streak} days!")

from github.signals import commit_synced

@receiver(commit_synced)
def handle_commit_synced(sender, commit, created, **kwargs):
    """
    Award credits for GitHub commits if email matches a Member.
    """
    if not commit.author_email:
        return

    # Check mapping
    from pm.models import Members
    member = Members.objects.filter(email=commit.author_email).first()
    
    if member:
        # Find or Create Rule
        rule, _ = GamificationRule.objects.get_or_create(
            event_name='code_commit',
            defaults={
                'name': 'Code Commit',
                'description': 'Awarded for every commit synced from GitHub',
                'credits': 5,
                'is_active': True
            }
        )
        
        if not rule.is_active:
            return

        # Check for duplication (Idempotency)
        exists = CreditLedger.objects.filter(
            object_id=commit.commit_id,
            rule=rule
        ).exists()
        
        if not exists:
            # Award Credits
            CreditLedger.objects.create(
                member_id=member.member_id,
                amount=rule.credits,
                reason=f"Commit: {commit.message[:30]}...",
                rule=rule,
                content_object=commit
            )
            
            # Update Link using Member ID string
            _update_user_level(member.member_id, rule.credits, f"Commit {commit.sha[:7]}")
            print(f"   💻 Awarded {rule.credits} Credits to {member.first_name} for commit")
    else:
        print(f"   ⚠️ No member found for commit author: {commit.author_email}")
