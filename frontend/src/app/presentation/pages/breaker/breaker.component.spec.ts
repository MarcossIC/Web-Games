import { Component, DestroyRef, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BreakerControllerService } from '@app/data/services/breaker/BreakerController.service';
import { BreakerGameComponent } from '@app/presentation/components/breaker-game/breaker-game.component';
import { BreakerComponent } from './breaker.component';

@Component({ standalone: true, selector: 'breaker-game', template: '' })
class StubGameComponent {}

describe('BreakerComponent', () => {
  let fixture: ComponentFixture<BreakerComponent>;
  let phase: ReturnType<typeof signal<string>>;
  let controller: Record<string, unknown>;

  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    phase = signal('playing');
    controller = {
      phase,
      muted: signal(false),
      captureMouse: signal(true),
      toggleCaptureMouse: jasmine.createSpy('toggleCaptureMouse'),
      records: signal({ version: 1, best: null, bestSectorTimes: {}, bestCombo: 0 }),
      summary: signal(null),
      result: signal(null),
      connect: jasmine.createSpy('connect'),
      togglePause: jasmine.createSpy('togglePause'),
      toggleMute: jasmine.createSpy('toggleMute'),
      handleAction: jasmine.createSpy('handleAction'),
      play: jasmine.createSpy('play'),
      restart: jasmine.createSpy('restart'),
    };
    await TestBed.configureTestingModule({
      imports: [BreakerComponent],
      providers: [provideRouter([])],
    })
      .overrideComponent(BreakerComponent, {
        remove: { imports: [BreakerGameComponent], providers: [BreakerControllerService] },
        add: { imports: [StubGameComponent], providers: [{ provide: BreakerControllerService, useValue: controller }] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(BreakerComponent);
    fixture.detectChanges();
  });

  it('connects the controller to the scene for the life of this page', () => {
    expect(controller['connect']).toHaveBeenCalledTimes(1);
    const owner = (controller['connect'] as jasmine.Spy).calls.mostRecent().args[0] as DestroyRef;
    expect(owner).toBeDefined();
    expect(typeof owner.onDestroy).toBe('function');
    // The page's own DestroyRef: it dies with the page, not with the route's (cached) injector.
    const disconnected = jasmine.createSpy('disconnected');
    owner.onDestroy(disconnected);
    fixture.destroy();
    expect(disconnected).toHaveBeenCalled();
  });

  it('keeps the browser from scrolling or zooming while a finger drags on the game', () => {
    const screen = el().querySelector('.screen') as HTMLElement;
    expect(getComputedStyle(screen).touchAction).toBe('none');
  });

  it('keeps the game screen and the strip in the DOM for the portrait-touch CSS to reshape', () => {
    // The layout switch is pure CSS: the elements the media query targets must exist.
    expect(el().querySelector('app-game-bar')).not.toBeNull();
    expect(el().querySelector('.play > .screen')).not.toBeNull();
    expect(el().querySelector('.play > .strip')).not.toBeNull();
  });

  it('shows No record yet, then the best record', () => {
    expect(el().querySelector('.best')?.textContent).toContain('No record yet');
    (controller['records'] as ReturnType<typeof signal<unknown>>).set({
      version: 1,
      best: { score: 12340, sector: 4, timeMs: 1000, date: '2026-01-01' },
      bestSectorTimes: {},
      bestCombo: 1,
    });
    fixture.detectChanges();
    expect(el().querySelector('.best')?.textContent).toContain('Best 12,340');
    expect(el().querySelector('.best')?.textContent).toContain('Sector 4');
  });

  it('shows no dialog while playing, the guide on intro and pause, the result when over', () => {
    expect(el().querySelector('welcome-breaker-modal')).toBeNull();
    expect(el().querySelector('endgame-modal-breaker')).toBeNull();
    phase.set('intro');
    fixture.detectChanges();
    expect(el().querySelector('welcome-breaker-modal')).not.toBeNull();
    phase.set('paused');
    fixture.detectChanges();
    expect(el().querySelector('welcome-breaker-modal')).not.toBeNull();
    phase.set('over');
    fixture.detectChanges();
    expect(el().querySelector('welcome-breaker-modal')).toBeNull();
    expect(el().querySelector('endgame-modal-breaker')).not.toBeNull();
  });

  it('forwards document keys to the controller', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' }));
    expect(controller['handleAction']).toHaveBeenCalledWith('pause', jasmine.any(Number));
  });

  it('the mute button toggles mute', () => {
    (el().querySelector('.mute') as HTMLButtonElement).click();
    expect(controller['toggleMute']).toHaveBeenCalled();
  });

  it('lists L as the lock mouse key, with no box to click (the mouse cannot reach it)', () => {
    expect(el().querySelector('input[type=checkbox]')).toBeNull();
    const item = [...el().querySelectorAll('.legend-item')].find((i) => i.textContent?.includes('Lock mouse'));
    expect(item?.querySelector('kbd')?.textContent).toBe('L');
  });
});

describe("BreakerComponent providers", () => {
  it("provides its own controller: resolvable from the page, not from the root injector", async () => {
    await TestBed.configureTestingModule({ imports: [BreakerComponent], providers: [provideRouter([])] })
      .overrideComponent(BreakerComponent, {
        remove: { imports: [BreakerGameComponent] },
        add: { imports: [StubGameComponent] },
      })
      .compileComponents();
    const fixture = TestBed.createComponent(BreakerComponent);
    fixture.detectChanges();
    const own = fixture.debugElement.injector.get(BreakerControllerService);
    expect(own).toBeInstanceOf(BreakerControllerService);
    expect(TestBed.inject(BreakerControllerService, null)).toBeNull();
    fixture.destroy();
  });
});
