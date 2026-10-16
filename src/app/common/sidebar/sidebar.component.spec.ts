import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NAV_GROUPS } from '../constants/navigation.constants';
import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should render every navigation group', async () => {
    const fixture = TestBed.createComponent(SidebarComponent);
    await fixture.whenStable();
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.sidebar__group-label'),
    ).map((el) => el.textContent?.trim());
    expect(labels).toEqual(NAV_GROUPS.map((group) => group.label));
  });

  it('should collapse when the toggle is clicked', async () => {
    const fixture = TestBed.createComponent(SidebarComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.sidebar__toggle')?.click();
    await fixture.whenStable();

    expect(element.querySelector('.sidebar--collapsed')).toBeTruthy();
    expect(element.querySelector('.sidebar__group-label')).toBeNull();
  });
});
