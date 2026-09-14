import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { UserService } from '../../../services/user.service';
import { User } from '../../../models';

interface RosterEntry {
  date: string;
  staffId: string;
  isOffDay: boolean;
}

@Component({
  selector: 'app-roster',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="roster-container">
      <h1>Manage Roster</h1>

      <div *ngIf="currentUser()" class="supervisor-info">
        <p>Supervisor: <strong>{{ currentUser()!.firstName }} {{ currentUser()!.lastName }}</strong></p>
      </div>

      <!-- Month Selection -->
      <div class="section">
        <h2>Select Month</h2>
        <div class="month-selector">
          <button type="button" (click)="previousMonth()" [disabled]="isLoading()">‹ Previous</button>
          <span class="current-month">{{ currentMonth() | date:'MMMM yyyy' }}</span>
          <button type="button" (click)="nextMonth()" [disabled]="isLoading()">Next ›</button>
        </div>
      </div>

      <!-- Roster Management -->
      <div class="section">
        <h2>Roster for {{ currentMonth() | date:'MMMM yyyy' }}</h2>

        <div *ngIf="assignedStaff().length > 0; else noAssignedStaff">
          <div class="roster-grid">
            <!-- Header with staff names -->
            <div class="roster-header">
              <div class="date-column">Date</div>
              <div *ngFor="let staff of assignedStaff()" class="staff-column">
                {{ staff.firstName }} {{ staff.lastName }}
              </div>
            </div>

            <!-- Calendar rows -->
            <div *ngFor="let day of daysInMonth" class="roster-row" [ngClass]="{'weekend': isWeekend(day), 'past-day': isPastDay(day)}">
              <div class="date-column">
                <div class="date">{{ day | date:'d' }}</div>
                <div class="day-name">{{ day | date:'EEE' }}</div>
              </div>

              <div *ngFor="let staff of assignedStaff()" class="staff-column">
                <div class="staff-cell">
                  <select
                    [value]="getRosterEntry(day, staff._id || staff.id || '')"
                    (change)="updateRosterEntry(day, staff._id || staff.id || '', $event)"
                    [disabled]="isPastDay(day) || isLoading()">
                    <option value="WORKING">Working</option>
                    <option value="OFF">Off</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="actions">
            <button type="button" (click)="saveRoster()" [disabled]="isLoading() || !hasChanges()">
              {{ isLoading() ? 'Saving...' : 'Save Roster' }}
            </button>
            <button type="button" (click)="resetRoster()" [disabled]="isLoading() || !hasChanges()">
              Reset Changes
            </button>
          </div>
        </div>
        <ng-template #noAssignedStaff>
          <p>No staff assigned to you.</p>
        </ng-template>
      </div>

      <div *ngIf="error()" class="error-message">
        {{ error() }}
      </div>

      <div *ngIf="successMessage()" class="success-message">
        {{ successMessage() }}
      </div>
    </div>
  `,
  styles: [`
    .roster-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .supervisor-info {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }

    .section {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
    }

    .month-selector {
      display: flex;
      align-items: center;
      gap: 1rem;
      justify-content: center;
    }

    .month-selector button {
      padding: 0.5rem 1rem;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      cursor: pointer;
    }

    .month-selector button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .current-month {
      font-size: 1.25rem;
      font-weight: 500;
      min-width: 150px;
      text-align: center;
    }

    .roster-grid {
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
    }

    .roster-header {
      display: flex;
      background: #f8f9fa;
      font-weight: 500;
    }

    .roster-row {
      display: flex;
      border-bottom: 1px solid #eee;
    }

    .roster-row.weekend {
      background: #fffef8;
    }

    .roster-row.past-day {
      background: #f8f8f8;
      opacity: 0.7;
    }

    .date-column {
      width: 80px;
      padding: 1rem;
      text-align: center;
      border-right: 1px solid #eee;
      background: #f8f9fa;
    }

    .date {
      font-size: 1.25rem;
      font-weight: 500;
    }

    .day-name {
      font-size: 0.875rem;
      color: #666;
      margin-top: 0.25rem;
    }

    .staff-column {
      flex: 1;
      padding: 0.5rem;
      border-right: 1px solid #eee;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .staff-cell {
      width: 100%;
    }

    select {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
    }

    .roster-row.past-day select {
      background: #f8f8f8;
    }

    .actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 2rem;
    }

    button {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .actions button:first-child {
      background: #28a745;
      color: white;
    }

    .actions button:last-child {
      background: #6c757d;
      color: white;
    }

    .error-message {
      background: #f8d7da;
      color: #721c24;
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
    }

    .success-message {
      background: #d4edda;
      color: #155724;
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
    }

  `]
})
export class RosterComponent implements OnInit {
  currentUser = signal<User | null>(null);
  assignedStaff = signal<User[]>([]);
  currentMonth = signal<Date>(new Date());
  rosterData = signal<RosterEntry[]>([]);
  originalRosterData = signal<RosterEntry[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {
  }

  ngOnInit() {
    this.loadCurrentUser();
    this.loadAssignedStaff();
    this.loadRosterData();
  }

  private loadCurrentUser() {
    this.currentUser.set(this.authService.getCurrentUser());
  }

  private loadAssignedStaff() {
    const user = this.authService.getCurrentUser();
    const supervisorId = user?._id || user?.id;
    if (supervisorId) {
      this.userService.getUsersBySupervisor(supervisorId).subscribe({
        next: (response) => {
          if (response.success) {
            this.assignedStaff.set(response.users || response.staff || []);
            this.loadRosterData();
          }
        },
        error: (err) => {
          this.error.set('Failed to load assigned staff');
          console.error('Error loading assigned staff:', err);
        }
      });
    }
  }

  private loadRosterData() {
    // For now, initialize with default "WORKING" for all days
    // In a real implementation, this would load from a backend service
    const roster: RosterEntry[] = [];
    const days = this.daysInMonth;
    const staff = this.assignedStaff();

    for (const day of days) {
      for (const staffMember of staff) {
        roster.push({
          date: day.toISOString().split('T')[0],
          staffId: staffMember._id || staffMember.id || '',
          isOffDay: false
        });
      }
    }

    this.rosterData.set(roster);
    this.originalRosterData.set([...roster]);
  }

  get daysInMonth(): Date[] {
    const month = this.currentMonth();
    const year = month.getFullYear();
    const monthIndex = month.getMonth();

    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    const days: Date[] = [];

    for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
      days.push(new Date(date));
    }

    return days;
  }

  isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  }

  isPastDay(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }

  previousMonth() {
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
    this.loadRosterData();
  }

  nextMonth() {
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
    this.loadRosterData();
  }

  getRosterEntry(date: Date, staffId: string): string {
    const dateStr = date.toISOString().split('T')[0];
    const entry = this.rosterData().find(r => r.date === dateStr && r.staffId === staffId);
    if (entry?.isOffDay) return 'OFF';

    return 'WORKING';
  }

  updateRosterEntry(date: Date, staffId: string, event: Event) {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    const dateStr = date.toISOString().split('T')[0];

    const updatedRoster = this.rosterData().map(entry => {
      if (entry.date === dateStr && entry.staffId === staffId) {
        return { ...entry, isOffDay: value === 'OFF' };
      }
      return entry;
    });

    this.rosterData.set(updatedRoster);
  }

  hasChanges(): boolean {
    return JSON.stringify(this.rosterData()) !== JSON.stringify(this.originalRosterData());
  }

  saveRoster() {
    // In a real implementation, this would save to backend
    this.originalRosterData.set([...this.rosterData()]);
    this.successMessage.set('Roster saved successfully');
    setTimeout(() => this.successMessage.set(null), 3000);
  }

  resetRoster() {
    this.rosterData.set([...this.originalRosterData()]);
  }

}
