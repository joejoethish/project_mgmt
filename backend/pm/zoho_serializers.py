from rest_framework import serializers
from .zoho_models import ZohoBoard, ZohoSection, ZohoStatus, ZohoMember, ZohoTaskData, ZohoSyncLog
from .models import Projects, Members, TaskStatuses


class ZohoBoardSerializer(serializers.ModelSerializer):
    mapped_project_name = serializers.CharField(source='mapped_project.name', read_only=True, allow_null=True)
    sections_count = serializers.SerializerMethodField()
    tasks_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ZohoBoard
        fields = '__all__'
    
    def get_sections_count(self, obj):
        return obj.sections.count()
    
    def get_tasks_count(self, obj):
        return ZohoTaskData.objects.filter(board=obj).count()


class ZohoSectionSerializer(serializers.ModelSerializer):
    board_name = serializers.CharField(source='board.zoho_board_name', read_only=True)
    
    class Meta:
        model = ZohoSection
        fields = '__all__'


class ZohoStatusSerializer(serializers.ModelSerializer):
    mapped_status_name = serializers.CharField(source='mapped_status.name', read_only=True, allow_null=True)
    board_name = serializers.CharField(source='board.zoho_board_name', read_only=True, allow_null=True)
    
    class Meta:
        model = ZohoStatus
        fields = '__all__'


class ZohoMemberSerializer(serializers.ModelSerializer):
    mapped_member_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ZohoMember
        fields = '__all__'
    
    def get_mapped_member_name(self, obj):
        if obj.mapped_member:
            return f"{obj.mapped_member.first_name or ''} {obj.mapped_member.last_name or ''}".strip()
        return None


class ZohoTaskDataSerializer(serializers.ModelSerializer):
    board_name = serializers.CharField(source='board.zoho_board_name', read_only=True, allow_null=True)
    section_name = serializers.CharField(source='section.zoho_section_name', read_only=True, allow_null=True)
    status_name = serializers.CharField(source='status.zoho_status_name', read_only=True, allow_null=True)
    synced_task_title = serializers.CharField(source='synced_task.title', read_only=True, allow_null=True)
    
    class Meta:
        model = ZohoTaskData
        fields = '__all__'


class ZohoTaskDataListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views"""
    board_name = serializers.CharField(source='board.zoho_board_name', read_only=True, allow_null=True)
    status_name = serializers.CharField(source='status.zoho_status_name', read_only=True, allow_null=True)
    assignee_names = serializers.SerializerMethodField()
    
    class Meta:
        model = ZohoTaskData
        fields = ['id', 'zoho_task_id', 'title', 'board_name', 'status_name', 'priority_name', 
                  'category_name', 'trigger_type', 'triggered_by_name', 'triggered_time',
                  'is_synced', 'assignee_names', 'created_at', 'updated_at']
    
    def get_assignee_names(self, obj):
        if obj.assignees:
            return [a.get('name', '') for a in obj.assignees]
        return []


class ZohoSyncLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ZohoSyncLog
        fields = '__all__'


# Mapping serializers for UI
class BoardMappingSerializer(serializers.Serializer):
    """For mapping Zoho Board to PM Project"""
    board_id = serializers.UUIDField()
    mapped_project_id = serializers.UUIDField(required=False, allow_null=True)


class StatusMappingSerializer(serializers.Serializer):
    """For mapping Zoho Status to PM TaskStatus"""
    status_id = serializers.UUIDField()
    mapped_status_id = serializers.UUIDField(required=False, allow_null=True)


class MemberMappingSerializer(serializers.Serializer):
    """For mapping Zoho Member to PM Member"""
    member_id = serializers.UUIDField()
    mapped_member_id = serializers.UUIDField(required=False, allow_null=True)
