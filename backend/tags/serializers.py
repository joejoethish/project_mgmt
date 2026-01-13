from rest_framework import serializers
from .models import Tags, EntityTags, TagCategory


class TagCategorySerializer(serializers.ModelSerializer):
    """Serializer for Tag Categories"""
    tags_count = serializers.SerializerMethodField()
    
    class Meta:
        model = TagCategory
        fields = [
            'category_id', 'name', 'label', 'icon', 'color',
            'description', 'sort_order', 'is_active',
            'created_at', 'updated_at', 'tags_count'
        ]
        read_only_fields = ['category_id', 'created_at', 'updated_at', 'tags_count']
    
    def get_tags_count(self, obj):
        return obj.tags.count()


class TagCategoryListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for dropdown lists"""
    class Meta:
        model = TagCategory
        fields = ['category_id', 'name', 'label', 'icon', 'color']


class TagsSerializer(serializers.ModelSerializer):
    """Serializer for Tags - includes usage count"""
    usage_count = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_label = serializers.CharField(source='category.label', read_only=True)
    category_icon = serializers.CharField(source='category.icon', read_only=True)
    
    class Meta:
        model = Tags
        fields = [
            'tag_id', 'name', 'slug', 'color', 'category',
            'category_name', 'category_label', 'category_icon',
            'description', 'icon', 'is_system', 'is_active',
            'created_at', 'updated_at', 'usage_count'
        ]
        read_only_fields = ['tag_id', 'created_at', 'updated_at', 'usage_count']
    
    def get_usage_count(self, obj):
        return obj.entity_mappings.count()


class TagsListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for dropdown lists"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_label = serializers.CharField(source='category.label', read_only=True)
    category_icon = serializers.CharField(source='category.icon', read_only=True)
    
    class Meta:
        model = Tags
        fields = ['tag_id', 'name', 'slug', 'color', 'category', 'category_name', 'category_label', 'category_icon']


class EntityTagsSerializer(serializers.ModelSerializer):
    """Serializer for EntityTags mapping"""
    tag_name = serializers.CharField(source='tag.name', read_only=True)
    tag_color = serializers.CharField(source='tag.color', read_only=True)
    tag_category = serializers.CharField(source='tag.category.name', read_only=True)
    
    class Meta:
        model = EntityTags
        fields = [
            'entity_tag_id', 'tag', 'tag_name', 'tag_color', 'tag_category',
            'entity_type', 'entity_id', 'created_at', 'created_by'
        ]
        read_only_fields = ['entity_tag_id', 'created_at']


class BulkTagSerializer(serializers.Serializer):
    """Serializer for bulk tag/untag operations"""
    entity_type = serializers.ChoiceField(choices=EntityTags.ENTITY_TYPE_CHOICES)
    entity_ids = serializers.ListField(child=serializers.CharField())
    tag_ids = serializers.ListField(child=serializers.UUIDField())


class EntityTagsRequestSerializer(serializers.Serializer):
    """Serializer for getting tags of an entity"""
    entity_type = serializers.ChoiceField(choices=EntityTags.ENTITY_TYPE_CHOICES)
    entity_id = serializers.CharField()
