from rest_framework.decorators import api_view, permission_classes, authentication_classes
import os
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from .models import Members, RolePermissions, MemberInvitations
import uuid
from django.utils import timezone
from datetime import timedelta
from .serializers import MembersSerializer

from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response({'error': 'Please provide both username/email and password'}, status=status.HTTP_400_BAD_REQUEST)

    # Allow login with email
    if '@' in username:
        try:
            user_obj = User.objects.get(email=username)
            username = user_obj.username
        except User.DoesNotExist:
            # If email not found, let authenticate fail gracefully
            pass

    user = authenticate(request, username=username, password=password)

    if user is not None:
        login(request, user)
        # Find linked member
        try:
            member = Members.objects.get(user=user)
            serializer = MembersSerializer(member)
            data = serializer.data
            
            # Get user's permissions from their role
            permissions = []
            if member.role_id:
                role_perms = RolePermissions.objects.filter(role_id=member.role_id).select_related('permission_id')
                permissions = [rp.permission_id.name for rp in role_perms if rp.permission_id and rp.permission_id.name]
            
            data['permissions'] = permissions
            data['role'] = member.role_id.name if member.role_id else None
            
            return Response(data)
        except Members.DoesNotExist:
             return Response({'error': 'User authenticated but no member profile linked'}, status=status.HTTP_404_NOT_FOUND)
    else:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@permission_classes([AllowAny]) # Ideally IsAuthenticated, but we handle logic inside
def me_view(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
        
    try:
        member = Members.objects.get(user=request.user)
        serializer = MembersSerializer(member)
        data = serializer.data
        
        # Get user's permissions from their role
        permissions = []
        if member.role_id:
            role_perms = RolePermissions.objects.filter(role_id=member.role_id).select_related('permission_id')
            permissions = [rp.permission_id.name for rp in role_perms if rp.permission_id and rp.permission_id.name]
        
        data['permissions'] = permissions
        data['role'] = member.role_id.name if member.role_id else None
        
        return Response(data)
    except Members.DoesNotExist:
        return Response({'error': 'Member profile not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """
    Handle user registration and Member profile creation.
    """
    first_name = request.data.get('first_name', '')
    last_name = request.data.get('last_name', '')
    email = request.data.get('email', '')
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password or not email:
        return Response({'error': 'Username, email, and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({'error': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if User.objects.filter(email=email).exists():
        return Response({'error': 'Email already registered.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # 1. Create User
        user = User.objects.create_user(username=username, email=email, password=password)
        user.first_name = first_name
        user.last_name = last_name
        user.save()

        # 2. Create Linked Member Profile
        member = Members.objects.create(
            user=user,
            first_name=first_name,
            last_name=last_name,
            email=email
            # role_id can be assigned default here if needed, or null
        )

        return Response({
            'message': 'User registered successfully',
            'member_id': str(member.member_id)
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        # Cleanup if partial failure (though transaction atomic preferred in real app)
        if 'user' in locals():
            user.delete()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str

@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password_view(request):
    email = request.data.get('email')
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        # For security, don't reveal user existence
        # But for dev UX, we might log it. 
        # Returning success to avoid enumeration attacks.
        print(f"DEBUG: Password reset requested for non-existent email: {email}")
        return Response({'message': 'If an account exists, a reset link has been sent.'})

    # Generate Token
    token = default_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    
    # Construct Link
    reset_url_base = request.data.get('reset_url', 'http://127.0.0.1:5173/reset-password')
    
    # Check if frontend requested query params or just sent a base.
    # We will favor path-style if the base ends with 'reset-password' without question mark
    if reset_url_base.endswith('/reset-password'):
         reset_link = f"{reset_url_base}/{uid}/{token}"
    else:
         reset_link = f"{reset_url_base}?uid={uid}&token={token}"
    
    # Send Email
    try:
        print(f"DEBUG_LINK: {reset_link}")
        with open("debug_link.txt", "w") as f:
            f.write(reset_link)
        from django.core.mail import send_mail
        send_mail(
            subject='Password Reset Request - TailAdmin',
            message=f'Click the link below to reset your password:\n\n{reset_link}\n\nIf you did not request this, please ignore this email.',
            from_email=os.getenv('EMAIL_HOST_USER'),
            recipient_list=[email],
            fail_silently=False,
        )
        return Response({'message': 'If an account exists, a reset link has been sent to your email.'})
    except Exception as e:
        print(f"Email Error: {e}")
        return Response({'error': 'Failed to send email. Please try again later.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_view(request):
    uidb64 = request.data.get('uid')
    token = request.data.get('token')
    new_password = request.data.get('password')

    if not uidb64 or not token or not new_password:
        return Response({'error': 'Invalid request parameters'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({'error': 'Invalid link'}, status=status.HTTP_400_BAD_REQUEST)

    if default_token_generator.check_token(user, token):
        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password has been reset successfully.'})
    else:
        return Response({'error': 'Link is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)



@api_view(['POST'])
@permission_classes([AllowAny]) # Ideally admin only
def bulk_invite_view(request):
    member_ids = request.data.get('member_ids', [])
    reset_url_base = request.data.get('reset_url', 'http://127.0.0.1:5173/accept-invite')
    
    if not member_ids:
        return Response({'error': 'No members selected'}, status=status.HTTP_400_BAD_REQUEST)

    invited_count = 0
    errors = []

    for member_id in member_ids:
        try:
            member = Members.objects.get(member_id=member_id)
            
            # Skip if user already exists
            if member.user:
                continue
                
            if not member.email:
                errors.append(f"Member {member.first_name} has no email")
                continue

            # Generate Token
            token = str(uuid.uuid4())
            expires_at = timezone.now() + timedelta(days=7)

            # Create/Update Invitation
            # Check for existing pending invitation
            existing_invite = MemberInvitations.objects.filter(member=member, status='PENDING').first()
            if existing_invite:
                invitation = existing_invite
                invitation.token = token # Rotate token on resend
                invitation.expires_at = expires_at
                invitation.save()
            else:
                invitation = MemberInvitations.objects.create(
                    member=member,
                    email=member.email,
                    role_id=member.role_id,
                    token=token,
                    status='PENDING',
                    expires_at=expires_at
                )

            # Construct Link
            if reset_url_base.endswith('/accept-invite'):
                invite_link = f"{reset_url_base}/{token}"
            else:
                 invite_link = f"{reset_url_base}?token={token}"

            # Send Email
            from django.core.mail import send_mail
            print(f"DEBUG_INVITE_LINK: {invite_link}")
            with open("debug_invite_link.txt", "a") as f:
                f.write(f"{member.email}: {invite_link}\n")
                
            send_mail(
                subject='You are invited to join TailAdmin',
                message=f'Hello {member.first_name},\n\nYou have been invited to join TailAdmin.\nClick the link below to accept your invitation and set your password:\n\n{invite_link}\n\nThis link expires in 7 days.',
                from_email=os.getenv('EMAIL_HOST_USER'),
                recipient_list=[member.email],
                fail_silently=False,
            )
            invited_count += 1

        except Members.DoesNotExist:
            errors.append(f"Member ID {member_id} not found")
        except Exception as e:
            errors.append(f"Error inviting {member_id}: {str(e)}")

    return Response({
        'message': f'Successfully invited {invited_count} members.',
        'errors': errors
    })


@api_view(['POST'])
@permission_classes([AllowAny]) # Ideally admin only
def bulk_update_role_view(request):
    member_ids = request.data.get('member_ids', [])
    role_id = request.data.get('role_id')
    
    if not member_ids or not role_id:
        return Response({'error': 'Missing member_ids or role_id'}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        updated_count = Members.objects.filter(member_id__in=member_ids).update(role_id=role_id)
        return Response({'message': f'Updated roles for {updated_count} members.'})
    except Exception as e:
         return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def validate_invite_view(request):
    token = request.query_params.get('token')
    if not token:
         return Response({'error': 'Token required'}, status=status.HTTP_400_BAD_REQUEST)
         
    try:
        invite = MemberInvitations.objects.get(token=token, status='PENDING')
        
        if invite.expires_at and invite.expires_at < timezone.now():
            invite.status = 'EXPIRED'
            invite.save()
            return Response({'error': 'Invitation expired'}, status=status.HTTP_400_BAD_REQUEST)
            
        return Response({
            'valid': True,
            'email': invite.email,
            'first_name': invite.member.first_name,
            'last_name': invite.member.last_name,
            'role': invite.role_id.name if invite.role_id else None
        })
    except MemberInvitations.DoesNotExist:
        return Response({'error': 'Invalid token'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([AllowAny])
def accept_invite_view(request):
    token = request.data.get('token')
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not token or not username or not password:
         return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        invite = MemberInvitations.objects.get(token=token, status='PENDING')
        
        if invite.expires_at and invite.expires_at < timezone.now():
            invite.status = 'EXPIRED'
            invite.save()
            return Response({'error': 'Invitation expired'}, status=status.HTTP_400_BAD_REQUEST)

        # check username availability
        if User.objects.filter(username=username).exists():
             return Response({'error': 'Username already taken'}, status=status.HTTP_400_BAD_REQUEST)

        # Create User
        user = User.objects.create_user(username=username, email=invite.email, password=password)
        user.first_name = invite.member.first_name
        user.last_name = invite.member.last_name
        user.save()
        
        # Link Member
        member = invite.member
        member.user = user
        # ensure email matches if it changed in invite?
        # member.email = invite.email 
        member.status = 'active' # Assuming there's a status field or is_active
        member.save()
        
        # Mark Accepted
        invite.status = 'ACCEPTED'
        invite.accepted_at = timezone.now()
        invite.save()
        
        return Response({'message': 'Invitation accepted. You can now login.'})
        
    except MemberInvitations.DoesNotExist:
        return Response({'error': 'Invalid token'}, status=status.HTTP_404_NOT_FOUND)
