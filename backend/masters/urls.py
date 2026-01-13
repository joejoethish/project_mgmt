from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DynamicMasterViewSet, DynamicMasterFieldViewSet, DynamicMasterDataViewSet, MasterSchemaViewSet

router = DefaultRouter()
router.register(r'masters', DynamicMasterViewSet, basename='dynamic-master')
router.register(r'fields', DynamicMasterFieldViewSet, basename='dynamic-master-field')
router.register(r'schemas', MasterSchemaViewSet, basename='master-schema')

urlpatterns = [
    path('', include(router.urls)),
    
    # Dynamic data endpoints - pattern: /data/{master_name}/
    path('data/<str:master_name>/', 
         DynamicMasterDataViewSet.as_view({
             'get': 'list',
             'post': 'create'
         }), 
         name='dynamic-data-list'),
    
    path('data/<str:master_name>/<int:pk>/', 
         DynamicMasterDataViewSet.as_view({
             'get': 'retrieve',
             'put': 'update',
             'patch': 'partial_update',
             'delete': 'destroy'
         }), 
         name='dynamic-data-detail'),
    
    path('data/<str:master_name>/search/', 
         DynamicMasterDataViewSet.as_view({'get': 'search'}), 
         name='dynamic-data-search'),
    
    path('data/<str:master_name>/bulk/', 
         DynamicMasterDataViewSet.as_view({'post': 'bulk_create'}), 
         name='dynamic-data-bulk'),
]
