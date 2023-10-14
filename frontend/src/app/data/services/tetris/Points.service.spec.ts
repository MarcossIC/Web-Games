/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { PointsService } from './Points.service';

describe('Service: Points', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PointsService]
    });
  });

  it('should ...', inject([PointsService], (service: PointsService) => {
    expect(service).toBeTruthy();
  }));
});
