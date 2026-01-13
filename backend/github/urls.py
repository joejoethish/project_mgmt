from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    GitHubOrganizationViewSet, RepositoryViewSet, 
    CommitViewSet, PullRequestViewSet, PeerReviewViewSet,
    GitHubDashboardView
)

router = DefaultRouter()
router.register(r'organizations', GitHubOrganizationViewSet, basename='github-org')
router.register(r'repos', RepositoryViewSet, basename='github-repo')
router.register(r'commits', CommitViewSet, basename='github-commit')
router.register(r'prs', PullRequestViewSet, basename='github-pr')
router.register(r'reviews', PeerReviewViewSet, basename='github-review')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', GitHubDashboardView.as_view(), name='github-dashboard'),
]
