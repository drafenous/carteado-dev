import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-popup-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './popup-alert.component.html',
  styleUrl: './popup-alert.component.scss',
})
export class PopupAlertComponent {
  public showAlert = input<boolean>();
}
