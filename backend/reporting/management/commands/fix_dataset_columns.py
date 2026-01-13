"""
Fix Dataset Column Paths
Updates columns with invalid field names to use proper ORM paths
"""
from django.core.management.base import BaseCommand
from reporting.models import Dataset, DatasetColumn
from django.apps import apps


class Command(BaseCommand):
    help = 'Fix dataset columns with invalid field paths'

    def handle(self, *args, **options):
        self.stdout.write("Checking datasets for invalid column paths...")
        
        # Get all datasets
        for ds in Dataset.objects.all():
            self.stdout.write(f"\n=== Dataset: {ds.name} ===")
            self.stdout.write(f"Primary Model: {ds.primary_model}")
            
            if not ds.primary_model:
                self.stdout.write("  No primary model, skipping")
                continue
            
            # Get the model
            try:
                app_label, model_name = ds.primary_model.split('.')
                model = apps.get_model(app_label, model_name)
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  Could not load model: {e}"))
                continue
            
            # Get valid direct fields
            valid_fields = set()
            relations = {}
            
            for field in model._meta.get_fields():
                if hasattr(field, 'name'):
                    valid_fields.add(field.name)
                    # Track relations for fixing
                    if hasattr(field, 'related_model') and field.related_model:
                        relations[field.name] = field.related_model
            
            self.stdout.write(f"  Valid fields: {valid_fields}")
            self.stdout.write(f"  Relations: {list(relations.keys())}")
            
            # Check each column
            fixed_count = 0
            for col in DatasetColumn.objects.filter(dataset=ds):
                field_name = col.field_name
                
                # Skip relation paths (already have __)
                if '__' in field_name:
                    self.stdout.write(f"  ✓ {field_name} - Relation path OK")
                    continue
                
                # Check if valid direct field
                if field_name in valid_fields:
                    self.stdout.write(f"  ✓ {field_name} - Direct field OK")
                    continue
                
                # Invalid field - try to fix
                self.stdout.write(self.style.WARNING(f"  ✗ {field_name} - NOT VALID on {model_name}"))
                
                # Try common fixes based on relation names
                fixed = False
                for rel_name, rel_model in relations.items():
                    rel_fields = [f.name for f in rel_model._meta.get_fields() if hasattr(f, 'name')]
                    if field_name in rel_fields:
                        new_path = f"{rel_name}__{field_name}"
                        self.stdout.write(f"    -> Found on {rel_name}, fixing to: {new_path}")
                        col.field_name = new_path
                        col.save()
                        fixed = True
                        fixed_count += 1
                        break
                    
                    # Also check if the field_name IS a relation name on the related model
                    for rel_field in rel_model._meta.get_fields():
                        if hasattr(rel_field, 'name') and rel_field.name == field_name:
                            if hasattr(rel_field, 'related_model') and rel_field.related_model:
                                # This is a nested relation
                                new_path = f"{rel_name}__{field_name}"
                                self.stdout.write(f"    -> Nested relation found, fixing to: {new_path}")
                                col.field_name = new_path
                                col.save()
                                fixed = True
                                fixed_count += 1
                                break
                    if fixed:
                        break
                
                if not fixed:
                    self.stdout.write(self.style.ERROR(f"    -> Could not auto-fix, please fix manually"))
            
            if fixed_count:
                self.stdout.write(self.style.SUCCESS(f"  Fixed {fixed_count} columns"))
        
        self.stdout.write(self.style.SUCCESS("\nDone!"))
