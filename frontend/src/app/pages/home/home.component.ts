import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  
  reviews = [
    {
      id: 1,
      name: 'Alex Mitchell',
      role: 'Marathon Runner',
      avatar: 'assets/images/avatar_1.png',
      short: 'Down 15lbs in 2 months!',
      full: 'I needed a plan that could keep up with my marathon training while helping me cut weight. Blueprint\'s adaptive nutrition was a game changer. I dropped 15lbs without losing energy.'
    },
    {
      id: 2,
      name: 'Sarah Jenkins',
      role: 'Busy Mom & Yoga Teacher',
      avatar: 'assets/images/avatar_2.png',
      short: 'Best meal prep app ever.',
      full: 'As a mom of two, I have zero time. The auto-generated shopping lists and 20-minute recipes saved my life. I finally feel in control of my nutrition.'
    },
    {
      id: 3,
      name: 'Mike Thompson',
      role: 'Powerlifter',
      avatar: 'assets/images/avatar_3.png',
      short: 'Workouts are brutal but effective.',
      full: 'The strength progression logic in this app is legit. It pushed me past my plateau on bench press within 4 weeks. Highly recommended for serious lifters.'
    }
  ];

  faqs = [
    {
      question: 'Can I cancel anytime?',
      answer: 'Yes, all plans come with a 30-day money-back guarantee. No questions asked.',
      open: false
    },
    {
      question: 'Do I need gym equipment?',
      answer: 'We have plans for home workouts (no gear) and full gym setups. You choose your path.',
      open: false
    },
    {
      question: 'What if I have an injury?',
      answer: 'Our AI modifies exercises to work around injuries while keeping you moving safely.',
      open: false
    },
    {
      question: 'Are the meal plans expensive?',
      answer: 'Not at all. We generate grocery lists based on your budget and local prices.',
      open: false
    },
    {
      question: 'Is there a community?',
      answer: 'Absolutely. You\'ll join a private Discord with 12k+ members and certified coaches.',
      open: false
    }
  ];

  toggleFaq(faq: any) {
    faq.open = !faq.open;
  }

  selectedReview: any = null;

  constructor() { }

  ngOnInit(): void {
  }

  openReview(review: any) {
    this.selectedReview = review;
    const dialog = document.getElementById('review-dialog') as HTMLDialogElement;
    if (dialog) dialog.showModal();
  }

  closeReview() {
    this.selectedReview = null;
    const dialog = document.getElementById('review-dialog') as HTMLDialogElement;
    if (dialog) dialog.close();
  }
  subscribe() {
    alert('Subscribed successfully! Welcome to the squad. 🚀');
  }
}
