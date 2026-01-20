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

    this.authService.updateProfile(this.profile).subscribe({
      next: (res: any) => {
        this.isLoading = false;
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
