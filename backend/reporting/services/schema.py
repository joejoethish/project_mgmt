"""
Enhanced Schema Service with FK Chain Discovery
Provides deep introspection of models and their relationships
"""
from django.apps import apps
from django.db.models import ForeignKey, OneToOneField, ManyToManyField, ManyToOneRel, ManyToManyRel

class SchemaService:
    ALLOWED_APPS = ['pm', 'hr', 'auth', 'contenttypes', 'forms'] # Added auth/contenttypes/forms for completeness
    MAX_DEPTH = 3  # Maximum relation depth to traverse
    
    @staticmethod
    def _get_field_choices(field):
        if hasattr(field, 'choices') and field.choices:
            return [{'value': k, 'label': str(v)} for k, v in field.choices]
        return None

    @staticmethod
    def get_models():
        """List all exposed models"""
        models_data = []
        for app_config in apps.get_app_configs():
            if app_config.label in SchemaService.ALLOWED_APPS:
                for model in app_config.get_models():
                    models_data.append({
                        'app_label': app_config.label,
                        'model_name': model.__name__,
                        'verbose_name': model._meta.verbose_name,
                        'full_key': f"{app_config.label}.{model.__name__}"
                    })
        return models_data

    @staticmethod
    def get_model_schema(app_label, model_name, include_relations=True):
        """Get fields and relations for a specific model"""
        try:
            model = apps.get_model(app_label, model_name)
        except LookupError:
            return None

        schema = {
            'model': f"{app_label}.{model_name}",
            'fields': [],
            'relations': [],
            'all_fields': []  # Flattened list including relation fields
        }

        # Get direct fields and relations
        for field in model._meta.get_fields():
            if field.auto_created and not field.is_relation:
                continue
            
            # Handle Forward Relations (FK, OneToOne, M2M)
            if isinstance(field, (ForeignKey, OneToOneField, ManyToManyField)):
                if field.related_model._meta.app_label in SchemaService.ALLOWED_APPS:
                    relation_info = {
                        'name': field.name,
                        'verbose_name': getattr(field, 'verbose_name', field.name),
                        'type': field.get_internal_type(),
                        'related_model': f"{field.related_model._meta.app_label}.{field.related_model.__name__}",
                    }
                    schema['relations'].append(relation_info)
                    
                    if include_relations:
                        nested_fields = SchemaService._get_nested_fields(
                            field.related_model, 
                            prefix=f"{field.name}__",
                            display_prefix=f"{getattr(field, 'verbose_name', field.name)} → ",
                            depth=1
                        )
                        schema['all_fields'].extend(nested_fields)

            # Handle Reverse Relations (Reverse FK, Reverse M2M)
            elif isinstance(field, (ManyToOneRel, ManyToManyRel)):
                 if field.related_model._meta.app_label in SchemaService.ALLOWED_APPS:
                    # For reverse relations, get_accessor_name() gives the name (e.g. 'task_set')
                    rel_name = field.get_accessor_name()
                    if rel_name:
                        relation_info = {
                            'name': rel_name,
                            'verbose_name': f"Reverse: {field.related_model._meta.verbose_name}",
                            'type': 'ReverseRelation',
                            'related_model': f"{field.related_model._meta.app_label}.{field.related_model.__name__}",
                        }
                        schema['relations'].append(relation_info)

            # Handle Direct Fields AND Foreign Keys (as fields)
            if hasattr(field, 'get_internal_type'):
                # For FKs, we want to allow selecting them as columns too (IDs)
                # But typically we filter on them.
                is_rel = field.is_relation
                if is_rel and not isinstance(field, (ForeignKey, OneToOneField)):
                     # Skip reverse relations in fields list
                     continue

                field_info = {
                    'name': field.name,
                    'path': field.name,
                    'verbose_name': getattr(field, 'verbose_name', field.name),
                    'type': field.get_internal_type(),
                    'is_relation': is_rel,
                    'choices': SchemaService._get_field_choices(field),
                    'related_model': f"{field.related_model._meta.app_label}.{field.related_model.__name__}" if is_rel and hasattr(field, 'related_model') else None
                }
                schema['fields'].append(field_info)
                schema['all_fields'].append(field_info)
        
        return schema


    @staticmethod
    def _get_nested_fields(model, prefix='', display_prefix='', depth=0):
        """Recursively get fields from related models"""
        if depth >= SchemaService.MAX_DEPTH:
            return []
        
        fields = []
        for field in model._meta.get_fields():
            if field.auto_created:
                continue
            
            field_path = f"{prefix}{field.name}"
            field_display = f"{display_prefix}{getattr(field, 'verbose_name', field.name)}"
            
            if isinstance(field, (ForeignKey, OneToOneField)):
                if field.related_model._meta.app_label in SchemaService.ALLOWED_APPS:
                    # Recurse into nested relations
                    nested = SchemaService._get_nested_fields(
                        field.related_model,
                        prefix=f"{field_path}__",
                        display_prefix=f"{field_display} → ",
                        depth=depth + 1
                    )
                    fields.extend(nested)
                    
                    # Also add the FK field itself
                    fields.append({
                        'name': field.name,
                        'path': field_path,
                        'verbose_name': field_display,
                        'type': field.get_internal_type(),
                        'is_relation': True,
                        'choices': SchemaService._get_field_choices(field),
                        'related_model': f"{field.related_model._meta.app_label}.{field.related_model.__name__}"
                    })

            elif hasattr(field, 'get_internal_type'):
                # Skip reverse relations
                if field.is_relation: continue
                
                fields.append({
                    'name': field.name,
                    'path': field_path,
                    'verbose_name': field_display,
                    'type': field.get_internal_type(),
                    'is_relation': False,
                    'choices': SchemaService._get_field_choices(field),
                    'related_model': None
                })
        
        return fields

    @staticmethod
    def get_relation_tree(app_label, model_name, max_depth=2):
        """
        Get a tree structure of all reachable relations from a model.
        Useful for building a visual relation picker.
        """
        try:
            model = apps.get_model(app_label, model_name)
        except LookupError:
            return None
        
        return SchemaService._build_relation_tree(model, depth=0, max_depth=max_depth, visited=set())
    
    @staticmethod
    def _build_relation_tree(model, depth, max_depth, visited):
        """Build a tree of relations"""
        model_key = f"{model._meta.app_label}.{model.__name__}"
        
        if depth >= max_depth or model_key in visited:
            return None
        
        visited = visited | {model_key}
        
        tree = {
            'model': model_key,
            'verbose_name': model._meta.verbose_name,
            'fields': [],
            'relations': []
        }
        
        for field in model._meta.get_fields():
            if field.auto_created:
                continue
            
            if isinstance(field, (ForeignKey, OneToOneField)):
                if field.related_model._meta.app_label in SchemaService.ALLOWED_APPS:
                    child_tree = SchemaService._build_relation_tree(
                        field.related_model, 
                        depth + 1, 
                        max_depth, 
                        visited
                    )
                    tree['relations'].append({
                        'name': field.name,
                        'verbose_name': getattr(field, 'verbose_name', field.name),
                        'related_model': f"{field.related_model._meta.app_label}.{field.related_model.__name__}",
                        'children': child_tree
                    })
            elif hasattr(field, 'get_internal_type'):
                tree['fields'].append({
                    'name': field.name,
                    'verbose_name': getattr(field, 'verbose_name', field.name),
                    'type': field.get_internal_type()
                })
        
        return tree
