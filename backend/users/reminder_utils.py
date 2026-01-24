from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from django.db import models
import logging

logger = logging.getLogger(__name__)

def send_reminder_email(user):
    """
    Sends a friendly reminder email to the user if they haven't completed their blueprint.
    """
    from users.models import WeightLog
    from core.models import Habit, HabitLog
    
    if not user.email:
        logger.warning(f"Attempted to send reminder to user {user.username} with no email.")
        return False

    today = timezone.now().date()
    
    # Check if a WeightLog exists for today
    has_logged_stats = WeightLog.objects.filter(user=user, date=today).exists()
    
    # Find active habits for today
    active_habits = Habit.objects.filter(
        user=user,
        start_date__lte=today
    ).filter(
        models.Q(end_date__gte=today) | models.Q(end_date__isnull=True)
    )
    
    # Find pending habits
    completed_habit_ids = HabitLog.objects.filter(
        habit__in=active_habits,
        date=today,
        completed=True
    ).values_list('habit_id', flat=True)
    
    pending_habits = active_habits.exclude(id__in=completed_habit_ids)

    # Only send if they have missing stats OR missing habits
    if has_logged_stats and not pending_habits.exists():
        logger.info(f"Skipping reminder for {user.email}: Everything completed today.")
        return False
        
    subject = "Your Daily Checklist - Bunny's Blueprint 🚀"
    
    habit_list = ""
    if pending_habits.exists():
        habit_list = "\nHabits to fulfill today:\n"
        for h in pending_habits:
            habit_list += f"⭕ {h.name}\n"
    
    stats_reminder = ""
    if not has_logged_stats:
        stats_reminder = "\nDon't forget to log your daily stats:\n✅ Weight\n✅ Water Intake\n✅ Daily Steps\n"

    message = f"""Hi {user.first_name or user.username},

Consistency is the key to transformation! Here is what's on your checklist for today:
{stats_reminder}{habit_list}
Log your progress now: http://localhost:4200/dashboard

Keep pushing!
The Bunny's Blueprint Team
"""
    
    email_from = settings.DEFAULT_FROM_EMAIL
    recipient_list = [user.email]
    
    try:
        send_mail(subject, message, email_from, recipient_list)
        logger.info(f"Reminder email sent to {user.email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send reminder email to {user.email}: {e}")
        return False
