import { Component } from '@angular/core';
import { ContactService } from '../../services/contact.service';

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

  constructor(private contactService: ContactService) {}

  onSubmit() {
    if (!this.formData.name || !this.formData.email || !this.formData.message) {
      this.error = 'Please fill in all fields.';
      return;
    }

    this.isLoading = true;
    this.error = '';

    this.contactService.sendMessage(this.formData).subscribe({
      next: () => {
        this.isLoading = false;
        this.isSent = true;
      },
      error: () => {
        this.isLoading = false;
        this.error = 'Failed to send message. Please try again.';
      }
    });
  }
}
