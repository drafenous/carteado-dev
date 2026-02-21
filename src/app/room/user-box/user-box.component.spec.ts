import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';

import { UserBoxComponent } from './user-box.component';

@Component({
  template: `<app-user-box [user]="user"></app-user-box>`,
})
class TestHostUserBox {
  user: any = { id: 'u1', name: 'Test', role: 'voter', joinedAt: Date.now() };
}

describe('UserBoxComponent', () => {
  let component: UserBoxComponent;
  let fixture: ComponentFixture<UserBoxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserBoxComponent, TestHostUserBox],
    }).compileComponents();

    const host = TestBed.createComponent(TestHostUserBox);
    host.detectChanges();
    const { By } = await import('@angular/platform-browser');
    const debugEl = host.debugElement.query(By.directive(UserBoxComponent));
    component = debugEl.componentInstance;
    fixture = host as any;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
