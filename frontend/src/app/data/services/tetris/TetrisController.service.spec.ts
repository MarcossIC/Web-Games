/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { TetrisControllerService } from './TetrisController.service';

describe('Service: GameController', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TetrisControllerService]
    });
  });

  it('should ...', inject([TetrisControllerService], (service: TetrisControllerService) => {
    expect(service).toBeTruthy();
  }));
});
