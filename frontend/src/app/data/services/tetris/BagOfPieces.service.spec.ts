/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { BagOfPiecesService } from './BagOfPieces.service';

describe('Service: BagOfPieces', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BagOfPiecesService]
    });
  });

  it('should ...', inject([BagOfPiecesService], (service: BagOfPiecesService) => {
    expect(service).toBeTruthy();
  }));
});
