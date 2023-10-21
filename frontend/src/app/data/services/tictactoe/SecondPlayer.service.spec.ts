/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { SecondPlayerService } from './SecondPlayer.service';

describe('Service: SecondPlayer', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SecondPlayerService]
    });
  });

  it('should ...', inject([SecondPlayerService], (service: SecondPlayerService) => {
    expect(service).toBeTruthy();
  }));
});
