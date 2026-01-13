"""Auto-generated Django admin"""
from django.contrib import admin
from .models import Department, Designation, Employee, LeaveType


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['dept_code', 'dept_name', 'parent_dept', 'is_active']
    search_fields = ['dept_code', 'dept_name']
    list_filter = ['is_active']


@admin.register(Designation)
class DesignationAdmin(admin.ModelAdmin):
    list_display = ['designation_code', 'designation_name', 'level', 'is_active']
    search_fields = ['designation_code', 'designation_name']
    list_filter = ['is_active', 'level']


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ['employee_code', 'first_name', 'last_name', 'email', 'department', 'designation', 'status']
    search_fields = ['employee_code', 'first_name', 'last_name', 'email']
    list_filter = ['department', 'designation', 'status']


@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = ['leave_code', 'leave_name', 'max_days_per_year', 'is_paid', 'is_active']
    search_fields = ['leave_code', 'leave_name']
    list_filter = ['is_active', 'is_paid']
