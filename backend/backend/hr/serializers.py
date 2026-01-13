"""Auto-generated DRF serializers"""
from rest_framework import serializers
from .models import Department, Designation, Employee, LeaveType


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'


class DesignationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Designation
        fields = '__all__'


class EmployeeSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.dept_name', read_only=True)
    designation_name = serializers.CharField(source='designation.designation_name', read_only=True)
    
    class Meta:
        model = Employee
        fields = '__all__'


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = '__all__'
