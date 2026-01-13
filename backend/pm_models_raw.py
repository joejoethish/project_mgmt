# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class Members(models.Model):
    member_id = models.CharField(primary_key=True, max_length=16)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    email = models.CharField(unique=True, max_length=255)
    phone = models.CharField(max_length=32, blank=True, null=True)
    profile_image_url = models.CharField(max_length=1024, blank=True, null=True)
    is_active = models.IntegerField()
    last_login = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    deleted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'members'


class Projects(models.Model):
    project_id = models.CharField(primary_key=True, max_length=16)
    name = models.CharField(max_length=255)
    slug = models.CharField(unique=True, max_length=255)
    description = models.TextField(blank=True, null=True)
    owner_member = models.ForeignKey(Members, models.DO_NOTHING, blank=True, null=True)
    visibility = models.CharField(max_length=7)
    status = models.CharField(max_length=8)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    deleted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'projects'


class Tasks(models.Model):
    task_id = models.CharField(primary_key=True, max_length=16)
    project = models.ForeignKey(Projects, models.DO_NOTHING)
    created_by_member = models.ForeignKey(Members, models.DO_NOTHING, blank=True, null=True)
    title = models.CharField(max_length=512)
    description = models.TextField(blank=True, null=True)
    status = models.ForeignKey('TaskStatuses', models.DO_NOTHING, blank=True, null=True)
    priority = models.ForeignKey('TaskPriorities', models.DO_NOTHING, blank=True, null=True)
    parent_task = models.ForeignKey('self', models.DO_NOTHING, blank=True, null=True)
    estimate_hours = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    due_date = models.DateField(blank=True, null=True)
    start_date = models.DateField(blank=True, null=True)
    percent_complete = models.IntegerField()
    position = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    deleted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'tasks'


class Teams(models.Model):
    team_id = models.CharField(primary_key=True, max_length=16)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    lead_member = models.ForeignKey(Members, models.DO_NOTHING, blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    deleted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'teams'


class Sprints(models.Model):
    sprint_id = models.CharField(primary_key=True, max_length=16)
    project = models.ForeignKey(Projects, models.DO_NOTHING)
    name = models.CharField(max_length=255)
    goal = models.CharField(max_length=1024, blank=True, null=True)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'sprints'


class TaskStatuses(models.Model):
    task_status_id = models.CharField(primary_key=True, max_length=16)
    name = models.CharField(unique=True, max_length=64)
    description = models.CharField(max_length=255, blank=True, null=True)
    sort_order = models.IntegerField(blank=True, null=True)
    is_default = models.IntegerField()

    class Meta:
        managed = False
        db_table = 'task_statuses'


class TaskPriorities(models.Model):
    task_priority_id = models.CharField(primary_key=True, max_length=16)
    name = models.CharField(unique=True, max_length=64)
    description = models.CharField(max_length=255, blank=True, null=True)
    sort_order = models.IntegerField(blank=True, null=True)
    is_default = models.IntegerField()

    class Meta:
        managed = False
        db_table = 'task_priorities'
