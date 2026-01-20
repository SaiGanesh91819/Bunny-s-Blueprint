import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  data: any = null;
  // Mock logic: In real app, this comes from user subscription status
  hasActivePlan: boolean = false; 

  // Heatmap Data
  weekDates: Date[] = [];
  runDate = new Date();
  currentWeekOffset: number = 0;

  habits: any[] = [];
  newHabitName: string = '';
  newHabitStart: string = new Date().toISOString().split('T')[0];
  newHabitEnd: string = '';
  habitScore: number = 0;
  
  constructor(private http: HttpClient) {
    this.generateWeekDates();
  }

  // ... (ngOnInit, fetch methods)

  ngOnInit() {
    this.fetchDashboardData();
    this.fetchHabits();
  }

  generateWeekDates() {
    const today = new Date();
    // Adjust today based on offset (7 days for each offset step)
    const anchorDate = new Date();
    anchorDate.setDate(today.getDate() + (this.currentWeekOffset * 7));

    this.weekDates = [];
    // Generate 7 days ending at anchorDate
    for (let i = 6; i >= 0; i--) {
      const d = new Date(anchorDate);
      d.setDate(anchorDate.getDate() - i);
      this.weekDates.push(d);
    }
  }

  prevWeek() {
    this.currentWeekOffset--;
    this.generateWeekDates();
  }

  nextWeek() {
    this.currentWeekOffset++;
    this.generateWeekDates();
  }

  fetchDashboardData() {
    this.http.get('http://localhost:8000/api/core/mock-data/').subscribe({
      next: (res: any) => this.data = res.dashboard,
      error: (err) => console.error(err)
    });
  }

  fetchHabits() {
    this.http.get<any>('http://localhost:8000/api/core/habits/').subscribe({
      next: (res) => {
        if (res.status === 'success') {
             this.habits = res.data || [];
             this.calculateScore();
        }
      },
      error: (err) => console.error('Error fetching habits', err)
    });
  }

  // Check if habit was completed on specific date (from recent_logs strings)
  isCompletedOn(habit: any, date: Date): boolean {
    if (!habit.recent_logs) return false;
    const dateStr = date.toISOString().split('T')[0];
    return habit.recent_logs.includes(dateStr);
  }

  isDateInRange(habit: any, date: Date): boolean {
    const d = new Date(date);
    d.setHours(0,0,0,0);
    const start = new Date(habit.start_date);
    start.setHours(0,0,0,0);
    
    if (d < start) return false;
    
    if (habit.end_date) {
        const end = new Date(habit.end_date);
        end.setHours(0,0,0,0);
        if (d > end) return false;
    }
    return true;
  }

  togglePlan() {
    this.hasActivePlan = !this.hasActivePlan;
  }

  // --- Habit Tracker Logic (Backend Integrated) ---

  addHabit() {
    if (this.newHabitName.trim()) {
      const payload: any = { 
          name: this.newHabitName.trim(),
          start_date: this.newHabitStart 
      };
      if (this.newHabitEnd) {
          payload.end_date = this.newHabitEnd;
      }

      this.http.post<any>('http://localhost:8000/api/core/habits/', payload).subscribe({
        next: (res) => {
          if (res.status === 'success') {
            this.habits.push(res.data);
            this.newHabitName = '';
            // Reset dates (keep start date as today)
            this.newHabitStart = new Date().toISOString().split('T')[0];
            this.newHabitEnd = '';
            this.calculateScore();
          }
        },
        error: (err) => console.error('Error adding habit', err)
      });
    }
  }

  toggleHabit(index: number) {
    const habit = this.habits[index];
    this.http.post<any>(`http://localhost:8000/api/core/habits/${habit.id}/toggle/`, {}).subscribe({
      next: (res) => {
         if (res.status === 'success') {
            // Update completed_today
            this.habits[index].completed_today = res.data.completed;
            
            // Also update recent_logs for the Heatmap live update
            const todayStr = new Date().toISOString().split('T')[0];
            if (res.data.completed) {
                if (!this.habits[index].recent_logs.includes(todayStr)) {
                    this.habits[index].recent_logs.push(todayStr);
                }
            } else {
                this.habits[index].recent_logs = this.habits[index].recent_logs.filter((d: string) => d !== todayStr);
            }

            this.calculateScore();
         }
      },
      error: (err) => console.error('Error toggling habit', err)
    });
  }

  deleteHabit(index: number) {
    const habit = this.habits[index];
    this.http.delete<any>(`http://localhost:8000/api/core/habits/${habit.id}/`).subscribe({
      next: (res) => {
        if (res.status === 'success') {
             this.habits.splice(index, 1);
             this.calculateScore();
        }
      },
      error: (err) => console.error('Error deleting habit', err)
    });
  }

  calculateScore() {
    if (this.habits.length === 0) {
      this.habitScore = 0;
      return;
    }
    const completed = this.habits.filter(h => h.completed_today).length;
    this.habitScore = Math.round((completed / this.habits.length) * 100);
  }
}
