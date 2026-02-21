import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, input } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faEllipsisVertical,
  faCheck,
  faMugHot,
  faUserCircle,
} from '@fortawesome/free-solid-svg-icons';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../../core/models/user';
import { ContextMenuComponent } from './context-menu/context-menu.component';
import { TooltipComponent } from '../../common/tooltip/tooltip.component';

@Component({
    selector: 'app-user-box',
    imports: [FontAwesomeModule, CommonModule, ContextMenuComponent, TooltipComponent],
    templateUrl: './user-box.component.html',
    styleUrl: './user-box.component.scss'
})
export class UserBoxComponent {
  public ICONS = {
    userCircle: faUserCircle,
    spectator: faMugHot,
    options: faEllipsisVertical,
    voted: faCheck,
  };
  user = input.required<User>();
  isAdmin = input<boolean>(false);
  hasVoted = input<boolean>(false);
  private _showContextMenu$ = new BehaviorSubject<boolean>(false);
  @Output() kickUserEvent = new EventEmitter<string>();

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

  public handleKick(kickedUserId?: string): void {
    if (!kickedUserId) return;
    this.showContextMenu = false;
    this.kickUserEvent.emit(kickedUserId);
  }

  public displayRole(): string {
    const u = this.user();
    if (u.teamRole === 'other' && u.teamRoleCustom?.trim()) return u.teamRoleCustom.trim();
    const labels: Record<string, string> = {
      frontend: 'Frontend',
      backend: 'Backend',
      staff: 'Staff',
      engineer: 'Engineer',
      qa: 'QA',
      fullstack: 'Fullstack',
    };
    return u.teamRole ? labels[u.teamRole] ?? u.teamRole : '';
  }

  public isSpectator(): boolean {
    const role = this.user().role;
    return role === 'spectator' || role === 'admin_spectator';
  }
}
