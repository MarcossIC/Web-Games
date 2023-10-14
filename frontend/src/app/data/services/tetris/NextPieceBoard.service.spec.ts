/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { NextPieceBoardService } from './NextPieceBoard.service';

describe('Service: NextPieceBoard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NextPieceBoardService]
    });
  });

  it('should ...', inject([NextPieceBoardService], (service: NextPieceBoardService) => {
    expect(service).toBeTruthy();
  }));
});
