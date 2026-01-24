import logging

logger = logging.getLogger(__name__)

class WhatsAppService:
    @staticmethod
    def send_message(to_number, message_text):
        """
        Send a WhatsApp message to a registered number.
        Placeholder for Twilio or WhatsApp Business API integration.
        """
        if not to_number:
            logger.warning("Attempted to send WhatsApp message to empty number.")
            return False

        # Check for Twilio Credentials from settings
        from django.conf import settings
        sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
        token = getattr(settings, 'TWILIO_AUTH_TOKEN', None)
        from_number = getattr(settings, 'TWILIO_WHATSAPP_NUMBER', 'whatsapp:+14155238886')

        if sid and token:
            try:
                from twilio.rest import Client
                client = Client(sid, token)
                client.messages.create(
                    from_=from_number,
                    body=message_text,
                    to=f'whatsapp:{to_number}'
                )
                logger.info(f"REAL_WHATSAPP: Sent message to {to_number}")
                return True
            except Exception as e:
                logger.error(f"REAL_WHATSAPP_ERROR: Failed to send to {to_number}. Error: {e}")
                return False
        else:
            # LOG THE ACTION (Fallback to simulation if real API keys aren't provided)
            logger.info(f"WHATSAPP_SIMULATION: Sending to [{to_number}]: {message_text}")
            return True

def notify_user_whatsapp(user, message):
    if hasattr(user, 'profile') and user.profile.mobile_number:
        full_number = f"{user.profile.isd_code}{user.profile.mobile_number}".replace('+', '')
        return WhatsAppService.send_message(full_number, message)
    return False
