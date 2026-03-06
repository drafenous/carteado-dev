import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import type { SelectOption } from '../select.component';

@Component({
  selector: 'app-select-options',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './select-options.component.html',
  styleUrl: './select-options.component.scss',
})
export class SelectOptionsComponent {
  options = input.required<SelectOption[]>();
  selectedValue = input<string>('');
  placeholder = input<string>('');
  highlightedIndex = input<number>(-1);

  optionSelected = output<string>();
  optionHighlighted = output<number>();

  protected readonly ICONS = { check: faCheck };

  protected selectOption(value: string): void {
    this.optionSelected.emit(value);
  }

  protected highlightOption(index: number): void {
    this.optionHighlighted.emit(index);
  }
}
