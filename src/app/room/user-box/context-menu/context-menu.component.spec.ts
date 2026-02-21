import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';

import { ContextMenuComponent } from './context-menu.component';

@Component({
  template: `<app-context-menu [user]="user" [isShown]="isShown"></app-context-menu>`,
  standalone: false,
})
class TestHostComponent {
  user: any = { id: 'u1', name: 'Test', role: 'voter', joinedAt: Date.now() };
  isShown = true;
}

describe('ContextMenuComponent', () => {
  let component: ContextMenuComponent;
  let fixture: ComponentFixture<ContextMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestHostComponent],
      imports: [ContextMenuComponent],
    }).compileComponents();

    const hostFixture = TestBed.createComponent(TestHostComponent);
    hostFixture.detectChanges();
    const { By } = await import('@angular/platform-browser');
    const debugEl = hostFixture.debugElement.query(By.directive(ContextMenuComponent));
    component = debugEl.componentInstance;
    fixture = hostFixture as any;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
