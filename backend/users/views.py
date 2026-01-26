from rest_framework.views import APIView
import threading
from rest_framework.response import Response
from rest_framework import status, permissions
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone
from .models import UserProfile
from rest_framework_simplejwt.tokens import RefreshToken
import random
import datetime
from datetime import timedelta
import json
import requests
from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
import razorpay
from .models import UserProfile

import logging
logger = logging.getLogger(__name__)

# --- Helpers ---
def calculate_age(born):
    if not born:
        return None
    today = datetime.date.today()
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

def generate_otp():
    return str(random.randint(100000, 999999))

def _execute_email_send(msg, email, subject=None, html_content=None):
    try:
        # 1. Try Gmail Proxy if URL is configured
        if getattr(settings, 'GMAIL_PROXY_URL', None):
            logger.info(f"PROXY: Attempting to send email to {email} via Web App URL")
            payload = {
                "to": email,
                "subject": subject or msg.subject,
                "html": html_content or (msg.alternatives[0][0] if msg.alternatives else msg.body)
            }
            response = requests.post(settings.GMAIL_PROXY_URL, json=payload, timeout=10)
            if response.status_code == 200:
                logger.info(f"PROXY: SUCCESS - Email delivered to {email}")
                return
            else:
                logger.error(f"PROXY: FAILED with status {response.status_code}: {response.text}")
        
        # 2. Fallback to standard SMTP
        logger.info(f"SMTP: Attempting to send email to {email}")
        msg.send(fail_silently=False)
        logger.info(f"SMTP: SUCCESS - Email delivered to {email}")
    except Exception as e:
        logger.error(f"EMAIL ERROR: Combined failure for {email}. Error: {str(e)}")

def send_premium_otp_email(email, otp, purpose='verification'):
    try:
        subject = f"Your {purpose.capitalize()} Code - Bunny's Blueprint"
        text_content = f"Your code is: {otp}. Valid for 5 minutes."
        
        # Professional Elite HTML
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                body {{ margin: 0; padding: 0; background-color: #0f172a; font-family: 'Inter', sans-serif; color: #f8fafc; }}
                .wrapper {{ width: 100%; padding: 40px 0; background-color: #0f172a; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 24px; overflow: hidden; border: 1px solid rgba(255, 69, 0, 0.3); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }}
                .header {{ background: linear-gradient(135deg, #ff4500 0%, #ff8c00 100%); padding: 60px 20px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; color: white; }}
                .content {{ padding: 50px 40px; text-align: center; }}
                .content h2 {{ font-size: 24px; font-weight: 700; margin-bottom: 16px; color: white; }}
                .content p {{ font-size: 16px; line-height: 1.6; color: #94a3b8; }}
                .otp-card {{ background: rgba(255, 69, 0, 0.1); border: 2px dashed #ff4500; border-radius: 20px; padding: 30px; margin: 40px 0; }}
                .otp-code {{ font-size: 54px; font-weight: 900; color: #ff4500; letter-spacing: 12px; margin-left: 12px; }}
                .footer {{ padding: 30px; background: #0f172a; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); }}
                .footer p {{ font-size: 12px; color: #64748b; margin: 0; }}
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="header"><h1>BUNNY'S BLUEPRINT</h1></div>
                    <div class="content">
                        <h2>Secure Your Access</h2>
                        <p>A {purpose} request was made for your account. Use the unique code below to verify your identity.</p>
                        <div class="otp-card"><span class="otp-code">{otp}</span></div>
                        <p style="font-size: 14px; opacity: 0.8;"><b>Expiry:</b> This code will expire in 5 minutes for your security.</p>
                    </div>
                    <div class="footer"><p>&copy; 2026 Bunny's Blueprint &bull; Built for results.</p></div>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL or 'bunnyblueprint6@gmail.com', [email])
        msg.attach_alternative(html_content, "text/html")
        
        thread = threading.Thread(target=_execute_email_send, args=(msg, email, subject, html_content))
        thread.start()
        return True, "Triggered"
    except Exception as e:
        logger.error(f"HELPER ERROR: Failed to prepare email for {email}: {str(e)}")
        return False, str(e)

# --- Views ---

class SignupView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        logger.info(f"API: Signup attempt for {email}")

        if not email or not request.data.get('password'):
            return Response({'error': 'Fields missing'}, status=400)

        if User.objects.filter(username=email).exists():
            return Response({'error': 'Email already registered.'}, status=400)

        try:
            user = User.objects.create_user(username=email, email=email, password=request.data.get('password'))
            fullname = request.data.get('fullname', '')
            if fullname:
                names = fullname.split(' ', 1)
                user.first_name = names[0]
                user.last_name = names[1] if len(names) > 1 else ''
            user.save()

            otp = generate_otp()
            profile = user.profile
            profile.otp_code = otp
            profile.otp_created_at = timezone.now()
            profile.save()

            logger.info(f"API: Triggering OTP email for new user {email}")
            success, err = send_premium_otp_email(email, otp, purpose='verification')
            
            return Response({'message': 'OTP sent!', 'email': email}, status=201)

        except Exception as e:
            logger.error(f"API ERROR: Signup failed for {email}: {str(e)}")
            return Response({'error': str(e)}, status=400)


class VerifyOTPView(APIView):
    """
    Step 2: Verify OTP & Activate
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        otp = request.data.get('otp')

        try:
            user = User.objects.get(username=email)
            profile = user.profile

            # Check if OTP matches
            if profile.otp_code != otp:
                return Response({'error': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)

            # Check expiry (Enforced 5 mins)
            if profile.otp_created_at < timezone.now() - timedelta(minutes=5):
                return Response({'error': 'OTP has expired (Valid for 5 mins)'}, status=status.HTTP_400_BAD_REQUEST)

            # Success
            profile.is_verified = True
            profile.otp_code = None # Clear OTP
            profile.save()

            # Generate Tokens
            tokens = get_tokens_for_user(user)
            
            # Check profile
            profile_incomplete = not profile.date_of_birth or not profile.fitness_goal
            
            return Response({
                'message': 'Verification successful',
                'tokens': tokens,
                'user': {'username': user.username, 'email': user.email},
                'profile_incomplete': profile_incomplete
            }, status=status.HTTP_200_OK)

        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)


class LoginView(APIView):
    """
    Standard Login
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response({'error': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Find user by Email OR Username
            user_obj = User.objects.filter(models.Q(email=email) | models.Q(username=email)).first()
            
            if not user_obj:
                 return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
            
            username = user_obj.username
            user = authenticate(username=username, password=password)

            if user:
                tokens = get_tokens_for_user(user)
                # Check profile
                try:
                    profile_incomplete = not user.profile.date_of_birth
                except:
                    profile_incomplete = True # Fallback if profile missing

                return Response({
                    'tokens': tokens,
                    'user': {'username': user.username, 'email': user.email},
                    'profile_incomplete': profile_incomplete
                }, status=status.HTTP_200_OK)
            
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        except Exception as e:
            # Catch-all for robust error handling
            return Response({'error': 'Server error: ' + str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GoogleAuthView(APIView):
    """
    Simulated Google Login
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        name = request.data.get('name')
        # google_token = request.data.get('token') # Verify this in real app

        if not email:
            return Response({'error': 'Email required'}, status=status.HTTP_400_BAD_REQUEST)

        # Get or Create User
        user, created = User.objects.get_or_create(username=email, defaults={'email': email})

        if created:
            user.set_unusable_password() # No password for google users
            if name:
                names = name.split(' ', 1)
                user.first_name = names[0]
                user.last_name = names[1] if len(names) > 1 else ''
            user.save()
            # Trust Google verification
            user.profile.is_verified = True
            user.profile.save()

        tokens = get_tokens_for_user(user)
        profile_incomplete = not user.profile.date_of_birth

        return Response({
            'message': 'Google Login Successful',
            'tokens': tokens,
            'user': {'username': user.username, 'email': user.email},
            'profile_incomplete': profile_incomplete
        }, status=status.HTTP_200_OK)


class UpdateProfileView(APIView):
    """
    Step 3: Collect Health Data
    """
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request):
        try:
            user = request.user
            profile = user.profile
            data = request.data

            # Update fields with safe casting where possible
            new_weight = data.get('weight', profile.weight)
            if new_weight and not profile.initial_weight:
                profile.initial_weight = new_weight
            
            profile.date_of_birth = data.get('date_of_birth', profile.date_of_birth)
            profile.gender = data.get('gender', profile.gender)
            profile.height = data.get('height', profile.height)
            profile.weight = new_weight
            profile.isd_code = data.get('isd_code', profile.isd_code)
            profile.mobile_number = data.get('mobile_number', profile.mobile_number)
            profile.activity_level = data.get('activity_level', profile.activity_level)
            profile.fitness_goal = data.get('fitness_goal', profile.fitness_goal)
            profile.dietary_preference = data.get('dietary_preference', profile.dietary_preference)
            profile.daily_email_reminders = data.get('daily_email_reminders', profile.daily_email_reminders)
            profile.occupation = data.get('occupation', profile.occupation)
            profile.health_issues = data.get('health_issues', profile.health_issues)
            profile.target_weight = data.get('target_weight', profile.target_weight)
            profile.target_water = data.get('target_water', profile.target_water)
            profile.target_steps = data.get('target_steps', profile.target_steps)
            
            profile.save()

            return Response({'message': 'Profile updated successfully'}, status=status.HTTP_200_OK)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserProfileView(APIView):
    """
    Get Current User Profile
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = user.profile
        
        # Get Subscription
        subscription_data = None
        if hasattr(user, 'subscription'):
             sub = user.subscription
             subscription_data = {
                 'plan_type': sub.plan_type,
                 'is_active': sub.is_active,
                 'start_date': sub.start_date,
                 'end_date': sub.end_date,
                 'blueprint_start_date': sub.blueprint_start_date
             }

        return Response({
            'username': user.username,
            'email': user.email,
            'fullname': f"{user.first_name} {user.last_name}".strip(),
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'subscription': subscription_data,
            'profile': {
                'date_of_birth': profile.date_of_birth,
                'age': calculate_age(profile.date_of_birth),
                'gender': profile.gender,
                'height': profile.height,
                'weight': profile.weight,
                'initial_weight': profile.initial_weight,
                'mobile_number': profile.mobile_number,
                'activity_level': profile.activity_level,
                'fitness_goal': profile.fitness_goal,
                'dietary_preference': profile.dietary_preference,
                'occupation': profile.occupation,
                'health_issues': profile.health_issues,
                'target_weight': profile.target_weight,
                'target_water': profile.target_water,
                'target_steps': profile.target_steps,
                'daily_email_reminders': profile.daily_email_reminders
            }
        }, status=status.HTTP_200_OK)


class ContactView(APIView):
    """
    Handle Contact Form Submissions
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data
        name = data.get('name')
        email = data.get('email')
        message = data.get('message')
        subject = data.get('subject', 'New Contact Inquiry')

        if not name or not email or not message:
             return Response({'error': 'Name, email, and message are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from .models import ContactMessage # Lazy import or fix top level
            ContactMessage.objects.create(
                name=name,
                email=email,
                subject=subject,
                message=message
            )

            # Send Notification to Admin
            try:
                send_mail(
                    f"New Contact: {subject}",
                    f"Name: {name}\nEmail: {email}\n\nMessage:\n{message}",
                    settings.EMAIL_HOST_USER, # From (System)
                    [settings.EMAIL_HOST_USER], # To (Admin)
                    fail_silently=True
                )
            except:
                pass

            return Response({'message': 'Message sent successfully!'}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- Forgot Password Flow ---

class RequestPasswordResetView(APIView):
    """
    Step 1: Request OTP for password reset
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(username=email)
            otp = generate_otp()
            profile = user.profile
            profile.otp_code = otp
            profile.otp_created_at = timezone.now()
            profile.save()

            # Send Premium OTP via Email
            success, error_msg = send_premium_otp_email(email, otp, purpose='password reset')
            if not success:
                 return Response({'error': f"Email Delivery Failed: {error_msg}"}, status=status.HTTP_400_BAD_REQUEST)

            return Response({'message': 'OTP sent to your email.'}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            # We return success even if user doesn't exist for security (don't leak emails)
            return Response({'message': 'If an account exists with this email, an OTP has been sent.'}, status=status.HTTP_200_OK)

class VerifyResetOTPView(APIView):
    """
    Step 2: Verify OTP for password reset
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        otp = request.data.get('otp')

        if not email or not otp:
            return Response({'error': 'Email and OTP are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(username=email)
            profile = user.profile

            # Check OTP
            if profile.otp_code == otp:
                # Check Expiry (5 mins)
                if profile.otp_created_at > (timezone.now() - timedelta(minutes=5)):
                    # Valid OTP. We'll return a temporary reset token (for simplicity, we reuse OTP or just confirm)
                    # In a production app, use a real signed token.
                    return Response({'message': 'OTP verified. You can now reset your password.', 'token': otp}, status=status.HTTP_200_OK)
                else:
                    return Response({'error': 'OTP expired'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({'error': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

class ResetPasswordView(APIView):
    """
    Step 3: Reset Password using OTP as token
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        otp = request.data.get('token') # Reusing OTP as token
        new_password = request.data.get('password')

        if not email or not otp or not new_password:
            return Response({'error': 'Email, token, and new password are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(username=email)
            profile = user.profile

            if profile.otp_code == otp and profile.otp_created_at > (timezone.now() - timedelta(minutes=15)):
                user.set_password(new_password)
                user.save()
                
                # Clear OTP
                profile.otp_code = None
                profile.save()

                return Response({'message': 'Password reset successful.'}, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'Invalid or expired reset session'}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)


# class CreateOrderView redefined below, removing duplicate imports

class CreateOrderView(APIView):
    """
    Step 1: Create Razorpay Order
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        amount = request.data.get('amount') # In Rupees
        plan_type = request.data.get('plan_type')

        if not amount:
            return Response({'error': 'Amount required'}, status=status.HTTP_400_BAD_REQUEST)

        # Initialize Razorpay
        # Setup your keys in settings.py: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            
            # Amount in paise
            data = { "amount": int(amount) * 100, "currency": "INR", "payment_capture": "1" }
            payment = client.order.create(data=data)

            return Response({
                'order_id': payment['id'],
                'amount': payment['amount'],
                'key': settings.RAZORPAY_KEY_ID
            }, status=status.HTTP_200_OK)
        except Exception as e:
             return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifyPaymentView(APIView):
    """
    Step 2: Verify Payment & Activate Subscription
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        data = request.data
        razorpay_order_id = data.get('razorpay_order_id')
        razorpay_payment_id = data.get('razorpay_payment_id')
        razorpay_signature = data.get('razorpay_signature')
        plan_type = data.get('plan_type')

        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

        try:
            # Verify Signature
            params_dict = {
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature
            }
            client.utility.verify_payment_signature(params_dict)

            # Success: Save Payment
            from .models import Payment, Subscription
            Payment.objects.create(
                user=request.user,
                razorpay_order_id=razorpay_order_id,
                razorpay_payment_id=razorpay_payment_id,
                amount="PAID",
                status='Success'
            )

            # Activate Subscription (calculate end date based on plan)
            plan_type_str = plan_type or 'Free'
            # 90 days for 'Power Packed 90' or clinical 'reversal' programs
            duration_days = 90 if ('90' in plan_type_str or 'reversal' in plan_type_str) else 30
            end_date = timezone.now() + timedelta(days=duration_days)

            # Create or Update Subscription safely
            sub, created = Subscription.objects.update_or_create(
                user=request.user,
                defaults={
                    'plan_type': plan_type_str,
                    'is_active': True,
                    'end_date': end_date
                }
            )

            # Send Notifications
            self.send_success_notifications(request.user, plan_type_str, razorpay_payment_id)

            return Response({'message': 'Subscription Activated!'}, status=status.HTTP_200_OK)

        except razorpay.errors.SignatureVerificationError:
             return Response({'error': 'Payment Verification Failed'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
             import traceback
             traceback.print_exc()
             return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def send_success_notifications(self, user, plan_name, payment_id):
        # 1. Send Email
        subject = f"Payment Successful - Welcome to {plan_name}! 🚀"
        message = f"""
        Hi {user.first_name or user.username},

        Your payment of for the {plan_name} plan was successful!
        Payment ID: {payment_id}
        
        Your premium features are now unlocked. Head over to your dashboard to start your transformation.

        Stay Strong,
        Bunny's Blueprint Team
        """
        try:
            # Create the message
            msg = EmailMultiAlternatives(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email])
            
            # Use the existing background thread helper
            thread = threading.Thread(target=_execute_email_send, args=(msg, user.email, subject, message))
            thread.start()
            print(f"ASYNC: Success notification started for {user.email}")
        except Exception as e:
            print(f"Failed to start notification thread: {e}")

        # 2. Mock WhatsApp (Placeholder for Twilio/Official API)
        print(f"DEBUG: Triggering WhatsApp for {user.username} - Plan: {plan_name}")

class InvoiceDownloadView(APIView):
    """
    Generate PDF Invoice
    """
    # Use token from query param for easy window.open
    permission_classes = [permissions.AllowAny] 

    def get(self, request):
        token = request.query_params.get('token')
        if not token: return Response(status=401)
        
        # Simple manual JWT decode for this specific download link
        from rest_framework_simplejwt.tokens import AccessToken
        try:
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            from django.contrib.auth.models import User
            user = User.objects.get(id=user_id)
        except:
            return Response({'error': 'Invalid Token'}, status=401)

        from .models import Payment
        payment = Payment.objects.filter(user=user, status='Success').last()
        if not payment: return Response({'error': 'No payment record'}, status=404)

        from io import BytesIO
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import A4

        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        
        # Draw Invoice
        p.setFont("Helvetica-Bold", 20)
        p.drawString(100, 800, "BUNNY'S BLUEPRINT")
        
        p.setFont("Helvetica", 12)
        p.drawString(100, 770, "Official Payment Receipt")
        p.line(100, 760, 500, 760)

        p.drawString(100, 730, f"Customer: {user.username}")
        p.drawString(100, 715, f"Email: {user.email}")
        p.drawString(100, 700, f"Date: {payment.created_at.strftime('%Y-%m-%d')}")
        
        p.setFont("Helvetica-Bold", 14)
        p.drawString(100, 650, "Transaction Details")
        p.setFont("Helvetica", 12)
        p.drawString(100, 630, f"Order ID: {payment.razorpay_order_id}")
        p.drawString(100, 615, f"Payment ID: {payment.razorpay_payment_id}")
        p.drawString(100, 600, f"Status: COMPLETED")
        
        p.setFont("Helvetica-Bold", 14)
        p.drawString(400, 630, f"TOTAL: {payment.amount}")

        p.setFont("Helvetica-Oblique", 10)
        p.drawString(100, 500, "Thank you for choosing Bunny's Blueprint. Let's get fit!")

        p.showPage()
        p.save()

        buffer.seek(0)
        from django.http import FileResponse
        return FileResponse(buffer, as_attachment=True, filename=f"Invoice_{payment.razorpay_payment_id}.pdf")

class WeightLogView(APIView):
    """
    Track Weight History
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Get last 30 logs ordered by date
        logs = request.user.weight_logs.all().order_by('date')[:30] 
        data = [{
            'date': log.date, 
            'weight': log.weight,
            'water': log.water,
            'steps': log.steps
        } for log in logs]
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        try:
            print(f"Received Daily Log Request: {request.data} from {request.user}")
            # Accepts weight, water, steps
            weight = request.data.get('weight')
            water = request.data.get('water')
            steps = request.data.get('steps')
            date_str = request.data.get('date') 

            date = timezone.now().date()
            if date_str:
                try:
                    date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
                except ValueError:
                    pass 

            # Update or Create Log
            from .models import WeightLog
            
            defaults = {}
            if weight is not None: defaults['weight'] = float(weight)
            if water is not None: defaults['water'] = float(water)
            if steps is not None: defaults['steps'] = int(steps)
            
            # Use update_or_create logic but we need to update EXISTING fields if they exist, 
            # and only set the new ones if provided. 
            # update_or_create overwrites with defaults. 
            # Better to get_or_create then update.
            
            log, created = WeightLog.objects.get_or_create(
                user=request.user, 
                date=date
            )
            
            if weight is not None: log.weight = float(weight)
            if water is not None: log.water = float(water)
            if steps is not None: log.steps = int(steps)
            log.save()

            print("Daily log updated successfully")
            return Response({
                'message': 'Logged successfully!', 
                'data': {
                    'date': log.date, 
                    'weight': log.weight,
                    'water': log.water,
                    'steps': log.steps
                }
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ManualActivationView(APIView):
    """
    Bypass Django Admin to activate a user plan via a secret key.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        plan_type = request.data.get('plan_type')
        master_key = request.data.get('master_key')

        if master_key != settings.MASTER_ACTIVATION_KEY:
            return Response({'error': 'Unauthorized mastery required.'}, status=403)

        if not email or not plan_type:
            return Response({'error': 'Email and plan_type are required.'}, status=400)

        try:
            user = User.objects.get(username=email)
            
            # Activate Subscription
            from .models import Subscription
            from datetime import timedelta
            
            # Logic: 90 days for specific plans, 30 for others
            duration = 90 if ('90' in plan_type or 'reversal' in plan_type) else 30
            end_date = timezone.now() + timedelta(days=duration)

            sub, created = Subscription.objects.update_or_create(
                user=user,
                defaults={
                    'plan_type': plan_type,
                    'is_active': True,
                    'end_date': end_date
                }
            )

            return Response({
                'message': f'Plan activated for {email}!',
                'plan': plan_type,
                'expires': end_date.strftime('%Y-%m-%d')
            }, status=200)

        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class SetBlueprintStartDateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        start_date_str = request.data.get('start_date')
        if not start_date_str:
            return Response({'error': 'Start date is required'}, status=400)
            
        import datetime
        try:
            # Parse YYYY-MM-DD
            start_date = datetime.datetime.strptime(start_date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=400)

        from .models import Subscription
        sub = Subscription.objects.filter(user=request.user, is_active=True).first()
        if not sub:
            return Response({'error': 'No active subscription found'}, status=404)
            
        sub.blueprint_start_date = start_date
        sub.save()
        return Response({'message': 'Dashboard mission anchor set! 🏁'}, status=200)

class StaffUserManagementView(APIView):
    """
    Staff-only view to manage all users and their subscriptions.
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        query = request.query_params.get('search', '')
        users = User.objects.filter(
            models.Q(email__icontains=query) | 
            models.Q(username__icontains=query) |
            models.Q(profile__mobile_number__icontains=query)
        ).select_related('profile', 'subscription').order_by('-date_joined')[:50] # Limit to 50 for now

        results = []
        for u in users:
            sub = getattr(u, 'subscription', None)
            results.append({
                'id': u.id,
                'email': u.email,
                'username': u.username,
                'fullname': f"{u.first_name} {u.last_name}".strip(),
                'mobile_number': u.profile.mobile_number,
                'is_verified': u.profile.is_verified,
                'subscription': {
                    'plan_type': sub.plan_type if sub else None,
                    'is_active': sub.is_active if sub else False,
                    'end_date': sub.end_date if sub else None,
                } if sub else None
            })
        
        return Response(results)

    def post(self, request):
        user_id = request.data.get('user_id')
        plan_type = request.data.get('plan_type')
        is_active = request.data.get('is_active', True)

        try:
            target_user = User.objects.get(id=user_id)
            from .models import Subscription
            from datetime import timedelta

            # Default to 30 days unless specified reversal/90
            duration = 90 if ('90' in plan_type or 'reversal' in plan_type) else 30
            end_date = timezone.now() + timedelta(days=duration)

            sub, created = Subscription.objects.update_or_create(
                user=target_user,
                defaults={
                    'plan_type': plan_type,
                    'is_active': is_active,
                    'end_date': end_date
                }
            )

            return Response({'message': f'Subscription updated for {target_user.email}'})
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)
