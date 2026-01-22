import { Component, OnInit, NgZone } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Router, ActivatedRoute } from '@angular/router';

declare var Razorpay: any;

@Component({
  selector: 'app-plans',
  templateUrl: './plans.component.html',
  styleUrls: ['./plans.component.scss']
})
export class PlansComponent implements OnInit {

  user: any = null;

  // Master list of peaks
  plans = [
    {
      type: 'Power Packer 90',
      name: 'Power Packer 90',
      price: 899,
      originalPrice: 3000,
      perks: [
        'Personalized Meal Prep Blueprint',
        'Custom Daily Meal Plans',
        'Easy & Tasty Fat-Loss Recipes',
        'Home Workout Program',
        'Gym Workout Program',
        'Structured Daily Routine Guide',
        'Lifestyle & Fat-Loss Hacks',
        'Beginner-Friendly Transformation System'
      ]
    },
    {
      type: 'Gold',
      name: 'Gold',
      price: 1499,
      originalPrice: 6000,
      perks: [
        'Personalized Meal Prep Blueprint',
        'Custom Daily Meal Plans',
        'Easy & Tasty Fat-Loss Recipes',
        'Home Workout Program',
        'Gym Workout Program',
        'Structured Daily Routine Guide',
        'Lifestyle & Fat-Loss Hacks',
        'Beginner-Friendly Transformation System'
      ]
    },
    {
      type: 'elite',
      name: 'Elite',
      price: 2999,
      originalPrice: 4999,
      perks: [
        'Personalized Meal Prep Blueprint',
        'Custom Daily Meal Plans',
        'Easy & Tasty Fat-Loss Recipes',
        'Home Workout Program',
        'Gym Workout Program',
        'Structured Daily Routine Guide',
        'Lifestyle & Fat-Loss Hacks',
        'Beginner-Friendly Transformation System'
      ]
    }
  ];

  constructor(
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

    this.route.paramMap.subscribe(params => {
      const planType = params.get('type');
      if (planType) {
        console.log('Selected Plan via Dynamic Route:', planType);
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

    this.authService.createOrder(plan.price, plan.type).subscribe({
      next: (res: any) => {
        this.initiateRazorpayPayment(
          res.order_id,
          plan.price, // Display amount
          res.key,
          plan.type
        );
      },
      error: (err) => {
        console.error(err);
        this.toastService.show('Failed to create order. Try again.', 'error');
      }
    });
  }

  initiateRazorpayPayment(orderId: string, amount: number, key: string, planType: string) {
      const options = {
          key: key,
          amount: amount * 100, // Amount in paise just for display, usually passed from order
          currency: "INR",
          name: "Bunny's Blueprint",
          description: `Subscription for ${planType}`,
          order_id: orderId, // Usage of the Order ID created in backend
          prefill: {
              name: this.user.fullname || this.user.username,
              email: this.user.email,
              contact: "9999999999" // Required for UPI options to show
          },
          theme: {
              color: "#ff4500"
          },
          handler: (response: any) => {
              this.ngZone.run(() => this.handlePaymentSuccess(response, planType));
          }
      };

      try {
        const rzp1 = new Razorpay(options);
        rzp1.on('payment.failed', (response: any) => {
             this.ngZone.run(() => this.toastService.show('Payment Failed', 'error'));
        });
        rzp1.open();
      } catch (e) {
          console.error("Razorpay Error", e);
          this.toastService.show("Could not open payment gateway.", "error");
      }
  }

  handlePaymentSuccess(response: any, planType: string) {
    const data = {
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_order_id: response.razorpay_order_id,
      razorpay_signature: response.razorpay_signature,
      plan_type: planType
    };

    this.authService.verifyPayment(data).subscribe({
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

