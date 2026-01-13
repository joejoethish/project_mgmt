"""Enhanced HR URL routing"""
from rest_framework.routers import DefaultRouter
from .views import (
    DepartmentViewSet, DesignationViewSet, EmployeeViewSet, LeaveTypeViewSet,
    SkillViewSet, EmployeeSkillViewSet, LeaveRequestViewSet, LeaveBalanceViewSet
)

router = DefaultRouter()

router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'designations', DesignationViewSet, basename='designation')
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'leave-types', LeaveTypeViewSet, basename='leave-type')
router.register(r'skills', SkillViewSet, basename='skill')
router.register(r'employee-skills', EmployeeSkillViewSet, basename='employee-skill')
router.register(r'leave-requests', LeaveRequestViewSet, basename='leave-request')
router.register(r'leave-balances', LeaveBalanceViewSet, basename='leave-balance')

urlpatterns = router.urls