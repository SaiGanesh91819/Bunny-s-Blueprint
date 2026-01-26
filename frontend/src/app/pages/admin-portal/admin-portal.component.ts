import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-portal',
  templateUrl: './admin-portal.component.html',
  styleUrls: ['./admin-portal.component.scss']
})
export class AdminPortalComponent implements OnInit {
  users: any[] = [];
  searchQuery: string = '';
  isLoading: boolean = false;
  
  // Modal state
  showModal: boolean = false;
  selectedUser: any = null;
  newPlanType: string = 'Gold';
  isSubscriptionActive: boolean = true;
  isUpdating: boolean = false;

  availablePlans = [
    'Gold',
    'Elite',
    'Power Packed 90',
    'Thyroid Reversal',
    'PCOD Reversal',
    'Free'
  ];

  constructor(
    private adminService: AdminService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.fetchUsers();
  }

  fetchUsers() {
    this.isLoading = true;
    this.adminService.getUsers(this.searchQuery).subscribe({
      next: (res) => {
        this.users = res;
        this.isLoading = false;
      },
      error: (err) => {
        this.toastService.show('Failed to fetch users', 'error');
        this.isLoading = false;
      }
    });
  }

  onSearch() {
    this.fetchUsers();
  }

  openEditModal(user: any) {
    this.selectedUser = user;
    this.newPlanType = user.subscription?.plan_type || 'Gold';
    this.isSubscriptionActive = user.subscription?.is_active ?? true;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedUser = null;
  }

  updateUserPlan() {
    if (!this.selectedUser) return;
    
    this.isUpdating = true;
    const data = {
      user_id: this.selectedUser.id,
      plan_type: this.newPlanType,
      is_active: this.isSubscriptionActive
    };

    this.adminService.updateSubscription(data).subscribe({
      next: (res) => {
        this.toastService.show(res.message, 'success');
        this.closeModal();
        this.fetchUsers();
        this.isUpdating = false;
      },
      error: (err) => {
        this.toastService.show('Failed to update plan', 'error');
        this.isUpdating = false;
      }
    });
  }
}
