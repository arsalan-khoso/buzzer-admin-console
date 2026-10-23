import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { ICONS_PATH } from '../../constants/navigation.constants';
import { LayoutService } from '../../services/layout.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  readonly iconsPath = ICONS_PATH;

  private readonly router = inject(Router);
  private readonly layout = inject(LayoutService);

  readonly searchQuery = this.layout.searchQuery;
  readonly searchPlaceholder = this.layout.searchPlaceholder;

  readonly title = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.readTitle(this.router.routerState.snapshot.root)),
    ),
    { initialValue: this.readTitle(this.router.routerState.snapshot.root) },
  );

  onSearch(event: Event): void {
    this.layout.setSearchQuery((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.layout.setSearchQuery('');
  }

  private readTitle(route: ActivatedRouteSnapshot): string {
    let current = route;
    while (current.firstChild) {
      current = current.firstChild;
    }
    return current.title ?? '';
  }
}
