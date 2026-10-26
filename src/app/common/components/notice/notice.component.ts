import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ICONS_PATH } from '../../constants/navigation.constants';
import { NoticeService } from '../../services/notice.service';

/** The app-wide notice, e.g. "not allowed" or "too many requests". */
@Component({
  selector: 'app-notice',
  template: `
    @if (notice(); as current) {
      <div class="notice" role="alert" aria-live="assertive">
        <span class="notice__text">{{ current.message }}</span>
        <button type="button" class="notice__close" (click)="dismiss()" aria-label="Dismiss">
          <img
            [src]="iconsPath + '/ic_close.svg'"
            width="16"
            height="16"
            alt=""
            aria-hidden="true"
          />
        </button>
      </div>
    }
  `,
  styles: `
    .notice {
      position: fixed;
      bottom: var(--space-6);
      left: 50%;
      z-index: 200;
      display: flex;
      align-items: center;
      gap: var(--space-3);
      max-width: min(560px, calc(100vw - 2 * var(--space-4)));
      padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4);
      border: 1px solid rgba(236, 25, 60, 0.5);
      border-radius: var(--radius-md);
      background-color: var(--color-surface-2);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      font-size: var(--font-size-sm);
      transform: translateX(-50%);
    }

    .notice__text {
      flex: 1;
    }

    .notice__close {
      display: inline-flex;
      padding: var(--space-1);
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      cursor: pointer;

      &:hover {
        background-color: var(--color-surface-3);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoticeComponent {
  private readonly notices = inject(NoticeService);

  readonly iconsPath = ICONS_PATH;
  readonly notice = this.notices.notice;

  dismiss(): void {
    this.notices.dismiss();
  }
}
