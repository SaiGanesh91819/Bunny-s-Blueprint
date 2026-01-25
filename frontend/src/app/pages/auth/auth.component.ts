import { Component, OnInit, AfterViewInit, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { environment } from '../../../environments/environment';

declare const google: any;

type AuthMode = 'LOGIN' | 'SIGNUP_IDENTITY' | 'SIGNUP_VERIFY' | 'SIGNUP_HEALTH' | 
              'FORGOT_PW_REQUEST' | 'FORGOT_PW_VERIFY' | 'FORGOT_PW_RESET';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export class AuthComponent implements OnInit, AfterViewInit {
  mode: AuthMode = 'LOGIN';
  isLoading = false;
  error = '';
  
  private clientId = environment.googleClientId;

  email = '';
  password = '';
  fullname = '';
  isd_code = '+91';
  mobile_number = '';
  otp = '';
  resetToken = ''; 
  
  showGooglePopup = false;
  heightFeet: number | null = null;
  heightInches: number | null = null;
  
  healthData = {
    date_of_birth: '',
    gender: 'Male',
    height: null as number | null,
    weight: null,
    activity_level: 'Moderate',
    fitness_goal: 'Lose Weight',
    dietary_preference: 'None',
    isd_code: '+91'
  };

  constructor(
    private authService: AuthService, 
    private router: Router, 
    private ngZone: NgZone,
    private toastService: ToastService
  ) {}

  ngOnInit() {}

  ngAfterViewInit() {
    // @ts-ignore
    if (typeof google !== 'undefined') {
       this.initializeGoogleSignIn();
    } else {
      window.addEventListener('load', () => this.initializeGoogleSignIn());
    }
  }

  initializeGoogleSignIn() {
    try {
      if (typeof google === 'undefined' || !google.accounts) return;

      const btnContainer = document.getElementById("google-btn");
      if (!btnContainer) {
          setTimeout(() => this.initializeGoogleSignIn(), 500);
          return;
      }

      google.accounts.id.initialize({
        client_id: this.clientId,
        callback: (response: any) => this.handleGoogleCredential(response)
      });
      
      const width = btnContainer.clientWidth || 300;
      google.accounts.id.renderButton(
        btnContainer,
        { theme: "outline", size: "large", width: width.toString(), text: "continue_with" } 
      );
    } catch (e) {
      console.error('Google Auth Init Failed', e);
    }
  }

  toggleMode() {
    this.mode = this.mode === 'LOGIN' ? 'SIGNUP_IDENTITY' : 'LOGIN';
    this.error = '';
  }

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

    // Only check password complexity on Signup
    if (this.mode === 'SIGNUP_IDENTITY' && !this.isValidPassword(this.password)) {
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
      } else if (this.mode === 'FORGOT_PW_REQUEST') {
        await this.handleForgotPasswordRequest();
      } else if (this.mode === 'FORGOT_PW_VERIFY') {
        await this.handleForgotPasswordVerify();
      } else if (this.mode === 'FORGOT_PW_RESET') {
        await this.handleForgotPasswordReset();
      }
    } catch (err: any) {
      this.error = err.error?.error || 'An error occurred';
    } finally {
      this.isLoading = false;
    }
  }

  async handleLogin() {
    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (res: any) => {
        this.toastService.show('Welcome back! 🚀', 'success');
        this.processAuthSuccess(res);
      },
      error: (err: any) => {
        this.toastService.show('Login failed', 'error');
        
        if (err.status === 0) {
             this.error = 'Unable to connect to server.';
        } else if (err.status === 401) {
             this.error = 'Invalid credentials';
        } else if (err.error && err.error.error) {
             // Use message from backend if available (e.g. from our new try/except block)
             this.error = err.error.error;
        } else {
             this.error = 'Invalid credentials'; // Default to this for login issues
        }
      }
    });
  }

  async handleSignup() {
    this.authService.signup({ 
        email: this.email, 
        password: this.password, 
        fullname: this.fullname,
        isd_code: this.isd_code,
        mobile_number: this.mobile_number 
    }).subscribe({
      next: (res: any) => {
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
    // Convert height to CM if provided in Feet/Inches
    if (this.heightFeet !== null && this.heightInches !== null) {
      this.healthData.height = Math.round((this.heightFeet * 30.48) + (this.heightInches * 2.54));
    }

    this.authService.updateProfile(this.healthData).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err: any) => this.error = 'Failed to update profile'
    });
  }

  // --- Forgot Password Handlers ---

  async handleForgotPasswordRequest() {
    this.authService.requestPasswordReset(this.email).subscribe({
      next: (res: any) => {
          this.toastService.show(res.message, 'success');
          this.mode = 'FORGOT_PW_VERIFY';
      },
      error: (err: any) => this.error = err.error?.error || 'Failed to send OTP'
    });
  }

  async handleForgotPasswordVerify() {
    this.authService.verifyResetOtp(this.email, this.otp).subscribe({
      next: (res: any) => {
          this.toastService.show('OTP Verified!', 'success');
          this.resetToken = res.token;
          this.mode = 'FORGOT_PW_RESET';
      },
      error: (err: any) => this.error = err.error?.error || 'Invalid OTP'
    });
  }

  async handleForgotPasswordReset() {
    if (!this.isValidPassword(this.password)) {
        this.error = 'Password must be at least 8 chars, with 1 uppercase, 1 number, and 1 special char.';
        return;
    }

    this.authService.confirmPasswordReset({ 
        email: this.email, 
        token: this.resetToken, 
        password: this.password 
    }).subscribe({
      next: (res: any) => {
          this.toastService.show('Password reset successful! Please login.', 'success');
          this.mode = 'LOGIN';
          this.password = ''; // Clear password field
      },
      error: (err: any) => this.error = err.error?.error || 'Failed to reset password'
    });
  }

  handleGoogleCredential(response: any) {
    if (response.credential) {
      try {
        const decodedToken: any = this.decodeToken(response.credential);
        
        const googleUser = {
          email: decodedToken.email,
          name: decodedToken.name,
          token: response.credential
        };

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
