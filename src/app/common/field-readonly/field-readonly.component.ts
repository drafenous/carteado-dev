import { Component, input } from '@angular/core';

@Component({
  selector: 'app-field-readonly',
  standalone: true,
  templateUrl: './field-readonly.component.html',
  styleUrl: './field-readonly.component.scss',
})
export class FieldReadonlyComponent {
  /** Display value. Empty string shows placeholder. */
  value = input<string>('');

  /** Placeholder when value is empty (e.g. "-") */
  placeholder = input<string>('-');
}
