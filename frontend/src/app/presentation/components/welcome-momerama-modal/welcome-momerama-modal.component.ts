import { CommonModule } from '@angular/common';
import { Component, OnInit, Renderer2, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MemoramaControllerService } from '@app/data/services/memorama/memoramaController.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'welcome-momerama-modal',
  templateUrl: './welcome-momerama-modal.component.html',
  styleUrls: ['./welcome-momerama-modal.component.css', '../../../shared/styles/modal.css']
})
export class WelcomeMomeramaModalComponent implements OnInit {

  protected controller: MemoramaControllerService = inject(MemoramaControllerService);
  protected renderer: Renderer2 = inject(Renderer2);
  private router: Router = inject(Router);
  
  constructor() { }

  ngOnInit(): void {
  }

  protected close(): void {
    this.controller.resetGame(this.renderer);
    this.controller.pause();
    this.router.navigate(['/games']);
  }

  protected playGame(): void{
    this.controller.resume();
  }
}
