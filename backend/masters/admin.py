from django.contrib import admin
from .models import DynamicMaster, DynamicMasterField, DynamicMasterData


class DynamicMasterFieldInline(admin.TabularInline):
    model = DynamicMasterField
    extra = 1
    fields = ['field_name', 'display_name', 'field_type', 'is_required', 'order', 'show_in_list']


@admin.register(DynamicMaster)
class DynamicMasterAdmin(admin.ModelAdmin):
    list_display = ['display_name', 'name', 'table_name', 'is_active', 'created_at', 'created_by']
    list_filter = ['is_active', 'is_searchable', 'is_exportable']
    search_fields = ['name', 'display_name', 'description']
    readonly_fields = ['table_name', 'created_at', 'updated_at', 'created_by']
    inlines = [DynamicMasterFieldInline]
    
    def save_model(self, request, obj, form, change):
        if not change:  # Creating new
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(DynamicMasterField)
class DynamicMasterFieldAdmin(admin.ModelAdmin):
    list_display = ['display_name', 'master', 'field_name', 'field_type', 'is_required', 'order']
    list_filter = ['field_type', 'is_required', 'is_unique', 'show_in_list', 'show_in_form']
    search_fields = ['field_name', 'display_name', 'master__display_name']
    list_editable = ['order']
    ordering = ['master', 'order']


@admin.register(DynamicMasterData)
class DynamicMasterDataAdmin(admin.ModelAdmin):
    list_display = ['id', 'master', 'is_active', 'created_at', 'created_by']
    list_filter = ['master', 'is_active', 'created_at']
    search_fields = ['data']
    readonly_fields = ['created_at', 'updated_at', 'created_by', 'updated_by']
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)
