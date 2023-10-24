/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { EndgameModalTetrisComponent } from './endgame-modal-tetris.component';

describe('EndgameModalTetrisComponent', () => {
  let component: EndgameModalTetrisComponent;
  let fixture: ComponentFixture<EndgameModalTetrisComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EndgameModalTetrisComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EndgameModalTetrisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
