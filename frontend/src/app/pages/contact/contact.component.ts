import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent {
  formData = {
    name: '',
    email: '',
    message: ''
  };

  isLoading = false;
  isSent = false;
  error = '';

  constructor(private authService: AuthService) {}

  onSubmit() {
    if (!this.formData.name || !this.formData.email || !this.formData.message) {
      this.error = 'Please fill in all fields.';
      return;
    }

    this.isLoading = true;
    this.error = '';

    this.authService.sendMessage(this.formData).subscribe({
      next: () => {
        this.isLoading = false;
        this.isSent = true;
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.error?.error || 'Failed to send message. Please try again.';
      }
    });
  }
}
