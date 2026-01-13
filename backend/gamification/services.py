from gamification.models import Achievement, UserAchievement, UserLevel, CreditLedger
from django.db.models import Sum

def check_achievements(member_id: str):
    """
    Check if a user qualifies for any new achievements.
    Called after credits are awarded.
    """
    newly_unlocked = []
    
    # Get user stats
    user_level = UserLevel.objects.filter(member_id=member_id).first()
    total_credits = user_level.total_credits if user_level else 0
    
    # Count transactions (as proxy for tasks completed)
    tasks_completed = CreditLedger.objects.filter(
        member_id=member_id,
        rule__event_name='task_completed'
    ).count()
    
    # Get all achievements user doesn't have yet
    unlocked_ids = UserAchievement.objects.filter(member_id=member_id).values_list('achievement_id', flat=True)
    available = Achievement.objects.filter(is_active=True).exclude(achievement_id__in=unlocked_ids)
    
    for achievement in available:
        condition = achievement.unlock_condition
        unlocked = False
        
        # Check different condition types
        if 'total_credits' in condition:
            if total_credits >= condition['total_credits']:
                unlocked = True
        
        if 'tasks_completed' in condition:
            if tasks_completed >= condition['tasks_completed']:
                unlocked = True
        
        # Add more condition checks as needed...
        
        if unlocked:
            UserAchievement.objects.create(
                member_id=member_id,
                achievement=achievement
            )
            newly_unlocked.append(achievement)
            print(f"🏅 Achievement Unlocked: {achievement.name} for {member_id}")
    
    return newly_unlocked


def create_notification(member_id: str, notification_type: str, title: str, message: str, icon: str = '🔔', link: str = None):
    """
    Create an in-app notification for a user.
    """
    from gamification.models import Notification
    
    return Notification.objects.create(
        member_id=member_id,
        notification_type=notification_type,
        title=title,
        message=message,
        icon=icon,
        link=link
    )
