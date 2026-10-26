import { Injectable, signal } from '@angular/core';

export interface Notice {
  /** Changes on every notice, so the same message shown twice still restarts its timer. */
  id: number;
  message: string;
}

/** How long a notice stays before it hides itself. */
export const NOTICE_DURATION_MS = 6000;

/** One app-wide message at the bottom of the screen, e.g. for a 403 or 429 from any request. */
@Injectable({ providedIn: 'root' })
export class NoticeService {
  readonly notice = signal<Notice | null>(null);
  private nextId = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;

  show(message: string): void {
    clearTimeout(this.timer);
    this.notice.set({ id: ++this.nextId, message });
    this.timer = setTimeout(() => this.dismiss(), NOTICE_DURATION_MS);
  }

  dismiss(): void {
    clearTimeout(this.timer);
    this.notice.set(null);
  }
}
