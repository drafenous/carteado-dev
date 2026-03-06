import { Component, OnInit } from '@angular/core';
import { ContentBoxComponent } from '../common/content-box/content-box.component';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { AppService } from '../core/services/app.service';
import { ActivatedRoute } from '@angular/router';
import { debounceTime, take } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faMugHot, faRightToBracket } from '@fortawesome/free-solid-svg-icons';
import { TooltipComponent } from '../common/tooltip/tooltip.component';
import { TranslatePipe } from '../common/i18n/translate.pipe';
import { SelectComponent, SelectOption } from '../common/select/select.component';
import { I18nService } from '../core/services/i18n.service';

function roleOtherRequiredWhenOther(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const group = control.parent;
    if (!group) return null;
    const role = group.get('role')?.value;
    const other = (control.value ?? '').toString().trim();
    if (role === 'other' && !other) {
      return { roleOtherRequired: true };
    }
    return null;
  };
}

@Component({
    selector: 'app-home',
    imports: [
        ContentBoxComponent,
        ReactiveFormsModule,
        CommonModule,
        RouterModule,
        FontAwesomeModule,
        TooltipComponent,
        TranslatePipe,
        SelectComponent,
    ],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  userNameControl = new FormControl<string>('', [Validators.required]);
  roomIdControl = new FormControl<string>('');
  profileForm = new FormGroup(
    {
      role: new FormControl<string>('', [Validators.required]),
      roleOther: new FormControl<string>('', [roleOtherRequiredWhenOther()]),
    },
    { updateOn: 'change' }
  );
  invalidRoomMessage = false;

  get teamRoleControl(): FormControl<string | null> {
    return this.profileForm.get('role') as FormControl<string | null>;
  }
  get teamRoleOtherControl(): FormControl<string | null> {
    return this.profileForm.get('roleOther') as FormControl<string | null>;
  }

  public ICONS = {
    createRoom: faMugHot,
    joinRoom: faRightToBracket,
  };

  constructor(
    private appService: AppService,
    private router: Router,
    private route: ActivatedRoute,
    private i18n: I18nService
  ) {}

  get teamRoleOptions(): SelectOption[] {
    return [
      { value: 'fullstack', label: this.i18n.t('roles.fullstack') },
      { value: 'frontend', label: this.i18n.t('roles.frontend') },
      { value: 'backend', label: this.i18n.t('roles.backend') },
      { value: 'engineer', label: this.i18n.t('roles.engineer') },
      { value: 'qa', label: this.i18n.t('roles.qa') },
      { value: 'techlead', label: this.i18n.t('roles.techlead') },
      { value: 'staff', label: this.i18n.t('roles.staff') },
      { value: 'Product Owner', label: this.i18n.t('roles.productOwner') },
      { value: 'Scrum Master', label: this.i18n.t('roles.scrumMaster') },
      { value: 'devops', label: this.i18n.t('roles.devops') },
      { value: 'other', label: this.i18n.t('roles.other') },
    ];
  }

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
      this.invalidRoomMessage = params.get('invalidRoom') === '1';
    });

    this.userNameControl.valueChanges
      .pipe(debounceTime(300))
      .subscribe((userName) => {
        this.appService.userName = userName || '';
      });
    this.teamRoleControl.valueChanges.pipe(debounceTime(200)).subscribe((role) => {
      this.appService.userTeamRole = role || '';
      this.teamRoleOtherControl.updateValueAndValidity();
    });
    this.teamRoleOtherControl.valueChanges.pipe(debounceTime(200)).subscribe((v) => {
      this.appService.userTeamRoleCustom = v || '';
    });
    this.roomIdControl.valueChanges.pipe(debounceTime(100)).subscribe(() => {
      this.invalidRoomMessage = false;
    });
  }

  handleCreateRoom(_event: Event): void {
    this.userNameControl.markAsTouched();
    this.profileForm.markAllAsTouched();
    if (this.userNameControl.invalid || this.profileForm.invalid) return;
    const id = Math.random().toString(36).slice(2, 9);
    this.router.navigate(['room', id], { queryParams: { mode: 'create' } });
  }

  handleJoinRoom(_event: Event): void {
    const id = (this.roomIdControl.value || '').trim();
    if (!id) return;
    this.userNameControl.markAsTouched();
    this.profileForm.markAllAsTouched();
    if (this.userNameControl.invalid || this.profileForm.invalid) return;
    this.router.navigate(['room', id], { queryParams: { mode: 'join' } });
  }
}
