from django.urls import path
from .views import (
    LoginView, SignupView, VerifyOTPView, GoogleAuthView, 
    UpdateProfileView, UserProfileView, ContactView, 
    CreateOrderView, VerifyPaymentView, WeightLogView, 
    InvoiceDownloadView, SetBlueprintStartDateView,
    RequestPasswordResetView, VerifyResetOTPView, ResetPasswordView,
    ManualActivationView, StaffUserManagementView
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('signup/', SignupView.as_view(), name='signup'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('google/', GoogleAuthView.as_view(), name='google-auth'),
    path('profile/update/', UpdateProfileView.as_view(), name='update-profile'),
    path('profile/', UserProfileView.as_view(), name='get-profile'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('contact/', ContactView.as_view(), name='contact'),
    path('payment/create-order/', CreateOrderView.as_view(), name='create-order'),
    path('payment/verify/', VerifyPaymentView.as_view(), name='verify-payment'),
    path('payment/invoice/', InvoiceDownloadView.as_view(), name='download-invoice'),
    path('payment/set-start-date/', SetBlueprintStartDateView.as_view(), name='set-start-date'),
    path('staff/users/', StaffUserManagementView.as_view(), name='staff-users'),
    path('weight-log/', WeightLogView.as_view(), name='weight-log'),
    path('manual-activate/', ManualActivationView.as_view(), name='manual-activate'),
    
    # Password Reset
    path('password-reset/request/', RequestPasswordResetView.as_view(), name='password-reset-request'),
    path('password-reset/verify/', VerifyResetOTPView.as_view(), name='password-reset-verify'),
    path('password-reset/confirm/', ResetPasswordView.as_view(), name='password-reset-confirm'),
]
