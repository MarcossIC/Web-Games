/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { TicTacToeControllerService } from './TicTacToeController.service';

describe('Service: TicTacToeController', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TicTacToeControllerService]
    });
  });

  it('should ...', inject([TicTacToeControllerService], (service: TicTacToeControllerService) => {
    expect(service).toBeTruthy();
  }));
});
