import { Component, signal, computed, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { User, ActingAssignment } from './models';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('BathroomTosh');
  
  currentUser = signal<User | null>(null);
  activeActingAssignment = signal<ActingAssignment | null>(null);
  isLoginPage = signal(false);
  showUserMenu = signal(false);
  remainingTimeSignal = signal('');
  
  effectiveRoleDisplay = computed(() => {
    const acting = this.activeActingAssignment();
    const user = this.currentUser();
    
    if (!user) return 'Not Logged In';
    
    if (acting && acting.status === 'ACTIVE') {
      return `${user.baseRole} (Acting as ${acting.permissionsGranted})`;
    }
    
    return user.baseRole;
  });

  isActingRoleActive = computed(() => {
    const acting = this.activeActingAssignment();
    return acting && acting.status === 'ACTIVE';
  });

  permissions = computed(() => this.authService.getEffectivePermissions());

  canManageSystemConfig = computed(() => this.permissions().canManageSystemConfig);
  canApproveLeave = computed(() => this.permissions().canApproveLeave);
  canInitiateActingRole = computed(() => this.permissions().canInitiateActingRole);
  canManageRoster = computed(() => this.permissions().canManageRoster);
  canAssignTasks = computed(() => this.permissions().canAssignTasks);
  canViewAllStaffTasks = computed(() => this.permissions().canViewAllStaffTasks);
  canExecuteTasks = computed(() => this.permissions().canExecuteTasks);
  canAddNotes = computed(() => this.permissions().canAddNotes);

  remainingTime = () => this.remainingTimeSignal();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    // Subscribe to auth state changes
    this.authService.getCurrentUser$().subscribe(user => {
      this.currentUser.set(user);
    });

    this.authService.getActiveActingAssignment$().subscribe(assignment => {
      this.activeActingAssignment.set(assignment);
    });

    // Detect current route to hide navbar on login
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd | any) => {
        this.isLoginPage.set(event.url === '/login');
        this.showUserMenu.set(false);
      });

    // Update remaining time every second
    setInterval(() => {
      const acting = this.activeActingAssignment();
      if (acting && acting.status === 'ACTIVE') {
        const now = new Date();
        const remaining = acting.endTime.getTime() - now.getTime();
        
        if (remaining > 0) {
          const minutes = Math.floor(remaining / 60000);
          const seconds = Math.floor((remaining % 60000) / 1000);
          this.remainingTimeSignal.set(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        } else {
          this.remainingTimeSignal.set('Expired');
        }
      }
    }, 1000);
  }

  toggleUserMenu(): void {
    this.showUserMenu.update(val => !val);
  }

  logout(): void {
    this.authService.logout();
    this.showUserMenu.set(false);
    this.router.navigate(['/login']);
  }
}
