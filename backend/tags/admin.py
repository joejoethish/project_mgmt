from django.contrib import admin
from .models import Tags, EntityTags


@admin.register(Tags)
class TagsAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'color', 'is_system', 'is_active', 'created_at']
    list_filter = ['category', 'is_system', 'is_active']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(EntityTags)
class EntityTagsAdmin(admin.ModelAdmin):
    list_display = ['tag', 'entity_type', 'entity_id', 'created_at']
    list_filter = ['entity_type', 'tag__category']
    search_fields = ['tag__name', 'entity_id']
