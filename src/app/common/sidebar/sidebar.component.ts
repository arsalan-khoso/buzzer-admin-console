import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LOGIN_ROUTE } from '../../auth/constants/auth.constants';
import { AuthService } from '../../core/auth/services/auth.service';
import { ICONS_PATH, NAV_GROUPS } from '../constants/navigation.constants';
import { LayoutService } from '../services/layout.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  readonly navGroups = NAV_GROUPS;
  readonly iconsPath = ICONS_PATH;

  private readonly layout = inject(LayoutService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly isCollapsed = this.layout.isSidebarCollapsed;
  readonly collapsedGroups = signal(new Set<string>());
  readonly userEmail = computed(() => this.auth.currentUser()?.email ?? '');
  readonly userInitial = computed(() => this.userEmail().charAt(0).toUpperCase());

  toggle(): void {
    this.layout.toggleSidebar();
  }

  toggleGroup(label: string): void {
    const next = new Set(this.collapsedGroups());
    if (next.has(label)) {
      next.delete(label);
    } else {
      next.add(label);
    }
    this.collapsedGroups.set(next);
  }

  isGroupOpen(label: string): boolean {
    return this.isCollapsed() || !this.collapsedGroups().has(label);
  }

  signOut(): void {
    this.auth.logout();
    void this.router.navigate([LOGIN_ROUTE]);
  }
}
