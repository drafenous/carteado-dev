import { CommonModule } from '@angular/common';
import { Component, OnDestroy, effect, EventEmitter, Output, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faChevronDown, faChevronRight, faFileImport, faFileExport, faFloppyDisk, faXmark, faCheck } from '@fortawesome/free-solid-svg-icons';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { CardModel } from '../../core/models/card-model';
import { PopupAlertComponent } from '../../common/popup-alert/popup-alert.component';
import { TooltipComponent } from '../../common/tooltip/tooltip.component';
import { TranslatePipe } from '../../common/i18n/translate.pipe';
import { I18nService } from '../../core/services/i18n.service';
import { LocalStorageService } from '../../core/services/local-storage.service';
import { SelectComponent, SelectOption } from '../../common/select/select.component';
import { FieldReadonlyComponent } from '../../common/field-readonly/field-readonly.component';

const CUSTOM_DECKS_STORAGE_KEY = 'carteado-dev-custom-decks';

@Component({
  selector: 'app-card-selector',
  imports: [CommonModule, FormsModule, FontAwesomeModule, PopupAlertComponent, TooltipComponent, TranslatePipe, SelectComponent, FieldReadonlyComponent],
  templateUrl: './card-selector.component.html',
  styleUrl: './card-selector.component.scss',
})
export class CardSelectorComponent implements OnDestroy {
  isAdmin = input<boolean>(false);
  isSpectator = input<boolean>(false);
  isRevealed = input<boolean>(false);
  roomModel = input<CardModel | null | undefined>(undefined);
  ticketId = input<string>('');
  @Output() cardSelected = new EventEmitter<string>();
  @Output() modelChanged = new EventEmitter<CardModel>();
  @Output() ticketIdChanged = new EventEmitter<string>();

  public ICONS = { chevronDown: faChevronDown, chevronRight: faChevronRight, fileImport: faFileImport, fileExport: faFileExport, floppyDisk: faFloppyDisk, xmark: faXmark, check: faCheck };
  public presets: CardModel[] = [
    {
      id: 'fibonacci',
      name: 'Fibonacci',
      cards: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'],
      cardValues: {
        '?': 0,
        '☕': 0,
      },
      isPreset: true,
    },
    {
      id: 'tshirt',
      name: 'T-Shirt',
      cards: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕'],
      cardValues: {
        XS: 1,
        S: 2,
        M: 3,
        L: 5,
        XL: 8,
        XXL: 13,
        '?': 0,
        '☕': 0,
      },
      isPreset: true,
    },
    {
      id: 'powers_of_two',
      name: 'Powers of Two',
      cards: ['0', '1', '2', '4', '8', '16', '32', '64', '?', '☕'],
      cardValues: {
        '?': 0,
        '☕': 0,
      },
      isPreset: true,
    },
    {
      id: 'linear',
      name: 'Linear 0-10',
      cards: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '?'],
      cardValues: {
        '?': 0,
      },
      isPreset: true,
    },
    {
      id: 'emoji',
      name: 'Emoji Mood',
      cards: ['😀', '🙂', '😐', '😕', '😵', '🔥', '💥', '☕'],
      cardValues: {
        '😀': 1,
        '🙂': 2,
        '😐': 3,
        '😕': 5,
        '😵': 8,
        '🔥': 13,
        '💥': 21,
        '?': 0,
        '☕': 0,
      },
      isPreset: true,
    },
  ];

  public customModels: CardModel[] = [];
  public selectedModelId = 'fibonacci';

  private get storedCustomDecks(): CardModel[] {
    try {
      const raw = this.localStorage.getItem(CUSTOM_DECKS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (m): m is CardModel =>
          m && typeof m === 'object' && typeof m.id === 'string' && typeof m.name === 'string' && Array.isArray(m.cards)
      );
    } catch {
      return [];
    }
  }

  private saveCustomDecksToStorage(): void {
    const toStore = this.customModels.filter((m) => !m.isPreset);
    this.localStorage.setItem(CUSTOM_DECKS_STORAGE_KEY, JSON.stringify(toStore));
  }
  public selectedCardValue: string | null = null;
  public ticketIdDraft = '';

  public newModelName = '';
  public newModelCardsInput = '';
  public importError = '';
  public createError = '';
  public showCreateModel = false;

  public showImportResultPopup = false;
  public importResultSuccess = false;
  public importResultMessage = '';

  public showReplaceConfirmPopup = false;
  private pendingImportModel: CardModel | null = null;
  private ticketIdInput$ = new Subject<string>();
  private ticketIdSub: Subscription;
  private lastSentTicketId = '';

  constructor(
    private i18n: I18nService,
    private localStorage: LocalStorageService
  ) {
    this.customModels = [...this.storedCustomDecks];
    this.ticketIdSub = this.ticketIdInput$
      .pipe(
        debounceTime(350),
        distinctUntilChanged()
      )
      .subscribe((value) => this.emitTicketIdIfChanged(value));

    effect(() => {
      const room = this.roomModel();
      if (room) {
        this.selectedModelId = room.id;
        if (!this.presets.some((p) => p.id === room.id) && !this.customModels.some((c) => c.id === room.id)) {
          this.customModels = [room, ...this.customModels.filter((c) => c.id !== room.id)];
        }
      }
    });
    effect(() => {
      if (!this.isRevealed()) {
        this.selectedCardValue = null;
      }
    });

    effect(() => {
      const incomingTicketId = this.ticketId() ?? '';
      if (incomingTicketId !== this.ticketIdDraft) {
        this.ticketIdDraft = incomingTicketId;
      }
    });
  }

  ngOnDestroy(): void {
    this.ticketIdSub.unsubscribe();
  }

  public get allModels(): CardModel[] {
    const base = [...this.presets, ...this.customModels];
    const room = this.roomModel();
    if (room && !base.some((m) => m.id === room.id)) {
      return [room, ...base];
    }
    return base;
  }

  public get cardDeckOptions(): SelectOption[] {
    return this.allModels.map((m) => ({ value: m.id, label: m.name }));
  }

  public get selectedModel(): CardModel {
    const model = this.allModels.find((item) => item.id === this.selectedModelId);
    return model ?? this.presets[0];
  }

  public get effectiveModel(): CardModel {
    const room = this.roomModel();
    if (room) return room;
    return this.selectedModel;
  }

  private get defaultPresetNames(): string[] {
    return this.presets.map((p) => p.name.toLowerCase());
  }

  private isDefaultName(name: string): boolean {
    return this.defaultPresetNames.includes(name.trim().toLowerCase());
  }

  private applyImportedModel(model: CardModel): void {
    this.customModels = [...this.customModels, model];
    this.selectedModelId = model.id;
    this.saveCustomDecksToStorage();
    if (this.isAdmin()) this.emitCurrentModel();
  }

  private replaceCustomModel(model: CardModel): void {
    this.customModels = this.customModels.map((m) => (m.name.toLowerCase() === model.name.toLowerCase() ? model : m));
    this.selectedModelId = model.id;
    this.saveCustomDecksToStorage();
    if (this.isAdmin()) this.emitCurrentModel();
  }

  public confirmReplaceImport(): void {
    if (this.pendingImportModel) {
      this.replaceCustomModel(this.pendingImportModel);
      this.pendingImportModel = null;
      this.showReplaceConfirmPopup = false;
      this.showImportResultPopup = true;
      this.importResultSuccess = true;
      this.importResultMessage = this.i18n.t('cardSelector.deckReplacedSuccess');
    }
  }

  public cancelReplaceImport(): void {
    this.pendingImportModel = null;
    this.showReplaceConfirmPopup = false;
  }

  public get pendingImportModelName(): string {
    return this.pendingImportModel?.name ?? '';
  }

  public closeImportResultPopup(): void {
    this.showImportResultPopup = false;
  }

  public handleSelectModel(modelId: string): void {
    this.selectedModelId = modelId;
    this.selectedCardValue = null;
    this.importError = '';
    this.createError = '';
    if (this.isAdmin()) this.emitCurrentModel();
  }

  public handleSelectCard(card: string): void {
    if (this.isRevealed()) return;
    this.selectedCardValue = card;
    this.cardSelected.emit(card);
  }

  public getCardTooltipText(card: string): string {
    const model = this.effectiveModel;
    const cardValues = model?.cardValues;
    if (cardValues && cardValues[card] != null) {
      const value = cardValues[card];
      return value === 0 ? `${card} = ${this.i18n.t('cardSelector.ignoredZero')}` : `${card} = ${value}`;
    }
    const n = parseInt(String(card), 10);
    if (!isNaN(n)) {
      return `${card} = ${n}`;
    }
    return `${card}`;
  }

  public handleTicketIdInput(value: string): void {
    this.ticketIdDraft = value;
    this.ticketIdInput$.next(value);
  }

  public commitTicketId(): void {
    const normalized = this.ticketIdDraft.trim();
    this.ticketIdDraft = normalized;
    this.emitTicketIdIfChanged(normalized);
  }

  private emitTicketIdIfChanged(value: string): void {
    const normalized = String(value ?? '').trim();
    if (normalized === this.lastSentTicketId) return;
    this.lastSentTicketId = normalized;
    this.ticketIdChanged.emit(normalized);
  }

  /** Parse card values string: "1, 2, 3, 👍, 👌 = 10, ✌️ = 5". Numbers must use their numeric value. */
  public parseCardValuesInput(input: string): {
    cards: string[];
    cardValues: Record<string, number>;
    error?: string;
  } {
    const cards: string[] = [];
    const cardValues: Record<string, number> = {};
    const parts = input.split(',').map((p) => p.trim()).filter((p) => !!p);
    for (const part of parts) {
      const eqIdx = part.indexOf(' = ');
      const display = eqIdx >= 0 ? part.slice(0, eqIdx).trim() : part.trim();
      if (!display) continue;

      const isNumber = !isNaN(parseInt(display, 10)) && /^\d+$/.test(display.trim());
      if (isNumber) {
        // Number cards: value must be the number itself, ignore "= X"
        const value = parseInt(display, 10);
        cards.push(display);
        cardValues[display] = value;
      } else if (eqIdx >= 0) {
        // String/emoji with "= N": use custom value
        const valueStr = part.slice(eqIdx + 3).trim();
        const value = parseInt(valueStr, 10);
        if (!isNaN(value)) {
          cards.push(display);
          cardValues[display] = value;
        }
      } else {
        // String/emoji without "= N": value 0 (ignored in summary)
        cards.push(display);
        cardValues[display] = 0;
      }
    }

    // Validate: cards (emojis, numbers, strings) cannot repeat
    const uniqueCards = Array.from(new Set(cards));
    if (cards.length !== uniqueCards.length) {
      const seen = new Set<string>();
      const dups = new Set<string>();
      for (const c of cards) {
        if (seen.has(c)) dups.add(c);
        else seen.add(c);
      }
      return {
        cards: uniqueCards,
        cardValues,
        error: this.i18n.t('cardSelector.errorDuplicateCards', { items: [...dups].join(', ') }),
      };
    }

    // Validate: non-zero values cannot repeat
    const valueCounts = new Map<number, string[]>();
    for (const [card, val] of Object.entries(cardValues)) {
      if (val !== 0) {
        const list = valueCounts.get(val) ?? [];
        list.push(card);
        valueCounts.set(val, list);
      }
    }
    for (const [val, list] of valueCounts) {
      if (list.length > 1) {
        return {
          cards: uniqueCards,
          cardValues,
          error: this.i18n.t('cardSelector.errorDuplicateValue', { value: val, items: list.join(', ') }),
        };
      }
    }

    return { cards: uniqueCards, cardValues };
  }

  public get previewCards(): { display: string; value?: number; error?: string }[] {
    const result = this.parseCardValuesInput(this.newModelCardsInput);
    if (result.error) return [{ display: '', error: result.error }];
    return result.cards.map((c) => ({
      display: c,
      value: result.cardValues[c] !== 0 ? result.cardValues[c] : undefined,
    }));
  }

  public get previewParseError(): string | null {
    return this.parseCardValuesInput(this.newModelCardsInput).error ?? null;
  }

  public handleCreateCustomModel(): void {
    const sanitizedName = this.newModelName.trim();
    if (!sanitizedName) {
      this.createError = this.i18n.t('cardSelector.errorDeckNameRequired');
      return;
    }

    const result = this.parseCardValuesInput(this.newModelCardsInput);
    if (result.error) {
      this.createError = result.error;
      return;
    }
    const { cards, cardValues } = result;
    if (cards.length < 2) {
      this.createError = this.i18n.t('cardSelector.errorAtLeastTwoCards');
      return;
    }

    const filteredCardValues = Object.fromEntries(
      Object.entries(cardValues).filter(([, v]) => v > 0)
    );
    const newModel: CardModel = {
      id: `custom_${Date.now()}`,
      name: sanitizedName,
      cards,
      cardValues: Object.keys(filteredCardValues).length > 0 ? filteredCardValues : undefined,
      isPreset: false,
    };

    this.customModels = [...this.customModels, newModel];
    this.selectedModelId = newModel.id;
    this.newModelName = '';
    this.newModelCardsInput = '';
    this.createError = '';
    this.saveCustomDecksToStorage();
    if (this.isAdmin()) this.emitCurrentModel();
  }

  public handleExportCustomModel(): void {
    this.importError = '';
    const selected = this.selectedModel;
    if (selected.isPreset) {
      this.importError = this.i18n.t('cardSelector.errorSelectCustomDeck');
      return;
    }

    const payload = JSON.stringify(
      {
        name: selected.name,
        cards: selected.cards,
        ...(selected.cardValues && Object.keys(selected.cardValues).length > 0 ? { cardValues: selected.cardValues } : {}),
      },
      null,
      2
    );

    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${selected.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  public handleImportModel(event: Event): void {
    this.importError = '';
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = reader.result;
        if (typeof raw !== 'string') throw new Error(this.i18n.t('cardSelector.errorInvalidFile'));

        const parsed = JSON.parse(raw) as Partial<CardModel>;
        const sanitizedName = parsed.name?.trim();
        const sanitizedCards =
          parsed.cards
            ?.filter((card) => typeof card === 'string')
            .map((card) => card.trim())
            .filter((card) => !!card) ?? [];
        const cardValues = parsed.cardValues && typeof parsed.cardValues === 'object' ? parsed.cardValues : undefined;

        if (!sanitizedName) throw new Error(this.i18n.t('cardSelector.errorNameFieldRequired'));
        if (sanitizedCards.length < 2) throw new Error(this.i18n.t('cardSelector.errorCardsFieldMinimum'));

        if (this.isDefaultName(sanitizedName)) {
          this.showImportResultPopup = true;
          this.importResultSuccess = false;
          this.importResultMessage = this.i18n.t('cardSelector.errorDefaultPresetName');
          target.value = '';
          return;
        }

        const uniqueCards = Array.from(new Set(sanitizedCards));
        const importedModel: CardModel = {
          id: `custom_${Date.now()}`,
          name: sanitizedName,
          cards: uniqueCards,
          cardValues,
          isPreset: false,
        };

        const existingByName = this.customModels.find((m) => m.name.toLowerCase() === sanitizedName.toLowerCase());
        if (existingByName) {
          this.pendingImportModel = importedModel;
          this.showReplaceConfirmPopup = true;
          target.value = '';
          return;
        }

        this.applyImportedModel(importedModel);
        this.showImportResultPopup = true;
        this.importResultSuccess = true;
        this.importResultMessage = this.i18n.t('cardSelector.deckImportedSuccess');
      } catch (error) {
        this.showImportResultPopup = true;
        this.importResultSuccess = false;
        this.importResultMessage =
          error instanceof Error ? error.message : this.i18n.t('cardSelector.errorImportFailed');
      } finally {
        target.value = '';
      }
    };

    reader.onerror = () => {
      this.showImportResultPopup = true;
      this.importResultSuccess = false;
      this.importResultMessage = this.i18n.t('cardSelector.errorReadSelectedFile');
      target.value = '';
    };

    reader.readAsText(file);
  }

  private emitCurrentModel(): void {
    this.modelChanged.emit(this.selectedModel);
  }
}

