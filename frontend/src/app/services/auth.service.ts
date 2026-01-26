import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ToastService } from './toast.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/users`;
  private tokenKey = 'auth_token';
  private refreshKey = 'refresh_token';

  // Reactive Auth State
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient, private toastService: ToastService) {}

  // --- Core Auth ---

  login(credentials:any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login/`, credentials).pipe(
      tap((res: any) => this.saveTokens(res.tokens))
    );
  }

  signup(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/signup/`, data);
  }

  googleLogin(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/google/`, data).pipe(
      tap((res: any) => this.saveTokens(res.tokens))
    );
  }

  verifyOtp(email: string, otp: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-otp/`, { email, otp }).pipe(
      tap((res: any) => this.saveTokens(res.tokens))
    );
  }

  // --- Password Reset ---

  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/password-reset/request/`, { email });
  }

  verifyResetOtp(email: string, otp: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/password-reset/verify/`, { email, otp });
  }

  confirmPasswordReset(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/password-reset/confirm/`, data);
  }

  // --- Contact ---
  sendMessage(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/contact/`, data);
  }

  // --- Payments ---
  createOrder(amount: number, plan_type: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/payment/create-order/`, { amount, plan_type }, { headers: this.getAuthHeaders() });
  }

  verifyPayment(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/payment/verify/`, data, { headers: this.getAuthHeaders() });
  }

  setBlueprintStartDate(date: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/payment/set-start-date/`, { start_date: date }, { headers: this.getAuthHeaders() });
  }

  // Check if token is actually valid on server
  verifyToken(): Observable<any> {
    // We use getProfile as a proxy for verification since it requires auth
    return this.http.get(`${this.apiUrl}/profile/`, {
      headers: this.getAuthHeaders()
    });
  }

  // --- Profile ---

  updateProfile(data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/profile/update/`, data, {
      headers: this.getAuthHeaders()
    });
  }

  getProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/profile/`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(profile => localStorage.setItem('user_profile', JSON.stringify(profile)))
    );
  }

  // --- Helpers ---

  private saveTokens(tokens: any) {
    if (tokens && tokens.access) {
      localStorage.setItem(this.tokenKey, tokens.access);
      localStorage.setItem(this.refreshKey, tokens.refresh);
      this.isAuthenticatedSubject.next(true);
    }
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshKey);
    localStorage.removeItem('user_profile');
    this.isAuthenticatedSubject.next(false);
    this.toastService.show('Logged out successfully', 'info');
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  isSubscribed(): boolean {
    const userJson = localStorage.getItem('user_profile');
    if (!userJson) return false;
    try {
        const user = JSON.parse(userJson);
        return user?.subscription?.is_active === true;
    } catch {
        return false;
    }
  }

  isAdmin(): boolean {
    const userJson = localStorage.getItem('user_profile');
    if (!userJson) return false;
    try {
        const user = JSON.parse(userJson);
        return user?.is_staff === true || user?.is_superuser === true;
    } catch {
        return false;
    }
  }

  private getAuthHeaders() {
    const token = this.getToken();
    return { 'Authorization': `Bearer ${token}` };
  }

  // --- Token Refresh ---

  refreshToken(): Observable<any> {
    const refresh = localStorage.getItem(this.refreshKey);
    return this.http.post(`${this.apiUrl}/token/refresh/`, { refresh }).pipe(
      tap((res: any) => {
        if (res && res.access) {
           localStorage.setItem(this.tokenKey, res.access);
           // If refresh token rotates, save it too
           if (res.refresh) {
             localStorage.setItem(this.refreshKey, res.refresh);
           }
           this.isAuthenticatedSubject.next(true);
        }
      })
    );
  }
}
