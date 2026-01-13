"""
Enhanced Dataset Execution Engine
Supports both SQL and ORM-based queries with multi-model JOINs
"""
from django.apps import apps
from django.db import connection
from django.db.models import F
from ..models import Dataset


class DatasetExecutor:
    @staticmethod
    def execute(dataset: Dataset, filters: dict = None, limit: int = 100):
        """Execute a dataset query and return results."""
        if dataset.query_type == 'sql':
            return DatasetExecutor._execute_sql(dataset, filters, limit)
        else:
            return DatasetExecutor._execute_orm(dataset, filters, limit)
    
    @staticmethod
    def _execute_sql(dataset: Dataset, filters: dict, limit: int):
        """Execute raw SQL query"""
        if not dataset.sql_query:
            return []
        
        sql = dataset.sql_query.strip()
        
        # Basic safety: only allow SELECT
        if not sql.upper().startswith('SELECT'):
            raise ValueError("Only SELECT queries are allowed")
        
        # Apply limit if not present
        if 'LIMIT' not in sql.upper():
            sql = f"{sql} LIMIT {limit}"
        
        with connection.cursor() as cursor:
            cursor.execute(sql)
            columns = [col[0] for col in cursor.description]
            results = []
            for row in cursor.fetchall():
                results.append(dict(zip(columns, row)))
        
        return results
    
    @staticmethod
    def _execute_orm(dataset: Dataset, filters: dict, limit: int):
        """Execute ORM-based query with multi-model support"""
        if not dataset.primary_model:
            return []
        
        try:
            app_label, model_name = dataset.primary_model.split('.')
            model = apps.get_model(app_label, model_name)
        except (ValueError, LookupError) as e:
            raise ValueError(f"Invalid model '{dataset.primary_model}': {str(e)}")
        
        # Start with all objects
        qs = model.objects.all()
        
        # Get visible columns from dataset definition
        visible_columns = list(
            dataset.columns.filter(is_visible=True).values_list('field_name', flat=True)
        )
        
        if not visible_columns:
            # Fallback: get all fields from primary model
            visible_columns = [f.name for f in model._meta.get_fields() 
                             if hasattr(f, 'get_internal_type') and not f.auto_created]
        
        # Validate fields exist before attempting query
        invalid_fields = []
        for col in visible_columns:
            try:
                # Try to resolve the field path
                if '__' in col:
                    # Relation field - check each part of the path
                    parts = col.split('__')
                    current_model = model
                    for i, part in enumerate(parts[:-1]):
                        try:
                            field = current_model._meta.get_field(part)
                            if hasattr(field, 'related_model') and field.related_model:
                                current_model = field.related_model
                            else:
                                invalid_fields.append(f"{col} ('{part}' is not a relation)")
                                break
                        except Exception:
                            invalid_fields.append(f"{col} ('{part}' not found in {current_model.__name__})")
                            break
                else:
                    # Direct field
                    model._meta.get_field(col)
            except Exception:
                invalid_fields.append(col)
        
        if invalid_fields:
            raise ValueError(f"Invalid column(s) in dataset: {', '.join(invalid_fields)}. Please edit the dataset to fix column paths.")
        
        # Separate direct fields from relation fields
        direct_fields = []
        relation_fields = {}  # field_path -> alias
        select_related_paths = set()
        
        for col in visible_columns:
            if '__' in col:
                # This is a relation field (e.g., project__name, project__owner__first_name)
                relation_fields[col] = col.replace('__', '_')  # Alias for annotate
                
                # Extract the relation path for select_related
                parts = col.split('__')
                for i in range(1, len(parts)):
                    select_related_paths.add('__'.join(parts[:i]))
            else:
                direct_fields.append(col)
        
        # Apply select_related for FK optimization
        if select_related_paths:
            try:
                qs = qs.select_related(*select_related_paths)
            except Exception as e:
                # Log but don't fail - some paths may not be valid for select_related
                print(f"select_related warning: {e}")
        
        # Apply filters
        if filters:
            try:
                qs = qs.filter(**filters)
            except Exception as e:
                raise ValueError(f"Filter error: {e}")
        
        # Build annotations for relation fields
        annotations = {}
        for field_path, alias in relation_fields.items():
            annotations[alias] = F(field_path)
        
        if annotations:
            try:
                qs = qs.annotate(**annotations)
            except Exception as e:
                raise ValueError(f"Cannot resolve field path(s). Error: {str(e)}. Check that all selected columns exist in the database schema.")
        
        # Build values list
        values_fields = direct_fields + list(relation_fields.values())
        
        try:
            qs = qs.values(*values_fields)
        except Exception as e:
            # Provide helpful error message
            raise ValueError(f"Query error: {str(e)}. Some columns may not exist. Please verify the dataset configuration.")
        
        # Apply limit and convert to list
        try:
            results = list(qs[:limit])
        except Exception as e:
            raise ValueError(f"Execution error: {str(e)}")
        
        # Rename aliased fields back to original paths for consistency
        if relation_fields:
            alias_to_path = {v: k for k, v in relation_fields.items()}
            normalized_results = []
            for row in results:
                normalized_row = {}
                for key, value in row.items():
                    if key in alias_to_path:
                        normalized_row[alias_to_path[key]] = value
                    else:
                        normalized_row[key] = value
                normalized_results.append(normalized_row)
            return normalized_results
        
        return results
    
    @staticmethod
    def get_columns(dataset: Dataset):
        """Get column metadata for a dataset"""
        columns = dataset.columns.filter(is_visible=True).order_by('sort_order')
        return [
            {
                'field_name': col.field_name,
                'display_name': col.display_name,
                'data_type': col.data_type,
                'is_filterable': col.is_filterable,
                'is_sortable': col.is_sortable,
            }
            for col in columns
        ]
    
    @staticmethod
    def infer_columns_from_model(app_label: str, model_name: str, include_relations: bool = True, max_depth: int = 2):
        """
        Infer available columns from a model including relation fields.
        Returns a list of column definitions that can be added to a dataset.
        """
        try:
            model = apps.get_model(app_label, model_name)
        except LookupError:
            return []
        
        from .schema import SchemaService
        schema = SchemaService.get_model_schema(app_label, model_name, include_relations=include_relations)
        
        if not schema:
            return []
        
        columns = []
        for idx, field in enumerate(schema.get('all_fields', [])):
            columns.append({
                'field_name': field['path'],
                'display_name': field['verbose_name'],
                'data_type': DatasetExecutor._map_django_type(field['type']),
                'is_visible': True,
                'is_filterable': True,
                'sort_order': idx
            })
        
        return columns
    
    @staticmethod
    def _map_django_type(django_type: str) -> str:
        """Map Django field types to dataset column types"""
        type_map = {
            'CharField': 'string',
            'TextField': 'string',
            'IntegerField': 'number',
            'FloatField': 'number',
            'DecimalField': 'number',
            'DateField': 'date',
            'DateTimeField': 'datetime',
            'BooleanField': 'boolean',
            'UUIDField': 'string',
        }
        return type_map.get(django_type, 'string')
