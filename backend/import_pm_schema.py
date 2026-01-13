import os
import re
import json
import django
from django.conf import settings

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from masters.models import MasterSchema
from django.contrib.auth import get_user_model

User = get_user_model()

SQL_FILE_PATH = '../project_management_full_schema.sql'
APP_NAME = 'pm'

def parse_sql_schema(file_path):
    with open(file_path, 'r') as f:
        lines = f.readlines()

    tables = []
    edges = []
    
    current_table = None
    node_positions = {}
    x_pos = 0
    y_pos = 0
    row_count = 0
    
    fields_buffer = []

    for line in lines:
        line = line.strip()
        if not line or line.startswith('--'):
            continue
            
        # Start of table
        table_start = re.search(r'CREATE TABLE (\w+)', line, re.IGNORECASE)
        if table_start:
            current_table = table_start.group(1)
            fields_buffer = []
            
            # Position logic
            node_positions[current_table] = {'x': x_pos, 'y': y_pos}
            x_pos += 400
            row_count += 1
            if row_count >= 4:
                row_count = 0
                x_pos = 0
                y_pos += 500
            continue
            
        # End of table
        if line.startswith(') ENGINE'):
            if current_table:
                # Process fields buffer
                fields = []
                for def_line in fields_buffer:
                    # Remove trailing comma
                    def_line = def_line.rstrip(',')
                    
                    parts = def_line.split()
                    if not parts: continue
                    
                    fname = parts[0].replace('`', '')
                    
                    # Skip constraints defined on their own lines
                    if fname.upper() in ['CONSTRAINT', 'KEY', 'UNIQUE', 'PRIMARY', 'INDEX', 'FOREIGN']:
                        # Capture FKs separately if needed, but we do it later or here
                        if fname.upper() == 'CONSTRAINT' and 'FOREIGN KEY' in def_line.upper():
                            fk_match = re.search(r'FOREIGN KEY \((\w+)\) REFERENCES (\w+)\((\w+)\)', def_line, re.IGNORECASE)
                            if fk_match:
                                source_col = fk_match.group(1)
                                target_table = fk_match.group(2)
                                target_col = fk_match.group(3)
                                
                                edges.append({
                                    "id": f"e_{current_table}_{source_col}_{target_table}_{target_col}",
                                    "source": current_table,
                                    "target": target_table,
                                    "sourceHandle": f"{current_table}-source-{source_col}",
                                    "targetHandle": f"{target_table}-target-{target_col}",
                                    "type": "smoothstep",
                                    "animated": True,
                                    "label": "relates to"
                                })
                                
                                # Mark field as foreign in the already processed fields list
                                for f in fields:
                                    if f['name'] == source_col:
                                        f['isForeign'] = True
                        continue
                        
                    if len(parts) < 2: continue
                        
                    ftype_raw = parts[1].upper()
                    
                    # Map SQL types to Builder types
                    ftype = 'text'
                    if 'BINARY(16)' in ftype_raw or 'UUID' in ftype_raw:
                        ftype = 'uuid'
                    elif 'VARCHAR' in ftype_raw or 'TEXT' in ftype_raw or 'ENUM' in ftype_raw:
                        ftype = 'text'
                    elif 'INT' in ftype_raw or 'DECIMAL' in ftype_raw:
                        ftype = 'number'
                    elif 'DATE' in ftype_raw or 'TIMESTAMP' in ftype_raw:
                        ftype = 'date'
                    elif 'TINYINT' in ftype_raw or 'BOOLEAN' in ftype_raw:
                        ftype = 'boolean'
                    elif 'JSON' in ftype_raw:
                        ftype = 'json'
                        
                    is_primary = 'PRIMARY KEY' in def_line.upper()
                    required = 'NOT NULL' in def_line.upper()
                    unique = 'UNIQUE' in def_line.upper()
                    
                    fields.append({
                        "name": fname,
                        "label": fname.replace('_', ' ').title(),
                        "type": ftype,
                        "required": required,
                        "unique": unique,
                        "isPrimary": is_primary,
                        "isForeign": False, 
                        "helpText": ""
                    })

                tables.append({
                    "id": current_table,
                    "type": "masterNode",
                    "position": node_positions[current_table],
                    "data": {
                        "label": current_table.replace('_', ' ').title(),
                        "description": f"Table {current_table}",
                        "fields": fields
                    }
                })
                current_table = None
            continue

        if current_table:
            fields_buffer.append(line)

    return tables, edges

def generate_django_code(nodes, edges):
    models_code = "from django.db import models\nimport uuid\n\n"
    
    for node in nodes:
        class_name = ''.join(x.title() for x in node['id'].split('_'))
        models_code += f"class {class_name}(models.Model):\n"
        
        fields = node['data']['fields']
        for field in fields:
            fname = field['name']
            ftype = field['type']
            
            field_def = ""
            
            # Check if FK
            is_fk = False
            for edge in edges:
                if edge['source'] == node['id'] and edge['sourceHandle'].endswith(f"-{fname}"):
                    target_model = ''.join(x.title() for x in edge['target'].split('_'))
                    
                    # Handle self-reference
                    if target_model == class_name:
                        target_model = "'self'"
                    
                    field_def = f"    {fname} = models.ForeignKey({target_model}, on_delete=models.CASCADE, related_name='{node['id']}_{fname}', null=True, blank=True, db_column='{fname}')" # simplified FK
                    is_fk = True
                    break
            
            if is_fk:
                models_code += f"{field_def}\n"
                continue

            # Standard fields
            if field['isPrimary']:
                 models_code += f"    {fname} = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)\n"
            elif ftype == 'uuid':
                 models_code += f"    {fname} = models.UUIDField(default=uuid.uuid4)\n" # binary(16) treatment
            elif ftype == 'text':
                models_code += f"    {fname} = models.CharField(max_length=255, blank=True, null=True)\n"
            elif ftype == 'number':
                models_code += f"    {fname} = models.IntegerField(default=0)\n"
            elif ftype == 'date':
                models_code += f"    {fname} = models.DateTimeField(auto_now_add={'created_at' in fname}, auto_now={'updated_at' in fname}, null=True, blank=True)\n"
            elif ftype == 'boolean':
                models_code += f"    {fname} = models.BooleanField(default=False)\n"
            elif ftype == 'json':
                models_code += f"    {fname} = models.JSONField(default=dict, blank=True)\n"
            else:
                models_code += f"    {fname} = models.CharField(max_length=255)\n"

        models_code += "\n    class Meta:\n"
        models_code += f"        db_table = '{node['id']}'\n\n"
        models_code += f"    def __str__(self):\n"
        models_code += f"        return str(self.{fields[0]['name']})\n\n"

    return models_code

def main():
    print(f"Parsing schema from {SQL_FILE_PATH}...")
    nodes, edges = parse_sql_schema(SQL_FILE_PATH)
    
    print(f"Found {len(nodes)} tables and {len(edges)} relationships.")
    
    # Save to MasterSchema
    schema_name = "Project Management System"
    
    # Check if exists
    existing = MasterSchema.objects.filter(name=schema_name).first()
    if existing:
        print(f"Updating existing schema: {schema_name}")
        existing.schema_data = {"nodes": nodes, "edges": edges}
        existing.save()
    else:
        print(f"Creating new schema: {schema_name}")
        MasterSchema.objects.create(
            name=schema_name,
            description="Imported from SQL Schema",
            schema_data={"nodes": nodes, "edges": edges},
            version=1
        )
        
    # Generate Code
    print("Generating Django models...")
    models_content = generate_django_code(nodes, edges)
    
    with open(f'{APP_NAME}/models.py', 'w') as f:
        f.write(models_content)
        
    print(f"Successfully generated {APP_NAME}/models.py")

if __name__ == '__main__':
    main()
