from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from users.reminder_utils import send_reminder_email

class Command(BaseCommand):
    help = 'Sends daily email reminders to users who have opted in and haven\'t logged today'

    def handle(self, *args, **options):
        users_to_remind = User.objects.filter(profile__daily_email_reminders=True)
        count = 0
        
        for user in users_to_remind:
            if send_reminder_email(user):
                count += 1
        
        self.stdout.write(self.style.SUCCESS(f'Successfully sent {count} reminder emails.'))
