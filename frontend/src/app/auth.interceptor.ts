import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService, private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    request = this.addToken(request);

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !request.url.includes('/token/refresh/')) {
          return this.handle401Error(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  private addToken(request: HttpRequest<unknown>) {
    const token = this.authService.getToken();
    if (token) {
      return request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    return request;
  }

  private handle401Error(request: HttpRequest<unknown>, next: HttpHandler) {
    // Attempt Refresh
    return this.authService.refreshToken().pipe(
      switchMap((token: any) => {
        // Retry with new token
        return next.handle(this.addToken(request));
      }),
      catchError((err) => {
        // Refresh failed -> Logout but don't force redirect if on a public page
        const currentUrl = this.router.url;
        const protectedRoutes = ['/dashboard', '/profile'];
        const isProtected = protectedRoutes.some(route => currentUrl.startsWith(route));

        this.authService.logout();

        if (isProtected) {
          console.warn('Session expired on protected route. Redirecting to login.');
          this.router.navigate(['/login']);
        } else {
          console.warn('Session cleared quietly on public route.');
        }

        return throwError(() => err);
      })
    );
  }
}
