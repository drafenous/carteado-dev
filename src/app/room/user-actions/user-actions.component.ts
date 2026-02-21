import { Component, OnDestroy } from '@angular/core';
import { RoomStoreService } from '../../core/services/room-store.service';
import { LocalStorageService } from '../../core/services/local-storage.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faMugHot, faRightToBracket, faUserCircle } from '@fortawesome/free-solid-svg-icons';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TooltipComponent } from '../../common/tooltip/tooltip.component';
import { TranslatePipe } from '../../common/i18n/translate.pipe';
import { I18nService } from '../../core/services/i18n.service';

@Component({
    selector: 'app-user-actions',
    imports: [FontAwesomeModule, TooltipComponent, TranslatePipe],
    templateUrl: './user-actions.component.html',
    styleUrl: './user-actions.component.scss'
})
export class UserActionsComponent {
  public ICONS = {
    mugHot: faMugHot,
    rightToBracket: faRightToBracket,
    userCircle: faUserCircle,
  };
  public isAdmin = false;
  public isSpectator = false;
  private sub: Subscription | null = null;
  public notificationMessage: string | null = null;
  private notificationTimer: any = null;
  private prevIsAdmin: boolean | null = null;
  constructor(
    private roomStore: RoomStoreService,
    private localStorage: LocalStorageService,
    private router: Router,
    private i18n: I18nService
  ) {}

  public becomeSpectator(): void {
    const roomId = this.localStorage.getItem('room-id') || '';
    const userId = this.localStorage.getItem('user-id') || '';
    if (!roomId || !userId) return;
    const role = this.isAdmin ? 'admin_spectator' : 'spectator';
    this.roomStore.updateRole(roomId, userId, userId, role);
  }

  public becomeVoter(): void {
    const roomId = this.localStorage.getItem('room-id') || '';
    const userId = this.localStorage.getItem('user-id') || '';
    if (!roomId || !userId) return;
    const role = this.isAdmin ? 'admin' : 'voter';
    this.roomStore.updateRole(roomId, userId, userId, role);
  }

  public leaveRoom(): void {
    const roomId = this.localStorage.getItem('room-id') || '';
    const userId = this.localStorage.getItem('user-id') || '';
    if (!roomId || !userId) return;
    this.roomStore.disconnect(roomId, userId);
    try {
      this.localStorage.removeItem('room-id');
      // keep user-id for possible reuse, but remove if desired:
      // this.localStorage.removeItem('user-id');
    } catch (e) {}
    // navigate back to homepage after leaving
    try {
      if (typeof window !== 'undefined') this.router.navigate(['/']);
    } catch (e) {}
  }
  ngOnInit(): void {
    // watch room state to determine if current user is admin
    this.sub = this.roomStore.roomState$.subscribe((room) => {
      try {
        const userId = this.localStorage.getItem('user-id') || '';
        if (!room || !userId) {
          this.isAdmin = false;
          this.isSpectator = false;
          // emit notification if role changed from admin to non-admin
          if (this.prevIsAdmin === true) this.showNotification(this.i18n.t('userActions.noLongerAdmin'));
          this.prevIsAdmin = this.isAdmin;
          return;
        }
        const current = room.users.find((u) => u.id === userId);
        this.isAdmin = !!current && (current.role === 'admin' || current.role === 'admin_spectator');
        this.isSpectator = !!current && (current.role === 'spectator' || current.role === 'admin_spectator');
        // notify on role change
        if (this.prevIsAdmin === null) {
          // initial assignment, don't notify
        } else if (this.prevIsAdmin !== this.isAdmin) {
          this.showNotification(this.isAdmin ? this.i18n.t('userActions.nowAdmin') : this.i18n.t('userActions.noLongerAdmin'));
        }
        this.prevIsAdmin = this.isAdmin;
      } catch (e) {
        this.isAdmin = false;
      }
    });
  }
  ngOnDestroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
      this.sub = null;
    }
    if (this.notificationTimer) {
      clearTimeout(this.notificationTimer);
      this.notificationTimer = null;
    }
  }

  private showNotification(msg: string) {
    try {
      this.notificationMessage = msg;
      if (this.notificationTimer) {
        clearTimeout(this.notificationTimer);
      }
      this.notificationTimer = setTimeout(() => {
        this.notificationMessage = null;
        this.notificationTimer = null;
      }, 3500);
    } catch (e) {
      // noop
    }
  }
}
