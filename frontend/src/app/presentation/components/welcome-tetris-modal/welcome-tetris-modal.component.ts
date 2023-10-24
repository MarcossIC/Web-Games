import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PointsService } from '@app/data/services/tetris/Points.service';
import { TetrisControllerService } from '@app/data/services/tetris/TetrisController.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'welcome-tetris-modal',
  templateUrl: './welcome-tetris-modal.component.html',
  styleUrls: ['./welcome-tetris-modal.component.css', '../../../shared/styles/modal.css']
})
export class WelcomeTetrisModalComponent implements OnInit {

  protected controller: TetrisControllerService = inject(TetrisControllerService);
  private point: PointsService = inject(PointsService);
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

  playGame(): void{
    this.controller.resume();
  }

}
