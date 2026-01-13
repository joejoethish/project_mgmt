from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    GamificationProfileView, LeaderboardViewSet, NotificationViewSet,
    ChallengesViewSet, RewardsViewSet, GamificationRulesViewSet
)

router = DefaultRouter()
router.register(r'leaderboard', LeaderboardViewSet, basename='leaderboard')
router.register(r'notifications', NotificationViewSet, basename='notifications')
router.register(r'challenges', ChallengesViewSet, basename='challenges')
router.register(r'rewards', RewardsViewSet, basename='rewards')
router.register(r'rules', GamificationRulesViewSet, basename='rules')

urlpatterns = [
    path('profile/', GamificationProfileView.as_view(), name='gamification-profile'),
    path('', include(router.urls)),
]

