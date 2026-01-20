import razorpay
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from .models import Payment, Subscription
import datetime

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

class CreateOrderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        amount = request.data.get('amount') # In INR
        plan_type = request.data.get('plan_type')

        if not amount or not plan_type:
            return Response({'error': 'Amount and plan_type are required'}, status=status.HTTP_400_BAD_REQUEST)

        # Razorpay expects amount in paise
        order_amount = int(float(amount) * 100)
        
        try:
            # Initialize client here to catch auth errors immediately
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            
            order_data = {
                'amount': order_amount,
                'currency': 'INR',
                'receipt': f'order_{request.user.id}_{int(timezone.now().timestamp())}',
                'payment_capture': 1 
            }
            order = client.order.create(data=order_data)
            
            # Save pending payment
            Payment.objects.create(
                user=request.user,
                razorpay_order_id=order['id'],
                amount=amount,
                status='pending'
            )
            
            return Response({
                'order_id': order['id'],
                'amount': amount,
                'key': settings.RAZORPAY_KEY_ID
            }, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Razorpay Order Error: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VerifyPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        razorpay_payment_id = data.get('razorpay_payment_id')
        razorpay_order_id = data.get('razorpay_order_id')
        razorpay_signature = data.get('razorpay_signature')
        plan_type = data.get('plan_type', 'pro')

        # Verify signature
        try:
            client.utility.verify_payment_signature({
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature
            })
        except razorpay.errors.SignatureVerificationError:
            payment = Payment.objects.get(razorpay_order_id=razorpay_order_id)
            payment.status = 'failed'
            payment.save()
            return Response({'error': 'Signature verification failed'}, status=status.HTTP_400_BAD_REQUEST)

        # Update Payment Status
        payment = Payment.objects.get(razorpay_order_id=razorpay_order_id)
        payment.razorpay_payment_id = razorpay_payment_id
        payment.razorpay_signature = razorpay_signature
        payment.status = 'success'
        payment.save()

        # Update or Create Subscription
        user = request.user
        subscription, created = Subscription.objects.get_or_create(user=user)
        subscription.plan_type = plan_type
        subscription.is_active = True
        subscription.start_date = timezone.now()
        # 30 days validity
        subscription.end_date = timezone.now() + datetime.timedelta(days=30)
        subscription.save()

        return Response({'status': 'success'}, status=status.HTTP_200_OK)
