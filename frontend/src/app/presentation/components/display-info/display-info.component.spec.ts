import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DisplayInfoComponent } from './display-info.component';

describe('DisplayInfoComponent', () => {
  let fixture: ComponentFixture<DisplayInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayInfoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DisplayInfoComponent);
    // Its four required inputs, as a page would bind them.
    fixture.componentRef.setInput('captionX', 'Player X');
    fixture.componentRef.setInput('captionO', 'Player O');
    fixture.componentRef.setInput('xCurrent', true);
    fixture.componentRef.setInput('oCurrent', false);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
