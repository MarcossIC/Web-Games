import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GAME_STORE, memoryStore } from '@app-persistence';
import { LEVELS, playMove, type LevelSpec } from '@app/data/services/ringout/engine';
import { RingOutController } from '@app/data/services/ringout/RingOutController.service';
import { ringOutInfinite, ringOutProgress } from '@app/data/services/ringout/ringout-saves';
import { RingOutStages } from '@app/data/services/ringout/ringout-stages';
import { RingOutComponent } from './ringout.component';

/** Infinite without its worker: stage n is level n made by hand, built at once. */
const instantStages = {
  peek: (stage: number): LevelSpec | null => LEVELS[stage - 1] ?? null,
  get: (stage: number): Promise<LevelSpec> => Promise.resolve(LEVELS[stage - 1]),
  prefetch: (): void => undefined,
};

describe('RingOutComponent', () => {
  let fixture: ComponentFixture<RingOutComponent>;
  let page: HTMLElement;
  let controller: RingOutController;

  async function open(saved = memoryStore()): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [RingOutComponent],
      providers: [provideRouter([]), { provide: GAME_STORE, useValue: saved }],
    })
      // The page provides its own services; the worker is swapped for boards at hand.
      .overrideComponent(RingOutComponent, {
        set: { providers: [RingOutController, { provide: RingOutStages, useValue: instantStages }] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(RingOutComponent);
    // The page provides its own controller (see app.routing.ts).
    controller = fixture.debugElement.injector.get(RingOutController);
    fixture.detectChanges();
    page = fixture.nativeElement;
  }

  const levelButtons = () => Array.from(page.querySelectorAll<HTMLButtonElement>('button.level'));
  const button = (text: string) =>
    Array.from(page.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === text);

  it('opens on the levels, only the first one open', async () => {
    await open();
    const levels = levelButtons();
    expect(levels.length).toBe(controller.levels.length);
    expect(levels[0].disabled).toBeFalse();
    expect(levels.slice(1).every((level) => level.disabled)).toBeTrue();
  });

  it('opens the levels already reached, with their best times', async () => {
    const saved = memoryStore();
    ringOutProgress.write(saved, { cleared: 2, bestTimes: { 1: 4300, 2: 61_000 } });
    await open(saved);
    const levels = levelButtons();
    expect(levels.slice(0, 3).map((level) => level.disabled)).toEqual([false, false, false]);
    expect(levels[3].disabled).toBeTrue();
    expect(levels[0].textContent).toContain('0:04.3');
    expect(levels[1].textContent).toContain('1:01.0');
  });

  it('plays a level picked from the menu, with its tip and the clock at zero', async () => {
    await open();
    levelButtons()[0].click();
    fixture.detectChanges();
    expect(controller.phase()).toBe('playing');
    expect(page.querySelector('button.level')).toBeNull();
    expect(page.querySelector('.tip')?.textContent).toContain('Tap a ring');
    expect(page.querySelector('.readout-time dd')?.textContent?.trim()).toBe('0:00.0');
  });

  it('shows the time and opens the next level when one is cleared', async () => {
    await open();
    controller.start(1);
    for (const move of controller.levels[0].solution) playMove(controller.board, move);
    controller.finish();
    fixture.detectChanges();
    expect(page.querySelector('#ringout-result-title')?.textContent).toContain('Level 1 Clear');
    expect(page.querySelector('.record')?.textContent).toContain('Level 2 is open');

    button('Next level')?.click();
    fixture.detectChanges();
    expect(controller.level()).toBe(2);
    expect(controller.phase()).toBe('playing');
  });

  it('pauses into a menu that resumes or starts again', async () => {
    await open();
    controller.start(1);
    fixture.detectChanges();
    page.querySelector<HTMLButtonElement>('app-game-bar .pause')?.click();
    fixture.detectChanges();
    expect(controller.phase()).toBe('paused');
    expect(page.querySelector('#ringout-dialog-title')?.textContent).toContain('Paused');

    button('Resume')?.click();
    fixture.detectChanges();
    expect(controller.phase()).toBe('playing');
  });

  it('offers Infinite under the levels, from the stage after the furthest cleared', async () => {
    const saved = memoryStore();
    ringOutInfinite.write(saved, { cleared: 2, bestTimes: {}, generator: 0 });
    await open(saved);
    const infinite = page.querySelector<HTMLButtonElement>('button.infinite-button');
    expect(infinite?.textContent).toContain('Infinite');
    expect(infinite?.textContent).toContain('Stage 3');

    infinite?.click();
    fixture.detectChanges();
    expect(controller.mode()).toBe('infinite');
    expect(controller.phase()).toBe('playing');
    expect(page.querySelector('.readout dt')?.textContent).toContain('Stage');
    expect(page.querySelector('.readout dd')?.textContent).toContain('3');
    expect(page.querySelector('.tip')?.textContent?.trim()).toBe('');
  });

  it('names the stage cleared and leads on to the next one', async () => {
    await open();
    controller.startInfinite();
    for (const move of LEVELS[0].solution) playMove(controller.board, move);
    controller.finish();
    fixture.detectChanges();
    expect(page.querySelector('#ringout-result-title')?.textContent).toContain('Stage 1 Clear');
    expect(page.querySelector('.record')?.textContent).toContain('Stage 2 is next');

    button('Next stage')?.click();
    fixture.detectChanges();
    expect(controller.level()).toBe(2);
    expect(controller.phase()).toBe('playing');
  });

  it('shows that a stage is being built, and leads back to the menu', async () => {
    await open();
    const slow = new Promise<LevelSpec>(() => undefined);
    spyOn(instantStages, 'peek').and.returnValue(null);
    spyOn(instantStages, 'get').and.returnValue(slow);
    controller.startInfinite();
    fixture.detectChanges();
    expect(page.querySelector('#ringout-building-title')?.textContent).toContain('Stage 1');

    button('\u2190 Menu')?.click();
    fixture.detectChanges();
    expect(controller.phase()).toBe('menu');
  });
});
