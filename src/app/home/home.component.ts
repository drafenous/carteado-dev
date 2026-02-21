import { Component, OnInit } from '@angular/core';
import { ContentBoxComponent } from '../common/content-box/content-box.component';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppService } from '../core/services/app.service';
import { ActivatedRoute } from '@angular/router';
import { debounceTime, take } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faMugHot, faRightToBracket } from '@fortawesome/free-solid-svg-icons';
import { TooltipComponent } from '../common/tooltip/tooltip.component';

@Component({
    selector: 'app-home',
    imports: [
        ContentBoxComponent,
        ReactiveFormsModule,
        CommonModule,
        RouterModule,
        FontAwesomeModule,
        TooltipComponent,
    ],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  userNameControl = new FormControl<string>('', [Validators.required]);
  roomIdControl = new FormControl<string>('');
  teamRoleControl = new FormControl<string>('');
  teamRoleOtherControl = new FormControl<string>('');
  invalidRoomMessage = '';

  public ICONS = {
    createRoom: faMugHot,
    joinRoom: faRightToBracket,
  };

  constructor(private appService: AppService, private router: Router, private route: ActivatedRoute) {}

  get userName$() {
    return this.appService.userName$;
  }

  ngOnInit(): void {
    this.appService.userName$.pipe(take(1)).subscribe((userName) => {
      this.userNameControl.setValue(userName, { emitEvent: false });
    });
    this.appService.userTeamRole$.pipe(take(1)).subscribe((role) => {
      this.teamRoleControl.setValue(role || '');
    });
    this.appService.userTeamRoleCustom$.pipe(take(1)).subscribe((v) => {
      this.teamRoleOtherControl.setValue(v || '');
    });

    // prefill roomId and invalid-room hint from query params
    this.route.queryParamMap.pipe(take(1)).subscribe((params) => {
      const preset = params.get('roomId');
      if (preset) this.roomIdControl.setValue(preset);
      this.invalidRoomMessage = params.get('invalidRoom') === '1' ? 'Invalid room. Check the code and try again.' : '';
    });

    this.userNameControl.valueChanges
      .pipe(debounceTime(300))
      .subscribe((userName) => {
        this.appService.userName = userName || '';
      });
    this.teamRoleControl.valueChanges.pipe(debounceTime(200)).subscribe((role) => {
      this.appService.userTeamRole = role || '';
    });
    this.teamRoleOtherControl.valueChanges.pipe(debounceTime(200)).subscribe((v) => {
      this.appService.userTeamRoleCustom = v || '';
    });
    this.roomIdControl.valueChanges.pipe(debounceTime(100)).subscribe(() => {
      this.invalidRoomMessage = '';
    });
  }

  handleCreateRoom(_event: Event): void {
    // create simple deterministic room id for now
    const id = Math.random().toString(36).slice(2, 9);
    this.router.navigate(['room', id], { queryParams: { mode: 'create' } });
  }

  handleJoinRoom(_event: Event): void {
    const id = (this.roomIdControl.value || '').trim();
    if (!id) return;
    this.router.navigate(['room', id], { queryParams: { mode: 'join' } });
  }
}
