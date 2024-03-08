import { Component } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEye, faRightToBracket } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-user-actions',
  standalone: true,
  imports: [FontAwesomeModule],
  templateUrl: './user-actions.component.html',
  styleUrl: './user-actions.component.scss',
})
export class UserActionsComponent {
  public ICONS = {
    eye: faEye,
    rightToBracket: faRightToBracket,
  };
}
