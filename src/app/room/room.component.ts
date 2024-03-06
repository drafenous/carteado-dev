import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ContentBoxComponent } from '../common/content-box/content-box.component';
import { UserBoxComponent } from './user-box/user-box.component';
import { AppService } from '../core/services/app.service';

@Component({
  selector: 'app-room',
  standalone: true,
  imports: [
    ContentBoxComponent,
    CommonModule,
    RouterModule,
    FontAwesomeModule,
    UserBoxComponent,
  ],
  templateUrl: './room.component.html',
  styleUrl: './room.component.scss',
})
export class RoomComponent {
  public userName!: string;
  public MOCKED_USERS = [
    'Rodrigo',
    'Caio',
    'Tati',
    'Lucas',
    'Jonny',
    'Batalha',
  ];

  constructor(private appService: AppService) {
    this.appService.userName$.subscribe((userName) => {
      this.MOCKED_USERS = [userName, ...this.MOCKED_USERS];
      this.userName = userName;
    });
  }

  public handleKickuserByName(kickedUser: string) {
    this.MOCKED_USERS = this.MOCKED_USERS.filter((user) => user !== kickedUser);
  }
}
