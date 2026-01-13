from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ReportDefinitionViewSet, 
    DatasetViewSet,
    DatasetColumnViewSet,
    SchemaView, 
    SchemaView, 
    PreviewView,
    OptionsView,
    FixColumnsView
)

router = DefaultRouter()
router.register(r'definitions', ReportDefinitionViewSet)
router.register(r'datasets', DatasetViewSet)
router.register(r'columns', DatasetColumnViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('schema/', SchemaView.as_view(), name='schema'),
    path('preview/', PreviewView.as_view(), name='preview'),
    path('options/', OptionsView.as_view(), name='options'),
    path('fix-columns/', FixColumnsView.as_view(), name='fix-columns'),
]

