from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from .models import FormSubmission, FormDefinition
from .serializers import FormSubmissionSerializer, FormDefinitionSerializer


class FormSubmissionCreateView(generics.CreateAPIView):
    """API endpoint to submit a form"""
    queryset = FormSubmission.objects.all()
    serializer_class = FormSubmissionSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        
        return Response({
            'id': instance.id,
            'message': 'Form submitted successfully',
            'submitted_at': instance.submitted_at.isoformat()
        }, status=status.HTTP_201_CREATED)


class FormSubmissionListView(generics.ListAPIView):
    """API endpoint to list all form submissions"""
    queryset = FormSubmission.objects.all()
    serializer_class = FormSubmissionSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Filter by form_type if provided
        form_type = self.request.query_params.get('form_type')
        if form_type:
            queryset = queryset.filter(form_type=form_type)
        return queryset


class FormDefinitionDetailView(generics.RetrieveAPIView):
    """API endpoint to get a form definition by slug"""
    queryset = FormDefinition.objects.filter(is_active=True)
    serializer_class = FormDefinitionSerializer
    lookup_field = 'slug'


@api_view(['GET'])
def health_check(request):
    """Simple health check endpoint"""
    return Response({'status': 'ok', 'message': 'Django backend is running'})
