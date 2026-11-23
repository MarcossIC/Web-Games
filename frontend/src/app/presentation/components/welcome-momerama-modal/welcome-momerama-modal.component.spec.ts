import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MemoramaControllerService } from '@app/data/services/memorama/memoramaController.service';
import { WelcomeMomeramaModalComponent } from './welcome-momerama-modal.component';

describe('WelcomeMomeramaModalComponent', () => {
  let fixture: ComponentFixture<WelcomeMomeramaModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WelcomeMomeramaModalComponent],
      // The same provider the Memorama route declares in app.routing.ts.
      providers: [provideRouter([]), MemoramaControllerService],
    }).compileComponents();

    fixture = TestBed.createComponent(WelcomeMomeramaModalComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
