import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MemoramaControllerService } from '@app/data/services/memorama/memoramaController.service';
import { EndgameModalMemoramaComponent } from './endgame-modal-memorama.component';

describe('EndgameModalMemoramaComponent', () => {
  let fixture: ComponentFixture<EndgameModalMemoramaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EndgameModalMemoramaComponent],
      // The same provider the Memorama route declares in app.routing.ts.
      providers: [provideRouter([]), MemoramaControllerService],
    }).compileComponents();

    fixture = TestBed.createComponent(EndgameModalMemoramaComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
