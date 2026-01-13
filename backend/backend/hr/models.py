"""Auto-generated Django models"""
import uuid
from django.db import models


class Department(models.Model):
    """Organization departments"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dept_code = models.CharField(max_length=20, unique=True)
    dept_name = models.CharField(max_length=100)
    parent_dept = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='sub_departments')
    cost_center = models.CharField(max_length=50, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'departments'
        verbose_name = 'Department'
        verbose_name_plural = 'Departments'

    def __str__(self):
        return str(self.dept_name)


class Designation(models.Model):
    """Job titles"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    designation_code = models.CharField(max_length=20, unique=True)
    designation_name = models.CharField(max_length=100)
    level = models.IntegerField()
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'designations'
        verbose_name = 'Designation'
        verbose_name_plural = 'Designations'

    def __str__(self):
        return str(self.designation_name)


class Employee(models.Model):
    """Employee records"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee_code = models.CharField(max_length=20, unique=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    date_of_joining = models.DateField()
    department = models.ForeignKey(Department, on_delete=models.RESTRICT, related_name='employees')
    designation = models.ForeignKey(Designation, on_delete=models.RESTRICT, related_name='employees')
    status = models.CharField(max_length=20, default="active")

    class Meta:
        db_table = 'employees'
        verbose_name = 'Employee'
        verbose_name_plural = 'Employees'

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class LeaveType(models.Model):
    """Leave categories"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    leave_code = models.CharField(max_length=20, unique=True)
    leave_name = models.CharField(max_length=100)
    max_days_per_year = models.IntegerField()
    is_paid = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'leave_types'
        verbose_name = 'Leave Type'
        verbose_name_plural = 'Leave Types'

    def __str__(self):
        return str(self.leave_name)
