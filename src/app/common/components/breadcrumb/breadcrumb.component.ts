import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  /** Router link; the last item (current page) has none. */
  link?: string[];
}

@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink],
  template: `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      @for (item of items(); track $index; let last = $last) {
        @if (item.link && !last) {
          <a class="chip breadcrumb__link" [routerLink]="item.link">{{ item.label }}</a>
        } @else {
          <span class="chip breadcrumb__current" aria-current="page">{{ item.label }}</span>
        }
      }
    </nav>
  `,
  styles: `
    .breadcrumb {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1);
    }

    .breadcrumb__link {
      background-color: transparent;
      color: var(--color-text-muted);

      &:hover {
        color: var(--color-text);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbComponent {
  readonly items = input.required<BreadcrumbItem[]>();
}
