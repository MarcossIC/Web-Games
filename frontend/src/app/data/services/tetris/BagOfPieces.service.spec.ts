/* tslint:disable:no-unused-variable */

import { TestBed, inject } from '@angular/core/testing';
import { BagOfPiecesService } from './BagOfPieces.service';
import { PieceService } from './Piece.service';

describe('Service: BagOfPieces', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      // The bag deals the pieces PieceService describes.
      providers: [BagOfPiecesService, PieceService]
    });
  });

  it('should ...', inject([BagOfPiecesService], (service: BagOfPiecesService) => {
    expect(service).toBeTruthy();
  }));
});
