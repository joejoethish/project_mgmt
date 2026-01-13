from django.apps import apps
from django.db.models import F

class QueryBuilderService:
    @staticmethod
    def build_query(config):
        """
        Build a queryset from report configuration.
        config = {
            'primary_model': 'pm.Tasks',
            'columns': ['title', 'project__name', 'status__name'],
            'filters': {'status__name': 'Active'}
        }
        """
        # 1. Resolve Model
        try:
            app_label, model_name = config['primary_model'].split('.')
            model = apps.get_model(app_label, model_name)
        except (ValueError, LookupError):
            raise ValueError(f"Invalid model: {config.get('primary_model')}")

        # 2. Start QuerySet
        qs = model.objects.all()

        # 3. Apply Filters
        filters = config.get('filters', {})
        if filters:
            # Basic safety check could go here, but Django ORM prevents SQL injection
            # We assume 'filters' keys are valid field paths (checked by UI/Schema)
            qs = qs.filter(**filters)

        # 4. Optimize Joins (select_related)
        # Scan columns for "__" indicating relations
        related_lookups = set()
        columns = config.get('columns', [])
        
        for col in columns:
            if '__' in col:
                # 'project__owner__email' -> 'project__owner'
                parts = col.split('__')
                # Add all intermediate paths? 
                # Simplest for now: just the immediate parent relation path
                # Ideally we traverse, but for select_related, we need the path to the FK
                
                # Logic: remove the last part (field name) to get the relation path
                relation_path = '__'.join(parts[:-1])
                if relation_path:
                    related_lookups.add(relation_path)
        
        if related_lookups:
            qs = qs.select_related(*related_lookups)

        # 5. Select Columns (values)
        # We use 'values' to return a Dict, which is easier for the Grid
        if columns:
            qs = qs.values(*columns)

        return qs
