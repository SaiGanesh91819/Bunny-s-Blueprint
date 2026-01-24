from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def send_reminder_email(user):
    """
    Sends a friendly reminder email to the user to log their daily stats.
    """
    if not user.email:
        logger.warning(f"Attempted to send reminder to user {user.username} with no email.")
        return False
        
    subject = "Don't forget to track your progress! 🚀"
    message = f"""Hi {user.first_name or user.username},

Consistency is the key to transformation! We noticed you haven't logged your stats for today yet.

Take 30 seconds to log your:
✅ Weight
✅ Water Intake
✅ Daily Steps

Log now: http://localhost:4200/dashboard

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
