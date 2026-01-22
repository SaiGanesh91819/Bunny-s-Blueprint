from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.utils import timezone
from .models import UserProfile
from rest_framework_simplejwt.tokens import RefreshToken
import random
import datetime
from django.core.mail import send_mail
from django.conf import settings

# --- Helpers ---
def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

def generate_otp():
    return str(random.randint(100000, 999999))

def send_otp_email(email, otp):
    subject = 'Your Verification Code - Bunny\'s Blueprint'
    message = f'Your verification code is: {otp}\n\nValid for 10 minutes.'
    email_from = settings.EMAIL_HOST_USER
    recipient_list = [email]
    
    try:
        send_mail(subject, message, email_from, recipient_list)
        print(f"OTP sent to {email}")
    except Exception as e:
        print(f"Failed to send email: {e}")

# --- Views ---

class SignupView(APIView):
    """
    Step 1: Create User & Send OTP
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        fullname = request.data.get('fullname', '')

        if not email or not password:
            return Response({'error': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=email).exists():
            return Response({'error': 'User already exists'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Create Inactive User (or just unverified)
            user = User.objects.create_user(username=email, email=email, password=password)
            if fullname:
                names = fullname.split(' ', 1)
                user.first_name = names[0]
                user.last_name = names[1] if len(names) > 1 else ''
            user.save()

            # Generate OTP
            otp = generate_otp()
            profile = user.profile
            profile.otp_code = otp
            profile.otp_created_at = timezone.now()
            profile.is_verified = False
            profile.save()

            # Send OTP
            send_otp_email(email, otp)

            return Response({
                'message': 'Account created. OTP sent to email.',
                'step': 'verify_otp',
                'email': email
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


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

            # Check expiry (Example: 10 mins)
            # if profile.otp_created_at < timezone.now() - datetime.timedelta(minutes=10):
            #     return Response({'error': 'OTP Expired'}, status=status.HTTP_400_BAD_REQUEST)

            # Success
            profile.is_verified = True
            profile.otp_code = None # Clear OTP
            profile.save()

            # Generate Tokens
            tokens = get_tokens_for_user(user)
            
            # Check if profile incomplete
            profile_incomplete = not profile.age or not profile.fitness_goal
            
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
            # Find user by email
            try:
                user_obj = User.objects.get(email=email)
                username = user_obj.username
            except User.DoesNotExist:
                 # Return 401 to avoid user enumeration, but ensure it's JSON
                 return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
            except Exception as e:
                 # Handle MultipleObjectsReturned or other DB issues
                 return Response({'error': 'Login error: ' + str(e)}, status=status.HTTP_400_BAD_REQUEST)

            user = authenticate(username=username, password=password)

            if user:
                tokens = get_tokens_for_user(user)
                # Check profile
                try:
                    profile_incomplete = not user.profile.age
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
        profile_incomplete = not user.profile.age

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
            profile.age = data.get('age', profile.age)
            profile.gender = data.get('gender', profile.gender)
            profile.height = data.get('height', profile.height)
            profile.weight = data.get('weight', profile.weight)
            profile.activity_level = data.get('activity_level', profile.activity_level)
            profile.fitness_goal = data.get('fitness_goal', profile.fitness_goal)
            profile.dietary_preference = data.get('dietary_preference', profile.dietary_preference)
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
                 'end_date': sub.end_date
             }

        return Response({
            'username': user.username,
            'email': user.email,
            'fullname': f"{user.first_name} {user.last_name}".strip(),
            'subscription': subscription_data,
            'profile': {
                'age': profile.age,
                'gender': profile.gender,
                'height': profile.height,
                'weight': profile.weight,
                'activity_level': profile.activity_level,
                'fitness_goal': profile.fitness_goal,
                'dietary_preference': profile.dietary_preference,
                'occupation': profile.occupation,
                'health_issues': profile.health_issues,
                'target_weight': profile.target_weight,
                'target_water': profile.target_water,
                'target_steps': profile.target_steps,
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


import razorpay
from django.conf import settings
from datetime import timedelta

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
            duration_days = 90 if '90' in plan_type else 30 # Simple logic
            end_date = timezone.now() + timedelta(days=duration_days)

            # Create or Update Subscription
            sub, created = Subscription.objects.get_or_create(user=request.user)
            sub.plan_type = plan_type
            sub.is_active = True
            sub.end_date = end_date
            sub.save()

            return Response({'message': 'Subscription Activated!'}, status=status.HTTP_200_OK)

        except razorpay.errors.SignatureVerificationError:
             return Response({'error': 'Payment Verification Failed'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
             return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
