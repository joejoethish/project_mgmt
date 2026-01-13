"""Enhanced HR DRF viewsets"""
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from datetime import date

from .models import (
    Department, Designation, Employee, LeaveType,
    Skill, EmployeeSkill, LeaveRequest, LeaveBalance
)
from .serializers import (
    DepartmentSerializer, DesignationSerializer, 
    EmployeeSerializer, EmployeeListSerializer, EmployeeDetailSerializer,
    LeaveTypeSerializer, SkillSerializer, EmployeeSkillSerializer,
    LeaveRequestSerializer, LeaveBalanceSerializer
)


class DepartmentViewSet(viewsets.ModelViewSet):
    """Departments CRUD operations"""
    queryset = Department.objects.select_related('parent_dept', 'head').all()
    serializer_class = DepartmentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['dept_code', 'dept_name']
    filterset_fields = ['is_active', 'parent_dept', 'category']
    ordering_fields = ['dept_name', 'dept_code', 'category']
    
    @action(detail=True, methods=['get'])
    def employees(self, request, pk=None):
        """Get all employees in this department"""
        department = self.get_object()
        employees = department.employees.filter(status='active')
        serializer = EmployeeListSerializer(employees, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Get departments grouped by category"""
        categories = {}
        for dept in self.queryset.filter(is_active=True):
            cat = dept.get_category_display()
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(DepartmentSerializer(dept).data)
        return Response(categories)


class DesignationViewSet(viewsets.ModelViewSet):
    """Designations CRUD operations"""
    queryset = Designation.objects.all()
    serializer_class = DesignationSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['designation_code', 'designation_name']
    filterset_fields = ['is_active', 'level']
    ordering_fields = ['designation_name', 'level']


class EmployeeViewSet(viewsets.ModelViewSet):
    """Employees CRUD operations with PM member sync"""
    queryset = Employee.objects.select_related(
        'department', 'designation', 'reporting_manager'
    ).prefetch_related('skills__skill', 'direct_reports').all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['employee_code', 'first_name', 'last_name', 'email']
    filterset_fields = ['department', 'designation', 'status', 'employment_type', 'department__category']
    ordering_fields = ['first_name', 'last_name', 'employee_code', 'date_of_joining']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return EmployeeListSerializer
        elif self.action == 'retrieve':
            return EmployeeDetailSerializer
        return EmployeeSerializer
    
    def perform_create(self, serializer):
        """Create employee and optionally sync to PM members"""
        employee = serializer.save()
        role_id = self.request.data.get('role_id')
        username = self.request.data.get('username')
        password = self.request.data.get('password')
        self._sync_to_pm_member(employee, role_id, username, password)
    
    def perform_update(self, serializer):
        """Update employee and sync changes to PM members"""
        employee = serializer.save()
        role_id = self.request.data.get('role_id')
        username = self.request.data.get('username')
        password = self.request.data.get('password')
        self._sync_to_pm_member(employee, role_id, username, password)
    
    def _sync_to_pm_member(self, employee, role_id=None, username=None, password=None):
        """Sync employee data to PM Members table"""
        from pm.models import Members
        from django.contrib.auth.models import User
        
        # Helper to create/update User
        user = None
        if username and password:
            # First check if employee already has a linked member with a user
            if employee.pm_member_id:
                try:
                    member = Members.objects.get(member_id=employee.pm_member_id)
                    if member.user:
                        user = member.user
                        user.username = username
                        user.set_password(password)
                        user.save()
                    else:
                        # Check if username already exists
                        existing_user = User.objects.filter(username=username).first()
                        if existing_user:
                            # Update existing user
                            existing_user.set_password(password)
                            existing_user.email = employee.email
                            existing_user.save()
                            user = existing_user
                        else:
                            user = User.objects.create_user(username=username, password=password, email=employee.email)
                except Members.DoesNotExist:
                    # Check if username already exists
                    existing_user = User.objects.filter(username=username).first()
                    if existing_user:
                        existing_user.set_password(password)
                        existing_user.email = employee.email
                        existing_user.save()
                        user = existing_user
                    else:
                        user = User.objects.create_user(username=username, password=password, email=employee.email)
            else:
                # Check if username already exists
                existing_user = User.objects.filter(username=username).first()
                if existing_user:
                    existing_user.set_password(password)
                    existing_user.email = employee.email
                    existing_user.save()
                    user = existing_user
                else:
                    user = User.objects.create_user(username=username, password=password, email=employee.email)

        if employee.pm_member_id:
            # Update existing PM member
            try:
                member = Members.objects.get(member_id=employee.pm_member_id)
                member.first_name = employee.first_name
                member.last_name = employee.last_name
                member.email = employee.email
                member.phone = employee.phone
                member.profile_image_url = employee.profile_image
                member.is_active = (employee.status == 'active')
                if role_id:
                    member.role_id_id = role_id
                if user:
                    member.user = user
                member.save()
            except Members.DoesNotExist:
                pass
        else:
            # First check if member exists by email
            existing_member = Members.objects.filter(email=employee.email).first()
            if existing_member:
                # Link existing member and update
                existing_member.first_name = employee.first_name
                existing_member.last_name = employee.last_name
                existing_member.phone = employee.phone
                existing_member.profile_image_url = employee.profile_image
                existing_member.is_active = (employee.status == 'active')
                if role_id:
                    existing_member.role_id_id = role_id
                if user:
                    existing_member.user = user
                existing_member.save()
                employee.pm_member_id = existing_member.member_id
                employee.save(update_fields=['pm_member_id'])
            else:
                # Create new PM member and link
                try:
                    member = Members.objects.create(
                        first_name=employee.first_name,
                        last_name=employee.last_name,
                        email=employee.email,
                        phone=employee.phone,
                        profile_image_url=employee.profile_image,
                        is_active=(employee.status == 'active'),
                        role_id_id=role_id if role_id else None,
                        user=user
                    )
                    employee.pm_member_id = member.member_id
                    employee.save(update_fields=['pm_member_id'])
                except Exception as e:
                    print(f"Failed to sync to PM: {e}")
    
    @action(detail=True, methods=['get'])
    def skills(self, request, pk=None):
        """Get employee skills"""
        employee = self.get_object()
        skills = employee.skills.select_related('skill').all()
        serializer = EmployeeSkillSerializer(skills, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_skill(self, request, pk=None):
        """Add skill to employee"""
        employee = self.get_object()
        serializer = EmployeeSkillSerializer(data={
            **request.data,
            'employee': employee.id
        })
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def direct_reports(self, request, pk=None):
        """Get direct reports of this employee"""
        employee = self.get_object()
        reports = employee.direct_reports.filter(status='active')
        serializer = EmployeeListSerializer(reports, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def leave_balance(self, request, pk=None):
        """Get current year leave balances"""
        employee = self.get_object()
        year = request.query_params.get('year', date.today().year)
        balances = employee.leave_balances.filter(year=year)
        serializer = LeaveBalanceSerializer(balances, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_department(self, request):
        """Get employees grouped by department"""
        dept_id = request.query_params.get('department')
        if dept_id:
            employees = self.queryset.filter(department_id=dept_id, status='active')
        else:
            employees = self.queryset.filter(status='active')
        serializer = EmployeeListSerializer(employees, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def dev_team(self, request):
        """Get all development team members"""
        employees = self.queryset.filter(
            department__category='development',
            status='active'
        )
        serializer = EmployeeListSerializer(employees, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def qa_team(self, request):
        """Get all QA team members"""
        employees = self.queryset.filter(
            department__category='qa',
            status='active'
        )
        serializer = EmployeeListSerializer(employees, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def implementation_team(self, request):
        """Get all implementation team members"""
        employees = self.queryset.filter(
            department__category='implementation',
            status='active'
        )
        serializer = EmployeeListSerializer(employees, many=True)
        return Response(serializer.data)


class SkillViewSet(viewsets.ModelViewSet):
    """Skills master CRUD"""
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    filterset_fields = ['category', 'is_active']
    ordering_fields = ['name', 'category']


class EmployeeSkillViewSet(viewsets.ModelViewSet):
    """Employee-Skill mapping CRUD"""
    queryset = EmployeeSkill.objects.select_related('employee', 'skill').all()
    serializer_class = EmployeeSkillSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['employee', 'skill', 'proficiency', 'certified']
    ordering_fields = ['proficiency', 'years_experience']


class LeaveTypeViewSet(viewsets.ModelViewSet):
    """Leave Types CRUD operations"""
    queryset = LeaveType.objects.all()
    serializer_class = LeaveTypeSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['leave_code', 'leave_name']
    filterset_fields = ['is_active', 'is_paid']
    ordering_fields = ['leave_name']


class LeaveRequestViewSet(viewsets.ModelViewSet):
    """Leave Requests CRUD with approval workflow"""
    queryset = LeaveRequest.objects.select_related(
        'employee', 'leave_type', 'approved_by'
    ).all()
    serializer_class = LeaveRequestSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['employee', 'leave_type', 'status']
    ordering_fields = ['created_at', 'start_date']
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a leave request"""
        leave_request = self.get_object()
        if leave_request.status != 'pending':
            return Response(
                {'error': 'Can only approve pending requests'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        approver_id = request.data.get('approver_id')
        leave_request.status = 'approved'
        leave_request.approved_by_id = approver_id
        leave_request.approved_at = timezone.now()
        leave_request.save()
        
        # Update leave balance
        balance, created = LeaveBalance.objects.get_or_create(
            employee=leave_request.employee,
            leave_type=leave_request.leave_type,
            year=leave_request.start_date.year,
            defaults={'total_days': leave_request.leave_type.max_days_per_year}
        )
        balance.used_days += leave_request.days_requested
        balance.save()
        
        return Response(LeaveRequestSerializer(leave_request).data)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a leave request"""
        leave_request = self.get_object()
        if leave_request.status != 'pending':
            return Response(
                {'error': 'Can only reject pending requests'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        leave_request.status = 'rejected'
        leave_request.rejection_reason = request.data.get('reason', '')
        leave_request.approved_by_id = request.data.get('approver_id')
        leave_request.approved_at = timezone.now()
        leave_request.save()
        
        return Response(LeaveRequestSerializer(leave_request).data)
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get all pending leave requests"""
        pending = self.queryset.filter(status='pending')
        serializer = LeaveRequestSerializer(pending, many=True)
        return Response(serializer.data)


class LeaveBalanceViewSet(viewsets.ModelViewSet):
    """Leave Balances CRUD"""
    queryset = LeaveBalance.objects.select_related('employee', 'leave_type').all()
    serializer_class = LeaveBalanceSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['employee', 'leave_type', 'year']
    ordering_fields = ['year', 'total_days']
