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
      name: 'Power Packed 90',
      price: 899,
      originalPrice: 3000,
      perks: [
        '90-day ready-made diet chart for results',
        'Budget-friendly, simple, affordable plan',
        'Includes basic balanced meals (home food)',
        'Helps build healthy habits over 3 months',
        'Best for beginners needing clear structure'
      ],
      details: {
        title: "Your 90-Day Blueprint to Consistency",
        description: "The Power Packed 90 is a comprehensive system designed to reset your metabolism and build sustainable habits. We focus on regular home food that you already love, structured into a 3-month cycle that resets your body from the inside out.",
        highlights: [
          "Phase-Wise Reset: Month 1 is for Adaptation, Month 2 for Acceleration, and Month 3 for Consolidation.",
          "Kitchen Friendly: NO expensive supplements or exotic ingredients. Everything is found in a standard local kitchen.",
          "Consistency Engine: We provide 12 unique weekly templates so you never get bored while staying on track."
        ],
        extraContent: [
          { icon: '📅', title: 'The 90-Day Cycle', text: 'Divided into three distinct 30-day blocks, each progressively optimizing your insulin sensitivity and fat-burning potential.' },
          { icon: '🥘', title: 'Home Food Logic', text: 'Includes Dal-Chawal, Roti-Sabzi, and Curd based meals balanced with precise protein and fiber ratios.' },
          { icon: '🔋', title: 'Metabolic Reset', text: 'Designed to fix your relationship with food and stop the cycle of yo-yo dieting forever.' }
        ]
      }
    },
    {
      type: 'Gold',
      name: '🥇 Gold Plan (Call + Custom)',
      price: 1499,
      originalPrice: 6000,
      perks: [
        'One-on-one consultation call',
        'Personalized diet (Veg/Non-Veg/Eggs)',
        'Planned based on locally available foods',
        'Calorie & portion guidance per body goal',
        'Sustainable and easy-to-follow meals',
        'Guidance on meal timing & healthy habits'
      ],
      details: {
        title: "Personalized Mastery & Expert Guidance",
        description: "The Gold Plan is where true personalization begins. We map your current physiological state against your specific goals (Fat loss, Muscle gain, or Toning). Your diet isn't just a template; it's a bespoke strategy built during our initial deep-dive call.",
        highlights: [
          "Strategic Call: A 30-minute deep-dive into your routine, stress levels, and historical diet failures.",
          "Aesthetic Precision: Portion sizes calculated based on your TDEE (Total Daily Energy Expenditure) to ensure visible results.",
          "Lifestyle Integration: We plan your meals around your school, office, or travel schedule so it feels effortless."
        ],
        extraContent: [
          { icon: '📞', title: 'Discovery Call', text: 'We discuss your medical history, gut health, and specific taste preferences to ensure 100% adherence.' },
          { icon: '🥗', title: 'Bespoke Macros', text: 'Customized protein, carb, and fat ratios to help you build muscle while shedding stubborn fat.' },
          { icon: '✈️', title: 'Travel & Eating Out', text: 'Bonus guides on how to stay on track even when you are at weddings, parties, or traveling.' }
        ]
      }
    },
    {
      type: 'elite',
      name: '🥉 Elite (Diet + Daily Follow-Up)',
      price: 4999,
      originalPrice: 9999,
      perks: [
        'Everything in Personalized Diet Plan',
        'Daily follow-up to track meals & progress',
        'Regular guidance and motivation',
        'Doubt clearing anytime via message',
        'Weekly or scheduled check-in calls',
        'Diet updates based on results & mood'
      ],
      details: {
        title: "The Ultimate Transformation Experience",
        description: "Elite is the apex of the Blueprint journey. Most people fail because they lose motivation mid-way—Elite ensures that never happens. With daily follow-ups and real-time support, we eliminate the gap between your effort and your results. It's like having your coach in your pocket 24/7.",
        highlights: [
          "24/7 Priority Support: From restaurant menu advice to grocery swaps, we are just a message away at any hour.",
          "Dynamic Adjustments: If your body plateaus for more than 48 hours, we instantly recalibrate your macros.",
          "Weekly Video Check-ins: Personalized progress review calls to discuss physical and mental changes."
        ],
        extraContent: [
          { icon: '📱', title: 'Daily Accountability', text: 'You send photos of every meal. We provide instant feedback on portion size and timing to ensure perfection.' },
          { icon: '⚡', title: 'Doubt Clearing', text: 'Stuck with a craving? Get healthy swap suggestions within minutes from Bunny himself.' },
          { icon: '📈', title: 'Aggressive Tracking', text: 'Detailed tracking of your measurements, strength levels, and photo progress to visualize your change.' }
        ]
      }
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

  getUpgradePrice(plan: any): number {
    if (!this.user?.subscription?.is_active) return plan.price;
    
    const planHierarchy: any = { 'Power Packer 90': 899, 'Gold': 1499, 'elite': 2999 };
    const currentPrice = planHierarchy[this.user.subscription.plan_type] || 0;
    
    if (plan.price <= currentPrice) return 0;
    return plan.price - currentPrice;
  }

  subscribe(plan: any) {
    if (!this.user) {
      this.toastService.show('Please login to subscribe!', 'info');
      this.router.navigate(['/login']);
      return;
    }

    const price = this.getUpgradePrice(plan);

    if (price === 0) {
      this.toastService.show('You already have this plan or a higher one.', 'info');
      return;
    }

    this.toastService.show(`Initiating ${plan.name}...`, 'info');

    this.authService.createOrder(price, plan.type).subscribe({
      next: (res: any) => {
        this.initiateRazorpayPayment(
          res.order_id,
          price,
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

  showSuccess: boolean = false;

  handlePaymentSuccess(response: any, planType: string) {
    const data = {
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_order_id: response.razorpay_order_id,
      razorpay_signature: response.razorpay_signature,
      plan_type: planType
    };

    this.authService.verifyPayment(data).subscribe({
      next: (res) => {
        // Show Success Animation
        this.showSuccess = true;
        this.toastService.show('Subscription Active! Welcome to Premium 🌟', 'success');
        
        // Redirect after animation
        setTimeout(() => {
          this.showSuccess = false;
          this.router.navigate(['/dashboard']);
        }, 4000);
      },
      error: (err) => {
        this.toastService.show('Payment verification failed. Contact support.', 'error');
      }
    });
  }

  isCurrentPlan(type: string): boolean {
    return this.user?.subscription?.is_active && this.user?.subscription?.plan_type === type;
  }

  canUpgrade(plan: any): boolean {
    if (!this.user?.subscription?.is_active) return true;
    
    // Simple price based sequence
    const planHierarchy: any = { 'Power Packer 90': 899, 'Gold': 1499, 'elite': 2999 };
    const currentPrice = planHierarchy[this.user.subscription.plan_type] || 0;
    return plan.price > currentPrice;
  }

  getActivePlanDetails() {
    if (!this.user?.subscription?.plan_type) return null;
    return this.plans.find(p => p.type === this.user.subscription.plan_type);
  }

  downloadInvoice() {
    if (!this.user?.subscription?.is_active) {
        this.toastService.show('No active subscription found.', 'error');
        return;
    }
    const token = localStorage.getItem('auth_token');
    window.open(`http://localhost:8000/api/users/payment/invoice/?token=${token}`, '_blank');
  }
}

