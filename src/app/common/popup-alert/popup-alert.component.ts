import {
  animate,
  keyframes,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-popup-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './popup-alert.component.html',
  styleUrl: './popup-alert.component.scss',
  animations: [
    trigger('bounceInOutAnimation', [
      transition(':enter', [
        animate(
          '400ms ease-in-out',
          keyframes([
            style({ transform: 'scale(0.5)' }),
            style({ transform: 'scale(1.05)' }),
            style({ transform: 'scale(1)' }),
          ])
        ),
      ]),
      transition(':leave', [
        animate(
          '400ms ease-in-out',
          keyframes([
            style({ transform: 'scale(1)' }),
            style({ transform: 'scale(0.5)' }),
          ])
        ),
      ]),
    ]),
  ],
})
export class PopupAlertComponent {
  public showAlert = input<boolean>();
}
