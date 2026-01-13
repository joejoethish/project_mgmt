from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
import uuid

class GamificationRule(models.Model):
    """
    Defines logic for earning Credits.
    Users (Admins) can create new rules over time.
    """
    rule_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    # Event Trigger
    event_name = models.CharField(max_length=100, help_text="e.g., task_completed, bug_fixed")
    
    # Points/Credits
    credits = models.IntegerField(default=10)
    
    # Versioning (for immutable history)
    version = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    
    # Conditions (JSON logic, optional)
    conditions = models.JSONField(default=dict, blank=True, help_text="e.g. {'priority': 'critical'}")
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (v{self.version})"

class CreditLedger(models.Model):
    """
    Immutable history of all Credit transactions.
    """
    transaction_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # User (linked to PM Member usually, or Auth User)
    # Using Generic or just Member ID for now. Let's use PM Member for consistency.
    member_id = models.UUIDField(help_text="Link to PM Member") # De-coupled FK to avoid circular import if possible, or string.
    # Actually, importing pm.Members is fine if 'gamification' is below 'pm'.
    # But for strict decoupling, using UUID is safer. OR GenericFK to User.
    # Let's import Members to be practical.
    
    amount = models.IntegerField()
    reason = models.CharField(max_length=255)
    
    # Rule Attribution
    rule = models.ForeignKey(GamificationRule, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Source Entity (Task, Bug, etc.)
    content_type = models.ForeignKey(ContentType, on_delete=models.SET_NULL, null=True)
    object_id = models.UUIDField(null=True) # UUID based keys
    content_object = GenericForeignKey('content_type', 'object_id')
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

class UserLevel(models.Model):
    """
    Cached stats for a user (Level, Total Credits).
    Updated via Signals when Ledger changes.
    """
    member_id = models.UUIDField(primary_key=True) # One record per member
    total_credits = models.IntegerField(default=0)
    current_level = models.CharField(max_length=50, default="Novice")
    next_level_at = models.IntegerField(default=100)
    
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_level(self):
        # dynamic logic
        if self.total_credits > 1000:
            self.current_level = "Expert"
            self.next_level_at = 5000
        elif self.total_credits > 500:
            self.current_level = "Intermediate"
            self.next_level_at = 1000
        else:
            self.current_level = "Novice"
            self.next_level_at = 500
        self.save()


class Achievement(models.Model):
    """
    Defines unlockable achievements/badges.
    """
    achievement_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, help_text="Emoji or icon class")
    
    # Unlock Conditions (JSON)
    # Examples: {"total_credits": 1000}, {"tasks_completed": 10}, {"streak_days": 7}
    unlock_condition = models.JSONField(default=dict)
    
    # Category for filtering
    category = models.CharField(max_length=50, default="general", 
                                choices=[("general", "General"), ("quality", "Quality"), 
                                        ("speed", "Speed"), ("milestone", "Milestone")])
    
    # Ordering for display
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['sort_order', 'name']

    def __str__(self):
        return f"{self.icon} {self.name}"


class UserAchievement(models.Model):
    """
    Tracks which achievements a user has unlocked.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member_id = models.UUIDField(db_index=True)
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE)
    unlocked_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['member_id', 'achievement']
        ordering = ['-unlocked_at']

    def __str__(self):
        return f"{self.member_id} - {self.achievement.name}"


class Notification(models.Model):
    """
    In-app notifications for gamification events.
    """
    NOTIFICATION_TYPES = [
        ('credit', 'Credits Earned'),
        ('achievement', 'Achievement Unlocked'),
        ('level_up', 'Level Up'),
        ('challenge', 'Challenge Update'),
        ('system', 'System'),
    ]
    
    notification_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member_id = models.UUIDField(db_index=True)
    
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default='system')
    title = models.CharField(max_length=255)
    message = models.TextField()
    icon = models.CharField(max_length=50, default='🔔')
    
    # Read status
    is_read = models.BooleanField(default=False)
    
    # Optional link
    link = models.CharField(max_length=255, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.member_id}"


class UserStreak(models.Model):
    """
    Tracks user's daily activity streaks.
    """
    member_id = models.UUIDField(primary_key=True)
    
    # Streak data
    current_streak = models.IntegerField(default=0)
    longest_streak = models.IntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)
    
    # Stats
    total_active_days = models.IntegerField(default=0)
    
    updated_at = models.DateTimeField(auto_now=True)
    
    def update_streak(self):
        """
        Called when user earns credits. Updates streak based on last activity.
        """
        from django.utils import timezone
        today = timezone.now().date()
        
        if self.last_activity_date is None:
            # First activity ever
            self.current_streak = 1
            self.total_active_days = 1
        elif self.last_activity_date == today:
            # Already active today, no change
            pass
        elif self.last_activity_date == today - timezone.timedelta(days=1):
            # Consecutive day - extend streak
            self.current_streak += 1
            self.total_active_days += 1
        else:
            # Streak broken - reset
            self.current_streak = 1
            self.total_active_days += 1
        
        # Update longest streak
        if self.current_streak > self.longest_streak:
            self.longest_streak = self.current_streak
        
        self.last_activity_date = today
        self.save()
        
        return self.current_streak
    
    def __str__(self):
        return f"{self.member_id} - {self.current_streak} day streak"


class Challenge(models.Model):
    """
    Defines time-bound challenges/quests.
    """
    CHALLENGE_TYPES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('sprint', 'Sprint'),
        ('team', 'Team Achievement'),
    ]
    
    ACTIVITY_TYPES = [
        ('tasks_completed', 'Tasks Completed'),
        ('bugs_fixed', 'Bugs Fixed'),
        ('sop_followed', 'SOP Compliance'),
        ('credits_earned', 'Credits Earned'),
        ('early_delivery', 'Early Deliveries'),
        ('code_reviews', 'Code Reviews'),
        ('streak_days', 'Streak Days'),
    ]
    
    challenge_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, default='🎯')
    
    challenge_type = models.CharField(max_length=20, choices=CHALLENGE_TYPES, default='daily')
    activity_type = models.CharField(max_length=50, choices=ACTIVITY_TYPES, default='tasks_completed')
    target_count = models.IntegerField(default=5)
    
    # Timing
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    
    # Reward
    reward_credits = models.IntegerField(default=50)
    
    # Team challenges
    is_team_challenge = models.BooleanField(default=False)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-start_date']
    
    def __str__(self):
        return f"{self.icon} {self.name}"


class UserChallenge(models.Model):
    """
    Tracks user's progress on a challenge.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member_id = models.UUIDField(db_index=True)
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE)
    
    progress = models.IntegerField(default=0)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    joined_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['member_id', 'challenge']
        ordering = ['-joined_at']
    
    def __str__(self):
        return f"{self.member_id} - {self.challenge.name} ({self.progress}/{self.challenge.target_count})"


class Reward(models.Model):
    """
    Defines rewards that can be redeemed with Credits.
    """
    EFFECT_TYPES = [
        ('title', 'Custom Title'),
        ('badge_frame', 'Badge Frame'),
        ('name_color', 'Name Color'),
        ('profile_effect', 'Profile Effect'),
    ]
    
    reward_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, default='🎁')
    
    cost_credits = models.IntegerField()
    category = models.CharField(max_length=50, default='recognition')
    
    # What happens when redeemed
    effect_type = models.CharField(max_length=50, choices=EFFECT_TYPES, default='title')
    effect_value = models.CharField(max_length=255, help_text="The title text, color code, etc.")
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['cost_credits']
    
    def __str__(self):
        return f"{self.icon} {self.name} ({self.cost_credits} Credits)"


class RewardRedemption(models.Model):
    """
    Tracks reward redemptions by users.
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('expired', 'Expired'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member_id = models.UUIDField(db_index=True)
    reward = models.ForeignKey(Reward, on_delete=models.CASCADE)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    redeemed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-redeemed_at']
    
    def __str__(self):
        return f"{self.member_id} - {self.reward.name}"
