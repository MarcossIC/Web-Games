/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { FoodService } from './Food.service';

describe('Service: Food', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FoodService]
    });
  });

  it('should ...', inject([FoodService], (service: FoodService) => {
    expect(service).toBeTruthy();
  }));
});
