from rest_framework import serializers
from .models import ReportDefinition, Dataset, DatasetColumn


class DatasetColumnSerializer(serializers.ModelSerializer):
    class Meta:
        model = DatasetColumn
        fields = '__all__'


class DatasetSerializer(serializers.ModelSerializer):
    columns = DatasetColumnSerializer(many=True, read_only=True)
    
    class Meta:
        model = Dataset
        fields = '__all__'


class DatasetListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for dropdowns"""
    column_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Dataset
        fields = ['dataset_id', 'name', 'description', 'query_type', 'is_active', 'column_count']
    
    def get_column_count(self, obj):
        return obj.columns.count()


class ReportDefinitionSerializer(serializers.ModelSerializer):
    dataset_name = serializers.CharField(source='dataset.name', read_only=True, allow_null=True)
    dataset_model = serializers.CharField(source='dataset.primary_model', read_only=True, allow_null=True)
    
    class Meta:
        model = ReportDefinition
        fields = '__all__'
