/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { SnakeService } from './Snake.service';

describe('Service: Snake', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SnakeService]
    });
  });

  it('should ...', inject([SnakeService], (service: SnakeService) => {
    expect(service).toBeTruthy();
  }));
});
