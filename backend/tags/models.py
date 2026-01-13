"""
Universal Tags System - Models
Tags can be applied to any entity (Project, Task, Employee, Member, etc.)
Categories are managed via Dynamic Masters for flexibility.
"""
from django.db import models
import uuid


class TagCategory(models.Model):
    """Dynamic Tag Categories - managed separately for flexibility"""
    category_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)  # e.g., 'priority'
    label = models.CharField(max_length=100)  # e.g., 'Priority'
    icon = models.CharField(max_length=50, blank=True, default='🏷️')
    color = models.CharField(max_length=7, default='#6366f1')
    description = models.TextField(blank=True, null=True)
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tag_categories'
        ordering = ['sort_order', 'label']
        verbose_name_plural = 'Tag Categories'
    
    def __str__(self):
        return f"{self.icon} {self.label}"


class Tags(models.Model):
    """Master Tags table - defines all available tags"""
    
    tag_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    color = models.CharField(max_length=7, default='#6366f1')  # Hex color
    category = models.ForeignKey(
        TagCategory, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='tags'
    )
    description = models.TextField(blank=True, null=True)
    icon = models.CharField(max_length=50, blank=True, null=True)  # Icon name
    is_system = models.BooleanField(default=False)  # System tags can't be deleted
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tags'
        ordering = ['category', 'name']
        verbose_name_plural = 'Tags'
    
    def __str__(self):
        return f"{self.name} ({self.category})"
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self.name.lower().replace(' ', '-')
        super().save(*args, **kwargs)


class EntityTags(models.Model):
    """Maps tags to any entity type"""
    
    ENTITY_TYPE_CHOICES = [
        ('project', 'Project'),
        ('task', 'Task'),
        ('employee', 'Employee'),
        ('member', 'Member'),
        ('sprint', 'Sprint'),
        ('team', 'Team'),
        ('department', 'Department'),
    ]
    
    entity_tag_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tag = models.ForeignKey(Tags, on_delete=models.CASCADE, related_name='entity_mappings')
    entity_type = models.CharField(max_length=50, choices=ENTITY_TYPE_CHOICES)
    entity_id = models.CharField(max_length=36)  # UUID as string for flexibility
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(max_length=36, blank=True, null=True)  # member_id who added
    
    class Meta:
        db_table = 'entity_tags'
        unique_together = ['tag', 'entity_type', 'entity_id']
        indexes = [
            models.Index(fields=['entity_type', 'entity_id']),
            models.Index(fields=['tag']),
        ]
    
    def __str__(self):
        return f"{self.tag.name} → {self.entity_type}:{self.entity_id}"
