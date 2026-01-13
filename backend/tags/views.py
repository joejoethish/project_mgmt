from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Count

from .models import Tags, EntityTags, TagCategory
from .serializers import (
    TagsSerializer, TagsListSerializer, EntityTagsSerializer,
    BulkTagSerializer, TagCategorySerializer, TagCategoryListSerializer
)


class TagCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Tag Categories CRUD
    
    Endpoints:
    - GET /api/tags/categories/ - List all categories
    - POST /api/tags/categories/ - Create a category
    - GET /api/tags/categories/{id}/ - Get category detail
    - PUT /api/tags/categories/{id}/ - Update category
    - DELETE /api/tags/categories/{id}/ - Delete category
    """
    queryset = TagCategory.objects.filter(is_active=True)
    serializer_class = TagCategorySerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'label', 'description']
    ordering_fields = ['sort_order', 'label', 'created_at']
    ordering = ['sort_order', 'label']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return TagCategoryListSerializer
        return TagCategorySerializer


class TagsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Tags CRUD operations
    
    Endpoints:
    - GET /api/tags/tags/ - List all tags
    - POST /api/tags/tags/ - Create a tag
    - GET /api/tags/tags/{id}/ - Get tag detail
    - PUT /api/tags/tags/{id}/ - Update tag
    - DELETE /api/tags/tags/{id}/ - Delete tag
    - GET /api/tags/tags/by_category/ - Get tags grouped by category
    - GET /api/tags/tags/popular/ - Get most used tags
    """
    queryset = Tags.objects.filter(is_active=True).select_related('category')
    serializer_class = TagsSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'is_system', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return TagsListSerializer
        return TagsSerializer
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Get tags grouped by category"""
        result = {}
        categories = TagCategory.objects.filter(is_active=True).order_by('sort_order')
        for cat in categories:
            tags = Tags.objects.filter(category=cat, is_active=True)
            result[cat.name] = {
                'category_id': str(cat.category_id),
                'label': cat.label,
                'icon': cat.icon,
                'color': cat.color,
                'tags': TagsListSerializer(tags, many=True).data
            }
        # Also include uncategorized tags
        uncategorized = Tags.objects.filter(category__isnull=True, is_active=True)
        if uncategorized.exists():
            result['uncategorized'] = {
                'category_id': None,
                'label': 'Uncategorized',
                'icon': '🏷️',
                'color': '#6b7280',
                'tags': TagsListSerializer(uncategorized, many=True).data
            }
        return Response(result)
    
    @action(detail=False, methods=['get'])
    def popular(self, request):
        """Get most used tags (top 10)"""
        tags = Tags.objects.annotate(
            usage=Count('entity_mappings')
        ).filter(is_active=True).order_by('-usage')[:10]
        return Response(TagsSerializer(tags, many=True).data)
    
    def destroy(self, request, *args, **kwargs):
        """Prevent deletion of system tags"""
        instance = self.get_object()
        if instance.is_system:
            return Response(
                {'error': 'System tags cannot be deleted'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)


class EntityTagsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for EntityTags - mapping tags to entities
    
    Endpoints:
    - GET /api/tags/entity-tags/ - List all mappings
    - POST /api/tags/entity-tags/ - Add tag to entity
    - DELETE /api/tags/entity-tags/{id}/ - Remove tag from entity
    - POST /api/tags/entity-tags/bulk_add/ - Add multiple tags to entities
    - POST /api/tags/entity-tags/bulk_remove/ - Remove tags from entities
    - GET /api/tags/entity-tags/for_entity/?entity_type=xxx&entity_id=xxx - Get tags for entity
    - GET /api/tags/entity-tags/by_tag/{tag_id}/ - Get entities with tag
    """
    queryset = EntityTags.objects.all().select_related('tag', 'tag__category')
    serializer_class = EntityTagsSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['entity_type', 'entity_id', 'tag']
    
    @action(detail=False, methods=['get'])
    def for_entity(self, request):
        """Get all tags for a specific entity"""
        entity_type = request.query_params.get('entity_type')
        entity_id = request.query_params.get('entity_id')
        
        if not entity_type or not entity_id:
            return Response(
                {'error': 'entity_type and entity_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        mappings = EntityTags.objects.filter(
            entity_type=entity_type,
            entity_id=entity_id
        ).select_related('tag', 'tag__category')
        
        return Response(EntityTagsSerializer(mappings, many=True).data)
    
    @action(detail=False, methods=['post'])
    def bulk_add(self, request):
        """Add multiple tags to multiple entities"""
        serializer = BulkTagSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        entity_type = serializer.validated_data['entity_type']
        entity_ids = serializer.validated_data['entity_ids']
        tag_ids = serializer.validated_data['tag_ids']
        
        created = []
        for entity_id in entity_ids:
            for tag_id in tag_ids:
                obj, was_created = EntityTags.objects.get_or_create(
                    tag_id=tag_id,
                    entity_type=entity_type,
                    entity_id=entity_id
                )
                if was_created:
                    created.append(obj)
        
        return Response({
            'message': f'Added {len(created)} tag mappings',
            'created': len(created)
        })
    
    @action(detail=False, methods=['post'])
    def bulk_remove(self, request):
        """Remove tags from entities"""
        serializer = BulkTagSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        entity_type = serializer.validated_data['entity_type']
        entity_ids = serializer.validated_data['entity_ids']
        tag_ids = serializer.validated_data['tag_ids']
        
        deleted, _ = EntityTags.objects.filter(
            tag_id__in=tag_ids,
            entity_type=entity_type,
            entity_id__in=entity_ids
        ).delete()
        
        return Response({
            'message': f'Removed {deleted} tag mappings',
            'deleted': deleted
        })
    
    @action(detail=False, methods=['get'], url_path='by_tag/(?P<tag_id>[^/.]+)')
    def by_tag(self, request, tag_id=None):
        """Get all entities with a specific tag"""
        entity_type = request.query_params.get('entity_type')
        
        queryset = EntityTags.objects.filter(tag_id=tag_id)
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type)
        
        return Response(EntityTagsSerializer(queryset, many=True).data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get tag usage statistics"""
        stats = EntityTags.objects.values('entity_type').annotate(
            count=Count('entity_tag_id')
        ).order_by('entity_type')
        
        by_tag = EntityTags.objects.values(
            'tag__name', 'tag__color'
        ).annotate(count=Count('entity_tag_id')).order_by('-count')[:10]
        
        by_category = EntityTags.objects.values(
            'tag__category__label'
        ).annotate(count=Count('entity_tag_id')).order_by('-count')
        
        return Response({
            'by_entity_type': list(stats),
            'top_tags': list(by_tag),
            'by_category': list(by_category),
            'total_mappings': EntityTags.objects.count()
        })
