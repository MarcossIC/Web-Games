/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { SnakelingControllerService } from './SnakelingController.service';

describe('Service: SnakelingController', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SnakelingControllerService]
    });
  });

  it('should ...', inject([SnakelingControllerService], (service: SnakelingControllerService) => {
    expect(service).toBeTruthy();
  }));
});
