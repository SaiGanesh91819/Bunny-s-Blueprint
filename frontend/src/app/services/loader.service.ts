import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.isLoadingSubject.asObservable();
  
  // Track multiple requests to ensure loader stays until ALL are done
  private requestsCount = 0;

  show() {
    this.requestsCount++;
    if (this.requestsCount === 1) {
      this.isLoadingSubject.next(true);
    }
  }

  hide() {
    if (this.requestsCount > 0) {
      this.requestsCount--;
      if (this.requestsCount === 0) {
        this.isLoadingSubject.next(false);
      }
    }
  }
}
