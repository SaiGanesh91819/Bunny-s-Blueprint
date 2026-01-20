from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Verification
    is_verified = models.BooleanField(default=False)
    otp_code = models.CharField(max_length=6, blank=True, null=True)
    otp_created_at = models.DateTimeField(blank=True, null=True)
    
    # Health Metrics (The "Blueprint")
    age = models.IntegerField(blank=True, null=True)
    gender = models.CharField(max_length=10, blank=True, null=True, choices=[('Male', 'Male'), ('Female', 'Female'), ('Other', 'Other')])
    height = models.FloatField(help_text="Height in cm", blank=True, null=True)
    weight = models.FloatField(help_text="Weight in kg", blank=True, null=True)
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
    instance.profile.save()
