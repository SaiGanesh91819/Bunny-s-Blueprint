import { Component, OnInit, NgZone } from '@angular/core';
import { PaymentService } from '../../services/payment.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-plans',
  templateUrl: './plans.component.html',
  styleUrls: ['./plans.component.scss']
})
export class PlansComponent implements OnInit {

  user: any = null;

  plans = [
    {
      type: 'Power Packer 90',
      name: 'Power Packer 90',
      price: 899,
      originalPrice: 3000,
      features: ['Basic Workouts', 'Community Access', 'Ad-supported', 'Diet Plans', 'Priority Support']
    },
    {
      type: 'Gold',
      name: 'Gold',
      price: 1499,
      originalPrice: 6000,
      features: ['Advanced Workouts', 'Diet Plans', 'No Ads', 'Priority Support', 'Video Analysis']
    },
    {
      type: 'elite',
      name: 'Elite',
      price: 2999,
      originalPrice: 4999,
      features: ['1-on-1 Coaching', 'All Pro Features', 'Video Analysis', 'Merch Store', 'Priority Support']
    }
  ];

  constructor(
    private paymentService: PaymentService,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private route: ActivatedRoute,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
        this.authService.getProfile().subscribe({
        next: (res: any) => this.user = res,
            error: () => this.user = null
        });
    }

    // Handle Dynamic Route Param (Professional Way)
    this.route.paramMap.subscribe(params => {
      const planType = params.get('type');
      if (planType) {
        console.log('Selected Plan via Dynamic Route:', planType);
        // Highlight logic can be added here
      }
    });
  }

  subscribe(plan: any) {
    if (!this.user) {
      this.toastService.show('Please login to subscribe!', 'info');
      this.router.navigate(['/login']);
      return;
    }

    if (plan.price === 0) {
      this.toastService.show('You are already on the Free plan.', 'info');
      return;
    }

    // Check if user already has this plan
    if (this.user.subscription && this.user.subscription.plan_type === plan.type && this.user.subscription.is_active) {
         this.toastService.show(`You are already subscribed to ${plan.name}`, 'info');
         return;
    }

    this.toastService.show(`Initiating ${plan.name} Plan...`, 'info');

    this.paymentService.createOrder(plan.price, plan.type).subscribe({
      next: (res: any) => {
        this.paymentService.initiatePayment(
          res.order_id,
          plan.price,
          res.key,
          { 
            name: this.user.fullname || this.user.username, 
            email: this.user.email, 
            phone: '' 
          },
          {
            onSuccess: (response: any) => this.ngZone.run(() => this.handlePaymentSuccess(response, plan.type)),
            onFailure: (response: any) => this.ngZone.run(() => this.toastService.show('Payment Failed', 'error')),
            onDismiss: () => this.ngZone.run(() => this.toastService.show('Payment Cancelled', 'info'))
          }
        );
      },
      error: (err) => {
        console.error(err);
        this.toastService.show('Failed to create order. Try again.', 'error');
      }
    });
  }

  handlePaymentSuccess(response: any, planType: string) {
    const data = {
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_order_id: response.razorpay_order_id,
      razorpay_signature: response.razorpay_signature,
      plan_type: planType
    };

    this.paymentService.verifyPayment(data).subscribe({
      next: (res) => {
        this.toastService.show('Subscription Active! Welcome to Premium 🌟', 'success');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.toastService.show('Payment verification failed. Contact support.', 'error');
      }
    });
  }
}

