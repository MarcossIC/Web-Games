import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InstallOffer } from '@app-services/pwa/install-prompt.service';
import { InstallBannerComponent } from './install-banner.component';

describe('InstallBannerComponent', () => {
  let fixture: ComponentFixture<InstallBannerComponent>;
  let banner: HTMLElement;
  let accepted: jasmine.Spy;
  let dismissed: jasmine.Spy;

  function show(offer: InstallOffer): void {
    fixture = TestBed.createComponent(InstallBannerComponent);
    fixture.componentRef.setInput('offer', offer);
    accepted = jasmine.createSpy('accept');
    dismissed = jasmine.createSpy('dismiss');
    fixture.componentInstance.accept.subscribe(accepted);
    fixture.componentInstance.dismiss.subscribe(dismissed);
    fixture.detectChanges();
    banner = fixture.nativeElement;
  }

  const button = (label: string) =>
    Array.from(banner.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === label
    );

  describe('when the browser has an install dialog', () => {
    beforeEach(() => show('prompt'));

    it('asks to install on the Install button', () => {
      button('Install')?.click();

      expect(accepted).toHaveBeenCalledTimes(1);
      expect(dismissed).not.toHaveBeenCalled();
    });

    it('lets the visitor turn it down', () => {
      button('Not now')?.click();

      expect(dismissed).toHaveBeenCalledTimes(1);
      expect(accepted).not.toHaveBeenCalled();
    });
  });

  describe('on iOS, where the visitor installs by hand', () => {
    beforeEach(() => show('ios-guide'));

    it('explains the steps instead of offering a button that cannot install', () => {
      expect(banner.textContent).toContain('Share');
      expect(banner.textContent).toContain('Add to Home Screen');
      expect(button('Install')).toBeUndefined();
    });

    it('lets the visitor close it', () => {
      button('Got it')?.click();

      expect(dismissed).toHaveBeenCalledTimes(1);
    });
  });
});
