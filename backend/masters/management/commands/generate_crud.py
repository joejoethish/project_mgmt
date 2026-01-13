"""
Auto-generate Django models, serializers, and viewsets from JSON schema.

Usage:
    python manage.py generate_crud --schema path/to/schema.json --app hr
"""

import json
import os
from pathlib import Path
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Generate Django CRUD code from JSON schema'

    def add_arguments(self, parser):
        parser.add_argument('--schema', type=str, required=True, help='Path to JSON schema file')
        parser.add_argument('--app', type=str, required=True, help='Django app name (e.g., hr)')

    def handle(self, *args, **options):
        schema_path = options['schema']
        app_name = options['app']
        
        # Load schema
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema = json.load(f)
        
        self.stdout.write(self.style.SUCCESS(f'Loaded schema with {len(schema["masters"])} masters'))
        
        # Generate code
        models_code = self.generate_models(schema, app_name)
        serializers_code = self.generate_serializers(schema, app_name)
        viewsets_code = self.generate_viewsets(schema, app_name)
        urls_code = self.generate_urls(schema, app_name)
        admin_code = self.generate_admin(schema, app_name)
        
        # Write to files
        app_dir = Path('backend') / app_name
        app_dir.mkdir(exist_ok=True)
        
        (app_dir / 'models.py').write_text(models_code, encoding='utf-8')
        (app_dir / 'serializers.py').write_text(serializers_code, encoding='utf-8')
        (app_dir / 'views.py').write_text(viewsets_code, encoding='utf-8')
        (app_dir / 'urls.py').write_text(urls_code, encoding='utf-8')
        (app_dir / 'admin.py').write_text(admin_code, encoding='utf-8')
        (app_dir / '__init__.py').touch()
        
        self.stdout.write(self.style.SUCCESS(f'✅ Generated CRUD code in {app_dir}'))
        self.stdout.write(self.style.WARNING('\nNext steps:'))
        self.stdout.write(f'1. Add "{app_name}" to INSTALLED_APPS in settings.py')
        self.stdout.write(f'2. Include URLs: path("api/{app_name}/", include("{app_name}.urls"))')
        self.stdout.write('3. Run: python manage.py makemigrations')
        self.stdout.write('4. Run: python manage.py migrate')

    def generate_models(self, schema, app_name):
        """Generate Django models code"""
        code = [
            '"""Auto-generated Django models"""',
            'import uuid',
            'from django.db import models',
            '',
            ''
        ]
        
        for master in schema['masters']:
            class_name = self.to_class_name(master['name'])
            code.append(f'class {class_name}(models.Model):')
            code.append(f'    """{master.get("description", master["display_name"])}"""')
            
            # Generate fields
            for field in master['fields']:
                field_code = self.generate_field(field, master['name'])
                code.append(f'    {field_code}')
            
            # Meta class
            code.append('')
            code.append('    class Meta:')
            code.append(f'        db_table = \'{master["name"]}\'')
            code.append(f'        verbose_name = \'{master["display_name"]}\'')
            code.append(f'        verbose_name_plural = \'{master["display_name"]}\'')
            
            # __str__ method
            str_field = self.get_str_field(master['fields'])
            code.append('')
            code.append('    def __str__(self):')
            code.append(f'        return str(self.{str_field})')
            
            code.append('')
            code.append('')
        
        return '\n'.join(code)

    def generate_field(self, field, master_name):
        """Generate Django field definition"""
        field_name = field['name']
        field_type = field['type']
        is_primary = field.get('isPrimary', False)
        is_foreign = field.get('isForeign', False)
        required = field.get('required', False)
        unique = field.get('unique', False)
        max_length = field.get('maxLength')
        default = field.get('defaultValue')
        
        # Map field types
        if is_primary:
            return f"{field_name} = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)"
        
        if is_foreign:
            # Determine target model
            if field_name.endswith('_id'):
                base_name = field_name[:-3]
                # Check if self-referencing
                if base_name.replace('parent_', '') == master_name.rstrip('s'):
                    target = "'self'"
                else:
                    target = f"'{self.to_class_name(base_name)}'"
            else:
                target = f"'{self.to_class_name(field_name)}'"
            
            null_blank = 'null=True, blank=True' if not required else ''
            return f"{field_name} = models.ForeignKey({target}, on_delete=models.CASCADE, {null_blank})"
        
        field_map = {
            'uuid': 'UUIDField(default=uuid.uuid4)',
            'text': f'CharField(max_length={max_length or 255})',
            'email': 'EmailField()',
            'url': 'URLField()',
            'number': 'DecimalField(max_digits=10, decimal_places=2)',
            'date': 'DateField()',
            'datetime': 'DateTimeField()',
            'boolean': 'BooleanField()',
            'json': 'JSONField()',
        }
        
        field_def = field_map.get(field_type, f'CharField(max_length={max_length or 255})')
        
        # Add constraints
        constraints = []
        if unique:
            constraints.append('unique=True')
        if not required:
            constraints.append('blank=True')
            constraints.append('null=True')
        if default and field_type == 'boolean':
            constraints.append(f'default={default.capitalize()}')
        elif default:
            constraints.append(f'default="{default}"')
        
        if constraints:
            field_def = field_def.rstrip(')') + ', ' + ', '.join(constraints) + ')'
        
        return f"{field_name} = models.{field_def}"

    def generate_serializers(self, schema, app_name):
        """Generate DRF serializers"""
        code = [
            '"""Auto-generated DRF serializers"""',
            'from rest_framework import serializers',
            f'from .models import {", ".join([self.to_class_name(m["name"]) for m in schema["masters"]])}',
            '',
            ''
        ]
        
        for master in schema['masters']:
            class_name = self.to_class_name(master['name'])
            code.append(f'class {class_name}Serializer(serializers.ModelSerializer):')
            code.append('    class Meta:')
            code.append(f'        model = {class_name}')
            code.append('        fields = \'__all__\'')
            code.append('')
            code.append('')
        
        return '\n'.join(code)

    def generate_viewsets(self, schema, app_name):
        """Generate DRF viewsets"""
        code = [
            '"""Auto-generated DRF viewsets"""',
            'from rest_framework import viewsets, filters',
            'from django_filters.rest_framework import DjangoFilterBackend',
            f'from .models import {", ".join([self.to_class_name(m["name"]) for m in schema["masters"]])}',
            f'from .serializers import {", ".join([self.to_class_name(m["name"]) + "Serializer" for m in schema["masters"]])}',
            '',
            ''
        ]
        
        for master in schema['masters']:
            class_name = self.to_class_name(master['name'])
            
            # Determine search fields (text fields)
            search_fields = [f['name'] for f in master['fields'] if f['type'] in ['text', 'email']]
            
            # Determine filter fields (foreign keys, booleans)
            filter_fields = [f['name'] for f in master['fields'] if f.get('isForeign') or f['type'] == 'boolean']
            
            code.append(f'class {class_name}ViewSet(viewsets.ModelViewSet):')
            code.append(f'    """{master["display_name"]} CRUD operations"""')
            code.append(f'    queryset = {class_name}.objects.all()')
            code.append(f'    serializer_class = {class_name}Serializer')
            code.append('    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]')
            
            if search_fields:
                code.append(f'    search_fields = {search_fields}')
            if filter_fields:
                code.append(f'    filterset_fields = {filter_fields}')
            
            code.append('')
            code.append('')
        
        return '\n'.join(code)

    def generate_urls(self, schema, app_name):
        """Generate URL routing"""
        code = [
            '"""Auto-generated URL routing"""',
            'from rest_framework.routers import DefaultRouter',
            f'from .views import {", ".join([self.to_class_name(m["name"]) + "ViewSet" for m in schema["masters"]])}',
            '',
            'router = DefaultRouter()',
            ''
        ]
        
        for master in schema['masters']:
            class_name = self.to_class_name(master['name'])
            code.append(f'router.register(r\'{master["name"]}\', {class_name}ViewSet, basename=\'{master["name"]}\')')
        
        code.append('')
        code.append('urlpatterns = router.urls')
        
        return '\n'.join(code)

    def generate_admin(self, schema, app_name):
        """Generate Django admin registration"""
        code = [
            '"""Auto-generated Django admin"""',
            'from django.contrib import admin',
            f'from .models import {", ".join([self.to_class_name(m["name"]) for m in schema["masters"]])}',
            '',
            ''
        ]
        
        for master in schema['masters']:
            class_name = self.to_class_name(master['name'])
            
            # Determine list display fields
            list_display = [f['name'] for f in master['fields'][:5]]  # First 5 fields
            
            code.append(f'@admin.register({class_name})')
            code.append(f'class {class_name}Admin(admin.ModelAdmin):')
            code.append(f'    list_display = {list_display}')
            code.append(f'    search_fields = {[f["name"] for f in master["fields"] if f["type"] in ["text", "email"]][:3]}')
            code.append('')
            code.append('')
        
        return '\n'.join(code)

    def to_class_name(self, name):
        """Convert snake_case to PascalCase"""
        return ''.join(word.capitalize() for word in name.split('_'))

    def get_str_field(self, fields):
        """Determine best field for __str__ method"""
        # Prefer name-like fields
        for field in fields:
            if any(keyword in field['name'] for keyword in ['name', 'title', 'label']):
                return field['name']
        
        # Fall back to first non-id text field
        for field in fields:
            if not field.get('isPrimary') and field['type'] in ['text', 'email']:
                return field['name']
        
        # Last resort: id
        return 'id'
