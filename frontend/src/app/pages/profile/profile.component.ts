import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  user: any = {};
  profile: any = {};
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  showSaveConfirm = false;
  heightFeet: number | null = null;
  heightInches: number | null = null;
  
  // Base state for change detection
  baseProfile: string = '';
  baseHeightFeet: number | null = null;
  baseHeightInches: number | null = null;

  constructor(private authService: AuthService, private toastService: ToastService) {}

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.isLoading = true;
    this.authService.getProfile().subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.user = { 
          name: res.fullname || res.username, 
          email: res.email 
        };
        // Populate form if data exists
        if (res.profile) {
            this.profile = { ...res.profile };
            if (this.profile.height) {
              const totalInches = this.profile.height / 2.54;
              this.heightFeet = Math.floor(totalInches / 12);
              this.heightInches = Math.round(totalInches % 12);
            }
            // Ensure ISD code is set for the dropdown
            if (!this.profile.isd_code) this.profile.isd_code = '+91';

            // Store base state
            this.updateBaseState();
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        if (err.status !== 401) {
             console.error('Failed to load profile', err);
        }
      }
    });
  }

  // Triggered by form submit
  requestUpdate() {
    this.showSaveConfirm = true;
  }

  cancelUpdate() {
    this.showSaveConfirm = false;
  }

  confirmUpdate() {
    this.showSaveConfirm = false;
    this.performUpdate();
  }

  // Actual API Call
  performUpdate() {
    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    if (this.heightFeet !== null && this.heightInches !== null) {
      this.profile.height = Math.round((this.heightFeet * 30.48) + (this.heightInches * 2.54));
    }

    this.authService.updateProfile(this.profile).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.updateBaseState(); // Logic: Refresh base state after successful save
        this.toastService.show('Profile updated successfully! ✨', 'success');
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to update profile.';
        console.error(err);
      }
    });
  }
}
