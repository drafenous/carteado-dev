import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

export type AppLanguage = 'en-US' | 'pt-BR';

type TranslationNode = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly storageKey = 'app-language';
  private readonly fallbackLang: AppLanguage = 'en-US';
  private readonly supported: AppLanguage[] = ['en-US', 'pt-BR'];

  private readonly dictionaries = new Map<AppLanguage, TranslationNode>();
  private readonly loadingPromises = new Map<AppLanguage, Promise<void>>();
  private readonly langSubject = new BehaviorSubject<AppLanguage>(this.fallbackLang);

  constructor(private http: HttpClient) {
    const initial = this.resolveInitialLanguage();
    this.langSubject.next(initial);
    void this.ensureLoaded(this.fallbackLang);
    void this.ensureLoaded(initial);
  }

  public get language$() {
    return this.langSubject.asObservable();
  }

  public get currentLanguage(): AppLanguage {
    return this.langSubject.value;
  }

  public get supportedLanguages(): AppLanguage[] {
    return [...this.supported];
  }

  public async setLanguage(lang: AppLanguage): Promise<void> {
    if (!this.supported.includes(lang)) return;
    await this.ensureLoaded(lang);
    this.langSubject.next(lang);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(this.storageKey, lang);
      }
    } catch {}
  }

  public t(key: string, params?: Record<string, string | number>): string {
    const lang = this.currentLanguage;
    const value =
      this.lookup(lang, key) ??
      this.lookup(this.fallbackLang, key) ??
      key;
    return this.interpolate(value, params);
  }

  private resolveInitialLanguage(): AppLanguage {
    try {
      if (typeof window !== 'undefined') {
        const stored = window.localStorage.getItem(this.storageKey) as AppLanguage | null;
        if (stored && this.supported.includes(stored)) return stored;
      }
    } catch {}

    if (typeof navigator !== 'undefined') {
      const candidates = [navigator.language, ...(navigator.languages || [])].filter(Boolean);
      for (const candidate of candidates) {
        const normalized = String(candidate).toLowerCase();
        if (normalized.startsWith('pt')) return 'pt-BR';
      }
    }
    return this.fallbackLang;
  }

  private async ensureLoaded(lang: AppLanguage): Promise<void> {
    if (this.dictionaries.has(lang)) return;
    const existing = this.loadingPromises.get(lang);
    if (existing) return existing;

    const loadPromise = firstValueFrom(
      this.http.get<TranslationNode>(`/assets/i18n/${lang}.json`)
    )
      .then((dict) => {
        this.dictionaries.set(lang, dict || {});
      })
      .catch(() => {
        this.dictionaries.set(lang, {});
      })
      .finally(() => {
        this.loadingPromises.delete(lang);
      });

    this.loadingPromises.set(lang, loadPromise);
    return loadPromise;
  }

  private lookup(lang: AppLanguage, key: string): string | null {
    if (!this.dictionaries.has(lang)) {
      void this.ensureLoaded(lang);
      return null;
    }
    const dict = this.dictionaries.get(lang)!;
    const parts = key.split('.');
    let cursor: unknown = dict;
    for (const part of parts) {
      if (!cursor || typeof cursor !== 'object') return null;
      cursor = (cursor as TranslationNode)[part];
    }
    return typeof cursor === 'string' ? cursor : null;
  }

  private interpolate(value: string, params?: Record<string, string | number>): string {
    if (!params) return value;
    return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
      const replacement = params[key];
      return replacement == null ? '' : String(replacement);
    });
  }
}
