import { Component, OnInit, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Chart } from 'chart.js/auto';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  data: any = {
    active_plan: 'Free Starter',
    active_plan_details: { status: 'Inactive', renewal_date: 'N/A', features_unlocked: [] },
    resources: [],
    stats: { 
        weight: { current: 0, target: 0, start: 0, unit: 'kg' },
        water: { current: 0, target: 4, unit: 'L' },
        steps: { current: 0, target: 10000 }
    },
    content: []
  };
  hasActivePlan: boolean = false; 
  bmi: number | null = null;
  bmiCategory: string = '';

  // Heatmap Data
  weekDates: Date[] = [];
  runDate = new Date();
  currentWeekOffset: number = 0;

  habits: any[] = [];
  newHabitName: string = '';
  newHabitStart: string = new Date().toISOString().split('T')[0];
  newHabitEnd: string = '';
  habitScore: number = 0;
  
  constructor(
    private http: HttpClient, 
    private authService: AuthService,
    private toastService: ToastService
  ) {
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
    this.authService.getProfile().subscribe({
      next: (res: any) => {
        // Map Profile Data to Dashboard Structure
        if (res.subscription && res.subscription.is_active) {
            this.hasActivePlan = true;
            this.data.active_plan = res.subscription.plan_type;
            this.data.active_plan_details = {
                status: 'Lifetime Active',
                date_label: 'Purchased on',
                date_value: new Date(res.subscription.start_date).toLocaleDateString(),
                features_unlocked: ['Custom Meal Plans', 'Workout Guides', 'Daily Adjustments']
            };
            // Mock Content for paid users
            this.data.content = [
                { title: 'Fat Loss Masterclass', type: 'Video', duration: '45m' },
                { title: 'Keto Recipes PDF', type: 'PDF', size: '2.4MB' }
            ];
            this.data.resources = [
                { name: 'Weekly Meal Plan.pdf', type: 'PDF', size: '1.2MB' },
                { name: 'Workout Schedule.jpg', type: 'Image', size: '500KB' }
            ];
        } else {
            this.hasActivePlan = false;
            this.data.active_plan = 'No Active Plan';
            this.data.active_plan_details = { status: 'Inactive', date_label: '', date_value: '', features_unlocked: [] };
            
            // Show content even if inactive (it will be blurred)
            this.data.content = [
                { title: 'Fat Loss Masterclass', type: 'Video', duration: '45m' },
                { title: 'Keto Recipes PDF', type: 'PDF', size: '2.4MB' },
                { title: 'HIIT Workout Guide', type: 'Video', duration: '30m' },
                { title: 'Sleep Optimization', type: 'Article', read_time: '5m' },
                { title: 'Supplement Science', type: 'Video', duration: '15m' },
                { title: 'Mindset Training', type: 'Audio', duration: '20m' }
            ];
            // Resources might be empty or locked
            this.data.resources = [];
        }

        // Map Stats
        if (res.profile) {
            this.data.stats.weight.current = res.profile.weight || 0;
            this.data.stats.weight.target = res.profile.target_weight || 0; 
            
            this.data.stats.water.target = res.profile.target_water || 0;
            this.data.stats.steps.target = res.profile.target_steps || 0;
            
            // Calculate BMI
            if (res.profile.height && res.profile.weight) {
                this.calculateBMI(res.profile.weight, res.profile.height);
            }

            // Init Chart and Daily Stats
            this.fetchDailyLogs();
        }
      },
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

  // --- Graph Logic ---
  selectedGraph: 'weight' | 'water' | 'steps' = 'weight';
  dailyLogs: any[] = [];
  chart: any;

  calculateBMI(weightKg: number, heightCm: number) {
      if (heightCm > 0) {
          const heightM = heightCm / 100;
          this.bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));
          
          if (this.bmi < 18.5) this.bmiCategory = 'Underweight';
          else if (this.bmi < 25) this.bmiCategory = 'Normal';
          else if (this.bmi < 30) this.bmiCategory = 'Overweight';
          else this.bmiCategory = 'Obese';
      }
  }

  fetchDailyLogs() {
      this.http.get<any[]>('http://localhost:8000/api/users/weight-log', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      }).subscribe({
          next: (logs) => {
              this.dailyLogs = logs; // Store for switching
              
              if (logs.length > 0) {
                  // Update Chart with current selection
                  this.renderChart();
                  
                  // Update Stats from Today's Log
                  const today = new Date().toISOString().split('T')[0];
                  const todayLog = logs.find(l => l.date === today);
                  if (todayLog) {
                      if(todayLog.weight) this.data.stats.weight.current = todayLog.weight; 
                      this.data.stats.water.current = todayLog.water || 0;
                      this.data.stats.steps.current = todayLog.steps || 0;
                  }
              } else {
                  this.renderChart(); // Will show empty/fallback
              }
          },
          error: (err) => console.error('Error fetching logs', err)
      });
  }

  switchGraph(type: 'weight' | 'water' | 'steps') {
      this.selectedGraph = type;
      this.renderChart();
  }

  renderChart() {
      if (this.chart) this.chart.destroy();
      
      const ctx = document.getElementById('weightChart') as HTMLCanvasElement;
      if (!ctx) return;

      let labels: string[] = [];
      let data: number[] = [];
      let label = '';
      let color = '';
      let bgColor = '';
      let currentVal = 0;

      if (this.dailyLogs.length > 0) {
          labels = this.dailyLogs.map(l => new Date(l.date).toLocaleDateString(undefined, {month:'short', day:'numeric'}));
          
          if (this.selectedGraph === 'weight') {
              data = this.dailyLogs.map(l => l.weight || 0);
              label = 'Weight (kg)';
              color = '#ff7675';
              bgColor = 'rgba(255, 118, 117, 0.2)';
              currentVal = this.data.stats.weight.current;
          } else if (this.selectedGraph === 'water') {
              data = this.dailyLogs.map(l => l.water || 0);
              label = 'Water (L)';
              color = '#00aec9'; // Cyan-ish
              bgColor = 'rgba(0, 174, 201, 0.2)';
              currentVal = this.data.stats.water.current;
          } else {
              data = this.dailyLogs.map(l => l.steps || 0);
              label = 'Steps';
              color = '#00b894'; // Teal
              bgColor = 'rgba(0, 184, 148, 0.2)';
              currentVal = this.data.stats.steps.current;
          }
      } else {
           labels = ['Current'];
           if (this.selectedGraph === 'weight') {
               data = [this.data.stats.weight.current || 70];
               color = '#ff7675';
           } else if (this.selectedGraph === 'water') {
               data = [this.data.stats.water.current || 0];
               color = '#00aec9';
           } else {
               data = [this.data.stats.steps.current || 0];
               color = '#00b894';
           }
           bgColor = color; // simplify
      }

      this.chart = new Chart(ctx, {
          type: 'line',
          data: {
              labels: labels,
              datasets: [{
                  label: label,
                  data: data,
                  borderColor: color,
                  backgroundColor: bgColor,
                  borderWidth: 3,
                  tension: 0.4,
                  fill: true,
                  pointBackgroundColor: '#fff',
                  pointBorderColor: color,
                  pointRadius: 5
              }]
          },
          options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                  y: {
                     display: true,
                     suggestedMin: Math.min(...data) * 0.9,
                     suggestedMax: Math.max(...data) * 1.1,
                     grid: { color: 'rgba(0,0,0,0.05)' }
                  },
                  x: { grid: { display: false } }
              }
          }
      });
  }

  // --- Unified Logging ---
  showDailyModal = false;
  dailyLog = { weight: null, water: null, steps: null };
  isLogging = false;

  openDailyLog() {
      this.showDailyModal = true;
      // Pre-fill with current if exists
      this.dailyLog = {
          weight: this.data.stats.weight.current,
          water: this.data.stats.water.current,
          steps: this.data.stats.steps.current
      };
  }

  closeDailyLog() {
      this.showDailyModal = false;
  }

  confirmDailyLog() {
      this.isLogging = true;
      this.http.post('http://localhost:8000/api/users/weight-log/', this.dailyLog, {
         headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      }).subscribe({
          next: () => {
              this.toastService.show('Daily progress logged! 🚀', 'success');
              this.fetchDailyLogs(); // refresh
              this.isLogging = false;
              this.closeDailyLog();
          },
          error: (err) => {
              this.isLogging = false;
              console.error(err);
              this.toastService.show('Failed to log.', 'error');
          }
      });
  }

  // --- Goal Setting Logic ---
  showGoalModal = false;
  goalType: 'weight' | 'water' | 'steps' = 'weight';
  goalInput: number | null = null;
  
  openGoalModal(type: 'weight' | 'water' | 'steps') {
      this.goalType = type;
      this.showGoalModal = true;
      if (type === 'weight') this.goalInput = this.data.stats.weight.target;
      if (type === 'water') this.goalInput = this.data.stats.water.target;
      if (type === 'steps') this.goalInput = this.data.stats.steps.target;
  }

  closeGoalModal() {
      this.showGoalModal = false;
  }

  confirmSetGoal() {
      if (this.goalInput !== null && !isNaN(this.goalInput)) {
          this.isLogging = true;
          
          const payload: any = {};
          if (this.goalType === 'weight') payload.target_weight = this.goalInput;
          if (this.goalType === 'water') payload.target_water = this.goalInput;
          if (this.goalType === 'steps') payload.target_steps = this.goalInput;

          this.authService.updateProfile(payload).subscribe({
              next: () => {
                  this.toastService.show('Goal updated! 🎯', 'success');
                  // Update local
                  if (this.goalType === 'weight') this.data.stats.weight.target = this.goalInput;
                  if (this.goalType === 'water') this.data.stats.water.target = this.goalInput;
                  if (this.goalType === 'steps') this.data.stats.steps.target = this.goalInput;
                  
                  this.isLogging = false;
                  this.closeGoalModal();
              },
              error: (err) => {
                  this.isLogging = false;
                  console.error(err);
                  alert('Failed to set goal');
              }
          });
      }
  }



  // --- Weight Scale Helpers ---
  getScalePos(current: number, target: number): string {
      if (!current || !target) return '50%';
      // Difference
      const diff = current - target; 
      // Scale: Let's say +/- 10kg represents the full width (50% +/- 50%)
      // If diff is 0 => 50%
      // If diff is -10 => 0%
      // If diff is +10 => 100%
      // So % = 50 + (diff * 5)
      let percent = 50 + (diff * 5);
      
      // Clamp
      if (percent < 5) percent = 5;
      if (percent > 95) percent = 95;
      
      return `${percent}%`;
  }

  getScaleClass(current: number, target: number): string {
      const diff = Math.abs(current - target);
      if (diff < 1) return 'perfect';
      if (diff < 5) return 'close';
      return '';
  }

  getProgressColor(current: number, target: number): string {
      if (!target || target === 0) return '#bdc3c7';
      const pct = (current / target) * 100;
      if (pct >= 100) return '#00b894'; // Perfect
      if (pct >= 70) return '#00b894'; // Good
      if (pct >= 40) return '#fdcb6e'; // Okay
      return '#ff7675'; // Bad
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
