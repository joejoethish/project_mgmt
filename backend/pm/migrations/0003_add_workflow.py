from django.db import migrations, models
import django.db.models.deletion
import uuid

class Migration(migrations.Migration):
    dependencies = [
        ("pm", "0002_alter_activitylogs_member_id_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="WorkflowTransitions",
            fields=[
                ("transition_id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("workflow_name", models.CharField(blank=True, max_length=255, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True, null=True)),
                ("from_status_id", models.ForeignKey(blank=True, db_column="from_status_id", null=True, on_delete=django.db.models.deletion.CASCADE, related_name="workflow_transitions_from_status_id", to="pm.taskstatuses")),
                ("role_id", models.ForeignKey(blank=True, db_column="role_id", null=True, on_delete=django.db.models.deletion.CASCADE, related_name="workflow_transitions_role_id", to="pm.roles")),
                ("to_status_id", models.ForeignKey(blank=True, db_column="to_status_id", null=True, on_delete=django.db.models.deletion.CASCADE, related_name="workflow_transitions_to_status_id", to="pm.taskstatuses")),
            ],
            options={
                "db_table": "workflow_transitions",
            },
        ),
    ]
