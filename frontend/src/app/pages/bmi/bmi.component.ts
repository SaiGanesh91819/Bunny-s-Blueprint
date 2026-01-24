import { Component, OnInit } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-bmi',
  templateUrl: './bmi.component.html',
  styleUrls: ['./bmi.component.scss']
})
export class BmiComponent implements OnInit {
  heightFeet: number | null = null;
  heightInches: number | null = null;
  weight: number | null = null;
  age: number | null = null;
  gender: string = 'Male';
  
  result: number | null = null;
  category: string = '';
  advice: string = '';
  
  constructor(private toastService: ToastService) { }

  ngOnInit(): void { }

  calculateBMI() {
    if (this.heightFeet !== null && this.heightInches !== null && this.weight) {
      // 1 ft = 30.48 cm, 1 in = 2.54 cm
      const totalCm = (this.heightFeet * 30.48) + (this.heightInches * 2.54);
      const heightInMeters = totalCm / 100;
      this.result = parseFloat((this.weight / (heightInMeters * heightInMeters)).toFixed(1));
      this.setCategoryAndAdvice();
      
      this.toastService.show('Analysis Complete! ✨', 'success');
      
      // Auto-scroll to results
      setTimeout(() => {
        const resultEl = document.getElementById('bmi-result');
        if (resultEl) {
          resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }

  setCategoryAndAdvice() {
    if (!this.result) return;

    if (this.result < 18.5) {
      this.category = 'Underweight';
      this.advice = 'Consider a balanced diet with higher caloric intake and strength training to build muscle mass safely.';
    } else if (this.result >= 18.5 && this.result < 25) {
      this.category = 'Normal';
      this.advice = 'Excellent! You are in a healthy weight range. Maintain your progress with consistent activity and nutrition.';
    } else if (this.result >= 25 && this.result < 30) {
      this.category = 'Overweight';
      this.advice = 'Small lifestyle adjustments like increasing daily steps and monitoring portion sizes can help return to a normal range.';
    } else {
      this.category = 'Obese';
      this.advice = 'Focus on sustainable habits like steady cardio, fiber-rich foods, and consulting a professional for a structured roadmap.';
    }
  }

  getCategoryClass() {
    return this.category.toLowerCase().replace(' ', '-');
  }

  reset() {
    this.heightFeet = null;
    this.heightInches = null;
    this.weight = null;
    this.age = null;
    this.result = null;
    this.category = '';
    this.advice = '';
  }
}
