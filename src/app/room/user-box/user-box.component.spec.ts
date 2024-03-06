import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserBoxComponent } from './user-box.component';

describe('UserBoxComponent', () => {
  let component: UserBoxComponent;
  let fixture: ComponentFixture<UserBoxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserBoxComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UserBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
