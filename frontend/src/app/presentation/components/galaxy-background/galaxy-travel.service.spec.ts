import { Component, ChangeDetectionStrategy } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { EXIT_MS, GalaxyTravel } from './galaxy-travel.service';

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.Eager,
 template: '' })
class BlankPage {}

describe('GalaxyTravel', () => {
  let travel: GalaxyTravel;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: BlankPage },
          { path: 'games', component: BlankPage },
          { path: 'tetris', component: BlankPage },
        ]),
      ],
    });
    router = TestBed.inject(Router);
    travel = TestBed.inject(GalaxyTravel);
  });

  it('shows the galaxy from orbit on Start and from the core on Games', fakeAsync(() => {
    router.navigateByUrl('/');
    tick();
    expect(travel.view()).toBe('orbit');

    router.navigateByUrl('/games');
    tick();
    expect(travel.view()).toBe('core');
  }));

  it('has no galaxy on a game page', fakeAsync(() => {
    router.navigateByUrl('/tetris');
    tick();

    expect(travel.view()).toBeUndefined();
  }));

  it('moves the camera at once, and changes page only after the old one has left', fakeAsync(() => {
    router.navigateByUrl('/');
    tick();

    travel.to('/games');

    expect(travel.view()).toBe('core');
    expect(travel.leaving()).toBeTrue();
    expect(router.url).toBe('/');

    tick(EXIT_MS);

    expect(router.url).toBe('/games');
    expect(travel.leaving()).toBeFalse();
    expect(travel.view()).toBe('core');
  }));

  it('ignores a second trip while one is under way', fakeAsync(() => {
    router.navigateByUrl('/games');
    tick();

    travel.to('/');
    travel.to('/games');
    tick(EXIT_MS);

    expect(router.url).toBe('/');
  }));

  it('plunges into the core on the way to a game, then leaves the galaxy', fakeAsync(() => {
    router.navigateByUrl('/games');
    tick();

    travel.to('/tetris');

    expect(travel.view()).toBe('launch');
    expect(router.url).toBe('/games');

    tick(EXIT_MS);

    expect(router.url).toBe('/tetris');
    expect(travel.view()).toBeUndefined();
  }));
});
