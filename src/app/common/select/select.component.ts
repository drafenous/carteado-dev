import {
  Component,
  ElementRef,
  forwardRef,
  HostListener,
  input,
  signal,
  ViewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { SelectOptionsComponent } from './select-options/select-options.component';

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, SelectOptionsComponent],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
  ],
})
export class SelectComponent implements ControlValueAccessor {
  /** Options: { value, label }[] */
  options = input.required<SelectOption[]>();

  /** Placeholder / empty option label */
  placeholder = input<string>('');

  /** Disabled state */
  disabled = input<boolean>(false);

  /** Input id for label association */
  inputId = input<string>('');

  protected value = signal<string>('');
  protected disabledState = signal<boolean>(false);
  protected isOpen = signal<boolean>(false);
  protected highlightedIndex = signal<number>(-1);

  protected readonly ICONS = { chevronDown: faChevronDown };

  @ViewChild('selectRoot', { static: false }) selectRoot!: ElementRef<HTMLElement>;

  protected onChange: (value: string) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledState.set(isDisabled);
  }

  protected toggleOpen(): void {
    if (this.disabled() || this.disabledState()) return;
    const next = !this.isOpen();
    this.isOpen.set(next);
    if (next) {
      this.highlightedIndex.set(this.value() ? this.getSelectedIndex() : (this.placeholder() ? 0 : -1));
    }
  }

  protected close(): void {
    this.isOpen.set(false);
    this.highlightedIndex.set(-1);
    this.onTouched();
  }

  protected onOptionSelected(val: string): void {
    this.value.set(val);
    this.onChange(val);
    this.close();
  }

  protected onOptionHighlighted(idx: number): void {
    this.highlightedIndex.set(idx);
  }

  protected getDisplayLabel(): string {
    const v = this.value();
    if (!v) return this.placeholder() ?? '';
    const opt = this.options().find((o) => o.value === v);
    return opt?.label ?? v;
  }

  private getSelectedIndex(): number {
    const v = this.value();
    const opts = this.options();
    const idx = opts.findIndex((o) => o.value === v);
    if (idx >= 0) return this.placeholder() ? idx + 1 : idx;
    return -1;
  }

  @HostListener('document:mousedown', ['$event'])
  protected onDocumentClick(event: Event): void {
    const el = this.selectRoot?.nativeElement;
    if (!el?.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (!this.isOpen()) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        this.toggleOpen();
      }
      return;
    }

    const opts = this.options();
    const placeholder = this.placeholder();
    const startIdx = placeholder ? 0 : -1;
    const maxIdx = (placeholder ? 1 : 0) + opts.length - 1;
    let next = this.highlightedIndex();

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      next = next < maxIdx ? next + 1 : startIdx;
      this.highlightedIndex.set(next);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      next = next <= startIdx ? maxIdx : next - 1;
      this.highlightedIndex.set(next);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (next >= 0) {
        if (placeholder && next === 0) this.onOptionSelected('');
        else this.onOptionSelected(opts[placeholder ? next - 1 : next].value);
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }
}
