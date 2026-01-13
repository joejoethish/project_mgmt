import os
import sys
import django
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection

def fix_schema():
    with connection.cursor() as cursor:
        print("🔧 Fixing Tags Schema...")
        
        # 1. Disable FK checks
        cursor.execute('SET FOREIGN_KEY_CHECKS = 0')
        
        # 2. Ensure tag_categories table exists
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS tag_categories (
            category_id CHAR(36) PRIMARY KEY,
            name VARCHAR(50) UNIQUE NOT NULL,
            label VARCHAR(100) NOT NULL,
            icon VARCHAR(50) DEFAULT '🏷️',
            color VARCHAR(7) DEFAULT '#6366f1',
            description LONGTEXT,
            sort_order INT DEFAULT 0,
            is_active TINYINT(1) DEFAULT 1,
            created_at DATETIME(6) NOT NULL,
            updated_at DATETIME(6) NOT NULL
        )
        ''')
        print("   ✓ tag_categories table ready")
        
        # 2b. Ensure CHAR(36) for UUIDs
        try:
            cursor.execute("ALTER TABLE tag_categories MODIFY category_id CHAR(36)")
            print("   ✓ tag_categories.category_id resized to 36")
        except Exception as e:
            print(f"   ⚠️ Resize Error: {e}")

        # 3. Seed basic categories if empty
        cursor.execute("SELECT count(*) FROM tag_categories")
        if cursor.fetchone()[0] == 0:
            print("   🌱 Seeding categories...")
            categories = [
                ('priority', 'Priority', '🎯', '#ef4444'),
                ('status', 'Status', '📊', '#3b82f6'),
                ('client_type', 'Client Type', '🏢', '#f59e0b'),
                ('team', 'Team', '👥', '#10b981'),
                ('skill', 'Skill', '💡', '#8b5cf6'),
                ('region', 'Region', '📍', '#ec4899'),
                ('department', 'Department', '🏛️', '#6366f1'),
                ('custom', 'Custom', '🏷️', '#6b7280'),
            ]
            
            for i, (name, label, icon, color) in enumerate(categories):
                cat_id = str(uuid.uuid4())
                cursor.execute('''
                    INSERT INTO tag_categories 
                    (category_id, name, label, icon, color, sort_order, is_active, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, 1, NOW(), NOW())
                ''', [cat_id, name, label, icon, color, i])
            print(f"   ✓ Seeded {len(categories)} categories")

        # 4. Fix tags table structure
        # Check if category column exists (old)
        cursor.execute("SHOW COLUMNS FROM tags LIKE 'category'")
        if cursor.fetchone():
            print("   ⚠️ Found old 'category' column, renaming/migrating...")
            cursor.execute("ALTER TABLE tags DROP COLUMN category")
        
        # Check if category_id exists
        cursor.execute("SHOW COLUMNS FROM tags LIKE 'category_id'")
        if not cursor.fetchone():
             cursor.execute("ALTER TABLE tags ADD COLUMN category_id CHAR(36) NULL")
        else:
             cursor.execute("ALTER TABLE tags MODIFY category_id CHAR(36) NULL")
        
        # 5. Add FK constraint safely
        try:
            cursor.execute('''
                ALTER TABLE tags 
                ADD CONSTRAINT tags_category_fk 
                FOREIGN KEY (category_id) 
                REFERENCES tag_categories(category_id) 
                ON DELETE SET NULL
            ''')
            print("   ✓ FK constraint added")
        except Exception as e:
            if "Duplicate key name" in str(e):
                print("   ○ FK constraint already exists")
            else:
                print(f"   ⚠️ FK Error (ignored): {e}")

        # 6. Re-enable FK checks
        cursor.execute('SET FOREIGN_KEY_CHECKS = 1')
        print("\n✅ Schema Fix Complete!")

if __name__ == "__main__":
    try:
        fix_schema()
    except Exception as e:
        print(f"\n❌ Error: {e}")
