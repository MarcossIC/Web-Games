import { BreakerControllerService } from '@app/data/services/breaker/BreakerController.service';
import routes from './app.routing';

describe('app routes', () => {
  const breaker = routes.find((r) => r.path === 'breaker');

  it('keeps Nova Breaker lazy: the route does not provide the controller (it would pull Phaser into the initial bundle)', () => {
    expect(breaker).toBeDefined();
    expect(breaker!.loadComponent).toEqual(jasmine.any(Function));
    expect(breaker!.providers ?? []).not.toContain(BreakerControllerService);
  });
});
