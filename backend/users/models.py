from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Verification
    is_verified = models.BooleanField(default=False)
    otp_code = models.CharField(max_length=6, blank=True, null=True)
    otp_created_at = models.DateTimeField(blank=True, null=True)
    
    # Health Metrics (The "Blueprint")
    date_of_birth = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=10, blank=True, null=True, choices=[('Male', 'Male'), ('Female', 'Female'), ('Other', 'Other')])
    height = models.FloatField(help_text="Height in cm", blank=True, null=True)
    weight = models.FloatField(help_text="Weight in kg", blank=True, null=True)
    initial_weight = models.FloatField(help_text="Starting weight in kg", blank=True, null=True)
    isd_code = models.CharField(max_length=5, default="+91")
    mobile_number = models.CharField(max_length=15, blank=True, null=True)
    activity_level = models.CharField(max_length=20, blank=True, null=True, 
                                    choices=[
                                        ('Sedentary', 'Sedentary'), 
                                        ('Light', 'Light Active'), 
                                        ('Moderate', 'Moderately Active'), 
                                        ('Active', 'Very Active'), 
                                        ('Athlete', 'Super Active')
                                    ])
    fitness_goal = models.CharField(max_length=50, blank=True, null=True,
                                  choices=[
                                      ('Lose Weight', 'Lose Weight'),
                                      ('Build Muscle', 'Build Muscle'),
                                      ('Maintain', 'Maintain Fitness'),
                                      ('Improve Stamina', 'Improve Stamina')
                                  ])
    dietary_preference = models.CharField(max_length=20, blank=True, null=True, default='None')
    occupation = models.CharField(max_length=100, blank=True, null=True)
    health_issues = models.TextField(blank=True, null=True, help_text="Any medical conditions or injuries")
    target_weight = models.FloatField(help_text="Target Weight in kg", blank=True, null=True)
    target_water = models.FloatField(help_text="Target Water in Liters", blank=True, null=True)
    target_steps = models.IntegerField(help_text="Target Steps", blank=True, null=True)
    daily_email_reminders = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"

# Signal to auto-create profile
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    try:
        instance.profile.save()
    except UserProfile.DoesNotExist:
        UserProfile.objects.create(user=instance)

# ... (rest of models)

# ... (Habit models usually go here, but they are in core)

class Subscription(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='subscription')
    plan_type = models.CharField(max_length=50) # 'Gold', 'Elite', 'Power Packer 90'
    start_date = models.DateTimeField(auto_now_add=True)
    blueprint_start_date = models.DateField(blank=True, null=True, help_text="The date the user actually starts the plan")
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.username} - {self.plan_type}"

class Payment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    razorpay_order_id = models.CharField(max_length=100)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True)
    amount = models.CharField(max_length=50)
    status = models.CharField(max_length=50, default='Pending') # Pending, Success, Failed
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.amount} - {self.status}"

class WeightLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='weight_logs')
    weight = models.FloatField(blank=True, null=True, help_text="Weight in kg")
    water = models.FloatField(default=0, help_text="Water in Liters")
    steps = models.IntegerField(default=0, help_text="Steps count")
    date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date']

    def __str__(self):
        return f"{self.user.username} - {self.weight}kg on {self.date}"
