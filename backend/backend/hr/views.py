"""Auto-generated DRF viewsets"""
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Department, Designation, Employee, LeaveType
from .serializers import DepartmentSerializer, DesignationSerializer, EmployeeSerializer, LeaveTypeSerializer


class DepartmentViewSet(viewsets.ModelViewSet):
    """Departments CRUD operations"""
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['dept_code', 'dept_name']
    filterset_fields = ['is_active', 'parent_dept']
    ordering_fields = ['dept_name', 'dept_code']


class DesignationViewSet(viewsets.ModelViewSet):
    """Designations CRUD operations"""
    queryset = Designation.objects.all()
    serializer_class = DesignationSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['designation_code', 'designation_name']
    filterset_fields = ['is_active', 'level']
    ordering_fields = ['designation_name', 'level']


class EmployeeViewSet(viewsets.ModelViewSet):
    """Employees CRUD operations"""
    queryset = Employee.objects.select_related('department', 'designation').all()
    serializer_class = EmployeeSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['employee_code', 'first_name', 'last_name', 'email']
    filterset_fields = ['department', 'designation', 'status']
    ordering_fields = ['first_name', 'last_name', 'employee_code']


class LeaveTypeViewSet(viewsets.ModelViewSet):
    """Leave Types CRUD operations"""
    queryset = LeaveType.objects.all()
    serializer_class = LeaveTypeSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['leave_code', 'leave_name']
    filterset_fields = ['is_active', 'is_paid']
    ordering_fields = ['leave_name']
