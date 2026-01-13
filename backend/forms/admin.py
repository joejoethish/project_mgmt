from django.contrib import admin
from .models import FormSubmission, FormDefinition


@admin.register(FormSubmission)
class FormSubmissionAdmin(admin.ModelAdmin):
    list_display = ['id', 'form_title', 'form_type', 'submitted_by', 'submitted_at', 'ip_address']
    list_filter = ['form_type', 'submitted_at']
    search_fields = ['form_title', 'form_type', 'submitted_by', 'submission_data']
    readonly_fields = ['submitted_at', 'ip_address']
    date_hierarchy = 'submitted_at'
    ordering = ['-submitted_at']
    
    fieldsets = (
        ('Form Information', {
            'fields': ('form_type', 'form_title', 'submitted_by')
        }),
        ('Submission Data', {
            'fields': ('submission_data',)
        }),
        ('Metadata', {
            'fields': ('submitted_at', 'ip_address'),
            'classes': ('collapse',)
        }),
    )


@admin.register(FormDefinition)
class FormDefinitionAdmin(admin.ModelAdmin):
    list_display = ['title', 'slug', 'is_active', 'created_at', 'updated_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['title', 'slug', 'description']
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'slug', 'description', 'is_active')
        }),
        ('Form Structure', {
            'fields': ('definition',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
