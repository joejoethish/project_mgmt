import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

sql = """
CREATE TABLE IF NOT EXISTS workflow_transitions (
  transition_id BINARY(16) NOT NULL PRIMARY KEY,
  workflow_name VARCHAR(100) DEFAULT 'default',
  from_status_id BINARY(16) NOT NULL,
  to_status_id BINARY(16) NOT NULL,
  role_id BINARY(16) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_trans_from_status FOREIGN KEY (from_status_id) REFERENCES task_statuses(task_status_id) ON DELETE CASCADE,
  CONSTRAINT fk_trans_to_status FOREIGN KEY (to_status_id) REFERENCES task_statuses(task_status_id) ON DELETE CASCADE,
  CONSTRAINT fk_trans_role FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""

with connection.cursor() as cursor:
    cursor.execute(sql)
    print("Created workflow_transitions table.")
