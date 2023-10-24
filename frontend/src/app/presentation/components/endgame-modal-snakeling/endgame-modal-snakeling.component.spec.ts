/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { EndgameModalSnakelingComponent } from './endgame-modal-snakeling.component';

describe('EndgameModalSnakelingComponent', () => {
  let component: EndgameModalSnakelingComponent;
  let fixture: ComponentFixture<EndgameModalSnakelingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EndgameModalSnakelingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EndgameModalSnakelingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
