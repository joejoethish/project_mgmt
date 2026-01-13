from rest_framework import serializers
from .models import FormSubmission, FormDefinition


class FormSubmissionSerializer(serializers.ModelSerializer):
    """Serializer for form submissions"""
    # Explicitly define ip_address to avoid DRF IPAddressField crash with Django 5.x
    ip_address = serializers.CharField(required=False, allow_blank=True, allow_null=True, read_only=True)
    
    class Meta:
        model = FormSubmission
        fields = ['id', 'form_type', 'form_title', 'submitted_by', 'submission_data', 'submitted_at', 'ip_address']
        read_only_fields = ['id', 'submitted_at']
    
    def create(self, validated_data):
        # Get IP address from request context if available
        request = self.context.get('request')
        if request and not validated_data.get('ip_address'):
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                validated_data['ip_address'] = x_forwarded_for.split(',')[0]
            else:
                validated_data['ip_address'] = request.META.get('REMOTE_ADDR')
        
        return super().create(validated_data)


class FormDefinitionSerializer(serializers.ModelSerializer):
    """Serializer for form definitions"""
    
    class Meta:
        model = FormDefinition
        fields = ['id', 'title', 'slug', 'description', 'definition', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
