from rest_framework import serializers
from .models import Organization, Site, Department, Role, BillingConfiguration

class BillingConfigurationSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    company_name = serializers.CharField(source='organization.company_name', read_only=True)
    plan_name = serializers.CharField(source='plan.name', read_only=True, default=None)
    billing_amount = serializers.SerializerMethodField()

    class Meta:
        model = BillingConfiguration
        fields = '__all__'

    def get_billing_amount(self, obj):
        if not obj.plan:
            return None
        return float(obj.plan.yearly_price) if obj.billing_cycle == 'yearly' else float(obj.plan.monthly_price)

class SiteSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    
    class Meta:
        model = Site
        fields = '__all__'

class OrganizationSerializer(serializers.ModelSerializer):
    billing = BillingConfigurationSerializer(read_only=True)
    sites = SiteSerializer(many=True, read_only=True)

    class Meta:
        model = Organization
        fields = '__all__'

    def update(self, instance, validated_data):
        billing_data = self.initial_data.get('billing')
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if billing_data and isinstance(billing_data, dict):
            billing, _ = BillingConfiguration.objects.get_or_create(organization=instance)
            plan_id = billing_data.get('plan') or billing_data.get('plan_id')
            if plan_id:
                from master_setup.models import Plan
                billing.plan = Plan.objects.filter(id=plan_id).first()
            if 'billing_cycle' in billing_data:
                billing.billing_cycle = billing_data['billing_cycle']
            if 'rate' in billing_data:
                billing.rate = billing_data['rate']
            if 'solution_type' in billing_data:
                billing.solution_type = billing_data['solution_type']
            if 'solution_for' in billing_data:
                billing.solution_for = billing_data['solution_for']
            if 'billing_term' in billing_data:
                billing.billing_term = billing_data['billing_term']
            if 'duration_type' in billing_data:
                billing.duration_type = billing_data['duration_type']
            if 'start_date' in billing_data:
                billing.start_date = billing_data['start_date']
            if 'end_date' in billing_data:
                billing.end_date = billing_data['end_date']
            if 'billing_date' in billing_data:
                billing.billing_date = billing_data['billing_date']
            billing.save()

        return instance

class DepartmentSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ['id', 'organization', 'name', 'parent', 'user_count', 'created_at']
        read_only_fields = ['organization']

    def get_user_count(self, obj):
        return obj.users.count()


class RoleSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = [
            'id', 'organization', 'name', 'is_default', 'is_admin_role', 'user_count',
            'can_manage_users', 'can_manage_departments', 'can_manage_roles',
            'can_create_courses', 'can_edit_courses', 'can_publish_courses',
            'can_manage_module_access', 'can_view_reports', 'can_manage_certificates',
            'created_at',
        ]
        read_only_fields = ['organization', 'is_admin_role']

    def get_user_count(self, obj):
        return obj.users.count()

from .models import CertificateTemplate
class CertificateTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CertificateTemplate
        fields = '__all__'
        read_only_fields = ['organization']

from .models import ActivityLog
class ActivityLogActorSerializer(serializers.ModelSerializer):
    class Meta:
        from django.contrib.auth import get_user_model
        model = get_user_model()
        fields = ['id', 'username', 'email']

class ActivityLogOrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name']

class ActivityLogSerializer(serializers.ModelSerializer):
    actor = ActivityLogActorSerializer(read_only=True)
    organization = ActivityLogOrganizationSerializer(read_only=True)

    class Meta:
        model = ActivityLog
        fields = '__all__'
