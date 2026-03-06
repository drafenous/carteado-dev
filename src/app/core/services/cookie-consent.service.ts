import { Inject, Injectable, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Subscription } from 'rxjs';
import { filter, skip } from 'rxjs/operators';
import * as CookieConsent from 'vanilla-cookieconsent';
import { I18nService } from './i18n.service';

type AppLanguage = 'en-US' | 'pt-BR';
type CCLang = 'en' | 'pt';

function appLangToCcLang(appLang: AppLanguage): CCLang {
  return appLang === 'pt-BR' ? 'pt' : 'en';
}

/* Inline SVG icons for cookie consent buttons (mirrors Font Awesome style, no Angular/FA in modal) */
const CC_ICONS = {
  acceptAll: `<span class="cc-btn-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor" width="1em" height="1em"><path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/></svg></span>`,
  acceptNecessary: `<span class="cc-btn-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" width="1em" height="1em"><path d="M256 0c4.6 0 9.2 1 13.4 2.9L457.7 82.8c22 9.3 38.4 31 38.4 57.2v95.3c0 26.2-16.4 47.9-38.4 57.2L269.4 309.1c-4.2 1.9-8.8 1.9-13.4 0L54.3 235.2C32.4 225.9 16 204.2 16 178v-38.2c0-26.2 16.4-47.9 38.4-57.2L242.6 2.9C246.8 1 251.4 0 256 0z"/></svg></span>`,
  preferences: `<span class="cc-btn-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" width="1em" height="1em"><path d="M78.6 5C69.1-2.4 55.6-1.5 47 7L7 47c-8.5 8.5-9.4 22-2.1 31.6l80 104C73.1 199.1 64 225.2 64 256s9.1 56.9 21.9 73.4l-80 104c-7.2 9.6-6.3 23.1 2.1 31.6l40 40c8.5 8.5 22 9.4 31.6 2.1l104-80C267.1 438.9 293.2 448 324 448s56.9-9.1 73.4-21.9l104 80c9.6 7.2 23.1 6.3 31.6-2.1l40-40c8.5-8.5 9.4-22 2.1-31.6l-80-104C438.9 312.9 448 286.8 448 256s-9.1-56.9-21.9-73.4l80-104c7.2-9.6 6.3-23.1-2.1-31.6l-40-40c-8.5-8.5-22-9.4-31.6-2.1l-104 80C244.9 73.1 218.8 64 188 64s-56.9 9.1-73.4 21.9L10.6 6C1.1-1.4-12.4-.5-21 7l-4 4zM324 136a88 88 0 1 1 0 176 88 88 0 1 1 0-176z"/></svg></span>`,
  save: `<span class="cc-btn-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor" width="1em" height="1em"><path d="M0 64C0 28.7 28.7 0 64 0H224V128c0 17.7 14.3 32 32 32H384V288H216c-13.3 0-24 10.7-24 24s10.7 24 24 24H384V448H64c-35.3 0-64-28.7-64-64V64zm384 64H256V0H384V128z"/></svg></span>`,
};

interface CookieConsentI18n {
  consentModal: {
    title: string;
    description: string;
    acceptAllBtn: string;
    acceptNecessaryBtn: string;
    showPreferencesBtn: string;
    closeIconLabel: string;
  };
  preferencesModal: {
    title: string;
    acceptAllBtn: string;
    acceptNecessaryBtn: string;
    savePreferencesBtn: string;
    closeIconLabel: string;
  };
  sections: {
    necessary: { title: string; description: string };
    analytics: { title: string; description: string };
  };
}

@Injectable({ providedIn: 'root' })
export class CookieConsentService implements OnDestroy {
  private initialized = false;
  private languageSub?: Subscription;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient,
    private i18n: I18nService
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.languageSub = this.i18n.language$
        .pipe(skip(1), filter(() => this.initialized))
        .subscribe((appLang) => {
          const ccLang = appLangToCcLang(appLang);
          void CookieConsent.setLanguage(ccLang, true);
        });
    }
  }

  ngOnDestroy(): void {
    this.languageSub?.unsubscribe();
  }

  async init(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || this.initialized) return;

    const appLang = this.i18n.currentLanguage;
    const ccDefault: CCLang = appLang === 'pt-BR' ? 'pt' : 'en';

    let enData: CookieConsentI18n;
    let ptData: CookieConsentI18n;
    try {
      [enData, ptData] = await Promise.all([
        firstValueFrom(this.http.get<{ cookieConsent: CookieConsentI18n }>('/assets/i18n/en-US.json')).then((r) => r.cookieConsent),
        firstValueFrom(this.http.get<{ cookieConsent: CookieConsentI18n }>('/assets/i18n/pt-BR.json')).then((r) => r.cookieConsent),
      ]);
    } catch {
      return;
    }

    const buildTranslation = (data: CookieConsentI18n) => ({
      consentModal: {
        title: data.consentModal.title,
        description: data.consentModal.description,
        acceptAllBtn: CC_ICONS.acceptAll + ' ' + data.consentModal.acceptAllBtn,
        acceptNecessaryBtn: CC_ICONS.acceptNecessary + ' ' + data.consentModal.acceptNecessaryBtn,
        showPreferencesBtn: CC_ICONS.preferences + ' ' + data.consentModal.showPreferencesBtn,
        closeIconLabel: data.consentModal.closeIconLabel,
      },
      preferencesModal: {
        title: data.preferencesModal.title,
        acceptAllBtn: CC_ICONS.acceptAll + ' ' + data.preferencesModal.acceptAllBtn,
        acceptNecessaryBtn: CC_ICONS.acceptNecessary + ' ' + data.preferencesModal.acceptNecessaryBtn,
        savePreferencesBtn: CC_ICONS.save + ' ' + data.preferencesModal.savePreferencesBtn,
        closeIconLabel: data.preferencesModal.closeIconLabel,
        sections: [
          {
            title: data.sections.necessary.title,
            description: data.sections.necessary.description,
            linkedCategory: 'necessary',
          },
          {
            title: data.sections.analytics.title,
            description: data.sections.analytics.description,
            linkedCategory: 'analytics',
          },
        ],
      },
    });

    await CookieConsent.run({
      mode: 'opt-in',
      categories: {
        necessary: { readOnly: true },
        analytics: { enabled: false },
      },
      language: {
        default: ccDefault,
        translations: {
          en: buildTranslation(enData),
          pt: buildTranslation(ptData),
        },
      },
      guiOptions: {
        consentModal: {
          layout: 'box',
          position: 'bottom right',
          equalWeightButtons: true,
        },
        preferencesModal: {
          layout: 'box',
          position: 'right',
          equalWeightButtons: true,
        },
      },
      cookie: {
        name: 'carteado_dev_cc',
        path: '/',
        useLocalStorage: true,
      },
    });

    this.initialized = true;
  }
}
