import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCircleInfo, faHome, faXmark, faCheck, faSun, faMoon, faDesktop, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { PopupAlertComponent } from '../popup-alert/popup-alert.component';

type ThemePreference = 'light' | 'dark' | 'system';

@Component({
    selector: 'app-header',
    imports: [FontAwesomeModule, PopupAlertComponent],
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit, OnDestroy {
  public ICONS = {
    home: faHome,
    about: faCircleInfo,
    xmark: faXmark,
    check: faCheck,
    sun: faSun,
    moon: faMoon,
    system: faDesktop,
    chevronDown: faChevronDown,
  };
  public showLeaveConfirm = false;
  public showThemeMenu = false;
  public themePreference: ThemePreference = 'system';
  private pendingNavigateTo: string[] = [];
  private mediaQuery?: MediaQueryList;
  private readonly themeStorageKey = 'theme-preference';
  private readonly mediaChangeHandler = () => {
    if (this.themePreference === 'system') {
      this.applyThemeToDocument();
    }
  };

  constructor(private router: Router) {}

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.mediaQuery.addEventListener?.('change', this.mediaChangeHandler);
      this.mediaQuery.addListener?.(this.mediaChangeHandler);
    }
    this.initializeTheme();
  }

  ngOnDestroy(): void {
    this.mediaQuery?.removeEventListener?.('change', this.mediaChangeHandler);
    this.mediaQuery?.removeListener?.(this.mediaChangeHandler);
  }

  get isInRoom(): boolean {
    return this.router.url.includes('/room/');
  }

  public handleNavClick(route: string[]): void {
    if (this.isInRoom) {
      this.pendingNavigateTo = route;
      this.showLeaveConfirm = true;
    } else {
      this.router.navigate(route);
    }
  }

  public confirmLeave(): void {
    this.showLeaveConfirm = false;
    const target = this.pendingNavigateTo;
    this.pendingNavigateTo = [];
    if (target.length > 0) {
      this.router.navigate(target);
    }
  }

  public cancelLeave(): void {
    this.showLeaveConfirm = false;
    this.pendingNavigateTo = [];
  }

  public toggleThemeMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.showThemeMenu = !this.showThemeMenu;
  }

  public setThemePreference(preference: ThemePreference): void {
    this.themePreference = preference;
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(this.themeStorageKey, preference);
      }
    } catch {}
    this.applyThemeToDocument();
    this.showThemeMenu = false;
  }

  public isThemePreference(preference: ThemePreference): boolean {
    return this.themePreference === preference;
  }

  public currentThemeIcon() {
    if (this.themePreference === 'light') return this.ICONS.sun;
    if (this.themePreference === 'dark') return this.ICONS.moon;
    return this.ICONS.system;
  }

  private initializeTheme(): void {
    let stored: ThemePreference = 'system';
    try {
      if (typeof window !== 'undefined') {
        const value = window.localStorage.getItem(this.themeStorageKey) as ThemePreference | null;
        if (value === 'light' || value === 'dark' || value === 'system') stored = value;
      }
    } catch {}
    this.themePreference = stored;
    this.applyThemeToDocument();
  }

  private resolveTheme(): 'light' | 'dark' {
    if (this.themePreference === 'light') return 'light';
    if (this.themePreference === 'dark') return 'dark';
    const prefersDark = !!this.mediaQuery?.matches;
    return prefersDark ? 'dark' : 'light';
  }

  private applyThemeToDocument(): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme-setting', this.themePreference);
    root.setAttribute('data-theme', this.resolveTheme());
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.theme-menu-root')) {
      this.showThemeMenu = false;
    }
  }
}
