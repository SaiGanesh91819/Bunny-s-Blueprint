import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

declare var Razorpay: any;

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = 'http://localhost:8000/api/payment';

  constructor(private http: HttpClient, private authService: AuthService) {}

  createOrder(amount: number, planType: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/create-order/`, { amount, plan_type: planType }, { headers });
  }

  verifyPayment(paymentData: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/verify/`, paymentData, { headers });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // Launch Razorpay Checkout
  initiatePayment(orderId: string, amount: number, key: string, userDetails: any, handlers: any) {
    const options = {
      key: key,
      amount: amount * 100, // paise
      currency: 'INR',
      name: "Bunny's Blueprint",
      description: "Premium Subscription",
      image: "assets/logo.png", // Ensure you have a logo or remove
      order_id: orderId,
      handler: (response: any) => {
        handlers.onSuccess(response);
      },
      prefill: {
        name: userDetails.name,
        email: userDetails.email,
        contact: userDetails.phone
      },
      theme: {
        color: "#F39C12"
      },
      modal: {
        ondismiss: () => {
             if(handlers.onDismiss) handlers.onDismiss();
        }
      }
    };

    const rzp = new Razorpay(options);
    rzp.open();
    
    rzp.on('payment.failed', (response: any) => {
        if(handlers.onFailure) handlers.onFailure(response);
    });
  }
}
