# Migration to create production PM schema from SQL file

from django.db import migrations
import os


def run_sql_schema(apps, schema_editor):
    """Execute the project management SQL schema"""
    # Read the SQL file
    sql_file_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
        'project_management_full_schema.sql'
    )
    
    with open(sql_file_path, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    # Split by semicolon and execute each statement
    # Skip comments and empty lines
    statements = []
    current_statement = []
    
    for line in sql_content.split('\n'):
        # Skip comments
        if line.strip().startswith('--') or not line.strip():
            continue
        
        current_statement.append(line)
        
        # If line ends with semicolon, it's a complete statement
        if line.strip().endswith(';'):
            statement = '\n'.join(current_statement)
            if statement.strip() and not statement.strip().startswith('--'):
                statements.append(statement)
            current_statement = []
    
    # Execute each statement
    with schema_editor.connection.cursor() as cursor:
        for statement in statements:
            try:
                cursor.execute(statement)
            except Exception as e:
                print(f"Error executing statement: {e}")
                print(f"Statement: {statement[:200]}...")
                # Continue with other statements


def reverse_migration(apps, schema_editor):
    """Drop all PM tables"""
    # List of tables to drop in reverse order of dependencies
    tables = [
        'activity_logs', 'changelog', 'document_permissions', 
        'document_versions', 'project_documents', 'sprint_tasks', 
        'sprints', 'task_label_map', 'task_history', 'task_attachments', 
        'task_comments', 'task_assignees', 'tasks', 'task_labels', 
        'task_priorities', 'task_statuses', 'project_members', 
        'role_permissions', 'permissions', 'roles', 'team_members', 
        'teams', 'projects', 'members'
    ]
    
    with schema_editor.connection.cursor() as cursor:
        cursor.execute('SET FOREIGN_KEY_CHECKS=0')
        for table in tables:
            try:
                cursor.execute(f'DROP TABLE IF EXISTS {table}')
            except Exception as e:
                print(f"Error dropping {table}: {e}")
        cursor.execute('SET FOREIGN_KEY_CHECKS=1')


class Migration(migrations.Migration):

    dependencies = [
        ('masters', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(run_sql_schema, reverse_migration),
    ]
