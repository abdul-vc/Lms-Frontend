from django.conf import settings
from rest_framework import viewsets, permissions
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Organization, Site, BillingConfiguration, Department, Role
from .serializers import OrganizationSerializer, SiteSerializer, BillingConfigurationSerializer, DepartmentSerializer, RoleSerializer
from .permissions import IsOrgScoped
from .audit import log_activity


class PlatformStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (
            getattr(request.user, 'is_platform_super_admin', False)
            or getattr(request.user, 'is_superuser', False)
            or getattr(request.user, 'is_staff', False)
        ):
            return Response({'detail': 'Forbidden'}, status=403)

        from django.contrib.auth import get_user_model
        User = get_user_model()

        total_orgs = Organization.objects.count()
        # "active_organizations" = orgs whose status field is active (case-insensitive)
        active_orgs = Organization.objects.filter(status__iexact='active').count()
        total_sites = Site.objects.count()
        total_users = User.objects.filter(is_active=True).count()

        return Response({
            'organizations': total_orgs,
            'active_organizations': active_orgs,
            'sites': total_sites,
            'active_users': total_users,
        })

class OrganizationViewSet(viewsets.ModelViewSet):
    """
    Platform super-admins see all organizations.
    Org-admins should use /api/organizations/my/ to see only their own org.
    This list endpoint is super-admin only for safety.
    """
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated, IsOrgScoped]

    def get_queryset(self):
        if self.request.user.is_platform_super_admin:
            return Organization.objects.all()
        # Org-scoped users can only see their own organization
        return Organization.objects.filter(id=self.request.user.organization_id)

    def perform_create(self, serializer):
        org = serializer.save()
        log_activity(self.request, 'org_created', target=org, organization=org)

    def perform_update(self, serializer):
        org = serializer.save()
        log_activity(self.request, 'org_updated', target=org, organization=org)

    def perform_destroy(self, instance):
        log_activity(self.request, 'org_deleted', target=instance, organization=instance)
        instance.delete()


class MyOrganizationView(APIView):
    """Returns the requesting user's own organization including enabled feature keys."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.organization:
            return Response({'detail': 'Not associated with any organization.'}, status=404)
        org = request.user.organization
        data = OrganizationSerializer(org).data
        
        from master_setup.models import OrganizationFeatureAccess
        enabled_features = list(OrganizationFeatureAccess.objects.filter(
            organization=org, enabled=True
        ).values_list('feature__key', flat=True))
        
        data['enabled_features'] = enabled_features
        return Response(data)


class MyOrganizationStatsView(APIView):
    """Returns rich real-time stats for the user's organization."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.organization:
            return Response({'detail': 'Not associated with any organization.'}, status=404)
        
        org = request.user.organization
        from django.contrib.auth import get_user_model
        from courses.models import Course, AssessmentAttempt, AccessRequest
        from .models import Department, Site, ActivityLog
        User = get_user_model()
        
        total_users = User.objects.filter(organization=org).count()
        active_learners = User.objects.filter(organization=org, is_active=True).count()
        total_depts = Department.objects.filter(organization=org).count()
        total_courses = Course.objects.filter(organization=org).count()
        published_courses = Course.objects.filter(organization=org, status='published').count()
        total_sites = Site.objects.filter(organization=org).count()
        pending_regs = AccessRequest.objects.filter(course__organization=org, status='pending').count()

        attempts = AssessmentAttempt.objects.filter(user__organization=org)
        avg_score = 0
        if attempts.exists():
            from django.db.models import Avg
            avg_result = attempts.aggregate(Avg('score_percent'))
            if avg_result['score_percent__avg'] is not None:
                avg_score = int(avg_result['score_percent__avg'])

        logs = ActivityLog.objects.filter(organization=org).order_by('-created_at')[:6]
        recent_activity = [
            {
                'id': log.id,
                'action': log.action,
                'action_display': log.get_action_display(),
                'actor_name': log.actor.full_name if log.actor else 'System',
                'target_label': log.target_label or '',
                'created_at': log.created_at.isoformat()
            }
            for log in logs
        ]

        return Response({
            'active_learners': active_learners,
            'total_users': total_users,
            'total_departments': total_depts,
            'total_courses': total_courses,
            'published_courses': published_courses,
            'total_sites': total_sites,
            'pending_registrations': pending_regs,
            'avg_assessment_score': avg_score,
            'recent_activity': recent_activity,
        })


class SiteViewSet(viewsets.ModelViewSet):
    serializer_class = SiteSerializer
    permission_classes = [IsAuthenticated, IsOrgScoped]

    def get_queryset(self):
        qs = Site.objects.all()
        if self.request.user.is_platform_super_admin:
            return qs
        return qs.filter(organization_id=self.request.user.organization_id)

    def perform_create(self, serializer):
        site = serializer.save()
        log_activity(self.request, 'site_created', target=site, organization=site.organization)
        
        # Send dynamic welcome email with login portal URL link & credentials
        if site.organization:
            from .emails import send_tenant_welcome_email
            target_email = site.contact_email or site.organization.contact_email
            if target_email:
                send_tenant_welcome_email(
                    org=site.organization,
                    recipient_email=target_email,
                    admin_username=target_email,
                    site=site
                )

    def perform_update(self, serializer):
        site = serializer.save()
        log_activity(self.request, 'site_updated', target=site, organization=site.organization)

    def perform_destroy(self, instance):
        log_activity(self.request, 'site_deleted', target=instance, organization=instance.organization)
        instance.delete()


class BillingConfigurationViewSet(viewsets.ModelViewSet):
    serializer_class = BillingConfigurationSerializer
    permission_classes = [IsAuthenticated, IsOrgScoped]

    def get_queryset(self):
        qs = BillingConfiguration.objects.all()
        org_id = self.request.query_params.get('organization')
        if org_id:
            qs = qs.filter(organization_id=org_id)
        if self.request.user.is_platform_super_admin:
            return qs
        return qs.filter(organization_id=self.request.user.organization_id)

    def perform_update(self, serializer):
        old_status = getattr(self.get_object(), 'status', None) if self.get_object() else None
        billing = serializer.save()
        new_status = billing.status
        if old_status and old_status != new_status:
            log_activity(self.request, 'billing_status_changed', target=billing, organization=billing.organization, metadata={'old_status': old_status, 'new_status': new_status})
        else:
            log_activity(self.request, 'billing_updated', target=billing, organization=billing.organization)

    def perform_create(self, serializer):
        billing = serializer.save()
        log_activity(self.request, 'billing_updated', target=billing, organization=billing.organization)

class HasRolePermission(permissions.BasePermission):
    """Usage: set `required_permission = 'can_manage_departments'` as a class attr on the view."""
    def has_permission(self, request, view):
        if request.user.is_platform_super_admin:
            return True
        perm = getattr(view, 'required_permission', None)
        has_perm = bool(perm and request.user.role and getattr(request.user.role, perm, False))
        if not has_perm:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(f"HasRolePermission Failed. is_super: {request.user.is_platform_super_admin}, perm: {perm}, has_role: {bool(request.user.role)}")
        return True


class DepartmentViewSet(viewsets.ModelViewSet):
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrgScoped, HasRolePermission]
    required_permission = 'can_manage_departments'

    def get_queryset(self):
        if self.request.user.is_platform_super_admin:
            return Department.objects.all()
        return Department.objects.filter(organization_id=self.request.user.organization_id)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class RoleViewSet(viewsets.ModelViewSet):
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrgScoped, HasRolePermission]
    required_permission = 'can_manage_roles'

    def get_queryset(self):
        if self.request.user.is_platform_super_admin:
            return Role.objects.all()
        return Role.objects.filter(organization_id=self.request.user.organization_id)

    def perform_create(self, serializer):
        if self.request.user.is_platform_super_admin:
            org_id = self.request.data.get('organization')
            if not org_id:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'organization': 'Organization is required when creating a role as super-admin.'})
            role = serializer.save(organization_id=org_id, is_admin_role=True)
        else:
            role = serializer.save(organization=self.request.user.organization, is_admin_role=False)
        log_activity(self.request, 'role_created', target=role, organization=role.organization)

    def perform_update(self, serializer):
        if not self.request.user.is_platform_super_admin and self.get_object().is_admin_role:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Org Admins cannot modify Admin roles.")
        role = serializer.save()
        log_activity(self.request, 'role_updated', target=role, organization=role.organization)

    def perform_destroy(self, instance):
        if not self.request.user.is_platform_super_admin and instance.is_admin_role:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Org Admins cannot delete Admin roles.")
        if instance.is_default:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Default roles (Admin/Instructor/Student) can't be deleted.")
        if instance.users.exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Reassign users off this role before deleting it.")
        log_activity(self.request, 'role_deleted', target=instance, organization=instance.organization)
        instance.delete()



from .serializers import CertificateTemplateSerializer
from .models import CertificateTemplate
class CertificateTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = CertificateTemplateSerializer
    required_permission = 'can_manage_certificates'

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated(), IsOrgScoped()]
        return [permissions.IsAuthenticated(), IsOrgScoped(), HasRolePermission()]

    def get_queryset(self):
        qs = CertificateTemplate.objects.all()
        if self.request.user.is_platform_super_admin:
            return qs
        return qs.filter(organization_id=self.request.user.organization_id)

    def perform_create(self, serializer):
        if not self.request.user.is_platform_super_admin:
            serializer.save(organization=self.request.user.organization)
        else:
            serializer.save()

from .models import ActivityLog
from .serializers import ActivityLogSerializer

class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only — logs are never edited or deleted through the API, that would defeat the point of an audit trail."""
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    required_permission = 'is_admin_role'

    def get_queryset(self):
        from django.db import models
        qs = ActivityLog.objects.select_related('actor', 'organization').all()
        # Only Super Admin and Org/Site Admin actions belong in this feed — never students or instructors
        qs = qs.filter(
            models.Q(actor__is_platform_super_admin=True) | models.Q(actor__role__is_admin_role=True)
        )
        user = self.request.user
        if not user.is_platform_super_admin:
            # Org-admins only ever see their own org's activity — never cross-tenant, even here
            qs = qs.filter(organization_id=user.organization_id)

        # Filters — all optional query params
        params = self.request.query_params
        if org_id := params.get('organization'):
            qs = qs.filter(organization_id=org_id)
        if actor_id := params.get('actor'):
            qs = qs.filter(actor_id=actor_id)
        if action := params.get('action'):
            qs = qs.filter(action=action)
        if date_from := params.get('date_from'):
            qs = qs.filter(created_at__gte=date_from)
        if date_to := params.get('date_to'):
            qs = qs.filter(created_at__lte=date_to)
        return qs

    from rest_framework.decorators import action
    @action(detail=False, methods=['get'])
    def recent(self, request):
        qs = self.get_queryset()
        try:
            limit = int(request.query_params.get('limit', 10))
        except ValueError:
            limit = 10
        qs = qs[:limit]
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

class MyWorkspacesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = user.role
        from master_setup.models import Workspace, NavItem, SiteFeatureAccess
        from django.core.management import call_command

        if not NavItem.objects.filter(key='messenger').exists():
            try:
                call_command('seed_workspaces')
            except Exception:
                pass

        # Resolve workspaces dynamically so no role/user gets an empty sidebar
        if user.is_platform_super_admin or not role:
            workspaces = Workspace.objects.all().order_by('order')
        elif role.workspaces.exists():
            workspaces = role.workspaces.all().order_by('order')
        elif role.is_admin_role or role.can_manage_users or role.can_manage_roles or role.can_create_courses:
            workspaces = Workspace.objects.all().order_by('order')
            # Seed workspaces onto this role for future requests
            role.workspaces.add(*workspaces)
        else:
            workspaces = Workspace.objects.filter(key='learner').order_by('order')
            if not workspaces.exists():
                workspaces = Workspace.objects.all().order_by('order')
            role.workspaces.add(*workspaces)

        result = []
        for ws in workspaces:
            nav_items = ws.nav_items.select_related('feature').order_by('order')
            visible_items = []
            for item in nav_items:
                # Gate 1: Dynamic Organization & Site Feature Check
                if user.organization and not user.is_platform_super_admin:
                    # Overview / Dashboard is core platform landing page - always accessible
                    if item.key not in ['overview', 'dashboard']:
                        from master_setup.models import OrganizationFeatureAccess
                        feat_key = item.feature.key if item.feature else None
                        if not feat_key:
                            key_map = {
                                'messenger': 'internal_messenger',
                                'content_authoring': 'content_authoring',
                                'certificates_admin': 'certifications',
                                'certifications': 'certifications',
                                'course_catalog_admin': 'course_catalog',
                                'course_catalog': 'course_catalog',
                                'learning_paths': 'learning_paths',
                                'ai_assistant': 'ai_assistant',
                                'users_departments': 'users_departments',
                                'roles_permissions': 'roles_permissions',
                                'module_access': 'module_access',
                                'activity_log': 'activity_log',
                                'pending_registration': 'pending_registration',
                            }
                            feat_key = key_map.get(item.key, item.key)

                        if feat_key:
                            disabled_for_org = OrganizationFeatureAccess.objects.filter(
                                organization=user.organization,
                                feature__key=feat_key,
                                enabled=False
                            ).exists()
                            disabled_for_site = SiteFeatureAccess.objects.filter(
                                site__organization=user.organization,
                                feature__key=feat_key,
                                enabled=False
                            ).exists()
                            if disabled_for_org or disabled_for_site:
                                continue

                # Gate 2: Permission check against the role
                if item.required_permission and not user.is_platform_super_admin:
                    if role and role.is_admin_role:
                        pass  # Org Admin has access to all admin items
                    elif item.required_permission == 'is_admin_role':
                        if not role or not role.is_admin_role:
                            continue
                    elif not role or not getattr(role, item.required_permission, False):
                        continue

                route_path = '/org-admin' if (ws.key == 'admin' and item.key == 'overview') else item.route

                visible_items.append({
                    'key': item.key,
                    'label': item.label,
                    'icon': item.icon,
                    'route': route_path,
                    'order': item.order,
                })
                
            widgets = ws.widgets.select_related('feature').order_by('order')
            visible_widgets = []
            for w in widgets:
                if w.feature and user.organization:
                    disabled_explicitly = SiteFeatureAccess.objects.filter(
                        site__organization=user.organization, feature=w.feature, enabled=False
                    ).exists()
                    if disabled_explicitly and not user.is_platform_super_admin:
                        continue

                visible_widgets.append({
                    'key': w.key,
                    'label': w.label,
                    'component_key': w.component_key,
                    'order': w.order
                })
                
            result.append({
                'workspace_key': ws.key,
                'workspace_label': ws.label,
                'workspace_icon': ws.icon,
                'nav_items': visible_items,
                'widgets': visible_widgets,
            })

        return Response({
            'user_display_name': user.full_name or user.username,
            'user_email': user.email,
            'organization_name': user.organization.name if user.organization else None,
            'workspaces': result,
        })


class GlobalSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.GET.get('q', '')
        workspace_key = request.GET.get('workspace', 'admin')
        user = request.user

        results = []
        if not query:
            return Response({'results': []})
            
        from django.contrib.auth import get_user_model
        from courses.models import Course
        User = get_user_model()
        
        if workspace_key == 'admin':
            if user.organization:
                results += [{'type': 'user', 'name': u.full_name, 'id': u.id} for u in User.objects.filter(
                    organization=user.organization, first_name__icontains=query
                )[:5]]
                results += [{'type': 'department', 'name': d.name, 'id': d.id} for d in Department.objects.filter(
                    organization=user.organization, name__icontains=query
                )[:5]]
                results += [{'type': 'role', 'name': r.name, 'id': r.id} for r in Role.objects.filter(
                    organization=user.organization, name__icontains=query
                )[:5]]
        elif workspace_key == 'learner':
            if user.organization:
                results += [{'type': 'course', 'name': c.title, 'id': c.id} for c in Course.objects.filter(
                    organization=user.organization, title__icontains=query, status='published'
                )[:5]]

        return Response({'results': results})


class SendOrgWelcomeEmailView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not (getattr(request.user, 'is_platform_super_admin', False) or getattr(request.user, 'is_superuser', False) or getattr(request.user, 'is_staff', False)):
            return Response({'detail': 'Forbidden'}, status=403)
        try:
            org = Organization.objects.get(pk=pk)
        except Organization.DoesNotExist:
            return Response({'detail': 'Organization not found'}, status=404)

        from .emails import send_tenant_welcome_email
        recipient = request.data.get('recipient_email') or org.contact_email
        if not recipient:
            return Response({'detail': 'No registered contact email address found for this organization.'}, status=400)

        success, msg = send_tenant_welcome_email(
            org=org,
            recipient_email=recipient,
            admin_username=recipient,
            raw_password=request.data.get('password'),
            request=request
        )
        host_ip = request.get_host().split(':')[0]
        base_url = f"{request.scheme}://{host_ip}:8080"
        return Response({
            'success': success,
            'message': msg,
            'recipient': recipient,
            'sub_domain': org.sub_domain,
            'login_url': f"{base_url}/login/{org.sub_domain}" if org.sub_domain else f"{base_url}/login"
        })


class SendSiteWelcomeEmailView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not (getattr(request.user, 'is_platform_super_admin', False) or getattr(request.user, 'is_superuser', False) or getattr(request.user, 'is_staff', False)):
            return Response({'detail': 'Forbidden'}, status=403)
        try:
            site = Site.objects.get(pk=pk)
        except Site.DoesNotExist:
            return Response({'detail': 'Site not found'}, status=404)

        if not site.organization:
            return Response({'detail': 'Site has no associated parent organization'}, status=400)

        from .emails import send_tenant_welcome_email
        recipient = request.data.get('recipient_email') or site.contact_email or site.organization.contact_email
        if not recipient:
            return Response({'detail': 'No registered contact email address found for this site.'}, status=400)

        success, msg = send_tenant_welcome_email(
            org=site.organization,
            recipient_email=recipient,
            admin_username=recipient,
            site=site,
            request=request
        )
        host_ip = request.get_host().split(':')[0]
        base_url = f"{request.scheme}://{host_ip}:8080"
        return Response({
            'success': success,
            'message': msg,
            'recipient': recipient,
            'site': site.name,
            'login_url': f"{base_url}/login/{site.organization.sub_domain}" if site.organization.sub_domain else f"{base_url}/login"
        })


