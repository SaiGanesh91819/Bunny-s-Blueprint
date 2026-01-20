import { Component } from '@angular/core';
import { LoaderService } from '../../services/loader.service';

@Component({
  selector: 'app-loader',
  template: `
    <div class="progress-loader" *ngIf="loaderService.isLoading$ | async">
      <div class="loading-bar"></div>
    </div>
  `,
  styles: [`
    .progress-loader {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 4px; /* Thin premium line */
      z-index: 99999; /* Topmost */
      background-color: rgba(255, 127, 80, 0.1);
      overflow: hidden;
    }

    .loading-bar {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      width: 100%;
      background: linear-gradient(90deg, 
        var(--neon-orange), 
        var(--neon-red), 
        var(--neon-gold)
      );
      transform-origin: left;
      animation: indeterminate 2s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
    }

    @keyframes indeterminate {
      0% {
        left: -35%;
        right: 100%;
      }
      60% {
        left: 100%;
        right: -90%;
      }
      100% {
        left: 100%;
        right: -90%;
      }
    }
  `]
})
export class LoaderComponent {
  constructor(public loaderService: LoaderService) {}
}
