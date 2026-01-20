import { Component, OnInit, OnDestroy } from '@angular/core';
import { ToastService, Toast } from '../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast',
  template: `
    <div class="toast-container" *ngIf="currentToast">
      <div class="toast glass-panel" [ngClass]="currentToast.type">
        <div class="toast-content">
          <span class="icon" *ngIf="currentToast.type === 'success'">✅</span>
          <span class="icon" *ngIf="currentToast.type === 'error'">❌</span>
          <span class="icon" *ngIf="currentToast.type === 'info'">ℹ️</span>
          <span class="message">{{ currentToast.message }}</span>
        </div>
        <button class="close-btn" (click)="close()">×</button>
        <div class="progress-bar">
          <div class="progress" [style.animation-duration]="currentToast.duration + 'ms'"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px; /* Moved to Right */
      z-index: 10000;
      animation: slideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .toast {
      min-width: 300px;
      padding: 1rem 1.2rem;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.15);
      border: 1px solid rgba(255, 255, 255, 0.5);
    }
    
    .toast-content {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .icon { font-size: 1.2rem; }
    
    .message {
      font-weight: 600;
      color: var(--text-main);
      font-size: 0.95rem;
    }

    .close-btn {
      position: absolute;
      top: 5px;
      right: 8px;
      background: none;
      border: none;
      font-size: 1.4rem;
      color: var(--text-muted);
      cursor: pointer;
      line-height: 1;
      padding: 0;
      opacity: 0.6;
      transition: opacity 0.2s;
      
      &:hover { opacity: 1; color: var(--neon-red); }
    }

    .progress-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 4px;
      background: rgba(0,0,0,0.05);
    }

    .progress {
      height: 100%;
      background: var(--neon-orange);
      width: 100%;
      animation-name: countDown;
      animation-timing-function: linear;
      animation-fill-mode: forwards;
      transform-origin: left;
    }
    
    .toast.success .progress { background: #00cec9; }
    .toast.error .progress { background: #ff4757; }
    .toast.info .progress { background: var(--neon-orange); }

    @keyframes slideIn {
      from { transform: translateX(50px); opacity: 0; } /* From Right */
      to { transform: translateX(0); opacity: 1; }
    }

    @keyframes countDown {
      from { transform: scaleX(1); }
      to { transform: scaleX(0); }
    }
  `]
})
export class ToastComponent implements OnInit, OnDestroy {
  currentToast: Toast | null = null;
  private subscription: Subscription = new Subscription();
  private timeoutRef: any;

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.subscription = this.toastService.toast$.subscribe(toast => {
      this.show(toast);
    });
  }

  show(toast: Toast) {
    if (this.timeoutRef) clearTimeout(this.timeoutRef);
    
    this.currentToast = toast;
    
    const duration = toast.duration || 3000;
    this.timeoutRef = setTimeout(() => {
      this.close();
    }, duration);
  }

  close() {
    this.currentToast = null;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
