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
  isHomePage: boolean = true; // Default to true until nav event

  constructor(private router: Router, public authService: AuthService) {
    // Listen to route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects;
      
      // Check if current URL is login or signup
      this.isAuthPage = url.includes('/login') || url.includes('/signup');
      
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
          // Only logout if explicit 401 (Unauthorized)
          if (err.status === 401) {
            console.warn('Session Expired. Logging out.');
            this.authService.logout();
          } else {
            console.warn('Session Check Warning:', err.statusText);
          }
        }
      });
    }
    
    // Show promo popup after 3 seconds ONLY if not on auth page
    setTimeout(() => {
      if (!this.isAuthPage) {
        this.showPromo = true;
      }
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
