import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ICONS_PATH, NAV_GROUPS } from '../constants/navigation.constants';
import { LayoutService } from '../services/layout.service';

// Shown until the auth task wires GET /api/auth/me into the footer.
const PLACEHOLDER_USER_EMAIL = 'admin@buzzer.dev';

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
  readonly userEmail = PLACEHOLDER_USER_EMAIL;
  readonly userInitial = PLACEHOLDER_USER_EMAIL.charAt(0).toUpperCase();

  private readonly layout = inject(LayoutService);
  readonly isCollapsed = this.layout.isSidebarCollapsed;
  readonly collapsedGroups = signal(new Set<string>());

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
}
