from rest_framework import serializers
from .models import DynamicMaster, DynamicMasterField, DynamicMasterData, MasterSchema
from django.contrib.auth.models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class DynamicMasterFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = DynamicMasterField
        fields = [
            'id', 'field_name', 'display_name', 'field_type',
            'is_required', 'is_unique', 'max_length', 'min_value', 'max_value',
            'default_value', 'choices_json', 'order', 'help_text', 'placeholder',
            'show_in_list', 'show_in_form'
        ]


class DynamicMasterSerializer(serializers.ModelSerializer):
    fields = DynamicMasterFieldSerializer(many=True, read_only=True)
    created_by = UserSerializer(read_only=True)
    record_count = serializers.SerializerMethodField()
    
    class Meta:
        model = DynamicMaster
        fields = [
            'id', 'name', 'display_name', 'description', 'icon',
            'table_name', 'is_searchable', 'is_exportable', 'allow_duplicate',
            'fields', 'created_by', 'created_at', 'updated_at', 'is_active',
            'record_count'
        ]
        read_only_fields = ['table_name', 'created_by', 'created_at', 'updated_at']
    
    def get_record_count(self, obj):
        return obj.data_records.filter(is_active=True).count()
    
    def create(self, validated_data):
        # Only set created_by if user is authenticated
        if self.context['request'].user.is_authenticated:
            validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class DynamicMasterCreateSerializer(serializers.Serializer):
    """Serializer for creating a master with fields in one request"""
    name = serializers.CharField(max_length=100)
    display_name = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True)
    icon = serializers.CharField(required=False, allow_blank=True, default='📋')
    is_searchable = serializers.BooleanField(default=True)
    is_exportable = serializers.BooleanField(default=True)
    allow_duplicate = serializers.BooleanField(default=False)
    
    fields = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=False
    )
    
    def validate_fields(self, value):
        """Validate field definitions"""
        if not value:
            raise serializers.ValidationError("At least one field is required")
        
        field_names = set()
        for field_def in value:
            field_name = field_def.get('field_name')
            if not field_name:
                raise serializers.ValidationError("Each field must have a field_name")
            
            if field_name in field_names:
                raise serializers.ValidationError(f"Duplicate field name: {field_name}")
            
            field_names.add(field_name)
        
        return value
    
    def create(self, validated_data):
        fields_data = validated_data.pop('fields')
        
        # Create master
        # Only set created_by if user is authenticated
        if self.context['request'].user.is_authenticated:
            validated_data['created_by'] = self.context['request'].user
        
        master = DynamicMaster.objects.create(**validated_data)
        
        # Create fields
        for field_data in fields_data:
            # Extract order from field_data or use 0 as default
            field_order = field_data.pop('order', 0)
            DynamicMasterField.objects.create(
                master=master,
                order=field_order,
                **field_data
            )
        
        return master


class DynamicMasterDataSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)
    
    class Meta:
        model = DynamicMasterData
        fields = ['id', 'data', 'created_at', 'updated_at', 'created_by', 'updated_by', 'is_active']
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'updated_by']
    
    def validate_data(self, value):
        """Validate data against master field definitions"""
        master = self.context.get('master')
        if not master:
            return value
        
        fields = master.fields.all()
        errors = {}
        
        for field in fields:
            field_value = value.get(field.field_name)
            
            # Check required fields
            if field.is_required and not field_value:
                errors[field.field_name] = f'{field.display_name} is required'
            
            # Type validation
            if field_value:
                if field.field_type == 'number':
                    try:
                        num_val = float(field_value)
                        if field.min_value is not None and num_val < field.min_value:
                            errors[field.field_name] = f'Must be at least {field.min_value}'
                        if field.max_value is not None and num_val > field.max_value:
                            errors[field.field_name] = f'Must be at most {field.max_value}'
                    except ValueError:
                        errors[field.field_name] = 'Must be a number'
                
                elif field.field_type == 'email':
                    if '@' not in str(field_value):
                        errors[field.field_name] = 'Invalid email address'
                
                elif field.field_type == 'text' and field.max_length:
                    if len(str(field_value)) > field.max_length:
                        errors[field.field_name] = f'Maximum length is {field.max_length}'
                
                elif field.field_type == 'select':
                    if field.choices_json and field_value not in field.choices_json:
                        errors[field.field_name] = f'Invalid choice. Must be one of: {", ".join(field.choices_json)}'
        
        if errors:
            raise serializers.ValidationError(errors)
        
        return value
    
    
    def create(self, validated_data):
        # Only set created_by if user is authenticated
        if self.context['request'].user.is_authenticated:
            validated_data['created_by'] = self.context['request'].user
            validated_data['updated_by'] = self.context['request'].user
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        # Only set updated_by if user is authenticated
        if self.context['request'].user.is_authenticated:
            validated_data['updated_by'] = self.context['request'].user
        return super().update(instance, validated_data)


class MasterSchemaSerializer(serializers.ModelSerializer):
    """Serializer for Visual Master Builder schemas"""
    created_by = UserSerializer(read_only=True)
    master_count = serializers.SerializerMethodField()
    relationship_count = serializers.SerializerMethodField()
    
    class Meta:
        model = MasterSchema
        fields = [
            'id', 'name', 'description', 'schema_data',
            'created_by', 'created_at', 'updated_at', 'version',
            'is_active', 'master_count', 'relationship_count'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at', 'version']
    
    def get_master_count(self, obj):
        """Count nodes in schema"""
        return len(obj.schema_data.get('nodes', []))
    
    def get_relationship_count(self, obj):
        """Count edges in schema"""
        return len(obj.schema_data.get('edges', []))
    
    def create(self, validated_data):
        """Set created_by on create"""
        if self.context['request'].user.is_authenticated:
            validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Increment version on update"""
        instance.version += 1
        return super().update(instance, validated_data)

