"""Auto-generated URL routing"""
from rest_framework.routers import DefaultRouter
from .views import DepartmentViewSet, DesignationViewSet, EmployeeViewSet, LeaveTypeViewSet

router = DefaultRouter()

router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'designations', DesignationViewSet, basename='designation')
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'leave-types', LeaveTypeViewSet, basename='leave-type')

urlpatterns = router.urls