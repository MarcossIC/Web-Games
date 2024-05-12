import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SnakelingControllerService } from '@app/data/services/snakeling/SnakelingController.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'welcome-snakeling-modal',
  templateUrl: './welcome-snakeling-modal.component.html',
  styleUrls: [
    './welcome-snakeling-modal.component.css',
    '../../../shared/styles/modal.css',
  ],
})
export class WelcomeSnakelingModalComponent implements OnInit {
  protected controller: SnakelingControllerService = inject(
    SnakelingControllerService
  );
  private router = inject(Router);

  constructor() {}

  ngOnInit(): void {}

  protected close(): void {
    this.controller.reset();
    this.controller.changePause();
    this.router.navigate(['/games']);
  }

  protected playGame(): void {
    this.controller.executeAction('p');
  }
}
