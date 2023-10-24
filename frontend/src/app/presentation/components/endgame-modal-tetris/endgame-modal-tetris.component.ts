import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PointsService } from '@app/data/services/tetris/Points.service';
import { TetrisControllerService } from '@app/data/services/tetris/TetrisController.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'endgame-modal-tetris',
  templateUrl: './endgame-modal-tetris.component.html',
  styleUrls: ['./endgame-modal-tetris.component.css', '../../../shared/styles/modal.css']
})
export class EndgameModalTetrisComponent implements OnInit {
  protected controller: TetrisControllerService = inject(TetrisControllerService);
  public point: PointsService = inject(PointsService);
  private router: Router  = inject(Router);
  
  constructor() { }

  ngOnInit(): void {
  }

  close(){
    this.point.resetScore();
    this.point.resetLevel();
    this.controller.reset();

    this.router.navigate(['/games']);
  }

  restart(): void{
    this.controller.reset();
    this.controller.playAgain();
    this.point.resetLevel();
    this.point.resetScore();
  }
}
