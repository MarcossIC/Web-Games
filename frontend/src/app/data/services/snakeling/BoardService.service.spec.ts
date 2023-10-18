/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { BoardServiceService } from './BoardService.service';

describe('Service: BoardService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BoardServiceService]
    });
  });

  it('should ...', inject([BoardServiceService], (service: BoardServiceService) => {
    expect(service).toBeTruthy();
  }));
});
