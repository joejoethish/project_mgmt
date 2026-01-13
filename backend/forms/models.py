from django.db import models
from django.utils import timezone


class FormSubmission(models.Model):
    """Store submitted form data"""
    form_type = models.CharField(max_length=100, help_text="Form identifier (e.g., 'daily-status', 'peer-review')")
    form_title = models.CharField(max_length=255)
    submitted_by = models.CharField(max_length=100, null=True, blank=True, help_text="User who submitted the form")
    submission_data = models.JSONField(help_text="Complete form data as JSON")
    submitted_at = models.DateTimeField(default=timezone.now, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    class Meta:
        ordering = ['-submitted_at']
        verbose_name = 'Form Submission'
        verbose_name_plural = 'Form Submissions'
        indexes = [
            models.Index(fields=['-submitted_at']),
            models.Index(fields=['form_type']),
        ]
    
    def __str__(self):
        return f"{self.form_title} - {self.submitted_at.strftime('%Y-%m-%d %H:%M')}"


class FormDefinition(models.Model):
    """Store form templates (optional - for dynamic forms)"""
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, help_text="URL-friendly identifier")
    description = models.TextField(blank=True)
    definition = models.JSONField(help_text="Form structure as JSON")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['title']
        verbose_name = 'Form Definition'
        verbose_name_plural = 'Form Definitions'
    
    def __str__(self):
        return self.title
