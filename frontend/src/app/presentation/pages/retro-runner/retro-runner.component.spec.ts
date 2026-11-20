import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { EventBus } from '@app/data/services/phaser/EventBus';
import { RunnerEvents } from '@app/data/services/retrorunner/main';
import { RetroRunnerPhaserGameComponent } from '@app/presentation/components/retro-runner-game/retro-runner-game.component';
import { RetroRunnerComponent } from './retro-runner.component';

/** Stands in for the Phaser game: the page is tested without booting it. */
@Component({
  standalone: true,
  selector: 'retro-runner-phaser-game',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class GameStubComponent {
  readonly initialSeed = input<string>();
}

describe('RetroRunnerComponent', () => {
  let fixture: ComponentFixture<RetroRunnerComponent>;
  let router: Router;
  let navigate: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RetroRunnerComponent],
      providers: [provideRouter([])],
    })
      .overrideComponent(RetroRunnerComponent, {
        remove: { imports: [RetroRunnerPhaserGameComponent] },
        add: { imports: [GameStubComponent] },
      })
      .compileComponents();

    router = TestBed.inject(Router);
    navigate = spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(RetroRunnerComponent);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('goes back to the games when the game asks to leave: on a phone its bar is hidden', () => {
    EventBus.emit(RunnerEvents.EXIT);

    expect(navigate).toHaveBeenCalledOnceWith(['/games']);
  });

  it('copies the link of the level when the game asks, and tells it the link was copied', async () => {
    const write = spyOn(navigator.clipboard, 'writeText').and.resolveTo();
    const answers: boolean[] = [];
    const heard = new Promise<void>((done) => {
      EventBus.once(RunnerEvents.LINK_COPIED, (copied: boolean) => {
        answers.push(copied);
        done();
      });
    });
    EventBus.emit('seed-changed', 'A1B2C3D4');

    EventBus.emit(RunnerEvents.COPY_LINK);
    await heard;

    expect(new URL(write.calls.mostRecent().args[0]).searchParams.get('seed')).toBe('A1B2C3D4');
    expect(answers).toEqual([true]);
  });

  it('tells the game when the link could not be copied', async () => {
    spyOn(navigator.clipboard, 'writeText').and.rejectWith(new Error('denied'));
    const heard = new Promise<boolean>((done) => EventBus.once(RunnerEvents.LINK_COPIED, done));

    EventBus.emit(RunnerEvents.COPY_LINK);

    expect(await heard).toBeFalse();
  });

  it('stops listening to the game once the page is gone', () => {
    fixture.destroy();

    EventBus.emit(RunnerEvents.EXIT);

    expect(navigate).not.toHaveBeenCalled();
  });
});
