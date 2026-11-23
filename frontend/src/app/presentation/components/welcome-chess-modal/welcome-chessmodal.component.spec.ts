import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { ChessController } from '@app/data/services/chess/ChessController.service';
import { chessTestProviders } from '@app/data/services/chess/chess-testing';

import { WelcomeChessModal } from './welcome-chessmodal.component';

describe('WelcomeChessModal', () => {
  let fixture: ComponentFixture<WelcomeChessModal>;
  let root: HTMLElement;
  let controller: ChessController;

  const buttons = () =>
    Array.from(root.querySelectorAll('button')).map((b) => b.textContent!.trim());
  const click = (label: string) => {
    const button = Array.from(root.querySelectorAll('button')).find(
      (b) => b.textContent!.trim() === label
    );
    button!.click();
    fixture.detectChanges();
  };
  const title = () => root.querySelector('h2')!.textContent!.trim();
  const cards = () =>
    Array.from(root.querySelectorAll('.mode-card')).map(
      (c) => c.querySelector('.mode-name')!.textContent!.trim()
    );
  const pickCard = (name: string) => {
    const card = Array.from(root.querySelectorAll<HTMLElement>('.mode-card')).find(
      (c) => c.querySelector('.mode-name')!.textContent!.trim() === name
    );
    card!.click();
    fixture.detectChanges();
  };
  /** Checks the radio button next to `label`, as a click on it would. */
  const choose = (label: string) => {
    const option = Array.from(root.querySelectorAll('label')).find(
      (l) => l.textContent!.trim() === label
    );
    const input = option!.querySelector('input')!;
    input.checked = true;
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  const checked = (name: string) =>
    root.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)!
      .closest('label')!.textContent!.trim();

  const open = () => {
    fixture = TestBed.createComponent(WelcomeChessModal);
    root = fixture.nativeElement;
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [WelcomeChessModal],
      providers: [provideRouter([]), ...chessTestProviders()],
    });
    controller = TestBed.inject(ChessController);
  });

  describe('on opening', () => {
    beforeEach(open);

    it('offers the modes to pick from, with how to play and exit', () => {
      expect(title()).toBe('Chess');
      expect(cards()).toEqual(['Practice', 'Machine']);
      expect(buttons().slice(2)).toEqual(['How to play', 'Exit']);
    });

    it('starts a practice game right away', () => {
      const start = spyOn(controller, 'start');

      pickCard('Practice');

      expect(start).toHaveBeenCalledOnceWith('practice');
    });

    it('asks for the level and the side before a game against the machine', () => {
      const start = spyOn(controller, 'start');

      pickCard('Machine');

      expect(start).not.toHaveBeenCalled();
      expect(title()).toBe('Machine');
      expect(buttons()).toEqual(['← Back', 'Play']);
    });

    it('offers four levels, weakest first, and three sides', () => {
      pickCard('Machine');

      const names = (group: string) =>
        Array.from(root.querySelectorAll(`input[name="${group}"]`)).map(
          (input) => input.closest('label')!.textContent!.trim()
        );
      expect(names('chess-level')).toEqual(['Rookie', 'Normal', 'Hard', 'Master']);
      expect(names('chess-side')).toEqual(['White', 'Random', 'Black']);
    });

    it('starts from the usual level and side the first time', () => {
      pickCard('Machine');

      expect(checked('chess-level')).toBe('Normal');
      expect(checked('chess-side')).toBe('White');
    });

    it('plays against the machine at the level and with the side picked', () => {
      const start = spyOn(controller, 'start');
      pickCard('Machine');

      choose('Master');
      choose('Black');
      click('Play');

      expect(start).toHaveBeenCalledOnceWith('machine', { level: 'master', side: 'black' });
    });

    it('lights one bar of the meter per level, and says what to expect', () => {
      pickCard('Machine');
      const lit = () => root.querySelectorAll('.bar.is-lit').length;
      const hint = () => root.querySelector('.hint')!.textContent!.trim();

      choose('Rookie');
      expect(lit()).toBe(1);
      const rookie = hint();

      choose('Master');
      expect(lit()).toBe(4);
      expect(hint()).not.toBe(rookie);
    });

    it('goes back from the machine page to the modes', () => {
      pickCard('Machine');

      click('← Back');

      expect(title()).toBe('Chess');
      expect(cards()).toEqual(['Practice', 'Machine']);
    });

    it('explains the game and both modes, and comes back', () => {
      click('How to play');

      expect(title()).toBe('How to play');
      const explained = Array.from(root.querySelectorAll('.mode-rule dt')).map(
        (dt) => dt.textContent!.trim()
      );
      expect(explained).toEqual(['Practice', 'Machine']);

      click('← Back');
      expect(title()).toBe('Chess');
    });

    it('leaves for the games page on Exit', () => {
      const navigate = spyOn(TestBed.inject(Router), 'navigate');

      click('Exit');

      expect(navigate).toHaveBeenCalledWith(['/games']);
    });
  });

  it('opens on the level and side of the last game against the machine', () => {
    controller.start('machine', { level: 'hard', side: 'random' });
    controller.backToMenu();
    open();

    expect(root.querySelector('.mode-best')!.textContent).toContain('Hard');
    pickCard('Machine');

    expect(checked('chess-level')).toBe('Hard');
    expect(checked('chess-side')).toBe('Random');
  });

  describe('during a game', () => {
    const pause = (start: () => void) => {
      start();
      controller.isPaused = true;
      open();
    };

    it('is the pause menu', () => {
      pause(() => controller.start('practice'));

      expect(title()).toBe('Paused');
      expect(buttons()).toEqual(['Resume', 'How to play', 'Change mode', 'Exit']);
      expect(root.querySelector('.best')!.textContent).toContain('Practice');
    });

    it('says which game against the machine is paused', () => {
      pause(() => controller.start('machine', { level: 'master', side: 'black' }));

      const line = root.querySelector('.best')!.textContent!;
      expect(line).toContain('Machine');
      expect(line).toContain('Master');
      expect(line).toContain('You play Black');
      expect(controller.humanColor).toBe(ChessPlayers.BLACK);
    });

    it('resumes the game', () => {
      pause(() => controller.start('practice'));

      click('Resume');

      expect(controller.isPaused).toBeFalse();
      expect(controller.started).toBeTrue();
    });

    it('comes back to the pause menu from how to play', () => {
      pause(() => controller.start('practice'));

      click('How to play');
      click('← Back');

      expect(title()).toBe('Paused');
    });

    it('goes back to the modes on Change mode', () => {
      pause(() => controller.start('machine', { level: 'hard', side: 'white' }));

      click('Change mode');

      expect(controller.started).toBeFalse();
      expect(title()).toBe('Chess');
      expect(cards()).toEqual(['Practice', 'Machine']);
    });
  });
});
