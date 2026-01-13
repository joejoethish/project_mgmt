from django.db import models
from django.contrib.auth.models import User
from django.core.validators import RegexValidator


class BaseModel(models.Model):
    """Abstract base model with common fields"""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        abstract = True


class DynamicMaster(BaseModel):
    """User-defined master table definitions"""
    name = models.CharField(
        max_length=100, 
        unique=True,
        validators=[RegexValidator(r'^[a-z_][a-z0-9_]*$', 'Name must be lowercase with underscores only')]
    )
    display_name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True, default='📋')
    table_name = models.CharField(max_length=100, unique=True, editable=False)
    
    # Settings
    is_searchable = models.BooleanField(default=True)
    is_exportable = models.BooleanField(default=True)
    allow_duplicate = models.BooleanField(default=False)
    
    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_masters')
    
    class Meta:
        ordering = ['display_name']
        verbose_name = 'Dynamic Master'
        verbose_name_plural = 'Dynamic Masters'
    
    def __str__(self):
        return self.display_name
    
    def save(self, *args, **kwargs):
        if not self.table_name:
            self.table_name = f'dm_{self.name}'
        super().save(*args, **kwargs)


class DynamicMasterField(models.Model):
    """Field definitions for dynamic masters"""
    
    FIELD_TYPES = [
        ('text', 'Text'),
        ('number', 'Number'),
        ('email', 'Email'),
        ('phone', 'Phone'),
        ('select', 'Dropdown'),
        ('date', 'Date'),
        ('datetime', 'Date & Time'),
        ('boolean', 'Yes/No'),
        ('textarea', 'Long Text'),
        ('url', 'URL'),
        ('color', 'Color Picker'),
    ]
    
    master = models.ForeignKey(DynamicMaster, on_delete=models.CASCADE, related_name='fields')
    field_name = models.CharField(
        max_length=100,
        validators=[RegexValidator(r'^[a-z_][a-z0-9_]*$', 'Field name must be lowercase with underscores')]
    )
    display_name = models.CharField(max_length=200)
    field_type = models.CharField(max_length=20, choices=FIELD_TYPES, default='text')
    
    # Constraints
    is_required = models.BooleanField(default=False)
    is_unique = models.BooleanField(default=False)
    max_length = models.IntegerField(blank=True, null=True)
    min_value = models.FloatField(blank=True, null=True)
    max_value = models.FloatField(blank=True, null=True)
    default_value = models.CharField(max_length=500, blank=True)
    
    # For select/dropdown - JSON array of options
    choices_json = models.JSONField(blank=True, null=True, help_text='Array of choices for dropdown')
    
    # Display
    order = models.IntegerField(default=0)
    help_text = models.CharField(max_length=500, blank=True)
    placeholder = models.CharField(max_length=200, blank=True)
    
    # Visibility
    show_in_list = models.BooleanField(default=True, help_text='Show in table listing')
    show_in_form = models.BooleanField(default=True, help_text='Show in create/edit form')
    
    class Meta:
        ordering = ['order']
        unique_together = ['master', 'field_name']
        verbose_name = 'Dynamic Master Field'
        verbose_name_plural = 'Dynamic Master Fields'
    
    def __str__(self):
        return f'{self.master.display_name} - {self.display_name}'


class DynamicMasterData(BaseModel):
    """Generic storage for all dynamic master data"""
    master = models.ForeignKey(DynamicMaster, on_delete=models.CASCADE, related_name='data_records')
    data = models.JSONField()
    
    # Audit fields
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='+')
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='+')
    
    class Meta:
        verbose_name = 'Dynamic Master Data'
        verbose_name_plural = 'Dynamic Master Data'
        indexes = [
            models.Index(fields=['master', 'is_active']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f'{self.master.display_name} - Record #{self.id}'


class MasterSchema(BaseModel):
    """Visual Master Builder schema storage"""
    name = models.CharField(
        max_length=100,
        unique=True,
        validators=[RegexValidator(r'^[a-zA-Z0-9_\s-]+$', 'Name can only contain letters, numbers, spaces, hyphens, and underscores')]
    )
    description = models.TextField(blank=True)
    
    # Schema data (ReactFlow nodes + edges)
    schema_data = models.JSONField(
        help_text='Stores nodes, edges, and metadata from Visual Master Builder'
    )
    
    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_schemas')
    version = models.IntegerField(default=1)
    
    class Meta:
        ordering = ['-updated_at']
        verbose_name = 'Master Schema'
        verbose_name_plural = 'Master Schemas'
    
    def __str__(self):
        return f'{self.name} (v{self.version})'

