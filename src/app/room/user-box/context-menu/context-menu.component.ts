import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
  ViewChild,
  input,
} from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faCheck,
  faExclamationTriangle,
  faHandshakeSimple,
  faMugHot,
  faRightToBracket,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { BehaviorSubject, Observable } from 'rxjs';
import { PopupAlertComponent } from '../../../common/popup-alert/popup-alert.component';
import { User } from '../../../core/models/user';
import { RoomStoreService } from '../../../core/services/room-store.service';
import { LocalStorageService } from '../../../core/services/local-storage.service';
import { TranslatePipe } from '../../../common/i18n/translate.pipe';

@Component({
    selector: 'app-context-menu',
    imports: [CommonModule, FontAwesomeModule, PopupAlertComponent, TranslatePipe],
    templateUrl: './context-menu.component.html',
    styleUrl: './context-menu.component.scss'
})
export class ContextMenuComponent {
  public ICONS = {
    mugHot: faMugHot,
    rightToBracket: faRightToBracket,
    handshake: faHandshakeSimple,
    exclamation: faExclamationTriangle,
    xmark: faXmark,
    check: faCheck,
  };

  public user = input.required<User>();
  public isShown = input.required<boolean>();

  private _showAdminAlert$ = new BehaviorSubject<boolean>(false);

  public set showAdminAlert(show: boolean) {
    this._showAdminAlert$.next(show);
  }

  public get showAdminAlert$(): Observable<boolean> {
    return this._showAdminAlert$.asObservable();
  }

  @Output() closeContextMenu = new EventEmitter<void>();
  @Output() kickUserEvent = new EventEmitter<string>();

  @ViewChild('ContextMenu', { static: false }) contextMenu!: ElementRef;
  @ViewChild('PopupAlert', { static: false }) popupAlert!: ElementRef;

  @HostListener('document:mousedown', ['$event']) handleCloseShowOptions(
    event: Event
  ): void {
    const isMenu = this.contextMenu?.nativeElement?.contains(event?.target);
    if (isMenu) {
      return;
    }
    this.closeContextMenu.emit();
  }

  constructor(private roomStore: RoomStoreService, private localStorage: LocalStorageService) {}

  public handleToggleVotter(_event: Event, canVote: boolean): void {
    this.closeContextMenu.emit();
    const roomId = localStorage.getItem('room-id') || '';
    const userId = localStorage.getItem('user-id') || '';
    if (!roomId || !userId) return;
    const target = String(this.user().id);
    const u = this.user();
    const role = canVote
      ? (u.role === 'admin_spectator' ? 'admin' : 'voter')
      : (u.role === 'admin' ? 'admin_spectator' : 'spectator');
    this.roomStore.updateRole(roomId, userId, target, role);
  }

  public handleTurnAdmin(_event: Event, _user?: User): void {
    this.closeContextMenu.emit();
    this.showAdminAlert = true;
  }

  public handleCancelTurnAdmin(_event: Event): void {
    this.showAdminAlert = false;
  }

  public handleConfirmTurnAdmin(_event: Event): void {
    this.showAdminAlert = false;
    const roomId = this.localStorage.getItem('room-id') || '';
    const userId = this.localStorage.getItem('user-id') || '';
    if (!roomId || !userId) return;
    // transfer admin to this.user().id
    this.roomStore.updateRole(roomId, userId, String(this.user().id), 'admin');
  }

  public handleKick(_event: Event, kickedUserId: string): void {
    this.closeContextMenu.emit();
    this.kickUserEvent.emit(kickedUserId);
  }
}
