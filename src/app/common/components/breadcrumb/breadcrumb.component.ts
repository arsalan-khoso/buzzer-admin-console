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
          <a class="breadcrumb__item" [routerLink]="item.link">{{ item.label }}</a>
        } @else {
          <span class="breadcrumb__item breadcrumb__item--current" aria-current="page">
            {{ item.label }}
          </span>
        }
      }
    </nav>
  `,
  // Segmented look from the Figma breadcrumb: joined chips, the current page highlighted
  styles: `
    .breadcrumb {
      display: inline-flex;
      flex-wrap: wrap;
      align-self: flex-start;
      overflow: hidden;
      border-radius: var(--radius-md);
      background-color: var(--color-surface-3);
    }

    .breadcrumb__item {
      padding: var(--space-1) var(--space-3);
      font-size: var(--font-size-xs);
      line-height: 20px;

      &:hover:not(.breadcrumb__item--current) {
        background-color: var(--color-gray);
      }
    }

    .breadcrumb__item--current {
      background-color: var(--color-gray);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbComponent {
  readonly items = input.required<BreadcrumbItem[]>();
}
