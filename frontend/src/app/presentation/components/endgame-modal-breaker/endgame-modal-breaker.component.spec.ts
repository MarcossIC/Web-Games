import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { BreakerControllerService } from '@app/data/services/breaker/BreakerController.service';
import type { RunSummary } from '@app/data/services/breaker/engine/types';
import { EndgameModalBreakerComponent } from './endgame-modal-breaker.component';

const summary: RunSummary = {
  score: 12340,
  sector: 4,
  sectorsCleared: 3,
  timeMs: 95_430,
  bricksBroken: 150,
  maxCombo: 22,
  powerUpsCaught: 7,
  perfectHits: 4,
  sectorTimes: {},
};

describe('EndgameModalBreakerComponent', () => {
  let fixture: ComponentFixture<EndgameModalBreakerComponent>;
  let result: ReturnType<typeof signal<{ newBestScore: boolean; newSectorBests: number[] } | null>>;
  let controller: Record<string, unknown>;
  let router: jasmine.SpyObj<Router>;

  const el = () => fixture.nativeElement as HTMLElement;
  const rows = () => Array.from(el().querySelectorAll('.result-row')).map((r) => r.textContent ?? '');

  const create = async (newBestScore: boolean, newSectorBests: number[]) => {
    result = signal({ newBestScore, newSectorBests });
    controller = {
      summary: signal(summary),
      result,
      records: signal({ version: 1, best: null, bestSectorTimes: {}, bestCombo: 0 }),
      restart: jasmine.createSpy('restart'),
    };
    router = jasmine.createSpyObj('Router', ['navigate']);
    await TestBed.configureTestingModule({
      imports: [EndgameModalBreakerComponent],
      providers: [
        { provide: BreakerControllerService, useValue: controller },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(EndgameModalBreakerComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('shows Game Over and every result row', async () => {
    await create(false, []);
    expect(el().querySelector('h2')?.textContent).toContain('Game Over');
    const text = rows().join('|');
    expect(text).toContain('Score');
    expect(text).toContain('12,340');
    expect(text).toContain('Sector');
    expect(text).toContain('1:35.43');
    expect(text).toContain('Best combo');
    expect(text).toContain('150');
    expect(el().querySelector('.is-best')).toBeTruthy();
  });

  it('marks a new record only when it is one', async () => {
    await create(true, []);
    expect(el().textContent).toContain('New record');
    TestBed.resetTestingModule();
    await create(false, []);
    expect(el().textContent).not.toContain('New record');
  });

  it('names the sectors with a new best time', async () => {
    await create(false, [2, 3]);
    expect(el().textContent).toContain('New best time in sector 2, 3');
  });

  it('says nothing about sector bests when there are none', async () => {
    await create(false, []);
    expect(el().textContent).not.toContain('New best time');
  });

  it('says a practice run is not recorded, and claims no record for it', async () => {
    await create(false, []);
    expect(el().textContent).not.toContain('Practice run');
    (controller['summary'] as ReturnType<typeof signal<RunSummary>>).set({ ...summary, practice: true });
    result.set(null);
    fixture.detectChanges();
    expect(el().querySelector('.practice')?.textContent).toContain('Practice run — not recorded');
    expect(el().textContent).not.toContain('New record');
    // With no record yet, the Best row does not pass the practice score off as one.
    expect(rows().find((r) => r.includes('Best') && !r.includes('combo'))).not.toContain('12,340');
  });

  it('Play Again restarts through the controller and is focused', async () => {
    await create(false, []);
    expect(document.activeElement).toBe(el().querySelector('.play-button'));
    (el().querySelector('.play-button') as HTMLButtonElement).click();
    expect(controller['restart']).toHaveBeenCalled();
  });

  it('keeps Shift+Tab inside the dialog', async () => {
    await create(false, []);
    const exit = el().querySelector('.exit-button') as HTMLButtonElement;
    exit.focus();
    exit.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(el().querySelector('.play-button'));
  });

  it('Exit goes to the catalog', async () => {
    await create(false, []);
    (el().querySelector('.exit-button') as HTMLButtonElement).click();
    expect(router.navigate).toHaveBeenCalledWith(['/games']);
  });
});
