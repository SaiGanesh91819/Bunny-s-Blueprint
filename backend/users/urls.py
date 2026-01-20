from django.urls import path
from .views import LoginView, SignupView, VerifyOTPView, GoogleAuthView, UpdateProfileView, UserProfileView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('signup/', SignupView.as_view(), name='signup'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('google/', GoogleAuthView.as_view(), name='google-auth'),
    path('profile/update/', UpdateProfileView.as_view(), name='update-profile'),
    path('profile/', UserProfileView.as_view(), name='get-profile'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
]
