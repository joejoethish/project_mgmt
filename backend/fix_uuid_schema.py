"""
Fix all UUID columns from binary(16) to CHAR(36) for Django compatibility
"""
import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection

# Tables and their UUID primary key columns
TABLES_WITH_UUID_PK = [
    'members',
    'projects', 
    'roles',
    'teams',
    'sprints',
    'tasks',
    'task_comments',
    'task_statuses',
    'task_priorities',
    'task_labels',
    'task_attachments',
    'task_history',
    'permissions',
    'project_documents',
    'document_versions',
    'changelog',
    'activity_logs',
    'external_tasks',
    'task_sync_logs',
]

def fix_schema():
    cursor = connection.cursor()
    
    print("🔧 Fixing UUID columns from binary(16) to CHAR(36)...")
    print("="*60)
    
    # Disable foreign key checks
    cursor.execute('SET FOREIGN_KEY_CHECKS = 0')
    print("✓ Disabled FK checks")
    
    # Get all foreign key constraints
    cursor.execute("""
        SELECT TABLE_NAME, CONSTRAINT_NAME 
        FROM information_schema.TABLE_CONSTRAINTS 
        WHERE CONSTRAINT_TYPE = 'FOREIGN KEY' 
        AND TABLE_SCHEMA = DATABASE()
    """)
    fks = cursor.fetchall()
    
    # Drop all FK constraints
    print(f"\n🗑️  Dropping {len(fks)} foreign key constraints...")
    for table, constraint in fks:
        try:
            cursor.execute(f'ALTER TABLE `{table}` DROP FOREIGN KEY `{constraint}`')
        except Exception as e:
            pass  # Already dropped or doesn't exist
    
    # Get all columns that are binary(16) type
    cursor.execute("""
        SELECT TABLE_NAME, COLUMN_NAME 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND DATA_TYPE = 'binary' 
        AND CHARACTER_MAXIMUM_LENGTH = 16
    """)
    binary_columns = cursor.fetchall()
    
    print(f"\n🔄 Fixing {len(binary_columns)} binary(16) columns...")
    for table, column in binary_columns:
        try:
            # Check if it's a primary key
            cursor.execute(f"""
                SELECT COLUMN_KEY FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = '{table}' 
                AND COLUMN_NAME = '{column}'
            """)
            is_pk = cursor.fetchone()[0] == 'PRI'
            
            if is_pk:
                cursor.execute(f'ALTER TABLE `{table}` MODIFY COLUMN `{column}` CHAR(36) NOT NULL')
            else:
                cursor.execute(f'ALTER TABLE `{table}` MODIFY COLUMN `{column}` CHAR(36)')
            print(f"   ✓ {table}.{column}")
        except Exception as e:
            print(f"   ✗ {table}.{column}: {e}")
    
    # Re-enable FK checks
    cursor.execute('SET FOREIGN_KEY_CHECKS = 1')
    print("\n✓ Re-enabled FK checks")
    
    print("\n" + "="*60)
    print("✅ Schema fix completed!")
    print("="*60)

if __name__ == "__main__":
    fix_schema()
