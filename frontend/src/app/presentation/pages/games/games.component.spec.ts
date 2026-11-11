import { Component } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { EXIT_MS } from '@app-components/galaxy-background/galaxy-travel.service';
import { GAMES } from 'assets/constants/games';
import { GamesComponent } from './games.component';

@Component({ standalone: true, template: '' })
class BlankPage {}

describe('GamesComponent', () => {
  let fixture: ComponentFixture<GamesComponent>;
  let page: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GamesComponent],
      providers: [provideRouter([{ path: 'chess', component: BlankPage }])],
    }).compileComponents();

    fixture = TestBed.createComponent(GamesComponent);
    fixture.detectChanges();
    page = fixture.nativeElement;
  });

  const cartridges = () =>
    Array.from(page.querySelectorAll<HTMLAnchorElement>('.cartridge'));
  const panelTitle = () =>
    page.querySelector('.panel-title')?.textContent?.trim();
  const playLink = () => page.querySelector<HTMLAnchorElement>('.play');

  it('shows one cartridge per game, each linking to its game', () => {
    expect(cartridges().length).toBe(GAMES.length);
    expect(cartridges().map((link) => link.getAttribute('href'))).toEqual(
      GAMES.map((game) => game.PATH)
    );
  });

  it('loads the first game in the panel by default', () => {
    expect(panelTitle()).toBe(GAMES[0].NAME);
    expect(playLink()?.getAttribute('href')).toBe(GAMES[0].PATH);
  });

  it('loads a game in the panel when its cartridge is hovered', () => {
    const chess = GAMES.findIndex((game) => game.PATH === '/chess');

    cartridges()[chess].dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();

    expect(panelTitle()).toBe('Chess');
    expect(playLink()?.getAttribute('href')).toBe('/chess');
  });

  it('loads a game in the panel when its cartridge takes keyboard focus', () => {
    const runner = GAMES.findIndex((game) => game.PATH === '/runner');

    cartridges()[runner].dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    expect(panelTitle()).toBe('Runner');
    expect(playLink()?.getAttribute('href')).toBe('/runner');
  });

  it('opens a game when its cartridge is clicked, after the launch has played', fakeAsync(() => {
    const router = TestBed.inject(Router);
    const chess = GAMES.findIndex((game) => game.PATH === '/chess');

    cartridges()[chess].click();
    fixture.detectChanges();

    expect(cartridges()[chess].classList).toContain('is-launched');
    expect(router.url).not.toBe('/chess');

    tick(EXIT_MS);

    expect(router.url).toBe('/chess');
  }));
});
