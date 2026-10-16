import { Injectable, signal } from '@angular/core';
import { SIDEBAR_COLLAPSED_KEY } from '../constants/storage.constants';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly isSidebarCollapsed = signal(this.readCollapsed());
  readonly searchQuery = signal('');

  toggleSidebar(): void {
    const next = !this.isSidebarCollapsed();
    this.isSidebarCollapsed.set(next);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
    } catch {
      // Storage can be unavailable (private mode); the toggle still works for this session
    }
  }

  setSearchQuery(query: string): void {
    this.searchQuery.set(query);
  }

  private readCollapsed(): boolean {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  }
}
