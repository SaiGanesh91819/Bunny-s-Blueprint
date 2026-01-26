from django.contrib import admin
from .models import UserProfile, Subscription, Payment, WeightLog

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'mobile_number', 'is_verified', 'daily_email_reminders')
    search_fields = ('user__email', 'user__username', 'mobile_number')
    list_filter = ('is_verified', 'gender', 'daily_email_reminders')

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan_type', 'is_active', 'start_date', 'end_date')
    list_filter = ('plan_type', 'is_active')
    search_fields = ('user__email', 'user__username')

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('user', 'razorpay_order_id', 'amount', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('user__email', 'razorpay_order_id', 'razorpay_payment_id')

@admin.register(WeightLog)
class WeightLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'weight', 'water', 'steps', 'date')
    list_filter = ('date',)
    search_fields = ('user__email',)
