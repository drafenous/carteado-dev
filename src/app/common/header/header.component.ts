import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCircleInfo, faHome, faXmark, faCheck } from '@fortawesome/free-solid-svg-icons';
import { PopupAlertComponent } from '../popup-alert/popup-alert.component';
import { TooltipComponent } from '../tooltip/tooltip.component';

@Component({
    selector: 'app-header',
    imports: [FontAwesomeModule, PopupAlertComponent, TooltipComponent],
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss'
})
export class HeaderComponent {
  public ICONS = {
    home: faHome,
    about: faCircleInfo,
    xmark: faXmark,
    check: faCheck,
  };
  public showLeaveConfirm = false;
  private pendingNavigateTo: string[] = [];

  constructor(private router: Router) {}

  get isInRoom(): boolean {
    return this.router.url.includes('/room/');
  }

  public handleNavClick(route: string[]): void {
    if (this.isInRoom) {
      this.pendingNavigateTo = route;
      this.showLeaveConfirm = true;
    } else {
      this.router.navigate(route);
    }
  }

  public confirmLeave(): void {
    this.showLeaveConfirm = false;
    const target = this.pendingNavigateTo;
    this.pendingNavigateTo = [];
    if (target.length > 0) {
      this.router.navigate(target);
    }
  }

  public cancelLeave(): void {
    this.showLeaveConfirm = false;
    this.pendingNavigateTo = [];
  }
}
