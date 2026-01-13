from django.urls import path
from . import views

app_name = 'forms'

urlpatterns = [
    # Form submission
    path('submit/', views.FormSubmissionCreateView.as_view(), name='submit'),
    
    # List submissions
    path('submissions/', views.FormSubmissionListView.as_view(), name='submissions-list'),
    
    # Get form definition by slug
    path('definitions/<slug:slug>/', views.FormDefinitionDetailView.as_view(), name='definition-detail'),
    
    # Health check
    path('health/', views.health_check, name='health'),
]
