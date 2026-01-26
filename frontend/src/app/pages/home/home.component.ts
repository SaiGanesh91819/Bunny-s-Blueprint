import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('introVideo') videoElement!: ElementRef<HTMLVideoElement>;
  
  isVideoMuted = true;
  private observer: IntersectionObserver | null = null;
  
  reviews = [
    {
      id: 1,
      name: 'Swetha',
      role: 'Member', 
      avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Aneka',
      short: 'No stress, just results.',
      full: 'I never felt pressured or starved. Your motivation kept me consistent and the diet was so simple that I could actually follow it. I lost weight steadily without stress.'
    },
    {
      id: 2,
      name: 'Hari prasad',
      role: 'Member', 
      avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Felix',
      short: 'Real and practical guidance.',
      full: 'What I liked most is how real and practical your guidance is. No fancy foods, no confusion. I finally understood how to eat properly and saw visible fat loss.'
    },
    {
      id: 3,
      name: 'Shri Lakshmi',
      role: 'Member',
      avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Victoria',
      short: 'Controlled my PCOD.',
      full: 'I have PCOD and had tried many plans earlier, but this was the first time I felt in control. My weight reduced and my periods became more regular.'
    },
    {
      id: 4,
      name: 'Sana',
      role: 'Member',
      avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Jasmine',
      short: 'Easy from day one.',
      full: 'You explain everything so clearly. The diet looked easy from day one and your daily motivation really helped me stay disciplined.'
    },
    {
      id: 5,
      name: 'Sudha',
      role: 'Member',
      avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Sana',
      short: 'Didn’t feel like a diet.',
      full: 'I didn’ didn’t feel like I was on a ‘diet’. The meals were simple, home-friendly, and effective. I lost weight and felt lighter and more energetic.'
    },
    {
      id: 6,
      name: 'Monika',
      role: 'Member',
      avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Kimberly',
      short: 'Habits over shortcuts.',
      full: 'Your approach is very realistic. You focus on habits, not shortcuts. I lost weight slowly but sustainably, and that gave me confidence.'
    },
    {
      id: 7,
      name: 'Teena',
      role: 'Member',
      avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Tania',
      short: 'Bloating reduced significantly.',
      full: 'As someone with PCOD, I was scared of strict plans. But your diet was simple and stress-free. I lost weight and my bloating reduced a lot.'
    },
    {
      id: 8,
      name: 'Abhishek',
      role: 'Member',
      avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Alexander',
      short: 'Motivation kept me going.',
      full: 'What makes you different is your motivation. Even on low days, your words pushed me to continue. The results came naturally.'
    },
    {
      id: 9,
      name: 'Kittu',
      role: 'Member',
      avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Bella',
      short: 'Relationship with food improved.',
      full: 'The diet didn’t feel complicated at all. Everything was easy to understand and follow. I lost inches and my relationship with food improved.'
    },
    {
      id: 10,
      name: 'Rajesh',
      role: 'Member',
      avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=George',
      short: 'Clarity and results.',
      full: 'You don’t just give a diet, you give clarity. Because of your simple plans and constant motivation, I finally stayed consistent and saw real results.'
    }
  ];

  faqs = [
    {
      question: 'Who is this fitness transformation program for?',
      answer: 'This program is for beginners, intermediate, and even people who’ve failed multiple times with fitness.<br><br>If you want fat loss, muscle toning, better energy, and a healthy lifestyle, this program is for you—regardless of age or past experience.',
      open: false
    },
    {
      question: 'Do I need prior gym experience?',
      answer: 'Not at all.<br>The program is beginner-friendly and designed step-by-step. All exercises are explained clearly, and workouts are customized based on your fitness level.',
      open: false
    },
    {
      question: 'Can I do this program at home?',
      answer: 'Yes!<br>You can choose home workouts or gym workouts based on your preference and availability. No fancy equipment is required for home plans.',
      open: false
    },
    {
      question: 'Will I get a personalized diet plan?',
      answer: 'Absolutely.<br>You’ll receive a customized nutrition plan based on your body type, goal, food preferences (veg/non-veg), and lifestyle.<br>No crash dieting—only sustainable eating habits.',
      open: false
    },
    {
      question: 'Is this a crash weight-loss program?',
      answer: 'No.<br>This is a healthy and sustainable transformation program, not a shortcut.<br>The goal is fat loss, strength, confidence, and long-term results, not temporary weight drops.',
      open: false
    },
    {
      question: 'How long does it take to see results?',
      answer: 'Most people start noticing changes in 2–4 weeks—better energy, fat loss, and improved strength.<br>Major visible transformation usually happens in 8–12 weeks, depending on consistency.',
      open: false
    },
    {
      question: 'Will I get personal coaching or just a plan?',
      answer: 'You get personal coaching, not just a PDF.<br>This includes:<br><ul><li>Workout guidance</li><li>Diet tracking</li><li>Progress monitoring</li><li>Motivation & accountability</li></ul><br>You’re not alone in this journey.',
      open: false
    },
    {
      question: 'What if I miss workouts or mess up my diet?',
      answer: 'No stress. Fitness is not about perfection.<br>We help you get back on track and adjust the plan according to real-life situations. Consistency > perfection.',
      open: false
    },
    {
      question: 'Is this program suitable for busy people?',
      answer: 'Yes.<br>Workouts are designed to fit into 30–60 minutes, and diet plans are practical, not complicated.<br>Perfect for students, working professionals, and entrepreneurs.',
      open: false
    },
    {
      question: 'Can women join this program?',
      answer: 'Of course!<br>The program is safe and effective for both men and women, with customized workouts and nutrition based on individual needs.',
      open: false
    },
    {
      question: 'Will I lose muscle while losing weight?',
      answer: 'No.<br>The program focuses on fat loss while maintaining or building lean muscle, which gives you a toned and athletic look—not skinny or weak.',
      open: false
    },
    {
      question: 'What makes this program different from others?',
      answer: '<ul><li>Personalized approach</li><li>Real lifestyle-based fitness</li><li>No extreme dieting</li><li>Strong focus on mindset & consistency</li><li>Proven transformation methods</li></ul><br>This is not just fitness—it’s a blueprint for a healthier life.',
      open: false
    },
    {
      question: 'Is there any support during the program?',
      answer: 'Yes. You’ll have regular check-ins, guidance, and support throughout the program to keep you motivated and accountable.',
      open: false
    },
    {
      question: 'What if I have health issues or injuries?',
      answer: 'We modify workouts and nutrition accordingly.<br>Always inform us before starting so we can design a safe and effective plan for you.',
      open: false
    }
  ];

  showAllFaqs = false;
  initialFaqCount = 5;

  get visibleFaqs() {
    return this.showAllFaqs ? this.faqs : this.faqs.slice(0, this.initialFaqCount);
  }

  toggleFaq(faq: any) {
    faq.open = !faq.open;
  }

  toggleShowMore() {
    this.showAllFaqs = !this.showAllFaqs;
  }

  selectedReview: any = null;
  autoScrollInterval: any;
  isPaused = false;

  constructor() { }

  ngAfterViewInit(): void {
    this.setupIntersectionObserver();
  }

  private setupIntersectionObserver(): void {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.6 // Play when 60% of video is visible
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const video = this.videoElement.nativeElement;
        if (entry.isIntersecting) {
          video.play().catch(err => console.log('Video play failed:', err));
        } else {
          video.pause();
        }
      });
    }, options);

    this.observer.observe(this.videoElement.nativeElement);
  }

  toggleVideoAudio(event: Event): void {
    event.stopPropagation();
    const video = this.videoElement.nativeElement;
    this.isVideoMuted = !this.isVideoMuted;
    video.muted = this.isVideoMuted;
  }

  pauseReviews() {
    this.isPaused = true;
  }

  resumeReviews() {
    this.isPaused = false;
  }

  ngOnDestroy(): void {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
    }
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  scrollReviews(direction: number) {
    const slider = document.querySelector('.review-slider') as HTMLElement;
    if (!slider) return;
    
    const isAtEnd = slider.scrollLeft + slider.offsetWidth >= slider.scrollWidth - 10;
    
    if (direction === 1 && isAtEnd) {
      // Loop back to start
      slider.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      // Scroll by roughly one card width
      const scrollAmount = direction * (slider.offsetWidth * 0.8);
      slider.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
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
