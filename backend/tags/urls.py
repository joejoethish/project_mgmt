from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TagsViewSet, EntityTagsViewSet, TagCategoryViewSet

router = DefaultRouter()
router.register(r'categories', TagCategoryViewSet, basename='tag-categories')
router.register(r'tags', TagsViewSet, basename='tags')
router.register(r'entity-tags', EntityTagsViewSet, basename='entity-tags')

urlpatterns = [
    path('', include(router.urls)),
]
