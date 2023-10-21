/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { UserPlayerService } from './UserPlayer.service';

describe('Service: UserPlayer', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserPlayerService]
    });
  });

  it('should ...', inject([UserPlayerService], (service: UserPlayerService) => {
    expect(service).toBeTruthy();
  }));
});
