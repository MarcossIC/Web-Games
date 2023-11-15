import { CommonModule } from '@angular/common';
import { Component, OnInit, Renderer2, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MemoramaControllerService } from '@app/data/services/memorama/memoramaController.service';
import { fillArray } from '@app/data/services/util.service';
import { TOTAL_CARDS } from 'assets/constants/memorama';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'endgame-modal-memorama',
  templateUrl: './endgame-modal-memorama.component.html',
  styleUrls: ['./endgame-modal-memorama.component.css', '../../../shared/styles/modal.css']
})
export class EndgameModalMemoramaComponent implements OnInit {

  protected controller: MemoramaControllerService = inject(MemoramaControllerService);
  protected renderer: Renderer2 = inject(Renderer2);
  private router: Router = inject(Router);

  constructor() { }

  ngOnInit(): void {
  }

  protected close(): void {
    this.controller.resetGame(this.renderer);
    this.router.navigate(['/games']);
  }

  protected playAgain(): void{
    this.controller.resetGame(this.renderer);
    this.controller.valueUsed = [];
    fillArray(TOTAL_CARDS, 0).forEach(()=>{
      this.controller.ramdomValues();
    });
    this.controller.resume();
  }
}
