from django.db import models
import uuid

class ReportDefinition(models.Model):
    """Saved report configurations"""
    report_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    # Can use either a Dataset or direct model
    dataset = models.ForeignKey('Dataset', on_delete=models.SET_NULL, null=True, blank=True, related_name='reports')
    primary_model = models.CharField(max_length=255, blank=True, null=True, help_text="Legacy: direct model reference")
    
    columns = models.JSONField(default=list)
    filters = models.JSONField(default=dict)
    
    DISPLAY_TYPE_CHOICES = [
        ('table', 'Table'),
        ('advanced_table', 'Advanced Table'),
        ('ag_grid', 'Data Grid'),
    ]
    display_type = models.CharField(max_length=20, choices=DISPLAY_TYPE_CHOICES, default='table')
    
    runtime_filters = models.JSONField(default=list, blank=True, null=True, help_text="List of field names configurable at runtime")
    sort_config = models.JSONField(default=list, blank=True, null=True)
    chart_config = models.JSONField(default=dict, blank=True, null=True)
    
    is_public = models.BooleanField(default=False)
    created_by = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'report_definitions'
        ordering = ['-updated_at']

    def __str__(self):
        return self.name


class Dataset(models.Model):
    """
    Reusable data source defined by power users.
    Can be SQL query or ORM configuration.
    """
    QUERY_TYPE_CHOICES = [
        ('orm', 'ORM Query Builder'),
        ('sql', 'Raw SQL'),
    ]
    
    dataset_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    query_type = models.CharField(max_length=10, choices=QUERY_TYPE_CHOICES, default='orm')
    
    # For ORM-based queries
    primary_model = models.CharField(max_length=255, blank=True, null=True, help_text="e.g., pm.Tasks")
    joins = models.JSONField(default=list, blank=True, help_text="List of related models to join")
    
    # For SQL-based queries
    sql_query = models.TextField(blank=True, null=True, help_text="Raw SQL SELECT query")
    
    # Metadata
    is_active = models.BooleanField(default=True)
    is_public = models.BooleanField(default=True, help_text="Available to report builders")
    created_by = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'datasets'
        ordering = ['name']

    def __str__(self):
        return self.name


class DatasetColumn(models.Model):
    """
    Columns exposed by a Dataset.
    Power user defines which fields are available to report builders.
    """
    DATA_TYPE_CHOICES = [
        ('string', 'Text'),
        ('number', 'Number'),
        ('date', 'Date'),
        ('datetime', 'Date & Time'),
        ('boolean', 'Yes/No'),
    ]
    
    column_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='columns')
    
    # Technical name (DB column or alias)
    field_name = models.CharField(max_length=255, help_text="DB column name or SQL alias")
    
    # User-friendly display
    display_name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    data_type = models.CharField(max_length=20, choices=DATA_TYPE_CHOICES, default='string')
    
    # For calculated fields
    is_calculated = models.BooleanField(default=False)
    formula = models.TextField(blank=True, null=True, help_text="SQL expression for calculated fields")
    
    # Control visibility in report builder
    is_visible = models.BooleanField(default=True)
    is_filterable = models.BooleanField(default=True)
    is_sortable = models.BooleanField(default=True)
    
    sort_order = models.IntegerField(default=0)

    class Meta:
        db_table = 'dataset_columns'
        ordering = ['sort_order', 'display_name']

    def __str__(self):
        return f"{self.dataset.name}.{self.display_name}"
