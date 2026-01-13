from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import viewsets, permissions
from .models import UserLevel, CreditLedger, Achievement, UserAchievement, GamificationRule
from .serializers import UserLevelSerializer, LedgerSerializer, AchievementSerializer, UserAchievementSerializer, RuleSerializer

class GamificationProfileView(APIView):
    """
    Get current user's Gamification Profile (Level + History + Achievements).
    """
    def get(self, request):
        member_id = request.query_params.get('member_id')
        if not member_id:
            return Response({'error': 'member_id required'}, status=400)

        # 1. Get Level Stats
        user_level, _ = UserLevel.objects.get_or_create(member_id=member_id)
        level_data = UserLevelSerializer(user_level).data
        
        # 2. Get Recent History (Last 10)
        history = CreditLedger.objects.filter(member_id=member_id).order_by('-created_at')[:10]
        history_data = LedgerSerializer(history, many=True).data
        
        # 3. Get User's Unlocked Achievements
        user_achievements = UserAchievement.objects.filter(member_id=member_id).select_related('achievement')
        unlocked_data = UserAchievementSerializer(user_achievements, many=True).data
        
        # 4. Get All Available Achievements (for display with locked state)
        all_achievements = Achievement.objects.filter(is_active=True)
        all_data = AchievementSerializer(all_achievements, many=True).data
        
        # Mark unlocked status
        unlocked_ids = set(ua.achievement_id for ua in user_achievements)
        for a in all_data:
            a['unlocked'] = a['achievement_id'] in [str(uid) for uid in unlocked_ids]
        
        # 5. Get Streak Data
        from .models import UserStreak
        streak, _ = UserStreak.objects.get_or_create(member_id=member_id)
        streak_data = {
            'current_streak': streak.current_streak,
            'longest_streak': streak.longest_streak,
            'total_active_days': streak.total_active_days,
            'last_activity': streak.last_activity_date.isoformat() if streak.last_activity_date else None
        }
        
        return Response({
            'stats': level_data,
            'recent_activity': history_data,
            'achievements': all_data,
            'unlocked_count': len(unlocked_ids),
            'total_achievements': len(all_data),
            'streak': streak_data
        })

class LeaderboardViewSet(viewsets.ViewSet):
    """
    Get Top Contributors with period filtering.
    Query params: ?period=weekly|monthly|all-time&limit=10
    """
    def list(self, request):
        from django.db.models import Sum
        from django.utils import timezone
        from datetime import timedelta
        from pm.models import Members
        
        period = request.query_params.get('period', 'all-time')
        limit = int(request.query_params.get('limit', 10))
        
        # Determine date filter
        if period == 'weekly':
            start_date = timezone.now() - timedelta(days=7)
        elif period == 'monthly':
            start_date = timezone.now() - timedelta(days=30)
        else:
            start_date = None
        
        # Aggregate credits from ledger
        ledger_qs = CreditLedger.objects.all()
        if start_date:
            ledger_qs = ledger_qs.filter(created_at__gte=start_date)
        
        # Group by member and sum
        rankings = ledger_qs.values('member_id').annotate(
            period_credits=Sum('amount')
        ).order_by('-period_credits')[:limit]
        
        # Enrich with member details
        results = []
        for rank, entry in enumerate(rankings, 1):
            member_id = entry['member_id']
            try:
                member = Members.objects.get(member_id=member_id)
                name = f"{member.first_name} {member.last_name}"
            except Members.DoesNotExist:
                name = "Unknown"
            
            # Get user level for total credits
            user_level = UserLevel.objects.filter(member_id=member_id).first()
            
            results.append({
                'rank': rank,
                'member_id': str(member_id),
                'name': name,
                'period_credits': entry['period_credits'],
                'total_credits': user_level.total_credits if user_level else 0,
                'level': user_level.current_level if user_level else 'Novice'
            })
        
        return Response({
            'period': period,
            'rankings': results
        })


class NotificationViewSet(viewsets.ViewSet):
    """
    User notifications API.
    """
    def list(self, request):
        """Get user's notifications."""
        from .models import Notification
        
        member_id = request.query_params.get('member_id')
        if not member_id:
            return Response({'error': 'member_id required'}, status=400)
        
        notifications = Notification.objects.filter(member_id=member_id)[:20]
        unread_count = Notification.objects.filter(member_id=member_id, is_read=False).count()
        
        data = [{
            'notification_id': str(n.notification_id),
            'type': n.notification_type,
            'title': n.title,
            'message': n.message,
            'icon': n.icon,
            'is_read': n.is_read,
            'link': n.link,
            'created_at': n.created_at.isoformat()
        } for n in notifications]
        
        return Response({
            'notifications': data,
            'unread_count': unread_count
        })
    
    def create(self, request):
        """Mark notifications as read."""
        from .models import Notification
        
        notification_ids = request.data.get('notification_ids', [])
        member_id = request.data.get('member_id')
        mark_all = request.data.get('mark_all', False)
        
        if mark_all and member_id:
            Notification.objects.filter(member_id=member_id).update(is_read=True)
        elif notification_ids:
            Notification.objects.filter(notification_id__in=notification_ids).update(is_read=True)
        
        return Response({'status': 'ok'})


class ChallengesViewSet(viewsets.ViewSet):
    """
    Challenges API - list active, join, get user progress.
    """
    def list(self, request):
        """List active challenges with user progress."""
        from .models import Challenge, UserChallenge
        from django.utils import timezone
        
        member_id = request.query_params.get('member_id')
        now = timezone.now()
        
        # Get active challenges
        active_challenges = Challenge.objects.filter(
            is_active=True,
            start_date__lte=now,
            end_date__gte=now
        )
        
        result = []
        for c in active_challenges:
            # Check if user joined
            user_challenge = None
            if member_id:
                user_challenge = UserChallenge.objects.filter(
                    member_id=member_id, challenge=c
                ).first()
            
            result.append({
                'challenge_id': str(c.challenge_id),
                'name': c.name,
                'description': c.description,
                'icon': c.icon,
                'challenge_type': c.challenge_type,
                'activity_type': c.activity_type,
                'target_count': c.target_count,
                'reward_credits': c.reward_credits,
                'end_date': c.end_date.isoformat(),
                'joined': user_challenge is not None,
                'progress': user_challenge.progress if user_challenge else 0,
                'completed': user_challenge.completed if user_challenge else False,
            })
        
        return Response({'challenges': result})
    
    def create(self, request):
        """Join a challenge."""
        from .models import Challenge, UserChallenge
        
        member_id = request.data.get('member_id')
        challenge_id = request.data.get('challenge_id')
        
        if not member_id or not challenge_id:
            return Response({'error': 'member_id and challenge_id required'}, status=400)
        
        challenge = Challenge.objects.filter(challenge_id=challenge_id).first()
        if not challenge:
            return Response({'error': 'Challenge not found'}, status=404)
        
        user_challenge, created = UserChallenge.objects.get_or_create(
            member_id=member_id,
            challenge=challenge
        )
        
        return Response({
            'status': 'joined' if created else 'already_joined',
            'progress': user_challenge.progress,
            'target': challenge.target_count
        })


class RewardsViewSet(viewsets.ViewSet):
    """
    Rewards Store API - list and redeem.
    """
    def list(self, request):
        """List all active rewards."""
        from .models import Reward, RewardRedemption, UserLevel
        
        member_id = request.query_params.get('member_id')
        rewards = Reward.objects.filter(is_active=True)
        
        # Get user's credits
        user_credits = 0
        if member_id:
            ul = UserLevel.objects.filter(member_id=member_id).first()
            user_credits = ul.total_credits if ul else 0
        
        # Get user's owned rewards
        owned_ids = set()
        if member_id:
            owned_ids = set(
                RewardRedemption.objects.filter(member_id=member_id, status='active')
                .values_list('reward_id', flat=True)
            )
        
        result = []
        for r in rewards:
            result.append({
                'reward_id': str(r.reward_id),
                'name': r.name,
                'description': r.description,
                'icon': r.icon,
                'cost_credits': r.cost_credits,
                'effect_type': r.effect_type,
                'effect_value': r.effect_value,
                'owned': r.reward_id in owned_ids,
                'can_afford': user_credits >= r.cost_credits,
            })
        
        return Response({
            'rewards': result,
            'user_credits': user_credits
        })
    
    def create(self, request):
        """Redeem a reward."""
        from .models import Reward, RewardRedemption, UserLevel, CreditLedger
        from django.db import transaction
        
        member_id = request.data.get('member_id')
        reward_id = request.data.get('reward_id')
        
        if not member_id or not reward_id:
            return Response({'error': 'member_id and reward_id required'}, status=400)
        
        reward = Reward.objects.filter(reward_id=reward_id, is_active=True).first()
        if not reward:
            return Response({'error': 'Reward not found'}, status=404)
        
        # Check if already owned
        if RewardRedemption.objects.filter(member_id=member_id, reward=reward, status='active').exists():
            return Response({'error': 'Already owned'}, status=400)
        
        # Check credits
        ul = UserLevel.objects.filter(member_id=member_id).first()
        if not ul or ul.total_credits < reward.cost_credits:
            return Response({'error': 'Not enough credits'}, status=400)
        
        with transaction.atomic():
            # Deduct credits (negative transaction)
            CreditLedger.objects.create(
                member_id=member_id,
                amount=-reward.cost_credits,
                reason=f"Redeemed: {reward.name}",
            )
            
            # Update user level
            ul.total_credits -= reward.cost_credits
            ul.save()
            
            # Create redemption
            RewardRedemption.objects.create(
                member_id=member_id,
                reward=reward,
                status='active'
            )
        
        return Response({
            'status': 'redeemed',
            'reward': reward.name,
            'remaining_credits': ul.total_credits
        })


class GamificationRulesViewSet(viewsets.ModelViewSet):
    """
    CRUD for Gamification Rules (Credit assignment rules).
    Only admins/superusers should have write access.
    """
    queryset = GamificationRule.objects.all().order_by('-created_at')
    serializer_class = RuleSerializer
    
    def get_queryset(self):
        qs = super().get_queryset()
        # Filter by event_name if provided
        event_name = self.request.query_params.get('event_name')
        if event_name:
            qs = qs.filter(event_name=event_name)
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        return qs
    
    def perform_create(self, serializer):
        serializer.save()
    
    def perform_update(self, serializer):
        # Increment version on update
        instance = serializer.instance
        serializer.save(version=instance.version + 1)

