/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { PieceService } from './Piece.service';

describe('Service: Piece', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PieceService]
    });
  });

  it('should ...', inject([PieceService], (service: PieceService) => {
    expect(service).toBeTruthy();
  }));
});
