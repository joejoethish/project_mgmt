from rest_framework import serializers
from .models import UserLevel, CreditLedger, GamificationRule, Achievement, UserAchievement
from pm.models import Members

class RuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = GamificationRule
        fields = ['rule_id', 'name', 'description', 'credits', 'event_name', 'conditions', 'is_active', 'version', 'created_at']
        read_only_fields = ['rule_id', 'version', 'created_at']

class LedgerSerializer(serializers.ModelSerializer):
    rule_name = serializers.CharField(source='rule.name', read_only=True)
    
    class Meta:
        model = CreditLedger
        fields = ['transaction_id', 'amount', 'reason', 'rule_name', 'created_at']

class UserLevelSerializer(serializers.ModelSerializer):
    member_name = serializers.SerializerMethodField()
    progress_percent = serializers.SerializerMethodField()
    remaining_for_next = serializers.SerializerMethodField()

    class Meta:
        model = UserLevel
        fields = [
            'member_id', 'member_name', 
            'total_credits', 'current_level', 'next_level_at',
            'progress_percent', 'remaining_for_next'
        ]

    def get_member_name(self, obj):
        try:
            m = Members.objects.get(member_id=obj.member_id)
            return f"{m.first_name} {m.last_name}"
        except:
            return "Unknown Member"

    def get_progress_percent(self, obj):
        if obj.next_level_at == 0: return 100
        return min(100, int((obj.total_credits / obj.next_level_at) * 100))

    def get_remaining_for_next(self, obj):
        return max(0, obj.next_level_at - obj.total_credits)


class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = ['achievement_id', 'name', 'description', 'icon', 'category']


class UserAchievementSerializer(serializers.ModelSerializer):
    achievement = AchievementSerializer(read_only=True)
    
    class Meta:
        model = UserAchievement
        fields = ['id', 'achievement', 'unlocked_at']
