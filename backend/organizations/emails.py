import logging
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)

def send_tenant_welcome_email(org, recipient_email=None, admin_username=None, raw_password=None, site=None, request=None):
    """
    Sends a fully dynamic welcome email containing the specific tenant's login URL link
    and login credentials to the designated recipient email address.
    """
    if request:
        host_ip = request.get_host().split(':')[0]
        frontend_url = f"{request.scheme}://{host_ip}:8080"
    else:
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:8080').rstrip('/')
    
    # 1. Resolve Recipient Email dynamically
    target_email = recipient_email or getattr(org, 'contact_email', None)
    if not target_email and site and getattr(site, 'contact_email', None):
        target_email = site.contact_email
        
    if not target_email:
        logger.warning(f"No recipient email specified for organization {org.name} (ID: {org.id})")
        return False, "No recipient email address specified."
        
    # 2. Build Dynamic Login Page URL
    subdomain = getattr(org, 'sub_domain', None)
    if subdomain and subdomain.strip():
        login_url = f"{frontend_url}/login/{subdomain.strip()}"
    else:
        login_url = f"{frontend_url}/login"
        
    # 3. Resolve Display Names & Credentials
    tenant_name = org.name or org.company_name or "Organization"
    username = admin_username or target_email
    password_display = raw_password if raw_password else "[Your configured account password]"
    site_info = f"\nSite: {site.name}" if site else ""
    
    subject = f"Welcome to {tenant_name} — Your LMS Login Credentials & Portal Link"
    
    # 4. Plain Text Message
    text_message = f"""Hello {getattr(org, 'contact_name', 'Administrator')},

Your organization account for '{tenant_name}' has been configured and is ready for use.{site_info}

Here are your tenant login credentials & portal access link:

====================================================
Login Portal URL: {login_url}
Username / Email: {username}
Password: {password_display}
Organization Subdomain: {subdomain or 'Default'}
====================================================

Click the link below to open your dedicated organization login portal:
{login_url}

Please keep these credentials safe and change your password upon logging in.

Best regards,
{tenant_name} Platform Administration
"""

    # 5. HTML Message with Clickable Links and Tenant Branding Styling
    primary_color = getattr(org, 'primary_color', None) or '#4f46e5'
    logo_url = getattr(org, 'logo_url', None)
    tagline = getattr(org, 'tagline', '')
    welcome_msg = getattr(org, 'login_welcome_message', '')
    
    logo_html = f'<img src="{logo_url}" alt="{tenant_name}" style="max-height: 48px; margin-bottom: 12px;" />' if logo_url else ''
    
    html_message = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to {tenant_name}</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        
        <div style="text-align: center; border-bottom: 2px solid {primary_color}; padding-bottom: 20px; margin-bottom: 24px;">
            {logo_html}
            <h1 style="color: #0f172a; font-size: 24px; margin: 0 0 6px 0;">{tenant_name}</h1>
            {f'<p style="color: #64748b; font-size: 14px; margin: 0;">{tagline}</p>' if tagline else ''}
        </div>

        <p style="font-size: 16px; line-height: 1.5; color: #334155;">
            {welcome_msg or f'Welcome! Your organization portal for <strong>{tenant_name}</strong> is now live.'}
        </p>

        <div style="background-color: #f1f5f9; border-left: 4px solid {primary_color}; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #0f172a; font-size: 16px;">🔑 Your Access Credentials & Login Link</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                    <td style="padding: 6px 0; color: #64748b; width: 140px;"><strong>Login URL:</strong></td>
                    <td style="padding: 6px 0;"><a href="{login_url}" style="color: {primary_color}; font-weight: bold; text-decoration: underline;">{login_url}</a></td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #64748b;"><strong>Username / Email:</strong></td>
                    <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">{username}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #64748b;"><strong>Password:</strong></td>
                    <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">{password_display}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #64748b;"><strong>Sub-Domain:</strong></td>
                    <td style="padding: 6px 0; color: #0f172a;">{subdomain or 'N/A'}</td>
                </tr>
            </table>
        </div>

        <div style="text-align: center; margin: 32px 0 24px 0;">
            <a href="{login_url}" style="display: inline-block; background-color: {primary_color}; color: #ffffff; font-weight: bold; font-size: 16px; padding: 14px 28px; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                Go to Login Portal &rarr;
            </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 16px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
            This email was generated automatically for {tenant_name} ({target_email}). Please change your password after your initial sign-in.
        </p>
    </div>
</body>
</html>
"""

    try:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'vtravelofficials@gmail.com'
        send_mail(
            subject=subject,
            message=text_message,
            from_email=from_email,
            recipient_list=[target_email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"Successfully sent welcome email for {tenant_name} to {target_email}")
        return True, f"Welcome email successfully sent to {target_email} via Gmail SMTP!"
    except Exception as e:
        logger.error(f"Failed to send SMTP email to {target_email}: {str(e)}")
        print(f"\n[SMTP EMAIL ERROR] {str(e)}\nFallback log:\n{text_message}\n")
        return False, f"Failed to send email via SMTP: {str(e)}"


def send_user_welcome_credentials_email(user, raw_password=None, request=None):
    """
    Sends an immediate welcome email via Gmail SMTP when a new user is created by Org Admin.
    Includes full name, username, raw password, login URL, assigned role, and department.
    """
    if not user.email:
        logger.warning(f"User ID {user.id} has no email address.")
        return False, "No email address found for user."

    if request:
        host_ip = request.get_host().split(':')[0]
        frontend_url = f"{request.scheme}://{host_ip}:8080"
    else:
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:8080').rstrip('/')

    org = user.organization
    tenant_name = org.name if org else "Learning Platform"
    subdomain = getattr(org, 'sub_domain', None) if org else None

    if subdomain and subdomain.strip():
        login_url = f"{frontend_url}/login/{subdomain.strip()}"
    else:
        login_url = f"{frontend_url}/login"

    user_full_name = user.full_name or f"{user.first_name} {user.last_name}".strip() or user.username
    password_display = raw_password if raw_password else "[Configured Security Password]"
    dept_name = user.department.name if getattr(user, 'department', None) else "General"
    role_name = user.role.name if getattr(user, 'role', None) else "Team Member"

    subject = f"Welcome to {tenant_name} — Your User Account Login Credentials"

    text_message = f"""Hello {user_full_name},

Your account for '{tenant_name}' has been created by your organization administrator.

Here are your account login credentials and portal access link:

====================================================
Login Portal URL: {login_url}
Username / Email: {user.username}
Password: {password_display}
Department: {dept_name}
Role: {role_name}
Organization: {tenant_name}
====================================================

Click the link below to access your organization portal:
{login_url}

Please keep these credentials safe and update your password upon sign-in.

Best regards,
{tenant_name} Administration
"""

    primary_color = getattr(org, 'primary_color', None) if org else '#059669'
    logo_url = getattr(org, 'logo_url', None) if org else None
    logo_html = f'<img src="{logo_url}" alt="{tenant_name}" style="max-height: 44px; margin-bottom: 12px;" />' if logo_url else ''

    html_message = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to {tenant_name}</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        
        <div style="text-align: center; border-bottom: 2px solid {primary_color}; padding-bottom: 20px; margin-bottom: 24px;">
            {logo_html}
            <h1 style="color: #0f172a; font-size: 22px; margin: 0 0 4px 0;">{tenant_name}</h1>
            <p style="color: #64748b; font-size: 13px; margin: 0;">Welcome to your organization's learning portal</p>
        </div>

        <p style="font-size: 15px; line-height: 1.5; color: #334155;">
            Hello <strong>{user_full_name}</strong>,<br/><br/>
            An account has been created for you on the <strong>{tenant_name}</strong> LMS platform. Below are your login details:
        </p>

        <div style="background-color: #f1f5f9; border-left: 4px solid {primary_color}; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #0f172a; font-size: 15px;">🔑 Your Access Credentials & Portal Link</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                    <td style="padding: 6px 0; color: #64748b; width: 140px;"><strong>Login Portal:</strong></td>
                    <td style="padding: 6px 0;"><a href="{login_url}" style="color: {primary_color}; font-weight: bold; text-decoration: underline;">{login_url}</a></td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #64748b;"><strong>Username / Email:</strong></td>
                    <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">{user.username}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #64748b;"><strong>Password:</strong></td>
                    <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">{password_display}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #64748b;"><strong>Department:</strong></td>
                    <td style="padding: 6px 0; color: #0f172a;">{dept_name}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #64748b;"><strong>Role:</strong></td>
                    <td style="padding: 6px 0; color: #0f172a;">{role_name}</td>
                </tr>
            </table>
        </div>

        <div style="text-align: center; margin: 32px 0 24px 0;">
            <a href="{login_url}" style="display: inline-block; background-color: {primary_color}; color: #ffffff; font-weight: bold; font-size: 15px; padding: 14px 28px; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                Login to Your Account &rarr;
            </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 16px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
            This email was generated automatically for {user.email}. Please do not reply directly to this message.
        </p>
    </div>
</body>
</html>
"""

    try:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'vtravelofficials@gmail.com'
        send_mail(
            subject=subject,
            message=text_message,
            from_email=from_email,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"Successfully sent welcome credentials email to {user.email}")
        return True, f"Welcome email sent to {user.email} via SMTP!"
    except Exception as e:
        logger.error(f"Failed to send user credentials email to {user.email}: {str(e)}")
        print(f"\n[SMTP EMAIL ERROR] {str(e)}\nFallback log:\n{text_message}\n")
        return False, f"Failed to send SMTP email: {str(e)}"


def send_password_reset_email(user, reset_token, uid_b64, request=None):
    """
    Sends a dynamic password reset email with a unique time-sensitive token link.
    """
    if request:
        host_ip = request.get_host().split(':')[0]
        frontend_url = f"{request.scheme}://{host_ip}:8080"
    else:
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:8080').rstrip('/')

    reset_url = f"{frontend_url}/reset-password?uid={uid_b64}&token={reset_token}"
    org = getattr(user, 'organization', None)
    tenant_name = org.name if org else "Platform"
    primary_color = getattr(org, 'primary_color', None) or '#06b6d4'

    subject = f"Password Reset Request — {tenant_name}"

    text_message = f"""Hello {user.first_name or user.username},

We received a request to reset the password for your account ({user.email or user.username}).

Click the link below to set a new password:
{reset_url}

If you did not request a password reset, please ignore this email.

Best regards,
{tenant_name} Support Team
"""

    html_message = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #030712; color: #f8fafc; margin: 0; padding: 24px;">
    <div style="max-width: 550px; margin: 0 auto; background: #0b172a; border-radius: 16px; border: 1px solid #1e293b; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <h2 style="color: #06b6d4; margin-top: 0;">🔐 Password Reset Request</h2>
        <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6;">
            Hello <strong>{user.first_name or user.username}</strong>,<br/>
            We received a request to reset your password. Click the button below to choose a new password:
        </p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_url}" style="background: linear-gradient(90deg, #06b6d4, #3b82f6); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 15px rgba(6,182,212,0.4);">
                Reset My Password 🔑
            </a>
        </div>

        <p style="font-size: 13px; color: #94a3b8; word-break: break-all;">
            Or copy and paste this link into your browser:<br/>
            <a href="{reset_url}" style="color: #38bdf8;">{reset_url}</a>
        </p>

        <hr style="border: 0; border-top: 1px solid #1e293b; margin: 24px 0;" />
        <p style="font-size: 11px; color: #64748b; text-align: center; margin: 0;">
            If you did not request this password reset, no action is required. Your password will remain unchanged.
        </p>
    </div>
</body>
</html>"""

    try:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'vtravelofficials@gmail.com'
        send_mail(
            subject=subject,
            message=text_message,
            from_email=from_email,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"Successfully sent password reset email to {user.email}")
        return True, "Password reset email sent."
    except Exception as e:
        logger.error(f"Failed to send password reset email to {user.email}: {str(e)}")
        print(f"\n[SMTP EMAIL ERROR] {str(e)}\nFallback reset link:\n{reset_url}\n")
        return False, f"Failed to send password reset email: {str(e)}"


def send_superadmin_welcome_email(user, raw_password, request=None):
    """
    Sends an official credentials & login URL email to newly created Platform Super Admins.
    """
    if request:
        host_ip = request.get_host().split(':')[0]
        frontend_url = f"{request.scheme}://{host_ip}:8080"
    else:
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:8080').rstrip('/')

    login_url = f"{frontend_url}/login"
    recipient_name = user.full_name or user.first_name or user.username
    password_display = raw_password if raw_password else "[Configured Password]"

    subject = f"Master Setup Platform Admin Account Created — {user.email}"

    text_message = f"""Hello {recipient_name},

You have been granted Platform Super Admin access to the Master Setup Control Console.

Here are your Master Setup Super Admin login credentials:

====================================================
Master Setup Login URL: {login_url}
Username / Email: {user.username} (or {user.email})
Password: {password_display}
Role: Platform Super Admin (Master Setup)
====================================================

Click the link below to log in:
{login_url}

Please keep these credentials safe and change your password upon your first login.

Best regards,
Platform Master Setup Administration
"""

    html_message = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #0b172a; color: #f8fafc; margin: 0; padding: 24px;">
    <div style="max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 16px; border: 1px solid #3b82f6; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        
        <div style="text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 24px;">
            <h1 style="color: #60a5fa; font-size: 24px; margin: 0 0 6px 0;">🛡️ Master Setup Platform Admin</h1>
            <p style="color: #94a3b8; font-size: 14px; margin: 0;">Full Platform & Tenant Control Console</p>
        </div>

        <p style="font-size: 16px; line-height: 1.5; color: #e2e8f0;">
            Hello <strong>{recipient_name}</strong>,<br/>
            You have been added as a <strong>Platform Super Admin</strong> with full administrative access to the Master Setup Control Console.
        </p>

        <div style="background-color: #1e293b; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #60a5fa; font-size: 16px;">🔑 Master Setup Login Credentials</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #cbd5e1;">
                <tr>
                    <td style="padding: 6px 0; color: #94a3b8; width: 140px;"><strong>Login URL:</strong></td>
                    <td style="padding: 6px 0;"><a href="{login_url}" style="color: #60a5fa; font-weight: bold; text-decoration: underline;">{login_url}</a></td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #94a3b8;"><strong>Username / Email:</strong></td>
                    <td style="padding: 6px 0; font-weight: bold; color: #ffffff;">{user.username} / {user.email}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #94a3b8;"><strong>Temporary Password:</strong></td>
                    <td style="padding: 6px 0; font-family: monospace; font-size: 15px; color: #34d399; font-weight: bold;">{password_display}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #94a3b8;"><strong>Access Level:</strong></td>
                    <td style="padding: 6px 0; color: #60a5fa; font-weight: bold;">Platform Super Admin</td>
                </tr>
            </table>
        </div>

        <div style="text-align: center; margin: 32px 0 24px 0;">
            <a href="{login_url}" style="display: inline-block; background: linear-gradient(90deg, #2563eb, #3b82f6); color: #ffffff; font-weight: bold; font-size: 15px; padding: 14px 28px; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(37,99,235,0.4);">
                Login to Master Setup &rarr;
            </a>
        </div>

        <hr style="border: none; border-top: 1px solid #1e293b; margin: 28px 0 16px 0;" />
        <p style="font-size: 11px; color: #64748b; text-align: center; margin: 0;">
            This email was generated automatically for {user.email}. Please do not share these credentials with unauthorized individuals.
        </p>
    </div>
</body>
</html>
"""

    try:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'vtravelofficials@gmail.com'
        send_mail(
            subject=subject,
            message=text_message,
            from_email=from_email,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"Successfully sent Super Admin welcome email to {user.email}")
        return True, f"Welcome email sent to {user.email} via SMTP!"
    except Exception as e:
        logger.error(f"Failed to send Super Admin credentials email to {user.email}: {str(e)}")
        print(f"\n[SMTP EMAIL ERROR] {str(e)}\nFallback log:\n{text_message}\n")
        return False, f"Failed to send SMTP email: {str(e)}"
