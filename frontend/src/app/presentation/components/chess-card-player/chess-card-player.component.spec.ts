import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { ChessCaptureCounter } from '@app/data/services/chess/ChessCaptureCounter.service';
import { ChessCardPlayer } from './chess-card-player.component';

describe('ChessCardPlayer', () => {
  let fixture: ComponentFixture<ChessCardPlayer>;
  let card: HTMLElement;

  const show = async (
    player: ChessPlayers,
    active: boolean,
    extra: Record<string, unknown> = {}
  ) => {
    await TestBed.configureTestingModule({
      imports: [ChessCardPlayer],
      providers: [ChessCaptureCounter],
    }).compileComponents();

    fixture = TestBed.createComponent(ChessCardPlayer);
    fixture.componentRef.setInput('player', player);
    fixture.componentRef.setInput('active', active);
    for (const [name, value] of Object.entries(extra)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
    card = fixture.nativeElement.querySelector('.player-card');
  };

  it('names the white player', async () => {
    await show(ChessPlayers.WHITE, false);

    expect(card.querySelector('.player-name')?.textContent?.trim()).toBe(
      'White Player'
    );
  });

  it('names the black player', async () => {
    await show(ChessPlayers.BLACK, false);

    expect(card.querySelector('.player-name')?.textContent?.trim()).toBe(
      'Black Player'
    );
  });

  it('is lit while it is that player turn', async () => {
    await show(ChessPlayers.WHITE, true);

    expect(card.classList).toContain('is-active');
  });

  it('is dimmed while the other player moves', async () => {
    await show(ChessPlayers.WHITE, false);

    expect(card.classList).not.toContain('is-active');
  });

  it('names who moves the side when told', async () => {
    await show(ChessPlayers.BLACK, false, { label: 'Machine · Hard' });

    expect(card.querySelector('.player-name')?.textContent?.trim()).toBe(
      'Machine · Hard'
    );
    // The picture is then the only thing that says which side it is.
    expect(card.querySelector('img')?.getAttribute('alt')).toBe('Black');
  });

  it('says Turn on the lit card unless told otherwise', async () => {
    await show(ChessPlayers.WHITE, true);
    expect(card.querySelector('.turn-tag')?.textContent?.trim()).toBe('Turn');
  });

  it('says what it is told while it is that player turn', async () => {
    await show(ChessPlayers.BLACK, true, { tag: 'Thinking' });

    expect(card.querySelector('.turn-tag')?.textContent?.trim()).toBe('Thinking');
  });
});
