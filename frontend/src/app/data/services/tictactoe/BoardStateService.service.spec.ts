/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { BoardStateService } from './BoardStateService.service';

describe('Service: BoardState', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BoardStateService]
    });
  });

  it('should ...', inject([BoardStateService], (service: BoardStateService) => {
    expect(service).toBeTruthy();
  }));
});
