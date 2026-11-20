import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
} from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { GalaxyBackgroundComponent } from '@app-components/galaxy-background/galaxy-background.component';
import { GalaxyView } from '@app-components/galaxy-background/galaxy-travel.service';
import {
  InstallOffer,
  InstallPrompt,
} from '@app-services/pwa/install-prompt.service';
import { AppComponent } from './app.component';

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.Eager,
 template: '' })
class BlankPage {}

/** Stands in for the WebGL galaxy, which these tests do not need. */
@Component({
  selector: 'app-galaxy-background',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
class GalaxyStub {
  readonly view = input<GalaxyView>();
}

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let router: Router;
  let install: {
    offer: ReturnType<typeof signal<InstallOffer | undefined>>;
    install: jasmine.Spy;
    dismiss: jasmine.Spy;
  };

  beforeEach(async () => {
    install = {
      offer: signal<InstallOffer | undefined>(undefined),
      install: jasmine.createSpy('install'),
      dismiss: jasmine.createSpy('dismiss'),
    };

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([
          { path: '', component: BlankPage },
          { path: 'tetris', component: BlankPage },
        ]),
        { provide: InstallPrompt, useValue: install },
      ],
    })
      .overrideComponent(AppComponent, {
        remove: { imports: [GalaxyBackgroundComponent] },
        add: { imports: [GalaxyStub] },
      })
      .compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(AppComponent);
  });

  function open(url: string): void {
    router.navigateByUrl(url);
    tick();
    fixture.detectChanges();
  }

  const banner = () =>
    (fixture.nativeElement as HTMLElement).querySelector('app-install-banner');
  const button = (label: string) =>
    Array.from(banner()?.querySelectorAll('button') ?? []).find(
      (candidate) => candidate.textContent?.trim() === label
    );

  it('creates the app', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('suggests installing on a site page when there is something to offer', fakeAsync(() => {
    install.offer.set('prompt');

    open('/');

    expect(banner()).not.toBeNull();
  }));

  it('shows no banner when there is nothing to offer', fakeAsync(() => {
    open('/');

    expect(banner()).toBeNull();
  }));

  it('keeps the banner off the game pages, where it would cover the controls', fakeAsync(() => {
    install.offer.set('prompt');

    open('/tetris');

    expect(banner()).toBeNull();
  }));

  it('installs when the visitor accepts', fakeAsync(() => {
    install.offer.set('prompt');
    open('/');

    button('Install')?.click();

    expect(install.install).toHaveBeenCalledTimes(1);
  }));

  it('remembers the dismissal when the visitor turns it down', fakeAsync(() => {
    install.offer.set('prompt');
    open('/');

    button('Not now')?.click();

    expect(install.dismiss).toHaveBeenCalledTimes(1);
  }));
});
