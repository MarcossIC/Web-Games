import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GameBarComponent } from './game-bar.component';

describe('GameBarComponent', () => {
  let fixture: ComponentFixture<GameBarComponent>;
  let bar: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameBarComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(GameBarComponent);
    fixture.componentRef.setInput('title', 'Tetris');
    fixture.detectChanges();
    bar = fixture.nativeElement;
  });

  it('shows the name of the game', () => {
    expect(bar.querySelector('h1')?.textContent?.trim()).toBe('Tetris');
  });

  it('offers a way back to the games page', () => {
    expect(bar.querySelector('a.exit')?.getAttribute('href')).toBe('/games');
  });

  it('asks the game to pause when the pause button is pressed', () => {
    let pauses = 0;
    fixture.componentInstance.pause.subscribe(() => pauses++);

    bar.querySelector<HTMLButtonElement>('button.pause')?.click();

    expect(pauses).toBe(1);
  });

  it('has no pause button for a game that cannot be paused', () => {
    fixture.componentRef.setInput('canPause', false);
    fixture.detectChanges();

    expect(bar.querySelector('button.pause')).toBeNull();
  });
});
