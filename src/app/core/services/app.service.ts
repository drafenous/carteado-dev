import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class AppService {
  private storedUserName = this.localStorage.getItem('user-name') || '';
  private _userName$ = new BehaviorSubject<string>(this.storedUserName);
  private storedUserTeamRole = this.localStorage.getItem('user-team-role') || '';
  private _userTeamRole$ = new BehaviorSubject<string>(this.storedUserTeamRole);
  private storedUserTeamRoleCustom = this.localStorage.getItem('user-team-role-custom') || '';
  private _userTeamRoleCustom$ = new BehaviorSubject<string>(this.storedUserTeamRoleCustom);

  constructor(private localStorage: LocalStorageService) {
    this._userName$.subscribe((userName) => {
      this.localStorage.setItem('user-name', userName);
    });
    this._userTeamRole$.subscribe((r) => {
      this.localStorage.setItem('user-team-role', r);
    });
    this._userTeamRoleCustom$.subscribe((r) => {
      this.localStorage.setItem('user-team-role-custom', r);
    });
  }

  public set userName(str: string) {
    this._userName$.next(str);
  }

  public get userName$() {
    return this._userName$.asObservable();
  }

  public set userTeamRole(role: string) {
    this._userTeamRole$.next(role);
  }

  public get userTeamRole$() {
    return this._userTeamRole$.asObservable();
  }

  public set userTeamRoleCustom(value: string) {
    this._userTeamRoleCustom$.next(value);
  }

  public get userTeamRoleCustom$() {
    return this._userTeamRoleCustom$.asObservable();
  }
}
