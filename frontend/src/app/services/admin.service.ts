import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/users/staff/users/`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return { 'Authorization': `Bearer ${token}` };
  }

  getUsers(search: string = ''): Observable<any> {
    return this.http.get(`${this.apiUrl}?search=${search}`, {
      headers: this.getAuthHeaders()
    });
  }

  updateSubscription(data: { user_id: number, plan_type: string, is_active: boolean }): Observable<any> {
    return this.http.post(this.apiUrl, data, {
      headers: this.getAuthHeaders()
    });
  }
}
