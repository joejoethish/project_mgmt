"""Enhanced HR DRF serializers"""
from rest_framework import serializers
from .models import (
    Department, Designation, Employee, LeaveType,
    Skill, EmployeeSkill, LeaveRequest, LeaveBalance
)


class DepartmentSerializer(serializers.ModelSerializer):
    head_name = serializers.SerializerMethodField()
    parent_name = serializers.CharField(source='parent_dept.dept_name', read_only=True)
    employee_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Department
        fields = '__all__'
    
    def get_head_name(self, obj):
        if obj.head:
            return f"{obj.head.first_name} {obj.head.last_name}"
        return None
    
    def get_employee_count(self, obj):
        return obj.employees.filter(status='active').count()


class DesignationSerializer(serializers.ModelSerializer):
    employee_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Designation
        fields = '__all__'
    
    def get_employee_count(self, obj):
        return obj.employees.filter(status='active').count()


class EmployeeListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""
    department_name = serializers.CharField(source='department.dept_name', read_only=True)
    department_category = serializers.CharField(source='department.category', read_only=True)
    designation_name = serializers.CharField(source='designation.designation_name', read_only=True)
    designation_level = serializers.IntegerField(source='designation.level', read_only=True)
    manager_name = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    invitation_status = serializers.SerializerMethodField()
    pm_member_id = serializers.UUIDField(read_only=True)
    
    class Meta:
        model = Employee
        fields = [
            'id', 'employee_code', 'first_name', 'last_name', 'full_name',
            'email', 'phone', 'profile_image', 'status', 'employment_type',
            'department', 'department_name', 'department_category',
            'designation', 'designation_name', 'designation_level',
            'reporting_manager', 'manager_name', 'date_of_joining',
            'invitation_status', 'pm_member_id'
        ]
    
    def get_manager_name(self, obj):
        if obj.reporting_manager:
            return f"{obj.reporting_manager.first_name} {obj.reporting_manager.last_name}"
        return None
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"

    def get_invitation_status(self, obj):
        from pm.models import Members, MemberInvitations
        try:
            member = None
            if obj.pm_member_id:
                member = Members.objects.filter(member_id=obj.pm_member_id).first()
            
            if not member and obj.email:
                member = Members.objects.filter(email=obj.email).first()

            if not member:
                return 'Not In Member DB' # Should rare if synced

            if member.user:
                return 'Joined'
            
            invite = MemberInvitations.objects.filter(member=member, status='PENDING').first()
            if invite:
                return 'Invited'
            
            return 'Not Invited'
        except Exception:
            return 'Unknown'



class EmployeeSerializer(serializers.ModelSerializer):
    """Full serializer for detail/edit views"""
    department_name = serializers.CharField(source='department.dept_name', read_only=True)
    department_category = serializers.CharField(source='department.category', read_only=True)
    designation_name = serializers.CharField(source='designation.designation_name', read_only=True)
    manager_name = serializers.SerializerMethodField()
    direct_reports_count = serializers.SerializerMethodField()
    skills_summary = serializers.SerializerMethodField()
    # Login Access fields
    user = serializers.SerializerMethodField()
    user_username = serializers.SerializerMethodField()
    
    class Meta:
        model = Employee
        fields = '__all__'
    
    def get_user(self, obj):
        """Check if PM Member linked to this employee has a user"""
        from pm.models import Members
        member = None
        if obj.pm_member_id:
            try:
                member = Members.objects.get(member_id=obj.pm_member_id)
            except Members.DoesNotExist:
                pass
        # Fallback: look up by email
        if not member and obj.email:
            member = Members.objects.filter(email=obj.email).first()
        if member and member.user:
            return member.user.id
        return None
    
    def get_user_username(self, obj):
        """Return the linked PM Member's User username"""
        from pm.models import Members
        member = None
        if obj.pm_member_id:
            try:
                member = Members.objects.get(member_id=obj.pm_member_id)
            except Members.DoesNotExist:
                pass
        # Fallback: look up by email
        if not member and obj.email:
            member = Members.objects.filter(email=obj.email).first()
        if member and member.user:
            return member.user.username
        return None
    
    def get_manager_name(self, obj):
        if obj.reporting_manager:
            return f"{obj.reporting_manager.first_name} {obj.reporting_manager.last_name}"
        return None
    
    def get_direct_reports_count(self, obj):
        return obj.direct_reports.filter(status='active').count()
    
    def get_skills_summary(self, obj):
        return list(obj.skills.values_list('skill__name', flat=True)[:5])



class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = '__all__'


class EmployeeSkillSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source='skill.name', read_only=True)
    skill_category = serializers.CharField(source='skill.category', read_only=True)
    employee_name = serializers.SerializerMethodField()
    proficiency_display = serializers.CharField(source='get_proficiency_display', read_only=True)
    
    class Meta:
        model = EmployeeSkill
        fields = '__all__'
    
    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = '__all__'


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    leave_type_name = serializers.CharField(source='leave_type.leave_name', read_only=True)
    approver_name = serializers.SerializerMethodField()
    days_requested = serializers.ReadOnlyField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = LeaveRequest
        fields = '__all__'
    
    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"
    
    def get_approver_name(self, obj):
        if obj.approved_by:
            return f"{obj.approved_by.first_name} {obj.approved_by.last_name}"
        return None


class LeaveBalanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    leave_type_name = serializers.CharField(source='leave_type.leave_name', read_only=True)
    remaining_days = serializers.ReadOnlyField()
    
    class Meta:
        model = LeaveBalance
        fields = '__all__'
    
    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"


# Nested serializers for detailed views
class EmployeeDetailSerializer(EmployeeSerializer):
    """Extended serializer with nested skills and leave balances"""
    skills = EmployeeSkillSerializer(many=True, read_only=True)
    direct_reports = EmployeeListSerializer(many=True, read_only=True)
    current_year_leaves = serializers.SerializerMethodField()
    
    def get_current_year_leaves(self, obj):
        from datetime import date
        current_year = date.today().year
        balances = obj.leave_balances.filter(year=current_year)
        return LeaveBalanceSerializer(balances, many=True).data
