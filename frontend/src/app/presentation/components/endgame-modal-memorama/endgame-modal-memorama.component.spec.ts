/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { EndgameModalMemoramaComponent } from './endgame-modal-memorama.component';

describe('EndgameModalMemoramaComponent', () => {
  let component: EndgameModalMemoramaComponent;
  let fixture: ComponentFixture<EndgameModalMemoramaComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EndgameModalMemoramaComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EndgameModalMemoramaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
