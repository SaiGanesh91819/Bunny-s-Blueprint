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
    # Mock Email Sending
    print(f"\n========================================")
    print(f" [MOCK EMAIL] To: {email}")
    print(f" [MOCK EMAIL] Subject: Your Verification Code")
    print(f" [MOCK EMAIL] Code: {otp}")
    print(f"========================================\n")

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

        # Find user by email
        try:
            user_obj = User.objects.get(email=email)
            username = user_obj.username
        except User.DoesNotExist:
             return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        user = authenticate(username=username, password=password)

        if user:
            tokens = get_tokens_for_user(user)
            # Check profile
            profile_incomplete = not user.profile.age
            return Response({
                'tokens': tokens,
                'user': {'username': user.username, 'email': user.email},
                'profile_incomplete': profile_incomplete
            }, status=status.HTTP_200_OK)
        
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


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
        user = request.user
        profile = user.profile
        data = request.data

        # Update fields
        profile.age = data.get('age', profile.age)
        profile.gender = data.get('gender', profile.gender)
        profile.height = data.get('height', profile.height)
        profile.weight = data.get('weight', profile.weight)
        profile.activity_level = data.get('activity_level', profile.activity_level)
        profile.fitness_goal = data.get('fitness_goal', profile.fitness_goal)
        profile.dietary_preference = data.get('dietary_preference', profile.dietary_preference)
        
        profile.save()

        return Response({'message': 'Profile updated successfully'}, status=status.HTTP_200_OK)


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
                'dietary_preference': profile.dietary_preference
            }
        }, status=status.HTTP_200_OK)
