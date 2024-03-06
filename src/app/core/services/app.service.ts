import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class AppService {
  private storedUserName = this.localStorage.getItem('user-name') || '';
  private _userName$ = new BehaviorSubject<string>(this.storedUserName);

  constructor(private localStorage: LocalStorageService) {
    this._userName$.subscribe((userName) => {
      this.localStorage.setItem('user-name', userName);
    });
  }

  public set userName(str: string) {
    this._userName$.next(str);
  }

  public get userName$() {
    return this._userName$.asObservable();
  }
}
