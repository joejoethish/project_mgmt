from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.shortcuts import get_object_or_404

from .models import DynamicMaster, DynamicMasterField, DynamicMasterData, MasterSchema
from .serializers import (
    DynamicMasterSerializer,
    DynamicMasterCreateSerializer,
    DynamicMasterFieldSerializer,
    DynamicMasterDataSerializer,
    MasterSchemaSerializer
)


class DynamicMasterViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing dynamic master definitions
    
    list: Get all master definitions
    retrieve: Get one master definition with fields
    create: Create a new master with fields
    update: Update master definition
    destroy: Delete master (soft delete)
    """
    queryset = DynamicMaster.objects.filter(is_active=True).prefetch_related('fields')
    serializer_class = DynamicMasterSerializer
    permission_classes = [AllowAny]  # TODO: Add proper permissions
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'display_name', 'description']
    filterset_fields = ['is_active', 'is_searchable', 'is_exportable']
    ordering_fields = ['display_name', 'created_at']
    ordering = ['display_name']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return DynamicMasterCreateSerializer
        return DynamicMasterSerializer
    
    def create(self, request, *args, **kwargs):
        """Create master and return properly serialized response"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        master = serializer.save()
        
        # Reload with prefetched fields for response
        master = DynamicMaster.objects.prefetch_related('fields').get(pk=master.pk)
        
        # Use read serializer for response
        response_serializer = DynamicMasterSerializer(master)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete"""
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['post'])
    def add_field(self, request, pk=None):
        """Add a new field to existing master"""
        master = self.get_object()
        serializer = DynamicMasterFieldSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save(master=master)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def export_schema(self, request, pk=None):
        """Export master definition as JSON schema"""
        master = self.get_object()
        serializer = self.get_serializer(master)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def import_schema(self, request):
        """Import master definition from JSON schema"""
        serializer = DynamicMasterCreateSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            master = serializer.save()
            return Response(
                DynamicMasterSerializer(master).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DynamicMasterFieldViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing fields of dynamic masters
    """
    queryset = DynamicMasterField.objects.all()
    serializer_class = DynamicMasterFieldSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['master', 'field_type', 'is_required', 'show_in_list', 'show_in_form']
    ordering_fields = ['order', 'display_name']
    ordering = ['order']


class DynamicMasterDataViewSet(viewsets.ModelViewSet):
    """
    Generic ViewSet for CRUD operations on any dynamic master's data
    
    URL pattern: /api/masters/data/{master_name}/
    """
    serializer_class = DynamicMasterDataSerializer
    permission_classes = [AllowAny]
    filter_backends = [SearchFilter, OrderingFilter]
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        master_name = self.kwargs.get('master_name')
        master = get_object_or_404(DynamicMaster, name=master_name, is_active=True)
        return DynamicMasterData.objects.filter(
            master=master,
            is_active=True
        ).select_related('created_by', 'updated_by')
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        master_name = self.kwargs.get('master_name')
        if master_name:
            context['master'] = get_object_or_404(DynamicMaster, name=master_name, is_active=True)
        return context
    
    def create(self, request, *args, **kwargs):
        master_name = kwargs.get('master_name')
        master = get_object_or_404(DynamicMaster, name=master_name, is_active=True)
        
        serializer = self.get_serializer(data=request.data, context={'master': master, 'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save(master=master)
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete"""
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'])
    def search(self, request, master_name=None):
        """Search across all fields"""
        queryset = self.filter_queryset(self.get_queryset())
        search_term = request.query_params.get('q', '')
        
        if search_term:
            # Search in JSON data fields
            filtered_records = []
            for record in queryset:
                for key, value in record.data.items():
                    if search_term.lower() in str(value).lower():
                        filtered_records.append(record)
                        break
            
            queryset = filtered_records
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def bulk_create(self, request, master_name=None):
        """Bulk create records"""
        master = get_object_or_404(DynamicMaster, name=master_name, is_active=True)
        records_data = request.data.get('records', [])
        
        created_records = []
        errors = []
        
        for idx, record_data in enumerate(records_data):
            serializer = self.get_serializer(data={'data': record_data}, context={'master': master, 'request': request})
            
            if serializer.is_valid():
                serializer.save(master=master)
                created_records.append(serializer.data)
            else:
                errors.append({
                    'index': idx,
                    'errors': serializer.errors
                })
        
        return Response({
            'created': len(created_records),
            'failed': len(errors),
            'created_records': created_records,
            'errors': errors
        }, status=status.HTTP_201_CREATED if created_records else status.HTTP_400_BAD_REQUEST)


class MasterSchemaViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Visual Master Builder schemas
    
    list: Get all schemas
    retrieve: Get one schema with full data
    create: Create new schema
    update: Update schema (increments version)
    destroy: Delete schema (soft delete)
    duplicate: Create a copy of existing schema
    """
    queryset = MasterSchema.objects.filter(is_active=True)
    serializer_class = MasterSchemaSerializer
    permission_classes = [AllowAny]  # TODO: Add proper permissions
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['-updated_at']
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate an existing schema"""
        original = self.get_object()
        
        # Generate unique name
        base_name = f"{original.name}_copy"
        name = base_name
        counter = 1
        while MasterSchema.objects.filter(name=name, is_active=True).exists():
            name = f"{base_name}_{counter}"
            counter += 1
        
        # Create duplicate
        new_schema = MasterSchema.objects.create(
            name=name,
            description=original.description,
            schema_data=original.schema_data,
            created_by=request.user if request.user.is_authenticated else None
        )
        
        serializer = self.get_serializer(new_schema)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
