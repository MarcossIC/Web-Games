/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { MemoramaControllerService } from './memoramaController.service';

describe('Service: MemoramaController', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MemoramaControllerService]
    });
  });

  it('should ...', inject([MemoramaControllerService], (service: MemoramaControllerService) => {
    expect(service).toBeTruthy();
  }));
});
