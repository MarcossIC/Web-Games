import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MemoramaControllerService } from '@app/data/services/memorama/memoramaController.service';
import { MemoramaComponent } from './memorama.component';

describe('MemoramaComponent', () => {
  let fixture: ComponentFixture<MemoramaComponent>;
  let page: HTMLElement;
  let controller: MemoramaControllerService;

  beforeEach(async () => {
    // The same provider the Memorama route declares in app.routing.ts.
    await TestBed.configureTestingModule({
      imports: [MemoramaComponent],
      providers: [provideRouter([]), MemoramaControllerService],
    }).compileComponents();

    controller = TestBed.inject(MemoramaControllerService);
    fixture = TestBed.createComponent(MemoramaComponent);
    fixture.detectChanges();
    page = fixture.nativeElement;

    // Accept the opening dialog, as its Play button does.
    page.querySelector<HTMLButtonElement>('.play-button')?.click();
    fixture.detectChanges();
  });

  const cards = () =>
    Array.from(page.querySelectorAll<HTMLElement>('#game-memorama .game-card'));
  const isFaceUp = (card: HTMLElement) =>
    card.querySelector('.content')?.classList.contains('active') ?? false;
  /** Positions of the two cards that carry `value`. */
  const pairOf = (value: number) =>
    controller.valueUsed
      .map((used, index) => (used === value ? index : -1))
      .filter((index) => index >= 0);
  const pick = (index: number) => {
    cards()[index].click();
    fixture.detectChanges();
  };

  it('deals twelve cards face down', () => {
    expect(cards().length).toBe(12);
    expect(cards().some(isFaceUp)).toBeFalse();
  });

  it('turns a card face up when it is picked', () => {
    pick(0);

    expect(isFaceUp(cards()[0])).toBeTrue();
  });

  it('keeps a pair face up, marks it as found and counts it', () => {
    const [first, second] = pairOf(controller.valueUsed[0]);

    pick(first);
    pick(second);

    expect(isFaceUp(cards()[first])).toBeTrue();
    expect(isFaceUp(cards()[second])).toBeTrue();
    expect(cards()[first].classList).toContain('is-matched');
    expect(cards()[second].classList).toContain('is-matched');
    expect(controller.success).toBe(1);
  });

  it('marks two different cards as a miss and does not count a pair', () => {
    const first = 0;
    const other = controller.valueUsed.findIndex(
      (value) => value !== controller.valueUsed[first]
    );

    pick(first);
    pick(other);

    expect(cards()[first].classList).toContain('is-wrong');
    expect(cards()[other].classList).toContain('is-wrong');
    expect(cards()[first].classList).not.toContain('is-matched');
    expect(controller.success).toBe(0);
    expect(controller.currentAttempts).toBe(1);
  });
});
