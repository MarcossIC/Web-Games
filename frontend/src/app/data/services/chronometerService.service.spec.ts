/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { ChronometerServiceService } from './chronometerService.service';

describe('Service: ChronometerService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ChronometerServiceService]
    });
  });

  it('should ...', inject([ChronometerServiceService], (service: ChronometerServiceService) => {
    expect(service).toBeTruthy();
  }));
});
