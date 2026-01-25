import { Component, OnInit, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Chart } from 'chart.js/auto';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  Math = Math;
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

  exclusiveVideos: any[] = [
    { title: 'The Blueprint Kickoff', type: 'Video', duration: '15m', youtube_id: 'kJQP7kiw5Fk', week: 0 },
    { title: 'Gut Health Mastery', type: 'Video', duration: '45m', youtube_id: 'kJQP7kiw5Fk', week: 1 },
    { title: 'Macro Optimization', type: 'Video', duration: '30m', youtube_id: 'kJQP7kiw5Fk', week: 2 },
    { title: 'The Science of Sleep', type: 'Video', duration: '20m', youtube_id: 'kJQP7kiw5Fk', week: 3 },
    { title: 'Hormonal Balance', type: 'Video', duration: '25m', youtube_id: 'kJQP7kiw5Fk', week: 4 },
    { title: 'Metabolic Flexibility', type: 'Video', duration: '40m', youtube_id: 'kJQP7kiw5Fk', week: 5 },
    { title: 'Sustaining Results', type: 'Video', duration: '20m', youtube_id: 'kJQP7kiw5Fk', week: 6 },
    { title: 'Mindset Performance', type: 'Video', duration: '15m', youtube_id: 'kJQP7kiw5Fk', week: 7 },
    { title: 'Advanced Meal Prep', type: 'Video', duration: '35m', youtube_id: 'kJQP7kiw5Fk', week: 8 },
    { title: 'The Lifestyle Exit', type: 'Video', duration: '20m', youtube_id: 'kJQP7kiw5Fk', week: 9 }
  ];
  bmi: number | null = null;
  bmiCategory: string = '';
  todayTime: number = new Date().getTime();
  startTime: number = new Date().getTime();

  // Heatmap Data
  weekDates: Date[] = [];
  runDate = new Date();
  currentWeekOffset: number = 0;

  habits: any[] = [];
  newHabitName: string = '';
  newHabitStart: string = new Date().toISOString().split('T')[0];
  newHabitEnd: string = '';
  habitScore: number = 0;

  get activeHabitsToday(): any[] {
    return this.habits.filter(h => this.isDateInRange(h, this.runDate));
  }
  
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
            this.data.blueprint_start_date = res.subscription.blueprint_start_date;
            this.startTime = new Date(res.subscription.blueprint_start_date).getTime();
            
            // Process time-released content
            this.processExclusiveContent();

            this.data.resources = [
                { name: 'Weekly Meal Plan.pdf', type: 'PDF', size: '1.2MB' },
                { name: 'Workout Schedule.jpg', type: 'Image', size: '500KB' }
            ];
        } else {
            this.hasActivePlan = false;
            this.data.active_plan = 'No Active Plan';
            this.data.active_plan_details = { status: 'Inactive', date_label: '', date_value: '', features_unlocked: [] };
            
            // Show content as locked/preview for inactive
            this.data.content = this.exclusiveVideos.map(v => ({ ...v, is_locked: true, unlock_reason: 'Plan Required' }));
            this.data.resources = [];
        }

        // Map Stats
        if (res.profile) {
            this.data.stats.weight.current = res.profile.weight || 0;
            this.data.stats.weight.target = res.profile.target_weight || 0; 
            this.data.stats.weight.start = res.profile.initial_weight || res.profile.weight || 0;
            
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
    this.http.get<any>(`${environment.apiUrl}/core/habits/`).subscribe({
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
      this.http.get<any[]>(`${environment.apiUrl}/users/weight-log`, {
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
        this.hasLoggedToday = !!todayLog;
        if (todayLog) {
                      if(todayLog.weight) this.data.stats.weight.current = todayLog.weight; 
                      this.data.stats.water.current = todayLog.water || 0;
                      this.data.stats.steps.current = todayLog.steps || 0;
                  }
                  
                  this.calculateAnalytics();
              } else {
                  this.renderChart(); // Will show empty/fallback
              }
          },
          error: (err) => console.error('Error fetching logs', err)
      });
  }

  calculateAnalytics() {
    if (!this.dailyLogs || this.dailyLogs.length === 0) return;

    const last7 = this.dailyLogs.slice(-7);
    
    // Weight Trends
    const weights = last7.filter(l => l.weight).map(l => l.weight);
    const avgWeight = weights.length ? (weights.reduce((a, b) => a + b, 0) / weights.length) : 0;
    const weightChange = weights.length > 1 ? (weights[weights.length - 1] - weights[0]) : 0;

    // Water Stats
    const totalWater = last7.reduce((sum, l) => sum + (l.water || 0), 0);
    const dailyWaterAvg = last7.length ? (totalWater / last7.length) : 0;

    // Steps Stats
    const totalSteps = last7.reduce((sum, l) => sum + (l.steps || 0), 0);
    const avgSteps = last7.length ? (totalSteps / last7.length) : 0;

    this.data.analytics = {
      weight: {
        avg: avgWeight.toFixed(1),
        change: weightChange.toFixed(1),
        trend: weightChange < 0 ? 'down' : (weightChange > 0 ? 'up' : 'neutral')
      },
      water: {
        total: totalWater.toFixed(1),
        avg: dailyWaterAvg.toFixed(1)
      },
      steps: {
        avg: Math.round(avgSteps).toLocaleString(),
        total: totalSteps.toLocaleString()
      }
    };
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
          if (this.data.blueprint_start_date) {
            const startStr = this.data.blueprint_start_date;
            labels = this.dailyLogs.map(l => {
              const d = new Date(l.date);
              const s = new Date(startStr);
              // Normalize to midnight for accurate day counting
              d.setHours(0,0,0,0);
              s.setHours(0,0,0,0);
              const diffTime = d.getTime() - s.getTime();
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
              return diffDays > 0 ? `Day ${diffDays}` : l.date;
            });
          } else {
            labels = this.dailyLogs.map(l => new Date(l.date).toLocaleDateString(undefined, {month:'short', day:'numeric'}));
          }
          
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
  hasLoggedToday = false;
  dailyLog = { weight: null, water: 0, steps: 0 };
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
      this.http.post(`${environment.apiUrl}/users/weight-log/`, this.dailyLog, {
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



  // --- Helper Methods ---

  getWeightFill(): number {
    const current = this.data.stats.weight.current;
    const target = this.data.stats.weight.target;
    let start = this.data.stats.weight.start;
    
    if (!current || !target || !start) return 0;

    // Weight LOSS Scenario (Goal is below current)
    if (target < start) {
        // Bottom of card is Start + 3kg (to show initial progress/buffer)
        const bottom = start + 3;
        const totalRange = bottom - target;
        if (totalRange <= 0) return 100;
        
        const progress = bottom - current;
        const pct = (progress / totalRange) * 100;
        return Math.max(0, Math.min(100, pct));
    } 
    
    // Weight GAIN Scenario (Goal is above current)
    if (target > start) {
        // Bottom of card is Start - 3kg
        const bottom = start - 3;
        const totalRange = target - bottom;
        if (totalRange <= 0) return 100;

        const progress = current - bottom;
        const pct = (progress / totalRange) * 100;
        return Math.max(0, Math.min(100, pct));
    }

    return 0;
  }

  processExclusiveContent() {
    if (!this.data.blueprint_start_date) {
        this.data.content = this.exclusiveVideos.map(v => ({ ...v, is_locked: true, unlock_reason: 'Anchor Your Journey First' }));
        return;
    }

    const start = new Date(this.data.blueprint_start_date);
    const now = new Date();
    
    this.data.content = this.exclusiveVideos.map((video, index) => {
        // Week 0 is immediate
        if (video.week === 0) return { ...video, is_locked: false };

        // For "Released at every weekend", we calculate the number of Saturdays passed
        const unlockDate = new Date(start);
        // Add (week * 7) days to start date, then find the nearest Saturday?
        // Or simply Week 1 = Day 7, Week 2 = Day 14.
        // User said "every weekend". Let's assume start day + 6 days = first Sunday.
        // Simplified: unlockDate = start + (week * 7) days.
        unlockDate.setDate(start.getDate() + (video.week * 7));
        
        const is_locked = now < unlockDate;
        return { 
            ...video, 
            is_locked, 
            unlock_date: unlockDate,
            unlock_reason: is_locked ? `Unlocks on ${unlockDate.toLocaleDateString(undefined, {month:'short', day:'numeric'})}` : ''
        };
    });
  }

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

      this.http.post<any>(`${environment.apiUrl}/core/habits/`, payload).subscribe({
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

  toggleHabit(habit: any) {
    const index = this.habits.findIndex(h => h.id === habit.id);
    if (index === -1) return;
    this.http.post<any>(`${environment.apiUrl}/core/habits/${habit.id}/toggle/`, {}).subscribe({
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

  deleteHabit(habit: any) {
    const index = this.habits.findIndex(h => h.id === habit.id);
    if (index === -1) return;
    this.http.delete<any>(`${environment.apiUrl}/core/habits/${habit.id}/`).subscribe({
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
    const active = this.activeHabitsToday;
    if (active.length === 0) {
      this.habitScore = 0;
      return;
    }
    const completed = active.filter(h => h.completed_today).length;
    this.habitScore = Math.round((completed / active.length) * 100);
  }

  onStartDateSelect(date: string) {
    if (!date) {
        this.toastService.show('Please select a valid date.', 'error');
        return;
    }

    this.toastService.show('Anchoring your mission...', 'info');
    this.authService.setBlueprintStartDate(date).subscribe({
      next: (res: any) => {
        this.toastService.show('Mission anchored! 🏁', 'success');
        this.fetchDashboardData(); // Refresh to remove blur
      },
      error: (err) => {
        this.toastService.show('Failed to set start date.', 'error');
      }
    });
  }
}
