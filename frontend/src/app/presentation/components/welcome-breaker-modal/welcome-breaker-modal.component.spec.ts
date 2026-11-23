import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { BreakerControllerService } from '@app/data/services/breaker/BreakerController.service';
import { BREAKER_POWER_UP_INFO, BREAKER_POWER_UP_ORDER } from '@app/data/models/breaker/BreakerPowerUpInfo';
import { PIXEL_GLYPHS, glyphCells } from '@app/data/services/breaker/assets/pixel-glyphs';
import { WelcomeBreakerModalComponent } from './welcome-breaker-modal.component';

describe('WelcomeBreakerModalComponent', () => {
  let fixture: ComponentFixture<WelcomeBreakerModalComponent>;
  let phase: ReturnType<typeof signal<string>>;
  let controller: { phase: typeof phase; captureMouse: ReturnType<typeof signal<boolean>>; muted: ReturnType<typeof signal<boolean>>; records: ReturnType<typeof signal<unknown>>; play: jasmine.Spy; restart: jasmine.Spy; toggleMute: jasmine.Spy };
  let router: jasmine.SpyObj<Router>;

  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    phase = signal('intro');
    controller = {
      phase,
      captureMouse: signal(true),
      muted: signal(false),
      records: signal({ version: 1, best: null, bestSectorTimes: {}, bestCombo: 0 }),
      play: jasmine.createSpy('play'),
      restart: jasmine.createSpy('restart'),
      toggleMute: jasmine.createSpy('toggleMute'),
    };
    router = jasmine.createSpyObj('Router', ['navigate']);
    await TestBed.configureTestingModule({
      imports: [WelcomeBreakerModalComponent],
      providers: [
        { provide: BreakerControllerService, useValue: controller },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(WelcomeBreakerModalComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('is titled How to play in the intro and Paused when paused', () => {
    expect(el().querySelector('h2')?.textContent).toContain('How to play');
    expect(el().querySelector('.play-button')?.textContent).toContain('Play Game');
    phase.set('paused');
    fixture.detectChanges();
    expect(el().querySelector('h2')?.textContent).toContain('Paused');
    expect(el().querySelector('.play-button')?.textContent).toContain('Resume Game');
  });

  it('shows L for the mouse lock and whether it is on', () => {
    const row = () => el().querySelector('.lock-row') as HTMLElement;
    expect(row().querySelector('kbd')?.textContent).toBe('L');
    expect(row().textContent).toContain('On');
    controller.captureMouse.set(false);
    fixture.detectChanges();
    expect(row().textContent).toContain('Off');
  });

  it('lists the keys and one chip per power-up', () => {
    expect(el().querySelectorAll('.key-row').length).toBeGreaterThanOrEqual(4);
    expect(el().querySelectorAll('.powerup').length).toBe(BREAKER_POWER_UP_ORDER.length);
    expect(el().querySelectorAll('.powerup.is-hazard').length).toBe(2);
  });

  it('draws in each chip the same pixel picture and color the capsule shows', () => {
    const chips = Array.from(el().querySelectorAll('.powerup')) as HTMLElement[];
    BREAKER_POWER_UP_ORDER.forEach((kind, i) => {
      const cells = chips[i].querySelectorAll('.capsule svg rect');
      expect(cells.length).withContext(kind).toBe(glyphCells(PIXEL_GLYPHS[kind]).length);
      expect(chips[i].style.getPropertyValue('--tone')).withContext(kind).toBe(BREAKER_POWER_UP_INFO[kind].color);
    });
  });

  it('explains the touch gestures, NOVA included', () => {
    const text = Array.from(el().querySelectorAll('.key-row.touch-row'))
      .map((r) => r.textContent)
      .join(' ');
    expect(text).toContain('Drag anywhere to move the paddle');
    expect(text).toContain('Move to aim, tap to launch');
    expect(text).toContain('Tap NOVA when the meter is full');
  });

  it('marks every keyboard row (Lock mouse included) so touch devices can hide them', () => {
    const keyboardRows = el().querySelectorAll('.key-row.keyboard-row');
    expect(keyboardRows.length).toBeGreaterThanOrEqual(5);
    expect(el().querySelector('.lock-row')?.classList).toContain('keyboard-row');
    expect(el().querySelector('.touch-row')?.classList).not.toContain('keyboard-row');
  });

  describe('pause screen', () => {
    const menu = () => el().querySelector('.pause-menu') as HTMLElement | null;
    const btn = (cls: string) => el().querySelector(`.pause-menu .${cls}`) as HTMLButtonElement;

    beforeEach(() => {
      phase.set('paused');
      fixture.detectChanges();
    });

    it('is not rendered in the intro', () => {
      phase.set('intro');
      fixture.detectChanges();
      expect(menu()).toBeNull();
    });

    it('stacks Resume, Restart, Sound, How to play and Exit', () => {
      const labels = Array.from(menu()!.querySelectorAll('button')).map((b) => b.textContent!.trim());
      expect(labels).toEqual(['Resume', 'Restart', 'Sound on', 'How to play', 'Exit game']);
    });

    it('shows the best record', () => {
      expect(menu()!.querySelector('.pause-best')?.textContent).toContain('No record yet');
      controller.records.set({ version: 1, best: { score: 12340, sector: 4 }, bestSectorTimes: {}, bestCombo: 1 });
      fixture.detectChanges();
      expect(menu()!.querySelector('.pause-best')?.textContent).toContain('Best 12,340');
      expect(menu()!.querySelector('.pause-best')?.textContent).toContain('Sector 4');
    });

    it('Resume and Restart call the controller', () => {
      btn('menu-resume').click();
      expect(controller.play).toHaveBeenCalled();
      btn('menu-restart').click();
      expect(controller.restart).toHaveBeenCalled();
    });

    it('Sound toggles mute and shows its state', () => {
      btn('menu-sound').click();
      expect(controller.toggleMute).toHaveBeenCalled();
      expect(btn('menu-sound').getAttribute('aria-pressed')).toBe('false');
      controller.muted.set(true);
      fixture.detectChanges();
      expect(btn('menu-sound').textContent).toContain('Sound off');
      expect(btn('menu-sound').getAttribute('aria-pressed')).toBe('true');
    });

    it('Exit goes to the catalog', () => {
      btn('menu-exit').click();
      expect(router.navigate).toHaveBeenCalledWith(['/games']);
    });

    it('How to play opens the help in the same screen and Back returns', () => {
      const root = () => el().querySelector('.modal-scrim') as HTMLElement;
      expect(root().classList).not.toContain('show-help');
      expect(el().querySelector('.help-back')).toBeNull();
      btn('menu-help').click();
      fixture.detectChanges();
      expect(root().classList).toContain('show-help');
      expect(el().querySelector('h2')?.textContent).toContain('How to play');
      (el().querySelector('.help-back') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(root().classList).not.toContain('show-help');
      expect(el().querySelector('h2')?.textContent).toContain('Paused');
    });

    it('is a modal dialog', () => {
      const dialog = el().querySelector('[role=dialog]')!;
      expect(dialog.getAttribute('aria-modal')).toBe('true');
    });
  });

  it('Play calls the controller', () => {
    (el().querySelector('.play-button') as HTMLButtonElement).click();
    expect(controller.play).toHaveBeenCalled();
  });

  it('offers Restart only when paused, and it restarts the run', () => {
    expect(el().querySelector('.restart-button')).toBeNull();
    phase.set('paused');
    fixture.detectChanges();
    (el().querySelector('.restart-button') as HTMLButtonElement).click();
    expect(controller.restart).toHaveBeenCalled();
  });

  it('keeps Tab inside the dialog', () => {
    const buttons = Array.from(el().querySelectorAll('.sheet-actions button')) as HTMLButtonElement[];
    const last = buttons[buttons.length - 1];
    last.focus();
    last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('Exit goes to the catalog', () => {
    (el().querySelector('.exit-button') as HTMLButtonElement).click();
    expect(router.navigate).toHaveBeenCalledWith(['/games']);
  });

  it('focuses the play button when it opens', () => {
    expect(document.activeElement).toBe(el().querySelector('.play-button'));
  });
});
