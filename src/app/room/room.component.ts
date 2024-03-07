import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ContentBoxComponent } from '../common/content-box/content-box.component';
import { User } from '../core/models/user';
import { AppService } from '../core/services/app.service';
import { UserBoxComponent } from './user-box/user-box.component';

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
  public MOCKED_USERS: User[] = [
    { id: 1, name: 'Rodrigo', isVotter: true, isAdmin: false },
    { id: 2, name: 'Caio', isVotter: true, isAdmin: false },
    { id: 3, name: 'Tati', isVotter: true, isAdmin: false },
    { id: 4, name: 'Lucas', isVotter: true, isAdmin: false },
    { id: 5, name: 'Jonny', isVotter: true, isAdmin: false },
    { id: 6, name: 'Batalha', isVotter: true, isAdmin: false },
  ];

  constructor(private appService: AppService) {
    this.appService.userName$.subscribe((userName) => {
      this.MOCKED_USERS = [
        { id: 0, name: userName, isVotter: true, isAdmin: true },
        ...this.MOCKED_USERS,
      ];
      this.userName = userName;
    });
  }

  public handleKickuserByName(kickedUserId: number) {
    this.MOCKED_USERS = this.MOCKED_USERS.filter(
      (user) => user.id !== kickedUserId
    );
  }
}
