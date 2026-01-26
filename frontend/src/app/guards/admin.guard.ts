import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(
    private authService: AuthService, 
    private router: Router,
    private toastService: ToastService
  ) {}

  canActivate(): boolean | UrlTree {
    if (this.authService.isAdmin()) {
      return true;
    } else {
      this.toastService.show('⛔ Unauthorized: Staff Access Only', 'error');
      return this.router.createUrlTree(['/dashboard']);
    }
  }
}
