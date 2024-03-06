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
  faEllipsisVertical,
  faExclamationCircle,
  faExclamationTriangle,
  faHandshakeSimple,
  faMugHot,
  faRightToBracket,
  faUserCircle,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { BehaviorSubject, Observable } from 'rxjs';
import { PopupAlertComponent } from '../../common/popup-alert/popup-alert.component';

@Component({
  selector: 'app-user-box',
  standalone: true,
  imports: [FontAwesomeModule, CommonModule, PopupAlertComponent],
  templateUrl: './user-box.component.html',
  styleUrl: './user-box.component.scss',
})
export class UserBoxComponent {
  public ICONS = {
    userCircle: faUserCircle,
    options: faEllipsisVertical,
    mugHot: faMugHot,
    rightToBracket: faRightToBracket,
    handshake: faHandshakeSimple,
    exclamation: faExclamationTriangle,
    xmark: faXmark,
    check: faCheck,
  };
  user = input<string>();
  private _isVotter$ = new BehaviorSubject<boolean>(true);
  private _showOptions$ = new BehaviorSubject<boolean>(false);
  private _showAdminAlert$ = new BehaviorSubject<boolean>(false);
  @Output() kickUserEvent = new EventEmitter<string>();
  @ViewChild('OptionsMenu', { static: false }) optionsMenu!: ElementRef;

  @HostListener('document:mousedown', ['$event']) handleCloseShowOptions(
    event: Event
  ): void {
    const isMenu = this.optionsMenu?.nativeElement?.contains(event?.target);
    if (isMenu) {
      return;
    }
    this.showOptions = false;
  }

  constructor() {}

  private set isVotter(canVote: boolean) {
    this._isVotter$.next(canVote);
  }

  public get isVotter$(): Observable<boolean> {
    return this._isVotter$.asObservable();
  }

  private set showOptions(show: boolean) {
    this._showOptions$.next(show);
  }

  public get showOptions$(): Observable<boolean> {
    return this._showOptions$.asObservable();
  }

  public set showAdminAlert(show: boolean) {
    this._showAdminAlert$.next(show);
  }

  public get showAdminAlert$(): Observable<boolean> {
    return this._showAdminAlert$.asObservable();
  }

  public handleToggleVotter(_event: Event, canVote: boolean): void {
    this.showOptions = false;
    this.isVotter = canVote;
  }

  public handleToggleShowOptions(_event: Event): void {
    this.showOptions = !this._showOptions$.getValue();
  }

  public handleKick(_event: Event, kickedUser?: string): void {
    if (!kickedUser) return;
    this.showOptions = false;
    this.kickUserEvent.emit(kickedUser);
  }

  public handleTurnAdmin(_event: Event, _user?: string): void {
    this.showOptions = false;
    this.showAdminAlert = true;
  }

  public handleCancelTurnAdmin(_event: Event): void {
    this.showAdminAlert = false;
  }

  public handleConfirmTurnAdmin(_event: Event): void {
    this.showAdminAlert = false;
  }
}
