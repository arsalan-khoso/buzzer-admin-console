import { Injectable, signal } from '@angular/core';
import { SIDEBAR_COLLAPSED_KEY } from '../constants/storage.constants';

/** Below this width the sidebar starts collapsed, so the page keeps enough room. */
const NARROW_SCREEN_QUERY = '(max-width: 900px)';
const DEFAULT_SEARCH_PLACEHOLDER = 'Search';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly narrowScreen = readMediaQuery(NARROW_SCREEN_QUERY);

  readonly isSidebarCollapsed = signal(this.narrowScreen?.matches || this.readCollapsed());
  readonly searchQuery = signal('');
  /** Pages say what the header search looks in, e.g. "Search by venue". */
  readonly searchPlaceholder = signal(DEFAULT_SEARCH_PLACEHOLDER);

  constructor() {
    // Shrinking the window (or rotating a phone) folds the sidebar away
    this.narrowScreen?.addEventListener('change', (query) => {
      if (query.matches) {
        this.isSidebarCollapsed.set(true);
      }
    });
  }

  toggleSidebar(): void {
    const next = !this.isSidebarCollapsed();
    this.isSidebarCollapsed.set(next);
    // A toggle on a narrow screen is temporary; only the desktop choice is remembered
    if (this.narrowScreen?.matches) {
      return;
    }
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
    } catch {
      // Storage can be unavailable (private mode); the toggle still works for this session
    }
  }

  setSearchQuery(query: string): void {
    this.searchQuery.set(query);
  }

  setSearchPlaceholder(placeholder: string | null): void {
    this.searchPlaceholder.set(placeholder ?? DEFAULT_SEARCH_PLACEHOLDER);
  }

  private readCollapsed(): boolean {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  }
}

function readMediaQuery(query: string): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query)
    : null;
}
