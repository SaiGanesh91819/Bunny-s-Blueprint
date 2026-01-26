import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { AuthService } from './services/auth.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy, AfterViewInit {
  title = 'blueprint-frontend';
  
  // Sale Timer Logic
  days: number = 9;
  hours: number = 23;
  minutes: number = 59;
  seconds: number = 59;
  private intervalId: any;

  // Promo Modal Logic
  showPromo: boolean = false;
  isAuthPage: boolean = false;
  isBmiPage: boolean = false;
  isHomePage: boolean = true; // Default to true until nav event

  constructor(private router: Router, public authService: AuthService) {
    // Listen to route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects;
      
      // Check if current URL is login or signup
      this.isAuthPage = url.includes('/login') || url.includes('/signup');
      this.isBmiPage = url.includes('/bmi');
      
      // Check if Home Page (exact match or empty)
      // Note: We want spacing on all pages EXCEPT Home and Auth (Auth has its own layout)
      this.isHomePage = url === '/' || url.startsWith('/#'); 
    });
  }

  ngOnInit() {
    this.startTimer();
    
    // Verify Token Validity on Startup
    if (this.authService.isLoggedIn()) {
      this.authService.verifyToken().subscribe({
        next: () => console.log('Session Verified'),
        error: (err) => {
          // Robust session check: Only redirect to login if explicitly 401 or 403
          // This avoids logging out users due to temporary network blips (status 0)
          if (err.status === 401 || err.status === 403) {
            console.warn('Session Invalid. Clearing state.');
            const currentUrl = this.router.url;
            const protectedRoutes = ['/dashboard', '/profile'];
            const isProtected = protectedRoutes.some(route => currentUrl.startsWith(route));

            this.authService.logout();
            
            if (isProtected) {
              this.router.navigate(['/login']);
            }
          } else {
            console.warn('Network or Server issue during session check:', err.status);
          }
        }
      });
    }
    
    // Show promo popup after 3 seconds ONLY if not on auth page and NOT subscribed
    setTimeout(() => {
      this.authService.getProfile().subscribe({
        next: (res: any) => {
          if (!this.isAuthPage && !this.isBmiPage && (!res.subscription || !res.subscription.is_active)) {
            this.showPromo = true;
          }
        },
        error: () => {
          if (!this.isAuthPage && !this.isBmiPage) this.showPromo = true;
        }
      });
    }, 3000);
  }

  ngAfterViewInit() {
    // Smooth scroll removed
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  startTimer() {
    this.intervalId = setInterval(() => {
      if (this.seconds > 0) {
        this.seconds--;
      } else {
        this.seconds = 59;
        if (this.minutes > 0) {
          this.minutes--;
        } else {
          this.minutes = 59;
          if (this.hours > 0) {
            this.hours--;
          } else {
            this.hours = 23;
            if (this.days > 0) {
              this.days--;
            } else {
              // Timer finished, reset or stop
              clearInterval(this.intervalId);
            }
          }
        }
      }
    }, 1000);
  }

  closePromo() {
    this.showPromo = false;
  }

  // --- Logout Modal Logic (Moved from Navbar for Layering) ---
  showLogoutConfirm = false;

  onLogoutRequest() {
    this.showLogoutConfirm = true;
  }

  confirmLogout() {
    this.authService.logout();
    this.router.navigate(['/']);
    this.showLogoutConfirm = false;
  }

  cancelLogout() {
    this.showLogoutConfirm = false;
  }
}
