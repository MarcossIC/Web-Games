/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { GameStateService } from './GameState.service';

describe('Service: GameState', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GameStateService]
    });
  });

  it('should ...', inject([GameStateService], (service: GameStateService) => {
    expect(service).toBeTruthy();
  }));
});
