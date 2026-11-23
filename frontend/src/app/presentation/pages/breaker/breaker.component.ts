import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { keyActions } from '@app-input';
import { BreakerControllerService } from '@app/data/services/breaker/BreakerController.service';
import { BREAKER_PAGE_KEYS } from '@app/data/services/breaker/breaker-controls';
import { BreakerGameComponent } from '@app/presentation/components/breaker-game/breaker-game.component';
import { EndgameModalBreakerComponent } from '@app/presentation/components/endgame-modal-breaker/endgame-modal-breaker.component';
import { WelcomeBreakerModalComponent } from '@app/presentation/components/welcome-breaker-modal/welcome-breaker-modal.component';
import { GameBarComponent } from '@app-components/game-bar/game-bar.component';

@Component({
  standalone: true,
  selector: 'breaker',
  templateUrl: './breaker.component.html',
  styleUrl: './breaker.component.css',
  imports: [
    DecimalPipe,
    BreakerGameComponent,
    GameBarComponent,
    WelcomeBreakerModalComponent,
    EndgameModalBreakerComponent,
  ],
  // Provided here, not in app.routing.ts: only the lazy chunk may reach Phaser, and the
  // controller dies with the page.
  providers: [BreakerControllerService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreakerComponent {
  protected controller = inject(BreakerControllerService);

  constructor() {
    // Before the host component boots Phaser, so READY is never missed.
    this.controller.connect(inject(DestroyRef));
    keyActions(BREAKER_PAGE_KEYS, { on: 'keydown' }).subscribe(({ action, timeStamp }) =>
      this.controller.handleAction(action, timeStamp)
    );
  }
}

export default BreakerComponent;
