import { Component, OnInit } from '@angular/core';
import { ContentBoxComponent } from '../common/content-box/content-box.component';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppService } from '../core/services/app.service';
import { debounceTime, take } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faMugHot, faRightToBracket } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    ContentBoxComponent,
    ReactiveFormsModule,
    CommonModule,
    RouterModule,
    FontAwesomeModule,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  userNameControl = new FormControl<string>('', [Validators.required]);

  public ICONS = {
    createRoom: faMugHot,
    joinRoom: faRightToBracket,
  };

  constructor(private appService: AppService, private router: Router) {}

  get userName$() {
    return this.appService.userName$;
  }

  ngOnInit(): void {
    this.appService.userName$.pipe(take(1)).subscribe((userName) => {
      this.userNameControl.setValue(userName, { emitEvent: false });
    });

    this.userNameControl.valueChanges
      .pipe(debounceTime(300))
      .subscribe((userName) => {
        this.appService.userName = userName || '';
      });
  }

  handleCreateRoom(_event: Event): void {
    this.router.navigate(['room', '123456']);
  }

  handleJoinRoom(_event: Event): void {
    this.router.navigate(['room', '123456']);
  }
}
