from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from django.db.models import Q, Max, Count
from django.contrib.auth import get_user_model
from .models import ChatMessage
from .serializers import ChatMessageSerializer

User = get_user_model()


class ChatConversationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        org = user.organization

        is_admin = (
            user.is_platform_super_admin or
            user.is_staff or
            user.is_superuser or
            (user.role and (user.role.is_admin_role or user.role.can_manage_users))
        )

        contacts = []

        if is_admin:
            # Admins see all users in their organization (excluding themselves)
            users_qs = User.objects.filter(is_active=True).exclude(id=user.id)
            if org and not user.is_platform_super_admin:
                users_qs = users_qs.filter(organization=org)

            for u in users_qs:
                last_msg = ChatMessage.objects.filter(
                    (Q(sender=user, recipient=u) | Q(sender=u, recipient=user))
                ).order_by('-created_at').first()

                unread_cnt = ChatMessage.objects.filter(
                    sender=u, recipient=user, is_read=False
                ).count()

                contacts.append({
                    'id': u.id,
                    'full_name': u.full_name,
                    'email': u.email,
                    'avatar_initials': u.avatar_initials,
                    'job_title': u.job_title or (u.role.name if u.role else 'Learner'),
                    'role_name': u.role.name if u.role else ('Admin' if u.is_platform_super_admin else 'Learner'),
                    'last_message': last_msg.message if last_msg else '',
                    'last_message_at': last_msg.created_at.isoformat() if last_msg else None,
                    'unread_count': unread_cnt,
                    'is_admin': bool(u.role and u.role.is_admin_role) or u.is_platform_super_admin or u.is_staff
                })
        else:
            # Learners see Organization Admins + anyone they chatted with
            admin_users = User.objects.filter(is_active=True).exclude(id=user.id)
            if org:
                admin_users = admin_users.filter(organization=org)
            
            # Filter for admin role users or fallback to all org admins
            admins_qs = admin_users.filter(
                Q(role__is_admin_role=True) | 
                Q(role__can_manage_users=True) | 
                Q(is_platform_super_admin=True) |
                Q(is_staff=True)
            )
            
            if not admins_qs.exists():
                admins_qs = admin_users  # fallback if no role assigned yet

            chatted_user_ids = set(
                ChatMessage.objects.filter(Q(sender=user) | Q(recipient=user))
                .values_list('sender_id', 'recipient_id')
            )
            flat_ids = set()
            for s, r in chatted_user_ids:
                if s != user.id: flat_ids.add(s)
                if r != user.id: flat_ids.add(r)

            target_users = User.objects.filter(
                Q(id__in=admins_qs.values_list('id', flat=True)) | Q(id__in=flat_ids)
            ).exclude(id=user.id).distinct()

            for u in target_users:
                last_msg = ChatMessage.objects.filter(
                    (Q(sender=user, recipient=u) | Q(sender=u, recipient=user))
                ).order_by('-created_at').first()

                unread_cnt = ChatMessage.objects.filter(
                    sender=u, recipient=user, is_read=False
                ).count()

                contacts.append({
                    'id': u.id,
                    'full_name': u.full_name,
                    'email': u.email,
                    'avatar_initials': u.avatar_initials,
                    'job_title': u.job_title or (u.role.name if u.role else 'Org Admin'),
                    'role_name': u.role.name if u.role else 'Org Admin',
                    'last_message': last_msg.message if last_msg else '',
                    'last_message_at': last_msg.created_at.isoformat() if last_msg else None,
                    'unread_count': unread_cnt,
                    'is_admin': True
                })

        # Sort contacts by latest message timestamp (messages first, then alphabetical)
        contacts.sort(key=lambda x: (x['last_message_at'] or '', x['full_name']), reverse=True)
        return Response(contacts)


class ChatMessageListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        with_user_id = request.query_params.get('with_user')
        if not with_user_id:
            return Response([])

        try:
            with_user_id = int(with_user_id)
        except ValueError:
            raise ValidationError({'with_user': 'Invalid user ID'})

        # Mark incoming unread messages as read
        ChatMessage.objects.filter(
            sender_id=with_user_id,
            recipient=user,
            is_read=False
        ).update(is_read=True)

        messages = ChatMessage.objects.filter(
            (Q(sender=user, recipient_id=with_user_id) | Q(sender_id=with_user_id, recipient=user))
        ).order_by('created_at')

        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)

    def post(self, request):
        user = request.user
        recipient_id = request.data.get('recipient_id')
        message_text = request.data.get('message', '').strip()

        if not recipient_id:
            raise ValidationError({'recipient_id': 'Recipient user ID is required.'})
        if not message_text:
            raise ValidationError({'message': 'Message text cannot be empty.'})

        recipient = User.objects.filter(pk=recipient_id, is_active=True).first()
        if not recipient:
            raise ValidationError({'recipient_id': 'Recipient user not found.'})

        chat_msg = ChatMessage.objects.create(
            organization=user.organization,
            sender=user,
            recipient=recipient,
            message=message_text
        )

        serializer = ChatMessageSerializer(chat_msg)
        return Response(serializer.data, status=201)
