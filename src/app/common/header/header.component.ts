import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCircleInfo, faHome, faXmark, faCheck, faSun, faMoon, faDesktop, faChevronDown, faLanguage, faBars } from '@fortawesome/free-solid-svg-icons';
import { PopupAlertComponent } from '../popup-alert/popup-alert.component';
import { TranslatePipe } from '../i18n/translate.pipe';
import { AppLanguage, I18nService } from '../../core/services/i18n.service';

type ThemePreference = 'light' | 'dark' | 'system';

@Component({
    selector: 'app-header',
    imports: [FontAwesomeModule, PopupAlertComponent, TranslatePipe],
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
    language: faLanguage,
    bars: faBars,
  };
  public showLeaveConfirm = false;
  public showThemeMenu = false;
  public showLangMenu = false;
  public showMobileMenu = false;
  public themePreference: ThemePreference = 'system';
  public language: AppLanguage = 'en-US';
  public readonly supportedLanguages: AppLanguage[] = ['en-US', 'pt-BR'];
  private pendingNavigateTo: string[] = [];
  private mediaQuery?: MediaQueryList;
  private readonly themeStorageKey = 'theme-preference';
  private readonly mediaChangeHandler = () => {
    if (this.themePreference === 'system') {
      this.applyThemeToDocument();
    }
  };

  constructor(private router: Router, public i18n: I18nService) {}

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.mediaQuery.addEventListener?.('change', this.mediaChangeHandler);
      this.mediaQuery.addListener?.(this.mediaChangeHandler);
    }
    this.initializeTheme();
    this.language = this.i18n.currentLanguage;
    this.i18n.language$.subscribe((lang) => {
      this.language = lang;
    });
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
    this.showLangMenu = false;
    this.showThemeMenu = !this.showThemeMenu;
  }

  public toggleLangMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.showThemeMenu = false;
    this.showLangMenu = !this.showLangMenu;
  }

  public toggleMobileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.showMobileMenu = !this.showMobileMenu;
    if (this.showMobileMenu) {
      this.showLangMenu = false;
      this.showThemeMenu = false;
    }
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

  public async setLanguage(lang: AppLanguage): Promise<void> {
    await this.i18n.setLanguage(lang);
    this.showLangMenu = false;
  }

  public isLanguage(lang: AppLanguage): boolean {
    return this.language === lang;
  }

  public languageLabel(lang: AppLanguage): string {
    return lang === 'pt-BR' ? 'PT-BR' : 'EN-US';
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
    if (!target?.closest('.theme-menu-root') && !target?.closest('.lang-menu-root') && !target?.closest('.mobile-menu-root')) {
      this.showThemeMenu = false;
      this.showLangMenu = false;
      this.showMobileMenu = false;
    }
  }
}
