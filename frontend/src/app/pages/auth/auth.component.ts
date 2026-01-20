import { Component, OnInit, AfterViewInit, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

declare const google: any;

type AuthMode = 'LOGIN' | 'SIGNUP_IDENTITY' | 'SIGNUP_VERIFY' | 'SIGNUP_HEALTH';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export class AuthComponent implements OnInit, AfterViewInit {
  mode: AuthMode = 'LOGIN';
  isLoading = false;
  error = '';
  
  // Google Client ID (Replace with yours from Google Cloud Console)
  private clientId = "641751548936-vuc51e06u899688prpraaqsuph9r4d9p.apps.googleusercontent.com";

  // Form Data
  email = '';
  password = '';
  fullname = '';
  otp = '';
  
  // Google Logic
  showGooglePopup = false;
  
  // Health Data
  healthData = {
    age: null,
    gender: 'Male',
    height: null,
    weight: null,
    activity_level: 'Moderate',
    fitness_goal: 'Lose Weight',
    dietary_preference: 'None'
  };

  constructor(private authService: AuthService, private router: Router, private ngZone: NgZone) {}

  ngOnInit() {
    // Other init logic if needed
  }

  ngAfterViewInit() {
    // Initialize Google Button after view is ready
    // @ts-ignore
    if (typeof google !== 'undefined') {
       this.initializeGoogleSignIn();
    } else {
      // Retry in case script hasn't loaded
      window.addEventListener('load', () => this.initializeGoogleSignIn());
    }
  }

  initializeGoogleSignIn() {
    try {
      if (typeof google === 'undefined' || !google.accounts) return;

      const btnContainer = document.getElementById("google-btn");
      if (!btnContainer) {
          // If container doesn't exist yet, retry shortly (handled by Angular lifecycle mostly, but good safety)
          setTimeout(() => this.initializeGoogleSignIn(), 500);
          return;
      }

      google.accounts.id.initialize({
        client_id: this.clientId,
        callback: (response: any) => this.handleGoogleCredential(response)
      });
      
      // Render the button
      google.accounts.id.renderButton(
        btnContainer,
        { theme: "outline", size: "large", width: "100%", text: "continue_with" } 
      );
    } catch (e) {
      console.error('Google Auth Init Failed', e);
    }
  }

  // --- Navigation & Toggles ---

  toggleMode() {
    this.mode = this.mode === 'LOGIN' ? 'SIGNUP_IDENTITY' : 'LOGIN';
    this.error = '';
  }

  // --- Actions ---

  // Toggles
  showPassword = false;

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  isValidPassword(password: string): boolean {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return password.length >= minLength && hasUpperCase && hasNumber && hasSpecialChar;
  }

  async onSubmit() {
    this.error = '';
    this.isLoading = true;

    // Password Validation
    if ((this.mode === 'LOGIN' || this.mode === 'SIGNUP_IDENTITY') && !this.isValidPassword(this.password)) {
        this.error = 'Password must be at least 8 chars, with 1 uppercase, 1 number, and 1 special char.';
        this.isLoading = false;
        return;
    }

    try {
      if (this.mode === 'LOGIN') {
        await this.handleLogin();
      } else if (this.mode === 'SIGNUP_IDENTITY') {
        await this.handleSignup();
      } else if (this.mode === 'SIGNUP_VERIFY') {
        await this.handleVerify();
      } else if (this.mode === 'SIGNUP_HEALTH') {
        await this.handleHealthUpdate();
      }
    } catch (err: any) {
      this.error = err.error?.error || 'An error occurred';
    } finally {
      this.isLoading = false;
    }
  }

  async handleLogin() {
    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (res: any) => this.processAuthSuccess(res),
      error: (err: any) => this.error = err.error?.error || 'Login failed'
    });
  }

  async handleSignup() {
    this.authService.signup({ email: this.email, password: this.password, fullname: this.fullname }).subscribe({
      next: (res: any) => {
        // Step 1 Complete -> Move to Verify
        this.mode = 'SIGNUP_VERIFY';
      },
      error: (err: any) => this.error = err.error?.error || 'Signup failed'
    });
  }

  async handleVerify() {
    this.authService.verifyOtp(this.email, this.otp).subscribe({
      next: (res: any) => this.processAuthSuccess(res),
      error: (err: any) => this.error = err.error?.error || 'Invalid OTP'
    });
  }

  async handleHealthUpdate() {
    this.authService.updateProfile(this.healthData).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err: any) => this.error = 'Failed to update profile'
    });
  }

  handleGoogleCredential(response: any) {
    if (response.credential) {
      try {
        const decodedToken: any = this.decodeToken(response.credential);
        console.log('Google User:', decodedToken);
        
        // Extract Details
        const googleUser = {
          email: decodedToken.email,
          name: decodedToken.name,
          token: response.credential
        };

        // Run inside Angular Zone
        this.ngZone.run(() => {
          this.isLoading = true;
          this.authService.googleLogin(googleUser).subscribe({
            next: (res: any) => {
              this.isLoading = false;
              this.processAuthSuccess(res);
            },
            error: (err: any) => {
              this.isLoading = false;
              this.error = 'Google Login failed';
            }
          });
        });
        
      } catch (error) {
        console.error('Error decoding token', error);
      }
    }
  }

  // --- Helpers ---
  
  private decodeToken(token: string) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        return {};
    }
  }

  private processAuthSuccess(res: any) {
    if (res.profile_incomplete) {
      this.mode = 'SIGNUP_HEALTH';
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}
