import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionGuard implements CanActivate {

  constructor(
    private authService: AuthService, 
    private router: Router,
    private toastService: ToastService
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.getProfile().pipe(
      map((user: any) => {
        const hasActiveSubscription = user.subscription && user.subscription.is_active;
        
        if (hasActiveSubscription) {
          return true;
        } else {
          this.toastService.show('🔒 Premium Content: Please subscribe to access.', 'error');
          return this.router.createUrlTree(['/plans']);
        }
      })
    );
  }
}
