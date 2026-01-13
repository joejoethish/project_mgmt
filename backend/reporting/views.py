from rest_framework import viewsets, views, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ReportDefinition, Dataset, DatasetColumn
from .serializers import (
    ReportDefinitionSerializer, 
    DatasetSerializer, 
    DatasetListSerializer,
    DatasetColumnSerializer
)
from .services.schema import SchemaService
from .services.query import QueryBuilderService
from .services.executor import DatasetExecutor


class DatasetViewSet(viewsets.ModelViewSet):
    """CRUD for Datasets (Power User)"""
    queryset = Dataset.objects.all()
    serializer_class = DatasetSerializer
    
    def get_serializer_class(self):
        if self.action == 'list':
            return DatasetListSerializer
        return DatasetSerializer
    
    @action(detail=True, methods=['get'])
    def columns(self, request, pk=None):
        """Get columns for a dataset"""
        dataset = self.get_object()
        columns = DatasetExecutor.get_columns(dataset)
        return Response(columns)
    
    @action(detail=True, methods=['post'])
    def preview(self, request, pk=None):
        """Execute dataset and return preview data"""
        dataset = self.get_object()
        filters = request.data.get('filters', {})
        limit = request.data.get('limit', 50)
        
        try:
            data = DatasetExecutor.execute(dataset, filters, limit)
            columns = DatasetExecutor.get_columns(dataset)
            return Response({
                'data': data,
                'columns': columns,
                'count': len(data)
            })
        except Exception as e:
            return Response({'error': str(e)}, status=400)
    
    @action(detail=True, methods=['post'])
    def add_column(self, request, pk=None):
        """Add a column to dataset"""
        dataset = self.get_object()
        serializer = DatasetColumnSerializer(data={**request.data, 'dataset': dataset.dataset_id})
        if serializer.is_valid():
            serializer.save(dataset=dataset)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @action(detail=True, methods=['post'])
    def clear_columns(self, request, pk=None):
        """Delete all columns for this dataset"""
        dataset = self.get_object()
        dataset.columns.all().delete()
        return Response({'status': 'cleared'})


class DatasetColumnViewSet(viewsets.ModelViewSet):
    """CRUD for Dataset Columns"""
    queryset = DatasetColumn.objects.all()
    serializer_class = DatasetColumnSerializer


class ReportDefinitionViewSet(viewsets.ModelViewSet):
    """CRUD for saved reports"""
    queryset = ReportDefinition.objects.all()
    serializer_class = ReportDefinitionSerializer

    def perform_create(self, serializer):
        created_by = None
        if hasattr(self.request.user, 'member'):
            created_by = str(self.request.user.member.member_id)
        elif self.request.user.username:
            created_by = self.request.user.username
            
        serializer.save(created_by=created_by)


class SchemaView(views.APIView):
    """GET /api/reporting/schema/ -> List models or model fields"""
    def get(self, request):
        model_key = request.query_params.get('model')
        tree = request.query_params.get('tree')  # If ?tree=true, return relation tree
        
        if not model_key:
            return Response(SchemaService.get_models())
        else:
            try:
                app_label, model_name = model_key.split('.')
                
                if tree:
                    # Return relation tree for visual picker
                    relation_tree = SchemaService.get_relation_tree(app_label, model_name)
                    if relation_tree:
                        return Response(relation_tree)
                    return Response({'error': 'Model not found'}, status=404)
                
                schema = SchemaService.get_model_schema(app_label, model_name)
                if schema:
                    return Response(schema)
                return Response({'error': 'Model not found'}, status=404)
            except ValueError:
                return Response({'error': 'Invalid format. Use app.Model'}, status=400)



class PreviewView(views.APIView):
    """POST /api/reporting/preview/ - Preview report data"""
    def post(self, request):
        config = request.data
        
        # Check if using Dataset
        dataset_id = config.get('dataset_id')
        if dataset_id:
            try:
                dataset = Dataset.objects.get(dataset_id=dataset_id)
                filters = config.get('filters', {})
                data = DatasetExecutor.execute(dataset, filters, limit=50)
                return Response({'data': data, 'count': len(data)})
            except Dataset.DoesNotExist:
                return Response({'error': 'Dataset not found'}, status=404)
            except Exception as e:
                import traceback
                traceback.print_exc()
                return Response({'error': f'Dataset execution error: {str(e)}'}, status=400)
        
        # Legacy: direct model query
        try:
            qs = QueryBuilderService.build_query(config)
            data = list(qs[:50])
            return Response({'data': data, 'count': len(data)})
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=400)

class OptionsView(views.APIView):
    """GET /api/reporting/options/?model=app.Model"""
    def get(self, request):
        model_key = request.query_params.get('model')
        if not model_key: return Response({'error': 'Model required'}, status=400)
        
        try:
            from django.apps import apps
            app_label, model_name = model_key.split('.')
            Model = apps.get_model(app_label, model_name)
            
            # Check if specific field requested
            field_name = request.query_params.get('field')
            if field_name:
                 # Fetch distinct values for specific field (e.g. status, category)
                 qs = Model.objects.values_list(field_name, flat=True).distinct().order_by(field_name)[:50]
                 options = [{'value': str(x), 'label': str(x)} for x in qs if x is not None]
                 return Response(options)

            # Default: Model instances (ID/Label)
            # Limit to 50 options for dropdown
            qs = Model.objects.all()[:50]
            options = []
            for obj in qs:
                options.append({'value': obj.pk, 'label': str(obj)})
            
            return Response(options)
        except Exception as e:
            return Response({'error': str(e)}, status=400)


class FixColumnsView(views.APIView):
    """GET /api/reporting/fix-columns/ - Auto-fix invalid dataset column paths"""
    def get(self, request):
        from django.apps import apps
        
        results = []
        
        for ds in Dataset.objects.all():
            if not ds.primary_model:
                continue
            
            try:
                app_label, model_name = ds.primary_model.split('.')
                model = apps.get_model(app_label, model_name)
            except Exception:
                continue
            
            # Get valid direct fields and relations
            valid_fields = set()
            relations = {}
            
            for field in model._meta.get_fields():
                if hasattr(field, 'name'):
                    valid_fields.add(field.name)
                    if hasattr(field, 'related_model') and field.related_model:
                        relations[field.name] = field.related_model
            
            # Check each column
            for col in DatasetColumn.objects.filter(dataset=ds):
                field_name = col.field_name
                
                # Skip if already has __ (relation path)
                if '__' in field_name:
                    continue
                
                # Skip if valid direct field
                if field_name in valid_fields:
                    continue
                
                # Try to find in relations
                for rel_name, rel_model in relations.items():
                    rel_fields = [f.name for f in rel_model._meta.get_fields() if hasattr(f, 'name')]
                    
                    if field_name in rel_fields:
                        old_path = col.field_name
                        new_path = f"{rel_name}__{field_name}"
                        col.field_name = new_path
                        col.save()
                        results.append({
                            'dataset': ds.name,
                            'old': old_path,
                            'new': new_path,
                            'status': 'fixed'
                        })
                        break
                    
                    # Check for nested relation
                    for rel_field in rel_model._meta.get_fields():
                        if hasattr(rel_field, 'name') and rel_field.name == field_name:
                            if hasattr(rel_field, 'related_model') and rel_field.related_model:
                                old_path = col.field_name
                                new_path = f"{rel_name}__{field_name}"
                                col.field_name = new_path
                                col.save()
                                results.append({
                                    'dataset': ds.name,
                                    'old': old_path,
                                    'new': new_path,
                                    'status': 'fixed'
                                })
                                break
        
        return Response({
            'fixes': results,
            'count': len(results)
        })

