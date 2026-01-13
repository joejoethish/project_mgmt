"""Enhanced HR Django models"""
import uuid
from django.db import models


class Department(models.Model):
    """Organization departments with team type categorization"""
    CATEGORY_CHOICES = [
        ('development', 'Development'),
        ('qa', 'Quality Assurance'),
        ('implementation', 'Implementation'),
        ('support', 'Support'),
        ('management', 'Management'),
        ('hr', 'Human Resources'),
        ('finance', 'Finance'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dept_code = models.CharField(max_length=20, unique=True)
    dept_name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    parent_dept = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='sub_departments')
    head = models.ForeignKey('Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='departments_headed')
    cost_center = models.CharField(max_length=50, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        db_table = 'departments'
        verbose_name = 'Department'
        verbose_name_plural = 'Departments'
        ordering = ['dept_name']

    def __str__(self):
        return str(self.dept_name)


class Designation(models.Model):
    """Job titles with grade levels"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    designation_code = models.CharField(max_length=20, unique=True)
    designation_name = models.CharField(max_length=100)
    level = models.IntegerField(help_text="1=Entry, 5=Manager, 10=Executive")
    min_salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    max_salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        db_table = 'designations'
        verbose_name = 'Designation'
        verbose_name_plural = 'Designations'
        ordering = ['-level', 'designation_name']

    def __str__(self):
        return str(self.designation_name)


class Employee(models.Model):
    """Enhanced employee records with PM integration support"""
    EMPLOYMENT_TYPE_CHOICES = [
        ('full_time', 'Full Time'),
        ('part_time', 'Part Time'),
        ('contract', 'Contract'),
        ('intern', 'Intern'),
        ('consultant', 'Consultant'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('on_leave', 'On Leave'),
        ('terminated', 'Terminated'),
        ('resigned', 'Resigned'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee_code = models.CharField(max_length=20, unique=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    profile_image = models.URLField(max_length=500, blank=True, null=True)
    date_of_birth = models.DateField(null=True, blank=True)
    date_of_joining = models.DateField()
    date_of_leaving = models.DateField(null=True, blank=True)
    
    department = models.ForeignKey(Department, on_delete=models.RESTRICT, related_name='employees')
    designation = models.ForeignKey(Designation, on_delete=models.RESTRICT, related_name='employees')
    reporting_manager = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='direct_reports')
    
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_TYPE_CHOICES, default='full_time')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # PM Integration - link to pm.members table
    pm_member_id = models.UUIDField(null=True, blank=True, help_text="Link to PM Members table")
    
    # Additional info
    address = models.TextField(blank=True, null=True)
    emergency_contact = models.CharField(max_length=100, blank=True, null=True)
    emergency_phone = models.CharField(max_length=20, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        db_table = 'employees'
        verbose_name = 'Employee'
        verbose_name_plural = 'Employees'
        ordering = ['first_name', 'last_name']

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class Skill(models.Model):
    """Skills master for employee competencies"""
    CATEGORY_CHOICES = [
        ('technical', 'Technical'),
        ('soft', 'Soft Skills'),
        ('domain', 'Domain Knowledge'),
        ('tool', 'Tools & Software'),
        ('language', 'Language'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='technical')
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'skills'
        ordering = ['category', 'name']
    
    def __str__(self):
        return self.name


class EmployeeSkill(models.Model):
    """Employee-Skill mapping with proficiency levels"""
    PROFICIENCY_CHOICES = [
        (1, 'Beginner'),
        (2, 'Elementary'),
        (3, 'Intermediate'),
        (4, 'Advanced'),
        (5, 'Expert'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='skills')
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name='employees')
    proficiency = models.IntegerField(choices=PROFICIENCY_CHOICES, default=3)
    years_experience = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    certified = models.BooleanField(default=False)
    certification_name = models.CharField(max_length=200, blank=True, null=True)
    certification_date = models.DateField(null=True, blank=True)
    
    class Meta:
        db_table = 'employee_skills'
        unique_together = ['employee', 'skill']
    
    def __str__(self):
        return f"{self.employee} - {self.skill}"


class LeaveType(models.Model):
    """Leave categories"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    leave_code = models.CharField(max_length=20, unique=True)
    leave_name = models.CharField(max_length=100)
    max_days_per_year = models.IntegerField()
    is_paid = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    carry_forward_allowed = models.BooleanField(default=False)
    max_carry_forward_days = models.IntegerField(default=0)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'leave_types'
        verbose_name = 'Leave Type'
        verbose_name_plural = 'Leave Types'

    def __str__(self):
        return str(self.leave_name)


class LeaveRequest(models.Model):
    """Employee leave applications"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_requests')
    leave_type = models.ForeignKey(LeaveType, on_delete=models.RESTRICT, related_name='requests')
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approved_by = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_leaves')
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)
    
    class Meta:
        db_table = 'leave_requests'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.employee} - {self.leave_type} ({self.start_date} to {self.end_date})"
    
    @property
    def days_requested(self):
        return (self.end_date - self.start_date).days + 1


class LeaveBalance(models.Model):
    """Track leave balances per employee per year"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_balances')
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE, related_name='balances')
    year = models.IntegerField()
    total_days = models.DecimalField(max_digits=5, decimal_places=1)
    used_days = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    carried_forward = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    
    class Meta:
        db_table = 'leave_balances'
        unique_together = ['employee', 'leave_type', 'year']
    
    @property
    def remaining_days(self):
        return self.total_days + self.carried_forward - self.used_days
    
    def __str__(self):
        return f"{self.employee} - {self.leave_type} ({self.year})"
