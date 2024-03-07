import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, input } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faEllipsisVertical,
  faUserCircle,
} from '@fortawesome/free-solid-svg-icons';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../../core/models/user';
import { ContextMenuComponent } from './context-menu/context-menu.component';

@Component({
  selector: 'app-user-box',
  standalone: true,
  imports: [FontAwesomeModule, CommonModule, ContextMenuComponent],
  templateUrl: './user-box.component.html',
  styleUrl: './user-box.component.scss',
})
export class UserBoxComponent {
  public ICONS = {
    userCircle: faUserCircle,
    options: faEllipsisVertical,
  };
  user = input.required<User>();
  private _showContextMenu$ = new BehaviorSubject<boolean>(false);
  @Output() kickUserEvent = new EventEmitter<number>();

  constructor() {}

  private set showContextMenu(show: boolean) {
    this._showContextMenu$.next(show);
  }

  public get showContextMenu$(): Observable<boolean> {
    return this._showContextMenu$.asObservable();
  }

  public handleToggleShowOptions(forcedValue?: boolean): void {
    if (forcedValue !== undefined) {
      this.showContextMenu = forcedValue;
      return;
    }
    this.showContextMenu = !this._showContextMenu$.getValue();
  }

  public handleKick(kickedUserId?: number): void {
    if (!kickedUserId) return;
    this.showContextMenu = false;
    this.kickUserEvent.emit(kickedUserId);
  }
}
