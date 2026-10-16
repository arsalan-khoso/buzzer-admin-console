import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
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
  readonly isCollapsed = this.layout.isSidebarCollapsed;

  toggle(): void {
    this.layout.toggleSidebar();
  }
}
